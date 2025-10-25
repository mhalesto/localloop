// src/services/summarizationService.js
import { Platform } from 'react-native';
import Constants from 'expo-constants';

const DEFAULT_PORT = 4000;
const SUMMARY_PATH = '/summaries';

let cachedBaseUrl = null;

const sanitizeHost = (value) => {
  if (typeof value !== 'string' || !value.trim()) return null;
  const trimmed = value.trim();
  const hasProtocol = /:\/\//.test(trimmed);
  try {
    const url = hasProtocol ? new URL(trimmed) : new URL(`http://${trimmed}`);
    return url.hostname || null;
  } catch (_e) {
    const withoutPath = trimmed.split('/')[0];
    const withoutPort = withoutPath.split(':')[0];
    return withoutPort || null;
  }
};

const resolveBaseUrl = () => {
  if (cachedBaseUrl) return cachedBaseUrl;

  // 1) explicit env overrides
  const extra = (Constants?.expoConfig?.extra || {});
  const envUrl =
    (typeof process !== 'undefined' &&
      (process.env?.EXPO_PUBLIC_SUMMARY_API_URL || process.env?.SUMMARY_API_URL)) ||
    extra.EXPO_PUBLIC_SUMMARY_API_URL ||
    null;

  if (envUrl) {
    cachedBaseUrl = String(envUrl).replace(/\/$/, '');
    if (__DEV__) console.log('[summaryApi] base (env):', cachedBaseUrl);
    return cachedBaseUrl;
  }

  // 2) web
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window?.location?.protocol && window.location.hostname) {
      cachedBaseUrl = `${window.location.protocol}//${window.location.hostname}:${DEFAULT_PORT}`;
    } else {
      cachedBaseUrl = `http://localhost:${DEFAULT_PORT}`;
    }
    if (__DEV__) console.log('[summaryApi] base (web):', cachedBaseUrl);
    return cachedBaseUrl;
  }

  // 3) Expo Go host candidates
  const hostCandidates = [
    Constants?.expoConfig?.hostUri,
    Constants?.expoGoConfig?.hostUri,
    Constants?.manifest2?.extra?.expoClient?.hostUri,
    Constants?.manifest?.hostUri,
  ];

  for (const candidate of hostCandidates) {
    let host = sanitizeHost(candidate);
    if (host) {
      if (Platform.OS === 'android' && (host === 'localhost' || host === '127.0.0.1')) {
        host = '10.0.2.2';
      }
      cachedBaseUrl = `http://${host}:${DEFAULT_PORT}`;
      if (__DEV__) console.log('[summaryApi] base (expo host):', cachedBaseUrl);
      return cachedBaseUrl;
    }
  }

  // 4) last fallbacks
  if (typeof window !== 'undefined' && window?.location?.hostname) {
    cachedBaseUrl = `${window.location.protocol}//${window.location.hostname}:${DEFAULT_PORT}`;
    if (__DEV__) console.log('[summaryApi] base (window host):', cachedBaseUrl);
    return cachedBaseUrl;
  }

  cachedBaseUrl =
    Platform.OS === 'android' ? `http://10.0.2.2:${DEFAULT_PORT}` : `http://127.0.0.1:${DEFAULT_PORT}`;
  if (__DEV__) console.log('[summaryApi] base (platform fallback):', cachedBaseUrl);
  return cachedBaseUrl;
};

const buildEndpoint = (path) => {
  const baseUrl = resolveBaseUrl();
  const trimmedBase = baseUrl.replace(/\/$/, '');
  return `${trimmedBase}${path}`;
};

export const getSummaryBaseUrl = () => resolveBaseUrl();

const clean = (s) =>
  String(s)
    .replace(/\uFFFD/g, '')                    // replacement char
    .replace(/[\u200B-\u200D\u2060]/g, '')     // zero-widths
    .replace(/\s{2,}/g, ' ')                   // collapse spaces
    .trim();

export async function summarizePostDescription(
  description,
  { signal, lengthPreference, timeoutMs = 20000 } = {}
) {
  const text = typeof description === 'string' ? description.trim() : '';
  if (!text) {
    throw new Error('Add a description before requesting a summary.');
  }

  const requestOptions = {};
  if (typeof lengthPreference === 'string' && lengthPreference) {
    requestOptions.lengthPreference = lengthPreference;
  }

  const bodyPayload = { text };
  if (Object.keys(requestOptions).length) {
    bodyPayload.options = requestOptions;
  }

  const controller = !signal && typeof AbortController !== 'undefined' ? new AbortController() : null;
  let timer = null;
  if (!signal && controller) {
    timer = setTimeout(() => controller.abort(), timeoutMs);
  }

  try {
    const endpoint = buildEndpoint(SUMMARY_PATH);
    if (__DEV__) console.log('[summaryApi] POST', endpoint);

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bodyPayload),
      signal: signal ?? controller?.signal,
    });

    let payload = null;
    try {
      payload = await response.json();
    } catch (_) { }

    if (!response.ok) {
      const message = payload?.error || `Request failed (${response.status})`;
      throw new Error(message);
    }

    if (!payload?.summary) {
      throw new Error('Summary response was empty.');
    }

    return {
      summary: clean(String(payload.summary)).normalize('NFC'),
      model: payload.model ?? 'Xenova/distilbart-cnn-6-6',
      options: payload.options || null,
      fallback: Boolean(payload.fallback),
    };
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new Error('Summary request timed out. Please try again.');
    }
    throw new Error(error?.message || 'Failed to summarize description.');
  } finally {
    if (timer) clearTimeout(timer);
  }
}
