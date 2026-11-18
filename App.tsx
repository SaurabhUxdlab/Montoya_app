import React, { useState, useEffect } from 'react';
import { StyleSheet, View, StatusBar } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Provider } from 'react-redux';
import { store } from './src/store/store';
import { COLORS } from './src/constants/colors';
import { useAppDispatch, useAppSelector } from './src/hooks/redux';
import { setUser } from './src/store/slices/authSlice';
import {
  setActiveAttendance,
  setAttendanceHistory,
} from './src/store/slices/attendanceSlice';
import {
  setScheduleData,
  clearSchedule,
  setLoading as setScheduleLoading,
} from './src/store/slices/scheduleSlice';
import { setNotifications } from './src/store/slices/notificationSlice';
import {
  setAvailabilityRecords,
  clearAvailability,
  setLoading as setAvailabilityLoading,
} from './src/store/slices/availabilitySlice';
import { setMessages as setChatMessages, clearChat } from './src/store/slices/chatSlice';
import { subscribeToAuthState } from './src/services/authService';
import { subscribeToCoachProfile } from './src/services/profileService';
import {
  subscribeToActiveAttendance,
  subscribeToAttendanceHistory,
} from './src/services/attendanceService';
import { subscribeToCoachSchedule } from './src/services/scheduleService';
import { subscribeToCoachAvailability } from './src/services/availabilityService';
import { subscribeToUserNotifications } from './src/services/notificationService';
import { subscribeToCoachMessages } from './src/services/chatService';
import {
  registerForPushNotificationsAsync,
  unregisterPushNotificationsAsync,
  setupNotificationListeners,
} from './src/services/pushNotificationService';

import { AppHeader } from './src/components/AppHeader';
import { BottomNavigation, TabName } from './src/components/BottomNavigation';

import { SplashScreen } from './src/screens/SplashScreen';
import { LoginScreen } from './src/screens/LoginScreen';
import { SignupScreen } from './src/screens/SignupScreen';
import { ForgotPasswordScreen } from './src/screens/ForgotPasswordScreen';
import { CheckInScreen } from './src/screens/CheckInScreen';
import { SessionLoggerScreen } from './src/screens/SessionLoggerScreen';
import { ScheduleScreen } from './src/screens/ScheduleScreen';
import { DispatchScreen } from './src/screens/DispatchScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { ChatScreen } from './src/screens/ChatScreen';

import { HomeScreen } from './src/screens/HomeScreen';
import { LocationPermissionScreen } from './src/screens/LocationPermissionScreen';
import { ReadyToClockInScreen } from './src/screens/ReadyToClockInScreen';

