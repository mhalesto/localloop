import React from 'react';
import { View, Text, Button } from 'react-native';

export default function CountryScreen({ navigation }) {
  return (
    <View style={{ padding: 20 }}>
      <Text>Select a Country:</Text>
      <Button title="South Africa" onPress={() => navigation.navigate('Province', { country: 'South Africa' })} />
    </View>
  );
}
