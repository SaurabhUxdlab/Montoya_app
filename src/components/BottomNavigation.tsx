import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Home, Calendar, Clock, Bell, User, MessageSquare } from 'lucide-react-native';
import { COLORS } from '../constants/colors';
import { SPACING, RADIUS } from '../constants/theme';
import { moderateScale, moderateFont } from '../utils/responsive';
import { useAppSelector } from '../hooks/redux';

export type TabName = 'CheckIn' | 'Schedule' | 'Logs' | 'Dispatch' | 'Chat' | 'Profile';

interface BottomNavigationProps {
  activeTab: TabName;
  onTabSelect: (tab: TabName) => void;
}

export const BottomNavigation: React.FC<BottomNavigationProps> = ({
  activeTab,
  onTabSelect,
}) => {
  const insets = useSafeAreaInsets();
  const unreadNotificationCount = useAppSelector((state) => state.notification.unreadCount);
  const unreadChatCount = useAppSelector((state) => state.chat.unreadCount);

  const tabs = [
    {
      key: 'CheckIn' as TabName,
      label: 'Home',
      icon: Home,
    },
    {
      key: 'Schedule' as TabName,
      label: 'Schedule',
      icon: Calendar,
    },
    {
      key: 'Logs' as TabName,
      label: 'Hours',
      icon: Clock,
    },
    {
      key: 'Chat' as TabName,
      label: 'Chat',
      icon: MessageSquare,
      badge: unreadChatCount,
    },
    {
      key: 'Profile' as TabName,
      label: 'Profile',
      icon: User,
    },
  ];

  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.key;
        const IconComponent = tab.icon;
        const activeColor = COLORS.montoyaRed || '#7B0818';
        const inactiveColor = '#94A3B8';
        const showBadge = tab.badge !== undefined && tab.badge > 0;

        return (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tabItem, isActive && styles.activeTabItem]}
            onPress={() => onTabSelect(tab.key)}
            activeOpacity={0.7}
          >
            <View style={styles.iconWrapper}>
              <IconComponent
                size={moderateScale(20)}
                color={isActive ? activeColor : inactiveColor}
                strokeWidth={isActive ? 2.5 : 1.8}
              />
              {showBadge && (
                <View style={styles.badgeContainer}>
                  <Text style={styles.badgeText}>
                    {tab.badge! > 99 ? '99+' : tab.badge}
                  </Text>
                </View>
              )}
            </View>
            <Text
              style={[
                styles.tabLabel,
                { color: isActive ? activeColor : inactiveColor },
                isActive && styles.activeTabLabel,
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F3E8E8',
    paddingVertical: moderateScale(8),
    paddingHorizontal: SPACING.sm,
    justifyContent: 'space-around',
    elevation: 8,
    shadowColor: '#7B0818',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingVertical: moderateScale(4),
    borderRadius: RADIUS.md,
  },
  activeTabItem: {
    backgroundColor: '#FAF2F2',
  },
  iconWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeContainer: {
    position: 'absolute',
    top: -moderateScale(4),
    right: -moderateScale(8),
    backgroundColor: COLORS.montoyaRed || '#7B0818',
    minWidth: moderateScale(16),
    height: moderateScale(16),
    borderRadius: moderateScale(8),
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: moderateScale(3),
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: moderateFont(9),
    fontWeight: '800',
    lineHeight: moderateScale(11),
  },
  tabLabel: {
    fontSize: moderateFont(10),
    fontWeight: '600',
    marginTop: moderateScale(3),
  },
  activeTabLabel: {
    fontWeight: '800',
  },
});


