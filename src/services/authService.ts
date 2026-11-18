import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  Unsubscribe,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
  DocumentReference,
} from 'firebase/firestore';
import { auth, db } from './firebase';
import { CoachProfile, CoachDocument, UserDocument } from '../types';

/**
 * Extract the linked userId from a coach document according to project conventions.
 * Primary field is `userId -> users.uid`.
 */
export const extractLinkedUserId = (coachDoc: Partial<CoachDocument> | any): string => {
  if (!coachDoc) return '';
  return (
    coachDoc.userId ||
    coachDoc.uid ||
    coachDoc.id ||
    coachDoc.coachId ||
    ''
  );
};

/**
 * Find a Coach document by the user's Firebase Auth UID.
 * 1. Checks direct document reference `coaches/{uid}`
 * 2. Falls back to querying `coaches` collection `where('userId', '==', uid)`
 */
export const findCoachDocByUserId = async (
  uid: string
): Promise<{ id: string; ref: DocumentReference; data: CoachDocument } | null> => {
  if (!uid) return null;

  // 1. Check direct document ID (coaches/{uid})
  try {
    const directRef = doc(db, 'coaches', uid);
    const directSnap = await getDoc(directRef);
    if (directSnap.exists()) {
      const data = directSnap.data() as CoachDocument;
      return {
        id: directSnap.id,
        ref: directRef,
        data: {
          ...data,
          coachId: data.coachId || directSnap.id,
          userId: data.userId || uid,
        },
      };
    }
  } catch (err: any) {
    console.warn(`[Coach Service] Direct lookup coaches/${uid} error:`, err?.message || err);
  }

  // 2. Query coaches collection where userId == uid
  try {
    const q = query(collection(db, 'coaches'), where('userId', '==', uid));
    const querySnap = await getDocs(q);
    if (!querySnap.empty) {
      const firstDoc = querySnap.docs[0];
      const data = firstDoc.data() as CoachDocument;
      return {
        id: firstDoc.id,
        ref: firstDoc.ref,
        data: {
          ...data,
          coachId: data.coachId || firstDoc.id,
          userId: data.userId || uid,
        },
      };
    }
  } catch (err: any) {
    console.warn(`[Coach Service] Query coaches where userId == ${uid} error:`, err?.message || err);
  }

  // 3. Query coaches collection where coachId == uid
  try {
    const qCoachId = query(collection(db, 'coaches'), where('coachId', '==', uid));
    const snapCoachId = await getDocs(qCoachId);
    if (!snapCoachId.empty) {
      const firstDoc = snapCoachId.docs[0];
      const data = firstDoc.data() as CoachDocument;
      return {
        id: firstDoc.id,
        ref: firstDoc.ref,
        data: {
          ...data,
          coachId: data.coachId || firstDoc.id,
          userId: data.userId || uid,
        },
      };
    }
  } catch (err: any) {
    console.warn(`[Coach Service] Query coaches where coachId == ${uid} error:`, err?.message || err);
  }

  return null;
};

/**
 * Map Coach Document and User Document into a unified CoachProfile.
 * The `users` collection remains the SINGLE SOURCE OF TRUTH for:
 * - Identity: name, email, phone, profileImage, status, role
 * The `coaches` collection provides operational information matching Firebase schema:
 * - experience, notes, preferredLocations, privateLessonEligibility, role, specialties, status, userId, venue
 */
