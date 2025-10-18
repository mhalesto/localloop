import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { usePosts } from '../contexts/PostsContext';
import { colors } from '../constants/colors';
import ScreenLayout from '../components/ScreenLayout';

export default function PostThreadScreen({ route, navigation }) {
  const { city, postId } = route.params;
  const { addComment, getPostById } = usePosts();
  const [reply, setReply] = useState('');

  const post = getPostById(city, postId);

  const comments = useMemo(() => post?.comments ?? [], [post]);

  const handleAddComment = () => {
    if (reply.trim() === '') {
      return;
    }

    addComment(city, postId, reply);
    setReply('');
  };

  if (!post) {
    return (
      <ScreenLayout
        title="Thread"
        subtitle={`${city} Room`}
        onBack={() => navigation.goBack()}
      >
        <View style={styles.missingWrapper}>
          <View style={styles.missingCard}>
            <Text style={styles.notice}>This post is no longer available.</Text>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.primaryButton}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryButtonText}>Go Back</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout
      title="Thread"
      subtitle={`${city} Room`}
      onBack={() => navigation.goBack()}
      navigation={navigation}
      activeTab="home"
    >
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={80}
      >
        <View style={styles.postCard}>
          <View style={styles.postHeader}>
            <Text style={styles.postBadge}>Anonymous</Text>
            <Text style={styles.postCity}>{city} Room</Text>
          </View>
          <Text style={styles.postMessage}>{post.message}</Text>
          <Text style={styles.postMeta}>
            {comments.length === 1
              ? '1 comment'
              : `${comments.length} comments`}
          </Text>
        </View>

        <FlatList
          data={comments}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View
              style={[
                styles.commentCard,
                item.createdByMe && styles.commentCardMine
              ]}
            >
              <Text
                style={[
                  styles.commentMessage,
                  item.createdByMe && styles.commentMessageMine
                ]}
              >
                {item.message}
              </Text>
              {item.createdByMe ? (
                <Text style={styles.commentMeta}>You replied</Text>
              ) : null}
            </View>
          )}
          ListEmptyComponent={
            <Text style={styles.emptyState}>
              No comments yet. Be the first to reply.
            </Text>
          }
          style={styles.commentsList}
          contentContainerStyle={[
            styles.commentsContainer,
            comments.length === 0 && styles.commentsContainerEmpty
          ]}
          showsVerticalScrollIndicator={false}
        />

        <View style={styles.replyBox}>
          <Text style={styles.replyLabel}>Add a reply</Text>
          <TextInput
            value={reply}
            onChangeText={setReply}
            placeholder="Share your thoughts..."
            style={styles.input}
            multiline
            placeholderTextColor={colors.textSecondary}
          />
          <TouchableOpacity
            style={[
              styles.primaryButton,
              reply.trim() === '' && styles.primaryButtonDisabled
            ]}
            onPress={handleAddComment}
            disabled={reply.trim() === ''}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryButtonText}>Reply</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    paddingBottom: 20
  },
  postCard: {
    backgroundColor: colors.primary,
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14
  },
  postBadge: {
    backgroundColor: colors.primaryLight,
    color: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.3
  },
  postCity: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)'
  },
  postMessage: {
    fontSize: 20,
    marginBottom: 18,
    color: '#fff',
    fontWeight: '500'
  },
  postMeta: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.75)'
  },
  commentsContainer: {
    paddingBottom: 80
  },
  commentsList: {
    flex: 1
  },
  commentsContainerEmpty: {
    flexGrow: 1,
    justifyContent: 'center'
  },
  commentCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2
  },
  commentCardMine: {
    backgroundColor: colors.primaryLight + '22',
    borderColor: colors.primaryLight,
    borderWidth: 1
  },
  commentMessage: {
    fontSize: 16,
    color: colors.textPrimary
  },
  commentMessageMine: {
    color: colors.primaryDark
  },
  commentMeta: {
    marginTop: 8,
    fontSize: 12,
    color: colors.primaryDark,
    fontWeight: '600'
  },
  emptyState: {
    textAlign: 'center',
    color: colors.textSecondary,
    fontSize: 14
  },
  replyBox: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 18,
    marginTop: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3
  },
  replyLabel: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 12
  },
  input: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    minHeight: 50,
    textAlignVertical: 'top',
    backgroundColor: colors.background,
    color: colors.textPrimary
  },
  notice: {
    fontSize: 16,
    marginBottom: 16,
    color: colors.textPrimary,
    textAlign: 'center'
  },
  missingWrapper: {
    flex: 1,
    justifyContent: 'center',
    paddingBottom: 40
  },
  missingCard: {
    margin: 20,
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4
  },
  primaryButton: {
    backgroundColor: colors.primaryDark,
    paddingVertical: 12,
    paddingHorizontal: 24,
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
  }
});
