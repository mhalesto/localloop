import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function PollDisplay({
  poll,
  onVote,
  currentUserId,
  themeColors,
  accentColor,
  postAuthorId = null,
  voterProfiles = {}
}) {
  if (!poll) {
    return null;
  }
  const [showVoterModal, setShowVoterModal] = useState(false);
  const [selectedOptionIndex, setSelectedOptionIndex] = useState(null);
  const [resultsPreviewMode, setResultsPreviewMode] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  const options = useMemo(() => {
    if (!Array.isArray(poll?.options)) {
      return [];
    }
    return poll.options.filter(Boolean).map((option, index) => ({
      ...option,
      text: typeof option?.text === 'string' ? option.text : `Option ${index + 1}`,
      voters: Array.isArray(option?.voters) ? option.voters.filter(Boolean) : [],
      votes: typeof option?.votes === 'number' ? option.votes : (Array.isArray(option?.voters) ? option.voters.length : 0),
    }));
  }, [poll?.options]);

  const hasOptions = options.length > 0;

  const isExpired = useMemo(() => poll.endsAt < Date.now(), [poll.endsAt]);
  const userVote = useMemo(() => {
    if (!currentUserId) {
      return -1;
    }
    return options.findIndex((opt) => Array.isArray(opt.voters) && opt.voters.includes(currentUserId));
  }, [options, currentUserId]);
  const hasVoted = userVote >= 0;
  const canVote = Boolean(currentUserId) && !isExpired;
  const isCreator = useMemo(
    () => Boolean(currentUserId && postAuthorId && currentUserId === postAuthorId),
    [currentUserId, postAuthorId]
  );

  const { optionEntries, totalVotes } = useMemo(() => {
    if (!options.length) {
      return { optionEntries: [], totalVotes: 0 };
    }
    const fallbackTotal = options.reduce((sum, option) => sum + (option.votes || 0), 0);
    const nextTotal = typeof poll.totalVotes === 'number' ? poll.totalVotes : fallbackTotal;
    const entries = options.map((option, index) => {
      const votes = option.votes || 0;
      const percent = nextTotal > 0 ? Math.round((votes / nextTotal) * 100) : 0;
      const voters = Array.isArray(option.voters) ? option.voters : [];
      return {
        id: option.id || `${index}`,
        optionIndex: index,
        text: option.text?.trim?.() || `Option ${index + 1}`,
        votes,
        percent,
        voters,
        isUserVote: userVote === index
      };
    });
    return { optionEntries: entries, totalVotes: nextTotal };
  }, [poll.options, poll.totalVotes, userVote]);

  const defaultReveal = hasVoted || isExpired || isCreator;
  const shouldRevealResults = defaultReveal || resultsPreviewMode;
  const userVoteLabel = hasVoted
    ? optionEntries.find((entry) => entry.optionIndex === userVote)?.text
    : null;

  useEffect(() => {
    setResultsPreviewMode(false);
  }, [poll.question, poll.endsAt, poll.totalVotes]);

  useEffect(() => {
    if (defaultReveal && resultsPreviewMode) {
      setResultsPreviewMode(false);
    }
  }, [defaultReveal, resultsPreviewMode]);

  const leadingOption = useMemo(() => {
    if (!shouldRevealResults || !optionEntries.length || totalVotes === 0) {
      return null;
    }
    return optionEntries.reduce((leader, entry) => {
      if (!leader || entry.votes > leader.votes) {
        return entry;
      }
      return leader;
    }, null);
  }, [optionEntries, shouldRevealResults, totalVotes]);

  const handleVote = (optionIndex) => {
    if (!canVote || isExpired) {
      return;
    }
    if (userVote === optionIndex) {
      return;
    }
    onVote(optionIndex);
    if (!defaultReveal) {
      setResultsPreviewMode(false);
    }
  };

  const handleViewVoters = (optionIndex) => {
    setSelectedOptionIndex(optionIndex);
    setShowVoterModal(true);
  };

  const getVotersForOption = (optionIndex) => {
    const entry = optionEntries.find((option) => option.optionIndex === optionIndex);
    if (!entry || !entry.voters?.length) {
      return [];
    }

    return entry.voters.map((voterId) => {
      const profile = voterProfiles[voterId];
      return {
        id: voterId,
        name: profile?.nickname || profile?.name || 'Anonymous',
        avatarKey: profile?.avatarKey,
        isCurrentUser: voterId === currentUserId
      };
    });
  };

  const getTimeRemaining = () => {
    if (isExpired) {
      return 'Poll ended';
    }
    const remaining = poll.endsAt - Date.now();
    const hours = Math.floor(remaining / (1000 * 60 * 60));
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days}d left`;
    }
    if (hours > 0) {
      return `${hours}h left`;
    }
    const minutes = Math.max(1, Math.floor(remaining / (1000 * 60)));
    return `${minutes}m left`;
  };

  const detailOptions = useMemo(
    () => optionEntries.slice().sort((a, b) => (b.votes === a.votes ? b.percent - a.percent : b.votes - a.votes)),
    [optionEntries]
  );

  const styles = createStyles(themeColors, accentColor);
  const toolbarVisible =
    (!defaultReveal && canVote && totalVotes > 0) || (shouldRevealResults && totalVotes > 0);

  return (
    <View style={styles.wrapper}>
      <View style={[styles.card, { shadowColor: accentColor }]}>
        <View style={[styles.cardAccent, { backgroundColor: accentColor }]} />

        <View style={styles.header}>
          <Ionicons name="stats-chart" size={18} color={accentColor} />
          <View style={styles.headerTextContainer}>
            <Text style={styles.question}>{poll.question}</Text>
            <View style={styles.headerMeta}>
              <Text
                style={[
                  styles.metaText,
                  isExpired ? { color: themeColors.textSecondary } : { color: accentColor }
                ]}
              >
                {getTimeRemaining()}
              </Text>
              <View style={[styles.metaDot, { backgroundColor: themeColors.textSecondary }]} />
              <Text style={[styles.metaText, { color: themeColors.textSecondary }]}>
                {shouldRevealResults
                  ? `${totalVotes} vote${totalVotes === 1 ? '' : 's'}`
                  : canVote
                    ? totalVotes > 0
                      ? 'Vote to unlock results'
                      : 'Be first to vote'
                    : 'Results hidden'}
              </Text>
            </View>
          </View>
        </View>

        {(hasVoted || isCreator) && (
          <View style={styles.pillRow}>
            {hasVoted && userVoteLabel ? (
              <View style={[styles.statusPill, { backgroundColor: `${accentColor}18` }]}>
                <Ionicons name="checkmark-circle" size={14} color={accentColor} />
                <Text style={[styles.statusPillText, { color: accentColor }]}>
                  You voted for {userVoteLabel}
                </Text>
              </View>
            ) : null}
            {isCreator ? (
              <View style={[styles.statusPill, { backgroundColor: `${accentColor}12` }]}>
                <Ionicons name="bar-chart-outline" size={14} color={accentColor} />
                <Text style={[styles.statusPillText, { color: accentColor }]}>Your poll</Text>
              </View>
            ) : null}
          </View>
        )}

        {leadingOption ? (
          <View style={[styles.leadingRow, { borderColor: themeColors.border }]}>
            <Ionicons name="trophy-outline" size={14} color={accentColor} />
            <Text style={[styles.leadingText, { color: themeColors.text }]}>
              {leadingOption.text} is leading ({leadingOption.percent}%)
            </Text>
          </View>
        ) : null}

        {hasOptions ? (
          <View style={styles.optionsContainer}>
            {optionEntries.map((option) => (
              <TouchableOpacity
                key={option.id}
                onPress={() => handleVote(option.optionIndex)}
                disabled={!canVote}
                style={[
                  styles.optionButton,
                  shouldRevealResults && styles.optionButtonVoted,
                  option.isUserVote && { borderColor: accentColor, borderWidth: 2 },
                  !canVote && styles.optionButtonDisabled
                ]}
                activeOpacity={canVote ? 0.7 : 1}
              >
                <View
                  style={[
                    styles.optionProgress,
                    {
                      width: `${shouldRevealResults ? option.percent : 0}%`,
                      backgroundColor: option.isUserVote ? accentColor : themeColors.border
                    }
                  ]}
                />
                <View style={styles.optionContent}>
                  <View style={styles.optionTextContainer}>
                    <Text
                      style={[
                        styles.optionText,
                        option.isUserVote && { fontWeight: '600', color: accentColor }
                      ]}
                    >
                      {option.text}
                    </Text>
                    {isCreator && shouldRevealResults && option.votes > 0 && (
                      <TouchableOpacity
                        onPress={() => handleViewVoters(option.optionIndex)}
                        style={[styles.viewVotersButton, { backgroundColor: `${accentColor}15` }]}
                      >
                        <Ionicons name="people-outline" size={12} color={accentColor} />
                        <Text style={[styles.viewVotersText, { color: accentColor }]}>{option.votes}</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  {shouldRevealResults ? (
                    <View style={styles.optionStats}>
                      <Text
                        style={[
                          styles.percentage,
                          option.isUserVote && { color: accentColor, fontWeight: '600' }
                        ]}
                      >
                        {option.percent}%
                      </Text>
                      <Text style={styles.votes}>
                        {option.votes} {option.votes === 1 ? 'vote' : 'votes'}
                      </Text>
                    </View>
                  ) : (
                    canVote && (
                      <Text style={[styles.votePrompt, { color: themeColors.textSecondary }]}>Tap to vote</Text>
                    )
                  )}
                </View>
                {option.isUserVote && (
                  <Ionicons name="checkmark-circle" size={20} color={accentColor} style={styles.checkmark} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="alert-circle-outline" size={18} color={themeColors.textSecondary} />
            <Text style={[styles.emptyStateText, { color: themeColors.textSecondary }]}>
              Poll options are still loading.
            </Text>
          </View>
        )}

        <View style={styles.footer}>
          <Text style={styles.totalVotes}>
            {totalVotes} {totalVotes === 1 ? 'vote' : 'votes'}
          </Text>
          <Text style={[styles.timeRemaining, isExpired && styles.expired]}>{getTimeRemaining()}</Text>
        </View>

        {toolbarVisible && (
          <View style={styles.toolbar}>
            {!defaultReveal && canVote && totalVotes > 0 ? (
              <TouchableOpacity
                onPress={() => setResultsPreviewMode((prev) => !prev)}
                style={styles.toolbarButton}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={resultsPreviewMode ? 'eye-off-outline' : 'eye-outline'}
                  size={16}
                  color={accentColor}
                />
                <Text style={[styles.toolbarButtonText, { color: accentColor }]}>
                  {resultsPreviewMode ? 'Back to poll' : 'View results'}
                </Text>
              </TouchableOpacity>
            ) : null}
            {shouldRevealResults && totalVotes > 0 ? (
              <TouchableOpacity
                onPress={() => setShowDetailsModal(true)}
                style={styles.toolbarButton}
                activeOpacity={0.7}
              >
                <Ionicons name="list-circle-outline" size={16} color={accentColor} />
                <Text style={[styles.toolbarButtonText, { color: accentColor }]}>Detailed results</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        )}
      </View>

      <Modal
        visible={showVoterModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowVoterModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowVoterModal(false)}
        >
          <TouchableOpacity
            style={[styles.modalContent, { backgroundColor: themeColors.card }]}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: themeColors.text }]}>
                Voted for "{selectedOptionIndex !== null ? options[selectedOptionIndex]?.text : ''}"
              </Text>
              <TouchableOpacity onPress={() => setShowVoterModal(false)}>
                <Ionicons name="close" size={24} color={themeColors.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.voterList} showsVerticalScrollIndicator={false}>
              {selectedOptionIndex !== null && getVotersForOption(selectedOptionIndex).map((voter) => (
                <View key={voter.id} style={styles.voterItem}>
                  <View style={[styles.voterAvatar, { backgroundColor: accentColor }]}>
                    <Text style={styles.voterAvatarText}>{voter.name.charAt(0).toUpperCase()}</Text>
                  </View>
                  <Text style={[styles.voterName, { color: themeColors.text }]}>
                    {voter.name}
                    {voter.isCurrentUser && ' (You)'}
                  </Text>
                </View>
              ))}
              {selectedOptionIndex !== null && getVotersForOption(selectedOptionIndex).length === 0 && (
                <Text style={[styles.emptyText, { color: themeColors.textSecondary }]}>No votes yet</Text>
              )}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      <Modal
        visible={showDetailsModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDetailsModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowDetailsModal(false)}
        >
          <TouchableOpacity
            style={[styles.modalContent, { backgroundColor: themeColors.card }]}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: themeColors.text }]}>Poll results</Text>
              <TouchableOpacity onPress={() => setShowDetailsModal(false)}>
                <Ionicons name="close" size={24} color={themeColors.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.resultsList} showsVerticalScrollIndicator={false}>
              {detailOptions.map((entry) => (
                <View key={entry.id} style={styles.resultDetailItem}>
                  <View style={styles.resultDetailRow}>
                    <Text style={[styles.resultDetailTitle, { color: themeColors.text }]}>{entry.text}</Text>
                    <Text style={[styles.resultDetailPercent, { color: accentColor }]}>{entry.percent}%</Text>
                  </View>
                  <View style={styles.resultDetailMeta}>
                    <Text style={[styles.resultDetailVotes, { color: themeColors.textSecondary }]}>
                      {entry.votes} {entry.votes === 1 ? 'vote' : 'votes'}
                    </Text>
                    {entry.isUserVote ? (
                      <Text style={[styles.resultDetailBadge, { color: accentColor }]}>Your vote</Text>
                    ) : null}
                  </View>
                  <View style={styles.resultDetailBar}>
                    <View
                      style={[
                        styles.resultDetailProgress,
                        { width: `${entry.percent}%`, backgroundColor: accentColor }
                      ]}
                    />
                  </View>
                </View>
              ))}
              {!detailOptions.length ? (
                <Text style={[styles.emptyText, { color: themeColors.textSecondary }]}>No results yet</Text>
              ) : null}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

function createStyles(themeColors, accentColor) {
  const cardBackground = themeColors.card ?? themeColors.surface;
  return StyleSheet.create({
    wrapper: {
      marginTop: 8,
    },
    card: {
      padding: 16,
      borderRadius: 18,
      backgroundColor: cardBackground,
      borderWidth: 1,
      borderColor: `${accentColor}18`,
      shadowColor: accentColor,
      shadowOpacity: 0.16,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 10 },
      elevation: 5,
    },
    cardAccent: {
      height: 4,
      borderRadius: 999,
      opacity: 0.4,
      alignSelf: 'center',
      width: 72,
      marginBottom: 14,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
      marginBottom: 8
    },
    headerTextContainer: {
      flex: 1,
      gap: 4
    },
    headerMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6
    },
    metaText: {
      fontSize: 12,
      fontWeight: '500'
    },
    metaDot: {
      width: 4,
      height: 4,
      borderRadius: 2
    },
    question: {
      flex: 1,
      fontSize: 15,
      fontWeight: '600',
      color: themeColors.text
    },
    pillRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 8
    },
    statusPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 999
    },
    statusPillText: {
      fontSize: 12,
      fontWeight: '600'
    },
    leadingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      padding: 8,
      borderRadius: 8,
      borderWidth: 1,
      marginBottom: 8
    },
    leadingText: {
      flex: 1,
      fontSize: 13,
      fontWeight: '500'
    },
    optionsContainer: {
      gap: 8,
      marginBottom: 12
    },
    optionButton: {
      position: 'relative',
      backgroundColor: themeColors.background,
      borderRadius: 8,
      overflow: 'hidden',
      minHeight: 48,
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: themeColors.border
    },
    optionButtonDisabled: {
      opacity: 0.7
    },
    optionButtonVoted: {
      backgroundColor: 'transparent'
    },
    optionProgress: {
      position: 'absolute',
      left: 0,
      top: 0,
      bottom: 0,
      opacity: 0.2
    },
    optionContent: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 12,
      paddingVertical: 12,
      zIndex: 1
    },
    optionTextContainer: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8
    },
    optionText: {
      fontSize: 14,
      color: themeColors.text,
      flex: 1
    },
    emptyState: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      padding: 12,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: themeColors.border,
      backgroundColor: themeColors.background,
    },
    emptyStateText: {
      fontSize: 13,
    },
    votePrompt: {
      fontSize: 12,
      fontWeight: '500'
    },
    viewVotersButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12
    },
    viewVotersText: {
      fontSize: 11,
      fontWeight: '600'
    },
    optionStats: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8
    },
    percentage: {
      fontSize: 15,
      fontWeight: '600',
      color: themeColors.text
    },
    votes: {
      fontSize: 12,
      color: themeColors.textSecondary
    },
    checkmark: {
      position: 'absolute',
      right: 12
    },
    footer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingTop: 8,
      borderTopWidth: 1,
      borderTopColor: themeColors.border
    },
    totalVotes: {
      fontSize: 13,
      color: themeColors.textSecondary
    },
    timeRemaining: {
      fontSize: 13,
      color: accentColor,
      fontWeight: '500'
    },
    expired: {
      color: themeColors.textSecondary
    },
    toolbar: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 12,
      marginTop: 10
    },
    toolbarButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 6
    },
    toolbarButtonText: {
      fontSize: 13,
      fontWeight: '600'
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20
    },
    modalContent: {
      width: '100%',
      maxWidth: 420,
      maxHeight: '70%',
      borderRadius: 16,
      padding: 20
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16
    },
    modalTitle: {
      fontSize: 17,
      fontWeight: '600',
      flex: 1,
      marginRight: 12
    },
    voterList: {
      maxHeight: 320
    },
    voterItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: themeColors.border
    },
    voterAvatar: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12
    },
    voterAvatarText: {
      color: '#fff',
      fontSize: 14,
      fontWeight: '600'
    },
    voterName: {
      fontSize: 15,
      flex: 1
    },
    emptyText: {
      fontSize: 14,
      textAlign: 'center',
      paddingVertical: 20
    },
    resultsList: {
      maxHeight: 320
    },
    resultDetailItem: {
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: themeColors.border
    },
    resultDetailRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 4
    },
    resultDetailTitle: {
      fontSize: 15,
      fontWeight: '500',
      flex: 1,
      marginRight: 12
    },
    resultDetailPercent: {
      fontSize: 15,
      fontWeight: '600'
    },
    resultDetailMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 6
    },
    resultDetailVotes: {
      fontSize: 12
    },
    resultDetailBadge: {
      fontSize: 12,
      fontWeight: '600'
    },
    resultDetailBar: {
      height: 6,
      borderRadius: 999,
      backgroundColor: themeColors.border,
      overflow: 'hidden'
    },
    resultDetailProgress: {
      height: '100%'
    }
  });
}
