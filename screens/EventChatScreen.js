/**
 * Event Chat Screen
 * Group chat for accepted event attendees
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Image,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScreenLayout from '../components/ScreenLayout';
import { useSettings } from '../contexts/SettingsContext';
import { useAuth } from '../contexts/AuthContext';
import {
  subscribeToMessages,
  sendMessage,
  removeParticipant,
  getEventChat,
  isParticipant,
} from '../services/eventChatService';

export default function EventChatScreen({ route, navigation }) {
  const { eventId, event } = route.params;
  const { themeColors, accentPreset, userProfile } = useSettings();
  const { user } = useAuth();

  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [chatInfo, setChatInfo] = useState(null);
  const [sending, setSending] = useState(false);
  const [isUserParticipant, setIsUserParticipant] = useState(false);
  const [checkingParticipant, setCheckingParticipant] = useState(true);

  const flatListRef = useRef(null);
  const primaryColor = accentPreset?.buttonBackground || themeColors.primary;

  // Subscribe to messages
  useEffect(() => {
    const unsubscribe = subscribeToMessages(eventId, (newMessages) => {
      setMessages(newMessages);

      // Auto scroll to bottom when new messages arrive
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [eventId]);

  // Load chat info and check participant status
  useEffect(() => {
    const loadChatInfo = async () => {
      try {
        const info = await getEventChat(eventId);
        setChatInfo(info);

        // Check if current user is a participant
        const participantStatus = await isParticipant(eventId, user.uid);
        setIsUserParticipant(participantStatus);
      } catch (error) {
        console.error('[EventChat] Error loading chat info:', error);
      } finally {
        setCheckingParticipant(false);
      }
    };

    loadChatInfo();
  }, [eventId, user.uid]);

  // Keyboard listeners - scroll to bottom when keyboard appears
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => {
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    );

    return () => {
      keyboardDidShowListener.remove();
    };
  }, []);

  const handleSend = async () => {
    if (!inputText.trim() || sending || !isUserParticipant) return;

    const messageText = inputText.trim();
    setInputText('');
    setSending(true);

    try {
      // Double-check participant status before sending
      const participantStatus = await isParticipant(eventId, user.uid);
      if (!participantStatus) {
        Alert.alert(
          'Not Authorized',
          'You must be accepted to the event before you can send messages.',
          [{ text: 'OK' }]
        );
        setInputText(messageText); // Restore message
        setIsUserParticipant(false);
        return;
      }

      await sendMessage(
        eventId,
        user.uid,
        userProfile?.displayName || 'Anonymous',
        userProfile?.photoURL || null,
        messageText
      );

      // Scroll to bottom after sending
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      console.error('[EventChat] Error sending message:', error);
      Alert.alert('Error', 'Failed to send message');
      setInputText(messageText); // Restore message on error
    } finally {
      setSending(false);
    }
  };

  const handleLeaveChat = () => {
    Alert.alert(
      'Leave Event',
      'Are you sure you want to leave this event? You will be removed from the chat and your attendance will be cancelled.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeParticipant(
                eventId,
                user.uid,
                userProfile?.displayName || 'Anonymous',
                'left'
              );

              Alert.alert('Left Event', 'You have left the event', [
                {
                  text: 'OK',
                  onPress: () => navigation.goBack(),
                },
              ]);
            } catch (error) {
              console.error('[EventChat] Error leaving chat:', error);
              Alert.alert('Error', 'Failed to leave event');
            }
          },
        },
      ]
    );
  };

  const renderMessage = ({ item }) => {
    const isSystemMessage = item.type === 'system';
    const isOwnMessage = item.userId === user?.uid && !isSystemMessage;
    const messageDate = item.timestamp
      ? new Date(item.timestamp?.seconds ? item.timestamp.seconds * 1000 : item.timestamp)
      : null;

    if (isSystemMessage) {
      return (
        <View style={styles.systemMessageContainer}>
          <View style={[styles.systemMessageBadge, { backgroundColor: themeColors.divider }]}>
            <Ionicons
              name={
                item.actionType === 'join'
                  ? 'enter-outline'
                  : 'exit-outline'
              }
              size={12}
              color={themeColors.textSecondary}
            />
            <Text style={[styles.systemMessageText, { color: themeColors.textSecondary }]}>
              {item.message}
            </Text>
          </View>
        </View>
      );
    }

    return (
      <View style={[
        styles.messageContainer,
        isOwnMessage ? styles.ownMessageContainer : styles.otherMessageContainer,
      ]}>
        {!isOwnMessage && (
          <View style={styles.messageHeader}>
            {item.userPhoto ? (
              <Image source={{ uri: item.userPhoto }} style={styles.messageAvatar} />
            ) : (
              <View style={[styles.messageAvatarPlaceholder, { backgroundColor: primaryColor }]}>
                <Ionicons name="person" size={14} color="#fff" />
              </View>
            )}
            <Text style={[styles.messageSender, { color: themeColors.textSecondary }]}>
              {item.userName}
            </Text>
          </View>
        )}

        <View style={[
          styles.messageBubble,
          {
            backgroundColor: isOwnMessage ? primaryColor : themeColors.card,
            borderColor: isOwnMessage ? 'transparent' : themeColors.divider,
          },
        ]}>
          <Text style={[
            styles.messageText,
            { color: isOwnMessage ? '#fff' : themeColors.textPrimary },
          ]}>
            {item.message}
          </Text>

          {messageDate && (
            <Text style={[
              styles.messageTime,
              { color: isOwnMessage ? '#ffffff80' : themeColors.textTertiary },
            ]}>
              {messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          )}
        </View>
      </View>
    );
  };

  return (
    <ScreenLayout
      navigation={navigation}
      title={event.title}
      onBack={() => navigation.goBack()}
      showFooter={false}
      showDrawerButton={false}
      rightIcon="exit-outline"
      onRightPress={event.organizerId !== user?.uid ? handleLeaveChat : undefined}
    >
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: themeColors.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 140 : 20}
      >
        {/* Event Info Banner */}
        <View style={[styles.eventBanner, { backgroundColor: themeColors.card, borderBottomColor: themeColors.divider }]}>
          <View style={styles.bannerContent}>
            <Ionicons name="people" size={18} color={primaryColor} />
            <Text style={[styles.bannerText, { color: themeColors.textSecondary }]}>
              {chatInfo?.participants?.length || 0} participant{chatInfo?.participants?.length !== 1 ? 's' : ''}
            </Text>
          </View>

          {event.date && (
            <View style={styles.bannerContent}>
              <Ionicons name="calendar" size={18} color={primaryColor} />
              <Text style={[styles.bannerText, { color: themeColors.textSecondary }]}>
                {event.date}
              </Text>
            </View>
          )}
        </View>

        {/* Messages List */}
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messagesContent}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          ListEmptyComponent={
            <View style={styles.emptyState}>
              {!isUserParticipant ? (
                <>
                  <Ionicons name="lock-closed-outline" size={64} color={themeColors.textTertiary} />
                  <Text style={[styles.emptyTitle, { color: themeColors.textPrimary }]}>
                    Waiting for Approval
                  </Text>
                  <Text style={[styles.emptySubtitle, { color: themeColors.textSecondary }]}>
                    The organizer needs to accept your attendance request before you can join the chat
                  </Text>
                </>
              ) : (
                <>
                  <Ionicons name="chatbubbles-outline" size={64} color={themeColors.textTertiary} />
                  <Text style={[styles.emptyTitle, { color: themeColors.textPrimary }]}>
                    Start the Conversation
                  </Text>
                  <Text style={[styles.emptySubtitle, { color: themeColors.textSecondary }]}>
                    Send a message to connect with other attendees
                  </Text>
                </>
              )}
            </View>
          }
        />

        {/* Message Input */}
        <View style={[styles.inputContainer, { backgroundColor: themeColors.card, borderTopColor: themeColors.divider }]}>
          {!isUserParticipant ? (
            <View style={styles.lockedInputContainer}>
              <Ionicons name="lock-closed" size={18} color={themeColors.textTertiary} />
              <Text style={[styles.lockedText, { color: themeColors.textSecondary }]}>
                You must be accepted to the event to send messages
              </Text>
            </View>
          ) : (
            <>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: themeColors.background,
                    color: themeColors.textPrimary,
                    borderColor: themeColors.divider,
                  },
                ]}
                placeholder="Type a message..."
                placeholderTextColor={themeColors.textTertiary}
                value={inputText}
                onChangeText={setInputText}
                multiline
                maxLength={500}
                returnKeyType="send"
                blurOnSubmit={false}
                onSubmitEditing={handleSend}
                enablesReturnKeyAutomatically
              />

              <TouchableOpacity
                style={[
                  styles.sendButton,
                  {
                    backgroundColor: inputText.trim() ? primaryColor : themeColors.divider,
                  },
                ]}
                onPress={handleSend}
                disabled={!inputText.trim() || sending}
                activeOpacity={0.8}
              >
                <Ionicons name="send" size={20} color={inputText.trim() ? '#fff' : themeColors.textTertiary} />
              </TouchableOpacity>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerButton: {
    padding: 8,
  },
  eventBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderBottomWidth: 1,
  },
  bannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  bannerText: {
    fontSize: 13,
    fontWeight: '500',
  },
  messagesContent: {
    padding: 16,
    flexGrow: 1,
  },
  messageContainer: {
    marginBottom: 16,
  },
  ownMessageContainer: {
    alignItems: 'flex-end',
  },
  otherMessageContainer: {
    alignItems: 'flex-start',
  },
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
    marginLeft: 4,
  },
  messageAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  messageAvatarPlaceholder: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageSender: {
    fontSize: 12,
    fontWeight: '600',
  },
  messageBubble: {
    maxWidth: '75%',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
    marginBottom: 4,
  },
  messageTime: {
    fontSize: 11,
    fontWeight: '500',
  },
  systemMessageContainer: {
    alignItems: 'center',
    marginBottom: 12,
  },
  systemMessageBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  systemMessageText: {
    fontSize: 12,
    fontWeight: '500',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    gap: 10,
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    fontSize: 15,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
  },
  lockedInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  lockedText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
