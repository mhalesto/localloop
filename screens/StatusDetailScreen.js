import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import ScreenLayout from '../components/ScreenLayout';
import { useStatuses } from '../contexts/StatusesContext';
import { useSettings } from '../contexts/SettingsContext';
import { useAuth } from '../contexts/AuthContext';
import { analyzePostContent } from '../services/openai/moderationService';
import { buildDreamyAccent } from '../utils/dreamyPalette';

const MAX_CONTENT_WIDTH = 680;
const PAGE_GUTTER = 20;

const formatTimestamp = (ts) => {
  if (!ts) return '';
  try {
    const d = new Date(ts);
    return `${d.toLocaleDateString()} · ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  } catch {
    return '';
  }
};


export default function StatusDetailScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const { statusId } = route.params ?? {};

  const {
    statuses,
    ensureRepliesSubscription,
    getRepliesForStatus,
    addReply,
    toggleStatusReaction,
    reportStatus,
  } = useStatuses();
  const { themeColors, accentPreset } = useSettings();
  const { user } = useAuth();

  const [reply, setReply] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [error, setError] = useState('');

  const dreamyAccent = useMemo(
    () => buildDreamyAccent(accentPreset, themeColors),
    [accentPreset, themeColors]
  );

  const styles = useMemo(
    () => createStyles(themeColors, insets.bottom, dreamyAccent),
    [themeColors, insets.bottom, dreamyAccent]
  );

  const status = useMemo(
    () => statuses.find((s) => s.id === statusId),
    [statusId, statuses]
  );
  const replies = getRepliesForStatus(statusId);

  useEffect(() => {
    if (statusId) ensureRepliesSubscription(statusId);
  }, [ensureRepliesSubscription, statusId]);

  const handleReply = useCallback(async () => {
    const trimmed = reply.trim();
    if (!trimmed) {
      setError('Add a quick message.');
      return;
    }
    setSubmittingReply(true);
    try {
      // Moderation check
      console.log('[StatusDetail] Running moderation on reply...');
      const moderation = await analyzePostContent({ message: trimmed });
      console.log('[StatusDetail] Moderation result:', moderation.action);

      if (moderation.action === 'block') {
        setError('Your reply contains inappropriate content. Please revise and try again.');
        setSubmittingReply(false);
        return;
      }

      await addReply(statusId, trimmed);
      setReply('');
      setError('');
    } catch (e) {
      setError(e?.message ?? 'Unable to reply right now.');
    } finally {
      setSubmittingReply(false);
    }
  }, [addReply, reply, statusId]);

  const handleReact = useCallback(async () => {
    if (!statusId) return;
    await toggleStatusReaction(statusId, 'heart');
  }, [statusId, toggleStatusReaction]);

  const handleReport = useCallback(async () => {
    if (!statusId) return;
    setReporting(true);
    try {
      const result = await reportStatus(statusId, 'inappropriate');
      if (result?.ok && !result.alreadyReported) navigation.goBack?.();
    } catch (e) {
      setError(e?.message ?? 'Unable to report status right now.');
    } finally {
      setReporting(false);
    }
  }, [navigation, reportStatus, statusId]);

  if (!status) {
    return (
      <ScreenLayout
        title="Status"
        subtitle="This status is no longer available"
        navigation={navigation}
        onBack={() => navigation.goBack?.()}
        showFooter={false}
      >
        <View style={styles.centerFill}>
          <Ionicons name="cloud-offline" size={48} color={themeColors.textSecondary} />
          <Text style={styles.emptyTitle}>Whoops!</Text>
          <Text style={styles.emptyBody}>This status may have been removed or expired.</Text>
        </View>
      </ScreenLayout>
    );
  }

  const totalReactions = useMemo(
    () => Object.values(status.reactions ?? {}).reduce((s, e) => s + (e?.count ?? 0), 0),
    [status.reactions]
  );
  const locationSummary = useMemo(
    () => [status.city, status.province].filter(Boolean).join(', ') || 'Nearby',
    [status.city, status.province]
  );
  const viewerReactionKey = useMemo(
    () => (user?.uid ? user.uid : user?.email ? `client-${user.email}` : null),
    [user]
  );
  const viewerReacted = Boolean(viewerReactionKey && status.reactions?.heart?.reactors?.[viewerReactionKey]);
  const repliesEmpty = replies.length === 0;

  return (
    <ScreenLayout
      title="Status"
      subtitle="See what’s buzzing"
      navigation={navigation}
      onBack={() => navigation.goBack?.()}
      showFooter={false}
    >
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.select({ ios: 'padding', android: 'height' })}
        // push enough to clear the custom header on iOS
        keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 64 : 0}
      >
        <FlatList
          style={styles.flex}
          contentContainerStyle={styles.listContent}
          data={replies}
          keyExtractor={(item) => item.id}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            <View style={styles.constrain}>
              <LinearGradient
                colors={dreamyAccent.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.heroCard}
              >
                <View style={styles.heroHeaderRow}>
                  <View style={styles.heroAvatar}>
                    <Ionicons name="person" size={24} color="#fff" />
                  </View>
                  <View style={styles.authorTextBlock}>
                    <Text style={styles.authorName}>
                      {status.author?.nickname || status.author?.displayName || 'Anonymous'}
                    </Text>
                    <Text style={styles.heroSubtitle}>sharing from {locationSummary}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.heroGhostButton}
                    onPress={handleReport}
                    disabled={reporting}
                    activeOpacity={0.85}
                  >
                    {reporting ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Ionicons name="flag-outline" size={18} color="#fff" />
                    )}
                  </TouchableOpacity>
                </View>

                <View style={styles.heroChipRow}>
                  <View style={styles.heroChip}>
                    <Ionicons name="sparkles-outline" size={14} color="#fff" />
                    <Text style={styles.heroChipText}>Live mood</Text>
                  </View>
                  <View style={styles.heroChip}>
                    <Ionicons name="location-outline" size={14} color="#fff" />
                    <Text style={styles.heroChipText}>{locationSummary}</Text>
                  </View>
                  <View style={[styles.heroChip, styles.heroChipGhost]}>
                    <Ionicons name="time-outline" size={14} color="#fff" />
                    <Text style={styles.heroChipText}>{formatTimestamp(status.createdAt)}</Text>
                  </View>
                </View>

                {!!status.message && <Text style={styles.heroMessage}>{status.message}</Text>}

                {status.imageUrl ? (
                  <View style={styles.heroImageWrap}>
                    <Image source={{ uri: status.imageUrl }} style={styles.heroImage} resizeMode="cover" />
                  </View>
                ) : null}

                <View style={styles.heroStatsRow}>
                  <View style={styles.heroStat}>
                    <Text style={styles.heroStatValue}>{totalReactions}</Text>
                    <Text style={styles.heroStatLabel}>Hearts</Text>
                  </View>
                  <View style={styles.heroStat}>
                    <Text style={styles.heroStatValue}>{replies.length}</Text>
                    <Text style={styles.heroStatLabel}>Replies</Text>
                  </View>
                  <View style={styles.heroStat}>
                    <Text style={styles.heroStatValue}>✨</Text>
                    <Text style={styles.heroStatLabel}>{status.mood || 'Chill vibes'}</Text>
                  </View>
                </View>

                <View style={styles.heroControls}>
                  <TouchableOpacity
                    style={[styles.heroControlButton, viewerReacted && styles.heroControlButtonActive]}
                    onPress={handleReact}
                    activeOpacity={0.85}
                  >
                    <Ionicons
                      name={viewerReacted ? 'heart' : 'heart-outline'}
                      size={18}
                      color="#fff"
                    />
                    <Text style={styles.heroControlLabel}>{viewerReacted ? 'Loved' : 'Send love'}</Text>
                  </TouchableOpacity>

                  <View style={[styles.heroControlButton, styles.heroControlGhost]}>
                    <Ionicons name="chatbubble-ellipses-outline" size={18} color="#fff" />
                    <Text style={styles.heroControlLabel}>{replies.length} replies</Text>
                  </View>
                </View>
              </LinearGradient>

              {repliesEmpty ? (
                <View style={styles.emptyRepliesHero}>
                  <Ionicons name="chatbubbles-outline" size={22} color={themeColors.textSecondary} />
                  <View style={styles.emptyRepliesCopy}>
                    <Text style={styles.emptyRepliesTitle}>Start the conversation</Text>
                    <Text style={styles.emptyRepliesText}>
                      Drop the first reply and keep the vibes going 🌈
                    </Text>
                  </View>
                </View>
              ) : (
                <View style={styles.sectionHeading}>
                  <Text style={styles.sectionHeadingText}>Replies</Text>
                  <View style={styles.sectionDivider} />
                </View>
              )}
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.constrain}>
              <LinearGradient
                colors={dreamyAccent.softGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.replyCardGradient}
              >
                <View style={styles.replyCard}>
                  <View style={styles.replyHeader}>
                    <Ionicons name="person-circle" size={28} color={themeColors.textSecondary} />
                    <View style={styles.replyTextBlock}>
                      <Text style={styles.replyAuthor} numberOfLines={1}>
                        {item.author?.nickname || item.author?.displayName || 'Guest'}
                      </Text>
                      <Text style={styles.replyMeta}>{formatTimestamp(item.createdAt)}</Text>
                    </View>
                  </View>
                  <Text style={styles.replyMessage}>{item.message}</Text>
                </View>
              </LinearGradient>
            </View>
          )}
          // keep last item clear of the reply bar
          ListFooterComponent={<View style={{ height: 120 + insets.bottom }} />}
        />

        {/* FULL-WIDTH reply bar (escapes ScreenLayout padding via negative margins) */}
        <View style={[styles.replyBarContainer, { marginLeft: -PAGE_GUTTER, marginRight: -PAGE_GUTTER }]}>
          <View style={styles.replyPill}>
            <TextInput
              style={styles.replyInput}
              placeholder="Reply"
              placeholderTextColor={themeColors.textSecondary}
              value={reply}
              onChangeText={setReply}
              returnKeyType="send"
              onSubmitEditing={handleReply}
              editable={!submittingReply}
              multiline={false}
              selectionColor={themeColors.primary}
            />
            <TouchableOpacity
              style={styles.sendButton}
              onPress={handleReply}
              disabled={submittingReply}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={dreamyAccent.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.sendButtonGradient}
              >
                {submittingReply ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons name="send" size={18} color="#fff" />
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>

        {error ? (
          <View style={styles.errorToast}>
            <Ionicons name="alert-circle" size={16} color="#fff" />
            <Text style={styles.errorToastText}>{error}</Text>
          </View>
        ) : null}
      </KeyboardAvoidingView>
    </ScreenLayout>
  );
}

const createStyles = (palette, bottomInset, accent) =>
  StyleSheet.create({
    flex: { flex: 1 },
    listContent: {
      paddingHorizontal: 12,
      paddingTop: 20,
      paddingBottom: 20,
    },
    constrain: {
      width: '100%',
      alignSelf: 'center',
      maxWidth: MAX_CONTENT_WIDTH,
      gap: 16,
    },
    heroCard: {
      borderRadius: 30,
      padding: 24,
      marginBottom: 18,
      shadowColor: accent.glow,
      shadowOpacity: 0.45,
      shadowRadius: 24,
      shadowOffset: { width: 0, height: 24 },
      elevation: 6,
    },
    heroHeaderRow: { flexDirection: 'row', alignItems: 'center' },
    heroAvatar: {
      width: 52,
      height: 52,
      borderRadius: 26,
      backgroundColor: 'rgba(255,255,255,0.18)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    authorTextBlock: { flex: 1, marginLeft: 14 },
    authorName: { fontSize: 20, fontWeight: '700', color: '#fff' },
    heroSubtitle: { color: 'rgba(255,255,255,0.8)', fontSize: 13, marginTop: 4 },
    heroGhostButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.35)',
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: 12,
    },
    heroChipRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
      marginTop: 18,
    },
    heroChip: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 999,
      backgroundColor: 'rgba(255,255,255,0.14)',
    },
    heroChipGhost: {
      backgroundColor: 'rgba(0,0,0,0.25)',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.2)',
    },
    heroChipText: {
      marginLeft: 6,
      fontSize: 12,
      fontWeight: '600',
      color: '#fff',
    },
    heroMessage: {
      color: '#fff',
      fontSize: 18,
      fontWeight: '600',
      lineHeight: 27,
      marginTop: 16,
    },
    heroImageWrap: {
      marginTop: 18,
      borderRadius: 24,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.35)',
    },
    heroImage: { width: '100%', height: 240 },
    heroStatsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 22,
      gap: 12,
    },
    heroStat: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 18,
      backgroundColor: 'rgba(0,0,0,0.25)',
      alignItems: 'center',
    },
    heroStatValue: { color: '#fff', fontSize: 18, fontWeight: '700' },
    heroStatLabel: { color: 'rgba(255,255,255,0.75)', fontSize: 12, marginTop: 4 },
    heroControls: { flexDirection: 'row', gap: 12, marginTop: 20 },
    heroControlButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.35)',
      backgroundColor: 'rgba(0,0,0,0.15)',
    },
    heroControlButtonActive: {
      backgroundColor: 'rgba(0,0,0,0.35)',
      borderColor: 'transparent',
    },
    heroControlGhost: {
      backgroundColor: 'rgba(0,0,0,0.2)',
    },
    heroControlLabel: { color: '#fff', fontWeight: '600', marginLeft: 8 },
    emptyRepliesHero: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      borderRadius: 20,
      backgroundColor: palette.card,
      borderWidth: 1,
      borderColor: palette.divider,
    },
    emptyRepliesCopy: { marginLeft: 12, flex: 1 },
    emptyRepliesTitle: { fontSize: 16, fontWeight: '700', color: palette.textPrimary },
    emptyRepliesText: { fontSize: 13, color: palette.textSecondary, marginTop: 4, lineHeight: 20 },
    sectionHeading: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 6 },
    sectionHeadingText: { fontSize: 16, fontWeight: '700', color: palette.textPrimary },
    sectionDivider: { flex: 1, height: 1, backgroundColor: palette.divider, opacity: 0.6 },
    replyCardGradient: {
      borderRadius: 20,
      padding: 1,
      marginBottom: 14,
      shadowColor: accent.glow,
      shadowOpacity: 0.12,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 8 },
      elevation: 2,
    },
    replyCard: {
      backgroundColor: palette.card,
      borderRadius: 19,
      padding: 18,
      borderWidth: 1,
      borderColor: palette.divider,
    },
    replyHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
    replyTextBlock: { marginLeft: 12, flex: 1 },
    replyAuthor: { fontSize: 15, fontWeight: '600', color: palette.textPrimary },
    replyMeta: { fontSize: 12, color: palette.textSecondary, marginTop: 2 },
    replyMessage: { fontSize: 14, color: palette.textPrimary, lineHeight: 21 },
    replyBarContainer: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      paddingBottom: 12 + bottomInset,
      paddingTop: 10,
      backgroundColor: palette.background,
      borderTopWidth: 1,
      borderColor: palette.divider,
      paddingHorizontal: PAGE_GUTTER,
      shadowColor: '#000',
      shadowOpacity: 0.08,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: -6 },
    },
    replyPill: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: palette.card,
      borderRadius: 24,
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderWidth: 1,
      borderColor: palette.divider,
      width: '100%',
      alignSelf: 'stretch',
    },
    replyInput: {
      flex: 1,
      color: palette.textPrimary,
      fontSize: 14,
      marginRight: 12,
    },
    sendButton: { width: 44, height: 44 },
    sendButtonGradient: {
      flex: 1,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
    },

    // error toast
    errorToast: {
      position: 'absolute',
      bottom: (bottomInset || 0) + 72,
      left: 16,
      right: 16,
      backgroundColor: '#EF4444',
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    errorToastText: { color: '#fff', fontSize: 12, fontWeight: '600' },

    centerFill: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
    emptyTitle: { fontSize: 18, fontWeight: '700', color: palette.textPrimary, marginTop: 8 },
    emptyBody: { fontSize: 14, textAlign: 'center', color: palette.textSecondary, lineHeight: 20, marginTop: 6 },
  });
