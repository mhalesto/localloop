import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Modal,
  Alert,
  Image,
  Keyboard,
  Pressable
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import ScreenLayout from '../components/ScreenLayout';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import { buildConversationId, sendDirectMessage, subscribeToMessages, addReaction } from '../services/messagesService';
import VoiceRecorder from '../components/VoiceRecorder';
import VoiceNotePlayer from '../components/VoiceNotePlayer';
import MessageReactions from '../components/MessageReactions';
import MessageActionSheet from '../components/MessageActionSheet';
import StickerPicker from '../components/StickerPicker';
import GifPicker from '../components/GifPicker';
import AttachmentMenu from '../components/AttachmentMenu';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../api/firebaseClient';
import * as Clipboard from 'expo-clipboard';

export default function DirectMessageScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { user, profile: currentProfile } = useAuth();
  const { themeColors, isDarkMode } = useSettings();
  const { userId: recipientId, username, displayName, profilePhoto } = route.params ?? {};

  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [uploadingVoice, setUploadingVoice] = useState(false);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [showStickerPicker, setShowStickerPicker] = useState(false);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [actionSheetMessage, setActionSheetMessage] = useState(null);
  const listRef = useRef(null);

  const conversationId = useMemo(() => {
    if (!user?.uid || !recipientId) {
      return null;
    }
    return buildConversationId(user.uid, recipientId);
  }, [user?.uid, recipientId]);

  useEffect(() => {
    navigation.setOptions?.({ headerShown: false });
  }, [navigation]);

  useEffect(() => {
    if (!conversationId) return undefined;
    const unsubscribe = subscribeToMessages(conversationId, (items) => {
      setMessages(items);
      requestAnimationFrame(() => {
        listRef.current?.scrollToEnd?.({ animated: true });
      });
    });
    return unsubscribe;
  }, [conversationId]);

  const handleSendVoiceNote = useCallback(async ({ uri, duration }) => {
    if (!conversationId || !user?.uid || !recipientId) {
      Alert.alert('Error', 'Unable to send voice note');
      return;
    }

    setUploadingVoice(true);
    try {
      // Upload to Firebase Storage
      const response = await fetch(uri);
      const blob = await response.blob();

      const filename = `voice_${Date.now()}.m4a`;
      const storageRef = ref(storage, `voiceNotes/${conversationId}/${filename}`);

      await uploadBytes(storageRef, blob);
      const downloadURL = await getDownloadURL(storageRef);

      // Send message with voice note
      await sendDirectMessage({
        conversationId,
        senderId: user.uid,
        recipientId,
        text: '[Voice Note]',
        voiceNote: {
          url: downloadURL,
          duration: duration
        }
      });

      setIsRecordingVoice(false);
    } catch (error) {
      console.error('[DirectMessage] Failed to send voice note:', error);
      Alert.alert('Error', 'Failed to send voice note');
    } finally {
      setUploadingVoice(false);
    }
  }, [conversationId, user?.uid, recipientId]);

  const handleReact = useCallback(async (messageId, emoji, remove = false) => {
    if (!conversationId || !user?.uid) return;

    try {
      await addReaction(conversationId, messageId, user.uid, emoji, remove);
    } catch (error) {
      console.error('[DirectMessage] Failed to add reaction:', error);
    }
  }, [conversationId, user?.uid]);

  const handleSendSticker = useCallback(async (sticker) => {
    if (!conversationId || !user?.uid || !recipientId) return;

    try {
      const payload = {
        conversationId,
        senderId: user.uid,
        recipientId,
        text: sticker, // Stickers are sent as text with large emoji
        isSticker: true
      };
      await sendDirectMessage(payload);
    } catch (error) {
      console.error('[DirectMessage] Failed to send sticker:', error);
    }
  }, [conversationId, user?.uid, recipientId]);

  const handleSendGif = useCallback(async (gifUrl, width, height) => {
    if (!conversationId || !user?.uid || !recipientId) return;

    try {
      const payload = {
        conversationId,
        senderId: user.uid,
        recipientId,
        text: '[GIF]',
        gif: {
          url: gifUrl,
          width,
          height
        }
      };
      await sendDirectMessage(payload);
    } catch (error) {
      console.error('[DirectMessage] Failed to send GIF:', error);
    }
  }, [conversationId, user?.uid, recipientId]);

  const handleAttachmentMenuToggle = useCallback(() => {
    if (!showAttachmentMenu) {
      Keyboard.dismiss();
    }
    setShowAttachmentMenu(!showAttachmentMenu);
  }, [showAttachmentMenu]);

  const handleAttachmentSelect = useCallback((optionId) => {
    switch (optionId) {
      case 'sticker':
        setShowStickerPicker(true);
        break;
      case 'gif':
        setShowGifPicker(true);
        break;
      case 'camera':
        Alert.alert('Camera', 'Camera feature coming soon!');
        break;
      case 'photo':
        Alert.alert('Photos', 'Photo picker coming soon!');
        break;
      case 'location':
        Alert.alert('Location', 'Location sharing coming soon!');
        break;
      case 'contact':
        Alert.alert('Contact', 'Contact sharing coming soon!');
        break;
      case 'document':
        Alert.alert('Document', 'Document sharing coming soon!');
        break;
      case 'poll':
        Alert.alert('Poll', 'Poll feature coming soon!');
        break;
    }
  }, []);

  const handleSend = useCallback(async () => {
    console.log('[DirectMessageScreen] handleSend called');
    console.log('[DirectMessageScreen] conversationId:', conversationId);
    console.log('[DirectMessageScreen] user.uid:', user?.uid);
    console.log('[DirectMessageScreen] recipientId:', recipientId);
    console.log('[DirectMessageScreen] messageText:', messageText);

    if (!conversationId || !user?.uid || !recipientId) {
      console.warn('[DirectMessageScreen] Missing required data, redirecting to Settings');
      navigation.navigate('Settings');
      return;
    }
    if (!messageText.trim() || sending) {
      console.warn('[DirectMessageScreen] Empty message or already sending');
      return;
    }
    setSending(true);
    try {
      const payload = {
        conversationId,
        senderId: user.uid,
        recipientId,
        text: messageText
      };
      console.log('[DirectMessageScreen] Calling sendDirectMessage with payload:', payload);
      await sendDirectMessage(payload);
      console.log('[DirectMessageScreen] Message sent successfully!');
      setMessageText('');
    } catch (error) {
      console.error('[DirectMessage] send failed', error.code, error.message, error);
    } finally {
      setSending(false);
    }
  }, [conversationId, messageText, navigation, recipientId, sending, user?.uid]);

  const handleLongPressMessage = useCallback((message) => {
    Keyboard.dismiss();
    setShowAttachmentMenu(false);
    setActionSheetMessage(message);
  }, []);

  const handleSelectReactionFromSheet = useCallback((emoji) => {
    setActionSheetMessage((current) => {
      if (!current) return null;
      const existing = current.reactions?.[user?.uid];
      const remove = existing === emoji;
      handleReact(current.id, emoji, remove);
      return null;
    });
  }, [handleReact, user?.uid]);

  const handleSelectActionFromSheet = useCallback((actionId) => {
    setActionSheetMessage((current) => {
      if (!current) return null;
      switch (actionId) {
        case 'copy':
          if (current.text) {
            Clipboard.setStringAsync(current.text);
            Alert.alert('Copied', 'Message copied to clipboard.');
          } else {
            Alert.alert('Nothing to copy', 'This message has no text to copy.');
          }
          break;
        case 'delete':
        case 'reply':
        case 'forward':
        case 'edit':
        case 'info':
        case 'star':
        case 'more':
        default:
          Alert.alert('Coming soon', 'This action will be available in a future update.');
          break;
      }
      return null;
    });
  }, []);

  const closeActionSheet = useCallback(() => setActionSheetMessage(null), []);

  const renderMessage = ({ item }) => {
    const isMine = item.senderId === user?.uid;
    return (
      <View
        style={[
          styles.messageRow,
          { justifyContent: isMine ? 'flex-end' : 'flex-start' }
        ]}
      >
        <View style={styles.messageContainer}>
          <Pressable
            onLongPress={() => handleLongPressMessage(item)}
            delayLongPress={280}
            style={styles.messagePressable}
          >
            <View
              style={[
                styles.messageBubble,
                {
                  backgroundColor: isMine ? themeColors.primary : themeColors.card,
                  borderTopLeftRadius: isMine ? 16 : 4,
                  borderTopRightRadius: isMine ? 4 : 16
                }
              ]}
            >
              {item.voiceNote ? (
                <VoiceNotePlayer
                  uri={item.voiceNote.url}
                  duration={item.voiceNote.duration}
                  themeColors={themeColors}
                  accentColor={themeColors.primary}
                  isSent={isMine}
                />
              ) : item.gif ? (
                <Image
                  source={{ uri: item.gif.url }}
                  style={[styles.gifImage, { width: Math.min(item.gif.width || 200, 250), height: Math.min(item.gif.height || 200, 250) }]}
                  resizeMode="cover"
                />
              ) : item.isSticker ? (
                <Text style={styles.stickerText}>{item.text}</Text>
              ) : (
                <Text style={[styles.messageText, { color: isMine ? '#fff' : themeColors.textPrimary }]}>
                  {item.text}
                </Text>
              )}
              <Text style={[styles.messageTime, { color: isMine ? 'rgba(255,255,255,0.7)' : themeColors.textSecondary }]}>
                {formatTimestamp(item.createdAt)}
              </Text>
            </View>
          </Pressable>
          <MessageReactions
            messageId={item.id}
            reactions={item.reactions}
            currentUserId={user?.uid}
            onReact={handleReact}
            themeColors={themeColors}
          />
        </View>
      </View>
    );
  };

  if (!user?.uid || !recipientId) {
    return (
      <ScreenLayout
        title="Messages"
        navigation={navigation}
        onBack={() => navigation.goBack()}
        showFooter={false}
      >
        <View style={styles.centered}>
          <Text style={styles.infoText}>Sign in to send direct messages.</Text>
        </View>
      </ScreenLayout>
    );
  }

  const headerTitle = displayName || `@${username}` || 'Conversation';

  return (
    <ScreenLayout
      title={headerTitle}
      subtitle={username ? `@${username}` : undefined}
      navigation={navigation}
      onBack={() => navigation.goBack()}
      showFooter={false}
      contentStyle={{ paddingHorizontal: 0, paddingBottom: 0 }}
    >
      <KeyboardAvoidingView
        style={styles.wrapper}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 120 : 0}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          style={styles.list}
          contentContainerStyle={styles.listContent}
          onContentSizeChange={() => listRef.current?.scrollToEnd?.({ animated: true })}
          keyboardShouldPersistTaps="handled"
        />
        <View style={[styles.inputRow, { borderTopColor: themeColors.divider, backgroundColor: themeColors.card }]}>
          <TouchableOpacity
            style={styles.attachButton}
            onPress={handleAttachmentMenuToggle}
          >
            <Ionicons name={showAttachmentMenu ? "close-circle" : "add-circle"} size={28} color={themeColors.primary} />
          </TouchableOpacity>

          <View style={[styles.inputContainer, { backgroundColor: themeColors.surface, borderColor: themeColors.divider }]}>
            <TextInput
              style={[styles.input, { color: themeColors.textPrimary }]}
              placeholder="Message"
              placeholderTextColor={themeColors.textSecondary}
              value={messageText}
              onChangeText={setMessageText}
              onFocus={() => setShowAttachmentMenu(false)}
              multiline
              maxLength={2000}
            />
          </View>

          {messageText.trim() ? (
            <TouchableOpacity
              style={[styles.sendButton, { backgroundColor: themeColors.primary }]}
              onPress={handleSend}
              disabled={sending}
              activeOpacity={0.7}
            >
              {sending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="send" size={20} color="#fff" />
              )}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.micButton}
              onPress={() => setIsRecordingVoice(true)}
              disabled={uploadingVoice}
            >
              {uploadingVoice ? (
                <ActivityIndicator size="small" color={themeColors.primary} />
              ) : (
                <Ionicons name="mic" size={28} color={themeColors.primary} />
              )}
            </TouchableOpacity>
          )}
        </View>
        {showAttachmentMenu && (
          <AttachmentMenu
            visible={showAttachmentMenu}
            onClose={() => setShowAttachmentMenu(false)}
            onSelectOption={(optionId) => {
              setShowAttachmentMenu(false);
              handleAttachmentSelect(optionId);
            }}
            themeColors={themeColors}
          />
        )}
      </KeyboardAvoidingView>
      <Modal
        visible={isRecordingVoice}
        transparent
        animationType="slide"
        onRequestClose={() => setIsRecordingVoice(false)}
      >
        <View style={styles.voiceModalOverlay}>
          <View style={[styles.voiceModalContent, { backgroundColor: themeColors.surface }]}>
            <VoiceRecorder
              onRecordingComplete={handleSendVoiceNote}
              onCancel={() => setIsRecordingVoice(false)}
              themeColors={themeColors}
              accentColor={themeColors.primary}
            />
          </View>
        </View>
      </Modal>
      <StickerPicker
        visible={showStickerPicker}
        onClose={() => setShowStickerPicker(false)}
        onSelectSticker={handleSendSticker}
        themeColors={themeColors}
      />
      <GifPicker
        visible={showGifPicker}
        onClose={() => setShowGifPicker(false)}
        onSelectGif={handleSendGif}
        themeColors={themeColors}
      />
      <MessageActionSheet
        visible={!!actionSheetMessage}
        onClose={closeActionSheet}
        message={actionSheetMessage}
        currentUserId={user?.uid}
        themeColors={themeColors}
        onSelectReaction={handleSelectReactionFromSheet}
        onSelectAction={handleSelectActionFromSheet}
        isDarkMode={isDarkMode}
      />
    </ScreenLayout>
  );
}

