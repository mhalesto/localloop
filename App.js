// App.js
import 'react-native-gesture-handler';
import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';

import CountryScreen from './screens/CountryScreen';
import ProvinceScreen from './screens/ProvinceScreen';
import CityScreen from './screens/CityScreen';
import RoomScreen from './screens/RoomScreen';
import PostThreadScreen from './screens/PostThreadScreen';
import MyCommentsScreen from './screens/MyCommentsScreen';
import SettingsScreen from './screens/SettingsScreen';

import { PostsProvider } from './contexts/PostsContext';
import { SettingsProvider } from './contexts/SettingsContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';

const Stack = createNativeStackNavigator();

function RootNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="Country"
      screenOptions={{ headerShown: false }}
    >
      <Stack.Screen name="Country" component={CountryScreen} />
      <Stack.Screen name="Province" component={ProvinceScreen} />
      <Stack.Screen name="City" component={CityScreen} />
      <Stack.Screen name="Room" component={RoomScreen} />
      <Stack.Screen name="PostThread" component={PostThreadScreen} />
      <Stack.Screen name="MyComments" component={MyCommentsScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
    </Stack.Navigator>
  );
}

/**
 * Wait for Firebase Auth to bootstrap so we don't render the app tree
 * with a null user and immediately re-render again.
 */
function AuthGate() {
  const { isInitializing } = useAuth();

  if (isInitializing) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  return <RootNavigator />;
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <PostsProvider>
          <SettingsProvider>
            <SafeAreaProvider>
              <NavigationContainer>
                <StatusBar style="light" />
                <AuthGate />
              </NavigationContainer>
            </SafeAreaProvider>
          </SettingsProvider>
        </PostsProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
