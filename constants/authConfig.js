// constants/authConfig.js
import Constants from 'expo-constants';

const getEnv = (key, fallback = '') => {
  const v = process.env[key];
  return v === undefined || v === null ? fallback : String(v);
};

// Scheme for redirect URIs (app.json -> "scheme": "toilet")
export const APP_SCHEME = getEnv('EXPO_PUBLIC_SCHEME', 'toilet');

// Your Google OAuth client IDs (from .env)
export const googleAuthConfig = {
  expoClientId: getEnv('EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID', ''),
  iosClientId: getEnv('EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID', ''),
  androidClientId: getEnv('EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID', ''),
  webClientId: getEnv('EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID', ''),
};

// Minimal check: in Expo Go we just need expo OR web
export const isGoogleAuthConfigured = () => {
  return Boolean(googleAuthConfig.expoClientId || googleAuthConfig.webClientId);
};

export const SIGNUP_BONUS_POINTS = 250;
export const PREMIUM_DAY_COST = 500;
export const PREMIUM_ACCESS_DURATION_MS = 24 * 60 * 60 * 1000;

// Optional (only if you later use a custom backend session)
export const AUTH_SESSION_STORAGE_KEY = '@toilet/session-token';
export const API_BASE_URL = getEnv(
  'EXPO_PUBLIC_API_BASE_URL',
  getEnv('EXPO_PUBLIC_BASE_URL', '')
);
