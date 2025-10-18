import React from 'react';
import { Text, StyleSheet, TouchableOpacity, View } from 'react-native';
import { colors } from '../constants/colors';
import { useSettings } from '../contexts/SettingsContext';

export default function PostItem({ post, onPress }) {
  const { accentPreset } = useSettings();
  const badgeBackground = accentPreset.badgeBackground ?? colors.primaryLight;
  const badgeTextColor = accentPreset.badgeTextColor ?? '#fff';
  const linkColor = accentPreset.linkColor ?? colors.primaryDark;
  const metaColor = colors.textSecondary;

  const commentCount = post.comments?.length ?? 0;
  const commentLabel =
    commentCount === 1 ? '1 comment' : `${commentCount} comments`;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={styles.touchable}
    >
      <View style={styles.card}>
        <View style={[styles.badge, { backgroundColor: badgeBackground }]}>
          <Text style={[styles.badgeText, { color: badgeTextColor }]}>Anonymous</Text>
        </View>
        <Text style={styles.message}>{post.message}</Text>
        <View style={styles.metaRow}>
          <Text style={[styles.meta, { color: metaColor }]}>{commentLabel}</Text>
          <Text style={[styles.link, { color: linkColor }]}>View thread</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  touchable: {
    borderRadius: 6
  },
  card: {
    padding: 18,
    marginVertical: 6,
    marginHorizontal: 20,
    backgroundColor: colors.card,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    marginBottom: 12
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.3
  },
  message: {
    fontSize: 16,
    marginBottom: 16,
    color: colors.textPrimary
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  meta: {
    fontSize: 13,
    color: colors.textSecondary
  },
  link: {
    fontSize: 13,
    color: colors.primaryDark,
    fontWeight: '600'
  }
});
