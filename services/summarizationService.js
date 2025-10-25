import { Platform } from 'react-native';
import Constants from 'expo-constants';

const DEFAULT_PORT = 4000;
const SUMMARY_PATH = '/summaries';

let cachedBaseUrl = null;

const sanitizeHost = (value) => {
  if (typeof value !== 'string' || !value) {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

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
  if (cachedBaseUrl) {
    return cachedBaseUrl;
  }

  const envUrl =
    (typeof process !== 'undefined' &&
      (process.env?.EXPO_PUBLIC_SUMMARY_API_URL || process.env?.SUMMARY_API_URL)) ||
    null;
  if (envUrl) {
    cachedBaseUrl = envUrl;
    return cachedBaseUrl;
  }

  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window?.location?.protocol && window.location.hostname) {
      cachedBaseUrl = `${window.location.protocol}//${window.location.hostname}:${DEFAULT_PORT}`;
    } else {
      cachedBaseUrl = `http://localhost:${DEFAULT_PORT}`;
    }
    return cachedBaseUrl;
  }

  const hostCandidates = [
    Constants?.expoConfig?.hostUri,
    Constants?.expoGoConfig?.hostUri,
    Constants?.manifest2?.extra?.expoClient?.hostUri,
    Constants?.manifest?.hostUri
  ];

  for (const candidate of hostCandidates) {
    const host = sanitizeHost(candidate);
    if (host) {
      cachedBaseUrl = `http://${host}:${DEFAULT_PORT}`;
      return cachedBaseUrl;
    }
  }

  if (typeof window !== 'undefined' && window?.location?.hostname) {
    cachedBaseUrl = `${window.location.protocol}//${window.location.hostname}:${DEFAULT_PORT}`;
    return cachedBaseUrl;
  }

  cachedBaseUrl = `http://127.0.0.1:${DEFAULT_PORT}`;
  return cachedBaseUrl;
};

const buildEndpoint = (path) => {
  const baseUrl = resolveBaseUrl();
  const trimmedBase = baseUrl.replace(/\/$/, '');
  return `${trimmedBase}${path}`;
};

export async function summarizePostDescription(description, { signal } = {}) {
  const text = typeof description === 'string' ? description.trim() : '';
  if (!text) {
    throw new Error('Add a description before requesting a summary.');
  }

  try {
    const response = await fetch(buildEndpoint(SUMMARY_PATH), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ text }),
      signal
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
      model: payload.model ?? 'facebook/bart-large-cnn'
    };
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw error;
    }
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(message || 'Failed to summarize description.');
  }
}