export const mapDocToCoach = (
  coachDoc?: Partial<CoachDocument> | null,
  userDoc?: Partial<UserDocument> | null
): CoachProfile => {
  const uid =
    userDoc?.uid ||
    userDoc?.id ||
    coachDoc?.userId ||
    coachDoc?.coachId ||
    coachDoc?.id ||
    '';

  const resolvedLocations =
    coachDoc?.preferredLocations && coachDoc.preferredLocations.length > 0
      ? coachDoc.preferredLocations
      : coachDoc?.locations && coachDoc.locations.length > 0
      ? coachDoc.locations
      : coachDoc?.venue
      ? [coachDoc.venue]
      : [];

  const resolvedSpecialties =
    coachDoc?.specialties && coachDoc.specialties.length > 0
      ? coachDoc.specialties
      : [];

  const resolvedExperience =
    coachDoc?.experience !== undefined && coachDoc?.experience !== null
      ? coachDoc.experience
      : coachDoc?.experienceYears || '';

  const resolvedNotes =
    coachDoc?.notes !== undefined && coachDoc?.notes !== null
      ? coachDoc.notes
      : coachDoc?.availabilityNote || '';

  const resolvedVenue =
    coachDoc?.venue || (resolvedLocations.length > 0 ? resolvedLocations[0] : '');

  const resolvedImage =
    userDoc?.profileImage ||
    userDoc?.avatarUrl ||
    (userDoc as any)?.imgUrl ||
    (userDoc as any)?.photoUrl ||
    (userDoc as any)?.photoURL ||
    coachDoc?.profileImage ||
    coachDoc?.photoUrl ||
    coachDoc?.avatar ||
    coachDoc?.image ||
    (coachDoc as any)?.profilePhoto ||
    '';

  const resolvedRole =
    coachDoc?.role || userDoc?.role || 'Coach';

  const resolvedStatus =
    userDoc?.status || coachDoc?.status || 'Active';

  return {
    // Identity fields from users collection (Source of truth)
    uid: uid || '',
    coachId: coachDoc?.coachId || coachDoc?.id || uid,
    userId: coachDoc?.userId || userDoc?.uid || uid,
    name: userDoc?.name || (coachDoc as any)?.name || '',
    email: userDoc?.email || (coachDoc as any)?.email || '',
    phone: userDoc?.phone || (coachDoc as any)?.phone || '',
    profileImage: resolvedImage,
    role: resolvedRole,
    status: resolvedStatus,
    fcmTokens: userDoc?.fcmTokens || [],

    // Operational fields matching exact Firebase schema
    experience: resolvedExperience,
    experienceYears: resolvedExperience,
    experienceBio: coachDoc?.experienceBio || '',
    notes: resolvedNotes,
    availabilityNote: resolvedNotes,
    availabilityStatus: coachDoc?.availabilityStatus || resolvedStatus,
    preferredLocations: resolvedLocations,
    locations: resolvedLocations,
    venue: resolvedVenue,
    privateLessonEligibility:
      coachDoc?.privateLessonEligibility !== undefined
        ? coachDoc.privateLessonEligibility
        : true,
    specialties: resolvedSpecialties,
    academyId:
      coachDoc?.academyId ||
      userDoc?.academyId ||
      '',

    // Timestamps
    createdAt:
      userDoc?.createdAt ||
      coachDoc?.createdAt ||
      new Date().toISOString(),
    updatedAt:
      coachDoc?.updatedAt ||
      userDoc?.updatedAt ||
      new Date().toISOString(),
  };
};

/**
 * Resolve a list of Coach Documents with a list of User Documents.
 * Builds a userMap lookup and handles fallback for Coach users missing a coach record.
 */
export const resolveCoachesWithUsers = (
  coachDocs: CoachDocument[],
  userDocs: UserDocument[]
): CoachProfile[] => {
  // 1. Build userMap lookup: key = userId/uid
  const userMap = new Map<string, UserDocument>();
  for (const user of userDocs) {
    const key = user.uid || user.id;
    if (key) {
      userMap.set(key, user);
    }
  }

  const resolvedCoaches: CoachProfile[] = [];
  const processedUserIds = new Set<string>();

  // 2. Link each coach doc with its corresponding user doc
  for (const coach of coachDocs) {
    const userId = extractLinkedUserId(coach);
    const userDoc = userId ? userMap.get(userId) : undefined;
    if (userId) {
      processedUserIds.add(userId);
    }
    resolvedCoaches.push(mapDocToCoach(coach, userDoc));
  }

  // 3. Fallback: Include any user with role="Coach" who lacks a coach doc
  for (const user of userDocs) {
    const isCoachRole =
      typeof user.role === 'string' &&
      (user.role.toLowerCase() === 'coach' ||
        user.role.toLowerCase() === 'head_coach' ||
        user.role.toLowerCase().includes('coach'));

    const key = user.uid || user.id || '';
    if (isCoachRole && key && !processedUserIds.has(key)) {
      resolvedCoaches.push(mapDocToCoach(null, user));
      processedUserIds.add(key);
    }
  }

  return resolvedCoaches;
};

