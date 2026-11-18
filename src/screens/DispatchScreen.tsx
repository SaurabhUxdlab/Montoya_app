import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { Bell, CheckCheck, Inbox, Calendar, Layers, Sparkles, Megaphone } from 'lucide-react-native';
import { COLORS } from '../constants/colors';
import { SPACING, RADIUS, SHADOWS } from '../constants/theme';
import { moderateScale, moderateFont } from '../utils/responsive';
import { useAppSelector, useAppDispatch } from '../hooks/redux';
import { AlertCard } from '../components/AlertCard';
import { NotificationDetailsModal } from '../components/NotificationDetailsModal';
import { markAsRead, markAllAsRead } from '../store/slices/notificationSlice';
import { markNotificationAsRead, markAllNotificationsAsRead } from '../services/notificationService';
import { NotificationItem, AssignedLesson } from '../types';

type FilterTab = 'all' | 'unread' | 'announcements' | 'sessions' | 'updates';

interface DispatchScreenProps {
  onViewSchedule?: () => void;
  onNavigateToTab?: (tab: string) => void;
}

export const DispatchScreen: React.FC<DispatchScreenProps> = ({
  onViewSchedule,
  onNavigateToTab,
}) => {
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const { notifications, unreadCount } = useAppSelector((state) => state.notification);
  const { assignedLessons } = useAppSelector((state) => state.schedule);

  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
  const [selectedNotification, setSelectedNotification] = useState<NotificationItem | null>(null);
  const [isDetailsModalVisible, setIsDetailsModalVisible] = useState(false);

  // Group notifications into filtered subsets
  const filteredNotifications = useMemo(() => {
    return notifications.filter((n) => {
      const typeStr = (n.type || '').toLowerCase();
      const titleStr = (n.title || '').toLowerCase();

      const isAnnouncement =
        typeStr.includes('announcement') ||
        titleStr.includes('announcement') ||
        typeStr === 'broadcast';

      const isSession =
        !isAnnouncement &&
        (typeStr.includes('assign') ||
          typeStr.includes('shift') ||
          typeStr.includes('lesson') ||
          typeStr.startsWith('booking_') ||
          titleStr.includes('assign') ||
          titleStr.includes('shift') ||
          titleStr.includes('lesson') ||
          titleStr.includes('booking'));

      if (activeFilter === 'unread') return !n.read;
      if (activeFilter === 'announcements') return isAnnouncement;
      if (activeFilter === 'sessions') return isSession;
      if (activeFilter === 'updates') return !isSession && !isAnnouncement;
      return true;
    });
  }, [notifications, activeFilter]);

  // Counts for pills
  const unreadOnlyCount = notifications.filter((n) => !n.read).length;
  const announcementsCount = notifications.filter((n) => {
    const t = (n.type || '').toLowerCase();
    const s = (n.title || '').toLowerCase();
    return t.includes('announcement') || s.includes('announcement') || t === 'broadcast';
  }).length;
  const sessionsCount = notifications.filter((n) => {
    const t = (n.type || '').toLowerCase();
    const s = (n.title || '').toLowerCase();
    const isAnn = t.includes('announcement') || s.includes('announcement') || t === 'broadcast';
    return (
      !isAnn &&
      (t.includes('assign') ||
        t.includes('shift') ||
        t.includes('lesson') ||
        t.startsWith('booking_') ||
        s.includes('assign') ||
        s.includes('shift') ||
        s.includes('booking'))
    );
  }).length;
  const updatesCount = notifications.length - sessionsCount - announcementsCount;

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

  const handleAction = async (item: NotificationItem) => {
    setSelectedNotification(item);
    setIsDetailsModalVisible(true);
    if (!item.read) {
      dispatch(markAsRead(item.id));
      if (user?.uid) {
        await markNotificationAsRead(user.uid, item.id);
      }
    }
  };

  const handleMarkAllAsRead = async () => {
    if (notifications.length === 0) return;
    dispatch(markAllAsRead());
    if (user?.uid) {
      const ids = notifications.map((n) => n.id);
      await markAllNotificationsAsRead(user.uid, ids);
    }
  };

  // Find matching lesson if notification targets a specific session
  const matchedLesson: AssignedLesson | null = selectedNotification
    ? assignedLessons?.find(
        (l) =>
          (selectedNotification.targetId &&
            (l.id === selectedNotification.targetId || l.scheduleId === selectedNotification.targetId)) ||
          l.id === selectedNotification.id
      ) || null
    : null;

  return (
    <View style={styles.screenContainer}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.logoRow}>
          <View style={styles.profileSection}>
            {user?.profileImage ? (
              <Image source={{ uri: user.profileImage }} style={styles.headerAvatar} />
            ) : (
              <View style={styles.headerAvatarFallback}>
                <Text style={styles.initialsText}>{initials}</Text>
              </View>
            )}
            <Image
              source={require('../../assets/montoyalogo.png')}
              style={styles.brandLogo}
              resizeMode="contain"
            />
            <View style={styles.titleTag}>
              <Text style={styles.titleTagText}>NOTIFICATIONS</Text>
            </View>
          </View>

          {unreadCount > 0 && (
            <TouchableOpacity
              style={styles.markAllBtn}
              onPress={handleMarkAllAsRead}
              activeOpacity={0.7}
            >
              <CheckCheck size={14} color={COLORS.montoyaRed} />
              <Text style={styles.markAllText}>Mark read</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Filter Pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterScrollView}
          contentContainerStyle={styles.filterContent}
        >
          <TouchableOpacity
            style={[styles.filterPill, activeFilter === 'all' && styles.filterPillActive]}
            onPress={() => setActiveFilter('all')}
            activeOpacity={0.75}
          >
            <Text style={[styles.filterPillText, activeFilter === 'all' && styles.filterPillTextActive]}>
              All ({notifications.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterPill, activeFilter === 'unread' && styles.filterPillActive]}
            onPress={() => setActiveFilter('unread')}
            activeOpacity={0.75}
          >
            <Text style={[styles.filterPillText, activeFilter === 'unread' && styles.filterPillTextActive]}>
              Unread {unreadOnlyCount > 0 ? `(${unreadOnlyCount})` : ''}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterPill, activeFilter === 'announcements' && styles.filterPillActive]}
            onPress={() => setActiveFilter('announcements')}
            activeOpacity={0.75}
          >
            <Text style={[styles.filterPillText, activeFilter === 'announcements' && styles.filterPillTextActive]}>
              Announcements ({announcementsCount})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterPill, activeFilter === 'sessions' && styles.filterPillActive]}
            onPress={() => setActiveFilter('sessions')}
            activeOpacity={0.75}
          >
            <Text style={[styles.filterPillText, activeFilter === 'sessions' && styles.filterPillTextActive]}>
              Sessions ({sessionsCount})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterPill, activeFilter === 'updates' && styles.filterPillActive]}
            onPress={() => setActiveFilter('updates')}
            activeOpacity={0.75}
          >
            <Text style={[styles.filterPillText, activeFilter === 'updates' && styles.filterPillTextActive]}>
              Updates ({updatesCount})
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {filteredNotifications.length === 0 ? (
          /* Empty State */
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              {activeFilter === 'unread' ? (
                <CheckCheck size={32} color={COLORS.montoyaRed} />
              ) : activeFilter === 'announcements' ? (
                <Megaphone size={32} color={COLORS.montoyaRed} />
              ) : activeFilter === 'sessions' ? (
                <Calendar size={32} color={COLORS.montoyaRed} />
              ) : (
                <Bell size={32} color={COLORS.montoyaRed} />
              )}
            </View>
            <Text style={styles.emptyTitle}>
              {activeFilter === 'unread'
                ? 'All Caught Up!'
                : activeFilter === 'announcements'
                ? 'No Club Announcements'
                : activeFilter === 'sessions'
                ? 'No Session Alerts'
                : 'No Notifications'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {activeFilter === 'unread'
                ? 'You have read all your alerts and announcements.'
                : activeFilter === 'announcements'
                ? 'Club announcements and notices will appear here.'
                : activeFilter === 'sessions'
                ? 'Session confirmations and schedule changes will appear here.'
                : 'When new assignments or alerts arrive, you will see them here.'}
            </Text>
          </View>
        ) : (
          /* Notifications List */
          <View style={styles.listContainer}>
            {filteredNotifications.map((item) => (
              <AlertCard
                key={item.id}
                notification={item}
                onPressAction={() => handleAction(item)}
              />
            ))}
          </View>
        )}
      </ScrollView>

      {/* Details Modal */}
      <NotificationDetailsModal
        visible={isDetailsModalVisible}
        notification={selectedNotification}
        matchedLesson={matchedLesson}
        onClose={() => setIsDetailsModalVisible(false)}
        onNavigateToSchedule={onViewSchedule}
        onNavigateToScreen={onNavigateToTab}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingTop: SPACING.md,
    ...SHADOWS.card,
    shadowOpacity: 0.03,
  },
  logoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.sm,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerAvatar: {
    width: moderateScale(34),
    height: moderateScale(34),
    borderRadius: moderateScale(17),
    borderWidth: 1.5,
    borderColor: COLORS.montoyaRed,
  },
  headerAvatarFallback: {
    width: moderateScale(34),
    height: moderateScale(34),
    borderRadius: moderateScale(17),
    backgroundColor: '#FCEBEA',
    borderWidth: 1.5,
    borderColor: '#FCA5A5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  initialsText: {
    fontSize: moderateFont(12),
    fontWeight: '800',
    color: COLORS.montoyaRed,
  },
  brandLogo: {
    width: moderateScale(110),
    height: moderateScale(26),
  },
  titleTag: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 4,
  },
  titleTagText: {
    fontSize: moderateFont(9.5),
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  markAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.sm,
    backgroundColor: '#FFF1F2',
    borderWidth: 1,
    borderColor: '#FECDD3',
  },
  markAllText: {
    fontSize: moderateFont(11),
    fontWeight: '700',
    color: COLORS.montoyaRed,
  },
  filterScrollView: {
    paddingVertical: SPACING.xs,
  },
  filterContent: {
    paddingHorizontal: SPACING.lg,
    gap: 8,
    paddingBottom: SPACING.xs,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterPillActive: {
    backgroundColor: COLORS.montoyaRed,
    borderColor: COLORS.montoyaRed,
  },
  filterPillText: {
    fontSize: moderateFont(12),
    fontWeight: '700',
    color: '#64748B',
  },
  filterPillTextActive: {
    color: COLORS.white,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xxl,
  },
  listContainer: {
    gap: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: moderateScale(60),
    paddingHorizontal: SPACING.xl,
  },
  emptyIconCircle: {
    width: moderateScale(68),
    height: moderateScale(68),
    borderRadius: moderateScale(34),
    backgroundColor: '#FCEBEA',
    borderWidth: 1.5,
    borderColor: '#FECDD3',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  emptyTitle: {
    fontSize: moderateFont(16),
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: moderateFont(12.5),
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
  },
});
