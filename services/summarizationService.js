import { Platform } from 'react-native';
import Constants from 'expo-constants';

const DEFAULT_PORT = 4000;
const SUMMARY_PATH = '/summaries';

let cachedBaseUrl = null;

const sanitizeHost = (value) => {
  if (typeof value !== 'string' || !value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const hasProtocol = /:\/\//.test(trimmed);
  try {
    const url = hasProtocol ? new URL(trimmed) : new URL(`http://${trimmed}`);
    return url.hostname || null;
  } catch (_error) {
    const withoutPath = trimmed.split('/')[0];
    const withoutPort = withoutPath.split(':')[0];
    return withoutPort || null;
  }
};

const resolveBaseUrl = () => {
  if (cachedBaseUrl) return cachedBaseUrl;

  // 1) Env override (supports Expo extra)
  const extra = (Constants?.expoConfig?.extra || {});
  const envUrl =
    (typeof process !== 'undefined' &&
      (process.env?.EXPO_PUBLIC_SUMMARY_API_URL || process.env?.SUMMARY_API_URL)) ||
    extra.EXPO_PUBLIC_SUMMARY_API_URL ||
    null;
  if (envUrl) {
    cachedBaseUrl = String(envUrl).replace(/\/$/, '');
    return cachedBaseUrl;
  }

  // 2) Web: use window location
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window?.location?.protocol && window.location.hostname) {
      cachedBaseUrl = `${window.location.protocol}//${window.location.hostname}:${DEFAULT_PORT}`;
    } else {
      cachedBaseUrl = `http://localhost:${DEFAULT_PORT}`;
    }
    return cachedBaseUrl;
  }

  // 3) Expo host candidates
  const hostCandidates = [
    Constants?.expoConfig?.hostUri,
    Constants?.expoGoConfig?.hostUri,
    Constants?.manifest2?.extra?.expoClient?.hostUri,
    Constants?.manifest?.hostUri
  ];

  for (const candidate of hostCandidates) {
    let host = sanitizeHost(candidate);
    if (host) {
      // Android emulator maps host to 10.0.2.2
      if (Platform.OS === 'android' && (host === 'localhost' || host === '127.0.0.1')) {
        host = '10.0.2.2';
      }
      cachedBaseUrl = `http://${host}:${DEFAULT_PORT}`;
      return cachedBaseUrl;
    }
  }

  // 4) Final fallback
  if (typeof window !== 'undefined' && window?.location?.hostname) {
    cachedBaseUrl = `${window.location.protocol}//${window.location.hostname}:${DEFAULT_PORT}`;
    return cachedBaseUrl;
  }

  cachedBaseUrl = Platform.OS === 'android'
    ? `http://10.0.2.2:${DEFAULT_PORT}`
    : `http://127.0.0.1:${DEFAULT_PORT}`;
  return cachedBaseUrl;
};

const buildEndpoint = (path) => {
  const baseUrl = resolveBaseUrl();
  const trimmedBase = baseUrl.replace(/\/$/, '');
  return `${trimmedBase}${path}`;
};

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

  // Auto-timeout unless caller supplies a signal
  const controller = !signal && typeof AbortController !== 'undefined' ? new AbortController() : null;
  let timer = null;
  if (!signal && controller) {
    timer = setTimeout(() => controller.abort(), timeoutMs);
  }

  try {
    const response = await fetch(buildEndpoint(SUMMARY_PATH), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bodyPayload),
      signal: signal ?? controller?.signal
    });

    const payload = await response.json();

    if (!response.ok) {
      const message = payload?.error ?? 'Unable to summarize description.';
      throw new Error(message);
    }

    if (!payload?.summary) {
      throw new Error('Summary response was empty.');
    }

    return {
      summary: String(payload.summary).trim(),
      model: payload.model ?? 'Xenova/distilbart-cnn-6-6',
      options: payload.options || null,
      fallback: Boolean(payload.fallback)
    };
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new Error('Summary request timed out. Please try again.');
    }
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(message || 'Failed to summarize description.');
  } finally {
    if (timer) clearTimeout(timer);
  }
}
