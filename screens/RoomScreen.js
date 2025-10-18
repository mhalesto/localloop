import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  StyleSheet,
  TouchableOpacity
} from 'react-native';
import PostItem from '../components/PostItem';
import { usePosts } from '../contexts/PostsContext';
import { colors } from '../constants/colors';
import ScreenLayout from '../components/ScreenLayout';

export default function RoomScreen({ navigation, route }) {
  const { city } = route.params;
  const { addPost: createPost, getPostsForCity } = usePosts();
  const posts = getPostsForCity(city);
  const [message, setMessage] = useState('');

  const { totalPosts, totalComments, averageReplies } = useMemo(() => {
    const postCount = posts.length;
    const commentCount = posts.reduce(
      (sum, post) => sum + (post.comments?.length ?? 0),
      0
    );

    const average =
      postCount === 0 ? 0 : Number((commentCount / postCount).toFixed(1));

    return {
      totalPosts: postCount,
      totalComments: commentCount,
      averageReplies: average
    };
  }, [posts]);

  const handleAddPost = () => {
    if (message.trim() === '') return;
    createPost(city, message);
    setMessage('');
  };

  const handleOpenPost = (postId) => {
    navigation.navigate('PostThread', { city, postId });
  };

  const listData = useMemo(() => {
    return [
      { type: 'composer', key: 'composer' },
      ...posts.map((post) => ({ type: 'post', key: post.id, data: post }))
    ];
  }, [posts]);

  const renderStickyHeader = () => (
    <View style={styles.stickyHeaderWrapper}>
      <View style={styles.headerCard}>
        <View style={styles.headerTitleRow}>
          <Text style={styles.headerSubtitle}>Anonymous room</Text>
          <Text style={styles.headerTitle}>{city}</Text>
          <Text style={styles.headerMeta}>Today&apos;s pulse</Text>
        </View>
        <View style={styles.statsRow}>
          <View style={[styles.statCard, styles.statCardLeft]}>
            <Text style={styles.statValue}>{totalPosts}</Text>
            <Text style={styles.statLabel}>Posts</Text>
          </View>
          <View style={[styles.statCard, styles.statCardMiddle]}>
            <Text style={styles.statValue}>{totalComments}</Text>
            <Text style={styles.statLabel}>Comments</Text>
          </View>
          <View style={[styles.statCard, styles.statCardRight]}>
            <Text style={styles.statValue}>{averageReplies}</Text>
            <Text style={styles.statLabel}>Avg Replies</Text>
          </View>
        </View>
      </View>
    </View>
  );

  const renderItem = ({ item }) => {
    if (item.type === 'composer') {
      return (
        <View style={styles.composerCard}>
          <Text style={styles.composerLabel}>Drop a new post</Text>
          <TextInput
            placeholder="What's happening in this room?"
            value={message}
            onChangeText={setMessage}
            multiline
            style={styles.input}
            placeholderTextColor={colors.textSecondary}
          />
          <TouchableOpacity
            style={[
              styles.primaryButton,
              message.trim() === '' && styles.primaryButtonDisabled
            ]}
            onPress={handleAddPost}
            activeOpacity={0.85}
            disabled={message.trim() === ''}
          >
            <Text style={styles.primaryButtonText}>Post</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <PostItem
        post={item.data}
        onPress={() => handleOpenPost(item.data.id)}
      />
    );
  };

  return (
    <ScreenLayout
      title={city}
      subtitle="Anonymous room"
      onBack={() => navigation.goBack()}
      navigation={navigation}
      activeTab="home"
      contentStyle={styles.screenContent}
      headerStyle={styles.flatHeader}
    >
      <FlatList
        style={styles.postsListWrapper}
        data={listData}
        keyExtractor={(item) => item.key}
        renderItem={renderItem}
        ListHeaderComponent={renderStickyHeader}
        stickyHeaderIndices={[0]}
        contentContainerStyle={[
          styles.listContainer,
          posts.length === 0 && styles.postsListEmpty
        ]}
        ListFooterComponent={
          posts.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyState}>
                No posts yet. Say something to kick things off.
              </Text>
            </View>
          ) : null
        }
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      />
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  screenContent: {
    paddingTop: 0,
    paddingHorizontal: 0
  },
  flatHeader: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
    elevation: 0
  },
  listContainer: {
    paddingBottom: 80
  },
  stickyHeaderWrapper: {
    backgroundColor: colors.primary,
    paddingBottom: 24
  },
  headerCard: {
    backgroundColor: colors.primary,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6
  },
  headerTitleRow: {
    marginBottom: 20,
    flexDirection: 'column'
  },
  headerSubtitle: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 14,
    marginBottom: 4
  },
  headerTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '600'
  },
  headerMeta: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    marginTop: 6
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  statCard: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: 'center',
    flex: 1
  },
  statCardLeft: {
    marginRight: 12
  },
  statCardMiddle: {
    marginHorizontal: 6
  },
  statCardRight: {
    marginLeft: 12
  },
  statValue: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600'
  },
  statLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    marginTop: 4
  },
  composerCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 18,
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2
  },
  composerLabel: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 12
  },
  input: {
    minHeight: 70,
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 12,
    textAlignVertical: 'top',
    color: colors.textPrimary,
    marginBottom: 12
  },
  primaryButton: {
    backgroundColor: colors.primaryDark,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center'
  },
  primaryButtonDisabled: {
    opacity: 0.6
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600'
  },
  postsListWrapper: {
    flex: 1
  },
  postsListEmpty: {
    paddingBottom: 120
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: 'center'
  },
  emptyState: {
    textAlign: 'center',
    color: colors.textSecondary,
    fontSize: 15
  }
});