function MainAppContent() {
  const dispatch = useAppDispatch();
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);

  const [isSplashing, setIsSplashing] = useState(true);
  const [activeTab, setActiveTab] = useState<TabName>('CheckIn');
  const [currentView, setCurrentView] = useState<'main' | 'login' | 'signup' | 'forgot' | 'profile'>('main');
  const [checkInStep, setCheckInStep] = useState<'dashboard' | 'permission' | 'ready' | 'active'>('dashboard');

  // Real-time synchronization of authenticated coach profile, attendance, schedules, availability, and notifications from Firestore
  useEffect(() => {
    let unsubProfile: (() => void) | null = null;
    let unsubActiveAtt: (() => void) | null = null;
    let unsubHistAtt: (() => void) | null = null;
    let unsubSchedule: (() => void) | null = null;
    let unsubAvailability: (() => void) | null = null;
    let unsubNotifs: (() => void) | null = null;
    let unsubChat: (() => void) | null = null;
    let unsubPushListeners: (() => void) | null = null;
    let currentCoachId: string | null = null;

    const unsubAuth = subscribeToAuthState((fbUser) => {
      if (fbUser) {
        currentCoachId = fbUser.uid;

        // 1. Register device FCM / push token in Firestore under users/{uid}/fcmTokens
        registerForPushNotificationsAsync(fbUser.uid);

        // 2. Setup notification listeners for foreground & tap deep-linking
        unsubPushListeners = setupNotificationListeners(
          (notification) => {
            // Foreground push received
            console.log('[App] Push received in foreground:', notification.request.content.title);
          },
          (response) => {
            // User tapped push notification
            const data = response.notification.request.content.data;
            if (data?.targetScreen) {
              const target = data.targetScreen as TabName;
              if (['CheckIn', 'Schedule', 'Logs', 'Dispatch', 'Chat', 'Profile'].includes(target)) {
                setActiveTab(target);
                setCurrentView('main');
              }
            } else if (data?.type === 'chat') {
              setActiveTab('Chat');
              setCurrentView('main');
            } else {
              setActiveTab('Dispatch');
              setCurrentView('main');
            }
          }
        );

        // 3. Subscribe to live profile changes in Firestore
        unsubProfile = subscribeToCoachProfile(fbUser.uid, (freshProfile) => {
          if (freshProfile) {
            dispatch(setUser(freshProfile));
          }
        });

        // 4. Subscribe to live active attendance status in Firestore
        unsubActiveAtt = subscribeToActiveAttendance(fbUser.uid, (activeAtt) => {
          dispatch(setActiveAttendance(activeAtt));
        });

        // 5. Subscribe to live attendance history in Firestore
        unsubHistAtt = subscribeToAttendanceHistory(fbUser.uid, (hist) => {
          dispatch(setAttendanceHistory(hist));
        });

        // 6. Subscribe to live assigned schedules & sessions in Firestore
        dispatch(setScheduleLoading(true));
        unsubSchedule = subscribeToCoachSchedule(fbUser.uid, (scheduleData) => {
          dispatch(setScheduleData(scheduleData));
        });

        // 7. Subscribe to live coach availability records from availability collection
        dispatch(setAvailabilityLoading(true));
        unsubAvailability = subscribeToCoachAvailability(fbUser.uid, (availRecords) => {
          dispatch(setAvailabilityRecords(availRecords));
        });

        // 8. Subscribe to live notifications from users/{uid}/notifications
        unsubNotifs = subscribeToUserNotifications(fbUser.uid, (notifs) => {
          dispatch(setNotifications(notifs));
        });

        // 9. Subscribe to live direct messages from users/{uid}/messages
        unsubChat = subscribeToCoachMessages(fbUser.uid, (chatMessages) => {
          dispatch(setChatMessages(chatMessages));
        });
      } else {
        if (currentCoachId) {
          unregisterPushNotificationsAsync(currentCoachId);
          currentCoachId = null;
        }
        if (unsubPushListeners) unsubPushListeners();
        if (unsubProfile) unsubProfile();
        if (unsubActiveAtt) unsubActiveAtt();
        if (unsubHistAtt) unsubHistAtt();
        if (unsubSchedule) unsubSchedule();
        if (unsubAvailability) unsubAvailability();
        if (unsubNotifs) unsubNotifs();
        if (unsubChat) unsubChat();
        dispatch(setActiveAttendance(null));
        dispatch(clearSchedule());
        dispatch(clearAvailability());
        dispatch(setNotifications([]));
        dispatch(clearChat());
      }
    });

    return () => {
      unsubAuth();
      if (unsubPushListeners) unsubPushListeners();
      if (unsubProfile) unsubProfile();
      if (unsubActiveAtt) unsubActiveAtt();
      if (unsubHistAtt) unsubHistAtt();
      if (unsubSchedule) unsubSchedule();
      if (unsubAvailability) unsubAvailability();
      if (unsubNotifs) unsubNotifs();
      if (unsubChat) unsubChat();
    };
  }, [dispatch]);

  if (isSplashing) {
    return <SplashScreen onFinish={() => setIsSplashing(false)} />;
  }

  if (!isAuthenticated) {
    if (currentView === 'signup') {
      return (
        <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
          <StatusBar barStyle="dark-content" backgroundColor={COLORS.card} />
          <SignupScreen onBackToLogin={() => setCurrentView('login')} />
        </SafeAreaView>
      );
    }
    if (currentView === 'forgot') {
      return (
        <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
          <StatusBar barStyle="dark-content" backgroundColor={COLORS.card} />
          <ForgotPasswordScreen onBack={() => setCurrentView('login')} />
        </SafeAreaView>
      );
    }

    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.card} />
        <LoginScreen
          onNavigateForgot={() => setCurrentView('forgot')}
          onNavigateSignup={() => setCurrentView('signup')}
        />
      </SafeAreaView>
    );
  }

  const getHeaderTitle = (): 'CHECK IN' | 'HOURS' | 'SCHEDULE' | 'ALERTS' | 'PROFILE' | 'CHAT' => {
    if (activeTab === 'Profile' || currentView === 'profile') return 'PROFILE';
    switch (activeTab) {
      case 'CheckIn':
        return 'CHECK IN';
      case 'Logs':
        return 'HOURS';
      case 'Schedule':
        return 'SCHEDULE';
      case 'Dispatch':
        return 'ALERTS';
      case 'Chat':
        return 'CHAT';
      default:
        return 'CHECK IN';
    }
  };

  const renderActiveScreen = () => {
    if (activeTab === 'Profile' || currentView === 'profile') {
      return <ProfileScreen />;
    }

    switch (activeTab) {
      case 'CheckIn':
        if (checkInStep === 'dashboard') {
          return (
            <HomeScreen
              onCheckInPress={() => setCheckInStep('permission')}
              onViewAllSchedule={() => setActiveTab('Schedule')}
              onProfilePress={() => setActiveTab('Profile')}
              onNotificationPress={() => setActiveTab('Dispatch')}
              onChatPress={() => setActiveTab('Chat')}
            />
          );
        }
        if (checkInStep === 'permission') {
          return (
            <LocationPermissionScreen
              onPermissionGranted={() => setCheckInStep('ready')}
              onCancel={() => setCheckInStep('dashboard')}
            />
          );
        }
        if (checkInStep === 'ready') {
          return (
            <ReadyToClockInScreen
              onClockIn={() => setCheckInStep('active')}
              onCancel={() => setCheckInStep('dashboard')}
            />
          );
        }
        return <CheckInScreen />;
      case 'Logs':
        return <SessionLoggerScreen />;
      case 'Schedule':
        return <ScheduleScreen />;
      case 'Chat':
        return <ChatScreen />;
      case 'Dispatch':
        return (
          <DispatchScreen
            onViewSchedule={() => setActiveTab('Schedule')}
            onNavigateToTab={(tab) => {
              if (
                tab === 'Schedule' ||
                tab === 'CheckIn' ||
                tab === 'Logs' ||
                tab === 'Profile' ||
                tab === 'Dispatch' ||
                tab === 'Chat'
              ) {
                setActiveTab(tab as TabName);
              }
            }}
          />
        );
      default:
        return <CheckInScreen />;
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.card} />

      {/* Montoya App Header */}
      {checkInStep !== 'permission' && checkInStep !== 'ready' &&
       (activeTab !== 'CheckIn' || checkInStep === 'active') &&
       activeTab !== 'Dispatch' &&
       activeTab !== 'Schedule' && (
        <AppHeader
          screenTitle={getHeaderTitle()}
          onNotificationPress={() => {
            setActiveTab('Dispatch');
            setCurrentView('main');
          }}
          onProfilePress={() => {
            setCurrentView('main');
            setActiveTab(activeTab === 'Profile' ? 'CheckIn' : 'Profile');
          }}
        />
      )}

      {/* Screen View Content */}
      <View style={styles.body}>{renderActiveScreen()}</View>


      {/* Persistent Bottom Tab Navigation */}
      {checkInStep !== 'permission' && checkInStep !== 'ready' && (
        <BottomNavigation
          activeTab={activeTab}
          onTabSelect={(tab) => {
            setActiveTab(tab);
            setCurrentView('main');
            if (tab === 'CheckIn') setCheckInStep('dashboard');
          }}
        />
      )}
    </SafeAreaView>
  );
}


export default function App() {
  return (
    <SafeAreaProvider>
      <Provider store={store}>
        <MainAppContent />
      </Provider>
    </SafeAreaProvider>
  );
}


const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  body: {
    flex: 1,
  },
});
