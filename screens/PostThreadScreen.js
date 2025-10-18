import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  Button,
  StyleSheet
} from 'react-native';
import { usePosts } from '../contexts/PostsContext';

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
      <View style={styles.container}>
        <Text style={styles.notice}>This post is no longer available.</Text>
        <Button title="Back" onPress={() => navigation.goBack()} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.postCard}>
        <Text style={styles.postCity}>{city} Room</Text>
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
          <View style={styles.commentCard}>
            <Text style={styles.commentMessage}>{item.message}</Text>
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
      />

      <View style={styles.replyBox}>
        <TextInput
          value={reply}
          onChangeText={setReply}
          placeholder="Add a comment..."
          style={styles.input}
          multiline
        />
        <Button title="Reply" onPress={handleAddComment} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20
  },
  postCard: {
    backgroundColor: '#f2f2f2',
    borderRadius: 6,
    padding: 16,
    marginBottom: 16
  },
  postCity: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4
  },
  postMessage: {
    fontSize: 18,
    marginBottom: 12
  },
  postMeta: {
    fontSize: 12,
    color: '#666'
  },
  commentsContainer: {
    paddingBottom: 20
  },
  commentsList: {
    flex: 1
  },
  commentsContainerEmpty: {
    flexGrow: 1,
    justifyContent: 'center'
  },
  commentCard: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 6,
    padding: 12,
    marginBottom: 12
  },
  commentMessage: {
    fontSize: 16
  },
  emptyState: {
    textAlign: 'center',
    color: '#666',
    fontSize: 14
  },
  replyBox: {
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingTop: 12
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    padding: 10,
    marginBottom: 10,
    minHeight: 50,
    textAlignVertical: 'top'
  },
  notice: {
    fontSize: 16,
    marginBottom: 12
  }
});