export interface CoachRegistrationInput {
  fullName: string;
  email: string;
  password: string;
  phone?: string;
  role?: string;
}

/**
 * Register a new Coach:
 * 1. Create Firebase Auth user
 * 2. Set user displayName
 * 3. Create document in `users` collection with role="Coach" (Source of truth)
 * 4. Create document in `coaches` collection with userId=users.uid (Duplicate-safe) matching Firebase schema
 * 5. Verify User <-> Coach link
 * 6. Return unified CoachProfile (empty except signup data)
 */
export const registerCoach = async ({
  fullName,
  email,
  password,
  phone = '',
  role = 'Coach',
}: CoachRegistrationInput): Promise<CoachProfile> => {
  const cleanName = fullName.trim();
  const cleanEmail = email.trim().toLowerCase();

  console.log('[Coach Signup] Starting registration for:', cleanEmail);

  let fbUser: FirebaseUser | null = null;
  let uid: string;

  // 1. Create Firebase Authentication Account
  try {
    const credential = await createUserWithEmailAndPassword(
      auth,
      cleanEmail,
      password
    );
    fbUser = credential.user;
    uid = fbUser.uid;
    console.log('[Coach Signup] Firebase Auth user created: UID =', uid);

    // Update Firebase Auth Display Name
    try {
      await updateProfile(fbUser, { displayName: cleanName });
    } catch (e) {
      console.warn('[Coach Signup] Could not update Firebase user displayName:', e);
    }
  } catch (authError: any) {
    console.error('[Coach Signup] Firebase Auth error:', authError);
    throw new Error(getFriendlyErrorMessage(authError));
  }

  const now = new Date().toISOString();

  // 2. Create the User Record in `users/{uid}` (Identity Source of Truth)
  const userDocData: UserDocument = {
    uid,
    id: uid,
    name: cleanName,
    email: cleanEmail,
    phone: phone || '',
    role,
    status: 'Active',
    createdAt: now,
    updatedAt: now,
  };

  try {
    const userRef = doc(db, 'users', uid);
    await setDoc(userRef, userDocData, { merge: true });
    console.log('[Coach Signup] User document created at users/' + uid);
  } catch (userDbError: any) {
    console.error('[Coach Signup] Failed creating users collection document:', userDbError);
    throw new Error(
      `Account was created, but failed to save user profile in database: ${
        userDbError?.message || 'Database write error'
      }`
    );
  }

  // 3. Create or Link the Coach Record in `coaches` collection with exact Firebase keys
  const coachDocData: CoachDocument = {
    userId: uid,
    role,
    status: 'Active',
    experience: '',
    notes: '',
    preferredLocations: [],
    privateLessonEligibility: true,
    specialties: [],
    venue: '',
    createdAt: now,
    updatedAt: now,
  };

  try {
    const existingCoach = await findCoachDocByUserId(uid);
    if (existingCoach) {
      const mergedCoachData: CoachDocument = {
        ...existingCoach.data,
        userId: uid,
        updatedAt: now,
      };
      await setDoc(existingCoach.ref, mergedCoachData, { merge: true });
      console.log('[Coach Signup] Existing Coach profile updated at coaches/' + existingCoach.id);
    } else {
      const coachRef = doc(db, 'coaches', uid);
      await setDoc(coachRef, coachDocData, { merge: true });
      console.log('[Coach Signup] Coach profile created at coaches/' + uid);
    }
  } catch (coachDbError: any) {
    console.warn(
      '[Coach Signup] Notice creating coaches collection document:',
      coachDbError?.message || coachDbError
    );
  }

  // 4. Verify linking
  try {
    const verifiedCoach = await findCoachDocByUserId(uid);
    if (!verifiedCoach || verifiedCoach.data.userId !== uid) {
      console.warn('[Coach Signup] Coach link verification mismatch:', verifiedCoach);
    } else {
      console.log('[Coach Signup] Coach profile verified for UID:', uid);
    }
  } catch (verifyError) {
    console.warn('[Coach Signup] Verification check non-fatal error:', verifyError);
  }

  console.log('[Coach Signup] Registration completed successfully');

  // 5. Return unified profile
  return mapDocToCoach(coachDocData, userDocData);
};

