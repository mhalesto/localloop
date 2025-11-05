// contexts/AuthContext.js
// Google Sign-In via Expo Auth Session (ID token) -> Firebase Auth -> Firestore profile

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { makeRedirectUri } from 'expo-auth-session';
import * as Linking from 'expo-linking';
import { Platform } from 'react-native';

import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithCredential,
  signOut as firebaseSignOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
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
  EXPO_USERNAME,
  EXPO_SLUG,
  SIGNUP_BONUS_POINTS,
  PREMIUM_DAY_COST,
  PREMIUM_ACCESS_DURATION_MS,
  ENGAGEMENT_POINT_RULES,
  ADMIN_EMAILS,
} from '../constants/authConfig';

// MUST be called at the top level so the auth-session can complete on iOS
WebBrowser.maybeCompleteAuthSession();

const log = (...args) => console.log('[auth]', ...args);
const warn = (...args) => console.warn('[auth]', ...args);

const AuthContext = createContext(null);

const toFriendlyAuthError = (error, fallback = 'Unable to complete that request. Please try again.') => {
  const code = error?.code ?? '';
  switch (code) {
    case 'auth/invalid-email':
      return 'That email address looks incorrect.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
      return 'Incorrect email or password. Please try again.';
    case 'auth/weak-password':
      return 'Choose a stronger password (at least 6 characters).';
    case 'auth/email-already-in-use':
      return 'An account already exists for that email address.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait a moment and try again.';
    case 'auth/network-request-failed':
      return 'Network error while contacting the server. Check your connection and try again.';
    default:
      return error?.message ?? fallback;
  }
};

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
  // PayFast subscription fields
  subscriptionPlan: raw.subscriptionPlan ?? 'basic',
  premiumUnlocked: raw.premiumUnlocked ?? false,
  subscriptionStartDate: ts(raw.subscriptionStartDate),
  subscriptionEndDate: ts(raw.subscriptionEndDate),
  payFastPaymentId: raw.payFastPaymentId ?? null,
  payFastToken: raw.payFastToken ?? null,
});

