import React, { useState } from 'react';
import { View, Text, TextInput, Button, FlatList } from 'react-native';
import PostItem from '../components/PostItem';

export default function RoomScreen({ route }) {
  const { city } = route.params;
  const [posts, setPosts] = useState([]);
  const [message, setMessage] = useState('');

  const addPost = () => {
    if (message.trim() === '') return;
    const newPost = { id: Date.now().toString(), message };
    setPosts([newPost, ...posts]);
    setMessage('');
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
      <Button title="Post" onPress={addPost} />

      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <PostItem post={item} />}
        style={{ marginTop: 20 }}
      />
    </View>
  );
}
