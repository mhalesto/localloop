// src/auth/useExpoGoogleAuth.js
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { ResponseType } from 'expo-auth-session';
import {
  initializeAuth,
  getReactNativePersistence,
  GoogleAuthProvider,
  signInWithCredential,
} from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { firebaseApp } from '../firebase'; // <-- adjust path

WebBrowser.maybeCompleteAuthSession();

let auth;
try {
  auth = initializeAuth(firebaseApp, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch {
  const { getAuth } = require('firebase/auth');
  auth = getAuth(firebaseApp);
}

const EXPO_USERNAME = process.env.EXPO_PUBLIC_EXPO_USERNAME;
const EXPO_SLUG = process.env.EXPO_PUBLIC_EXPO_SLUG;
const REDIRECT_URI = `https://auth.expo.io/@${EXPO_USERNAME}/${EXPO_SLUG}`;

const GOOGLE_EXPO_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID;
const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
const GOOGLE_ANDROID_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;

const nonce = () =>
  Math.random().toString(36).slice(2) + '-' + Date.now().toString(36);

export function useExpoGoogleAuth() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const handledOnce = useRef(false);

  const ids = useMemo(
    () => ({
      expoClientId: GOOGLE_EXPO_CLIENT_ID || GOOGLE_WEB_CLIENT_ID || undefined,
      webClientId: GOOGLE_WEB_CLIENT_ID || undefined,
      iosClientId: GOOGLE_IOS_CLIENT_ID || undefined,
      androidClientId: GOOGLE_ANDROID_CLIENT_ID || undefined,
    }),
    []
  );

  const [request, response, promptAsync] = Google.useAuthRequest({
    // *** FIX 1: force ID TOKEN flow (NOT "code") ***
    responseType: ResponseType.IdToken,
    expoClientId: ids.expoClientId,
    iosClientId: ids.iosClientId,
    androidClientId: ids.androidClientId,
    webClientId: ids.webClientId,
    redirectUri: REDIRECT_URI,
    scopes: ['openid', 'profile', 'email'],
    selectAccount: true,
    extraParams: { nonce: nonce() },
  });

  useEffect(() => {
    if (!loading) return;
    if (!response) return;

    // *** FIX 2: guard so this effect runs only once per attempt ***
    if (handledOnce.current) return;
    handledOnce.current = true;

    (async () => {
      try {
        if (response.type === 'success' && response.params?.id_token) {
          const credential = GoogleAuthProvider.credential(response.params.id_token);
          await signInWithCredential(auth, credential);
          setError(null);
        } else if (response.type === 'cancel') {
          setError('Sign-in was cancelled.');
        } else if (response.type === 'error') {
          setError(response.error?.message || 'Google sign-in failed.');
        }
      } catch (e) {
        setError(e?.message || 'Could not sign in with Firebase.');
      } finally {
        setLoading(false);
      }
    })();
  }, [response, loading]);

  const startGoogleSignIn = useCallback(async () => {
    setError(null);
    if (!request) return;

    handledOnce.current = false;
    setLoading(true);

    const res = await promptAsync({
      useProxy: true,
      projectNameForProxy: `@${EXPO_USERNAME}/${EXPO_SLUG}`,
      preferEphemeralSession: Platform.OS === 'ios',
      showInRecents: true,
    });

    if (res?.type === 'cancel') {
      setError('Sign-in was cancelled.');
      setLoading(false);
    }
  }, [request]);

  const canUseGoogleSignIn = Boolean(ids.expoClientId || ids.webClientId);

  return { startGoogleSignIn, loading, error, auth, canUseGoogleSignIn };
}
