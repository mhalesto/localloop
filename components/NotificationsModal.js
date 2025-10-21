import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  FlatList
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { stripRichFormatting } from '../utils/textFormatting';

const ICONS = {
  comment: 'chatbubble-ellipses-outline',
  like: 'heart-outline'
};

const ACTION_COPY = {
  comment: 'commented on',
  like: 'liked'
};

const formatRelativeTime = (timestamp) => {
  if (!timestamp) {
    return '';
  }

  const now = Date.now();
  const diff = Math.max(0, now - timestamp);
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diff < minute) {
    return 'Just now';
  }
  if (diff < hour) {
    const mins = Math.round(diff / minute);
    return `${mins} min${mins === 1 ? '' : 's'} ago`;
  }
  if (diff < day) {
    const hours = Math.round(diff / hour);
    return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  }
  const days = Math.round(diff / day);
  return `${days} day${days === 1 ? '' : 's'} ago`;
};

export default function NotificationsModal({
  visible,
  onClose,
  notifications = [],
  accent,
  themeColors,
  onSelectNotification
}) {
  const palette = themeColors ?? {};
  const sheetBackground = palette.card ?? '#ffffff';
  const textColor = palette.textPrimary ?? '#1F1845';
  const mutedText = palette.textSecondary ?? '#7A76A9';
  const accentColor = accent?.buttonBackground ?? palette.primary ?? '#6C4DF4';
  const iconForeground = accent?.buttonForeground ?? '#ffffff';

  const renderItem = ({ item }) => {
    const iconName = ICONS[item.type] ?? 'notifications-outline';
    const action = ACTION_COPY[item.type] ?? 'updated';
    const actor = item.actorName && String(item.actorName).trim().length > 0 ? item.actorName : 'Someone';
    const commentPreview = item.type === 'comment' ? stripRichFormatting(item.snippet ?? '') : '';
    const postLabel = item.postTitle && item.postTitle.trim().length > 0 ? item.postTitle.trim() : 'Untitled post';

    return (
      <TouchableOpacity
        style={[styles.notificationCard, { backgroundColor: sheetBackground }]}
        onPress={() => onSelectNotification?.(item)}
        activeOpacity={0.8}
      >
        <View style={[styles.notificationIcon, { backgroundColor: accentColor }]}
        >
          <Ionicons name={iconName} size={18} color={iconForeground} />
        </View>
        <View style={styles.notificationContent}>
          <Text style={[styles.notificationTitle, { color: textColor }]}>
            <Text style={styles.notificationActor}>{actor}</Text> {action} your followed post
          </Text>
          <Text style={[styles.notificationPost, { color: accentColor }]} numberOfLines={1}>
            {postLabel}
          </Text>
          {item.type === 'comment' && commentPreview ? (
            <Text style={[styles.notificationSnippet, { color: mutedText }]} numberOfLines={2}>
              “{commentPreview.trim()}”
            </Text>
          ) : null}
          <Text style={[styles.notificationMeta, { color: mutedText }]}>{formatRelativeTime(item.createdAt)}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={styles.backdrop} />
        </TouchableWithoutFeedback>

        <View style={styles.sheetContainer} pointerEvents="box-none">
          <View style={[styles.sheet, { backgroundColor: sheetBackground }]}
          >
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: textColor }]}>Notifications</Text>
              <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close" size={20} color={mutedText} />
              </TouchableOpacity>
            </View>

            <FlatList
              data={notifications}
              keyExtractor={(item) => item.id}
              renderItem={renderItem}
              contentContainerStyle={
                notifications.length === 0 ? styles.emptyListContent : styles.listContent
              }
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <Ionicons name="notifications-off" size={28} color={mutedText} />
                  <Text style={[styles.emptyTitle, { color: textColor }]}>No updates yet</Text>
                  <Text style={[styles.emptyBody, { color: mutedText }]}>
                    Turn on notifications from a post to see new likes and comments here.
                  </Text>
                </View>
              }
              showsVerticalScrollIndicator={false}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 11, 38, 0.45)',
    justifyContent: 'flex-end'
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject
  },
  sheetContainer: {
    flex: 1,
    justifyContent: 'flex-end'
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 32,
    maxHeight: '80%'
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '600'
  },
  listContent: {
    paddingBottom: 16
  },
  emptyListContent: {
    flexGrow: 1,
    paddingBottom: 32,
    justifyContent: 'center'
  },
  notificationCard: {
    flexDirection: 'row',
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2
  },
  notificationIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14
  },
  notificationContent: {
    flex: 1
  },
  notificationTitle: {
    fontSize: 15,
    marginBottom: 4
  },
  notificationActor: {
    fontWeight: '600'
  },
  notificationPost: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4
  },
  notificationSnippet: {
    fontSize: 13,
    marginBottom: 6
  },
  notificationMeta: {
    fontSize: 12
  },
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: 20
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12
  },
  emptyBody: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18
  }
});
