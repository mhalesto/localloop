import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Image,
  Pressable,
  useWindowDimensions,
  KeyboardAvoidingView,
  Platform,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';

import { useStatuses } from '../contexts/StatusesContext';
import { useSettings } from '../contexts/SettingsContext';
import { useAuth } from '../contexts/AuthContext';

const STORY_DURATION_MS = 6000;

// rough header height: progress (8) + header (48) + margins
const HEADER_TOUCH_EXCLUDE = 64;

const formatRelativeTime = (timestamp) => {
  if (!timestamp) return '';
  try {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
};

export default function StatusStoryViewerScreen({ route, navigation }) {
  const { themeColors } = useSettings(); // reserved for theming
  const { user } = useAuth();
  const {
    statuses,
    toggleStatusReaction,
    addReply,
    preloadStatuses,
  } = useStatuses();

  const insets = useSafeAreaInsets();
  const { width: winW, height: winH } = useWindowDimensions();

  const statusIds = route.params?.statusIds ?? [];
  const initialStatusId = route.params?.initialStatusId ?? null;
  const initialIndexParam = route.params?.initialIndex ?? 0;

  const storyItems = useMemo(() => {
    const mapped = statusIds
      .map((id) => statuses.find((status) => status.id === id))
      .filter(Boolean);
    if (mapped.length === 0 && initialStatusId) {
      const fallback = statuses.find((item) => item.id === initialStatusId);
      return fallback ? [fallback] : [];
    }
    return mapped;
  }, [statusIds, statuses, initialStatusId]);

  const derivedInitialIndex = useMemo(() => {
    const matchedIndex = storyItems.findIndex((status) => status.id === initialStatusId);
    if (matchedIndex >= 0) return matchedIndex;
    return Math.min(Math.max(initialIndexParam, 0), Math.max(storyItems.length - 1, 0));
  }, [storyItems, initialStatusId, initialIndexParam]);

  const [currentIndex, setCurrentIndex] = useState(derivedInitialIndex);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [reply, setReply] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [error, setError] = useState('');

  // uploaded image natural size
  const [imgNatural, setImgNatural] = useState({ w: 0, h: 0 });

  // ticker ref
  const progressRef = useRef(progress);
  useEffect(() => { progressRef.current = progress; }, [progress]);

  useEffect(() => { setCurrentIndex(derivedInitialIndex); }, [derivedInitialIndex]);

  const currentStatus = storyItems[currentIndex] ?? null;

  useEffect(() => {
    if (storyItems.length === 0) navigation.goBack?.();
  }, [storyItems.length, navigation]);

  useEffect(() => {
    preloadStatuses?.(storyItems.map((i) => i.id));
  }, [preloadStatuses, storyItems]);

  // natural image size lookup
  useEffect(() => {
    if (currentStatus?.imageUrl) {
      Image.getSize(
        currentStatus.imageUrl,
        (w, h) => setImgNatural({ w, h }),
        () => setImgNatural({ w: 0, h: 0 })
      );
    } else {
      setImgNatural({ w: 0, h: 0 });
    }
  }, [currentStatus?.imageUrl]);

  const viewerReactionKey = useMemo(() => {
    if (user?.uid) return user.uid;
    if (user?.email) return `client-${user.email}`;
    return null;
  }, [user?.email, user?.uid]);

  const viewerReacted = useMemo(() => {
    if (!viewerReactionKey || !currentStatus?.reactions?.heart?.reactors) return false;
    return Boolean(currentStatus.reactions.heart.reactors[viewerReactionKey]);
  }, [currentStatus?.reactions?.heart?.reactors, viewerReactionKey]);

  const handleExit = useCallback(() => {
    // schedule to avoid “set state during render” issues
    requestAnimationFrame(() => navigation.goBack?.());
  }, [navigation]);

  // boundary-safe next/prev (no setState callback that calls navigation)
  const handleNext = useCallback(() => {
    setProgress(0);
    if (currentIndex + 1 >= storyItems.length) {
      setIsPaused(true);
      handleExit();
      return;
    }
    setCurrentIndex(currentIndex + 1);
  }, [currentIndex, storyItems.length, handleExit]);

  const handlePrevious = useCallback(() => {
    setProgress(0);
    if (currentIndex <= 0) {
      setIsPaused(true);
      handleExit();
      return;
    }
    setCurrentIndex(currentIndex - 1);
  }, [currentIndex, handleExit]);

  // progress ticker
  useEffect(() => {
    if (!currentStatus || isPaused) return;
    let frame;
    const start = Date.now() - progressRef.current * STORY_DURATION_MS;
    const update = () => {
      const elapsed = Date.now() - start;
      const ratio = Math.min(1, elapsed / STORY_DURATION_MS);
      setProgress(ratio);
      if (ratio >= 1) handleNext();
      else frame = requestAnimationFrame(update);
    };
    frame = requestAnimationFrame(update);
    return () => { if (frame) cancelAnimationFrame(frame); };
  }, [currentStatus, isPaused, handleNext]);

  // reset between slides
  useEffect(() => {
    setProgress(0);
    setReply('');
    setError('');
  }, [currentIndex]);

  const handleToggleReaction = useCallback(async () => {
    if (!currentStatus) return;
    await toggleStatusReaction(currentStatus.id, 'heart');
  }, [currentStatus, toggleStatusReaction]);

  const handleShare = useCallback(async () => {
    if (!currentStatus) return;
    try {
      const payload = currentStatus.message ? `${currentStatus.message}\n` : '';
      await Share.share({
        message: `${payload}Shared via Toilet`,
        url: currentStatus.imageUrl ?? undefined,
      });
    } catch (err) {
      console.warn('[StatusStoryViewer] share failed', err);
    }
  }, [currentStatus]);

  const handleSendReply = useCallback(async () => {
    if (!currentStatus) return;
    const trimmed = reply.trim();
    if (!trimmed) {
      setError('Say something before sending.');
      return;
    }
    setSendingReply(true);
    try {
      await addReply(currentStatus.id, trimmed);
      setReply('');
      setError('');
    } catch (e) {
      setError(e?.message ?? 'Unable to send reply right now.');
    } finally {
      setSendingReply(false);
    }
  }, [addReply, currentStatus, reply]);

  const handleInputFocus = useCallback(() => setIsPaused(true), []);
  const handleInputBlur = useCallback(() => setIsPaused(false), []);

  // --- tap & hold controls ---
  const didLongPressRef = useRef(false);
  const onZonePressIn = useCallback(() => {
    didLongPressRef.current = false;
    setIsPaused(true);
  }, []);
  const onZoneLongPress = useCallback(() => {
    didLongPressRef.current = true; // prevent navigation on release
  }, []);
  const onZonePressOut = useCallback(() => {
    setIsPaused(false);
  }, []);
  const onLeftTap = useCallback(() => {
    if (didLongPressRef.current) { didLongPressRef.current = false; return; }
    handlePrevious();
  }, [handlePrevious]);
  const onRightTap = useCallback(() => {
    if (didLongPressRef.current) { didLongPressRef.current = false; return; }
    handleNext();
  }, [handleNext]);

  // compute displayed image size; never upscale beyond original
  const availableW = winW;
  const availableH = winH;
  let displayW = availableW;
  let displayH = availableH;
  if (imgNatural.w && imgNatural.h) {
    const scale = Math.min(1, availableW / imgNatural.w, availableH / imgNatural.h);
    displayW = Math.round(imgNatural.w * scale);
    displayH = Math.round(imgNatural.h * scale);
  }

  return (
    <View style={[styles.container, { backgroundColor: '#0F0B26' }]}>
      <StatusBar style="light" hidden />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Touch overlay ABOVE media, BELOW header/bottom */}
        <View
          style={[
            styles.touchOverlay,
            {
              top: insets.top + HEADER_TOUCH_EXCLUDE,
              bottom: 140 + insets.bottom,
            },
          ]}
          pointerEvents="box-none"
        >
          <Pressable
            style={styles.touchZone}
            onPress={onLeftTap}
            onPressIn={onZonePressIn}
            onPressOut={onZonePressOut}
            onLongPress={onZoneLongPress}
            delayLongPress={200}
          />
          <Pressable
            style={styles.touchZone}
            onPress={onRightTap}
            onPressIn={onZonePressIn}
            onPressOut={onZonePressOut}
            onLongPress={onZoneLongPress}
            delayLongPress={200}
          />
        </View>

        {/* Media layer: center image at natural size, never upscale */}
        {currentStatus?.imageUrl ? (
          <View style={styles.media}>
            <Image
              source={{ uri: currentStatus.imageUrl }}
              style={[styles.mediaImage, { width: displayW, height: displayH }]}
              resizeMode="contain"
            />
            <View style={styles.mediaOverlay} />
          </View>
        ) : (
          <View style={[styles.media, styles.mediaFallback]}>
            <Text style={styles.fallbackText}>{currentStatus?.message}</Text>
          </View>
        )}

        {/* UI chrome */}
        <View
          style={[
            styles.chromeOverlay,
            { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 16 },
          ]}
        >
          {/* progress bars */}
          <View style={styles.progressRow}>
            {storyItems.map((_, index) => {
              let fill = 0;
              if (index < currentIndex) fill = 1;
              else if (index === currentIndex) fill = progress;
              return (
                <View key={storyItems[index]?.id ?? `progress-${index}`} style={styles.progressTrack}>
                  <View style={styles.progressBackground} />
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${Math.min(Math.max(fill, 0), 1) * 100}%` },
                    ]}
                  />
                </View>
              );
            })}
          </View>

          {/* header */}
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={handleExit} style={styles.headerButton} activeOpacity={0.8}>
              <Ionicons name="chevron-back" size={22} color="#fff" />
            </TouchableOpacity>
            <View style={styles.headerMeta}>
              <Text style={styles.headerName} numberOfLines={1}>
                {currentStatus?.author?.nickname ||
                  currentStatus?.author?.displayName ||
                  'Anonymous'}
              </Text>
              <Text style={styles.headerTime}>
                {formatRelativeTime(currentStatus?.createdAt)}
              </Text>
            </View>
            <TouchableOpacity style={styles.headerButton} activeOpacity={0.8}>
              <Ionicons name="ellipsis-horizontal" size={20} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* spacer */}
          <View style={styles.bodyContent} />

          {/* caption above reply */}
          {!!currentStatus?.message && (
            <Text style={styles.captionBelow} numberOfLines={3}>
              {currentStatus.message}
            </Text>
          )}

          {/* bottom bar */}
          <View style={styles.bottomBar}>
            <View style={styles.replyContainer}>
              <TextInput
                style={styles.replyInput}
                placeholder="Reply"
                placeholderTextColor="rgba(255,255,255,0.6)"
                value={reply}
                onChangeText={setReply}
                onFocus={handleInputFocus}
                onBlur={handleInputBlur}
                editable={!sendingReply}
                multiline
              />
              <TouchableOpacity
                style={styles.sendButton}
                onPress={handleSendReply}
                disabled={sendingReply}
                activeOpacity={0.85}
              >
                <Ionicons name="send" size={18} color="#fff" />
              </TouchableOpacity>
            </View>

            <View style={styles.actionButtons}>
              <TouchableOpacity style={styles.iconButton} onPress={handleShare} activeOpacity={0.85}>
                <Ionicons name="arrow-redo" size={22} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.iconButton, viewerReacted && styles.iconButtonActive]}
                onPress={handleToggleReaction}
                activeOpacity={0.85}
              >
                <Ionicons
                  name={viewerReacted ? 'heart' : 'heart-outline'}
                  size={22}
                  color={viewerReacted ? '#F87171' : '#fff'}
                />
              </TouchableOpacity>
            </View>
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },

  // Media container centers image
  media: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaImage: {
    // width/height supplied dynamically
  },
  mediaOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15,15,35,0.25)',
  },

  mediaFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  fallbackText: {
    textAlign: 'center',
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 34,
  },

  chromeOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-start',
    paddingHorizontal: 20,
    zIndex: 3,
  },

  progressRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 8,
  },
  progressTrack: {
    flex: 1,
    height: 4,
    borderRadius: 3,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  progressBackground: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  progressFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    height: '100%',
    backgroundColor: '#fff',
  },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerButton: { padding: 6 },
  headerMeta: { flex: 1, marginHorizontal: 12 },
  headerName: { color: '#fff', fontSize: 16, fontWeight: '700' },
  headerTime: { marginTop: 2, color: 'rgba(255,255,255,0.7)', fontSize: 12 },

  // Spacer to push bottom content down
  bodyContent: { flex: 1, justifyContent: 'center' },

  // Caption line above reply
  captionBelow: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 26,
    marginBottom: 10,
  },

  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 12,
  },
  replyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15,15,35,0.65)',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flex: 1,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  replyInput: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
    marginRight: 12,
  },
  sendButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15,15,35,0.6)',
  },
  iconButtonActive: {
    backgroundColor: 'rgba(248,113,113,0.2)',
    borderColor: 'rgba(248,113,113,0.45)',
  },

  errorText: {
    color: '#F87171',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
  },

  // Tap zones for prev/next with hold-to-pause
  touchOverlay: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    zIndex: 4, // above media, below header/bottom (header buttons still work because we exclude its area via `top`)
  },
  touchZone: { flex: 1 },
});
