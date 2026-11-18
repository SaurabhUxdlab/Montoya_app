import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Pressable,
} from 'react-native';
import {
  Hand,
  Clock,
  MapPin,
  CheckCircle2,
  Calendar,
  ShieldCheck,
  Tag,
  X,
  Check,
} from 'lucide-react-native';
import { COLORS } from '../constants/colors';
import { RADIUS, SPACING, SHADOWS } from '../constants/theme';
import { moderateScale, moderateFont } from '../utils/responsive';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import { HourBlockItem } from '../components/HourBlockItem';
import { AttendanceRecord, HourBlock, HourBlockCategory } from '../types';
import { subscribeToAttendanceHistory, getRecordTimestamp } from '../services/attendanceService';
import { setAttendanceHistory } from '../store/slices/attendanceSlice';
import { updateBlockCategory } from '../store/slices/hoursSlice';
import { formatTime, normalizeDateToYMD } from '../utils/date';

export const SessionLoggerScreen: React.FC = () => {
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const { attendanceHistory, activeAttendance } = useAppSelector((state) => state.attendance);

  const [activeView, setActiveView] = useState<'hours' | 'attendance'>('hours');
  const [selectedBlockForCategorization, setSelectedBlockForCategorization] = useState<HourBlock | null>(null);
  const [localBlockCategories, setLocalBlockCategories] = useState<Record<string, HourBlockCategory>>({});

  // Subscribe to real-time attendance history for the logged-in coach
  useEffect(() => {
    if (!user?.uid) return;
    const unsub = subscribeToAttendanceHistory(user.uid, (history) => {
      dispatch(setAttendanceHistory(history));
    });
    return () => unsub();
  }, [user?.uid, dispatch]);

  const categories: { name: HourBlockCategory; color: string; desc: string }[] = [
    { name: 'Private Lesson', color: COLORS.montoyaRed, desc: 'Individual coaching session' },
    { name: 'Group Session', color: '#075985', desc: 'Clinics, squads, and group classes' },
    { name: 'Admin', color: '#92400E', desc: 'Court prep, paperwork, and meetings' },
    { name: 'Break', color: '#64748B', desc: 'Rest and transition time' },
  ];

  const parseTimeToEpoch = (timeStr?: string, dateStr?: string): number => {
    if (!timeStr) return 0;
    const trimmed = timeStr.trim();
    if (trimmed.includes('T')) {
      const t = new Date(trimmed).getTime();
      if (!isNaN(t)) return t;
    }
    const d = normalizeDateToYMD(dateStr) || new Date().toISOString().split('T')[0];
    if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(trimmed)) {
      const t = new Date(`${d}T${trimmed.padStart(5, '0')}:00`).getTime();
      if (!isNaN(t)) return t;
    }
    const fallback = new Date(trimmed).getTime();
    return isNaN(fallback) ? 0 : fallback;
  };

  const calculateDuration = (inTime?: string, outTime?: string, dateStr?: string): string => {
    if (!inTime) return '--';
    const start = parseTimeToEpoch(inTime, dateStr);
    if (!start) return '--';
    const end = outTime ? parseTimeToEpoch(outTime, dateStr) : Date.now();
    const diffMins = Math.max(1, Math.round((end - start) / (1000 * 60)));
    if (isNaN(diffMins)) return '--';
    const hrs = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    if (hrs > 0) {
      return `${hrs}h ${mins > 0 ? `${mins}m` : ''}`.trim();
    }
    return `${mins}m`;
  };

  const formatTimeOnly = (timeStr?: string): string => {
    if (!timeStr) return '--:--';
    const formatted = formatTime(timeStr);
    return formatted || timeStr;
  };

  const formatDateLabel = (dateStr?: string, timeOrIsoStr?: string): string => {
    const todayYMD = new Date().toISOString().split('T')[0];
    const ymd =
      normalizeDateToYMD(dateStr) ||
      (timeOrIsoStr && timeOrIsoStr.includes('T') ? normalizeDateToYMD(timeOrIsoStr) : null) ||
      todayYMD;

    if (ymd === todayYMD) return 'Today';

    try {
      const parts = ymd.split('-').map(Number);
      if (parts.length === 3) {
        const localDate = new Date(parts[0], parts[1] - 1, parts[2]);
        if (!isNaN(localDate.getTime())) {
          return localDate.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
          });
        }
      }
    } catch {}

    return ymd || 'Past Shift';
  };

  // Combine and deduplicate today's records
  const todayRecords = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];

    const isMatchToday = (r: AttendanceRecord) => {
      const recordDate =
        normalizeDateToYMD(r.date) ||
        (r.checkInLocation?.capturedAt ? r.checkInLocation.capturedAt.split('T')[0] : '') ||
        (r.createdAt ? r.createdAt.split('T')[0] : '') ||
        (r.checkInTime && r.checkInTime.includes('T') ? r.checkInTime.split('T')[0] : '');

      return !recordDate || recordDate === todayStr;
    };

    const recordsMap = new Map<string, AttendanceRecord>();

    // Add active attendance if today
    if (activeAttendance && isMatchToday(activeAttendance)) {
      recordsMap.set(activeAttendance.attendanceId, activeAttendance);
    }

    // Add all matching records from history
    attendanceHistory.forEach((r) => {
      if (isMatchToday(r)) {
        recordsMap.set(r.attendanceId, r);
      }
    });

    const list = Array.from(recordsMap.values());
    // Sort chronologically ascending
    list.sort((a, b) => {
      const tA = getRecordTimestamp(a);
      const tB = getRecordTimestamp(b);
      return tA - tB;
    });

    return list;
  }, [attendanceHistory, activeAttendance]);

  // Construct Dynamic Hour Blocks from Today's Attendance
  const todayBlocks: HourBlock[] = useMemo(() => {
    return todayRecords.map((item, index) => {
      const inTime = item.checkInTime || item.clockInTime;
      const outTime = item.checkOutTime || item.clockOutTime;
      const isCurrent = !outTime && (item.status === 'Checked In' || item.status === 'In Progress');
      const durationStr = calculateDuration(inTime, outTime, item.date);

      let defaultCat: HourBlockCategory = 'Uncategorized';
      const bType = (item.bookingType || item.sessionId || '').toLowerCase();
      if (bType.includes('private')) {
        defaultCat = 'Private Lesson';
      } else if (bType.includes('group') || bType.includes('clinic')) {
        defaultCat = 'Group Session';
      } else if (bType.includes('admin')) {
        defaultCat = 'Admin';
      }

      const assignedCat = localBlockCategories[item.attendanceId] || defaultCat;

      return {
        id: item.attendanceId || `block_${index}`,
        startTime: formatTimeOnly(inTime),
        endTime: outTime ? formatTimeOnly(outTime) : 'Present',
        durationLabel: durationStr,
        category: assignedCat,
        isConfirmed: !isCurrent && assignedCat !== 'Uncategorized',
      };
    });
  }, [todayRecords, localBlockCategories]);

  // Dynamic Total Logged Time
  const dynamicTotalLoggedTime = useMemo(() => {
    if (todayRecords.length === 0) return '0m';

    const totalMinutes = todayRecords.reduce((sum, item) => {
      const inTime = item.checkInTime || item.clockInTime;
      const outTime = item.checkOutTime || item.clockOutTime;
      if (!inTime) return sum;
      const start = parseTimeToEpoch(inTime, item.date);
      if (!start) return sum;
      const end = outTime ? parseTimeToEpoch(outTime, item.date) : Date.now();
      const diff = Math.max(1, Math.round((end - start) / (1000 * 60)));
      if (isNaN(diff)) return sum;
      return sum + diff;
    }, 0);

    const hrs = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    if (hrs > 0) {
      return `${hrs}h ${mins > 0 ? `${mins}m` : ''}`.trim();
    }
    return `${mins}m`;
  }, [todayRecords]);

  // Dynamic Shift Duration Range
  const dynamicShiftDuration = useMemo(() => {
    if (todayRecords.length === 0) return 'No shifts today';
    const firstIn = todayRecords[0].checkInTime || todayRecords[0].clockInTime;
    const lastRecord = todayRecords[todayRecords.length - 1];
    const lastOut = lastRecord.checkOutTime || lastRecord.clockOutTime;
    const startFormatted = formatTimeOnly(firstIn);
    const endFormatted = lastOut ? formatTimeOnly(lastOut) : 'Present';
    return `${startFormatted} - ${endFormatted}`;
  }, [todayRecords]);

  const handleSelectCategory = (cat: HourBlockCategory) => {
    if (!selectedBlockForCategorization) return;
    setLocalBlockCategories((prev) => ({
      ...prev,
      [selectedBlockForCategorization.id]: cat,
    }));
    dispatch(updateBlockCategory({ id: selectedBlockForCategorization.id, category: cat }));
    setSelectedBlockForCategorization(null);
  };

  return (
    <View style={styles.screenContainer}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerTitleRow}>
          <Text style={styles.mainTitle}>Review Your Hours</Text>
          <Text style={styles.dateLabel}>
            {new Date().toLocaleDateString([], {
              weekday: 'long',
              month: 'short',
              day: 'numeric',
            })}
          </Text>
        </View>

        {/* View Toggle Tabs */}
        <View style={styles.toggleRow}>
          <TouchableOpacity
            style={[styles.toggleTab, activeView === 'hours' && styles.toggleTabActive]}
            onPress={() => setActiveView('hours')}
          >
            <Text
              style={[
                styles.toggleTabText,
                activeView === 'hours' && styles.toggleTabTextActive,
              ]}
            >
              Hourly Blocks {todayBlocks.length > 0 ? `(${todayBlocks.length})` : ''}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.toggleTab,
              activeView === 'attendance' && styles.toggleTabActive,
            ]}
            onPress={() => setActiveView('attendance')}
          >
            <Text
              style={[
                styles.toggleTabText,
                activeView === 'attendance' && styles.toggleTabTextActive,
              ]}
            >
              Attendance Logs ({attendanceHistory.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Summary Card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryCol}>
            <Text style={styles.summaryLabel}>TOTAL LOGGED TIME</Text>
            <Text style={styles.summaryValue}>{dynamicTotalLoggedTime}</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryCol}>
            <Text style={styles.summaryLabel}>SHIFT DURATION</Text>
            <Text style={styles.summaryValueSmall}>{dynamicShiftDuration}</Text>
          </View>
        </View>

        {activeView === 'hours' ? (
          <>
            {todayBlocks.length > 0 ? (
              <>
                {/* Instruction Info */}
                <View style={styles.infoRow}>
                  <Hand size={16} color="#3F2C2C" />
                  <Text style={styles.infoText}>Tap a block to categorize your session time.</Text>
                </View>

                {/* Timeline List */}
                <View style={styles.timelineContainer}>
                  {todayBlocks.map((block, index) => (
                    <HourBlockItem
                      key={block.id}
                      block={block}
                      isLast={index === todayBlocks.length - 1}
                      onPress={() => setSelectedBlockForCategorization(block)}
                    />
                  ))}
                </View>

                {/* Categories Section */}
                <View style={styles.categoriesSection}>
                  <Text style={styles.sectionLabel}>AVAILABLE CATEGORIES</Text>
                  <View style={styles.pillsRow}>
                    {categories.map((cat) => (
                      <View key={cat.name} style={styles.categoryPill}>
                        <View style={[styles.dot, { backgroundColor: cat.color }]} />
                        <Text style={styles.pillText}>{cat.name}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </>
            ) : (
              /* Empty State for Hourly Blocks */
              <View style={styles.emptyContainer}>
                <View style={styles.emptyIconCircle}>
                  <Clock size={36} color={COLORS.montoyaRed} />
                </View>
                <Text style={styles.emptyTitle}>No Shifts Logged Today</Text>
                <Text style={styles.emptySubtitle}>
                  Check in to a session from the Home or Schedule screen to automatically log, review, and categorize your shift hours.
                </Text>
              </View>
            )}
          </>
        ) : (
          /* Attendance History Logs */
          <View style={styles.attendanceHistoryContainer}>
            <Text style={styles.sectionLabel}>ATTENDANCE ACTIVITY HISTORY</Text>

            {attendanceHistory.length > 0 ? (
              attendanceHistory.map((item, index) => {
                const inTime = item.checkInTime || item.clockInTime;
                const outTime = item.checkOutTime || item.clockOutTime;
                const isCurrent = !outTime && (item.status === 'Checked In' || item.status === 'In Progress');
                const durationStr = calculateDuration(inTime, outTime, item.date);

                return (
                  <View key={item.attendanceId || `att_hist_${index}`} style={styles.attendanceLogCard}>
                    <View style={styles.logHeaderRow}>
                      <View style={styles.logDateRow}>
                        <Calendar size={13} color={COLORS.montoyaRed} />
                        <Text style={styles.logDateText}>
                          {formatDateLabel(item.date, inTime)}
                        </Text>
                      </View>

                      <View
                        style={[
                          styles.statusTag,
                          isCurrent
                            ? styles.statusTagActive
                            : item.status === 'Completed'
                            ? styles.statusTagCompleted
                            : styles.statusTagDefault,
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusTagText,
                            isCurrent
                              ? styles.statusTagTextActive
                              : item.status === 'Completed'
                              ? styles.statusTagTextCompleted
                              : styles.statusTagTextDefault,
                          ]}
                        >
                          {isCurrent ? 'In Progress' : item.status || 'Verified'}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.logBody}>
                      <View style={styles.logVenueRow}>
                        <MapPin size={15} color={COLORS.montoyaRed} />
                        <Text style={styles.logVenueName}>
                          {item.venueName || item.facilityId || 'Venue not assigned'}
                        </Text>
                        {item.courtName ? (
                          <Text style={styles.logCourtName}>• {item.courtName}</Text>
                        ) : null}
                      </View>

                      <View style={styles.logTimesRow}>
                        <View style={styles.logTimeBlock}>
                          <Text style={styles.logTimeLabel}>CHECK IN</Text>
                          <Text style={styles.logTimeVal}>{formatTimeOnly(inTime)}</Text>
                        </View>

                        <View style={styles.logTimeArrow}>
                          <Text style={styles.arrowText}>→</Text>
                        </View>

                        <View style={styles.logTimeBlock}>
                          <Text style={styles.logTimeLabel}>CHECK OUT</Text>
                          <Text style={styles.logTimeVal}>{formatTimeOnly(outTime)}</Text>
                        </View>

                        <View style={styles.logTimeDivider} />

                        <View style={styles.logTimeBlock}>
                          <Text style={styles.logTimeLabel}>DURATION</Text>
                          <Text style={[styles.logTimeVal, styles.textBold]}>
                            {durationStr}
                          </Text>
                        </View>
                      </View>

                      {item.checkInDistanceMeters !== undefined && (
                        <View style={styles.auditRow}>
                          <ShieldCheck size={12} color="#16A34A" />
                          <Text style={styles.auditText}>
                            GPS Verified ({item.checkInDistanceMeters}m from venue)
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                );
              })
            ) : (
              /* Empty State for Attendance History */
              <View style={styles.emptyContainer}>
                <View style={styles.emptyIconCircle}>
                  <Calendar size={36} color={COLORS.montoyaRed} />
                </View>
                <Text style={styles.emptyTitle}>No Attendance Activity</Text>
                <Text style={styles.emptySubtitle}>
                  Your complete check-in and check-out logs, duration records, and GPS verifications will appear here once recorded.
                </Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Category Selection Modal */}
      <Modal
        visible={!!selectedBlockForCategorization}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedBlockForCategorization(null)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setSelectedBlockForCategorization(null)}
        >
          <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleRow}>
                <Tag size={18} color={COLORS.montoyaRed} />
                <Text style={styles.modalTitle}>Categorize Shift Block</Text>
              </View>
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={() => setSelectedBlockForCategorization(null)}
              >
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              {selectedBlockForCategorization?.startTime} - {selectedBlockForCategorization?.endTime} ({selectedBlockForCategorization?.durationLabel})
            </Text>

            <View style={styles.categoryOptionList}>
              {categories.map((cat) => {
                const isSelected = selectedBlockForCategorization?.category === cat.name;
                return (
                  <TouchableOpacity
                    key={cat.name}
                    style={[
                      styles.categoryOptionCard,
                      isSelected && styles.categoryOptionCardSelected,
                    ]}
                    onPress={() => handleSelectCategory(cat.name)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.colorIndicator, { backgroundColor: cat.color }]} />
                    <View style={styles.catDetails}>
                      <Text style={styles.catOptionName}>{cat.name}</Text>
                      <Text style={styles.catOptionDesc}>{cat.desc}</Text>
                    </View>
                    {isSelected && <Check size={18} color={COLORS.montoyaRed} />}
                  </TouchableOpacity>
                );
              })}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: '#FFF9F9', // Brand background
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: SPACING.lg,
    paddingBottom: moderateScale(100),
  },
  headerTitleRow: {
    marginBottom: SPACING.xl,
  },
  mainTitle: {
    fontSize: moderateFont(22),
    fontWeight: '800',
    color: '#3F2C2C',
    marginBottom: 4,
  },
  dateLabel: {
    fontSize: moderateFont(14),
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  summaryCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    padding: SPACING.xl,
    borderWidth: 1,
    borderColor: '#FEE2E2',
    marginBottom: SPACING.xl,
    ...SHADOWS.card,
  },
  summaryCol: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: moderateFont(10),
    fontWeight: '800',
    color: COLORS.textSecondary,
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  summaryValue: {
    fontSize: moderateFont(20),
    fontWeight: '800',
    color: '#3F2C2C',
  },
  summaryValueSmall: {
    fontSize: moderateFont(13),
    fontWeight: '700',
    color: '#3F2C2C',
    marginTop: 4,
  },
  summaryDivider: {
    width: 1,
    backgroundColor: '#F1F5F9',
    marginHorizontal: SPACING.lg,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: SPACING.xl,
  },
  infoText: {
    fontSize: moderateFont(12),
    color: '#3F2C2C',
    fontWeight: '600',
  },
  timelineContainer: {
    marginBottom: SPACING.xxl,
  },
  categoriesSection: {
    marginTop: SPACING.lg,
  },
  sectionLabel: {
    fontSize: moderateFont(11),
    fontWeight: '800',
    color: COLORS.textSecondary,
    letterSpacing: 0.8,
    marginBottom: SPACING.md,
  },
  pillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  toggleRow: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    padding: 3,
    marginBottom: SPACING.lg,
  },
  toggleTab: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    borderRadius: 8,
  },
  toggleTabActive: {
    backgroundColor: '#FFFFFF',
    ...SHADOWS.card,
  },
  toggleTabText: {
    fontSize: moderateFont(12),
    fontWeight: '700',
    color: '#64748B',
  },
  toggleTabTextActive: {
    color: COLORS.montoyaRed,
  },
  emptyContainer: {
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
    backgroundColor: '#FCEBEA',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  emptyTitle: {
    fontSize: moderateFont(16),
    fontWeight: '800',
    color: '#3F2C2C',
    marginBottom: 6,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: moderateFont(13),
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 280,
  },
  attendanceHistoryContainer: {
    marginTop: SPACING.md,
    gap: 12,
  },
  attendanceLogCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FEE2E2',
    padding: 14,
    gap: 10,
    ...SHADOWS.card,
  },
  logHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  logDateText: {
    fontSize: moderateFont(12),
    fontWeight: '700',
    color: '#1E293B',
  },
  statusTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusTagActive: {
    backgroundColor: '#DCFCE7',
  },
  statusTagCompleted: {
    backgroundColor: '#F1F5F9',
  },
  statusTagDefault: {
    backgroundColor: '#FEF2F2',
  },
  statusTagText: {
    fontSize: moderateFont(10),
    fontWeight: '800',
  },
  statusTagTextActive: {
    color: '#15803D',
  },
  statusTagTextCompleted: {
    color: '#475569',
  },
  statusTagTextDefault: {
    color: COLORS.montoyaRed,
  },
  logBody: {
    gap: 8,
  },
  logVenueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  logVenueName: {
    fontSize: moderateFont(14),
    fontWeight: '800',
    color: '#1E293B',
  },
  logCourtName: {
    fontSize: moderateFont(13),
    color: '#64748B',
    fontWeight: '600',
  },
  logTimesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF9F9',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  logTimeBlock: {
    flex: 1,
  },
  logTimeLabel: {
    fontSize: moderateFont(9),
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.4,
  },
  logTimeVal: {
    fontSize: moderateFont(13),
    fontWeight: '700',
    color: '#1E293B',
    marginTop: 2,
  },
  logTimeArrow: {
    paddingHorizontal: 8,
  },
  arrowText: {
    fontSize: 14,
    color: '#94A3B8',
  },
  logTimeDivider: {
    width: 1,
    height: '80%',
    backgroundColor: '#E2E8F0',
    marginHorizontal: 8,
  },
  textBold: {
    fontWeight: '800',
    color: COLORS.montoyaRed,
  },
  auditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  auditText: {
    fontSize: moderateFont(10),
    color: '#16A34A',
    fontWeight: '600',
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FEE2E2',
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  pillText: {
    fontSize: moderateFont(12),
    fontWeight: '700',
    color: '#3F2C2C',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: SPACING.xl,
    paddingBottom: moderateScale(40),
    gap: 14,
    ...SHADOWS.card,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalTitle: {
    fontSize: moderateFont(17),
    fontWeight: '800',
    color: '#1E293B',
  },
  closeBtn: {
    padding: 4,
  },
  modalSubtitle: {
    fontSize: moderateFont(13),
    color: '#64748B',
    fontWeight: '600',
  },
  categoryOptionList: {
    gap: 10,
    marginTop: 4,
  },
  categoryOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
  },
  categoryOptionCardSelected: {
    backgroundColor: '#FCEBEA',
    borderColor: COLORS.montoyaRed,
  },
  colorIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  catDetails: {
    flex: 1,
  },
  catOptionName: {
    fontSize: moderateFont(14),
    fontWeight: '800',
    color: '#1E293B',
  },
  catOptionDesc: {
    fontSize: moderateFont(11),
    color: '#64748B',
    marginTop: 2,
  },
});
