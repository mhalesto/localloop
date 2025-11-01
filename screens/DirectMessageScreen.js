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
  ActivityIndicator
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import ScreenLayout from '../components/ScreenLayout';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import { buildConversationId, sendDirectMessage, subscribeToMessages } from '../services/messagesService';

export default function DirectMessageScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { user, profile: currentProfile } = useAuth();
  const { themeColors } = useSettings();
  const { userId: recipientId, username, displayName, profilePhoto } = route.params ?? {};

  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
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

  const handleSend = useCallback(async () => {
    if (!conversationId || !user?.uid || !recipientId) {
      navigation.navigate('Settings');
      return;
    }
    if (!messageText.trim() || sending) {
      return;
    }
    setSending(true);
    try {
      await sendDirectMessage({
        conversationId,
        senderId: user.uid,
        recipientId,
        text: messageText
      });
      setMessageText('');
    } catch (error) {
      console.error('[DirectMessage] send failed', error);
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
          <Text style={[styles.messageText, { color: isMine ? '#fff' : themeColors.textPrimary }]}>
            {item.text}
          </Text>
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
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          style={styles.list}
          contentContainerStyle={styles.listContent}
          onContentSizeChange={() => listRef.current?.scrollToEnd?.({ animated: true })}
        />
        <View style={[styles.inputRow, { borderTopColor: themeColors.divider, backgroundColor: themeColors.card }]}
        >
          <TextInput
            style={[styles.input, { color: themeColors.textPrimary }]}
            placeholder="Send a message"
            placeholderTextColor={themeColors.textSecondary}
            value={messageText}
            onChangeText={setMessageText}
            multiline
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
  }
});