function formatTimestamp(value) {
  if (!value) return '';
  try {
    let date;
    if (typeof value === 'number') {
      date = new Date(value);
    } else if (value?.toDate) {
      date = value.toDate();
    } else if (typeof value?.seconds === 'number') {
      date = new Date(value.seconds * 1000);
    } else {
      date = new Date(value);
    }
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
      return '';
    }
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1
  },
  list: {
    flex: 1
  },
  listContent: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    gap: 8
  },
  messageRow: {
    flexDirection: 'row'
  },
  messageContainer: {
    maxWidth: '80%'
  },
  messageBubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16
  },
  messagePressable: {
    alignSelf: 'flex-start'
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '500'
  },
  stickerText: {
    fontSize: 64,
    lineHeight: 72
  },
  gifImage: {
    borderRadius: 12,
    marginVertical: 4
  },
  messageTime: {
    fontSize: 11,
    marginTop: 6
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 8
  },
  attachButton: {
    padding: 4,
    marginBottom: 4
  },
  inputContainer: {
    flex: 1,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 8,
    minHeight: 40,
    maxHeight: 120,
    justifyContent: 'center',
    borderWidth: 1
  },
  input: {
    fontSize: 15,
    lineHeight: 20,
    paddingVertical: 0
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4
  },
  micButton: {
    padding: 4,
    marginBottom: 4
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32
  },
  infoText: {
    fontSize: 16,
    textAlign: 'center'
  },
  voiceModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  voiceModalContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 20,
    padding: 20
  }
});
