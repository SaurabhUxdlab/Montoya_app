import React, { useState, useEffect, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import {
  X,
  Calendar,
  Clock,
  MapPin,
  User,
  Repeat,
  FileText,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  Building,
} from 'lucide-react-native';
import {
  CoachAvailabilityRecord,
  AvailabilityFormData,
  AvailabilityStatus,
  VenueOption,
  CoachProfile,
} from '../types';
import { COLORS } from '../constants/colors';
import { RADIUS, SPACING, SHADOWS } from '../constants/theme';
import { moderateScale, moderateFont } from '../utils/responsive';
import {
  fetchVenuesList,
  generateVenueTimeOptions,
  formatTime12h,
  format24HourTime,
} from '../services/availabilityService';

interface AddEditAvailabilityModalProps {
  visible: boolean;
  coach: CoachProfile | null;
  initialData?: CoachAvailabilityRecord | null;
  onClose: () => void;
  onSubmit: (data: AvailabilityFormData, id?: string) => Promise<void>;
}

const DAYS_OF_WEEK = [
  { key: 'Monday', label: 'Mon' },
  { key: 'Tuesday', label: 'Tue' },
  { key: 'Wednesday', label: 'Wed' },
  { key: 'Thursday', label: 'Thu' },
  { key: 'Friday', label: 'Fri' },
  { key: 'Saturday', label: 'Sat' },
  { key: 'Sunday', label: 'Sun' },
];

export const AddEditAvailabilityModal: React.FC<AddEditAvailabilityModalProps> = ({
  visible,
  coach,
  initialData,
  onClose,
  onSubmit,
}) => {
  const isEdit = Boolean(initialData);

  const todayStr = useMemo(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }, []);

  // Form State
  const [date, setDate] = useState(todayStr);
  const [venue, setVenue] = useState('');
  const [venueId, setVenueId] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [privateLessonEligibility, setPrivateLessonEligibility] = useState(true);
  const [groupSessionEligibility, setGroupSessionEligibility] = useState(true);
  const [status, setStatus] = useState<AvailabilityStatus>('Submitted');
  const [notes, setNotes] = useState('');
  // const [isRecurring, setIsRecurring] = useState(false);
  // const [recurringFrequency, setRecurringFrequency] = useState<'Weekly' | 'Bi-Weekly' | 'Monthly'>('Weekly');
  // const [recurringDays, setRecurringDays] = useState<string[]>(['Monday', 'Wednesday', 'Friday']);
  // const [recurringEndDate, setRecurringEndDate] = useState('');

  // Dropdown states
  const [venuesList, setVenuesList] = useState<VenueOption[]>([]);
  const [isVenuePickerOpen, setIsVenuePickerOpen] = useState(false);
  const [isStartTimePickerOpen, setIsStartTimePickerOpen] = useState(false);
  const [isEndTimePickerOpen, setIsEndTimePickerOpen] = useState(false);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load venues from Firestore
  useEffect(() => {
    if (visible) {
      fetchVenuesList().then((venues) => {
        setVenuesList(venues);
        if (!isEdit && venues.length > 0 && !venue) {
          // Pre-select coach's default venue or first venue
          const coachVenue = coach?.venue;
          const match = coachVenue
            ? venues.find((v) => v.name.toLowerCase() === coachVenue.toLowerCase())
            : venues[0];
          if (match) {
            setVenue(match.name);
            setVenueId(match.id);
          }
        }
      });
    }
  }, [visible, isEdit, coach, venue]);

  // Reset or populate fields when modal opens
  useEffect(() => {
    if (visible) {
      if (initialData) {
        setDate(initialData.date || todayStr);
        setVenue(initialData.venue || initialData.locationName || '');
        setVenueId(initialData.venueId || initialData.locationId || '');
        setStartTime(format24HourTime(initialData.startTime) || '09:00');
        setEndTime(format24HourTime(initialData.endTime) || '17:00');
        setPrivateLessonEligibility(
          initialData.privateLessonEligibility ?? initialData.privateLessonWillingness ?? true
        );
        setGroupSessionEligibility(
          initialData.groupSessionEligibility ?? initialData.groupSessionWillingness ?? true
        );
        setStatus(initialData.status || 'Submitted');
        setNotes(initialData.notes || '');
      } else {
        setDate(todayStr);
        setStartTime('09:00');
        setEndTime('17:00');
        setPrivateLessonEligibility(coach?.privateLessonEligibility ?? true);
        setGroupSessionEligibility(true);
        setStatus('Submitted');
        setNotes('');
      }
      setIsVenuePickerOpen(false);
      setIsStartTimePickerOpen(false);
      setIsEndTimePickerOpen(false);
      setIsDatePickerOpen(false);
    }
  }, [visible, initialData, coach, todayStr]);

  // Selected venue details
  const selectedVenue = useMemo(() => {
    if (!venue) return null;
    return (
      venuesList.find(
        (v) => (venueId && v.id === venueId) || v.name.toLowerCase() === venue.toLowerCase()
      ) || null
    );
  }, [venuesList, venue, venueId]);

  const venueOpenTime = selectedVenue?.openingTime || '06:00';
  const venueCloseTime = selectedVenue?.closingTime || '22:00';

  // Time slot options
  const timeSlots = useMemo(() => {
    return generateVenueTimeOptions(venueOpenTime, venueCloseTime);
  }, [venueOpenTime, venueCloseTime]);

  /*
  const toggleRecurringDay = (dayKey: string) => {
    if (recurringDays.includes(dayKey)) {
      if (recurringDays.length === 1) {
        Alert.alert('Required', 'Please select at least one recurring day.');
        return;
      }
      setRecurringDays(recurringDays.filter((d) => d !== dayKey));
    } else {
      setRecurringDays([...recurringDays, dayKey]);
    }
  };
  */

  // Quick date selector helpers
  const next7Days = useMemo(() => {
    const list: { dateStr: string; label: string; subLabel: string }[] = [];
    const base = new Date();
    for (let i = 0; i < 14; i++) {
      const d = new Date();
      d.setDate(base.getDate() + i);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const dateStr = `${y}-${m}-${day}`;
      const label = i === 0 ? 'Today' : i === 1 ? 'Tmrw' : d.toLocaleDateString('en-US', { weekday: 'short' });
      const subLabel = `${d.toLocaleDateString('en-US', { month: 'short' })} ${d.getDate()}`;
      list.push({ dateStr, label, subLabel });
    }
    return list;
  }, []);

  const handleSubmit = async () => {
    if (!venue) {
      Alert.alert('Validation Error', 'Please select a venue / location.');
      return;
    }
    if (!date) {
      Alert.alert('Validation Error', 'Please select an availability date.');
      return;
    }
    if (date < todayStr) {
      Alert.alert('Validation Error', 'Availability date cannot be in the past.');
      return;
    }
    if (!startTime || !endTime) {
      Alert.alert('Validation Error', 'Please select both start time and end time.');
      return;
    }
    if (startTime >= endTime) {
      Alert.alert('Invalid Time Slot', 'End time must be later than start time.');
      return;
    }
    if (!privateLessonEligibility && !groupSessionEligibility) {
      Alert.alert('Validation Error', 'Please enable at least Private Lessons or Group Sessions.');
      return;
    }

    const coachId = coach?.uid || coach?.userId || coach?.coachId || '';
    const coachName = coach?.name || 'Coach';
    const coachEmail = coach?.email || '';
    const coachRole = coach?.role || 'Coach';
    const coachPhoto = coach?.profileImage || '';

    const availableFor: string[] = [
      ...(privateLessonEligibility ? ['Private Lessons'] : []),
      ...(groupSessionEligibility ? ['Group Sessions'] : []),
    ];

    const payload: AvailabilityFormData = {
      coachId,
      coachName,
      coachEmail,
      coachRole,
      coachPhoto,
      venue,
      venueId: selectedVenue?.id || venueId || '',
      locationName: venue,
      locationId: selectedVenue?.id || venueId || '',
      date,
      startTime,
      endTime,
      availableFor,
      privateLessonEligibility,
      groupSessionEligibility,
      privateLessonWillingness: privateLessonEligibility,
      groupSessionWillingness: groupSessionEligibility,
      status,
      availabilityStatus: status === 'Approved' || status === 'Available' ? 'Available' : 'Unavailable',
      notes: notes.trim(),
      // isRecurring,
      // recurringFrequency: isRecurring ? recurringFrequency : null,
      // recurringDays: isRecurring ? recurringDays : null,
      // recurringEndDate: isRecurring ? recurringEndDate : null,
    };

    setIsSubmitting(true);
    try {
      await onSubmit(payload, initialData?.id);
      onClose();
    } catch (err: any) {
      Alert.alert('Save Failed', err?.message || 'Could not save availability. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.headerTitle}>
                {isEdit ? 'Edit Availability' : 'Add Coach Availability'}
              </Text>
              <Text style={styles.headerSubtitle}>
                {coach?.name ? `Coach: ${coach.name}` : 'Set your available hours and locations'}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
              disabled={isSubmitting}
            >
              <X size={20} color="#475569" />
            </TouchableOpacity>
          </View>

          {/* Form Fields */}
          <ScrollView
            style={styles.formScroll}
            contentContainerStyle={styles.formScrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* 1. Logged in Coach Preview */}
            <View style={styles.coachCard}>
              <View style={styles.coachAvatar}>
                <User size={18} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.coachNameText}>{coach?.name || 'Coach'}</Text>
                <Text style={styles.coachRoleText}>
                  {coach?.role || 'Tennis Coach'} • {coach?.email || ''}
                </Text>
              </View>
              <View style={styles.selfTag}>
                <Text style={styles.selfTagText}>YOU</Text>
              </View>
            </View>

            {/* 2. Date Selection */}
            <View style={styles.sectionBlock}>
              <View style={styles.sectionTitleRow}>
                <Calendar size={16} color={COLORS.montoyaRed} />
                <Text style={styles.sectionLabel}>AVAILABILITY DATE</Text>
              </View>

              {/* Horizontal Date Picker */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.datePickerScroll}
              >
                {next7Days.map((item) => {
                  const isSelected = date === item.dateStr;
                  return (
                    <TouchableOpacity
                      key={item.dateStr}
                      style={[
                        styles.dateChip,
                        isSelected && styles.dateChipSelected,
                      ]}
                      onPress={() => setDate(item.dateStr)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.dateChipDay,
                          isSelected && styles.dateChipTextSelected,
                        ]}
                      >
                        {item.label}
                      </Text>
                      <Text
                        style={[
                          styles.dateChipDate,
                          isSelected && styles.dateChipTextSelected,
                        ]}
                      >
                        {item.subLabel}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* 3. Venue / Location */}
            <View style={styles.sectionBlock}>
              <View style={styles.sectionTitleRow}>
                <MapPin size={16} color={COLORS.montoyaRed} />
                <Text style={styles.sectionLabel}>VENUE / CLUB LOCATION</Text>
              </View>

              <TouchableOpacity
                style={styles.selectTrigger}
                onPress={() => setIsVenuePickerOpen(!isVenuePickerOpen)}
                activeOpacity={0.8}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                  <Building size={16} color="#64748B" style={{ marginRight: 8 }} />
                  <Text
                    style={[
                      styles.selectTriggerText,
                      !venue && { color: '#94A3B8' },
                    ]}
                    numberOfLines={1}
                  >
                    {venue || 'Select Venue...'}
                  </Text>
                </View>
                <ChevronDown size={16} color="#64748B" />
              </TouchableOpacity>

              {/* Venue Dropdown list */}
              {isVenuePickerOpen && (
                <View style={styles.dropdownList}>
                  {venuesList.map((v) => (
                    <TouchableOpacity
                      key={v.id}
                      style={[
                        styles.dropdownItem,
                        venue === v.name && styles.dropdownItemSelected,
                      ]}
                      onPress={() => {
                        setVenue(v.name);
                        setVenueId(v.id);
                        setIsVenuePickerOpen(false);
                      }}
                    >
                      <View style={{ flex: 1 }}>
                        <Text
                          style={[
                            styles.dropdownItemText,
                            venue === v.name && styles.dropdownItemTextSelected,
                          ]}
                        >
                          {v.name}
                        </Text>
                        <Text style={styles.dropdownItemSubText}>
                          Hours: {formatTime12h(v.openingTime || '06:00')} –{' '}
                          {formatTime12h(v.closingTime || '22:00')}
                          {v.city ? ` • ${v.city}` : ''}
                        </Text>
                      </View>
                      {venue === v.name && (
                        <CheckCircle2 size={16} color={COLORS.montoyaRed} />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* 4. Time Range (Start Time & End Time) */}
            <View style={styles.sectionBlock}>
              <View style={styles.sectionTitleRow}>
                <Clock size={16} color={COLORS.montoyaRed} />
                <Text style={styles.sectionLabel}>WORKING HOURS / TIME SLOT</Text>
              </View>

              <View style={styles.timeInputsRow}>
                {/* Start Time Trigger */}
                <View style={styles.timeCol}>
                  <Text style={styles.fieldSubLabel}>START TIME</Text>
                  <TouchableOpacity
                    style={styles.timeTrigger}
                    onPress={() => {
                      setIsStartTimePickerOpen(!isStartTimePickerOpen);
                      setIsEndTimePickerOpen(false);
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.timeTriggerText}>
                      {formatTime12h(startTime) || '09:00 AM'}
                    </Text>
                    <ChevronDown size={14} color="#64748B" />
                  </TouchableOpacity>
                </View>

                <View style={styles.timeDivider}>
                  <Text style={styles.timeDividerText}>to</Text>
                </View>

                {/* End Time Trigger */}
                <View style={styles.timeCol}>
                  <Text style={styles.fieldSubLabel}>END TIME</Text>
                  <TouchableOpacity
                    style={styles.timeTrigger}
                    onPress={() => {
                      setIsEndTimePickerOpen(!isEndTimePickerOpen);
                      setIsStartTimePickerOpen(false);
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.timeTriggerText}>
                      {formatTime12h(endTime) || '05:00 PM'}
                    </Text>
                    <ChevronDown size={14} color="#64748B" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Start Time Dropdown */}
              {isStartTimePickerOpen && (
                <View style={styles.timeDropdown}>
                  <Text style={styles.dropdownHeader}>Select Start Time</Text>
                  <ScrollView style={{ maxHeight: 180 }} nestedScrollEnabled>
                    {timeSlots.map((slot) => (
                      <TouchableOpacity
                        key={`start-${slot.value}`}
                        style={[
                          styles.timeSlotItem,
                          startTime === slot.value && styles.timeSlotItemSelected,
                        ]}
                        onPress={() => {
                          setStartTime(slot.value);
                          setIsStartTimePickerOpen(false);
                          if (endTime <= slot.value) {
                            const next = timeSlots.find((s) => s.value > slot.value);
                            if (next) setEndTime(next.value);
                          }
                        }}
                      >
                        <Text
                          style={[
                            styles.timeSlotText,
                            startTime === slot.value && styles.timeSlotTextSelected,
                          ]}
                        >
                          {slot.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              {/* End Time Dropdown */}
              {isEndTimePickerOpen && (
                <View style={styles.timeDropdown}>
                  <Text style={styles.dropdownHeader}>Select End Time</Text>
                  <ScrollView style={{ maxHeight: 180 }} nestedScrollEnabled>
                    {timeSlots.map((slot) => (
                      <TouchableOpacity
                        key={`end-${slot.value}`}
                        style={[
                          styles.timeSlotItem,
                          endTime === slot.value && styles.timeSlotItemSelected,
                        ]}
                        onPress={() => {
                          setEndTime(slot.value);
                          setIsEndTimePickerOpen(false);
                        }}
                      >
                        <Text
                          style={[
                            styles.timeSlotText,
                            endTime === slot.value && styles.timeSlotTextSelected,
                          ]}
                        >
                          {slot.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>

            {/* 5. Service Willingness & Eligibility */}
            <View style={styles.sectionBlock}>
              <Text style={styles.sectionLabel}>LESSON WILLINGNESS & ELIGIBILITY</Text>

              <View style={styles.switchRow}>
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <Text style={styles.switchTitle}>Private Lessons</Text>
                  <Text style={styles.switchDescription}>
                    Willing to accept 1-on-1 private lesson requests
                  </Text>
                </View>
                <Switch
                  value={privateLessonEligibility}
                  onValueChange={setPrivateLessonEligibility}
                  trackColor={{ false: '#E2E8F0', true: '#FECDD3' }}
                  thumbColor={privateLessonEligibility ? COLORS.montoyaRed : '#94A3B8'}
                />
              </View>

              <View style={[styles.switchRow, { marginTop: SPACING.sm }]}>
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <Text style={styles.switchTitle}>Group Sessions & Clinics</Text>
                  <Text style={styles.switchDescription}>
                    Available to coach group sessions, squad clinics & drills
                  </Text>
                </View>
                <Switch
                  value={groupSessionEligibility}
                  onValueChange={setGroupSessionEligibility}
                  trackColor={{ false: '#E2E8F0', true: '#FECDD3' }}
                  thumbColor={groupSessionEligibility ? COLORS.montoyaRed : '#94A3B8'}
                />
              </View>
            </View>

            {/* 6. Availability Status (Auto-set to Submitted/Pending) */}
            {/*
            <View style={styles.sectionBlock}>
              <Text style={styles.sectionLabel}>STATUS</Text>
              <View style={styles.statusButtonGroup}>
                <TouchableOpacity
                  style={[
                    styles.statusOptionButton,
                    status === 'Approved' && styles.statusOptionApprovedActive,
                  ]}
                  onPress={() => setStatus('Approved')}
                  activeOpacity={0.7}
                >
                  <CheckCircle2
                    size={15}
                    color={status === 'Approved' ? '#15803D' : '#64748B'}
                    style={{ marginRight: 6 }}
                  />
                  <Text
                    style={[
                      styles.statusOptionText,
                      status === 'Approved' && styles.statusOptionTextApproved,
                    ]}
                  >
                    Approved (Active Shift)
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.statusOptionButton,
                    status === 'Submitted' && styles.statusOptionSubmittedActive,
                  ]}
                  onPress={() => setStatus('Submitted')}
                  activeOpacity={0.7}
                >
                  <AlertCircle
                    size={15}
                    color={status === 'Submitted' ? '#B45309' : '#64748B'}
                    style={{ marginRight: 6 }}
                  />
                  <Text
                    style={[
                      styles.statusOptionText,
                      status === 'Submitted' && styles.statusOptionTextSubmitted,
                    ]}
                  >
                    Submitted (Pending)
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
            */}

            {/* 7. Recurring Schedule Option (Commented out) */}
            {/*
            <View style={styles.sectionBlock}>
              <View style={styles.switchRow}>
                <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
                  <Repeat size={16} color="#4338CA" style={{ marginRight: 8 }} />
                  <View>
                    <Text style={styles.switchTitle}>Recurring Schedule</Text>
                    <Text style={styles.switchDescription}>
                      Repeat this availability across multiple weeks
                    </Text>
                  </View>
                </View>
                <Switch
                  value={isRecurring}
                  onValueChange={setIsRecurring}
                  trackColor={{ false: '#E2E8F0', true: '#C7D2FE' }}
                  thumbColor={isRecurring ? '#4338CA' : '#94A3B8'}
                />
              </View>

              {isRecurring && (
                <View style={styles.recurringContainer}>
                  <Text style={styles.fieldSubLabel}>RECURRENCE FREQUENCY</Text>
                  <View style={styles.frequencyRow}>
                    {(['Weekly', 'Bi-Weekly', 'Monthly'] as const).map((freq) => (
                      <TouchableOpacity
                        key={freq}
                        style={[
                          styles.freqPill,
                          recurringFrequency === freq && styles.freqPillActive,
                        ]}
                        onPress={() => setRecurringFrequency(freq)}
                      >
                        <Text
                          style={[
                            styles.freqPillText,
                            recurringFrequency === freq && styles.freqPillTextActive,
                          ]}
                        >
                          {freq}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Text style={[styles.fieldSubLabel, { marginTop: SPACING.md }]}>
                    REPEAT ON DAYS
                  </Text>
                  <View style={styles.daysChipRow}>
                    {DAYS_OF_WEEK.map((d) => {
                      const isSelected = recurringDays.includes(d.key);
                      return (
                        <TouchableOpacity
                          key={d.key}
                          style={[
                            styles.dayChip,
                            isSelected && styles.dayChipActive,
                          ]}
                          onPress={() => toggleRecurringDay(d.key)}
                        >
                          <Text
                            style={[
                              styles.dayChipText,
                              isSelected && styles.dayChipTextActive,
                            ]}
                          >
                            {d.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}
            </View>
            */}

            {/* 8. Additional Notes */}
            <View style={styles.sectionBlock}>
              <View style={styles.sectionTitleRow}>
                <FileText size={16} color={COLORS.montoyaRed} />
                <Text style={styles.sectionLabel}>ADDITIONAL NOTES (OPTIONAL)</Text>
              </View>
              <TextInput
                style={styles.notesInput}
                placeholder="e.g., Prefers Court 1-2, available for early squad drills..."
                placeholderTextColor="#94A3B8"
                multiline
                numberOfLines={3}
                value={notes}
                onChangeText={setNotes}
              />
            </View>
          </ScrollView>

          {/* Footer Submit Button */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.cancelFooterButton}
              onPress={onClose}
              disabled={isSubmitting}
            >
              <Text style={styles.cancelFooterText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.submitFooterButton}
              onPress={handleSubmit}
              disabled={isSubmitting}
              activeOpacity={0.8}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.submitFooterText}>
                  {isEdit ? 'Save Changes' : 'Confirm Availability'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    maxHeight: '92%',
    minHeight: '80%',
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerTitle: {
    fontSize: moderateFont(18),
    fontWeight: '700',
    color: '#0F172A',
  },
  headerSubtitle: {
    fontSize: moderateFont(12),
    color: '#64748B',
    marginTop: 2,
  },
  closeButton: {
    padding: 6,
    borderRadius: RADIUS.full,
    backgroundColor: '#F1F5F9',
  },
  formScroll: {
    flex: 1,
  },
  formScrollContent: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xxl,
  },
  coachCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF5F4',
    borderWidth: 1,
    borderColor: '#F5E0DE',
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
  },
  coachAvatar: {
    width: moderateScale(36),
    height: moderateScale(36),
    borderRadius: moderateScale(18),
    backgroundColor: COLORS.montoyaRed,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  coachNameText: {
    fontSize: moderateFont(14),
    fontWeight: '700',
    color: '#1E293B',
  },
  coachRoleText: {
    fontSize: moderateFont(12),
    color: '#64748B',
  },
  selfTag: {
    backgroundColor: COLORS.montoyaRed,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  selfTagText: {
    fontSize: moderateFont(10),
    fontWeight: '800',
    color: '#FFFFFF',
  },
  sectionBlock: {
    marginBottom: SPACING.lg,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  sectionLabel: {
    fontSize: moderateFont(11),
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.8,
    marginLeft: 6,
  },
  fieldSubLabel: {
    fontSize: moderateFont(10),
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  datePickerScroll: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
  },
  dateChip: {
    width: moderateScale(68),
    paddingVertical: 10,
    borderRadius: RADIUS.md,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateChipSelected: {
    backgroundColor: COLORS.montoyaRed,
    borderColor: COLORS.montoyaRed,
  },
  dateChipDay: {
    fontSize: moderateFont(12),
    fontWeight: '700',
    color: '#1E293B',
  },
  dateChipDate: {
    fontSize: moderateFont(11),
    color: '#64748B',
    marginTop: 2,
  },
  dateChipTextSelected: {
    color: '#FFFFFF',
  },
  selectTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
  },
  selectTriggerText: {
    fontSize: moderateFont(14),
    fontWeight: '600',
    color: '#0F172A',
  },
  dropdownList: {
    marginTop: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    ...SHADOWS.card,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  dropdownItemSelected: {
    backgroundColor: '#FAF5F4',
  },
  dropdownItemText: {
    fontSize: moderateFont(13),
    fontWeight: '600',
    color: '#1E293B',
  },
  dropdownItemTextSelected: {
    color: COLORS.montoyaRed,
    fontWeight: '700',
  },
  dropdownItemSubText: {
    fontSize: moderateFont(11),
    color: '#64748B',
    marginTop: 2,
  },
  timeInputsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timeCol: {
    flex: 1,
  },
  timeDivider: {
    paddingHorizontal: SPACING.sm,
    paddingTop: 16,
  },
  timeDividerText: {
    fontSize: moderateFont(12),
    fontWeight: '600',
    color: '#94A3B8',
  },
  timeTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: 12,
  },
  timeTriggerText: {
    fontSize: moderateFont(14),
    fontWeight: '700',
    color: '#0F172A',
  },
  timeDropdown: {
    marginTop: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: RADIUS.md,
    padding: SPACING.xs,
    ...SHADOWS.card,
  },
  dropdownHeader: {
    fontSize: moderateFont(11),
    fontWeight: '700',
    color: '#94A3B8',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  timeSlotItem: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: RADIUS.sm,
  },
  timeSlotItemSelected: {
    backgroundColor: '#FAF5F4',
  },
  timeSlotText: {
    fontSize: moderateFont(13),
    fontWeight: '500',
    color: '#1E293B',
  },
  timeSlotTextSelected: {
    color: COLORS.montoyaRed,
    fontWeight: '700',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  switchTitle: {
    fontSize: moderateFont(14),
    fontWeight: '700',
    color: '#1E293B',
  },
  switchDescription: {
    fontSize: moderateFont(12),
    color: '#64748B',
    marginTop: 2,
  },
  statusButtonGroup: {
    flexDirection: 'row',
    gap: 10,
  },
  statusOptionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  statusOptionApprovedActive: {
    backgroundColor: '#DCFCE7',
    borderColor: '#86EFAC',
  },
  statusOptionSubmittedActive: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FCD34D',
  },
  statusOptionText: {
    fontSize: moderateFont(12),
    fontWeight: '600',
    color: '#64748B',
  },
  statusOptionTextApproved: {
    color: '#15803D',
    fontWeight: '700',
  },
  statusOptionTextSubmitted: {
    color: '#B45309',
    fontWeight: '700',
  },
  recurringContainer: {
    marginTop: SPACING.sm,
    padding: SPACING.md,
    backgroundColor: '#F8FAFC',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: '#E0E7FF',
  },
  frequencyRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  freqPill: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: RADIUS.sm,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
  },
  freqPillActive: {
    backgroundColor: '#4338CA',
    borderColor: '#4338CA',
  },
  freqPillText: {
    fontSize: moderateFont(12),
    fontWeight: '600',
    color: '#475569',
  },
  freqPillTextActive: {
    color: '#FFFFFF',
  },
  daysChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  dayChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  dayChipActive: {
    backgroundColor: '#4338CA',
    borderColor: '#4338CA',
  },
  dayChipText: {
    fontSize: moderateFont(12),
    fontWeight: '600',
    color: '#475569',
  },
  dayChipTextActive: {
    color: '#FFFFFF',
  },
  notesInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    fontSize: moderateFont(13),
    color: '#0F172A',
    textAlignVertical: 'top',
    minHeight: 80,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  cancelFooterButton: {
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.md,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelFooterText: {
    fontSize: moderateFont(14),
    fontWeight: '600',
    color: '#475569',
  },
  submitFooterButton: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.montoyaRed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitFooterText: {
    fontSize: moderateFont(14),
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
