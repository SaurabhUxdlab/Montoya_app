import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  Image,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Modal,
  Alert,
  ScrollView,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import {
  Send,
  Image as ImageIcon,
  CheckCheck,
  Check,
  X,
  Sparkles,
  Edit2,
  Trash2,
  Copy,
  MoreVertical,
} from 'lucide-react-native';
import { COLORS } from '../constants/colors';
import { SPACING, RADIUS, SHADOWS } from '../constants/theme';
import { moderateScale, moderateFont } from '../utils/responsive';
import { useAppSelector, useAppDispatch } from '../hooks/redux';
import {
  sendCoachMessage,
  uploadChatAttachment,
  editCoachMessage,
  deleteCoachMessage,
  markAdminMessagesAsRead,
  formatMessageTimestamp,
  toMessageDate,
} from '../services/chatService';
import { setSending, setError } from '../store/slices/chatSlice';
import { ChatMessage, MessageAttachment } from '../types';

const QUICK_ACTIONS = [
  '🏸 Court Availability',
  '🔄 Shift Swap Request',
  '🌦️ Weather & Rain Status',
  '📋 Session Log Question',
  '🚨 Urgent Academy Support',
];

export const ChatScreen: React.FC = () => {
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const { messages, isSending, isLoading } = useAppSelector((state) => state.chat);
  const isOnline = useAppSelector((state) => state.offlineSync.isOnline);

  const [draft, setDraft] = useState('');
  const [pendingImageUri, setPendingImageUri] = useState<string | null>(null);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  // Message Actions Modal state
  const [selectedMessage, setSelectedMessage] = useState<ChatMessage | null>(null);
  const [isActionModalVisible, setIsActionModalVisible] = useState(false);

  // Edit Mode state
  const [editingMessage, setEditingMessage] = useState<ChatMessage | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const flatListRef = useRef<FlatList<any>>(null);

  // Automatically mark incoming unread admin messages as read when screen is viewed
  useEffect(() => {
    if (!user?.uid || messages.length === 0) return;

    markAdminMessagesAsRead(user.uid, messages).catch((err) => {
      console.warn('[ChatScreen] Could not mark messages as read:', err);
    });
  }, [messages, user?.uid]);

  // Scroll to bottom whenever messages update (if not in edit mode)
  useEffect(() => {
    if (messages.length > 0 && !editingMessage) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length, editingMessage]);

  // Pick an image from device library or camera
  const handlePickImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert(
          'Permission Required',
          'Please allow media library access to send photo attachments.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
        allowsEditing: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setPendingImageUri(result.assets[0].uri);
      }
    } catch (err: any) {
      console.warn('[ChatScreen] Error picking image:', err);
      Alert.alert('Image Selection Error', 'Could not access photo library.');
    }
  };

  // Start Editing Message
  const handleStartEdit = (message: ChatMessage) => {
    setIsActionModalVisible(false);
    setSelectedMessage(null);
    setEditingMessage(message);
    setDraft(message.text || '');
    setPendingImageUri(null);
  };

  // Cancel Editing Message
  const handleCancelEdit = () => {
    setEditingMessage(null);
    setDraft('');
  };

  // Delete Message Confirmation
  const handleDeletePrompt = (message: ChatMessage) => {
    setIsActionModalVisible(false);
    setSelectedMessage(null);

    Alert.alert(
      'Delete Message',
      'Are you sure you want to delete this message? It will be permanently removed for both you and the admin.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!user?.uid) return;
            try {
              await deleteCoachMessage(user.uid, message);
              if (editingMessage?.id === message.id) {
                handleCancelEdit();
              }
            } catch (err: any) {
              console.error('[ChatScreen] Delete error:', err);
              Alert.alert('Delete Error', err?.message || 'Could not delete message.');
            }
          },
        },
      ]
    );
  };

  // Send or Save Edit Message Handler
  const handleSendMessage = async () => {
    const textToSend = draft.trim();
    if (!user?.uid || (!textToSend && !pendingImageUri)) return;

    if (isSending || isUploadingImage || isEditing) return;

    // If we are currently editing an existing message
    if (editingMessage) {
      setIsEditing(true);
      try {
        await editCoachMessage(user.uid, editingMessage.id, textToSend);
        setEditingMessage(null);
        setDraft('');
      } catch (err: any) {
        console.error('[ChatScreen] Edit error:', err);
        Alert.alert('Edit Error', err?.message || 'Could not update message.');
      } finally {
        setIsEditing(false);
      }
      return;
    }

    // Normal Send New Message
    dispatch(setSending(true));
    let uploadedAttachment: MessageAttachment | null = null;

    try {
      // 1. Upload attachment if attached
      if (pendingImageUri) {
        setIsUploadingImage(true);
        uploadedAttachment = await uploadChatAttachment(
          user.uid,
          pendingImageUri,
          `coach_photo_${Date.now()}.jpg`,
          'image'
        );
        setIsUploadingImage(false);
      }

      // 2. Send message
      await sendCoachMessage(
        user.uid,
        textToSend,
        uploadedAttachment ? [uploadedAttachment] : null
      );

      // 3. Clear draft and attachment
      setDraft('');
      setPendingImageUri(null);
    } catch (err: any) {
      console.error('[ChatScreen] Send error:', err);
      dispatch(setError(err?.message || 'Failed to send message'));
      Alert.alert('Send Error', err?.message || 'Could not send message. Please try again.');
    } finally {
      setIsUploadingImage(false);
      dispatch(setSending(false));
    }
  };

  // Quick action tap
  const handleQuickAction = (text: string) => {
    setDraft((prev) => (prev ? `${prev} ${text}` : text));
  };

  // Message date grouping
  const processedMessages = useMemo(() => {
    return messages.map((msg) => ({
      ...msg,
      jsDate: toMessageDate(msg.timestamp),
    }));
  }, [messages]);

  const renderMessageItem = ({ item, index }: { item: ChatMessage & { jsDate: Date }; index: number }) => {
    const isCoach = item.sender !== 'admin';
    const timeDisplay = formatMessageTimestamp(item.timestamp);
    const isCurrentlyEdited = editingMessage?.id === item.id;

    // Show date divider if first message or different day from previous
    let showDateDivider = false;
    if (index === 0) {
      showDateDivider = true;
    } else {
      const prev = processedMessages[index - 1];
      const prevDate = prev.jsDate;
      const currDate = item.jsDate;
      if (
        prevDate.getDate() !== currDate.getDate() ||
        prevDate.getMonth() !== currDate.getMonth() ||
        prevDate.getFullYear() !== currDate.getFullYear()
      ) {
        showDateDivider = true;
      }
    }

    const dateDividerText = (() => {
      const d = item.jsDate;
      if (!d || d.getTime() === 0) return '';
      const now = new Date();
      if (
        d.getDate() === now.getDate() &&
        d.getMonth() === now.getMonth() &&
        d.getFullYear() === now.getFullYear()
      ) {
        return 'Today';
      }
      const yest = new Date(now);
      yest.setDate(yest.getDate() - 1);
      if (
        d.getDate() === yest.getDate() &&
        d.getMonth() === yest.getMonth() &&
        d.getFullYear() === yest.getFullYear()
      ) {
        return 'Yesterday';
      }
      return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
    })();

    return (
      <View style={styles.messageRowContainer}>
        {showDateDivider && dateDividerText ? (
          <View style={styles.dateDividerWrapper}>
            <View style={styles.dateDividerLine} />
            <Text style={styles.dateDividerText}>{dateDividerText}</Text>
            <View style={styles.dateDividerLine} />
          </View>
        ) : null}

        <View
          style={[
            styles.messageWrapper,
            isCoach ? styles.coachMessageWrapper : styles.adminMessageWrapper,
          ]}
        >
          {/* Admin Avatar on the left for incoming messages */}
          {!isCoach && (
            <View style={styles.adminAvatarCircle}>
              <Text style={styles.adminAvatarText}>MT</Text>
            </View>
          )}

          <TouchableOpacity
            activeOpacity={0.9}
            onLongPress={() => {
              setSelectedMessage(item);
              setIsActionModalVisible(true);
            }}
            style={[
              styles.bubble,
              isCoach ? styles.coachBubble : styles.adminBubble,
              isCurrentlyEdited && styles.bubbleEditingHighlight,
            ]}
          >
            {/* Sender Label for Admin */}
            {!isCoach && (
              <View style={styles.adminHeaderRow}>
                <Text style={styles.adminSenderTitle}>Montoya Tennis Admin</Text>
                <View style={styles.headquartersBadge}>
                  <Text style={styles.headquartersBadgeText}>HQ</Text>
                </View>
              </View>
            )}

            {/* Attachments if present */}
            {item.attachments && item.attachments.length > 0 && (
              <View style={styles.attachmentsContainer}>
                {item.attachments.map((att, attIdx) => (
                  <TouchableOpacity
                    key={attIdx}
                    activeOpacity={0.85}
                    onPress={() => setPreviewImageUrl(att.url)}
                    style={styles.attachmentImageWrapper}
                  >
                    <Image
                      source={{ uri: att.url }}
                      style={styles.attachmentImage}
                      resizeMode="cover"
                    />
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Message Text */}
            {item.text ? (
              <Text
                style={[
                  styles.messageText,
                  isCoach ? styles.coachMessageText : styles.adminMessageText,
                ]}
              >
                {item.text}
              </Text>
            ) : null}

            {/* Timestamp and Read Receipts */}
            <View style={styles.bubbleFooter}>
              {item.isEdited ? (
                <Text style={styles.editedLabel}>(edited)</Text>
              ) : null}

              <Text
                style={[
                  styles.timestampText,
                  isCoach ? styles.coachTimestamp : styles.adminTimestamp,
                ]}
              >
                {timeDisplay || 'Just now'}
              </Text>

              {isCoach && (
                <View style={styles.statusIndicator}>
                  {item.status === 'read' ? (
                    <CheckCheck size={14} color={COLORS.montoyaRed} strokeWidth={2.5} />
                  ) : (
                    <Check size={14} color="#94A3B8" strokeWidth={2} />
                  )}
                </View>
              )}
            </View>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* Subtle Channel Status Sub-Bar */}
      <View style={styles.channelHeader}>
        <View style={styles.channelInfo}>
          <View style={styles.onlineDot} />
          <Text style={styles.channelTitle}>Montoya Tennis Academy Desk</Text>
          <Text style={styles.channelDotDivider}>•</Text>
          <Text style={styles.channelSubtitle}>Direct Real-Time Dispatch</Text>
        </View>

        {!isOnline && (
          <View style={styles.offlineTag}>
            <Text style={styles.offlineTagText}>Offline</Text>
          </View>
        )}
      </View>

      {/* Messages Thread */}
      {isLoading && messages.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.montoyaRed} />
          <Text style={styles.loadingText}>Connecting to Real-Time Chat...</Text>
        </View>
      ) : messages.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconCircle}>
            <Sparkles size={26} color={COLORS.montoyaRed} />
          </View>
          <Text style={styles.emptyTitle}>Welcome to Academy Chat</Text>
          <Text style={styles.emptySubtitle}>
            This is your direct line to Montoya Tennis management. Inquire about schedules, court updates, shift swaps, or emergency assistance.
          </Text>

          {/* Quick Start Suggestions */}
          <View style={styles.quickStartWrapper}>
            <Text style={styles.quickStartHeading}>Quick Inquiries:</Text>
            <View style={styles.quickChipsWrap}>
              {QUICK_ACTIONS.map((action, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={styles.quickChip}
                  onPress={() => handleQuickAction(action)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.quickChipText}>{action}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={processedMessages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessageItem}
          contentContainerStyle={styles.messagesListContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Quick Action Chips Bar above input (when not editing and conversation is active) */}
      {!editingMessage && messages.length > 0 && (
        <View style={styles.quickBarContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickBarContent}>
            {QUICK_ACTIONS.map((action, idx) => (
              <TouchableOpacity
                key={idx}
                style={styles.smallQuickChip}
                onPress={() => handleQuickAction(action)}
                activeOpacity={0.7}
              >
                <Text style={styles.smallQuickChipText}>{action}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Active Edit Mode Banner */}
      {editingMessage && (
        <View style={styles.editingBanner}>
          <View style={styles.editingBannerLeft}>
            <Edit2 size={16} color={COLORS.montoyaRed} />
            <View style={styles.editingTextCol}>
              <Text style={styles.editingBannerTitle}>Editing Message</Text>
              <Text style={styles.editingBannerSnippet} numberOfLines={1}>
                {editingMessage.text}
              </Text>
            </View>
          </View>
          <TouchableOpacity style={styles.cancelEditBtn} onPress={handleCancelEdit}>
            <X size={18} color="#64748B" />
          </TouchableOpacity>
        </View>
      )}

      {/* Pending Attachment Preview */}
      {pendingImageUri && !editingMessage && (
        <View style={styles.pendingAttachmentCard}>
          <Image source={{ uri: pendingImageUri }} style={styles.pendingImagePreview} />
          <View style={styles.pendingInfo}>
            <Text style={styles.pendingTitle}>Photo Attachment Ready</Text>
            <Text style={styles.pendingSubtitle}>Will be sent with message</Text>
          </View>
          <TouchableOpacity
            style={styles.removeAttachmentButton}
            onPress={() => setPendingImageUri(null)}
          >
            <X size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      )}

      {/* Input Bar */}
      <View style={styles.inputContainer}>
        {/* Photo Picker Button (hidden when editing) */}
        {!editingMessage && (
          <TouchableOpacity
            style={styles.attachButton}
            onPress={handlePickImage}
            disabled={isSending || isUploadingImage}
            activeOpacity={0.7}
          >
            <ImageIcon size={22} color={COLORS.montoyaRed} />
          </TouchableOpacity>
        )}

        {/* Text Input */}
        <TextInput
          style={styles.textInput}
          placeholder={editingMessage ? "Edit your message..." : "Message Montoya Tennis Admin..."}
          placeholderTextColor="#94A3B8"
          value={draft}
          onChangeText={setDraft}
          multiline
          maxLength={1000}
        />

        {/* Send / Save Button */}
        <TouchableOpacity
          style={[
            styles.sendButton,
            (!draft.trim() && !pendingImageUri) || isSending || isUploadingImage || isEditing
              ? styles.sendButtonDisabled
              : styles.sendButtonActive,
          ]}
          onPress={handleSendMessage}
          disabled={(!draft.trim() && !pendingImageUri) || isSending || isUploadingImage || isEditing}
          activeOpacity={0.8}
        >
          {isSending || isUploadingImage || isEditing ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : editingMessage ? (
            <Check size={18} color="#FFFFFF" strokeWidth={2.5} />
          ) : (
            <Send size={18} color="#FFFFFF" />
          )}
        </TouchableOpacity>
      </View>

      {/* Message Action Sheet Modal (Edit / Delete / Copy) */}
      <Modal
        visible={isActionModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsActionModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.actionModalBackdrop}
          activeOpacity={1}
          onPress={() => setIsActionModalVisible(false)}
        >
          <View style={styles.actionModalCard}>
            <View style={styles.actionModalHeader}>
              <Text style={styles.actionModalTitle}>Message Actions</Text>
              <TouchableOpacity onPress={() => setIsActionModalVisible(false)}>
                <X size={18} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            {/* Message Preview Quote */}
            {selectedMessage?.text ? (
              <View style={styles.actionModalQuote}>
                <Text style={styles.actionModalQuoteText} numberOfLines={2}>
                  "{selectedMessage.text}"
                </Text>
              </View>
            ) : null}

            {/* Action Items for Coach sent message */}
            {selectedMessage && selectedMessage.sender !== 'admin' ? (
              <>
                <TouchableOpacity
                  style={styles.actionMenuItem}
                  onPress={() => handleStartEdit(selectedMessage)}
                >
                  <View style={[styles.actionIconCircle, { backgroundColor: '#FAF2F2' }]}>
                    <Edit2 size={16} color={COLORS.montoyaRed} />
                  </View>
                  <View style={styles.actionItemContent}>
                    <Text style={styles.actionItemTitle}>Edit Message</Text>
                    <Text style={styles.actionItemSubtitle}>Modify text content</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionMenuItem}
                  onPress={() => handleDeletePrompt(selectedMessage)}
                >
                  <View style={[styles.actionIconCircle, { backgroundColor: '#FEE2E2' }]}>
                    <Trash2 size={16} color="#DC2626" />
                  </View>
                  <View style={styles.actionItemContent}>
                    <Text style={[styles.actionItemTitle, { color: '#DC2626' }]}>Delete Message</Text>
                    <Text style={styles.actionItemSubtitle}>Permanently remove message</Text>
                  </View>
                </TouchableOpacity>
              </>
            ) : null}

            <TouchableOpacity
              style={[styles.actionMenuItem, { borderBottomWidth: 0 }]}
              onPress={() => {
                setIsActionModalVisible(false);
                if (selectedMessage?.text) {
                  Alert.alert('Copied', 'Message text copied.');
                }
              }}
            >
              <View style={[styles.actionIconCircle, { backgroundColor: '#F1F5F9' }]}>
                <Copy size={16} color="#475569" />
              </View>
              <View style={styles.actionItemContent}>
                <Text style={styles.actionItemTitle}>Copy Text</Text>
                <Text style={styles.actionItemSubtitle}>Copy message to clipboard</Text>
              </View>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Image Full-Screen Lightbox Modal */}
      <Modal
        visible={previewImageUrl !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewImageUrl(null)}
      >
        <View style={styles.modalBackdrop}>
          <TouchableOpacity
            style={styles.modalCloseButton}
            onPress={() => setPreviewImageUrl(null)}
          >
            <X size={24} color="#FFFFFF" />
          </TouchableOpacity>
          {previewImageUrl && (
            <Image
              source={{ uri: previewImageUrl }}
              style={styles.fullscreenImage}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  channelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: SPACING.md,
    paddingVertical: moderateScale(8),
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  channelInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 6,
  },
  onlineDot: {
    width: moderateScale(8),
    height: moderateScale(8),
    borderRadius: moderateScale(4),
    backgroundColor: '#16A34A',
  },
  channelTitle: {
    fontSize: moderateFont(12),
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  channelDotDivider: {
    fontSize: moderateFont(12),
    color: '#94A3B8',
  },
  channelSubtitle: {
    fontSize: moderateFont(11),
    color: '#64748B',
    fontWeight: '500',
  },
  offlineTag: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: moderateScale(8),
    paddingVertical: moderateScale(2),
    borderRadius: RADIUS.sm,
  },
  offlineTagText: {
    fontSize: moderateFont(10),
    color: '#D97706',
    fontWeight: '700',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  loadingText: {
    marginTop: moderateScale(12),
    fontSize: moderateFont(13),
    color: '#64748B',
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.lg,
  },
  emptyIconCircle: {
    width: moderateScale(52),
    height: moderateScale(52),
    borderRadius: moderateScale(26),
    backgroundColor: '#FAF2F2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: moderateScale(12),
  },
  emptyTitle: {
    fontSize: moderateFont(16),
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: moderateScale(6),
  },
  emptySubtitle: {
    fontSize: moderateFont(13),
    color: '#64748B',
    textAlign: 'center',
    lineHeight: moderateScale(18),
    marginBottom: moderateScale(20),
  },
  quickStartWrapper: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    padding: moderateScale(14),
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  quickStartHeading: {
    fontSize: moderateFont(12),
    fontWeight: '700',
    color: '#475569',
    marginBottom: moderateScale(10),
  },
  quickChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickChip: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: moderateScale(10),
    paddingVertical: moderateScale(6),
    borderRadius: RADIUS.full,
  },
  quickChipText: {
    fontSize: moderateFont(11),
    color: '#334155',
    fontWeight: '600',
  },
  messagesListContent: {
    paddingHorizontal: SPACING.md,
    paddingVertical: moderateScale(12),
  },
  messageRowContainer: {
    marginBottom: moderateScale(10),
  },
  dateDividerWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: moderateScale(10),
  },
  dateDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  dateDividerText: {
    marginHorizontal: moderateScale(10),
    fontSize: moderateFont(11),
    fontWeight: '700',
    color: '#94A3B8',
    textTransform: 'uppercase',
  },
  messageWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  coachMessageWrapper: {
    justifyContent: 'flex-end',
  },
  adminMessageWrapper: {
    justifyContent: 'flex-start',
  },
  adminAvatarCircle: {
    width: moderateScale(28),
    height: moderateScale(28),
    borderRadius: moderateScale(14),
    backgroundColor: '#FAF2F2',
    borderWidth: 1,
    borderColor: '#F3E8E8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: moderateScale(8),
    marginBottom: moderateScale(2),
  },
  adminAvatarText: {
    color: COLORS.montoyaRed,
    fontSize: moderateFont(10),
    fontWeight: '800',
  },
  bubble: {
    maxWidth: '82%',
    paddingHorizontal: moderateScale(14),
    paddingVertical: moderateScale(10),
    borderRadius: RADIUS.lg,
    ...SHADOWS.sm,
  },
  coachBubble: {
    backgroundColor: '#FAF2F2',
    borderWidth: 1,
    borderColor: '#F3E8E8',
    borderBottomRightRadius: 2,
  },
  adminBubble: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderBottomLeftRadius: 2,
  },
  bubbleEditingHighlight: {
    borderColor: COLORS.montoyaRed,
    borderWidth: 1.5,
  },
  adminHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 6,
  },
  adminSenderTitle: {
    fontSize: moderateFont(11),
    fontWeight: '700',
    color: COLORS.montoyaRed,
  },
  headquartersBadge: {
    backgroundColor: '#FAF2F2',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 0.5,
    borderColor: '#F3E8E8',
  },
  headquartersBadgeText: {
    fontSize: moderateFont(8),
    fontWeight: '800',
    color: COLORS.montoyaRed,
  },
  attachmentsContainer: {
    marginBottom: 6,
  },
  attachmentImageWrapper: {
    borderRadius: RADIUS.md,
    overflow: 'hidden',
  },
  attachmentImage: {
    width: moderateScale(200),
    height: moderateScale(140),
    borderRadius: RADIUS.md,
    backgroundColor: '#E2E8F0',
  },
  messageText: {
    fontSize: moderateFont(14),
    lineHeight: moderateScale(20),
    fontWeight: '400',
  },
  coachMessageText: {
    color: '#1E293B',
  },
  adminMessageText: {
    color: '#1E293B',
  },
  bubbleFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
    gap: 4,
  },
  editedLabel: {
    fontSize: moderateFont(9),
    color: '#94A3B8',
    fontStyle: 'italic',
    marginRight: 2,
  },
  timestampText: {
    fontSize: moderateFont(10),
  },
  coachTimestamp: {
    color: '#64748B',
  },
  adminTimestamp: {
    color: '#94A3B8',
  },
  statusIndicator: {
    marginLeft: 2,
  },
  quickBarContainer: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingVertical: moderateScale(6),
  },
  quickBarContent: {
    paddingHorizontal: SPACING.md,
    gap: 8,
  },
  smallQuickChip: {
    backgroundColor: '#FAF2F2',
    borderWidth: 1,
    borderColor: '#F3E8E8',
    paddingHorizontal: moderateScale(8),
    paddingVertical: moderateScale(4),
    borderRadius: RADIUS.full,
  },
  smallQuickChipText: {
    fontSize: moderateFont(11),
    color: COLORS.montoyaRed,
    fontWeight: '600',
  },
  editingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF1F2',
    borderTopWidth: 1,
    borderTopColor: '#FECDD3',
    paddingHorizontal: SPACING.md,
    paddingVertical: moderateScale(6),
  },
  editingBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  editingTextCol: {
    flex: 1,
  },
  editingBannerTitle: {
    fontSize: moderateFont(11),
    fontWeight: '700',
    color: COLORS.montoyaRed,
  },
  editingBannerSnippet: {
    fontSize: moderateFont(11),
    color: '#64748B',
  },
  cancelEditBtn: {
    padding: moderateScale(4),
  },
  pendingAttachmentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF2F2',
    marginHorizontal: SPACING.md,
    marginBottom: moderateScale(6),
    padding: moderateScale(8),
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: '#F3E8E8',
  },
  pendingImagePreview: {
    width: moderateScale(40),
    height: moderateScale(40),
    borderRadius: RADIUS.sm,
    marginRight: moderateScale(10),
  },
  pendingInfo: {
    flex: 1,
  },
  pendingTitle: {
    fontSize: moderateFont(12),
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  pendingSubtitle: {
    fontSize: moderateFont(10),
    color: '#64748B',
  },
  removeAttachmentButton: {
    backgroundColor: COLORS.montoyaRed,
    width: moderateScale(24),
    height: moderateScale(24),
    borderRadius: moderateScale(12),
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: SPACING.md,
    paddingVertical: moderateScale(8),
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  attachButton: {
    width: moderateScale(38),
    height: moderateScale(38),
    borderRadius: moderateScale(19),
    backgroundColor: '#FAF2F2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: moderateScale(8),
  },
  textInput: {
    flex: 1,
    minHeight: moderateScale(38),
    maxHeight: moderateScale(100),
    backgroundColor: '#F8FAFC',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: moderateScale(12),
    paddingVertical: moderateScale(8),
    fontSize: moderateFont(14),
    color: COLORS.textPrimary,
  },
  sendButton: {
    width: moderateScale(38),
    height: moderateScale(38),
    borderRadius: moderateScale(19),
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: moderateScale(8),
  },
  sendButtonActive: {
    backgroundColor: COLORS.montoyaRed || '#7B0818',
  },
  sendButtonDisabled: {
    backgroundColor: '#CBD5E1',
  },
  actionModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  actionModalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.xl,
    ...SHADOWS.lg,
  },
  actionModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: moderateScale(10),
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  actionModalTitle: {
    fontSize: moderateFont(14),
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  actionModalQuote: {
    backgroundColor: '#F8FAFC',
    padding: moderateScale(10),
    borderRadius: RADIUS.md,
    marginVertical: moderateScale(10),
    borderLeftWidth: 3,
    borderLeftColor: COLORS.montoyaRed,
  },
  actionModalQuoteText: {
    fontSize: moderateFont(12),
    color: '#475569',
    fontStyle: 'italic',
  },
  actionMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: moderateScale(12),
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    gap: 12,
  },
  actionIconCircle: {
    width: moderateScale(36),
    height: moderateScale(36),
    borderRadius: moderateScale(18),
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionItemContent: {
    flex: 1,
  },
  actionItemTitle: {
    fontSize: moderateFont(13),
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  actionItemSubtitle: {
    fontSize: moderateFont(11),
    color: '#64748B',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullscreenImage: {
    width: '95%',
    height: '80%',
  },
});
