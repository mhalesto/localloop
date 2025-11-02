import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { REACTION_EMOJIS } from './MessageReactions';

const ACTION_ITEMS = [
  { id: 'reply', label: 'Reply', icon: 'arrow-undo-outline' },
  { id: 'forward', label: 'Forward', icon: 'arrow-redo-outline' },
  { id: 'copy', label: 'Copy', icon: 'copy-outline' },
  { id: 'edit', label: 'Edit', icon: 'create-outline', ownerOnly: true },
  { id: 'info', label: 'Info', icon: 'information-circle-outline' },
  { id: 'star', label: 'Star', icon: 'star-outline' },
  { id: 'delete', label: 'Delete', icon: 'trash-outline', ownerOnly: true, destructive: true },
  { id: 'more', label: 'More', icon: 'ellipsis-horizontal' }
];

export default function MessageActionSheet({
  visible,
  onClose,
  message,
  currentUserId,
  themeColors,
  onSelectReaction,
  onSelectAction,
  isDarkMode = false
}) {
  if (!visible || !message) {
    return null;
  }

  const isOwner = message.senderId === currentUserId;
  const userReaction = message.reactions?.[currentUserId];

  const actionItems = ACTION_ITEMS.filter((item) => (item.ownerOnly ? isOwner : true));
  const sheetBackgroundColor = themeColors.surface ?? (isDarkMode ? 'rgba(28,22,56,0.96)' : '#ffffff');
  const sheetBorderColor = themeColors.border ?? (isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)');
  const previewBackground = themeColors.card ?? (isDarkMode ? 'rgba(20,16,40,0.9)' : '#fff');
  const reactionIdleBackground = themeColors.card ?? (isDarkMode ? 'rgba(255,255,255,0.08)' : '#f1ecff');
  const reactionIdleBorder = themeColors.border ?? (isDarkMode ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)');
  const actionIconBackground = themeColors.card ?? (isDarkMode ? 'rgba(255,255,255,0.06)' : '#f5f1ff');
  const actionBorderColor = sheetBorderColor;

  const previewText = (() => {
    if (message.isSticker) return 'Sticker';
    if (message.voiceNote) return 'Voice note';
    if (message.gif) return 'GIF';
    return message.text ?? '';
  })();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={styles.backdrop} />
        </TouchableWithoutFeedback>

        <View
          style={[
            styles.sheet,
            {
              backgroundColor: sheetBackgroundColor,
              borderColor: sheetBorderColor,
              shadowColor: isDarkMode ? '#000' : '#6C4DF4'
            }
          ]}
        >
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.reactionRow}
          >
            {REACTION_EMOJIS.map((emoji) => {
              const isActive = userReaction === emoji;
              return (
                <TouchableOpacity
                  key={emoji}
                  style={[
                    styles.reactionButton,
                    {
                      backgroundColor: isActive
                        ? (themeColors.primary ? `${themeColors.primary}20` : (isDarkMode ? 'rgba(255,255,255,0.18)' : 'rgba(108,77,244,0.16)'))
                        : reactionIdleBackground,
                      borderColor: isActive
                        ? themeColors.primary ?? (isDarkMode ? '#A899FF' : '#6C4DF4')
                        : reactionIdleBorder
                    }
                  ]}
                  activeOpacity={0.7}
                  onPress={() => onSelectReaction?.(emoji)}
                >
                  <Text style={styles.reactionText}>{emoji}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <View style={[styles.previewContainer, { backgroundColor: previewBackground, borderColor: actionBorderColor }]}>
            <Text style={[styles.previewLabel, { color: themeColors.textSecondary }]}>Message</Text>
            <Text style={[styles.previewText, { color: themeColors.textPrimary }]} numberOfLines={2}>
              {previewText || 'No content'}
            </Text>
          </View>

          <View style={[styles.actionsContainer, { borderColor: actionBorderColor }]}>
            {actionItems.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.actionRow}
                activeOpacity={0.7}
                onPress={() => onSelectAction?.(item.id)}
              >
                <View style={[
                  styles.actionIconWrapper,
                  {
                    backgroundColor: actionIconBackground,
                    borderColor: actionBorderColor
                  }
                ]}>
                  <Ionicons
                    name={item.icon}
                    size={20}
                    color={item.destructive ? '#ff4d4f' : themeColors.textPrimary}
                  />
                </View>
                <Text
                  style={[
                    styles.actionLabel,
                    { color: item.destructive ? '#ff4d4f' : themeColors.textPrimary }
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)'
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject
  },
  sheet: {
    marginHorizontal: 12,
    marginBottom: 32,
    borderRadius: 24,
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderWidth: 1,
    gap: 16,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 12
  },
  reactionRow: {
    paddingHorizontal: 12,
    gap: 12
  },
  reactionButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1
  },
  reactionText: {
    fontSize: 24
  },
  previewContainer: {
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1
  },
  previewLabel: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 4,
    fontWeight: '600'
  },
  previewText: {
    fontSize: 15,
    fontWeight: '500'
  },
  actionsContainer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: 'transparent'
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    gap: 12
  },
  actionIconWrapper: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1
  },
  actionLabel: {
    fontSize: 16,
    fontWeight: '500'
  }
});
