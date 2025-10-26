// constants/authConfig.js
import { Platform } from 'react-native';
import Constants from 'expo-constants';

const env = (k, d = '') => {
  const v = process.env[k];
  return v === undefined || v === null ? d : String(v);
};

// IMPORTANT: scheme should NOT include "://"
export const APP_SCHEME = env('EXPO_PUBLIC_SCHEME', 'toilet');

// Your Google OAuth client IDs.
// For dev in Expo Go, it's fine to reuse the Expo client ID as the iOS/Android IDs,
// which satisfies the provider’s requirement and prevents crashes.
const EXPO_ID = env('EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID', '285187748110-fibkdeirpfdgn27mlqgdgohokaqvgijm.apps.googleusercontent.com');
const IOS_ID = env('EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID', EXPO_ID);
const ANDROID_ID = env('EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID', EXPO_ID);
const WEB_ID = env('EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID', '');

export const googleAuthConfig = {
  expoClientId: EXPO_ID,
  iosClientId: IOS_ID,
  androidClientId: ANDROID_ID,
  webClientId: WEB_ID,
};

export const isGoogleAuthConfigured = () => !!googleAuthConfig.expoClientId;

export const SIGNUP_BONUS_POINTS = 250;
export const PREMIUM_DAY_COST = 500;
export const PREMIUM_ACCESS_DURATION_MS = 24 * 60 * 60 * 1000;

export const AUTH_SESSION_STORAGE_KEY = '@toilet/session-token';
export const API_BASE_URL = env('EXPO_PUBLIC_API_BASE_URL', env('EXPO_PUBLIC_BASE_URL', 'http://localhost:4000'));
