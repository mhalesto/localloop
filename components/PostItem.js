import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function PostItem({ post }) {
  return (
    <View style={styles.card}>
      <Text>{post.message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 12,
    marginVertical: 6,
    backgroundColor: '#f2f2f2',
    borderRadius: 6
  }
});
