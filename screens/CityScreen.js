import React from 'react';
import { View, Text, Button } from 'react-native';

export default function CityScreen({ navigation, route }) {
  const { province } = route.params;

  return (
    <View style={{ padding: 20 }}>
      <Text>{province} → Choose a City:</Text>
      <Button title="Johannesburg" onPress={() => navigation.navigate('Room', { city: 'Johannesburg' })} />
    </View>
  );
}
