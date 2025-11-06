// App.js
import 'react-native-gesture-handler';
import React, { useState, useEffect } from 'react';
import { View, Linking } from 'react-native';
import { NavigationContainer, useNavigation } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LoadingOverlay from './components/LoadingOverlay';
import CustomSplashScreen from './components/SplashScreen';
import { useAlert } from './contexts/AlertContext';

import CountryScreen from './screens/CountryScreen';
import ProvinceScreen from './screens/ProvinceScreen';
import CityScreen from './screens/CityScreen';
import RoomScreen from './screens/RoomScreen';
import PostThreadScreen from './screens/PostThreadScreen';
import ThreadSummaryScreen from './screens/ThreadSummaryScreen';
import MyCommentsScreen from './screens/MyCommentsScreen';
import MyPostsScreen from './screens/MyPostsScreen';
import SettingsScreen from './screens/SettingsScreen';
import ProfileScreen from './screens/ProfileScreen';
import StatusDetailScreen from './screens/StatusDetailScreen';
import StatusComposerScreen from './screens/StatusComposerScreen';
import ModerationScreen from './screens/ModerationScreen';
import TopStatusesScreen from './screens/TopStatusesScreen';
import StatusStoryViewerScreen from './screens/StatusStoryViewerScreen';
import DirectMessageScreen from './screens/DirectMessageScreen';
import SubscriptionScreen from './screens/SubscriptionScreen';
import PaymentScreen from './screens/PaymentScreen';
import ProfileSetupScreen from './screens/ProfileSetupScreen';
import PublicProfileScreen from './screens/PublicProfileScreen';
import FollowersScreen from './screens/FollowersScreen';
import FollowingScreen from './screens/FollowingScreen';
import FeedScreen from './screens/FeedScreen';
import DiscoverScreen from './screens/DiscoverScreen';
import NeighborhoodExplorerScreen from './screens/NeighborhoodExplorerScreen';
import PostComposerScreen from './screens/PostComposerScreen';
import LocalLoopMarketsScreen from './screens/LocalLoopMarketsScreen';
import CreateMarketListingScreen from './screens/CreateMarketListingScreen';
import OnboardingScreen from './screens/OnboardingScreen';

import { PostsProvider } from './contexts/PostsContext';
import { SettingsProvider } from './contexts/SettingsContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { StatusesProvider } from './contexts/StatusesContext';
import { SensorsProvider } from './contexts/SensorsContext';
import { NotificationsProvider } from './contexts/NotificationsContext';
import { AlertProvider } from './contexts/AlertContext';

const Stack = createNativeStackNavigator();

