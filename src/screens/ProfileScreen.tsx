import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  Switch,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import {
  Mail,
  Phone,
  Pencil,
  Settings as SettingsIcon,
  GraduationCap,
  ShieldCheck,
  Star,
  MapPin,
  Search,
  X,
  Check,
  LogOut,
  Bell,
  Lock,
  Camera,
  User as UserIcon,
} from 'lucide-react-native';
import { COLORS } from '../constants/colors';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import { setUser, logout } from '../store/slices/authSlice';
import { CoachProfile } from '../types';
import { logoutCoach } from '../services/authService';
import {
  updateCoachProfileInFirestore,
  uploadCoachProfileImage,
  subscribeToCoachProfile,
} from '../services/profileService';

export const ProfileScreen: React.FC = () => {
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);

  const [editModalVisible, setEditModalVisible] = useState(false);
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  // Edit form states
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [role, setRole] = useState(user?.role || 'Coach');
  const [status, setStatus] = useState(user?.status || 'Active');
  const [experience, setExperience] = useState(user?.experience || user?.experienceYears || '');
  const [notes, setNotes] = useState(user?.notes || user?.availabilityNote || '');
  const [privateLessonEligibility, setPrivateLessonEligibility] = useState<boolean>(
    user?.privateLessonEligibility !== undefined ? user.privateLessonEligibility : true
  );
  const [specialtiesText, setSpecialtiesText] = useState('');
  const [preferredLocationsText, setPreferredLocationsText] = useState('');
  const [venue, setVenue] = useState(user?.venue || '');

  // Sync state whenever user in Redux updates or when edit modal opens
  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setEmail(user.email || '');
      setPhone(user.phone || '');
      setRole(user.role || 'Coach');
      setStatus(user.status || 'Active');
      setExperience(user.experience || user.experienceYears || '');
      setNotes(user.notes || user.availabilityNote || '');
      setPrivateLessonEligibility(
        user.privateLessonEligibility !== undefined ? user.privateLessonEligibility : true
      );
      setSpecialtiesText((user.specialties || []).join(', '));
      const locs =
        user.preferredLocations && user.preferredLocations.length > 0
          ? user.preferredLocations
          : user.locations && user.locations.length > 0
          ? user.locations
          : user.venue
          ? [user.venue]
          : [];
      setPreferredLocationsText(locs.join(', '));
      setVenue(user.venue || (locs.length > 0 ? locs[0] : ''));
    }
  }, [user, editModalVisible]);

  // Real-time listener to Firestore for live profile sync
  useEffect(() => {
    if (!user?.uid) return;
    const unsub = subscribeToCoachProfile(user.uid, (freshProfile) => {
      if (freshProfile) {
        dispatch(setUser(freshProfile));
      }
    });
    return () => unsub();
  }, [user?.uid, dispatch]);

  const initials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'C';

  const specialties = user?.specialties || [];
  const preferredLocations =
    user?.preferredLocations && user.preferredLocations.length > 0
      ? user.preferredLocations
      : user?.locations && user.locations.length > 0
      ? user.locations
      : user?.venue
      ? [user.venue]
      : [];

  const handlePickImage = () => {
    if (!user || !user.uid) {
      Alert.alert('Error', 'No authenticated coach profile found.');
      return;
    }

    Alert.alert('Update Profile Photo', 'Choose a source to update your profile photo', [
      {
        text: 'Take Photo',
        onPress: async () => {
          try {
            const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
            if (cameraStatus !== 'granted') {
              Alert.alert('Permission Required', 'Camera permission is required to take a photo.');
              return;
            }
            const result = await ImagePicker.launchCameraAsync({
              allowsEditing: true,
              aspect: [1, 1],
              quality: 0.8,
            });
            if (!result.canceled && result.assets && result.assets.length > 0) {
              await processImageUpload(result.assets[0].uri);
            }
          } catch (err: any) {
            console.error('Camera upload error:', err);
            Alert.alert('Error', err?.message || 'Could not open camera.');
          }
        },
      },
      {
        text: 'Choose from Gallery',
        onPress: async () => {
          try {
            const { status: libStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (libStatus !== 'granted') {
              Alert.alert('Permission Required', 'Gallery access is required to select a photo.');
              return;
            }
            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              allowsEditing: true,
              aspect: [1, 1],
              quality: 0.8,
            });
            if (!result.canceled && result.assets && result.assets.length > 0) {
              await processImageUpload(result.assets[0].uri);
            }
          } catch (err: any) {
            console.error('Gallery upload error:', err);
            Alert.alert('Error', err?.message || 'Could not select photo.');
          }
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const processImageUpload = async (localUri: string) => {
    if (!user?.uid) return;
    setIsUploadingImage(true);
    try {
      const downloadUrl = await uploadCoachProfileImage(user.uid, localUri);
      dispatch(setUser({ ...user, profileImage: downloadUrl }));
      Alert.alert('Success', 'Profile photo updated successfully!');
    } catch (error: any) {
      console.error('Profile photo upload error:', error);
      Alert.alert('Upload Failed', error?.message || 'Failed to upload photo to storage.');
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!user || !user.uid) {
      Alert.alert('Error', 'No authenticated coach profile found.');
      return;
    }

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanName || !cleanEmail) {
      Alert.alert('Validation Error', 'Name and email are required.');
      return;
    }

    setIsSaving(true);
    try {
      const specialtiesArray = specialtiesText
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      const preferredLocationsArray = preferredLocationsText
        .split(',')
        .map((l) => l.trim())
        .filter(Boolean);

      const resolvedVenue =
        venue.trim() || (preferredLocationsArray.length > 0 ? preferredLocationsArray[0] : '');

      const updates: Partial<CoachProfile> = {
        name: cleanName,
        email: cleanEmail,
        phone: phone.trim(),
        role: role.trim() || 'Coach',
        status: status.trim() || 'Active',
        experience: experience.trim(),
        notes: notes.trim(),
        privateLessonEligibility,
        specialties: specialtiesArray,
        preferredLocations: preferredLocationsArray,
        locations: preferredLocationsArray,
        venue: resolvedVenue,
      };

      // 1. Persist directly to Firestore across users/{uid} and coaches/{uid}
      await updateCoachProfileInFirestore(user.uid, updates);

      // 2. Update Redux store immediately
      const updatedProfile: CoachProfile = {
        ...user,
        ...updates,
      };
      dispatch(setUser(updatedProfile));

      setEditModalVisible(false);
      Alert.alert('Success', 'Profile updated successfully.');
    } catch (error: any) {
      console.error('Error updating coach profile:', error);
      Alert.alert(
        'Update Notice',
        error?.message || 'Could not save profile changes.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: async () => {
          setSettingsModalVisible(false);
          try {
            await logoutCoach();
          } catch (e) {
            console.warn('Firebase logout warning:', e);
          }
          dispatch(logout());
        },
      },
    ]);
  };

  return (
    <View style={styles.screenContainer}>
      <ScrollView
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Main Profile Card */}
        <View style={styles.card}>
          <TouchableOpacity
            style={styles.avatarWrapper}
            onPress={handlePickImage}
            disabled={isUploadingImage}
            activeOpacity={0.8}
          >
            <View style={styles.avatarContainer}>
              {user?.profileImage ? (
                <Image source={{ uri: user.profileImage }} style={styles.avatarImage} />
              ) : (
                <View style={styles.avatarFallback}>
                  <Text style={styles.avatarFallbackText}>{initials}</Text>
                </View>
              )}
              {isUploadingImage && (
                <View style={styles.avatarLoadingOverlay}>
                  <ActivityIndicator size="small" color="#FFFFFF" />
                </View>
              )}
            </View>
            <View style={styles.avatarCameraBadge}>
              <Camera size={14} color="#FFFFFF" />
            </View>
          </TouchableOpacity>

          <Text style={styles.coachName}>{user?.name || 'No Name Set'}</Text>

          {/* Role & Status Pill */}
          <View style={styles.roleStatusRow}>
            <View style={styles.rolePill}>
              <Text style={styles.rolePillText}>{user?.role || 'Coach'}</Text>
            </View>
            <View
              style={[
                styles.statusPill,
                user?.status === 'Active' ? styles.statusActivePill : styles.statusInactivePill,
              ]}
            >
              <View
                style={[
                  styles.statusPillDot,
                  user?.status === 'Active' ? styles.statusDotActive : styles.statusDotInactive,
                ]}
              />
              <Text
                style={[
                  styles.statusPillText,
                  user?.status === 'Active' ? styles.statusActiveText : styles.statusInactiveText,
                ]}
              >
                {user?.status || 'Active'}
              </Text>
            </View>
          </View>

          {/* Contact Details */}
          <View style={styles.contactRow}>
            <Mail size={15} color={COLORS.montoyaRed} />
            <Text style={styles.contactText}>
              {user?.email || 'No email provided'}
            </Text>
          </View>

          <View style={styles.contactRow}>
            <Phone size={15} color={COLORS.montoyaRed} />
            <Text style={styles.contactText}>
              {user?.phone || 'No phone number provided'}
            </Text>
          </View>

          {/* Action Buttons */}
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => setEditModalVisible(true)}
            activeOpacity={0.85}
          >
            <Pencil size={15} color={COLORS.white} />
            <Text style={styles.primaryButtonText}>Edit Profile</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => setSettingsModalVisible(true)}
            activeOpacity={0.85}
          >
            <SettingsIcon size={15} color={COLORS.montoyaRed} />
            <Text style={styles.secondaryButtonText}>Settings</Text>
          </TouchableOpacity>
        </View>

        {/* Experience Card */}
        <View style={styles.card}>
          <View style={styles.sectionHeaderRow}>
            <GraduationCap size={19} color={COLORS.montoyaRed} />
            <Text style={styles.sectionHeading}>Experience</Text>
          </View>

          {user?.experience ? (
            <Text style={styles.experienceHighlight}>{user.experience}</Text>
          ) : (
            <Text style={styles.emptyText}>
              No experience details provided yet. Tap "Edit Profile" to add your experience and certifications.
            </Text>
          )}
        </View>

        {/* Status & Eligibility Card */}
        <View style={styles.card}>
          <View style={styles.sectionHeaderRow}>
            <ShieldCheck size={19} color={COLORS.montoyaRed} />
            <Text style={styles.sectionHeading}>Lesson Eligibility & Notes</Text>
          </View>

          <View style={styles.eligibilityRow}>
            <View
              style={[
                styles.eligibilityBadge,
                user?.privateLessonEligibility !== false
                  ? styles.eligibilityActive
                  : styles.eligibilityInactive,
              ]}
            >
              <Text
                style={[
                  styles.eligibilityText,
                  user?.privateLessonEligibility !== false
                    ? styles.eligibilityTextActive
                    : styles.eligibilityTextInactive,
                ]}
              >
                {user?.privateLessonEligibility !== false
                  ? 'Private Lessons: Eligible'
                  : 'Private Lessons: Not Eligible'}
              </Text>
            </View>
          </View>

          {user?.notes ? (
            <>
              <View style={styles.subDivider} />
              <Text style={styles.notesLabel}>Notes:</Text>
              <Text style={styles.bodyDescription}>{user.notes}</Text>
            </>
          ) : null}
        </View>

        {/* Specialties Card */}
        <View style={styles.card}>
          <View style={styles.sectionHeaderRow}>
            <Star size={19} color={COLORS.montoyaRed} />
            <Text style={styles.sectionHeading}>Specialties</Text>
          </View>

          {specialties.length > 0 ? (
            <View style={styles.tagsContainer}>
              {specialties.map((specialty, index) => (
                <View key={index} style={styles.tagPill}>
                  <Text style={styles.tagText}>{specialty}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.emptyText}>
              No specialties added yet. Tap "Edit Profile" to list your coaching specialties.
            </Text>
          )}
        </View>

        {/* Preferred Locations & Venue Card */}
        <View style={styles.card}>
          <View style={styles.sectionHeaderRow}>
            <MapPin size={19} color={COLORS.montoyaRed} />
            <Text style={styles.sectionHeading}>Preferred Locations & Venue</Text>
          </View>

          {user?.venue ? (
            <View style={styles.primaryVenueBox}>
              <Text style={styles.primaryVenueLabel}>Primary Venue:</Text>
              <Text style={styles.primaryVenueName}>{user.venue}</Text>
            </View>
          ) : null}

          {preferredLocations.length > 0 ? (
            <View style={styles.locationsList}>
              {preferredLocations.map((loc, index) => (
                <View key={index} style={styles.locationItemBox}>
                  <Search size={16} color={COLORS.montoyaRed} />
                  <Text style={styles.locationItemText}>{loc}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.emptyText}>
              No preferred locations added yet. Tap "Edit Profile" to add locations.
            </Text>
          )}
        </View>
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal visible={editModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Profile</Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <X size={22} color={COLORS.montoyaRed} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Photo edit prompt in modal */}
              <TouchableOpacity
                style={styles.modalAvatarContainer}
                onPress={handlePickImage}
                disabled={isUploadingImage}
                activeOpacity={0.8}
              >
                {user?.profileImage ? (
                  <Image source={{ uri: user.profileImage }} style={styles.modalAvatarImage} />
                ) : (
                  <View style={[styles.modalAvatarImage, styles.modalAvatarFallback]}>
                    <UserIcon size={24} color={COLORS.montoyaRed} />
                  </View>
                )}
                <View style={styles.modalAvatarTextWrapper}>
                  <Text style={styles.modalAvatarActionText}>
                    {isUploadingImage ? 'Uploading Photo...' : 'Change Profile Photo'}
                  </Text>
                  <Text style={styles.modalAvatarSubText}>
                    Tap to upload from camera or gallery
                  </Text>
                </View>
                <Camera size={18} color={COLORS.montoyaRed} />
              </TouchableOpacity>

              <Text style={styles.inputLabel}>Full Name</Text>
              <TextInput
                style={styles.textInput}
                value={name}
                onChangeText={setName}
                placeholder="e.g. John Doe"
                placeholderTextColor="#94A3B8"
              />

              <Text style={styles.inputLabel}>Email Address</Text>
              <TextInput
                style={styles.textInput}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholder="e.g. coach@academy.com"
                placeholderTextColor="#94A3B8"
              />

              <Text style={styles.inputLabel}>Phone Number</Text>
              <TextInput
                style={styles.textInput}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                placeholder="e.g. +1 (555) 000-0000"
                placeholderTextColor="#94A3B8"
              />

              <Text style={styles.inputLabel}>Role (e.g. Senior Coach, Coach, Head Coach)</Text>
              <TextInput
                style={styles.textInput}
                value={role}
                onChangeText={setRole}
                placeholder="Senior Coach"
                placeholderTextColor="#94A3B8"
              />

              <Text style={styles.inputLabel}>Status (e.g. Active, Inactive)</Text>
              <TextInput
                style={styles.textInput}
                value={status}
                onChangeText={setStatus}
                placeholder="Active"
                placeholderTextColor="#94A3B8"
              />

              <Text style={styles.inputLabel}>Experience</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                value={experience}
                onChangeText={setExperience}
                placeholder="e.g. 8 Years (NCAA Division 1 Player, PTR Certified)"
                placeholderTextColor="#94A3B8"
                multiline
              />

              <View style={styles.switchRow}>
                <View style={styles.switchTextCol}>
                  <Text style={styles.switchLabel}>Private Lesson Eligibility</Text>
                  <Text style={styles.switchSubLabel}>Eligible to accept private lessons</Text>
                </View>
                <Switch
                  value={privateLessonEligibility}
                  onValueChange={setPrivateLessonEligibility}
                  trackColor={{ false: '#E2E8F0', true: '#FECACA' }}
                  thumbColor={privateLessonEligibility ? COLORS.montoyaRed : '#94A3B8'}
                />
              </View>

              <Text style={styles.inputLabel}>Notes</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                value={notes}
                onChangeText={setNotes}
                placeholder="Additional notes..."
                placeholderTextColor="#94A3B8"
                multiline
              />

              <Text style={styles.inputLabel}>Specialties (comma separated)</Text>
              <TextInput
                style={styles.textInput}
                value={specialtiesText}
                onChangeText={setSpecialtiesText}
                placeholder="Forehand Top-Spin, Footwork & Agility, Doubles Tactics"
                placeholderTextColor="#94A3B8"
              />

              <Text style={styles.inputLabel}>Preferred Locations (comma separated)</Text>
              <TextInput
                style={styles.textInput}
                value={preferredLocationsText}
                onChangeText={setPreferredLocationsText}
                placeholder="Riverside Club, Clay Courts"
                placeholderTextColor="#94A3B8"
              />

              <Text style={styles.inputLabel}>Primary Venue</Text>
              <TextInput
                style={styles.textInput}
                value={venue}
                onChangeText={setVenue}
                placeholder="Riverside Club"
                placeholderTextColor="#94A3B8"
              />

              <TouchableOpacity
                style={[styles.saveButton, isSaving && { opacity: 0.7 }]}
                onPress={handleSaveProfile}
                disabled={isSaving}
                activeOpacity={0.85}
              >
                {isSaving ? (
                  <ActivityIndicator color={COLORS.white} size="small" />
                ) : (
                  <>
                    <Check size={18} color={COLORS.white} />
                    <Text style={styles.saveButtonText}>Save Changes</Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Settings Modal */}
      <Modal visible={settingsModalVisible} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Settings</Text>
              <TouchableOpacity onPress={() => setSettingsModalVisible(false)}>
                <X size={22} color={COLORS.montoyaRed} />
              </TouchableOpacity>
            </View>

            <View style={styles.settingsSection}>
              <View style={styles.settingsItem}>
                <Bell size={20} color={COLORS.montoyaRed} />
                <View style={styles.settingsItemText}>
                  <Text style={styles.settingsItemTitle}>Push Notifications</Text>
                  <Text style={styles.settingsItemSub}>Shift reminders & updates</Text>
                </View>
                <View style={styles.toggleActive}>
                  <Text style={styles.toggleActiveText}>ON</Text>
                </View>
              </View>

              <View style={styles.subDivider} />

              <View style={styles.settingsItem}>
                <Lock size={20} color={COLORS.montoyaRed} />
                <View style={styles.settingsItemText}>
                  <Text style={styles.settingsItemTitle}>App Security</Text>
                  <Text style={styles.settingsItemSub}>Biometric / Geofence verification</Text>
                </View>
                <View style={styles.toggleActive}>
                  <Text style={styles.toggleActiveText}>ON</Text>
                </View>
              </View>

              <View style={styles.subDivider} />

              <TouchableOpacity
                style={styles.logoutSettingBtn}
                onPress={handleLogout}
                activeOpacity={0.8}
              >
                <LogOut size={18} color={COLORS.error} />
                <Text style={styles.logoutSettingText}>Log Out Account</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: '#FCF8F7',
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 32,
    gap: 14,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#F6E4E2',
    padding: 16,
    shadowColor: '#7B0818',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1.5,
  },
  avatarWrapper: {
    alignSelf: 'center',
    position: 'relative',
    marginBottom: 12,
  },
  avatarContainer: {
    width: 104,
    height: 104,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#FDF2F0',
    borderWidth: 2,
    borderColor: '#F6E4E2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  avatarFallback: {
    width: '100%',
    height: '100%',
    backgroundColor: '#FDF2F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarFallbackText: {
    fontSize: 32,
    fontWeight: '800',
    color: '#7B0818',
  },
  avatarLoadingOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarCameraBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: '#7B0818',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 2,
  },
  modalAvatarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FDF2F0',
    borderWidth: 1,
    borderColor: '#F6E4E2',
    borderRadius: 10,
    padding: 10,
    marginBottom: 16,
    gap: 12,
  },
  modalAvatarImage: {
    width: 50,
    height: 50,
    borderRadius: 10,
    backgroundColor: '#E2E8F0',
  },
  modalAvatarFallback: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FCE7E4',
  },
  modalAvatarTextWrapper: {
    flex: 1,
  },
  modalAvatarActionText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#7B0818',
  },
  modalAvatarSubText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  coachName: {
    fontSize: 21,
    fontWeight: '800',
    color: '#1E293B',
    textAlign: 'center',
    marginBottom: 6,
    letterSpacing: -0.2,
  },
  roleStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 12,
  },
  rolePill: {
    backgroundColor: '#FDF2F0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FCE7E4',
  },
  rolePillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#7B0818',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  statusActivePill: {
    backgroundColor: '#F0FDF4',
    borderColor: '#DCFCE7',
  },
  statusInactivePill: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
  },
  statusPillDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  statusDotActive: {
    backgroundColor: '#16A34A',
  },
  statusDotInactive: {
    backgroundColor: '#94A3B8',
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  statusActiveText: {
    color: '#16A34A',
  },
  statusInactiveText: {
    color: '#64748B',
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 5,
  },
  contactText: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '500',
  },
  primaryButton: {
    backgroundColor: '#7B0818',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 14,
    gap: 8,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  secondaryButton: {
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F6E4E2',
    marginTop: 8,
    gap: 8,
  },
  secondaryButtonText: {
    color: '#7B0818',
    fontSize: 13,
    fontWeight: '700',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1E293B',
  },
  experienceHighlight: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    lineHeight: 20,
  },
  eligibilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  eligibilityBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
  },
  eligibilityActive: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  eligibilityInactive: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  eligibilityText: {
    fontSize: 12,
    fontWeight: '700',
  },
  eligibilityTextActive: {
    color: '#15803D',
  },
  eligibilityTextInactive: {
    color: '#DC2626',
  },
  notesLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 4,
  },
  bodyDescription: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
    fontWeight: '400',
  },
  emptyText: {
    fontSize: 13,
    color: '#94A3B8',
    fontStyle: 'italic',
    lineHeight: 18,
  },
  primaryVenueBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FDF2F0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#FCE7E4',
  },
  primaryVenueLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#7B0818',
  },
  primaryVenueName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  subDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 10,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagPill: {
    backgroundColor: '#FDF2F0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FCE7E4',
  },
  tagText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#7B0818',
  },
  locationsList: {
    gap: 8,
  },
  locationItemBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  locationItemText: {
    fontSize: 13,
    color: '#334155',
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1E293B',
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    marginBottom: 4,
    marginTop: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1E293B',
  },
  textArea: {
    minHeight: 65,
    textAlignVertical: 'top',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 10,
  },
  switchTextCol: {
    flex: 1,
  },
  switchLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  switchSubLabel: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  saveButton: {
    backgroundColor: '#7B0818',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: 8,
    marginTop: 20,
    marginBottom: 20,
    gap: 8,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  settingsSection: {
    paddingVertical: 10,
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 12,
  },
  settingsItemText: {
    flex: 1,
  },
  settingsItemTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
  },
  settingsItemSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  toggleActive: {
    backgroundColor: '#FDF2F0',
    borderWidth: 1,
    borderColor: '#FCE7E4',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  toggleActiveText: {
    color: '#7B0818',
    fontSize: 11,
    fontWeight: '800',
  },
  logoutSettingBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#FEF2F2',
    marginTop: 16,
    gap: 8,
  },
  logoutSettingText: {
    color: '#DC2626',
    fontSize: 13,
    fontWeight: '700',
  },
});
