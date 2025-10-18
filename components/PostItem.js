import React from 'react';
import { Text, StyleSheet, TouchableOpacity, View } from 'react-native';

export default function PostItem({ post, onPress }) {
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
        <Text style={styles.message}>{post.message}</Text>
        <Text style={styles.meta}>{commentLabel}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  touchable: {
    borderRadius: 6
  },
  card: {
    padding: 12,
    marginVertical: 6,
    backgroundColor: '#f2f2f2',
    borderRadius: 6
  },
  message: {
    fontSize: 16,
    marginBottom: 8
  },
  meta: {
    fontSize: 12,
    color: '#555'
  }
});
