import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
  Unsubscribe,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage, auth } from './firebase';
import { CoachProfile, CoachDocument, UserDocument } from '../types';
import { mapDocToCoach, findCoachDocByUserId } from './authService';

/**
 * Convert local image URI to Blob (compatible with Android, iOS, and Web)
 */
const convertUriToBlob = async (uri: string): Promise<Blob> => {
  try {
    const response = await fetch(uri);
    const blob = await response.blob();
    return blob;
  } catch (_e) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.onload = function () {
        resolve(xhr.response);
      };
      xhr.onerror = function (err) {
        reject(new Error('Failed to convert image to blob: ' + err));
      };
      xhr.responseType = 'blob';
      xhr.open('GET', uri, true);
      xhr.send(null);
    });
  }
};

/**
 * Subscribe to real-time coach profile updates from Firestore.
 * Listens to `users/{uid}` (Source of truth for identity) and `coaches/{uid}` (Operational info),
 * merging them seamlessly using `mapDocToCoach`.
 */
export const subscribeToCoachProfile = (
  uid: string,
  onUpdate: (profile: CoachProfile | null) => void,
  onError?: (error: Error) => void
): Unsubscribe => {
  if (!uid) {
    return () => {};
  }

  const userRef = doc(db, 'users', uid);
  const coachRef = doc(db, 'coaches', uid);

  let latestUserData: UserDocument | null = null;
  let latestCoachData: CoachDocument | null = null;

  const emitMerged = () => {
    if (!latestUserData && !latestCoachData) {
      if (auth.currentUser && auth.currentUser.uid === uid) {
        onUpdate(
          mapDocToCoach(null, {
            uid,
            name: auth.currentUser.displayName || auth.currentUser.email?.split('@')[0] || 'Coach',
            email: auth.currentUser.email || '',
            role: 'Coach',
            status: 'Active',
          })
        );
      } else {
        onUpdate(null);
      }
      return;
    }
    onUpdate(mapDocToCoach(latestCoachData, latestUserData));
  };

  const unsubUser = onSnapshot(
    userRef,
    (docSnap) => {
      latestUserData = docSnap.exists() ? (docSnap.data() as UserDocument) : null;
      emitMerged();
    },
    (error) => {
      console.warn('Error in users profile listener:', error);
      if (onError) onError(error);
    }
  );

  const unsubCoach = onSnapshot(
    coachRef,
    (docSnap) => {
      latestCoachData = docSnap.exists() ? (docSnap.data() as CoachDocument) : null;
      emitMerged();
    },
    (error) => {
      console.warn('Error in coaches profile listener:', error);
      if (onError) onError(error);
    }
  );

  return () => {
    unsubUser();
    unsubCoach();
  };
};

/**
 * Update coach profile fields:
 * - Identity fields (`name`, `email`, `phone`, `profileImage`, `status`, `role`) are written to `users/{uid}` (Source of Truth)
 * - Operational fields (`experience`, `notes`, `preferredLocations`, `privateLessonEligibility`, `role`, `specialties`, `status`, `userId`, `venue`) are written to `coaches/{uid}` matching the Firebase document schema
 */
