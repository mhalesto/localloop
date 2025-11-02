import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function PollDisplay({ poll, onVote, currentUserId, themeColors, accentColor }) {
  const isExpired = useMemo(() => poll.endsAt < Date.now(), [poll.endsAt]);
  const userVote = useMemo(() => {
    if (!currentUserId) return null;
    return poll.options.findIndex(opt => opt.voters?.includes(currentUserId));
  }, [poll.options, currentUserId]);
  const hasVoted = userVote !== -1;

  const handleVote = (optionIndex) => {
    if (isExpired || !currentUserId) return;
    onVote(optionIndex);
  };

  const getTimeRemaining = () => {
    if (isExpired) return 'Poll ended';
    const remaining = poll.endsAt - Date.now();
    const hours = Math.floor(remaining / (1000 * 60 * 60));
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days}d left`;
    }
    if (hours > 0) return `${hours}h left`;
    const minutes = Math.floor(remaining / (1000 * 60));
    return `${minutes}m left`;
  };

  const styles = createStyles(themeColors, accentColor);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="stats-chart" size={18} color={accentColor} />
        <Text style={styles.question}>{poll.question}</Text>
      </View>

      <View style={styles.optionsContainer}>
        {poll.options.map((option, index) => {
          const percentage = poll.totalVotes > 0
            ? Math.round((option.votes / poll.totalVotes) * 100)
            : 0;
          const isUserVote = index === userVote;

          return (
            <TouchableOpacity
              key={index}
              onPress={() => handleVote(index)}
              disabled={isExpired || hasVoted}
              style={[
                styles.optionButton,
                hasVoted && styles.optionButtonVoted,
                isUserVote && { borderColor: accentColor, borderWidth: 2 }
              ]}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.optionProgress,
                  {
                    width: `${hasVoted ? percentage : 0}%`,
                    backgroundColor: isUserVote ? accentColor : themeColors.border
                  }
                ]}
              />
              <View style={styles.optionContent}>
                <Text style={[
                  styles.optionText,
                  isUserVote && { fontWeight: '600', color: accentColor }
                ]}>
                  {option.text}
                </Text>
                {hasVoted && (
                  <View style={styles.optionStats}>
                    <Text style={[
                      styles.percentage,
                      isUserVote && { color: accentColor, fontWeight: '600' }
                    ]}>
                      {percentage}%
                    </Text>
                    <Text style={styles.votes}>
                      {option.votes} {option.votes === 1 ? 'vote' : 'votes'}
                    </Text>
                  </View>
                )}
              </View>
              {isUserVote && (
                <Ionicons
                  name="checkmark-circle"
                  size={20}
                  color={accentColor}
                  style={styles.checkmark}
                />
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.footer}>
        <Text style={styles.totalVotes}>
          {poll.totalVotes} {poll.totalVotes === 1 ? 'vote' : 'votes'}
        </Text>
        <Text style={[
          styles.timeRemaining,
          isExpired && styles.expired
        ]}>
          {getTimeRemaining()}
        </Text>
      </View>
    </View>
  );
}

function createStyles(themeColors, accentColor) {
  return StyleSheet.create({
    container: {
      padding: 12,
      backgroundColor: themeColors.surface,
      borderRadius: 12,
      marginTop: 8,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: 12,
      gap: 8,
    },
    question: {
      flex: 1,
      fontSize: 15,
      fontWeight: '600',
      color: themeColors.text,
    },
    optionsContainer: {
      gap: 8,
      marginBottom: 12,
    },
    optionButton: {
      position: 'relative',
      backgroundColor: themeColors.background,
      borderRadius: 8,
      overflow: 'hidden',
      minHeight: 44,
      justifyContent: 'center',
    },
    optionButtonVoted: {
      backgroundColor: 'transparent',
    },
    optionProgress: {
      position: 'absolute',
      left: 0,
      top: 0,
      bottom: 0,
      opacity: 0.2,
    },
    optionContent: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 12,
      paddingVertical: 10,
      zIndex: 1,
    },
    optionText: {
      flex: 1,
      fontSize: 14,
      color: themeColors.text,
    },
    optionStats: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    percentage: {
      fontSize: 15,
      fontWeight: '600',
      color: themeColors.text,
    },
    votes: {
      fontSize: 12,
      color: themeColors.textSecondary,
    },
    checkmark: {
      position: 'absolute',
      right: 12,
    },
    footer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingTop: 8,
      borderTopWidth: 1,
      borderTopColor: themeColors.border,
    },
    totalVotes: {
      fontSize: 13,
      color: themeColors.textSecondary,
    },
    timeRemaining: {
      fontSize: 13,
      color: accentColor,
      fontWeight: '500',
    },
    expired: {
      color: themeColors.textSecondary,
    },
  });
}
