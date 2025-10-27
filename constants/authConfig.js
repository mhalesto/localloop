// constants/authConfig.js
import Constants from 'expo-constants';

const read = (key, fallback = '') =>
  process.env[key] ??
  (Constants.expoConfig?.extra ? Constants.expoConfig.extra[key] : undefined) ??
  fallback;

const readNumber = (key, fallback) => {
  const value = read(key, undefined);
  if (value === undefined || value === null || value === '') {
    return fallback;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const readList = (key) =>
  read(key, '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

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

// ── Statuses / moderation ────────────────────────────────────────────────────
export const STATUS_TTL_MS = readNumber('EXPO_PUBLIC_STATUS_TTL_MS', 24 * 60 * 60 * 1000);
export const STATUS_REPORT_THRESHOLD = readNumber('EXPO_PUBLIC_STATUS_REPORT_THRESHOLD', 5);
export const POST_REPORT_THRESHOLD = readNumber('EXPO_PUBLIC_POST_REPORT_THRESHOLD', 5);
export const ADMIN_EMAILS = readList('EXPO_PUBLIC_ADMIN_EMAILS');

// ── Engagement points ────────────────────────────────────────────────────────
export const ENGAGEMENT_POINT_RULES = {
  comment: 15,
  upvote: 4,
};

// App constants (unchanged)
export const SIGNUP_BONUS_POINTS = 250;
export const PREMIUM_DAY_COST = 250;
export const PREMIUM_ACCESS_DURATION_MS = 24 * 60 * 60 * 1000; // 1 day