export const updateCoachProfileInFirestore = async (
  uid: string,
  updates: Partial<CoachProfile>
): Promise<void> => {
  const now = new Date().toISOString();

  // 1. Separate user identity updates (users collection - Source of Truth for identity)
  const userUpdates: Partial<UserDocument> = {
    updatedAt: now,
  };
  if (updates.name !== undefined) userUpdates.name = updates.name;
  if (updates.email !== undefined) userUpdates.email = updates.email;
  if (updates.phone !== undefined) userUpdates.phone = updates.phone;
  if (updates.profileImage !== undefined) userUpdates.profileImage = updates.profileImage;
  if (updates.status !== undefined) userUpdates.status = updates.status;
  if (updates.role !== undefined) userUpdates.role = updates.role;

  // 2. Separate coach operational updates (coaches collection) matching exact Firebase schema keys
  const coachUpdates: Partial<CoachDocument> = {
    userId: uid,
    updatedAt: now,
  };
  if (updates.role !== undefined) coachUpdates.role = updates.role;
  if (updates.status !== undefined) coachUpdates.status = updates.status;
  if (updates.experience !== undefined) {
    coachUpdates.experience = updates.experience;
  } else if (updates.experienceYears !== undefined) {
    coachUpdates.experience = updates.experienceYears;
  }
  if (updates.notes !== undefined) {
    coachUpdates.notes = updates.notes;
  } else if (updates.availabilityNote !== undefined) {
    coachUpdates.notes = updates.availabilityNote;
  }
  if (updates.privateLessonEligibility !== undefined) {
    coachUpdates.privateLessonEligibility = updates.privateLessonEligibility;
  }
  if (updates.specialties !== undefined) {
    coachUpdates.specialties = updates.specialties;
  }
  if (updates.preferredLocations !== undefined) {
    coachUpdates.preferredLocations = updates.preferredLocations;
    if (updates.venue === undefined && updates.preferredLocations.length > 0) {
      coachUpdates.venue = updates.preferredLocations[0];
    }
  } else if (updates.locations !== undefined) {
    coachUpdates.preferredLocations = updates.locations;
    if (updates.venue === undefined && updates.locations.length > 0) {
      coachUpdates.venue = updates.locations[0];
    }
  }
  if (updates.venue !== undefined) {
    coachUpdates.venue = updates.venue;
  }

  // Also keep identity synced to coach document if present
  if (updates.name !== undefined) coachUpdates.name = updates.name;
  if (updates.email !== undefined) coachUpdates.email = updates.email;
  if (updates.phone !== undefined) coachUpdates.phone = updates.phone;
  if (updates.profileImage !== undefined) {
    coachUpdates.profileImage = updates.profileImage;
    coachUpdates.photoUrl = updates.profileImage;
  }

  // 3. Write to Firestore collections
  const userRef = doc(db, 'users', uid);
  
  // Find or target the coach doc in coaches collection
  let targetCoachRef = doc(db, 'coaches', uid);
  try {
    const coachRecord = await findCoachDocByUserId(uid);
    if (coachRecord && coachRecord.ref) {
      targetCoachRef = coachRecord.ref as any;
    }
  } catch (findErr) {
    console.warn('[Profile Service] Could not find existing coach doc ref, defaulting to coaches/' + uid, findErr);
  }

  await Promise.all([
    setDoc(userRef, userUpdates, { merge: true }),
    setDoc(targetCoachRef, coachUpdates, { merge: true }),
  ]);
};

/**
 * Upload coach avatar image to Firebase Storage and update `users/{uid}` & `coaches/{uid}`
 */
export const uploadCoachProfileImage = async (
  uid: string,
  localUri: string
): Promise<string> => {
  const blob = await convertUriToBlob(localUri);
  const filename = `profileImage_${Date.now()}.jpg`;
  const storageReference = ref(storage, `coaches/${uid}/${filename}`);

  await uploadBytes(storageReference, blob, {
    contentType: 'image/jpeg',
  });

  if (typeof (blob as any)?.close === 'function') {
    (blob as any).close();
  }

  const downloadURL = await getDownloadURL(storageReference);

  // Update profileImage across collections
  await updateCoachProfileInFirestore(uid, {
    profileImage: downloadURL,
  });

  return downloadURL;
};

/**
 * Update Coach Settings in coaches/{uid} doc
 */
export const updateCoachSettings = async (
  uid: string,
  settings: {
    pushNotificationsEnabled?: boolean;
    appSecurityEnabled?: boolean;
  }
): Promise<void> => {
  const coachRef = doc(db, 'coaches', uid);
  await setDoc(coachRef, { settings, userId: uid }, { merge: true });
};
