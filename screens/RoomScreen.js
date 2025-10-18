import React, { useState } from 'react';
import { View, Text, TextInput, Button, FlatList } from 'react-native';
import PostItem from '../components/PostItem';
import { usePosts } from '../contexts/PostsContext';

export default function RoomScreen({ navigation, route }) {
  const { city } = route.params;
  const { addPost: createPost, getPostsForCity } = usePosts();
  const posts = getPostsForCity(city);
  const [message, setMessage] = useState('');

  const handleAddPost = () => {
    if (message.trim() === '') return;
    createPost(city, message);
    setMessage('');
  };

  const handleOpenPost = (postId) => {
    navigation.navigate('PostThread', { city, postId });
  };

  return (
    <View style={{ flex: 1, padding: 20 }}>
      <Text>{city} Room (All anonymous)</Text>

      <TextInput
        placeholder="Write something..."
        value={message}
        onChangeText={setMessage}
        style={{
          borderWidth: 1,
          borderColor: '#ccc',
          padding: 10,
          marginVertical: 10,
          borderRadius: 5
        }}
      />
      <Button title="Post" onPress={handleAddPost} />

      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <PostItem post={item} onPress={() => handleOpenPost(item.id)} />
        )}
        style={{ marginTop: 20 }}
      />
    </View>
  );
}
