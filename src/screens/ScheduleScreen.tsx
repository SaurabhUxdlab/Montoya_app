import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {
  Search,
  Calendar,
  CalendarX,
  CheckCircle2,
  Clock,
  Plus,
  CalendarDays,
  ListFilter,
  UserCheck,
  AlertCircle,
} from 'lucide-react-native';
import { COLORS } from '../constants/colors';
import { RADIUS, SPACING, SHADOWS } from '../constants/theme';
import { moderateScale, moderateFont } from '../utils/responsive';
import { useAppSelector, useAppDispatch } from '../hooks/redux';
import { AssignedLessonCard } from '../components/AssignedLessonCard';
import { LessonDetailsModal } from '../components/LessonDetailsModal';
import { AvailabilityCard } from '../components/AvailabilityCard';
import { AddEditAvailabilityModal } from '../components/AddEditAvailabilityModal';
import { DeleteAvailabilityModal } from '../components/DeleteAvailabilityModal';
import {
  AssignedLesson,
  CoachAvailabilityRecord,
  AvailabilityFormData,
} from '../types';
import { isLessonCompleted } from '../utils/date';
import {
  createCoachAvailability,
  updateCoachAvailability,
  deleteCoachAvailability,
} from '../services/availabilityService';

export const ScheduleScreen: React.FC = () => {
  const user = useAppSelector((state) => state.auth.user);
  const { assignedLessons, isLoading: isScheduleLoading } = useAppSelector(
    (state) => state.schedule
  );
  const { records: availabilityRecords, isLoading: isAvailabilityLoading } =
    useAppSelector((state) => state.availability);
  const { attendanceHistory, latestCompletedAttendance } = useAppSelector(
    (state) => state.attendance
  );

  // Top level view: Assigned Sessions vs My Availability
  const [viewMode, setViewMode] = useState<'Sessions' | 'Availability'>('Sessions');

  // Sessions Tab Filter State
  const [statusTab, setStatusTab] = useState<'Upcoming' | 'Completed' | 'All'>('Upcoming');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'All' | 'Private' | 'Group'>('All');
  const [selectedLesson, setSelectedLesson] = useState<AssignedLesson | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);

  // Availability Tab Filter & Modal State
  const [availSearchQuery, setAvailSearchQuery] = useState('');
  const [availStatusFilter, setAvailStatusFilter] = useState<
    'All' | 'Approved' | 'Submitted' | 'Rejected'
  >('All');
  const [isAddEditAvailOpen, setIsAddEditAvailOpen] = useState(false);
  const [editingAvailRecord, setEditingAvailRecord] =
    useState<CoachAvailabilityRecord | null>(null);
  const [deletingAvailRecord, setDeletingAvailRecord] =
    useState<CoachAvailabilityRecord | null>(null);
  const [isDeletingAvail, setIsDeletingAvail] = useState(false);

  // 1. Separate all lessons into Upcoming vs Completed using live attendance records and date/time checks
  const { upcomingList, completedList } = useMemo(() => {
    const upcoming: AssignedLesson[] = [];
    const completed: AssignedLesson[] = [];

    (assignedLessons || []).forEach((lesson) => {
      const isCompleted = isLessonCompleted(
        lesson,
        attendanceHistory,
        latestCompletedAttendance
      );
      if (isCompleted) {
        completed.push(lesson);
      } else {
        upcoming.push(lesson);
      }
    });

    // Sort upcoming ascending (soonest first)
    upcoming.sort((a, b) => {
      const dateA = a.rawDate || a.date || '';
      const dateB = b.date || b.rawDate || '';
      if (dateA !== dateB) return dateA.localeCompare(dateB);
      return (a.startTimeRaw || a.time || '').localeCompare(
        b.startTimeRaw || b.time || ''
      );
    });

    // Sort completed descending (most recent first)
    completed.sort((a, b) => {
      const dateA = a.rawDate || a.date || '';
      const dateB = b.date || b.rawDate || '';
      if (dateA !== dateB) return dateB.localeCompare(dateA);
      return (b.startTimeRaw || b.time || '').localeCompare(
        a.startTimeRaw || a.time || ''
      );
    });

    return { upcomingList: upcoming, completedList: completed };
  }, [assignedLessons, attendanceHistory, latestCompletedAttendance]);

  // 2. Filter helper for Sessions
  const applyFilters = (list: AssignedLesson[]) => {
    return list.filter((lesson) => {
      const matchesCategory =
        categoryFilter === 'All'
          ? true
          : categoryFilter === 'Private'
          ? lesson.type === 'private' ||
            lesson.category.toLowerCase().includes('private')
          : lesson.type === 'group' ||
            lesson.type === 'clinic' ||
            lesson.category.toLowerCase().includes('group') ||
            lesson.category.toLowerCase().includes('clinic');

      const matchesQuery =
        searchQuery.trim() === '' ||
        lesson.athleteName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lesson.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lesson.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (lesson.notes &&
          lesson.notes.toLowerCase().includes(searchQuery.toLowerCase()));

      return matchesCategory && matchesQuery;
    });
  };

  const filteredUpcoming = useMemo(
    () => applyFilters(upcomingList),
    [upcomingList, categoryFilter, searchQuery]
  );
  const filteredCompleted = useMemo(
    () => applyFilters(completedList),
    [completedList, categoryFilter, searchQuery]
  );

  // 3. Filter helper for Availability
  const filteredAvailability = useMemo(() => {
    return (availabilityRecords || []).filter((rec) => {
      const matchesStatus =
        availStatusFilter === 'All'
          ? true
          : availStatusFilter === 'Approved'
          ? rec.status === 'Approved' || rec.status === 'Available'
          : availStatusFilter === 'Rejected'
          ? rec.status === 'Rejected' || rec.status === 'Unavailable'
          : rec.status === 'Submitted';

      const q = availSearchQuery.trim().toLowerCase();
      const matchesQuery =
        q === '' ||
        (rec.venue && rec.venue.toLowerCase().includes(q)) ||
        (rec.locationName && rec.locationName.toLowerCase().includes(q)) ||
        (rec.date && rec.date.toLowerCase().includes(q)) ||
        (rec.notes && rec.notes.toLowerCase().includes(q));

      return matchesStatus && matchesQuery;
    });
  }, [availabilityRecords, availStatusFilter, availSearchQuery]);

  // Availability metrics counts
  const availCounts = useMemo(() => {
    const total = availabilityRecords?.length || 0;
    const approved = (availabilityRecords || []).filter(
      (r) => r.status === 'Approved' || r.status === 'Available'
    ).length;
    const submitted = (availabilityRecords || []).filter(
      (r) => r.status === 'Submitted'
    ).length;
    return { total, approved, submitted };
  }, [availabilityRecords]);

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

  const handleOpenDetails = (lesson: AssignedLesson) => {
    setSelectedLesson(lesson);
    setIsModalVisible(true);
  };

  // Availability Action Handlers
  const handleOpenAddAvailability = () => {
    setEditingAvailRecord(null);
    setIsAddEditAvailOpen(true);
  };

  const handleOpenEditAvailability = (rec: CoachAvailabilityRecord) => {
    setEditingAvailRecord(rec);
    setIsAddEditAvailOpen(true);
  };

  const handleOpenDeleteAvailability = (rec: CoachAvailabilityRecord) => {
    setDeletingAvailRecord(rec);
  };

  const handleSaveAvailability = async (
    data: AvailabilityFormData,
    id?: string
  ) => {
    if (id) {
      await updateCoachAvailability(id, data, user?.email);
    } else {
      await createCoachAvailability(data, user?.email);
    }
  };

  const handleConfirmDeleteAvailability = async () => {
    if (!deletingAvailRecord) return;
    setIsDeletingAvail(true);
    try {
      await deleteCoachAvailability(deletingAvailRecord.id);
      setDeletingAvailRecord(null);
    } catch (err: any) {
      Alert.alert(
        'Delete Failed',
        err?.message || 'Could not delete availability record.'
      );
    } finally {
      setIsDeletingAvail(false);
    }
  };

  return (
    <View style={styles.screenContainer}>
      {/* Custom App Header */}
      <View style={styles.header}>
        <View style={styles.logoRow}>
          <View style={styles.profileSection}>
            {user?.profileImage ? (
              <Image
                source={{ uri: user.profileImage }}
                style={styles.headerAvatar}
              />
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
              <Text style={styles.titleTagText}>SCHEDULE</Text>
            </View>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Title & Add Availability CTA Row */}
        <View style={styles.titleActionRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.mainTitle}>Coaching Schedule</Text>
            <Text style={styles.subTitle}>
              {viewMode === 'Sessions'
                ? 'Review and manage your assigned coaching sessions.'
                : 'Manage your weekly availability and working hours.'}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.addAvailabilityHeaderBtn}
            onPress={handleOpenAddAvailability}
            activeOpacity={0.8}
          >
            <Plus size={16} color="#FFFFFF" style={{ marginRight: 4 }} />
            <Text style={styles.addAvailabilityHeaderBtnText}>Add Availability</Text>
          </TouchableOpacity>
        </View>

        {/* Main View Mode Selector: Assigned Sessions vs My Availability */}
        <View style={styles.mainModeContainer}>
          <TouchableOpacity
            style={[
              styles.mainModeTab,
              viewMode === 'Sessions' && styles.mainModeTabActive,
            ]}
            onPress={() => setViewMode('Sessions')}
            activeOpacity={0.7}
          >
            <CalendarDays
              size={16}
              color={viewMode === 'Sessions' ? COLORS.montoyaRed : '#64748B'}
              style={{ marginRight: 6 }}
            />
            <Text
              style={[
                styles.mainModeText,
                viewMode === 'Sessions' && styles.mainModeTextActive,
              ]}
            >
              Assigned Sessions ({upcomingList.length + completedList.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.mainModeTab,
              viewMode === 'Availability' && styles.mainModeTabActive,
            ]}
            onPress={() => setViewMode('Availability')}
            activeOpacity={0.7}
          >
            <UserCheck
              size={16}
              color={viewMode === 'Availability' ? COLORS.montoyaRed : '#64748B'}
              style={{ marginRight: 6 }}
            />
            <Text
              style={[
                styles.mainModeText,
                viewMode === 'Availability' && styles.mainModeTextActive,
              ]}
            >
              My Availability ({availabilityRecords?.length || 0})
            </Text>
          </TouchableOpacity>
        </View>

        {/* ================================================================= */}
        {/* VIEW MODE: ASSIGNED SESSIONS                                       */}
        {/* ================================================================= */}
        {viewMode === 'Sessions' ? (
          <>
            {/* Primary Status Segregation Tabs */}
            <View style={styles.statusSegmentContainer}>
              <TouchableOpacity
                style={[
                  styles.statusSegmentTab,
                  statusTab === 'Upcoming' && styles.statusSegmentTabActive,
                ]}
                onPress={() => setStatusTab('Upcoming')}
                activeOpacity={0.7}
              >
                <Clock
                  size={15}
                  color={statusTab === 'Upcoming' ? COLORS.montoyaRed : '#64748B'}
                  style={{ marginRight: 6 }}
                />
                <Text
                  style={[
                    styles.statusSegmentText,
                    statusTab === 'Upcoming' && styles.statusSegmentTextActive,
                  ]}
                >
                  Upcoming ({upcomingList.length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.statusSegmentTab,
                  statusTab === 'Completed' && styles.statusSegmentTabActive,
                ]}
                onPress={() => setStatusTab('Completed')}
                activeOpacity={0.7}
              >
                <CheckCircle2
                  size={15}
                  color={statusTab === 'Completed' ? '#15803D' : '#64748B'}
                  style={{ marginRight: 6 }}
                />
                <Text
                  style={[
                    styles.statusSegmentText,
                    statusTab === 'Completed' && styles.statusSegmentTextActive,
                  ]}
                >
                  Completed ({completedList.length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.statusSegmentTab,
                  statusTab === 'All' && styles.statusSegmentTabActive,
                ]}
                onPress={() => setStatusTab('All')}
                activeOpacity={0.7}
              >
                <Calendar
                  size={15}
                  color={statusTab === 'All' ? COLORS.montoyaRed : '#64748B'}
                  style={{ marginRight: 6 }}
                />
                <Text
                  style={[
                    styles.statusSegmentText,
                    statusTab === 'All' && styles.statusSegmentTextActive,
                  ]}
                >
                  All ({upcomingList.length + completedList.length})
                </Text>
              </TouchableOpacity>
            </View>

            {/* Search & Category Filter Controls */}
            <View style={styles.controlsRow}>
              <View style={styles.searchBar}>
                <Search size={16} color={COLORS.textSecondary} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search athlete, venue or court..."
                  placeholderTextColor={COLORS.textSecondary}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
              </View>

              {/* Filter Pills */}
              <View style={styles.filterGroup}>
                {(['All', 'Private', 'Group'] as const).map((filter) => (
                  <TouchableOpacity
                    key={filter}
                    style={[
                      styles.filterPill,
                      categoryFilter === filter && styles.filterPillActive,
                    ]}
                    onPress={() => setCategoryFilter(filter)}
                  >
                    <Text
                      style={[
                        styles.filterPillText,
                        categoryFilter === filter && styles.filterPillTextActive,
                      ]}
                    >
                      {filter}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* List of Sessions */}
            <View style={styles.listContainer}>
              {isScheduleLoading &&
              (!assignedLessons || assignedLessons.length === 0) ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#7B0818" />
                  <Text style={styles.loadingText}>
                    Loading assigned schedules...
                  </Text>
                </View>
              ) : !assignedLessons || assignedLessons.length === 0 ? (
                /* Total Empty State */
                <View style={styles.emptyState}>
                  <View style={styles.emptyIconCircle}>
                    <CalendarX size={36} color="#7B0818" />
                  </View>
                  <Text style={styles.emptyStateTitle}>No schedule assigned</Text>
                  <Text style={styles.emptyStateDescription}>
                    You currently have no scheduled shifts or sessions assigned.
                    When assignments are created in Firebase, they will appear
                    here automatically.
                  </Text>
                </View>
              ) : statusTab === 'Upcoming' ? (
                /* Upcoming Tab View */
                filteredUpcoming.length > 0 ? (
                  filteredUpcoming.map((item) => (
                    <AssignedLessonCard
                      key={item.id}
                      item={item}
                      isCompleted={false}
                      onViewDetails={handleOpenDetails}
                    />
                  ))
                ) : (
                  <View style={styles.emptyState}>
                    <View
                      style={[
                        styles.emptyIconCircle,
                        { backgroundColor: '#FCEBEA' },
                      ]}
                    >
                      <Clock size={32} color={COLORS.montoyaRed} />
                    </View>
                    <Text style={styles.emptyStateTitle}>
                      No Upcoming Sessions
                    </Text>
                    <Text style={styles.emptyStateDescription}>
                      {searchQuery || categoryFilter !== 'All'
                        ? 'No upcoming sessions match your current filter or search.'
                        : 'You have no upcoming sessions scheduled right now.'}
                    </Text>
                  </View>
                )
              ) : statusTab === 'Completed' ? (
                /* Completed Tab View */
                filteredCompleted.length > 0 ? (
                  filteredCompleted.map((item) => (
                    <AssignedLessonCard
                      key={item.id}
                      item={item}
                      isCompleted={true}
                      onViewDetails={handleOpenDetails}
                    />
                  ))
                ) : (
                  <View style={styles.emptyState}>
                    <View
                      style={[
                        styles.emptyIconCircle,
                        { backgroundColor: '#DCFCE7' },
                      ]}
                    >
                      <CheckCircle2 size={32} color="#15803D" />
                    </View>
                    <Text style={styles.emptyStateTitle}>
                      No Completed Sessions
                    </Text>
                    <Text style={styles.emptyStateDescription}>
                      {searchQuery || categoryFilter !== 'All'
                        ? 'No completed sessions match your current filter or search.'
                        : 'Your completed and past coaching sessions will appear here.'}
                    </Text>
                  </View>
                )
              ) : (
                /* 'All' Tab View with Separated Sections */
                <>
                  {filteredUpcoming.length > 0 && (
                    <View style={styles.sectionBlock}>
                      <View style={styles.sectionHeaderRow}>
                        <Clock size={15} color={COLORS.montoyaRed} />
                        <Text style={styles.sectionHeaderTitle}>
                          UPCOMING SESSIONS ({filteredUpcoming.length})
                        </Text>
                      </View>
                      {filteredUpcoming.map((item) => (
                        <AssignedLessonCard
                          key={item.id}
                          item={item}
                          isCompleted={false}
                          onViewDetails={handleOpenDetails}
                        />
                      ))}
                    </View>
                  )}

                  {filteredCompleted.length > 0 && (
                    <View
                      style={[
                        styles.sectionBlock,
                        {
                          marginTop:
                            filteredUpcoming.length > 0 ? SPACING.lg : 0,
                        },
                      ]}
                    >
                      <View style={styles.sectionHeaderRow}>
                        <CheckCircle2 size={15} color="#15803D" />
                        <Text
                          style={[
                            styles.sectionHeaderTitle,
                            { color: '#334155' },
                          ]}
                        >
                          COMPLETED SESSIONS ({filteredCompleted.length})
                        </Text>
                      </View>
                      {filteredCompleted.map((item) => (
                        <AssignedLessonCard
                          key={item.id}
                          item={item}
                          isCompleted={true}
                          onViewDetails={handleOpenDetails}
                        />
                      ))}
                    </View>
                  )}

                  {filteredUpcoming.length === 0 &&
                    filteredCompleted.length === 0 && (
                      <View style={styles.emptyState}>
                        <Text style={styles.emptyStateTitle}>
                          No matching sessions
                        </Text>
                        <Text style={styles.emptyStateDescription}>
                          No sessions matched your filter or search query.
                        </Text>
                      </View>
                    )}
                </>
              )}
            </View>
          </>
        ) : (
          /* ================================================================= */
          /* VIEW MODE: MY AVAILABILITY                                        */
          /* ================================================================= */
          <View style={styles.availabilitySection}>
            {/* Availability Summary Metric Cards */}
            <View style={styles.metricsRow}>
              <View style={styles.metricCard}>
                <Text style={styles.metricNumber}>{availCounts.total}</Text>
                <Text style={styles.metricLabel}>Total Slots</Text>
              </View>

              <View style={[styles.metricCard, { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }]}>
                <Text style={[styles.metricNumber, { color: '#15803D' }]}>
                  {availCounts.approved}
                </Text>
                <Text style={[styles.metricLabel, { color: '#15803D' }]}>Approved</Text>
              </View>

              <View style={[styles.metricCard, { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' }]}>
                <Text style={[styles.metricNumber, { color: '#B45309' }]}>
                  {availCounts.submitted}
                </Text>
                <Text style={[styles.metricLabel, { color: '#B45309' }]}>Submitted</Text>
              </View>
            </View>

            {/* Status Filter Chips & Search */}
            <View style={styles.controlsRow}>
              <View style={styles.searchBar}>
                <Search size={16} color={COLORS.textSecondary} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search venue or date..."
                  placeholderTextColor={COLORS.textSecondary}
                  value={availSearchQuery}
                  onChangeText={setAvailSearchQuery}
                />
              </View>

              <View style={styles.filterGroup}>
                {(['All', 'Approved', 'Submitted', 'Rejected'] as const).map(
                  (filter) => (
                    <TouchableOpacity
                      key={filter}
                      style={[
                        styles.filterPill,
                        availStatusFilter === filter && styles.filterPillActive,
                      ]}
                      onPress={() => setAvailStatusFilter(filter)}
                    >
                      <Text
                        style={[
                          styles.filterPillText,
                          availStatusFilter === filter &&
                            styles.filterPillTextActive,
                        ]}
                      >
                        {filter}
                      </Text>
                    </TouchableOpacity>
                  )
                )}
              </View>
            </View>

            {/* Availability List */}
            <View style={styles.listContainer}>
              {isAvailabilityLoading &&
              (!availabilityRecords || availabilityRecords.length === 0) ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#7B0818" />
                  <Text style={styles.loadingText}>
                    Loading availability records...
                  </Text>
                </View>
              ) : filteredAvailability.length > 0 ? (
                filteredAvailability.map((rec) => (
                  <AvailabilityCard
                    key={rec.id}
                    item={rec}
                    onEdit={handleOpenEditAvailability}
                    onDelete={handleOpenDeleteAvailability}
                  />
                ))
              ) : (
                <View style={styles.emptyState}>
                  <View
                    style={[
                      styles.emptyIconCircle,
                      { backgroundColor: '#FAF5F4' },
                    ]}
                  >
                    <UserCheck size={32} color={COLORS.montoyaRed} />
                  </View>
                  <Text style={styles.emptyStateTitle}>
                    {availSearchQuery || availStatusFilter !== 'All'
                      ? 'No matching availability slots'
                      : 'No availability added yet'}
                  </Text>
                  <Text style={styles.emptyStateDescription}>
                    {availSearchQuery || availStatusFilter !== 'All'
                      ? 'Try clearing your filters or search terms.'
                      : 'Add your available coaching days and venues so students and management can assign sessions.'}
                  </Text>

                  <TouchableOpacity
                    style={styles.emptyAddButton}
                    onPress={handleOpenAddAvailability}
                    activeOpacity={0.8}
                  >
                    <Plus size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={styles.emptyAddButtonText}>
                      Add Your First Availability
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Dynamic Detail Modal for Assigned Sessions */}
      <LessonDetailsModal
        visible={isModalVisible}
        lesson={selectedLesson}
        onClose={() => setIsModalVisible(false)}
      />

      {/* Add / Edit Availability Modal */}
      <AddEditAvailabilityModal
        visible={isAddEditAvailOpen}
        coach={user}
        initialData={editingAvailRecord}
        onClose={() => setIsAddEditAvailOpen(false)}
        onSubmit={handleSaveAvailability}
      />

      {/* Delete Availability Confirmation Modal */}
      <DeleteAvailabilityModal
        visible={Boolean(deletingAvailRecord)}
        item={deletingAvailRecord}
        isDeleting={isDeletingAvail}
        onConfirm={handleConfirmDeleteAvailability}
        onCancel={() => setDeletingAvailRecord(null)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.sm,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  headerAvatar: {
    width: moderateScale(32),
    height: moderateScale(32),
    borderRadius: moderateScale(16),
  },
  headerAvatarFallback: {
    width: moderateScale(32),
    height: moderateScale(32),
    borderRadius: moderateScale(16),
    backgroundColor: COLORS.montoyaRed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initialsText: {
    color: '#FFFFFF',
    fontSize: moderateFont(12),
    fontWeight: '700',
  },
  brandLogo: {
    width: moderateScale(110),
    height: moderateScale(26),
  },
  titleTag: {
    backgroundColor: '#FAF5F4',
    borderWidth: 1,
    borderColor: '#F5E0DE',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 4,
  },
  titleTagText: {
    fontSize: moderateFont(10),
    fontWeight: '800',
    color: COLORS.montoyaRed,
    letterSpacing: 0.8,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xxl * 2,
  },
  titleActionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  mainTitle: {
    fontSize: moderateFont(22),
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  subTitle: {
    fontSize: moderateFont(13),
    color: '#64748B',
    marginTop: 2,
  },
  addAvailabilityHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.montoyaRed,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: RADIUS.md,
    ...SHADOWS.card,
  },
  addAvailabilityHeaderBtnText: {
    color: '#FFFFFF',
    fontSize: moderateFont(12),
    fontWeight: '700',
  },
  mainModeContainer: {
    flexDirection: 'row',
    backgroundColor: '#EDF2F7',
    padding: 3,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.md,
  },
  mainModeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: RADIUS.md,
  },
  mainModeTabActive: {
    backgroundColor: '#FFFFFF',
    ...SHADOWS.card,
  },
  mainModeText: {
    fontSize: moderateFont(12),
    fontWeight: '600',
    color: '#64748B',
  },
  mainModeTextActive: {
    color: COLORS.montoyaRed,
    fontWeight: '800',
  },
  statusSegmentContainer: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    padding: 4,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.md,
    gap: 4,
  },
  statusSegmentTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: RADIUS.sm,
  },
  statusSegmentTabActive: {
    backgroundColor: '#FFFFFF',
    ...SHADOWS.card,
  },
  statusSegmentText: {
    fontSize: moderateFont(12),
    fontWeight: '600',
    color: '#64748B',
  },
  statusSegmentTextActive: {
    color: '#0F172A',
    fontWeight: '700',
  },
  controlsRow: {
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    height: 40,
  },
  searchInput: {
    flex: 1,
    marginLeft: SPACING.sm,
    fontSize: moderateFont(13),
    color: '#0F172A',
  },
  filterGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  filterPillActive: {
    backgroundColor: COLORS.montoyaRed,
    borderColor: COLORS.montoyaRed,
  },
  filterPillText: {
    fontSize: moderateFont(11),
    fontWeight: '600',
    color: '#475569',
  },
  filterPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  listContainer: {
    marginTop: 2,
  },
  sectionBlock: {
    marginBottom: SPACING.md,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: SPACING.md,
  },
  sectionHeaderTitle: {
    fontSize: moderateFont(12),
    fontWeight: '800',
    color: COLORS.montoyaRed,
    letterSpacing: 0.8,
  },
  loadingContainer: {
    paddingVertical: SPACING.xxl,
    alignItems: 'center',
    gap: SPACING.md,
  },
  loadingText: {
    fontSize: moderateFont(14),
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  emptyState: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FEE2E2',
    padding: SPACING.xxl,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.md,
    ...SHADOWS.card,
  },
  emptyIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  emptyStateTitle: {
    fontSize: moderateFont(17),
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 6,
    textAlign: 'center',
  },
  emptyStateDescription: {
    fontSize: moderateFont(13),
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 19,
    maxWidth: 290,
  },
  emptyAddButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.montoyaRed,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    marginTop: SPACING.lg,
    ...SHADOWS.card,
  },
  emptyAddButtonText: {
    color: '#FFFFFF',
    fontSize: moderateFont(13),
    fontWeight: '700',
  },
  availabilitySection: {
    marginTop: 2,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: SPACING.md,
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.card,
  },
  metricNumber: {
    fontSize: moderateFont(20),
    fontWeight: '800',
    color: '#0F172A',
  },
  metricLabel: {
    fontSize: moderateFont(11),
    fontWeight: '600',
    color: '#64748B',
    marginTop: 2,
  },
});
