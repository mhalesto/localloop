import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import CountryScreen from './screens/CountryScreen';
import ProvinceScreen from './screens/ProvinceScreen';
import CityScreen from './screens/CityScreen';
import RoomScreen from './screens/RoomScreen';
import PostThreadScreen from './screens/PostThreadScreen';
import MyCommentsScreen from './screens/MyCommentsScreen';
import SettingsScreen from './screens/SettingsScreen';
import { PostsProvider } from './contexts/PostsContext';
import { SettingsProvider } from './contexts/SettingsContext';
import { AuthProvider } from './contexts/AuthContext';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <PostsProvider>
          <SettingsProvider>
            <SafeAreaProvider>
              <NavigationContainer>
                <Stack.Navigator initialRouteName="Country" screenOptions={{ headerShown: false }}>
                  <Stack.Screen name="Country" component={CountryScreen} />
                  <Stack.Screen name="Province" component={ProvinceScreen} />
                  <Stack.Screen name="City" component={CityScreen} />
                  <Stack.Screen name="Room" component={RoomScreen} />
                  <Stack.Screen name="PostThread" component={PostThreadScreen} />
                  <Stack.Screen name="MyComments" component={MyCommentsScreen} />
                  <Stack.Screen name="Settings" component={SettingsScreen} />
                </Stack.Navigator>
              </NavigationContainer>
            </SafeAreaProvider>
          </SettingsProvider>
        </PostsProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