// Component to handle deep links with access to AlertContext
function DeepLinkHandler() {
  const navigation = useNavigation();
  const { showAlert } = useAlert();

  useEffect(() => {
    const handleDeepLink = (event) => {
      const url = event.url;
      console.log('[App] Deep link received:', url);

      if (url.includes('payment-success')) {
        // Payment successful - navigate to subscription screen
        showAlert(
          'Payment Processing',
          'Your payment was successful! Your subscription will be activated shortly.',
          [
            {
              text: 'OK',
              onPress: () => {
                navigation.navigate('Subscription');
              },
            },
          ],
          { type: 'success' }
        );
      } else if (url.includes('payment-cancelled')) {
        // Payment cancelled
        showAlert(
          'Payment Cancelled',
          'Your payment was cancelled. You can try again anytime.',
          [
            {
              text: 'OK',
              onPress: () => {
                navigation.navigate('Subscription');
              },
            },
          ],
          { type: 'warning' }
        );
      }
    };

    // Listen for deep links
    const subscription = Linking.addEventListener('url', handleDeepLink);

    // Check if app was opened via deep link
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink({ url });
      }
    });

    return () => {
      subscription.remove();
    };
  }, [navigation, showAlert]);

  return null; // This component doesn't render anything
}

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
      <Stack.Screen name="ThreadSummary" component={ThreadSummaryScreen} />
      <Stack.Screen name="MyComments" component={MyCommentsScreen} />
      <Stack.Screen name="MyPosts" component={MyPostsScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="StatusDetail" component={StatusDetailScreen} />
      <Stack.Screen name="StatusComposer" component={StatusComposerScreen} />
      <Stack.Screen name="Moderation" component={ModerationScreen} />
      <Stack.Screen name="TopStatuses" component={TopStatusesScreen} />
      <Stack.Screen name="StatusStoryViewer" component={StatusStoryViewerScreen} />
      <Stack.Screen name="DirectMessage" component={DirectMessageScreen} />
      <Stack.Screen name="Subscription" component={SubscriptionScreen} />
      <Stack.Screen name="Payment" component={PaymentScreen} />
      <Stack.Screen name="ProfileSetup" component={ProfileSetupScreen} />
      <Stack.Screen name="PublicProfile" component={PublicProfileScreen} />
      <Stack.Screen name="Followers" component={FollowersScreen} />
      <Stack.Screen name="Following" component={FollowingScreen} />
      <Stack.Screen name="Feed" component={FeedScreen} />
      <Stack.Screen name="Discover" component={DiscoverScreen} />
      <Stack.Screen name="NeighborhoodExplorer" component={NeighborhoodExplorerScreen} />
      <Stack.Screen name="PostComposer" component={PostComposerScreen} />
      <Stack.Screen name="LocalLoopMarkets" component={LocalLoopMarketsScreen} />
      <Stack.Screen name="CreateMarketListing" component={CreateMarketListingScreen} />
    </Stack.Navigator>
  );
}

/**
 * Wait for Firebase Auth to bootstrap so we don't render the app tree
 * with a null user and immediately re-render again.
 */
function AuthGate() {
  const { isInitializing } = useAuth();
  const [showLoader, setShowLoader] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);

  useEffect(() => {
    if (!isInitializing) {
      // Check if onboarding has been completed
      checkOnboardingStatus();
    }
  }, [isInitializing]);

  const checkOnboardingStatus = async () => {
    try {
      const completed = await AsyncStorage.getItem('@onboarding_completed');
      setShowOnboarding(completed !== 'true');

      // Small delay to ensure smooth transition
      const timer = setTimeout(() => {
        setShowLoader(false);
        setCheckingOnboarding(false);
      }, 100);
      return () => clearTimeout(timer);
    } catch (error) {
      console.error('Error checking onboarding status:', error);
      setShowOnboarding(false);
      setShowLoader(false);
      setCheckingOnboarding(false);
    }
  };

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
  };

  if (isInitializing || showLoader || checkingOnboarding) {
    return (
      <View style={{ flex: 1 }}>
        <LoadingOverlay
          visible={true}
          onComplete={() => {}}
          duration={2000}
        />
      </View>
    );
  }

  if (showOnboarding) {
    return <OnboardingScreen onComplete={handleOnboardingComplete} />;
  }

  return <RootNavigator />;
}

export default function App() {
  const [showSplash, setShowSplash] = useState(true);

  // Deep link configuration for PayFast redirects
  const linking = {
    prefixes: ['localloop://'],
    config: {
      screens: {
        Subscription: 'subscription',
      },
    },
  };

  if (showSplash) {
    return <CustomSplashScreen onAnimationComplete={() => setShowSplash(false)} />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <SettingsProvider>
          <AlertProvider>
            <SensorsProvider>
              <PostsProvider>
                <StatusesProvider>
                  <NotificationsProvider>
                    <SafeAreaProvider>
                      <NavigationContainer linking={linking}>
                        <StatusBar style="light" />
                        <DeepLinkHandler />
                        <AuthGate />
                      </NavigationContainer>
                    </SafeAreaProvider>
                  </NotificationsProvider>
                </StatusesProvider>
              </PostsProvider>
            </SensorsProvider>
          </AlertProvider>
        </SettingsProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
