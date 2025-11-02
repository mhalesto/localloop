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
  Alert
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import ScreenLayout from '../components/ScreenLayout';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import { buildConversationId, sendDirectMessage, subscribeToMessages } from '../services/messagesService';
import VoiceRecorder from '../components/VoiceRecorder';
import VoiceNotePlayer from '../components/VoiceNotePlayer';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../api/firebaseClient';

export default function DirectMessageScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { user, profile: currentProfile } = useAuth();
  const { themeColors } = useSettings();
  const { userId: recipientId, username, displayName, profilePhoto } = route.params ?? {};

  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [uploadingVoice, setUploadingVoice] = useState(false);
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

  const renderMessage = ({ item }) => {
    const isMine = item.senderId === user?.uid;
    return (
      <View
        style={[
          styles.messageRow,
          { justifyContent: isMine ? 'flex-end' : 'flex-start' }
        ]}
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
          ) : (
            <Text style={[styles.messageText, { color: isMine ? '#fff' : themeColors.textPrimary }]}>
              {item.text}
            </Text>
          )}
          <Text style={[styles.messageTime, { color: isMine ? 'rgba(255,255,255,0.7)' : themeColors.textSecondary }]}>
            {formatTimestamp(item.createdAt)}
          </Text>
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
        <View style={[styles.inputRow, { borderTopColor: themeColors.divider, backgroundColor: themeColors.card }]}
        >
          <TouchableOpacity
            style={styles.micButton}
            onPress={() => setIsRecordingVoice(true)}
            disabled={uploadingVoice}
          >
            {uploadingVoice ? (
              <ActivityIndicator size="small" color={themeColors.primary} />
            ) : (
              <Ionicons name="mic" size={24} color={themeColors.primary} />
            )}
          </TouchableOpacity>
          <TextInput
            style={[styles.input, { color: themeColors.textPrimary }]}
            placeholder="Send a message"
            placeholderTextColor={themeColors.textSecondary}
            value={messageText}
            onChangeText={setMessageText}
            multiline
            maxLength={2000}
          />
          <TouchableOpacity
            style={[styles.sendButton, { backgroundColor: themeColors.primary, opacity: sending || !messageText.trim() ? 0.6 : 1 }]}
            onPress={handleSend}
            disabled={sending || !messageText.trim()}
            activeOpacity={0.7}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.sendButtonText}>Send</Text>
            )}
          </TouchableOpacity>
        </View>
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
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '500'
  },
  messageTime: {
    fontSize: 11,
    marginTop: 6
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 12
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    fontSize: 15
  },
  sendButton: {
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 10
  },
  sendButtonText: {
    color: '#fff',
    fontWeight: '600'
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
  micButton: {
    padding: 8
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
