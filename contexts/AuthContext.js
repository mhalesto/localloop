// contexts/AuthContext.js
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
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithCredential,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import { doc, getDoc, runTransaction, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db } from '../api/firebaseClient';
import {
  googleAuthConfig,
  isGoogleAuthConfigured,
  SIGNUP_BONUS_POINTS,
  PREMIUM_DAY_COST,
  PREMIUM_ACCESS_DURATION_MS,
  APP_SCHEME,
} from '../constants/authConfig';

WebBrowser.maybeCompleteAuthSession();

const AuthContext = createContext(null);

const normalizeTimestamp = (v) => {
  if (!v) return null;
  if (typeof v === 'number') return v;
  if (typeof v?.toMillis === 'function') return v.toMillis();
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

// Treat anything that isn't a standalone store build as "Expo client/dev"
const isExpoClient = Constants.appOwnership !== 'standalone';

export function AuthProvider({ children }) {
  const googleConfigured = useMemo(() => isGoogleAuthConfigured(), []);

  const [firebaseUser, setFirebaseUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [initializing, setInitializing] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [signInInFlight, setSignInInFlight] = useState(false);
  const [redeemInFlight, setRedeemInFlight] = useState(false);

  const redirectUri = useMemo(
    () =>
      makeRedirectUri({
        scheme: APP_SCHEME,          // e.g. "toilet"
        useProxy: isExpoClient,      // proxy for Expo Go/dev client
      }),
    []
  );

  // Provide platform client IDs. We *always* define ios/android here
  // (falling back to the Expo client ID) so the hook never throws.
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    expoClientId: googleAuthConfig.expoClientId || undefined,
    iosClientId: googleAuthConfig.iosClientId || undefined,
    androidClientId: googleAuthConfig.androidClientId || undefined,
    webClientId: googleAuthConfig.webClientId || undefined,
    selectAccount: true,
    scopes: ['openid', 'profile', 'email'],
    redirectUri,
  });

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
          const baseData = {
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
            { ...baseData, createdAt: serverTimestamp(), updatedAt: serverTimestamp() },
            { merge: false }
          );
          setProfile(normalizeProfile(baseData));
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

  useEffect(() => {
    const run = async () => {
      if (!signInInFlight || !response || !auth) return;

      if (response.type === 'success') {
        try {
          const idToken = response.params?.id_token || response.authentication?.idToken;
          if (!idToken) throw new Error('Missing Google ID token.');
          const cred = GoogleAuthProvider.credential(idToken);
          await signInWithCredential(auth, cred);
          setAuthError(null);
        } catch (e) {
          console.warn('[auth] Google credential sign-in failed', e);
          setAuthError(e.message ?? 'Google sign-in failed. Please try again.');
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
    run();
  }, [response, auth, signInInFlight]);

  const startGoogleSignIn = useCallback(async () => {
    if (!googleConfigured) {
      setAuthError('Google Sign-In is not configured yet. Update constants/authConfig.js.');
      return;
    }
    if (!request) {
      setAuthError('Google Sign-In is still initializing. Please try again in a moment.');
      return;
    }
    try {
      setAuthError(null);
      setSignInInFlight(true);
      const result = await promptAsync({ useProxy: isExpoClient, showInRecents: true });
      if (!result || result.type !== 'success') {
        if (!result || result.type === 'cancel') setAuthError(null);
        else setAuthError(result.error?.message ?? 'Google sign-in was cancelled.');
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
  }, []);

  const refreshProfile = useCallback(async () => {
    if (firebaseUser) await hydrateProfile(firebaseUser);
  }, [firebaseUser, hydrateProfile]);

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
    } catch (e) {
      console.warn('[auth] Premium redemption failed', e);
      setAuthError(e.message ?? 'Unable to unlock premium right now.');
      return { ok: false, error: e.message };
    } finally {
      setRedeemInFlight(false);
    }
  }, [firebaseUser]);

  const clearAuthError = useCallback(() => setAuthError(null), []);

  const hasActivePremium = useMemo(
    () => !!(profile?.premiumExpiresAt && profile.premiumExpiresAt > Date.now()),
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
      refreshProfile,
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
      refreshProfile,
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
