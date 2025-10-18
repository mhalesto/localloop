import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import CountryScreen from './screens/CountryScreen';
import ProvinceScreen from './screens/ProvinceScreen';
import CityScreen from './screens/CityScreen';
import RoomScreen from './screens/RoomScreen';
import PostThreadScreen from './screens/PostThreadScreen';
import { PostsProvider } from './contexts/PostsContext';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <PostsProvider>
      <NavigationContainer>
        <Stack.Navigator initialRouteName="Country">
          <Stack.Screen name="Country" component={CountryScreen} />
          <Stack.Screen name="Province" component={ProvinceScreen} />
          <Stack.Screen name="City" component={CityScreen} />
          <Stack.Screen name="Room" component={RoomScreen} />
          <Stack.Screen
            name="PostThread"
            component={PostThreadScreen}
            options={{ title: 'Thread' }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </PostsProvider>
  );
}