// ---------- provider ----------
export function AuthProvider({ children }) {
  const auth = useMemo(() => sharedAuth ?? null, []);
  const googleConfigured = useMemo(() => isGoogleAuthConfigured(), []);
  const requiresIosClientId = Platform.OS === 'ios';
  const iosClientIdForRequest = useMemo(() => {
    if (requiresIosClientId) {
      return (
        googleAuthConfig.iosClientId ||
        googleAuthConfig.expoClientId ||
        googleAuthConfig.webClientId ||
        'disabled-ios-client-id'
      );
    }
    return googleAuthConfig.iosClientId || undefined;
  }, [requiresIosClientId]);
  const googleReadyOnThisPlatform = useMemo(
    () => googleConfigured && (!requiresIosClientId || Boolean(googleAuthConfig.iosClientId)),
    [googleConfigured, requiresIosClientId]
  );

  // We **force** the Expo proxy redirect for Expo Go
  // const redirectUri = useMemo(() => {
  //   const forced = `https://auth.expo.io/@${EXPO_USERNAME}/${EXPO_SLUG}`;
  //   log('redirectUri (forced):', forced);
  //   return forced;
  // }, []);
  const redirectUri = useMemo(() => {
    const projectNameForProxy = `@${EXPO_USERNAME}/${EXPO_SLUG}`;
    log('proxy config', { EXPO_USERNAME, EXPO_SLUG, projectNameForProxy });
    const uri = makeRedirectUri({
      useProxy: true,
      projectNameForProxy,
    });
    log('redirectUri (proxy):', uri);
    return uri;
  }, []);

  // Show the exact client IDs we’ll use
  useEffect(() => {
    log('clientIds:', JSON.stringify(googleAuthConfig));
  }, []);

  // -- Create the Google request (ID TOKEN flow) --
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    expoClientId:
      googleAuthConfig.expoClientId || googleAuthConfig.webClientId || undefined,
    webClientId: googleAuthConfig.webClientId || undefined,
    iosClientId: iosClientIdForRequest,
    androidClientId: googleAuthConfig.androidClientId || undefined,
    scopes: ['openid', 'profile', 'email'],
    redirectUri, // force proxy URL
    // NOTE: do not pass responseType; the `useIdTokenAuthRequest` hook sets it.
  });

  const [firebaseUser, setFirebaseUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [initializing, setInitializing] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [signInInFlight, setSignInInFlight] = useState(false);
  const [redeemInFlight, setRedeemInFlight] = useState(false);
  const [resetInFlight, setResetInFlight] = useState(false);

  const adminEmailSet = useMemo(
    () => new Set((ADMIN_EMAILS ?? []).map((email) => email.toLowerCase())),
    []
  );
  const isAdmin = useMemo(() => {
    const email = (firebaseUser?.email ?? profile?.email ?? '').toLowerCase();
    return email ? adminEmailSet.has(email) : false;
  }, [adminEmailSet, firebaseUser?.email, profile?.email]);

  const urlSeenRef = useRef(0);

  // Extra diagnostics: log any URL that tries to wake the app
  useEffect(() => {
    const onUrl = ({ url }) => {
      urlSeenRef.current++;
      log('Linking URL event (#' + urlSeenRef.current + '):', url);
    };
    const sub = Linking.addEventListener('url', onUrl);
    Linking.getInitialURL().then((u) => {
      if (u) log('Initial URL:', u);
    });
    return () => sub.remove();
  }, []);

  // Log request creation (helps find rerender loops)
  useEffect(() => {
    if (request) {
      log(
        'request ready (should be id_token flow):',
        JSON.stringify({
          clientId: String(request.clientId || '').slice(0, 10) + '…',
          redirectUri: request.redirectUri,
          responseType: request.responseType,
        })
      );
    }
  }, [request]);

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
      warn('Failed to load profile', e);
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
      log('onAuthStateChanged user:', !!u, u?.uid);
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

      log('OAuth response:', JSON.stringify(response));

      try {
        if (response.type === 'success') {
          const idToken =
            response.params?.id_token || response.authentication?.idToken;
          if (!idToken) throw new Error('Missing Google ID token.');

          const credential = GoogleAuthProvider.credential(idToken);
          await signInWithCredential(auth, credential);
          setAuthError(null);
        } else if (response.type === 'cancel') {
          // This is what you’re seeing when the proxy cannot finish the session.
          setAuthError(
            'Sign-in was cancelled by the provider or the proxy could not finish. ' +
            'Double-check: Google redirect URI https://auth.expo.io/@' +
            `${EXPO_USERNAME}/${EXPO_SLUG}, Expo Go is logged in as ${EXPO_USERNAME}, and avoid reloading during sign-in.`
          );
        } else if (response.type === 'error') {
          setAuthError(response.error?.message ?? 'Google sign-in failed.');
        } else {
          setAuthError('Google sign-in failed.');
        }
      } catch (e) {
        warn('Google sign-in failed', e);
        setAuthError(e.message ?? 'Google sign-in failed.');
      } finally {
        setSignInInFlight(false);
      }
    };
    go();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [response, auth, signInInFlight]);

  // ---------- actions ----------
  const startGoogleSignIn = useCallback(async () => {
    if (!googleConfigured) {
      setAuthError('Google Sign-In is not configured yet. Check .env values.');
      return;
    }
    if (!googleReadyOnThisPlatform) {
      setAuthError(
        'Google Sign-In is temporarily disabled on this platform until EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID is defined.'
      );
      return;
    }
    if (!request) {
      setAuthError('Google Sign-In is still initializing. Please try again.');
      return;
    }

    try {
      setAuthError(null);
      setSignInInFlight(true);

      // iOS stability: warm up SFSafariViewController
      if (Platform.OS === 'ios') {
        try {
          await WebBrowser.warmUpAsync();
        } catch { }
      }

      log('promptAsync open', {
        projectNameForProxy: `@${EXPO_USERNAME}/${EXPO_SLUG}`,
        redirectUri,
      });

      // Use the proxy (required in Expo Go)
      const res = await promptAsync({
        useProxy: true,
        projectNameForProxy: `@${EXPO_USERNAME}/${EXPO_SLUG}`,
        preferEphemeralSession: false, // flip to true if you see cookie issues
        showInRecents: true,
      });

      log('promptAsync result:', JSON.stringify(res));

      if (!res || res.type !== 'success') {
        // Don’t set error here; the response effect will, but we keep a guard:
        if (res?.type === 'cancel') {
          // let the response effect set the friendly message
        } else if (res?.type === 'dismiss') {
          setAuthError('Sign-in window was dismissed.');
          setSignInInFlight(false);
        }
      }
    } catch (e) {
      warn('Failed to start Google sign-in', e);
      setSignInInFlight(false);
      setAuthError('Unable to start Google sign-in. Please try again.');
    } finally {
      if (Platform.OS === 'ios') {
        try {
          await WebBrowser.coolDownAsync();
        } catch { }
      }
    }
  }, [googleConfigured, googleReadyOnThisPlatform, request, promptAsync, redirectUri]);

  const signInWithEmail = useCallback(
    async ({ email, password }) => {
      if (!auth) {
        setAuthError('Auth is still initializing. Please try again.');
        return { ok: false, error: 'auth_unavailable' };
      }
      setAuthError(null);
      setSignInInFlight(true);
      try {
        await signInWithEmailAndPassword(auth, email.trim(), password);
        return { ok: true };
      } catch (e) {
        warn('Email sign-in failed', e);
        setAuthError(toFriendlyAuthError(e, 'Unable to sign in with email right now.'));
        return { ok: false, error: e.code ?? e.message };
      } finally {
        setSignInInFlight(false);
      }
    },
    [auth]
  );

  const signUpWithEmail = useCallback(
    async ({ email, password, displayName }) => {
      if (!auth) {
        setAuthError('Auth is still initializing. Please try again.');
        return { ok: false, error: 'auth_unavailable' };
      }
      setAuthError(null);
      setSignInInFlight(true);
      try {
        const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
        const wantsDisplayName = displayName?.trim();
        if (wantsDisplayName) {
          try {
            await updateProfile(cred.user, { displayName: wantsDisplayName });
          } catch (updateError) {
            warn('Failed to update profile display name', updateError);
          }
        }
        return { ok: true };
      } catch (e) {
        warn('Email sign-up failed', e);
        setAuthError(toFriendlyAuthError(e, 'Unable to create an account right now.'));
        return { ok: false, error: e.code ?? e.message };
      } finally {
        setSignInInFlight(false);
      }
    },
    [auth]
  );

  const sendResetEmail = useCallback(
    async (email) => {
      if (!auth) {
        setAuthError('Auth is still initializing. Please try again.');
        return { ok: false, error: 'auth_unavailable' };
      }
      setAuthError(null);
      setResetInFlight(true);
      try {
        await sendPasswordResetEmail(auth, email.trim());
        return { ok: true };
      } catch (e) {
        warn('Password reset email failed', e);
        setAuthError(toFriendlyAuthError(e, 'Unable to send password reset email.'));
        return { ok: false, error: e.code ?? e.message };
      } finally {
        setResetInFlight(false);
      }
    },
    [auth]
  );

  const adjustPoints = useCallback(
    async (delta, { reason = 'adjustment' } = {}) => {
      if (!db || !firebaseUser) {
        return { ok: false, error: 'not_authenticated' };
      }
      if (!Number.isFinite(delta) || delta === 0) {
        return { ok: false, error: 'invalid_delta' };
      }

      try {
        const result = await runTransaction(db, async (tx) => {
          const ref = doc(db, 'users', firebaseUser.uid);
          const snap = await tx.get(ref);
          if (!snap.exists()) {
            throw new Error('Profile not found.');
          }

          const data = snap.data() ?? {};
          const currentPoints = Number.isFinite(data.points) ? data.points : 0;
          const nextPoints = Math.max(0, Math.round(currentPoints + delta));

          const updatePayload = {
            points: nextPoints,
            updatedAt: serverTimestamp(),
          };
          if (reason === 'engagement') {
            updatePayload.lastEngagementAt = serverTimestamp();
          }

          tx.set(ref, updatePayload, { merge: true });
          return nextPoints;
        });

        setProfile((prev) => (prev ? { ...prev, points: result } : prev));
        return { ok: true, points: result };
      } catch (e) {
        warn('Adjust points failed', e);
        return { ok: false, error: e?.message ?? 'adjust_points_failed' };
      }
    },
    [db, firebaseUser]
  );

  const awardEngagementPoints = useCallback(
    async (type, { amount } = {}) => {
      const base = Number.isFinite(amount)
        ? Number(amount)
        : Number(ENGAGEMENT_POINT_RULES[type] ?? 0);
      if (!base) {
        return { ok: false, error: 'unsupported_engagement_type' };
      }

      const result = await adjustPoints(base, { reason: 'engagement' });
      if (!result.ok && result.error === 'not_authenticated') {
        // Silently ignore for guests.
        return { ok: false, error: 'not_authenticated' };
      }
      return result;
    },
    [adjustPoints]
  );

  const signOut = useCallback(async () => {
    if (!auth) return;
    try {
      await firebaseSignOut(auth);
      setAuthError(null);
    } catch (e) {
      warn('Sign-out failed', e);
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
      warn('Premium redemption failed', e);
      setAuthError(e.message ?? 'Unable to unlock premium right now.');
      return { ok: false, error: e.message };
    } finally {
      setRedeemInFlight(false);
    }
  }, [firebaseUser]);

  const clearAuthError = useCallback(() => setAuthError(null), []);

  // ---------- derived ----------
  const hasActivePremium = useMemo(() => {
    const now = Date.now();

    // Check points-based premium (old system)
    const pointsPremium = Boolean(profile?.premiumExpiresAt && profile.premiumExpiresAt > now);

    // Check PayFast subscription (new system)
    const payFastPremium = Boolean(
      profile?.premiumUnlocked &&
      profile?.subscriptionEndDate &&
      profile.subscriptionEndDate > now
    );

    return pointsPremium || payFastPremium;
  }, [profile?.premiumExpiresAt, profile?.premiumUnlocked, profile?.subscriptionEndDate]);

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
      canUseGoogleSignIn: googleReadyOnThisPlatform && Boolean(request),
      startGoogleSignIn,
      signInWithEmail,
      signUpWithEmail,
      sendPasswordReset: sendResetEmail,
      isResettingPassword: resetInFlight,
      awardEngagementPoints,
      isAdmin,
      signOut,
      redeemPremiumDay,
      clearAuthError,
      googleReadyOnThisPlatform,
    }),
    [
      firebaseUser,
      profile,
      initializing,
      signInInFlight,
      redeemInFlight,
      resetInFlight,
      authError,
      hasActivePremium,
      pointsToNextPremium,
      googleConfigured,
      googleReadyOnThisPlatform,
      request,
      startGoogleSignIn,
      signInWithEmail,
      signUpWithEmail,
      sendResetEmail,
      awardEngagementPoints,
      isAdmin,
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
