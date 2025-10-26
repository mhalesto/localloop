// constants/authConfig.js
import Constants from 'expo-constants';

const read = (key, fallback = '') =>
  process.env[key] ??
  (Constants.expoConfig?.extra ? Constants.expoConfig.extra[key] : undefined) ??
  fallback;

// ── Identity (must match your project) ────────────────────────────────────────
export const EXPO_USERNAME = read('EXPO_PUBLIC_EXPO_USERNAME', '');
export const EXPO_SLUG = read('EXPO_PUBLIC_EXPO_SLUG', '');
export const APP_SCHEME = read('EXPO_PUBLIC_SCHEME', 'toilet');

// ── Google OAuth client IDs ───────────────────────────────────────────────────
// NOTE: In Expo Go, expoClientId MUST be the **Web** client ID.
export const googleAuthConfig = {
  expoClientId: read('EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID', ''),
  webClientId: read('EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID', ''),
  iosClientId: read('EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID', ''),
  androidClientId: read('EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID', ''),
};

export const isGoogleAuthConfigured = () =>
  Boolean(
    (googleAuthConfig.expoClientId || googleAuthConfig.webClientId) &&
    EXPO_USERNAME &&
    EXPO_SLUG
  );

// ── Redirects ────────────────────────────────────────────────────────────────
// Hard-force Expo OAuth proxy while developing with Expo Go.
// Make sure this exact URL is in Google Cloud OAuth (Web) → Authorized redirect URIs.
export const EXPO_PROXY_REDIRECT = `https://auth.expo.io/@${EXPO_USERNAME}/${EXPO_SLUG}`;

// For dev/standalone builds you can switch to a scheme callback later if you want.
export const SCHEME_REDIRECT = `${APP_SCHEME}://redirect`;

/**
 * Always return the Expo proxy in dev for Expo Go.
 * (We can switch to SCHEME_REDIRECT once you move to a dev client/standalone.)
 */
export const resolveRedirectUri = () => EXPO_PROXY_REDIRECT;

// App constants (unchanged)
export const SIGNUP_BONUS_POINTS = 250;
export const PREMIUM_DAY_COST = 250;
export const PREMIUM_ACCESS_DURATION_MS = 24 * 60 * 60 * 1000; // 1 day
