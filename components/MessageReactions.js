import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

export const REACTION_EMOJIS = ['❤️', '😂', '👍', '🔥', '😮', '😢', '🙏', '👏'];

export default function MessageReactions({
  messageId,
  reactions = {},
  currentUserId,
  onReact,
  themeColors
}) {
  const handleReact = (emoji, isUserReaction) => {
    onReact(messageId, emoji, isUserReaction);
  };

  // Group reactions by emoji
  const groupedReactions = {};
  Object.entries(reactions || {}).forEach(([userId, emoji]) => {
    if (!groupedReactions[emoji]) {
      groupedReactions[emoji] = [];
    }
    groupedReactions[emoji].push(userId);
  });

  const hasReactions = Object.keys(groupedReactions).length > 0;

  if (!hasReactions) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.reactionsContainer}>
        {Object.entries(groupedReactions).map(([emoji, userIds]) => {
          const isUserReaction = userIds.includes(currentUserId);
          return (
            <TouchableOpacity
              key={emoji}
              style={[
                styles.reactionBubble,
                {
                  backgroundColor: isUserReaction
                    ? themeColors.primary + '30'
                    : themeColors.card,
                  borderColor: isUserReaction
                    ? themeColors.primary
                    : themeColors.border
                }
              ]}
              onPress={() => handleReact(emoji, isUserReaction)}
              activeOpacity={0.7}
            >
              <Text style={styles.reactionEmoji}>{emoji}</Text>
              {userIds.length > 1 && (
                <Text style={[styles.reactionCount, { color: themeColors.textSecondary }]}>
                  {userIds.length}
                </Text>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
    flexWrap: 'wrap',
  },
  reactionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  reactionBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
  },
  reactionEmoji: {
    fontSize: 14,
  },
  reactionCount: {
    fontSize: 11,
    fontWeight: '600',
  }
});
