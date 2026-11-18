import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Bell, WifiOff, RefreshCw } from 'lucide-react-native';
import { COLORS } from '../constants/colors';
import { SPACING, RADIUS } from '../constants/theme';
import { useAppSelector } from '../hooks/redux';
import { moderateScale, moderateFont } from '../utils/responsive';

interface AppHeaderProps {
  screenTitle: 'CHECK IN' | 'HOURS' | 'SCHEDULE' | 'ALERTS' | 'PROFILE' | 'CHAT';
  onNotificationPress?: () => void;
  onProfilePress?: () => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  screenTitle,
  onNotificationPress,
  onProfilePress,
}) => {
  const user = useAppSelector((state) => state.auth.user);
  const unreadCount = useAppSelector((state) => state.notification.unreadCount);
  const { syncStatus, isOnline } = useAppSelector((state) => state.offlineSync);

  // Initials for avatar fallback
  const initials = user?.name
    ? user.name
        .split(' ')
        .filter(Boolean)
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'C';

  return (
    <View style={styles.headerContainer}>
      {/* Network Sync status bar if offline or syncing */}
      {!isOnline && (
        <View style={[styles.syncBar, { backgroundColor: COLORS.warningLight }]}>
          <WifiOff size={14} color={COLORS.warning} />
          <Text style={styles.syncText}>Working Offline (Changes queued)</Text>
        </View>
      )}

      {syncStatus === 'Syncing' && (
        <View style={[styles.syncBar, { backgroundColor: '#E0F2FE' }]}>
          <RefreshCw size={14} color="#0284C7" />
          <Text style={[styles.syncText, { color: '#0369A1' }]}>Syncing with Firebase...</Text>
        </View>
      )}

      <View style={styles.topRow}>
        {/* Logo & Title Tag */}
        <View style={styles.logoSection}>
          <Image
            source={require('../../assets/montoyalogo.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />

          <View style={styles.titleTag}>
            <Text style={styles.titleTagText}>{screenTitle}</Text>
          </View>
        </View>

        {/* Action Controls */}
        <View style={styles.actionSection}>
          {/* Bell Icon with Badge */}
          <TouchableOpacity
            style={styles.iconButton}
            onPress={onNotificationPress}
            activeOpacity={0.7}
          >
            <Bell size={20} color={COLORS.textPrimary} />
            {unreadCount > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.badgeText}>{unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Profile Circle Button */}
          <TouchableOpacity
            style={styles.profileButton}
            onPress={onProfilePress}
            activeOpacity={0.8}
          >
            {user?.profileImage ? (
              <Image source={{ uri: user.profileImage }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.profileInitials}>{initials}</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingTop: moderateScale(10),
    paddingBottom: moderateScale(12),
    paddingHorizontal: SPACING.lg,
  },
  syncBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: moderateScale(4),
    paddingHorizontal: moderateScale(8),
    borderRadius: RADIUS.xs,
    marginBottom: moderateScale(8),
    gap: moderateScale(6),
  },
  syncText: {
    fontSize: moderateFont(11),
    fontWeight: '600',
    color: COLORS.warning,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logoSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  logoImage: {
    width: moderateScale(110),
    height: moderateScale(32),
  },
  titleTag: {
    backgroundColor: COLORS.grayBackground,
    paddingHorizontal: moderateScale(8),
    paddingVertical: moderateScale(3),
    borderRadius: RADIUS.xs,
    marginLeft: moderateScale(4),
  },
  titleTagText: {
    fontSize: moderateFont(11),
    fontWeight: '800',
    color: COLORS.textSecondary,
    letterSpacing: 0.6,
  },
  actionSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  iconButton: {
    width: moderateScale(36),
    height: moderateScale(36),
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.grayBackground,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: moderateScale(2),
    right: moderateScale(2),
    backgroundColor: COLORS.primary,
    minWidth: moderateScale(16),
    height: moderateScale(16),
    borderRadius: moderateScale(8),
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: moderateScale(3),
  },
  badgeText: {
    color: COLORS.white,
    fontSize: moderateFont(10),
    fontWeight: '700',
  },
  profileButton: {
    width: moderateScale(36),
    height: moderateScale(36),
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  profileInitials: {
    color: COLORS.white,
    fontSize: moderateFont(13),
    fontWeight: '700',
  },
});

