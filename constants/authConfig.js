// constants/authConfig.js
import { Platform } from 'react-native';
import Constants from 'expo-constants';

const env = (k, d = '') => (process.env[k] ?? d).toString();

export const APP_SCHEME = env('EXPO_PUBLIC_SCHEME', 'toilet'); // NO "://"
export const EXPO_USERNAME = env('EXPO_PUBLIC_EXPO_USERNAME', '');
export const EXPO_SLUG = env('EXPO_PUBLIC_EXPO_SLUG', 'toilet');

export const API_BASE_URL = env('EXPO_PUBLIC_API_BASE_URL', env('EXPO_PUBLIC_BASE_URL', 'http://localhost:4000'));

export const googleAuthConfig = {
  // For Expo Go / Dev Client use the **Web client ID**
  expoClientId: env('EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID', ''),
  // For production native builds:
  iosClientId: env('EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID', ''),
  androidClientId: env('EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID', ''),
  // For web (PWA) usage
  webClientId: env('EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID', '')
};

const filled = (v) => typeof v === 'string' && v.length > 0 && !v.startsWith('YOUR_');

export const isGoogleAuthConfigured = () => {
  // In Expo Go we expect expoClientId (== your Web client id)
  if (Constants.appOwnership === 'expo') return filled(googleAuthConfig.expoClientId);
  // In native builds we expect the platform client id
  if (Platform.OS === 'ios') return filled(googleAuthConfig.iosClientId);
  if (Platform.OS === 'android') return filled(googleAuthConfig.androidClientId);
  // Web
  if (Platform.OS === 'web') return filled(googleAuthConfig.webClientId);
  return false;
};

export const SIGNUP_BONUS_POINTS = 250;
export const PREMIUM_DAY_COST = 500;
export const PREMIUM_ACCESS_DURATION_MS = 24 * 60 * 60 * 1000;
export const AUTH_SESSION_STORAGE_KEY = '@toilet/session-token';
