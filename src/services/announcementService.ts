import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  getDoc,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from './firebase';

export interface MobileAnnouncement {
  id: string;
  title: string;
  content: string;
  category: string;
  priority: 'normal' | 'urgent' | 'high' | 'info';
  status: 'published' | 'draft' | 'archived';
  targetAudience: 'all' | 'coaches' | 'users' | 'specific' | 'programs' | 'seasons';
  targetAudienceLabel?: string;
  targetUserIds?: string[];
  actionText?: string;
  actionUrl?: string;
  isBanner?: boolean;
  bannerBackgroundColor?: string;
  bannerTextColor?: string;
  publishedAt?: string;
  createdAt: string;
  readBy?: string[];
}

/**
 * Parses timestamp from Firestore
 */
const parseTimestamp = (val: any): string => {
  if (!val) return new Date().toISOString();
  try {
    if (typeof val.toDate === 'function') return val.toDate().toISOString();
    if (val.seconds) return new Date(val.seconds * 1000).toISOString();
    if (typeof val === 'string') return val;
  } catch (e) {
    // fallback
  }
  return new Date().toISOString();
};

/**
 * Real-time listener for published announcements targeted to coaches
 */
export const subscribeToCoachAnnouncements = (
  coachId: string,
  onUpdate: (announcements: MobileAnnouncement[]) => void,
  onError?: (error: Error) => void
): Unsubscribe => {
  try {
    const annRef = collection(db, 'announcements');
    const q = query(
      annRef,
      where('status', '==', 'published'),
      orderBy('createdAt', 'desc')
    );

    return onSnapshot(
      q,
      (snapshot) => {
        const list: MobileAnnouncement[] = [];

        snapshot.docs.forEach((docSnap) => {
          const data = docSnap.data();
          const targetAudience = data.targetAudience || 'all';
          const targetUserIds = Array.isArray(data.targetUserIds) ? data.targetUserIds : [];

          // Audience check: 'all', 'coaches', or specific coachId in targetUserIds
          const isEligible =
            targetAudience === 'all' ||
            targetAudience === 'coaches' ||
            targetAudience === 'programs' ||
            targetAudience === 'seasons' ||
            (targetAudience === 'specific' && targetUserIds.includes(coachId));

          if (isEligible) {
            list.push({
              id: docSnap.id,
              title: data.title || 'Announcement',
              content: data.content || '',
              category: data.category || 'General Announcement',
              priority: data.priority || 'normal',
              status: data.status || 'published',
              targetAudience: targetAudience,
              targetAudienceLabel: data.targetAudienceLabel || 'Coaches',
              targetUserIds: targetUserIds,
              actionText: data.actionText || '',
              actionUrl: data.actionUrl || '',
              isBanner: Boolean(data.isBanner),
              bannerBackgroundColor: data.bannerBackgroundColor || '#fef3c7',
              bannerTextColor: data.bannerTextColor || '#92400e',
              publishedAt: parseTimestamp(data.publishedAt),
              createdAt: parseTimestamp(data.createdAt),
              readBy: Array.isArray(data.readBy) ? data.readBy : [],
            });
          }
        });

        onUpdate(list);
      },
      (err) => {
        console.warn('[announcementService] Error listening to coach announcements:', err);
        if (onError) onError(err);
      }
    );
  } catch (err: any) {
    console.warn('[announcementService] Initialization error:', err);
    onUpdate([]);
    return () => {};
  }
};

/**
 * Mark announcement as read by coach
 */
export const markAnnouncementAsRead = async (
  announcementId: string,
  coachId: string
): Promise<void> => {
  if (!announcementId || !coachId) return;
  try {
    const annRef = doc(db, 'announcements', announcementId);
    const snap = await getDoc(annRef);
    if (snap.exists()) {
      const data = snap.data();
      const readBy = Array.isArray(data.readBy) ? data.readBy : [];
      if (!readBy.includes(coachId)) {
        await updateDoc(annRef, {
          readBy: [...readBy, coachId],
          readCount: readBy.length + 1,
        });
      }
    }
  } catch (err) {
    console.warn([announcementService] Failed to mark read:, err);
  }
};
