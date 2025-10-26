// contexts/AuthContext.js
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { makeRedirectUri } from 'expo-auth-session';
import Constants from 'expo-constants';
import {
  GoogleAuthProvider,
  signInWithCredential,
  onAuthStateChanged,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  runTransaction,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { app, db, auth as sharedAuth } from '../api/firebaseClient';
import {
  googleAuthConfig,
  isGoogleAuthConfigured,
  APP_SCHEME,
  SIGNUP_BONUS_POINTS,
  PREMIUM_DAY_COST,
  PREMIUM_ACCESS_DURATION_MS,
} from '../constants/authConfig';

WebBrowser.maybeCompleteAuthSession();

const AuthContext = createContext(null);

const normalizeTimestamp = (value) => {
  if (!value) return null;
  if (typeof value === 'number') return value;
  if (typeof value?.toMillis === 'function') return value.toMillis();
  return null;
};

const normalizeProfile = (raw = {}) => ({
  displayName: raw.displayName ?? '',
  email: raw.email ?? '',
  photoURL: raw.photoURL ?? '',
  points: Number.isFinite(raw.points) ? raw.points : 0,
  premiumExpiresAt: normalizeTimestamp(raw.premiumExpiresAt),
  signupBonusAwardedAt: normalizeTimestamp(raw.signupBonusAwardedAt),
  lastLoginAt: normalizeTimestamp(raw.lastLoginAt),
  lastPremiumRedeemedAt: normalizeTimestamp(raw.lastPremiumRedeemedAt),
});

export function AuthProvider({ children }) {
  // Reuse the initialized auth (from firebaseClient)
  const auth = useMemo(() => sharedAuth ?? null, []);
  const googleConfigured = useMemo(() => isGoogleAuthConfigured(), []);

  // Redirect URI: proxy in Expo Go, app scheme in standalone/dev build
  const isExpoGo = Constants.appOwnership === 'expo';
  const redirectUri = useMemo(
    () =>
      makeRedirectUri({
        scheme: APP_SCHEME, // e.g. "toilet"
        useProxy: isExpoGo,
      }),
    [isExpoGo]
  );

  // ✅ Always provide ios/android/web IDs; fall back to Expo/Web ID if missing
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest(
    {
      expoClientId:
        googleAuthConfig.expoClientId || googleAuthConfig.webClientId || '',
      iosClientId:
        googleAuthConfig.iosClientId ||
        googleAuthConfig.expoClientId ||
        googleAuthConfig.webClientId ||
        '',
      androidClientId:
        googleAuthConfig.androidClientId ||
        googleAuthConfig.expoClientId ||
        googleAuthConfig.webClientId ||
        '',
      webClientId:
        googleAuthConfig.webClientId || googleAuthConfig.expoClientId || '',
      scopes: ['openid', 'profile', 'email'],
      redirectUri,
    },
    [redirectUri]
  );

  const [firebaseUser, setFirebaseUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [initializing, setInitializing] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [signInInFlight, setSignInInFlight] = useState(false);
  const [redeemInFlight, setRedeemInFlight] = useState(false);

  // Hydrate / create user profile in Firestore
  const hydrateProfile = useCallback(
    async (user) => {
      if (!db || !user) {
        setProfile(null);
        return;
      }
      try {
        const now = Date.now();
        const ref = doc(db, 'users', user.uid);
        const snap = await getDoc(ref);

        if (!snap.exists()) {
          const base = {
            displayName: user.displayName ?? '',
            email: user.email ?? '',
            photoURL: user.photoURL ?? '',
            points: SIGNUP_BONUS_POINTS,
            premiumExpiresAt: null,
            signupBonusAwardedAt: now,
            lastLoginAt: now,
            providers: (user.providerData ?? []).map((p) => p.providerId),
          };
          await setDoc(
            ref,
            { ...base, createdAt: serverTimestamp(), updatedAt: serverTimestamp() },
            { merge: false }
          );
          setProfile(normalizeProfile(base));
          return;
        }

        const data = snap.data();
        const next = normalizeProfile(data);
        const updates = {};
        if ((user.displayName ?? '') !== next.displayName) {
          updates.displayName = user.displayName ?? '';
          next.displayName = updates.displayName;
        }
        if ((user.email ?? '') !== next.email) {
          updates.email = user.email ?? '';
          next.email = updates.email;
        }
        if ((user.photoURL ?? '') !== next.photoURL) {
          updates.photoURL = user.photoURL ?? '';
          next.photoURL = updates.photoURL;
        }
        updates.lastLoginAt = now;
        next.lastLoginAt = now;

        const providers = (user.providerData ?? []).map((p) => p.providerId);
        if (providers.length) updates.providers = providers;

        if (Object.keys(updates).length) {
          await setDoc(ref, { ...updates, updatedAt: serverTimestamp() }, { merge: true });
        }
        setProfile(next);
      } catch (e) {
        console.warn('[auth] Failed to load profile', e);
        setAuthError('Unable to load your profile. Please try again.');
      }
    },
    [db]
  );

  // Firebase auth state
  useEffect(() => {
    if (!auth) {
      setInitializing(false);
      return;
    }
    const unsub = onAuthStateChanged(auth, (u) => {
      setFirebaseUser(u);
      if (u) hydrateProfile(u);
      else setProfile(null);
      setInitializing(false);
    });
    return unsub;
  }, [auth, hydrateProfile]);

  // Handle Google response -> Firebase sign-in
  useEffect(() => {
    const go = async () => {
      if (!signInInFlight || !response || !auth) return;

      if (response.type === 'success') {
        try {
          const idToken = response.params?.id_token || response.authentication?.idToken;
          if (!idToken) throw new Error('Missing Google ID token.');
          const cred = GoogleAuthProvider.credential(idToken);
          await signInWithCredential(auth, cred);
          setAuthError(null);
        } catch (err) {
          console.warn('[auth] Google credential sign-in failed', err);
          setAuthError(err.message ?? 'Google sign-in failed. Please try again.');
        } finally {
          setSignInInFlight(false);
        }
      } else if (response.type === 'cancel') {
        setAuthError(null);
        setSignInInFlight(false);
      } else {
        setAuthError(response.error?.message ?? 'Google sign-in failed. Please try again.');
        setSignInInFlight(false);
      }
    };
    go();
  }, [response, auth, signInInFlight]);

  const startGoogleSignIn = useCallback(async () => {
    if (!googleConfigured) {
      setAuthError('Google Sign-In is not configured. Add your client IDs to .env and restart with "expo start -c".');
      return;
    }
    if (!request) {
      setAuthError('Google Sign-In is still initializing. Try again in a moment.');
      return;
    }
    try {
      setAuthError(null);
      setSignInInFlight(true);
      const result = await promptAsync({ useProxy: isExpoGo, showInRecents: true });
      if (!result || result.type !== 'success') {
        if (!result || result.type === 'cancel') setAuthError(null);
        else setAuthError(result.error?.message ?? 'Google sign-in was cancelled.');
        setSignInInFlight(false);
      }
    } catch (err) {
      console.warn('[auth] Failed to start Google sign-in', err);
      setSignInInFlight(false);
      setAuthError('Unable to start Google sign-in. Please try again.');
    }
  }, [googleConfigured, request, promptAsync, isExpoGo]);

  const redeemPremiumDay = useCallback(async () => {
    if (!db || !firebaseUser) {
      setAuthError('Sign in to unlock premium access.');
      return { ok: false, error: 'not_authenticated' };
    }
    setRedeemInFlight(true);
    try {
      const result = await runTransaction(db, async (tx) => {
        const ref = doc(db, 'users', firebaseUser.uid);
        const snap = await tx.get(ref);
        if (!snap.exists()) throw new Error('Profile not found.');

        const data = normalizeProfile(snap.data());
        const now = Date.now();
        const currentPoints = data.points ?? 0;
        if (currentPoints < PREMIUM_DAY_COST) throw new Error('Not enough points to unlock premium.');

        const activeUntil =
          data.premiumExpiresAt && data.premiumExpiresAt > now ? data.premiumExpiresAt : now;
        const premiumExpiresAt = activeUntil + PREMIUM_ACCESS_DURATION_MS;

        tx.update(ref, {
          points: currentPoints - PREMIUM_DAY_COST,
          premiumExpiresAt,
          lastPremiumRedeemedAt: now,
          updatedAt: serverTimestamp(),
        });

        return {
          ...data,
          points: currentPoints - PREMIUM_DAY_COST,
          premiumExpiresAt,
          lastPremiumRedeemedAt: now,
        };
      });
      setProfile(result);
      setAuthError(null);
      return { ok: true };
    } catch (err) {
      console.warn('[auth] Premium redemption failed', err);
      setAuthError(err.message ?? 'Unable to unlock premium right now.');
      return { ok: false, error: err.message };
    } finally {
      setRedeemInFlight(false);
    }
  }, [firebaseUser, db]);

  const clearAuthError = useCallback(() => setAuthError(null), []);

  const hasActivePremium = useMemo(() => {
    if (!profile?.premiumExpiresAt) return false;
    return profile.premiumExpiresAt > Date.now();
  }, [profile?.premiumExpiresAt]);

  const pointsToNextPremium = useMemo(() => {
    if (!profile) return PREMIUM_DAY_COST;
    if (hasActivePremium) return 0;
    const balance = Number.isFinite(profile.points) ? profile.points : 0;
    return Math.max(PREMIUM_DAY_COST - balance, 0);
  }, [profile, hasActivePremium]);

  const value = useMemo(
    () => ({
      user: firebaseUser,
      profile,
      isInitializing: initializing,
      isSigningIn: signInInFlight,
      isRedeeming: redeemInFlight,
      authError,
      hasActivePremium,
      pointsToNextPremium,
      premiumDayCost: PREMIUM_DAY_COST,
      premiumAccessDurationMs: PREMIUM_ACCESS_DURATION_MS,
      canUseGoogleSignIn: googleConfigured && Boolean(request),
      startGoogleSignIn,
      redeemPremiumDay,
      clearAuthError,
    }),
    [
      firebaseUser,
      profile,
      initializing,
      signInInFlight,
      redeemInFlight,
      authError,
      hasActivePremium,
      pointsToNextPremium,
      googleConfigured,
      request,
      startGoogleSignIn,
      redeemPremiumDay,
      clearAuthError,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
