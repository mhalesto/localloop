// contexts/AuthContext.js
// Google Sign-In via Expo Auth Session (ID token flow) + Firebase Auth + Firestore profile

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { makeRedirectUri } from 'expo-auth-session';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithCredential,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  runTransaction,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';

import { auth as sharedAuth, db } from '../api/firebaseClient';
import {
  googleAuthConfig,
  isGoogleAuthConfigured,
  APP_SCHEME,
  EXPO_USERNAME,
  EXPO_SLUG,
  SIGNUP_BONUS_POINTS,
  PREMIUM_DAY_COST,
  PREMIUM_ACCESS_DURATION_MS,
} from '../constants/authConfig';

WebBrowser.maybeCompleteAuthSession();

const AuthContext = createContext(null);

// ---------- helpers ----------
const ts = (v) =>
  !v ? null : typeof v === 'number' ? v : typeof v.toMillis === 'function' ? v.toMillis() : null;

const normalizeProfile = (raw = {}) => ({
  displayName: raw.displayName ?? '',
  email: raw.email ?? '',
  photoURL: raw.photoURL ?? '',
  points: Number.isFinite(raw.points) ? raw.points : 0,
  premiumExpiresAt: ts(raw.premiumExpiresAt),
  signupBonusAwardedAt: ts(raw.signupBonusAwardedAt),
  lastLoginAt: ts(raw.lastLoginAt),
  lastPremiumRedeemedAt: ts(raw.lastPremiumRedeemedAt),
});

// ---------- provider ----------
export function AuthProvider({ children }) {
  // Reuse the already-initialized Firebase Auth instance
  const auth = useMemo(() => sharedAuth ?? null, []);
  const googleConfigured = useMemo(() => isGoogleAuthConfigured(), []);

  // In Expo Go we must use the HTTPS proxy redirect. Build it explicitly.
  const proxyRedirectUri = useMemo(() => {
    const u = (EXPO_USERNAME || '').trim();
    const s = (EXPO_SLUG || '').trim();
    if (u && s) return `https://auth.expo.io/@${u}/${s}`;
    // Fallback still uses the proxy
    return makeRedirectUri({ useProxy: true, scheme: APP_SCHEME });
  }, []);

  // For now, always force proxy (works in Expo Go, dev client, simulators)
  const redirectUri = proxyRedirectUri;
  if (__DEV__) console.log('[auth] redirectUri:', redirectUri);

  // Use ID Token flow so we can sign into Firebase directly
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    // In Expo Go, pass your **Web client ID** as expoClientId
    expoClientId:
      googleAuthConfig.expoClientId ||
      googleAuthConfig.webClientId ||
      undefined,
    // For native builds later
    iosClientId: googleAuthConfig.iosClientId || undefined,
    androidClientId: googleAuthConfig.androidClientId || undefined,
    // For PWA / web
    webClientId: googleAuthConfig.webClientId || undefined,
    scopes: ['openid', 'profile', 'email'],
    selectAccount: true,
    redirectUri,
  });

  const [firebaseUser, setFirebaseUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [initializing, setInitializing] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [signInInFlight, setSignInInFlight] = useState(false);
  const [redeemInFlight, setRedeemInFlight] = useState(false);

  // ---------- profile load / hydrate ----------
  const hydrateProfile = useCallback(async (user) => {
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
  }, []);

  // ---------- auth state subscription ----------
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

  // ---------- handle OAuth response ----------
  useEffect(() => {
    const go = async () => {
      if (!signInInFlight || !response || !auth) return;

      try {
        if (response.type === 'success') {
          const idToken =
            response.params?.id_token || response.authentication?.idToken;
          if (!idToken) throw new Error('Missing Google ID token.');

          const credential = GoogleAuthProvider.credential(idToken);
          await signInWithCredential(auth, credential);
          setAuthError(null);
        } else if (response.type === 'cancel') {
          setAuthError(null);
        } else {
          setAuthError(response.error?.message ?? 'Google sign-in failed.');
        }
      } catch (e) {
        console.warn('[auth] Google sign-in failed', e);
        setAuthError(e.message ?? 'Google sign-in failed.');
      } finally {
        setSignInInFlight(false);
      }
    };
    go();
  }, [response, auth, signInInFlight]);

  // ---------- actions ----------
  const startGoogleSignIn = useCallback(async () => {
    if (!googleConfigured) {
      setAuthError('Google Sign-In is not configured yet. Check your .env values.');
      return;
    }
    if (!request) {
      setAuthError('Google Sign-In is still initializing. Please try again in a moment.');
      return;
    }
    try {
      setAuthError(null);
      setSignInInFlight(true);
      // Force the proxy so Google gets an HTTPS redirect (no exp://)
      const res = await promptAsync({ useProxy: true, showInRecents: true });
      if (!res || res.type !== 'success') {
        if (!res || res.type === 'cancel') setAuthError(null);
        else setAuthError(res.error?.message ?? 'Google sign-in was cancelled.');
        setSignInInFlight(false);
      }
    } catch (e) {
      console.warn('[auth] Failed to start Google sign-in', e);
      setSignInInFlight(false);
      setAuthError('Unable to start Google sign-in. Please try again.');
    }
  }, [googleConfigured, request, promptAsync]);

  const signOut = useCallback(async () => {
    if (!auth) return;
    try {
      await firebaseSignOut(auth);
      setAuthError(null);
    } catch (e) {
      console.warn('[auth] Sign-out failed', e);
      setAuthError('Unable to sign out. Please try again.');
    }
  }, [auth]);

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
        const pts = data.points ?? 0;
        if (pts < PREMIUM_DAY_COST) throw new Error('Not enough points to unlock premium.');

        const activeUntil =
          data.premiumExpiresAt && data.premiumExpiresAt > now ? data.premiumExpiresAt : now;
        const premiumExpiresAt = activeUntil + PREMIUM_ACCESS_DURATION_MS;

        tx.update(ref, {
          points: pts - PREMIUM_DAY_COST,
          premiumExpiresAt,
          lastPremiumRedeemedAt: now,
          updatedAt: serverTimestamp(),
        });

        return {
          ...data,
          points: pts - PREMIUM_DAY_COST,
          premiumExpiresAt,
          lastPremiumRedeemedAt: now,
        };
      });

      setProfile(result);
      setAuthError(null);
      return { ok: true };
    } catch (e) {
      console.warn('[auth] Premium redemption failed', e);
      setAuthError(e.message ?? 'Unable to unlock premium right now.');
      return { ok: false, error: e.message };
    } finally {
      setRedeemInFlight(false);
    }
  }, [firebaseUser]);

  const clearAuthError = useCallback(() => setAuthError(null), []);

  // ---------- derived ----------
  const hasActivePremium = useMemo(
    () => Boolean(profile?.premiumExpiresAt && profile.premiumExpiresAt > Date.now()),
    [profile?.premiumExpiresAt]
  );

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
      signOut,
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
      signOut,
      redeemPremiumDay,
      clearAuthError,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ---------- hook ----------
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
