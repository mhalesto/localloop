// contexts/AuthContext.js
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from 'react';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithCredential,
  signOut as firebaseSignOut
} from 'firebase/auth';
import {
  doc,
  getDoc,
  runTransaction,
  serverTimestamp,
  setDoc
} from 'firebase/firestore';
import { app, db } from '../api/firebaseClient';
import {
  googleAuthConfig,
  isGoogleAuthConfigured,
  SIGNUP_BONUS_POINTS,
  PREMIUM_DAY_COST,
  PREMIUM_ACCESS_DURATION_MS
} from '../constants/authConfig';

WebBrowser.maybeCompleteAuthSession();

const AuthContext = createContext(null);

const normalizeTimestamp = (value) => {
  if (!value) {
    return null;
  }
  if (typeof value === 'number') {
    return value;
  }
  if (typeof value.toMillis === 'function') {
    return value.toMillis();
  }
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
  lastPremiumRedeemedAt: normalizeTimestamp(raw.lastPremiumRedeemedAt)
});

const getAuthInstance = () => {
  if (!app) {
    return null;
  }
  try {
    return getAuth(app);
  } catch (error) {
    console.warn('[auth] Unable to initialize Firebase auth', error);
    return null;
  }
};

export function AuthProvider({ children }) {
  const auth = useMemo(() => getAuthInstance(), []);
  const googleConfigured = useMemo(() => isGoogleAuthConfigured(), []);
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [initializing, setInitializing] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [signInInFlight, setSignInInFlight] = useState(false);
  const [redeemInFlight, setRedeemInFlight] = useState(false);

  const [request, response, promptAsync] = Google.useAuthRequest({
    expoClientId: googleAuthConfig.expoClientId || undefined,
    iosClientId: googleAuthConfig.iosClientId || undefined,
    androidClientId: googleAuthConfig.androidClientId || undefined,
    webClientId: googleAuthConfig.webClientId || undefined,
    selectAccount: true
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
        const snapshot = await getDoc(ref);
        if (!snapshot.exists()) {
          const baseData = {
            displayName: user.displayName ?? '',
            email: user.email ?? '',
            photoURL: user.photoURL ?? '',
            points: SIGNUP_BONUS_POINTS,
            premiumExpiresAt: null,
            signupBonusAwardedAt: now,
            lastLoginAt: now,
            providers: (user.providerData ?? []).map((provider) => provider.providerId)
          };
          await setDoc(
            ref,
            {
              ...baseData,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp()
            },
            { merge: false }
          );
          setProfile(normalizeProfile(baseData));
          return;
        }
        const data = snapshot.data();
        const nextProfile = normalizeProfile(data);
        const updates = {};
        if ((user.displayName ?? '') !== nextProfile.displayName) {
          updates.displayName = user.displayName ?? '';
          nextProfile.displayName = updates.displayName;
        }
        if ((user.email ?? '') !== nextProfile.email) {
          updates.email = user.email ?? '';
          nextProfile.email = updates.email;
        }
        if ((user.photoURL ?? '') !== nextProfile.photoURL) {
          updates.photoURL = user.photoURL ?? '';
          nextProfile.photoURL = updates.photoURL;
        }
        updates.lastLoginAt = now;
        nextProfile.lastLoginAt = now;
        const providers = (user.providerData ?? []).map((provider) => provider.providerId);
        if (providers.length) {
          updates.providers = providers;
        }
        if (Object.keys(updates).length > 0) {
          await setDoc(
            ref,
            {
              ...updates,
              updatedAt: serverTimestamp()
            },
            { merge: true }
          );
        }
        setProfile(nextProfile);
      } catch (error) {
        console.warn('[auth] Failed to load profile', error);
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
    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setFirebaseUser(nextUser);
      if (nextUser) {
        hydrateProfile(nextUser);
      } else {
        setProfile(null);
      }
      setInitializing(false);
    });
    return unsubscribe;
  }, [auth, hydrateProfile]);

  useEffect(() => {
    const handleResponse = async () => {
      if (!signInInFlight || !response || !auth) {
        return;
      }
      if (response.type === 'success') {
        try {
          const idToken = response.authentication?.idToken;
          if (!idToken) {
            throw new Error('Missing Google ID token.');
          }
          const credential = GoogleAuthProvider.credential(idToken);
          await signInWithCredential(auth, credential);
          setAuthError(null);
        } catch (error) {
          console.warn('[auth] Google credential sign-in failed', error);
          setAuthError(error.message ?? 'Google sign-in failed. Please try again.');
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
    handleResponse();
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
      const result = await promptAsync();
      if (!result || result.type !== 'success') {
        if (!result || result.type === 'cancel') {
          setAuthError(null);
        } else {
          setAuthError(result.error?.message ?? 'Google sign-in was cancelled.');
        }
        setSignInInFlight(false);
      }
    } catch (error) {
      console.warn('[auth] Failed to start Google sign-in', error);
      setSignInInFlight(false);
      setAuthError('Unable to start Google sign-in. Please try again.');
    }
  }, [googleConfigured, request, promptAsync]);

  const signOut = useCallback(async () => {
    if (!auth) {
      return;
    }
    try {
      await firebaseSignOut(auth);
      setAuthError(null);
    } catch (error) {
      console.warn('[auth] Sign-out failed', error);
      setAuthError('Unable to sign out. Please try again.');
    }
  }, [auth]);

  const refreshProfile = useCallback(async () => {
    if (firebaseUser) {
      await hydrateProfile(firebaseUser);
    }
  }, [firebaseUser, hydrateProfile]);

  const redeemPremiumDay = useCallback(async () => {
    if (!db || !firebaseUser) {
      setAuthError('Sign in to unlock premium access.');
      return { ok: false, error: 'not_authenticated' };
    }
    setRedeemInFlight(true);
    try {
      const result = await runTransaction(db, async (transaction) => {
        const ref = doc(db, 'users', firebaseUser.uid);
        const snapshot = await transaction.get(ref);
        if (!snapshot.exists()) {
          throw new Error('Profile not found.');
        }
        const data = normalizeProfile(snapshot.data());
        const now = Date.now();
        const currentPoints = data.points ?? 0;
        if (currentPoints < PREMIUM_DAY_COST) {
          throw new Error('Not enough points to unlock premium.');
        }
        const activeUntil =
          data.premiumExpiresAt && data.premiumExpiresAt > now ? data.premiumExpiresAt : now;
        const premiumExpiresAt = activeUntil + PREMIUM_ACCESS_DURATION_MS;
        transaction.update(ref, {
          points: currentPoints - PREMIUM_DAY_COST,
          premiumExpiresAt,
          lastPremiumRedeemedAt: now,
          updatedAt: serverTimestamp()
        });
        return {
          ...data,
          points: currentPoints - PREMIUM_DAY_COST,
          premiumExpiresAt,
          lastPremiumRedeemedAt: now
        };
      });
      setProfile(result);
      setAuthError(null);
      return { ok: true };
    } catch (error) {
      console.warn('[auth] Premium redemption failed', error);
      setAuthError(error.message ?? 'Unable to unlock premium right now.');
      return { ok: false, error: error.message };
    } finally {
      setRedeemInFlight(false);
    }
  }, [firebaseUser, db]);

  const clearAuthError = useCallback(() => setAuthError(null), []);

  const hasActivePremium = useMemo(() => {
    if (!profile?.premiumExpiresAt) {
      return false;
    }
    return profile.premiumExpiresAt > Date.now();
  }, [profile?.premiumExpiresAt]);

  const pointsToNextPremium = useMemo(() => {
    if (!profile) {
      return PREMIUM_DAY_COST;
    }
    if (hasActivePremium) {
      return 0;
    }
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
      clearAuthError
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
      clearAuthError
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
