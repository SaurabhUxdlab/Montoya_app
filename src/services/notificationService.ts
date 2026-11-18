import {
  collection,
  doc,
  onSnapshot,
  updateDoc,
  deleteDoc,
  addDoc,
  writeBatch,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from './firebase';
import { NotificationItem } from '../types';

/**
 * Parses timestamp from Firestore Timestamp or string
 */
export const parseNotificationTimestamp = (timestamp: any): string => {
  if (!timestamp) return new Date().toISOString();
  try {
    if (typeof timestamp.toDate === 'function') {
      return timestamp.toDate().toISOString();
    }
    if (timestamp instanceof Date) {
      return timestamp.toISOString();
    }
    if (typeof timestamp === 'string') {
      const parsed = new Date(timestamp);
      if (!isNaN(parsed.getTime())) return parsed.toISOString();
    }
    if (typeof timestamp.seconds === 'number') {
      return new Date(timestamp.seconds * 1000).toISOString();
    }
  } catch (e) {
    // fallback
  }
  return new Date().toISOString();
};

/**
 * Maps notification type to target screen in mobile app
 */
export const mapNotificationToScreen = (
  type?: string
): 'Schedule' | 'CheckIn' | 'Profile' | 'Logs' | 'Dispatch' | 'Chat' => {
  if (!type) return 'Dispatch';
  const t = type.toLowerCase();
  if (t === 'chat' || t.includes('chat') || t.includes('message')) {
    return 'Chat';
  }
  if (
    t.startsWith('booking_') ||
    t.includes('shift') ||
    t.includes('session') ||
    t.includes('lesson') ||
    t.includes('schedule') ||
    t === 'new_assignment' ||
    t === 'court_reassigned' ||
    t === 'venue_changed'
  ) {
    return 'Schedule';
  }
  if (t.includes('attendance') || t.includes('checkin') || t.includes('checkout') || t.includes('geofence')) {
    return 'CheckIn';
  }
  if (t.includes('profile') || t.includes('account')) {
    return 'Profile';
  }
  if (t.includes('hours') || t.includes('logs')) {
    return 'Logs';
  }
  return 'Dispatch';
};

/**
 * Subscribe to real-time notifications for a user from Firestore subcollection `users/{userId}/notifications`
 */
export const subscribeToUserNotifications = (
  userId: string,
  onUpdate: (notifications: NotificationItem[]) => void,
  onError?: (error: Error) => void
): Unsubscribe => {
  if (!userId) {
    onUpdate([]);
    return () => {};
  }

  try {
    const notifsRef = collection(db, 'users', userId, 'notifications');
    const unsub = onSnapshot(
      notifsRef,
      (snapshot) => {
        const list: NotificationItem[] = snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          const createdAt = parseNotificationTimestamp(data.createdAt);
          const type = data.type || 'general';

          return {
            id: docSnap.id,
            userId: data.userId || userId,
            title: data.title || 'Notification',
            body: data.body || '',
            type: type,
            read: typeof data.read === 'boolean' ? data.read : false,
            createdAt: createdAt,
            targetId: data.targetId || null,
            targetScreen: data.targetScreen || mapNotificationToScreen(type),
          };
        });

        // Sort in memory by createdAt descending (newest first)
        list.sort((a, b) => {
          const timeA = new Date(a.createdAt).getTime();
          const timeB = new Date(b.createdAt).getTime();
          return timeB - timeA;
        });

        onUpdate(list);
      },
      (error) => {
        console.warn(`[notificationService] Error listening to notifications for ${userId}:`, error);
        if (onError) onError(error);
      }
    );

    return unsub;
  } catch (err: any) {
    console.warn(`[notificationService] Failed to initialize notification listener:`, err);
    onUpdate([]);
    return () => {};
  }
};

/**
 * Mark a single notification as read in Firestore
 */
export const markNotificationAsRead = async (
  userId: string,
  notificationId: string
): Promise<void> => {
  if (!userId || !notificationId) return;
  try {
    const notifRef = doc(db, 'users', userId, 'notifications', notificationId);
    await updateDoc(notifRef, {
      read: true,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.warn(`[notificationService] Failed to mark notification ${notificationId} as read:`, err);
  }
};

/**
 * Mark all notifications as read for a user
 */
export const markAllNotificationsAsRead = async (
  userId: string,
  notificationIds: string[]
): Promise<void> => {
  if (!userId || !notificationIds || notificationIds.length === 0) return;
  try {
    const batch = writeBatch(db);
    notificationIds.forEach((notifId) => {
      const notifRef = doc(db, 'users', userId, 'notifications', notifId);
      batch.update(notifRef, {
        read: true,
        updatedAt: new Date().toISOString(),
      });
    });
    await batch.commit();
  } catch (err) {
    console.warn(`[notificationService] Failed to mark all notifications as read:`, err);
  }
};

/**
 * Delete a notification document from Firestore
 */
export const deleteNotification = async (
  userId: string,
  notificationId: string
): Promise<void> => {
  if (!userId || !notificationId) return;
  try {
    const notifRef = doc(db, 'users', userId, 'notifications', notificationId);
    await deleteDoc(notifRef);
  } catch (err) {
    console.warn(`[notificationService] Failed to delete notification ${notificationId}:`, err);
  }
};

/**
 * Send / create an in-app notification for a user in Firestore matching Dashboard schema
 */
export const sendInAppNotificationToUser = async (
  userId: string,
  notificationData: {
    title: string;
    body: string;
    type?: string;
    targetId?: string | null;
    targetScreen?: string;
  }
): Promise<string | null> => {
  if (!userId) return null;
  try {
    const notifsRef = collection(db, 'users', userId, 'notifications');
    const docRef = await addDoc(notifsRef, {
      title: notificationData.title || '',
      body: notificationData.body || '',
      type: notificationData.type || 'general',
      targetId: notificationData.targetId || null,
      targetScreen: notificationData.targetScreen || mapNotificationToScreen(notificationData.type),
      read: false,
      createdAt: new Date().toISOString(),
    });
    return docRef.id;
  } catch (err) {
    console.warn(`[notificationService] Failed to send notification to user ${userId}:`, err);
    return null;
  }
};
