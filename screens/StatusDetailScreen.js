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
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import ScreenLayout from '../components/ScreenLayout';
import { useStatuses } from '../contexts/StatusesContext';
import { useSettings } from '../contexts/SettingsContext';
import { useAuth } from '../contexts/AuthContext';
import { analyzePostContent } from '../services/openai/moderationService';

const MAX_CONTENT_WIDTH = 680;
// This should match the horizontal padding that ScreenLayout gives its content.
// Adjust if your ScreenLayout uses a different padding value.
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
  const { themeColors } = useSettings();
  const { user } = useAuth();

  const [reply, setReply] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [error, setError] = useState('');

  const styles = useMemo(
    () => createStyles(themeColors, insets.bottom),
    [themeColors, insets.bottom]
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
              <View style={styles.card}>
                <View style={styles.headerRow}>
                  <Ionicons name="person-circle" size={48} color={themeColors.primaryDark} />
                  <View style={styles.authorTextBlock}>
                    <Text style={styles.authorName}>
                      {status.author?.nickname || status.author?.displayName || 'Anonymous'}
                    </Text>
                    <View style={styles.metaRow}>
                      <View style={styles.metaChip}>
                        <Ionicons name="location-outline" size={14} color={themeColors.textSecondary} />
                        <Text style={styles.metaChipText}>{locationSummary}</Text>
                      </View>
                      <View style={[styles.metaChip, styles.metaChipGhost]}>
                        <Ionicons name="time-outline" size={14} color={themeColors.textSecondary} />
                        <Text style={styles.metaChipText}>{formatTimestamp(status.createdAt)}</Text>
                      </View>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.reportButton}
                    onPress={handleReport}
                    activeOpacity={0.85}
                    disabled={reporting}
                  >
                    {reporting ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Ionicons name="flag-outline" size={18} color="#fff" />
                    )}
                  </TouchableOpacity>
                </View>

                {!!status.message && <Text style={styles.message}>{status.message}</Text>}

                {status.imageUrl ? (
                  <Image source={{ uri: status.imageUrl }} style={styles.image} resizeMode="cover" />
                ) : null}

                <View style={styles.footerRow}>
                  <TouchableOpacity
                    style={[styles.footerPill, viewerReacted && styles.footerPillActive]}
                    onPress={handleReact}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name={viewerReacted ? 'heart' : 'heart-outline'}
                      size={18}
                      color={viewerReacted ? '#fff' : themeColors.primaryDark}
                    />
                    <Text style={[styles.footerLabel, viewerReacted && styles.footerLabelActive]}>
                      {totalReactions}
                    </Text>
                  </TouchableOpacity>

                  <View style={[styles.footerPill, styles.footerPillGhost]}>
                    <Ionicons name="chatbubble-ellipses-outline" size={18} color={themeColors.textSecondary} />
                    <Text style={styles.footerLabel}>{replies.length}</Text>
                  </View>
                </View>

                {repliesEmpty ? (
                  <View style={styles.emptyReplies}>
                    <Ionicons name="chatbubbles-outline" size={22} color={themeColors.textSecondary} />
                    <Text style={styles.emptyRepliesText}>No replies yet. Start the conversation below.</Text>
                  </View>
                ) : null}
              </View>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.constrain}>
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
              {submittingReply ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="send" size={18} color="#fff" />
              )}
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

const createStyles = (palette, bottomInset) =>
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
    },

    card: {
      backgroundColor: palette.card,
      borderRadius: 24,
      padding: 22,
      borderWidth: 1,
      borderColor: palette.divider,
      marginBottom: 18,
      shadowColor: '#000',
      shadowOpacity: 0.06,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
      elevation: 3,
    },

    headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
    authorTextBlock: { flex: 1, marginLeft: 14 },
    authorName: { fontSize: 18, fontWeight: '700', color: palette.textPrimary },

    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 10,
      rowGap: 8,
      marginTop: 10,
    },
    metaChip: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 999,
      backgroundColor: palette.background,
    },
    metaChipGhost: { backgroundColor: palette.card, borderWidth: 1, borderColor: palette.divider },
    metaChipText: { marginLeft: 6, fontSize: 12, color: palette.textSecondary },

    reportButton: {
      marginLeft: 12,
      backgroundColor: palette.primary,
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 14,
      shadowColor: '#000',
      shadowOpacity: 0.08,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
      elevation: 2,
    },

    message: { fontSize: 17, lineHeight: 26, color: palette.textPrimary },
    image: { borderRadius: 18, marginTop: 20, width: '100%', height: 240 },

    footerRow: { flexDirection: 'row', alignItems: 'center', marginTop: 22, justifyContent: 'space-between' },
    footerPill: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 999,
      backgroundColor: palette.background,
      marginRight: 12,
    },
    footerPillActive: { backgroundColor: palette.primary },
    footerPillGhost: { backgroundColor: palette.background, marginRight: 0 },
    footerLabel: { marginLeft: 8, fontSize: 14, fontWeight: '600', color: palette.textSecondary },
    footerLabelActive: { color: '#fff' },

    emptyReplies: {
      marginTop: 18,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: palette.background,
      borderRadius: 16,
      paddingVertical: 12,
      paddingHorizontal: 14,
      borderWidth: 1,
      borderColor: palette.divider,
    },
    emptyRepliesText: { marginLeft: 10, fontSize: 13, color: palette.textSecondary, flex: 1 },

    replyCard: {
      backgroundColor: palette.card,
      borderRadius: 18,
      padding: 18,
      borderWidth: 1,
      borderColor: palette.divider,
      marginBottom: 12,
      shadowColor: '#000',
      shadowOpacity: 0.04,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 4 },
      elevation: 2,
    },
    replyHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
    replyTextBlock: { marginLeft: 12, flex: 1 },
    replyAuthor: { fontSize: 15, fontWeight: '600', color: palette.textPrimary },
    replyMeta: { fontSize: 12, color: palette.textSecondary, marginTop: 2 },
    replyMessage: { fontSize: 14, color: palette.textPrimary, lineHeight: 21 },

    // Full-screen width container; negative margins cancel ScreenLayout padding
    replyBarContainer: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      paddingBottom: 12 + bottomInset,
      paddingTop: 10,
      backgroundColor: palette.card,
      borderTopWidth: 1,
      borderColor: palette.divider,
      paddingHorizontal: PAGE_GUTTER,
    },
    replyPill: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#ffffff',
      borderRadius: 24,
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderWidth: 1,
      borderColor: 'rgba(0,0,0,0.08)',
      width: '100%',
      alignSelf: 'stretch',
    },
    replyInput: {
      flex: 1,
      color: palette.textPrimary,
      fontSize: 14,
      marginRight: 12,
    },
    sendButton: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: palette.primary,
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