/**
 * Fetch a linked coach profile by UID, resolving `users` and `coaches` records.
 */
export const getLinkedCoachProfile = async (
  uid: string
): Promise<CoachProfile | null> => {
  if (!uid) return null;
  try {
    const userRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userRef);

    const coachRecord = await findCoachDocByUserId(uid);

    if (!userSnap.exists() && !coachRecord) {
      return null;
    }

    const userData = userSnap.exists()
      ? (userSnap.data() as UserDocument)
      : null;
    const coachData = coachRecord ? coachRecord.data : null;

    return mapDocToCoach(coachData, userData);
  } catch (error) {
    console.error('[Coach Profile] Error getting linked coach profile:', error);
    return null;
  }
};

/**
 * Log in coach with email and password, retrieving linked profile.
 */
export const loginCoach = async (
  email: string,
  password: string
): Promise<CoachProfile> => {
  const cleanEmail = email.trim().toLowerCase();

  try {
    const credential = await signInWithEmailAndPassword(
      auth,
      cleanEmail,
      password
    );
    const uid = credential.user.uid;

    const profile = await getLinkedCoachProfile(uid);
    const finalProfile: CoachProfile = profile || {
      uid,
      userId: uid,
      coachId: uid,
      name: credential.user.displayName || cleanEmail.split('@')[0],
      email: cleanEmail,
      phone: '',
      role: 'Coach',
      status: 'Active',
      experience: '',
      notes: '',
      preferredLocations: [],
      specialties: [],
      venue: '',
      privateLessonEligibility: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Check if account status is Inactive
    if (
      finalProfile.status &&
      finalProfile.status.toLowerCase() === 'inactive'
    ) {
      await firebaseSignOut(auth);
      throw new Error('Your coach account is currently inactive. Please contact the administrator.');
    }

    // Auto-heal / Ensure users/{uid} document exists so Firestore security rules & profile listeners work
    try {
      const userRef = doc(db, 'users', uid);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) {
        await setDoc(
          userRef,
          {
            uid,
            name: finalProfile.name,
            email: cleanEmail,
            role: 'Coach',
            status: finalProfile.status || 'Active',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            lastActive: new Date().toISOString(),
          },
          { merge: true }
        );
      }
    } catch (healErr) {
      console.warn('[Coach Login] Auto-heal user doc non-fatal notice:', healErr);
    }

    return finalProfile;
  } catch (error: any) {
    console.error('Firebase login error:', error);
    if (error.message?.includes('inactive')) {
      throw error;
    }
    throw new Error(getFriendlyErrorMessage(error));
  }
};

/**
 * Friendly error messages for Firebase Authentication
 */
function getFriendlyErrorMessage(error: any): string {
  if (!error) return 'An unexpected error occurred.';
  const code = error.code || '';

  switch (code) {
    case 'auth/email-already-in-use':
      return 'An account with this email address already exists. Please log in.';
    case 'auth/invalid-email':
      return 'The email address entered is not valid.';
    case 'auth/operation-not-allowed':
      return 'Email/password sign-in is not enabled in Firebase Console.';
    case 'auth/weak-password':
      return 'Password is too weak. Please use at least 6 characters.';
    case 'auth/user-disabled':
      return 'This coach account has been disabled.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Invalid email or password. Please check your credentials.';
    case 'auth/network-request-failed':
      return 'Network connection failed. Please check your internet connection.';
    default:
      return error.message || 'Authentication failed. Please try again.';
  }
}

/**
 * Log out the currently authenticated Firebase user.
 */
export const logoutCoach = async (): Promise<void> => {
  try {
    await firebaseSignOut(auth);
  } catch (error) {
    console.error('Error signing out from Firebase:', error);
    throw error;
  }
};

/**
 * Subscribe to Firebase Auth state changes.
 */
export const subscribeToAuthState = (
  callback: (user: FirebaseUser | null) => void
): Unsubscribe => {
  return onAuthStateChanged(auth, callback);
};

