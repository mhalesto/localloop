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

  return (
    <ScreenLayout
      title={city}
      subtitle="Anonymous room"
      onBack={() => navigation.goBack()}
      navigation={navigation}
      activeTab="home"
    >
      <View style={styles.content}>
        <View style={styles.headerCard}>
          <View style={styles.headerTitleRow}>
            <Text style={styles.headerSubtitle}>Room stats</Text>
            <Text style={styles.headerTitle}>Today&apos;s pulse</Text>
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

        <FlatList
          style={styles.postsListWrapper}
          data={posts}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <PostItem post={item} onPress={() => handleOpenPost(item.id)} />
          )}
          contentContainerStyle={[
            styles.postsList,
            posts.length === 0 && styles.postsListEmpty
          ]}
          ListEmptyComponent={
            <Text style={styles.emptyState}>
              No posts yet. Say something to kick things off.
            </Text>
          }
          showsVerticalScrollIndicator={false}
        />
      </View>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    paddingBottom: 40
  },
  headerCard: {
    backgroundColor: colors.primary,
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4
  },
  headerTitleRow: {
    marginBottom: 20
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
  statsRow: {
    flexDirection: 'row'
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
  postsList: {
    paddingBottom: 80
  },
  postsListWrapper: {
    flex: 1
  },
  postsListEmpty: {
    flexGrow: 1,
    justifyContent: 'center'
  },
  emptyState: {
    textAlign: 'center',
    color: colors.textSecondary,
    fontSize: 15
  }
});
