import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Pressable } from 'react-native';

const REACTION_EMOJIS = ['❤️', '😂', '👍', '🔥', '😮', '😢', '🙏', '👏'];

export default function MessageReactions({
  messageId,
  reactions = {},
  currentUserId,
  onReact,
  themeColors
}) {
  const [showPicker, setShowPicker] = useState(false);

  const handleReact = (emoji) => {
    onReact(messageId, emoji);
    setShowPicker(false);
  };

  const handleRemoveReaction = (emoji) => {
    onReact(messageId, emoji, true); // true = remove
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
  const userReaction = reactions?.[currentUserId];

  return (
    <View style={styles.container}>
      {/* Display existing reactions */}
      {hasReactions && (
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
                      : themeColors.border,
                  }
                ]}
                onPress={() => isUserReaction ? handleRemoveReaction(emoji) : handleReact(emoji)}
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
      )}

      {/* Add reaction button */}
      <TouchableOpacity
        style={[styles.addReactionButton, { borderColor: themeColors.border }]}
        onPress={() => setShowPicker(true)}
        activeOpacity={0.7}
      >
        <Text style={styles.addReactionText}>+</Text>
      </TouchableOpacity>

      {/* Reaction picker modal */}
      <Modal
        visible={showPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPicker(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowPicker(false)}
        >
          <View style={[styles.pickerContainer, { backgroundColor: themeColors.surface }]}>
            <View style={styles.pickerGrid}>
              {REACTION_EMOJIS.map((emoji) => (
                <TouchableOpacity
                  key={emoji}
                  style={[
                    styles.emojiButton,
                    { backgroundColor: userReaction === emoji ? themeColors.primary + '30' : 'transparent' }
                  ]}
                  onPress={() => handleReact(emoji)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.emojiButtonText}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </Pressable>
      </Modal>
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
  },
  addReactionButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0.6,
  },
  addReactionText: {
    fontSize: 14,
    color: '#999',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerContainer: {
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  pickerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
    maxWidth: 280,
  },
  emojiButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emojiButtonText: {
    fontSize: 28,
  },
});
