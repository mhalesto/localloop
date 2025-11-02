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
  Alert,
  Image,
  Keyboard,
  Pressable
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import ScreenLayout from '../components/ScreenLayout';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import { buildConversationId, sendDirectMessage, subscribeToMessages, addReaction } from '../services/messagesService';
import VoiceNotePlayer from '../components/VoiceNotePlayer';
import MessageReactions from '../components/MessageReactions';
import MessageActionSheet from '../components/MessageActionSheet';
import StickerPicker from '../components/StickerPicker';
import GifPicker from '../components/GifPicker';
import AttachmentMenu from '../components/AttachmentMenu';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../api/firebaseClient';
import * as Clipboard from 'expo-clipboard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const MAX_RECORDING_DURATION_MS = 60000;
const CANCEL_SWIPE_THRESHOLD = -90;
const LOCK_SWIPE_THRESHOLD = -80;

export default function DirectMessageScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { user, profile: currentProfile } = useAuth();
  const { themeColors, isDarkMode } = useSettings();
  const { userId: recipientId, username, displayName, profilePhoto } = route.params ?? {};
  const insets = useSafeAreaInsets();

  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const [uploadingVoice, setUploadingVoice] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingLocked, setRecordingLocked] = useState(false);
  const [recordingPaused, setRecordingPaused] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [slideOffset, setSlideOffset] = useState(0);
  const [willCancelRecording, setWillCancelRecording] = useState(false);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [showStickerPicker, setShowStickerPicker] = useState(false);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [actionSheetMessage, setActionSheetMessage] = useState(null);
  const listRef = useRef(null);
  const recordingRef = useRef(null);
  const recordingTimerRef = useRef(null);
  const recordingStartRef = useRef(null);
  const recordingAccumulatedRef = useRef(0);
  const micGestureOriginRef = useRef({ x: 0, y: 0 });
  const hasMicPermissionRef = useRef(false);
  const isFinalizingRecordingRef = useRef(false);
  // const keyboardOffset = Platform.OS === 'ios' ? insets.bottom + 12 : 0;
  const keyboardOffset = Platform.OS === 'ios' ? 90 + insets.bottom : 0;

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
    let mounted = true;
    Audio.requestPermissionsAsync()
      .then(({ status }) => {
        if (mounted && status === 'granted') {
          hasMicPermissionRef.current = true;
        }
      })
      .catch((error) => {
        console.warn('[DirectMessage] microphone permission request failed:', error);
      });

    return () => {
      mounted = false;
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
      if (recordingRef.current) {
        try {
          recordingRef.current.stopAndUnloadAsync();
        } catch (error) {
          console.warn('[DirectMessage] cleanup stop failed:', error);
        }
      }
      Audio.setAudioModeAsync({ allowsRecordingIOS: false }).catch(() => { });
    };
  }, []);

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
    if (isRecording || uploadingVoice) {
      return;
    }
    if (!showAttachmentMenu) {
      Keyboard.dismiss();
    }
    setShowAttachmentMenu(!showAttachmentMenu);
  }, [isRecording, showAttachmentMenu, uploadingVoice]);

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

  const clearRecordingTimer = useCallback(() => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
  }, []);

  const resetRecordingVisualState = useCallback(() => {
    setIsRecording(false);
    setRecordingLocked(false);
    setRecordingPaused(false);
    setRecordingDuration(0);
    setSlideOffset(0);
    setWillCancelRecording(false);
    recordingAccumulatedRef.current = 0;
  }, []);

  const releaseAudioResources = useCallback(async () => {
    try {
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
    } catch (error) {
      console.warn('[DirectMessage] Failed to reset audio mode:', error);
    }
  }, []);

  const cancelVoiceRecording = useCallback(async (withFeedback = true) => {
    const activeRecording = recordingRef.current;
    recordingRef.current = null;
    micGestureOriginRef.current = { x: 0, y: 0 };
    clearRecordingTimer();
    resetRecordingVisualState();
    if (withFeedback) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => { });
    }
    if (activeRecording) {
      try {
        await activeRecording.stopAndUnloadAsync();
      } catch (error) {
        console.warn('[DirectMessage] Failed to cancel recording:', error);
      }
    }
    await releaseAudioResources();
  }, [clearRecordingTimer, releaseAudioResources, resetRecordingVisualState]);

  const finalizeVoiceRecording = useCallback(async () => {
    if (isFinalizingRecordingRef.current) {
      return;
    }
    const activeRecording = recordingRef.current;
    if (!activeRecording) {
      resetRecordingVisualState();
      return;
    }
    isFinalizingRecordingRef.current = true;
    clearRecordingTimer();
    micGestureOriginRef.current = { x: 0, y: 0 };
    try {
      await activeRecording.stopAndUnloadAsync();
      if (recordingStartRef.current) {
        recordingAccumulatedRef.current += Date.now() - recordingStartRef.current;
      }
      const duration = recordingAccumulatedRef.current;
      recordingStartRef.current = null;
      recordingAccumulatedRef.current = 0;
      const uri = activeRecording.getURI();
      await releaseAudioResources();
      resetRecordingVisualState();
      if (!uri || duration < 600) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => { });
        Alert.alert('Recording too short', 'Hold the microphone a little longer to capture a voice note.');
        return;
      }
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => { });
      await handleSendVoiceNote({ uri, duration });
    } catch (error) {
      console.error('[DirectMessage] Failed to finalize recording:', error);
      Alert.alert('Error', 'Failed to save voice note');
      resetRecordingVisualState();
    } finally {
      recordingRef.current = null;
      isFinalizingRecordingRef.current = false;
    }
  }, [clearRecordingTimer, handleSendVoiceNote, releaseAudioResources, resetRecordingVisualState]);

  const restartRecordingTimer = useCallback(() => {
    clearRecordingTimer();
    recordingTimerRef.current = setInterval(() => {
      const elapsed =
        recordingAccumulatedRef.current +
        (recordingStartRef.current ? Date.now() - recordingStartRef.current : 0);
      setRecordingDuration(elapsed);
      if (elapsed >= MAX_RECORDING_DURATION_MS) {
        finalizeVoiceRecording();
      }
    }, 100);
  }, [clearRecordingTimer, finalizeVoiceRecording]);

  const startVoiceRecording = useCallback(async () => {
    if (uploadingVoice || recordingRef.current || isFinalizingRecordingRef.current) {
      return false;
    }
    if (!conversationId || !user?.uid || !recipientId) {
      Alert.alert('Sign in required', 'Sign in to send voice notes.');
      return false;
    }
    try {
      if (!hasMicPermissionRef.current) {
        const { status } = await Audio.requestPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission required', 'Microphone permission is required to record voice notes.');
          return false;
        }
        hasMicPermissionRef.current = true;
      }
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        staysActiveInBackground: false
      });
      const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      recordingRef.current = recording;
      recordingStartRef.current = Date.now();
      recordingAccumulatedRef.current = 0;
      setIsRecording(true);
      setRecordingLocked(false);
      setRecordingPaused(false);
      setRecordingDuration(0);
      setSlideOffset(0);
      setWillCancelRecording(false);
      setShowAttachmentMenu(false);
      Keyboard.dismiss();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => { });
      restartRecordingTimer();
      return true;
    } catch (error) {
      console.error('[DirectMessage] Failed to start recording:', error);
      Alert.alert('Error', 'Failed to start recording');
      recordingRef.current = null;
      recordingStartRef.current = null;
      resetRecordingVisualState();
      await releaseAudioResources();
      return false;
    }
  }, [
    conversationId,
    finalizeVoiceRecording,
    restartRecordingTimer,
    releaseAudioResources,
    resetRecordingVisualState,
    setShowAttachmentMenu,
    uploadingVoice,
    user?.uid,
    recipientId
  ]);

  const handleMicResponderGrant = useCallback(
    async (event) => {
      if (uploadingVoice || recordingLocked || messageText.trim()) {
        return;
      }
      if (!conversationId || !user?.uid || !recipientId) {
        Alert.alert('Sign in required', 'Sign in to send voice notes.');
        return;
      }
      micGestureOriginRef.current = {
        x: event.nativeEvent.pageX,
        y: event.nativeEvent.pageY
      };
      const started = await startVoiceRecording();
      if (!started) {
        micGestureOriginRef.current = { x: 0, y: 0 };
      }
    },
    [conversationId, messageText, recipientId, recordingLocked, startVoiceRecording, uploadingVoice, user?.uid]
  );

  const handleMicResponderMove = useCallback(
    (event) => {
      if (!isRecording || recordingLocked || !recordingRef.current) {
        return;
      }
      const { pageX, pageY } = event.nativeEvent;
      const dx = pageX - micGestureOriginRef.current.x;
      const dy = pageY - micGestureOriginRef.current.y;
      const clampedDx = Math.max(-160, Math.min(0, dx));
      setSlideOffset(clampedDx);
      const shouldCancel = dx <= CANCEL_SWIPE_THRESHOLD;
      setWillCancelRecording(shouldCancel);
      if (!recordingLocked && dy <= LOCK_SWIPE_THRESHOLD) {
        setRecordingLocked(true);
        setRecordingPaused(false);
        setSlideOffset(0);
        setWillCancelRecording(false);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => { });
      }
    },
    [isRecording, recordingLocked]
  );

  const handleMicResponderEnd = useCallback(() => {
    if (!isRecording) {
      return;
    }
    if (recordingLocked) {
      return;
    }
    if (willCancelRecording) {
      cancelVoiceRecording();
    } else {
      finalizeVoiceRecording();
    }
  }, [cancelVoiceRecording, finalizeVoiceRecording, isRecording, recordingLocked, willCancelRecording]);

  const handleMicResponderTerminate = useCallback(() => {
    handleMicResponderEnd();
  }, [handleMicResponderEnd]);

  const toggleRecordingPause = useCallback(async () => {
    const activeRecording = recordingRef.current;
    if (!activeRecording || !recordingLocked) {
      return;
    }
    try {
      if (recordingPaused) {
        await activeRecording.startAsync();
        recordingStartRef.current = Date.now();
        setRecordingPaused(false);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => { });
        restartRecordingTimer();
      } else {
        await activeRecording.pauseAsync();
        if (recordingStartRef.current) {
          recordingAccumulatedRef.current += Date.now() - recordingStartRef.current;
        }
        recordingStartRef.current = null;
        setRecordingPaused(true);
        clearRecordingTimer();
        setRecordingDuration(recordingAccumulatedRef.current);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => { });
      }
    } catch (error) {
      console.error('[DirectMessage] Failed to toggle recording pause:', error);
    }
  }, [clearRecordingTimer, recordingLocked, recordingPaused, restartRecordingTimer]);

  const renderRecordingHud = () => {
    if (!isRecording) {
      return null;
    }
    const formattedDuration = formatDurationLabel(recordingDuration);
    const progress = Math.min(recordingDuration / MAX_RECORDING_DURATION_MS, 1);
    const rawPercent = Math.min(Math.max(progress, 0), 1) * 100;
    const clampedPercent = Math.min(Math.max(rawPercent, 0), 100);
    const fillPercent = Math.max(clampedPercent, 2);

    if (recordingLocked) {
      return (
        <View
          style={[
            styles.lockedRecordingContainer,
            {
              backgroundColor: themeColors.surface,
              borderColor: themeColors.border
            }
          ]}
        >
          <View style={styles.lockedProgressHeader}>
            <Text style={[styles.lockedTimer, { color: themeColors.textSecondary }]}>
              {formattedDuration}
            </Text>
            <View style={[styles.lockedProgressBar, { backgroundColor: themeColors.border }]}>
              <View
                style={[
                  styles.lockedProgressFill,
                  { width: `${fillPercent}%`, backgroundColor: themeColors.primary }
                ]}
              />
              <View
                style={[
                  styles.lockedProgressThumb,
                  {
                    left: `${clampedPercent}%`,
                    borderColor: themeColors.primary,
                    backgroundColor: themeColors.card
                  }
                ]}
              />
            </View>
          </View>
          <View style={styles.lockedControls}>
            <TouchableOpacity
              style={[
                styles.lockedTrashButton,
                {
                  borderColor: themeColors.border,
                  backgroundColor: themeColors.surface
                }
              ]}
              onPress={() => cancelVoiceRecording()}
              activeOpacity={0.8}
            >
              <Ionicons name="trash" size={20} color="#ff4d4f" />
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.lockedPauseButton,
                {
                  borderColor: recordingPaused ? themeColors.primary : themeColors.border,
                  backgroundColor: recordingPaused ? themeColors.primary : themeColors.card
                }
              ]}
              onPress={toggleRecordingPause}
              activeOpacity={0.85}
            >
              <Ionicons
                name={recordingPaused ? 'play' : 'pause'}
                size={20}
                color={recordingPaused ? '#fff' : themeColors.textPrimary}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.lockedSendButton, { backgroundColor: themeColors.primary }]}
              onPress={finalizeVoiceRecording}
              activeOpacity={0.85}
            >
              <Ionicons name="send" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.recordingPromptWrapper}>
        <Text style={styles.recordingTimerLabel}>{formattedDuration}</Text>
        <View
          style={[
            styles.slideToCancelBubble,
            {
              borderColor: willCancelRecording ? '#ff4d4f' : themeColors.border,
              backgroundColor: willCancelRecording ? 'rgba(255,77,79,0.18)' : themeColors.surface,
              transform: [{ translateX: Math.max(-140, Math.min(0, slideOffset)) }]
            }
          ]}
        >
          <Ionicons
            name="chevron-back"
            size={16}
            color={willCancelRecording ? '#ff4d4f' : themeColors.textSecondary}
          />
          <Text
            style={[
              styles.slideToCancelText,
              { color: willCancelRecording ? '#ff4d4f' : themeColors.textSecondary }
            ]}
          >
            Slide to cancel
          </Text>
        </View>
      </View>
    );
  };

  const renderLockHint = () => {
    if (!isRecording || recordingLocked) {
      return null;
    }
    return (
      <View
        pointerEvents="none"
        style={[
          styles.lockHintWrapper,
          {
            borderColor: themeColors.border,
            backgroundColor: themeColors.surface
          }
        ]}
      >
        <Ionicons name="arrow-up" size={16} color={themeColors.textSecondary} />
        <Ionicons name="lock-closed-outline" size={18} color={themeColors.textSecondary} />
      </View>
    );
  };

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
      contentStyle={{ paddingHorizontal: 0, paddingBottom: insets.bottom }}
    >
      <KeyboardAvoidingView
        style={styles.wrapper}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={keyboardOffset}
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
            style={[
              styles.attachButton,
              (isRecording || uploadingVoice) && styles.attachButtonDisabled,
              isRecording && styles.attachButtonHidden
            ]}
            onPress={handleAttachmentMenuToggle}
            disabled={isRecording || uploadingVoice}
            activeOpacity={0.8}
          >
            <Ionicons
              name={showAttachmentMenu ? 'close-circle' : 'add-circle'}
              size={28}
              color={themeColors.primary}
            />
          </TouchableOpacity>

          <View
            style={[
              styles.inputContainer,
              {
                backgroundColor: themeColors.surface,
                borderColor: themeColors.divider
              },
              isRecording && styles.recordingContainerActive
            ]}
          >
            {isRecording ? (
              renderRecordingHud()
            ) : (
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
            )}
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
          ) : recordingLocked ? (
            <View style={styles.micButtonPlaceholder} />
          ) : (
            <View
              style={[
                styles.micButton,
                {
                  borderColor: themeColors.divider,
                  backgroundColor: themeColors.surface
                },
                isRecording && styles.micButtonActive,
                uploadingVoice && styles.micButtonDisabled
              ]}
              onStartShouldSetResponder={() => !uploadingVoice && !recordingLocked}
              onResponderGrant={handleMicResponderGrant}
              onResponderMove={handleMicResponderMove}
              onResponderRelease={handleMicResponderEnd}
              onResponderTerminate={handleMicResponderTerminate}
            >
              {uploadingVoice ? (
                <ActivityIndicator size="small" color={themeColors.primary} />
              ) : (
                <Ionicons
                  name="mic"
                  size={24}
                  color={isRecording ? '#ff4d4f' : themeColors.primary}
                />
              )}
            </View>
          )}
          {renderLockHint()}
        </View>
        {showAttachmentMenu && !isRecording && (
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

function formatDurationLabel(ms) {
  const safeMs = Number.isFinite(ms) ? Math.max(0, ms) : 0;
  const totalSeconds = Math.floor(safeMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
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
    paddingBottom: 160,
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
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 8
  },
  attachButton: {
    padding: 4
  },
  attachButtonDisabled: {
    opacity: 0.4
  },
  attachButtonHidden: {
    opacity: 0
  },
  inputContainer: {
    flex: 1,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 6,
    minHeight: 48,
    maxHeight: 120,
    justifyContent: 'center',
    borderWidth: 1
  },
  recordingContainerActive: {
    paddingVertical: 10,
    minHeight: 60
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
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1
  },
  micButtonPlaceholder: {
    width: 44,
    height: 44
  },
  micButtonActive: {
    backgroundColor: 'rgba(255,77,79,0.12)',
    borderColor: '#ff4d4f'
  },
  micButtonDisabled: {
    opacity: 0.4
  },
  recordingPromptWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  recordingTimerLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ff4d4f',
    minWidth: 44
  },
  slideToCancelBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 24,
    borderWidth: 1,
    minWidth: 160
  },
  slideToCancelText: {
    fontSize: 14,
    fontWeight: '500'
  },
  lockedRecordingContainer: {
    width: '100%',
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 4
  },
  lockedProgressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  lockedTimer: {
    fontSize: 15,
    fontWeight: '600'
  },
  lockedProgressBar: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    position: 'relative'
  },
  lockedProgressFill: {
    height: '100%',
    borderRadius: 3
  },
  lockedProgressThumb: {
    position: 'absolute',
    top: -6,
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    marginLeft: -9
  },
  lockedControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    justifyContent: 'space-between'
  },
  lockedTrashButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  lockedPauseButton: {
    width: 52,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  lockedSendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center'
  },
  lockHintWrapper: {
    width: 44,
    height: 64,
    borderRadius: 22,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 3
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
