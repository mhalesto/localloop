import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList
} from 'react-native';
import ScreenLayout from '../components/ScreenLayout';
import { useSettings } from '../contexts/SettingsContext';
import { usePosts } from '../contexts/PostsContext';
import RichText from '../components/RichText';

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
  const { getAllPosts, getUnreadCommentCount } = usePosts();
  const [filter, setFilter] = useState('all');
  const { themeColors, isDarkMode } = useSettings();
  const styles = useMemo(() => createStyles(themeColors, { isDarkMode }), [themeColors, isDarkMode]);

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

        const unreadCount = getUnreadCommentCount(post.city, post.id);

        return {
          ...post,
          myComments,
          lastComment,
          unreadCount
        };
      })
      .filter(Boolean)
      .sort(
        (a, b) => b.lastComment.createdAt - a.lastComment.createdAt
      );
  }, [getAllPosts, getUnreadCommentCount]);

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
        renderItem={({ item }) => {
          const trimmedTitle = item.title?.trim?.() ?? '';
          const trimmedDescription = item.message?.trim?.() ?? '';
          const displayTitle = trimmedTitle || trimmedDescription || 'Untitled post';
          const highlightFill = item.highlightDescription
            ? isDarkMode
              ? 'rgba(255,255,255,0.12)'
              : 'rgba(0,0,0,0.06)'
            : null;

          return (
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
                  {item.unreadCount > 0 ? (
                    <Text style={styles.cardMetaNew}> · {item.unreadCount} new</Text>
                  ) : null}
                </Text>
              </View>
              <Text
                style={[
                  styles.cardTitle,
                  !trimmedDescription && styles.cardTitleTight
                ]}
              >
                {displayTitle}
              </Text>
              {trimmedDescription && trimmedDescription !== displayTitle ? (
                <View
                  style={[
                    styles.cardDescriptionContainer,
                    highlightFill && [
                      styles.cardDescriptionHighlight,
                      { backgroundColor: highlightFill }
                    ]
                  ]}
                >
                  <RichText
                    text={trimmedDescription}
                    textStyle={styles.cardDescription}
                    linkStyle={{ color: themeColors.primaryDark }}
                  />
                </View>
              ) : null}
              <Text style={styles.cardSubtitle}>
                Last replied {formatRelativeTime(item.lastComment.createdAt)}
              </Text>
            </TouchableOpacity>
          );
        }}
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

const createStyles = (palette, { isDarkMode } = {}) =>
  StyleSheet.create({
    filterRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginBottom: 16
    },
    filterChip: {
      backgroundColor: palette.card,
      borderRadius: 20,
      paddingHorizontal: 16,
      paddingVertical: 9,
      marginRight: 10,
      marginBottom: 10,
      shadowColor: '#000',
      shadowOpacity: isDarkMode ? 0.16 : 0.04,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 4 },
      elevation: 2
    },
    filterChipActive: {
      backgroundColor: palette.primary
    },
    filterText: {
      fontSize: 13,
      color: palette.textSecondary,
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
      color: palette.textSecondary,
      fontSize: 15,
      paddingHorizontal: 20
    },
    card: {
      backgroundColor: palette.card,
      borderRadius: 18,
      padding: 20,
      marginBottom: 14,
      shadowColor: '#000',
      shadowOpacity: isDarkMode ? 0.2 : 0.06,
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
      backgroundColor: palette.primaryLight,
      color: '#fff',
      fontSize: 12,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 12,
      fontWeight: '600'
    },
    cardMeta: {
      fontSize: 13,
      color: palette.textSecondary
    },
    cardMetaNew: {
      color: palette.primary,
      fontWeight: '600'
    },
    cardTitle: {
      fontSize: 17,
      fontWeight: '600',
      color: palette.textPrimary,
      marginBottom: 10
    },
    cardTitleTight: {
      marginBottom: 6,
    },
    cardDescriptionContainer: {
      marginBottom: 10,
    },
    cardDescriptionHighlight: {
      borderRadius: 12,
      paddingHorizontal: 10,
      paddingVertical: 8,
    },
    cardDescription: {
      fontSize: 14,
      color: palette.textPrimary,
      lineHeight: 20,
    },
    cardSubtitle: {
      fontSize: 13,
      color: palette.textSecondary
    }
  });
