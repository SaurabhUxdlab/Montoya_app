import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { doc, setDoc, deleteDoc, serverTimestamp, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from './firebase';

// Configure foreground notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
    priority: Notifications.AndroidNotificationPriority.HIGH,
  }),
});

let cachedDeviceToken: string | null = null;

/**
 * Request notification permissions and register FCM/Device token in Firestore
 * Under users/{userId}/fcmTokens/{tokenDocId}
 */
export async function registerForPushNotificationsAsync(userId: string): Promise<string | null> {
  if (!userId) return null;

  try {
    // 1. Check existing permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    // 2. Request permission if not already granted
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('[PushService] Notification permission not granted by user.');
      return null;
    }

    // 3. Set Android notification channel
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Montoya Tennis Notifications',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#7B0818',
        // Omit 'sound' to use Android default notification sound without seeking a custom 'default.wav' resource
      });
    }

    // 4. Retrieve Device / FCM Push Token
    let tokenStr: string | null = null;
    try {
      // Native FCM token on Android or APNs on iOS
      const deviceToken = await Notifications.getDevicePushTokenAsync();
      if (deviceToken && deviceToken.data) {
        tokenStr = typeof deviceToken.data === 'string' ? deviceToken.data : JSON.stringify(deviceToken.data);
      }
    } catch (tokenErr) {
      console.warn('[PushService] getDevicePushTokenAsync fallback to getExpoPushTokenAsync:', tokenErr);
    }

    if (!tokenStr) {
      try {
        const expoToken = await Notifications.getExpoPushTokenAsync();
        if (expoToken && expoToken.data) {
          tokenStr = expoToken.data;
        }
      } catch (expoErr) {
        console.warn('[PushService] Could not retrieve Expo push token:', expoErr);
      }
    }

    if (!tokenStr) {
      console.warn('[PushService] No push token generated for device.');
      return null;
    }

    cachedDeviceToken = tokenStr;

    // 5. Store token in Firestore under users/{userId}/fcmTokens/{tokenDocId}
    // matching Dashboard fcmTokenService.ts and Cloud Functions
    const docId = encodeURIComponent(tokenStr.slice(-32));
    const tokenDocRef = doc(db, 'users', userId, 'fcmTokens', docId);

    await setDoc(
      tokenDocRef,
      {
        token: tokenStr,
        platform: Platform.OS,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    // Also update coach profile doc with token for backwards compatibility
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        fcmTokens: arrayUnion(tokenStr),
        updatedAt: new Date().toISOString(),
      });
    } catch (e) {
      // Ignore if user doc doesn't allow arrayUnion
    }

    console.log(`[PushService] Successfully registered ${Platform.OS} push token for user ${userId}`);
    return tokenStr;
  } catch (error) {
    console.warn('[PushService] Error registering for push notifications:', error);
    return null;
  }
}

/**
 * Remove device FCM token on logout
 */
export async function unregisterPushNotificationsAsync(userId: string): Promise<void> {
  if (!userId || !cachedDeviceToken) return;

  try {
    const docId = encodeURIComponent(cachedDeviceToken.slice(-32));
    const tokenDocRef = doc(db, 'users', userId, 'fcmTokens', docId);
    await deleteDoc(tokenDocRef);
    console.log(`[PushService] Removed push token for user ${userId}`);
    cachedDeviceToken = null;
  } catch (error) {
    console.warn('[PushService] Error removing push token:', error);
  }
}

/**
 * Setup notification response listeners (when coach taps a push notification)
 */
export function setupNotificationListeners(
  onNotificationReceived?: (notification: Notifications.Notification) => void,
  onNotificationResponse?: (response: Notifications.NotificationResponse) => void
) {
  const receivedSub = Notifications.addNotificationReceivedListener((notification) => {
    console.log('[PushService] Foreground notification received:', notification);
    if (onNotificationReceived) {
      onNotificationReceived(notification);
    }
  });

  const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
    console.log('[PushService] Notification response tapped:', response);
    if (onNotificationResponse) {
      onNotificationResponse(response);
    }
  });

  return () => {
    receivedSub.remove();
    responseSub.remove();
  };
}
