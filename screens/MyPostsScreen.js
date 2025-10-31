import React, { useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import ScreenLayout from '../components/ScreenLayout';
import { usePosts } from '../contexts/PostsContext';
import { useSettings } from '../contexts/SettingsContext';

const STATUS_META = {
  pending_review: {
    label: 'Pending review',
    description: 'We are reviewing this post before it becomes visible to everyone.',
    badgeColor: '#F7B733'
  },
  blocked: {
    label: 'Blocked',
    description: 'This post violates our community guidelines and will not be published.',
    badgeColor: '#D9534F'
  },
  approved: {
    label: 'Published',
    description: 'Live in the room for everyone to see.',
    badgeColor: '#4CAF50'
  }
};

const formatDate = (timestamp) => {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  return date.toLocaleString();
};

function Section({ title, items, emptyMessage, onOpenPost }) {
  const { themeColors } = useSettings();
  const styles = useMemo(() => createStyles(themeColors), [themeColors]);

  if (!items.length) {
    return emptyMessage ? (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>{emptyMessage}</Text>
        </View>
      </View>
    ) : null;
  }

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {items.map((post) => {
        const statusMeta = STATUS_META[post.moderationStatus] ?? STATUS_META.approved;
        return (
          <TouchableOpacity
            key={post.id}
            style={styles.postCard}
            activeOpacity={0.82}
            onPress={() => onOpenPost?.(post)}
            disabled={post.moderationStatus === 'pending_review' || post.moderationStatus === 'blocked'}
          >
            <View style={styles.postHeader}>
              <Text style={styles.postTitle} numberOfLines={2}>
                {post.title?.trim() || post.message?.trim() || 'Untitled post'}
              </Text>
              <View style={[styles.statusBadge, { backgroundColor: statusMeta.badgeColor }]}>
                <Text style={styles.statusText}>{statusMeta.label}</Text>
              </View>
            </View>
            <Text style={styles.metaText}>{post.city}</Text>
            {post.message ? (
              <Text style={styles.messageText} numberOfLines={3}>
                {post.message}
              </Text>
            ) : null}
            <Text style={styles.timestampText}>{formatDate(post.createdAt)}</Text>
            {statusMeta.description ? (
              <Text style={styles.statusDescription}>{statusMeta.description}</Text>
            ) : null}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default function MyPostsScreen() {
  const navigation = useNavigation();
  const { getMyPosts } = usePosts();
  const { themeColors } = useSettings();
  const styles = useMemo(() => createStyles(themeColors), [themeColors]);

  const posts = useMemo(() => getMyPosts(), [getMyPosts]);
  const pending = posts.filter((post) => post.moderationStatus === 'pending_review');
  const blocked = posts.filter((post) => post.moderationStatus === 'blocked');
  const published = posts.filter(
    (post) => post.moderationStatus !== 'pending_review' && post.moderationStatus !== 'blocked'
  );

  const handleOpenPost = (post) => {
    navigation.navigate('PostThread', { city: post.city, postId: post.id });
  };

  return (
    <ScreenLayout
      title="My Posts"
      subtitle="See what’s live and what’s still under review"
      navigation={navigation}
      activeTab="home"
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Section
          title="Pending review"
          items={pending}
          emptyMessage="No posts are waiting for review right now."
        />
        <Section
          title="Published"
          items={published}
          emptyMessage="You have not published any posts yet."
          onOpenPost={handleOpenPost}
        />
        <Section
          title="Blocked"
          items={blocked}
          emptyMessage="No posts are currently blocked."
        />
      </ScrollView>
    </ScreenLayout>
  );
}

const createStyles = (palette) =>
  StyleSheet.create({
    container: {
      flex: 1
    },
    content: {
      paddingHorizontal: 20,
      paddingVertical: 24,
      gap: 24
    },
    section: {
      gap: 16
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: palette.textPrimary
    },
    emptyCard: {
      padding: 20,
      borderRadius: 18,
      backgroundColor: palette.card,
      shadowColor: '#000',
      shadowOpacity: 0.1,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 6 },
      elevation: 4
    },
    emptyText: {
      color: palette.textSecondary,
      fontSize: 14
    },
    postCard: {
      padding: 20,
      borderRadius: 18,
      backgroundColor: palette.card,
      shadowColor: '#000',
      shadowOpacity: 0.12,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
      elevation: 4,
      gap: 8
    },
    postHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 12
    },
    postTitle: {
      flex: 1,
      fontSize: 16,
      fontWeight: '700',
      color: palette.textPrimary
    },
    statusBadge: {
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 4,
      alignSelf: 'flex-start'
    },
    statusText: {
      fontSize: 12,
      fontWeight: '700',
      color: '#fff'
    },
    metaText: {
      fontSize: 13,
      color: palette.textSecondary
    },
    messageText: {
      fontSize: 14,
      color: palette.textPrimary
    },
    timestampText: {
      fontSize: 12,
      color: palette.textSecondary
    },
    statusDescription: {
      fontSize: 13,
      color: palette.textSecondary
    }
  });
