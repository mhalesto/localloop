// src/services/summarizationService.js
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { enhancedSummarize } from './enhancedSummarizationService';

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

  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window?.location?.protocol && window.location.hostname) {
      cachedBaseUrl = `${window.location.protocol}//${window.location.hostname}:${DEFAULT_PORT}`;
    } else {
      cachedBaseUrl = `http://localhost:${DEFAULT_PORT}`;
    }
    if (__DEV__) console.log('[summaryApi] base (web):', cachedBaseUrl);
    return cachedBaseUrl;
  }

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
    .replace(/\uFFFD/g, '')
    .replace(/[\u200B-\u200D\u2060]/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

const normalizeDescription = (value) =>
  String(value ?? '')
    .replace(/\r\n/g, '\n')
    .replace(/\uFFFD/g, '')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\t+/g, ' ')
    .replace(/ {2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

/**
 * Summarize post description
 * @param {string} description
 * @param {{ signal?: AbortSignal, lengthPreference?: 'concise'|'balanced'|'detailed', quality?: 'fast'|'best', model?: string, timeoutMs?: number }} opts
 */
export async function summarizePostDescription(
  description,
  { signal, lengthPreference, quality, model, timeoutMs = 20000 } = {}
) {
  const text = normalizeDescription(description);
  if (!text) {
    throw new Error('Add a description before requesting a summary.');
  }

  // Try enhanced summarizer with HF API first if quality is 'best'
  if (quality === 'best' || !quality) {
    try {
      console.log('[SummaryService] Trying enhanced summarizer with HF API...');
      const enhancedResult = await enhancedSummarize(text, {
        lengthPreference: lengthPreference || 'balanced',
        quality: 'best',
        strategy: 'auto'
      });

      if (enhancedResult && enhancedResult.summary) {
        console.log('[SummaryService] Enhanced summarizer success! Method:', enhancedResult.method);
        return {
          summary: clean(String(enhancedResult.summary)).normalize('NFC'),
          model: enhancedResult.method,
          options: { lengthPreference },
          fallback: !enhancedResult.method.startsWith('huggingface'),
          quality: 'best',
        };
      }
    } catch (hfError) {
      console.log('[SummaryService] Enhanced summarizer failed:', hfError.message);
    }
  }

  // Fall back to original API service
  const options = {};
  if (typeof lengthPreference === 'string' && lengthPreference) {
    options.lengthPreference = lengthPreference;
  }
  if (typeof quality === 'string' && quality) {
    options.quality = quality; // 'fast'|'best'
  }
  if (typeof model === 'string' && model) {
    options.model = model; // overrides quality selection on server
  }

  const body = Object.keys(options).length ? { text, options } : { text };

  const controller = !signal && typeof AbortController !== 'undefined' ? new AbortController() : null;
  let timer = null;
  if (!signal && controller) {
    timer = setTimeout(() => controller.abort(), timeoutMs);
  }

  try {
    const endpoint = buildEndpoint(SUMMARY_PATH);
    if (__DEV__) console.log('[summaryApi] POST', endpoint, options);

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: signal ?? controller?.signal,
    });

    let payload = null;
    try { payload = await response.json(); } catch { }

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
      quality: payload.quality || options.quality || null,
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
