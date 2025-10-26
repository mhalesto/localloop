// constants/authConfig.js
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// ── paste YOUR ids here ─────────────────────────────────────────────
export const googleAuthConfig = {
  // Web client (use this when running in Expo Go)
  expoClientId: '285187748110-fibkdeirpfdgn27mlqgdgohokaqvgijm.apps.googleusercontent.com',
  // Create these in Google Cloud and paste them when you build a dev/standalone app:
  iosClientId: 'YOUR_IOS_CLIENT_ID.apps.googleusercontent.com',
  androidClientId: 'YOUR_ANDROID_CLIENT_ID.apps.googleusercontent.com',
  webClientId: '285187748110-fibkdeirpfdgn27mlqgdgohokaqvgijm.apps.googleusercontent.com',
};
// ───────────────────────────────────────────────────────────────────

const isFilled = (v) => typeof v === 'string' && v.length > 0 && !v.startsWith('YOUR_');

export const requiredGoogleClientKey = () => {
  const isExpoGo = Constants.appOwnership === 'expo';
  if (Platform.OS === 'web') return 'webClientId';
  if (isExpoGo) return 'expoClientId';           // Expo Go uses the web client (proxy)
  if (Platform.OS === 'ios') return 'iosClientId'; // dev/standalone iOS
  if (Platform.OS === 'android') return 'androidClientId'; // dev/standalone Android
  return 'expoClientId';
};

export const isGoogleAuthConfigured = () => {
  const key = requiredGoogleClientKey();
  return isFilled(googleAuthConfig[key]);
};

export const SIGNUP_BONUS_POINTS = 250;
export const PREMIUM_DAY_COST = 500;
export const PREMIUM_ACCESS_DURATION_MS = 24 * 60 * 60 * 1000;
