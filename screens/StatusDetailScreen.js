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

import ScreenLayout from '../components/ScreenLayout';
import { useStatuses } from '../contexts/StatusesContext';
import { useSettings } from '../contexts/SettingsContext';
import { useAuth } from '../contexts/AuthContext';

const formatTimestamp = (timestamp) => {
  if (!timestamp) return '';
  try {
    const date = new Date(timestamp);
    return `${date.toLocaleDateString()} · ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  } catch (error) {
    return '';
  }
};

export default function StatusDetailScreen({ route, navigation }) {
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

  const styles = useMemo(() => createStyles(themeColors), [themeColors]);

  const status = useMemo(() => statuses.find((item) => item.id === statusId), [statusId, statuses]);
  const replies = getRepliesForStatus(statusId);

  useEffect(() => {
    if (statusId) {
      ensureRepliesSubscription(statusId);
    }
  }, [ensureRepliesSubscription, statusId]);

  const handleReply = useCallback(async () => {
    const trimmed = reply.trim();
    if (!trimmed) {
      setError('Add a quick message.');
      return;
    }
    setSubmittingReply(true);
    try {
      await addReply(statusId, trimmed);
      setReply('');
      setError('');
    } catch (submitError) {
      setError(submitError?.message ?? 'Unable to reply right now.');
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
      if (result?.ok && !result.alreadyReported) {
        navigation.goBack();
      }
    } catch (reportError) {
      setError(reportError?.message ?? 'Unable to report status right now.');
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
        <View style={styles.emptyState}>
          <Ionicons name="cloud-offline" size={48} color={themeColors.textSecondary} />
          <Text style={styles.emptyTitle}>Whoops!</Text>
          <Text style={styles.emptyBody}>This status may have been removed or expired.</Text>
        </View>
      </ScreenLayout>
    );
  }

  const totalReactions = useMemo(
    () =>
      Object.values(status.reactions ?? {}).reduce(
        (sum, entry) => sum + (entry?.count ?? 0),
        0
      ),
    [status.reactions]
  );
  const locationSummary = useMemo(
    () => [status.city, status.province].filter(Boolean).join(', ') || 'Nearby',
    [status.city, status.province]
  );
  const viewerReactionKey = useMemo(() => {
    if (user?.uid) return user.uid;
    if (user?.email) return `client-${user.email}`;
    return null;
  }, [user?.email, user?.uid]);
  const viewerReacted = Boolean(
    viewerReactionKey && status.reactions?.heart?.reactors?.[viewerReactionKey]
  );
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
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <FlatList
          style={styles.flex}
          contentContainerStyle={styles.content}
          data={replies}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={
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

              <Text style={styles.message}>{status.message}</Text>
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
          }
          renderItem={({ item }) => (
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
          )}
          ListFooterComponent={<View style={{ height: 160 }} />}
        />

        <View style={styles.composer}>
          <View style={styles.composerCard}>
            <Text style={styles.composerLabel}>Add a reply</Text>
            <TextInput
              style={styles.composerInput}
              placeholder="Share a quick thought or tip..."
              placeholderTextColor={themeColors.textSecondary}
              multiline
              value={reply}
              onChangeText={setReply}
            />
            {error ? (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle" size={16} color="#fff" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}
            <TouchableOpacity
              style={[styles.submitButton, submittingReply && styles.submitDisabled]}
              onPress={handleReply}
              disabled={submittingReply}
              activeOpacity={0.9}
            >
              {submittingReply ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitLabel}>Send reply</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </ScreenLayout>
  );
}

const createStyles = (palette) =>
  StyleSheet.create({
    flex: {
      flex: 1,
    },
    content: {
      padding: 20,
      paddingBottom: 40,
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
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 18,
    },
    authorTextBlock: {
      flex: 1,
      marginLeft: 14,
    },
    authorName: {
      fontSize: 18,
      fontWeight: '700',
      color: palette.textPrimary,
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 10,
    },
    metaChip: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 999,
      backgroundColor: palette.background,
      marginRight: 10,
    },
    metaChipGhost: {
      backgroundColor: palette.card,
      borderWidth: 1,
      borderColor: palette.divider,
      marginRight: 0,
    },
    metaChipText: {
      marginLeft: 6,
      fontSize: 12,
      color: palette.textSecondary,
    },
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
    message: {
      fontSize: 17,
      lineHeight: 26,
      color: palette.textPrimary,
    },
    image: {
      borderRadius: 18,
      marginTop: 20,
      width: '100%',
      height: 240,
    },
    footerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 22,
      justifyContent: 'space-between',
    },
    footerPill: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 999,
      backgroundColor: palette.background,
      marginRight: 12,
    },
    footerPillActive: {
      backgroundColor: palette.primary,
    },
    footerPillGhost: {
      backgroundColor: palette.background,
      marginRight: 0,
    },
    footerLabel: {
      marginLeft: 8,
      fontSize: 14,
      fontWeight: '600',
      color: palette.textSecondary,
    },
    footerLabelActive: {
      color: '#fff',
    },
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
    emptyRepliesText: {
      marginLeft: 10,
      fontSize: 13,
      color: palette.textSecondary,
      flex: 1,
    },
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
    replyHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 10,
    },
    replyTextBlock: {
      marginLeft: 12,
      flex: 1,
    },
    replyAuthor: {
      fontSize: 15,
      fontWeight: '600',
      color: palette.textPrimary,
    },
    replyMeta: {
      fontSize: 12,
      color: palette.textSecondary,
      marginTop: 2,
    },
    replyMessage: {
      fontSize: 14,
      color: palette.textPrimary,
      lineHeight: 21,
    },
    composer: {
      padding: 20,
      backgroundColor: palette.card,
      borderTopWidth: 1,
      borderColor: palette.divider,
    },
    composerCard: {
      backgroundColor: palette.background,
      borderRadius: 20,
      padding: 18,
      borderWidth: 1,
      borderColor: palette.divider,
    },
    composerLabel: {
      fontSize: 14,
      fontWeight: '700',
      color: palette.textPrimary,
      marginBottom: 12,
    },
    composerInput: {
      minHeight: 90,
      borderRadius: 16,
      backgroundColor: palette.card,
      padding: 14,
      fontSize: 14,
      lineHeight: 20,
      color: palette.textPrimary,
      textAlignVertical: 'top',
      borderWidth: 1,
      borderColor: palette.divider,
    },
    errorBanner: {
      marginTop: 12,
      backgroundColor: '#EF4444',
      borderRadius: 14,
      paddingVertical: 10,
      paddingHorizontal: 14,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    errorText: {
      color: '#fff',
      fontSize: 12,
      fontWeight: '600',
      marginLeft: 6,
    },
    submitButton: {
      marginTop: 16,
      borderRadius: 16,
      backgroundColor: palette.primary,
      paddingVertical: 14,
      alignItems: 'center',
      shadowColor: '#000',
      shadowOpacity: 0.08,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
      elevation: 3,
    },
    submitDisabled: {
      opacity: 0.7,
    },
    submitLabel: {
      color: '#fff',
      fontSize: 15,
      fontWeight: '700',
    },
    emptyState: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 32,
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: palette.textPrimary,
    },
    emptyBody: {
      fontSize: 14,
      textAlign: 'center',
      color: palette.textSecondary,
      lineHeight: 20,
      marginTop: 6,
    },
  });
