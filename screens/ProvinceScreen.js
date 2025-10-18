import React from 'react';
import { View, Text, Button } from 'react-native';

export default function ProvinceScreen({ navigation, route }) {
  const { country } = route.params;

  return (
    <View style={{ padding: 20 }}>
      <Text>{country} → Choose a Province:</Text>
      <Button title="Gauteng" onPress={() => navigation.navigate('City', { province: 'Gauteng' })} />
    </View>
  );
}
