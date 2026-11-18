import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  doc,
  writeBatch,
  Unsubscribe,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from './firebase';
import { ChatMessage, MessageAttachment } from '../types';

const BATCH_SIZE = 450;

/**
 * Format message timestamp into human-readable relative/clock string
 * Matches Admin Dashboard formatting
 */
export function formatMessageTimestamp(timestampMs: number | string | Date | any): string {
  if (!timestampMs) return '';

  let date: Date;
  if (timestampMs instanceof Date) {
    date = timestampMs;
  } else if (typeof timestampMs === 'number') {
    date = new Date(timestampMs);
  } else if (timestampMs && typeof timestampMs === 'object' && 'toMillis' in timestampMs) {
    date = new Date(timestampMs.toMillis());
  } else if (timestampMs && typeof timestampMs === 'object' && 'seconds' in timestampMs) {
    date = new Date(timestampMs.seconds * 1000);
  } else if (typeof timestampMs === 'string') {
    date = new Date(timestampMs);
  } else {
    return '';
  }

  if (isNaN(date.getTime())) return '';

  const now = new Date();
  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  if (isToday) {
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear();

  if (isYesterday) {
    return 'Yesterday';
  }

  const isCurrentYear = date.getFullYear() === now.getFullYear();
  if (isCurrentYear) {
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }

  return date.toLocaleDateString([], { month: 'numeric', day: 'numeric', year: '2-digit' });
}

/**
 * Convert Firestore timestamp to JavaScript Date
 */
export function toMessageDate(value: any): Date {
  if (!value) return new Date(0);
  if (value instanceof Date) return value;
  if (value && typeof value === 'object' && typeof value.toDate === 'function') {
    return value.toDate();
  }
  if (value && typeof value === 'object' && typeof value.toMillis === 'function') {
    return new Date(value.toMillis());
  }
  if (value && typeof value === 'object' && typeof value.seconds === 'number') {
    return new Date(value.seconds * 1000);
  }
  if (typeof value === 'number') return new Date(value);
  if (typeof value === 'string') {
    const parsed = new Date(value);
    if (!isNaN(parsed.getTime())) return parsed;
  }
  return new Date(0);
}

/**
 * Subscribe to real-time conversation messages for an authenticated coach
 * Firestore collection: users/{coachId}/messages
 */
export function subscribeToCoachMessages(
  coachId: string,
  onUpdate: (messages: ChatMessage[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  if (!coachId) {
    onUpdate([]);
    return () => {};
  }

  try {
    const messagesQuery = query(
      collection(db, 'users', coachId, 'messages'),
      orderBy('timestamp', 'asc')
    );

    return onSnapshot(
      messagesQuery,
      (snapshot) => {
        const messages: ChatMessage[] = snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            text: data.text || '',
            sender: data.sender || 'user',
            status: data.status || 'sent',
            timestamp: data.timestamp,
            readAt: data.readAt,
            updatedAt: data.updatedAt,
            isEdited: Boolean(data.isEdited),
            attachments: data.attachments || null,
          };
        });

        onUpdate(messages);
      },
      (error) => {
        console.warn(`[chatService] Error subscribing to messages for coach ${coachId}:`, error);
        if (onError) onError(error);
      }
    );
  } catch (err: any) {
    console.warn(`[chatService] Failed to initialize message listener for coach ${coachId}:`, err);
    onUpdate([]);
    return () => {};
  }
}

/**
 * Send a new chat message from the coach to Montoya Tennis Headquarters / Admin
 * Writes directly to users/{coachId}/messages/{messageId} matching Dashboard schema
 */
export async function sendCoachMessage(
  coachId: string,
  text: string,
  attachments?: MessageAttachment[] | null
): Promise<string> {
  const trimmed = text.trim();
  const hasAttachments = Boolean(attachments && attachments.length > 0);

  if (!trimmed && !hasAttachments) {
    throw new Error('Message cannot be empty');
  }

  const messageData = {
    text: trimmed,
    sender: 'coach',
    status: 'sent',
    timestamp: serverTimestamp(),
    attachments: hasAttachments ? attachments : null,
  };

  const docRef = await addDoc(collection(db, 'users', coachId, 'messages'), messageData);
  return docRef.id;
}

/**
 * Edit an existing message sent by the coach
 * Updates text, sets isEdited: true and updatedAt: serverTimestamp()
 */
export async function editCoachMessage(
  coachId: string,
  messageId: string,
  newText: string
): Promise<void> {
  const trimmed = newText.trim();
  if (!trimmed) {
    throw new Error('Message text cannot be empty');
  }

  const msgRef = doc(db, 'users', coachId, 'messages', messageId);
  await updateDoc(msgRef, {
    text: trimmed,
    isEdited: true,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Delete a message sent by the coach
 * Removes any associated attachments from Storage and deletes Firestore document
 */
export async function deleteCoachMessage(
  coachId: string,
  message: ChatMessage
): Promise<void> {
  if (!coachId || !message?.id) return;

  // 1. Remove attachments from Storage if present
  if (message.attachments && message.attachments.length > 0) {
    await Promise.allSettled(
      message.attachments
        .map((att) => att.storagePath)
        .filter((path): path is string => Boolean(path))
        .map((path) => deleteObject(ref(storage, path)))
    );
  }

  // 2. Delete Firestore document
  const msgRef = doc(db, 'users', coachId, 'messages', message.id);
  await deleteDoc(msgRef);
}

/**
 * Upload an attachment (e.g. photo from camera / library) to Firebase Storage
 * Storage path: messages/{coachId}/{timestamp}_{uuid}_{safeFileName}
 */
export async function uploadChatAttachment(
  coachId: string,
  uri: string,
  fileName?: string,
  type: 'image' | 'file' = 'image'
): Promise<MessageAttachment> {
  const safeName = (fileName || `photo_${Date.now()}.jpg`).replace(/[^a-zA-Z0-9._-]/g, '_');
  const nonce = Math.random().toString(36).slice(2, 10);
  const storagePath = `messages/${coachId}/${Date.now()}_${nonce}_${safeName}`;

  // Fetch local file uri as blob
  const response = await fetch(uri);
  const blob = await response.blob();

  const fileRef = ref(storage, storagePath);
  const result = await uploadBytes(fileRef, blob);
  const downloadUrl = await getDownloadURL(result.ref);

  return {
    name: safeName,
    url: downloadUrl,
    storagePath,
    type,
    size: blob.size || 0,
  };
}

/**
 * Mark incoming unread admin messages as read in Firestore
 * Updates users/{coachId}/messages/{messageId} with status: 'read' and readAt: serverTimestamp()
 */
export async function markAdminMessagesAsRead(
  coachId: string,
  messages: ChatMessage[]
): Promise<void> {
  if (!coachId || !messages || messages.length === 0) return;

  const unreadAdminMessages = messages.filter(
    (msg) => msg.sender === 'admin' && msg.status !== 'read'
  );

  if (unreadAdminMessages.length === 0) return;

  for (let i = 0; i < unreadAdminMessages.length; i += BATCH_SIZE) {
    const batch = writeBatch(db);
    const chunk = unreadAdminMessages.slice(i, i + BATCH_SIZE);

    chunk.forEach((msg) => {
      const msgRef = doc(db, 'users', coachId, 'messages', msg.id);
      batch.update(msgRef, {
        status: 'read',
        readAt: serverTimestamp(),
      });
    });

    await batch.commit();
  }
}
