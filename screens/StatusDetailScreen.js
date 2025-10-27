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

  const totalReactions = Object.values(status.reactions ?? {}).reduce(
    (sum, entry) => sum + (entry?.count ?? 0),
    0
  );

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
                <View style={styles.authorBlock}>
                  <Ionicons name="person-circle" size={36} color={themeColors.primaryDark} />
                  <View style={styles.authorTextBlock}>
                    <Text style={styles.authorName}>{status.author?.nickname || status.author?.displayName || 'Anonymous'}</Text>
                    <Text style={styles.meta}>{formatTimestamp(status.createdAt)}</Text>
                    <Text style={styles.meta} numberOfLines={1}>
                      {[status.city, status.province].filter(Boolean).join(', ') || 'Nearby'}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.inlineButton}
                  onPress={handleReport}
                  activeOpacity={0.85}
                  disabled={reporting}
                >
                  {reporting ? (
                    <ActivityIndicator size="small" color={themeColors.textSecondary} />
                  ) : (
                    <Ionicons name="flag-outline" size={18} color={themeColors.textSecondary} />
                  )}
                </TouchableOpacity>
              </View>

              <Text style={styles.message}>{status.message}</Text>
              {status.imageUrl ? (
                <Image source={{ uri: status.imageUrl }} style={styles.image} resizeMode="cover" />
              ) : null}

              <View style={styles.footerRow}>
                <TouchableOpacity style={styles.footerButton} onPress={handleReact} activeOpacity={0.8}>
                  <Ionicons name="heart-outline" size={18} color={themeColors.primaryDark} />
                  <Text style={styles.footerLabel}>{totalReactions}</Text>
                </TouchableOpacity>

                <View style={styles.footerButton}>
                  <Ionicons name="chatbubble-ellipses-outline" size={18} color={themeColors.textSecondary} />
                  <Text style={styles.footerLabel}>{replies.length}</Text>
                </View>
              </View>
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
          <TextInput
            style={styles.composerInput}
            placeholder="Reply to this status"
            placeholderTextColor={themeColors.textSecondary}
            multiline
            value={reply}
            onChangeText={setReply}
          />
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          <TouchableOpacity
            style={[styles.submitButton, submittingReply && styles.submitDisabled]}
            onPress={handleReply}
            disabled={submittingReply}
            activeOpacity={0.9}
          >
            {submittingReply ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitLabel}>Reply</Text>
            )}
          </TouchableOpacity>
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
      borderRadius: 20,
      padding: 20,
      borderWidth: 1,
      borderColor: palette.divider,
      marginBottom: 16,
    },
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    authorBlock: {
      flexDirection: 'row',
      flex: 1,
      alignItems: 'center',
    },
    authorTextBlock: {
      marginLeft: 12,
      flex: 1,
    },
    authorName: {
      fontSize: 16,
      fontWeight: '700',
      color: palette.textPrimary,
    },
    meta: {
      fontSize: 12,
      color: palette.textSecondary,
      marginTop: 2,
    },
    inlineButton: {
      padding: 6,
    },
    message: {
      fontSize: 16,
      lineHeight: 24,
      color: palette.textPrimary,
    },
    image: {
      borderRadius: 16,
      marginTop: 16,
      width: '100%',
      height: 220,
    },
    footerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 20,
    },
    footerButton: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    footerLabel: {
      marginLeft: 6,
      fontSize: 13,
      fontWeight: '600',
      color: palette.textPrimary,
    },
    replyCard: {
      backgroundColor: palette.card,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: palette.divider,
      marginBottom: 12,
    },
    replyHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
    },
    replyTextBlock: {
      marginLeft: 10,
    },
    replyAuthor: {
      fontSize: 14,
      fontWeight: '600',
      color: palette.textPrimary,
    },
    replyMeta: {
      fontSize: 12,
      color: palette.textSecondary,
    },
    replyMessage: {
      fontSize: 14,
      color: palette.textPrimary,
      lineHeight: 20,
    },
    composer: {
      padding: 20,
      backgroundColor: palette.card,
      borderTopWidth: 1,
      borderColor: palette.divider,
    },
    composerInput: {
      minHeight: 80,
      borderRadius: 16,
      backgroundColor: palette.background,
      padding: 14,
      fontSize: 14,
      lineHeight: 20,
      color: palette.textPrimary,
      textAlignVertical: 'top',
    },
    errorText: {
      marginTop: 8,
      color: '#ef4444',
      fontSize: 12,
    },
    submitButton: {
      marginTop: 12,
      borderRadius: 14,
      backgroundColor: palette.primary,
      paddingVertical: 12,
      alignItems: 'center',
    },
    submitDisabled: {
      opacity: 0.7,
    },
    submitLabel: {
      color: '#fff',
      fontSize: 14,
      fontWeight: '700',
    },
    emptyState: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
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
    },
  });
