import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList
} from 'react-native';
import ScreenLayout from '../components/ScreenLayout';
import { colors } from '../constants/colors';
import { usePosts } from '../contexts/PostsContext';

const FILTERS = [
  { label: 'All', value: 'all' },
  { label: '24h', value: 1 },
  { label: '3d', value: 3 },
  { label: '7d', value: 7 },
  { label: '30d', value: 30 }
];

function formatRelativeTime(timestamp) {
  const diff = Date.now() - timestamp;
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diff < minute) {
    return 'Just now';
  }
  if (diff < hour) {
    const mins = Math.floor(diff / minute);
    return `${mins}m ago`;
  }
  if (diff < day) {
    const hrs = Math.floor(diff / hour);
    return `${hrs}h ago`;
  }
  const days = Math.floor(diff / day);
  return `${days}d ago`;
}

export default function MyCommentsScreen({ navigation }) {
  const { getAllPosts } = usePosts();
  const [filter, setFilter] = useState('all');

  const threads = useMemo(() => {
    const posts = getAllPosts();
    return posts
      .map((post) => {
        const myComments = post.comments?.filter((c) => c.createdByMe) ?? [];
        if (myComments.length === 0) {
          return null;
        }

        const lastComment = myComments.reduce((latest, comment) =>
          comment.createdAt > latest.createdAt ? comment : latest
        );

        return {
          ...post,
          myComments,
          lastComment
        };
      })
      .filter(Boolean)
      .sort(
        (a, b) => b.lastComment.createdAt - a.lastComment.createdAt
      );
  }, [getAllPosts]);

  const filteredThreads = useMemo(() => {
    if (filter === 'all') {
      return threads;
    }

    const days = Number(filter);
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;

    return threads.filter((thread) =>
      thread.myComments.some((comment) => comment.createdAt >= cutoff)
    );
  }, [threads, filter]);

  return (
    <ScreenLayout
      title="My Replies"
      subtitle="Threads you've joined"
      navigation={navigation}
      activeTab="myComments"
      showSearch={false}
    >
      <View style={styles.filterRow}>
        {FILTERS.map((item) => {
          const isActive = filter === item.value;
          return (
            <TouchableOpacity
              key={item.value}
              style={[styles.filterChip, isActive && styles.filterChipActive]}
              onPress={() => setFilter(item.value)}
              activeOpacity={0.85}
            >
              <Text
                style={[
                  styles.filterText,
                  isActive && styles.filterTextActive
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <FlatList
        data={filteredThreads}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            activeOpacity={0.85}
            onPress={() =>
              navigation.navigate('PostThread', {
                city: item.city,
                postId: item.id
              })
            }
          >
            <View style={styles.cardHeader}>
              <Text style={styles.cardBadge}>{item.city}</Text>
              <Text style={styles.cardMeta}>
                {item.myComments.length} {item.myComments.length === 1
                  ? 'reply'
                  : 'replies'}
              </Text>
            </View>
            <Text style={styles.cardTitle}>{item.message}</Text>
            <Text style={styles.cardSubtitle}>
              Last replied {formatRelativeTime(item.lastComment.createdAt)}
            </Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <Text style={styles.emptyState}>
            You haven&apos;t jumped into any threads yet. Reply to a post to
            see it here.
          </Text>
        }
        contentContainerStyle={[
          styles.listContent,
          filteredThreads.length === 0 && styles.listContentEmpty
        ]}
        showsVerticalScrollIndicator={false}
      />
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16
  },
  filterChip: {
    backgroundColor: colors.card,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 9,
    marginRight: 10,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2
  },
  filterChipActive: {
    backgroundColor: colors.primary
  },
  filterText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500'
  },
  filterTextActive: {
    color: '#fff'
  },
  listContent: {
    paddingBottom: 80
  },
  listContentEmpty: {
    flexGrow: 1,
    justifyContent: 'center'
  },
  emptyState: {
    textAlign: 'center',
    color: colors.textSecondary,
    fontSize: 15,
    paddingHorizontal: 20
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 18,
    padding: 20,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14
  },
  cardBadge: {
    backgroundColor: colors.primaryLight,
    color: '#fff',
    fontSize: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    fontWeight: '600'
  },
  cardMeta: {
    fontSize: 13,
    color: colors.textSecondary
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 10
  },
  cardSubtitle: {
    fontSize: 13,
    color: colors.textSecondary
  }
});
