import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import CountryScreen from './screens/CountryScreen';
import ProvinceScreen from './screens/ProvinceScreen';
import CityScreen from './screens/CityScreen';
import RoomScreen from './screens/RoomScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Country">
        <Stack.Screen name="Country" component={CountryScreen} />
        <Stack.Screen name="Province" component={ProvinceScreen} />
        <Stack.Screen name="City" component={CityScreen} />
        <Stack.Screen name="Room" component={RoomScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
