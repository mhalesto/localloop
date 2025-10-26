// backend/server.js
/* eslint-disable no-console */

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const path = require('path');
const fs = require('fs');

/** ---------- Tunables ---------- */
const DEFAULT_PORT = process.env.PORT ? Number(process.env.PORT) : 4000;
const MAX_INPUT_LENGTH = 4000;
const MIN_SUMMARY_LENGTH = 30;
const MAX_SUMMARY_LENGTH = 560;
const DEFAULT_SUMMARY_LENGTH_PREFERENCE = 'balanced';
const TRANSFORMER_RETRY_DELAY_MS = 5 * 60 * 1000;
const MIN_UNIQUE_TOKEN_COUNT = 6;
const MIN_TOTAL_TOKEN_COUNT = 12;

/** ---------- Length presets ---------- */
const SUMMARY_LENGTH_PREFERENCES = Object.freeze({
  concise: { maxRatio: 0.24, minRatio: 0.50 },
  balanced: { maxRatio: 0.35, minRatio: 0.65 },
  detailed: { maxRatio: 0.55, minRatio: 0.80 },
});
const SUMMARY_SENTENCE_COUNTS = Object.freeze({
  concise: { min: 2, max: 4 },
  balanced: { min: 3, max: 5 },
  detailed: { min: 4, max: 6 },
});

/** ---------- Auth config ---------- */
const {
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  JWT_SECRET,
  EXPO_PUBLIC_BASE_URL,
  EXPO_PUBLIC_API_BASE_URL,
  EXPO_PUBLIC_SCHEME,
  AUTH_ALLOWED_ORIGINS,
  AUTH_COOKIE_NAME,
  SESSION_TOKEN_TTL
} = process.env;

const RESOLVED_COOKIE_NAME = AUTH_COOKIE_NAME || 'toilet_session';
const SESSION_TTL = SESSION_TOKEN_TTL || '7d';
const SESSION_MAX_AGE_MS = Math.max(Number(process.env.SESSION_MAX_AGE_DAYS || 7), 1) * 24 * 60 * 60 * 1000;

const inferredOrigins = [
  EXPO_PUBLIC_API_BASE_URL,
  EXPO_PUBLIC_BASE_URL,
  process.env.APP_URL,
  'http://localhost:8081',
  'http://127.0.0.1:8081',
  'http://localhost:19006',
  'http://127.0.0.1:19006'
]
  .filter(Boolean)
  .map((origin) => origin.trim());

const allowedOrigins = new Set(
  [
    ...inferredOrigins,
    ...(AUTH_ALLOWED_ORIGINS ? AUTH_ALLOWED_ORIGINS.split(',') : [])
  ]
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0)
);

const resolveCorsOrigin = (origin, callback) => {
  if (!origin) {
    callback(null, true);
    return;
  }
  if (allowedOrigins.size === 0 || allowedOrigins.has(origin)) {
    callback(null, true);
    return;
  }
  callback(new Error(`Origin ${origin} not allowed`));
};

const buildCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: SESSION_MAX_AGE_MS,
  path: '/'
});

const signSessionToken = (payload = {}) => {
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured.');
  }
  return jwt.sign(payload, JWT_SECRET, { expiresIn: SESSION_TTL });
};

const verifySessionToken = (token) => {
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured.');
  }
  return jwt.verify(token, JWT_SECRET);
};

const extractSessionToken = (req) => {
  const authHeader = req.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice('Bearer '.length).trim();
  }
  if (req.cookies && req.cookies[RESOLVED_COOKIE_NAME]) {
    return req.cookies[RESOLVED_COOKIE_NAME];
  }
  return null;
};

const createOAuthClient = (redirectUri) => {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    throw new Error('Google OAuth credentials are not configured.');
  }
  return new OAuth2Client({
    clientId: GOOGLE_CLIENT_ID,
    clientSecret: GOOGLE_CLIENT_SECRET,
    redirectUri
  });
};

/** ---------- Env helpers ---------- */
const parseBooleanEnv = (value) => {
  if (value == null) return false;
  const s = String(value).trim().toLowerCase();
  return s === '1' || s === 'true' || s === 'yes' || s === 'on';
};

/** ---------- Transformer state ---------- */
const disabledModes = new Set(['extractive', 'fallback', 'disabled', 'disable', 'off', 'none']);
const transformerState = { disabled: false, forced: false, reason: '', lastError: null };

const configured = String(process.env.SUMMARIZER_MODE ?? '').trim().toLowerCase();
if (configured && disabledModes.has(configured)) {
  transformerState.disabled = true;
  transformerState.forced = true;
  transformerState.reason = `disabled via SUMMARIZER_MODE=${configured}`;
}
if (parseBooleanEnv(process.env.SUMMARIZER_TRANSFORMERS_DISABLED)) {
  transformerState.disabled = true;
  transformerState.forced = true;
  transformerState.reason = 'disabled via SUMMARIZER_TRANSFORMERS_DISABLED';
}

let loaderPromise = null;
const instanceByModel = new Map(); // cache summarizers per model
let transformerErrorLogged = false;
let fallbackNoticeLogged = false;
let retryTimer = null;

const scheduleRetryEnable = () => {
  if (retryTimer || transformerState.forced) return;
  retryTimer = setTimeout(() => {
    retryTimer = null;
    transformerState.disabled = false;
    transformerState.reason = '';
    transformerState.lastError = null;
    loaderPromise = null;
    instanceByModel.clear();
    console.info('[summaries] retrying transformer pipeline after cooldown.');
  }, TRANSFORMER_RETRY_DELAY_MS);
};

const disableTransformers = (reason, error) => {
  if (transformerState.forced) return;
  transformerState.disabled = true;
  if (reason) transformerState.reason = reason;
  if (error) transformerState.lastError = error;
  loaderPromise = null;
  instanceByModel.clear();
  scheduleRetryEnable();
};

if (transformerState.disabled && transformerState.forced) {
  console.info('[summaries] transformers disabled:', transformerState.reason);
  fallbackNoticeLogged = true;
}

/** ---------- Text helpers ---------- */
const normalizeWhitespace = (value) => String(value ?? '').replace(/\s+/g, ' ').trim();

const sanitizeInputText = (value) => {
  if (!value) return '';
  return String(value)
    .replace(/\uFFFD/g, '')
    .replace(/[\u0000-\u001F]+/g, ' ')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/([!?.,;:])\1{2,}/g, '$1$1')
    .replace(/\s+/g, ' ')
    .trim();
};

const splitIntoSentences = (value) => {
  const normalized = normalizeWhitespace(value);
  const matches = normalized.match(/[^.!?]+[.!?]?/g);
  if (!matches) return normalized ? [normalized] : [];

  const out = [];
  let pendingPrefix = '';
  for (const m of matches) {
    const s = m.trim();
    if (!s) continue;

    const isListMarker = /^[0-9]+\s*[.)-]?$/.test(s);
    if (isListMarker) {
      pendingPrefix = pendingPrefix ? `${pendingPrefix} ${s}` : s;
      continue;
    }

    let combined = pendingPrefix ? `${pendingPrefix} ${s}`.trim() : s;
    pendingPrefix = '';
    combined = combined.replace(/^[0-9]+\s*[.)-]?\s*/, '');

    if (/^["'“”)]/.test(combined) && out.length) {
      const i = out.length - 1;
      out[i] = `${out[i]} ${combined}`.trim();
      continue;
    }
    out.push(combined);
  }
  if (pendingPrefix) out.push(pendingPrefix);
  return out.filter(Boolean);
};

const splitIntoParagraphSentences = (value) => {
  const segments = String(value ?? '')
    .split(/\n{2,}/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (!segments.length) {
    return splitIntoSentences(value).map((sentence) => ({ sentence, paragraphIndex: 0 }));
  }
  const results = [];
  segments.forEach((segment, paragraphIndex) => {
    splitIntoSentences(segment).forEach((sentence) => results.push({ sentence, paragraphIndex }));
  });
  return results;
};

const STOPWORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'but', 'by', 'for', 'from', 'had', 'has', 'have', 'he', 'her', 'his', 'in', 'is', 'it', 'its',
  'of', 'on', 'she', 'that', 'the', 'their', 'there', 'they', 'this', 'to', 'was', 'were', 'will', 'with', 'you'
]);

const tokenize = (value) => {
  const m = normalizeWhitespace(value).toLowerCase().match(/[a-z0-9']+/g);
  return m ? m.filter((t) => t && !STOPWORDS.has(t)) : [];
};

const truncateSummary = (s, max) => {
  if (s.length <= max) return s;
  const t = s.slice(0, Math.max(0, max - 1)).trimEnd();
  return `${t}…`;
};

const truncateSentenceAtWordBoundary = (s, max) => {
  if (s.length <= max) return s.trim();
  const clipped = s.slice(0, Math.max(0, max));
  const i = clipped.lastIndexOf(' ');
  return (i <= 0 ? clipped : clipped.slice(0, i)).trim();
};

/** ---------- Extractive fallback ---------- */
const buildExtractiveSummary = (text, cfg) => {
  const entries = splitIntoParagraphSentences(text);
  const sentences = entries.map((e) => e.sentence);
  const pidx = entries.map((e) => e.paragraphIndex);
  const minLength = cfg?.min_length ?? MIN_SUMMARY_LENGTH;
  const maxLength = cfg?.max_length ?? MAX_SUMMARY_LENGTH;
  const prefKey = cfg?.lengthPreference ?? cfg?.length_preference ?? DEFAULT_SUMMARY_LENGTH_PREFERENCE;
  const sentenceRange = SUMMARY_SENTENCE_COUNTS[prefKey] ?? SUMMARY_SENTENCE_COUNTS[DEFAULT_SUMMARY_LENGTH_PREFERENCE];

  if (!sentences.length) {
    return truncateSummary(normalizeWhitespace(text).slice(0, maxLength), maxLength);
  }

  const avgRaw = sentences.reduce((t, s) => t + s.length, 0) / sentences.length || maxLength;

  const tokensPer = sentences.map((s) => tokenize(s));
  const freq = new Map();
  const sentenceCounts = new Map();

  const estCount = Math.ceil((cfg?.max_length ?? maxLength) / Math.max(avgRaw, 85));
  const desired = Math.min(
    sentences.length,
    Math.max(sentenceRange.min, Math.min(sentenceRange.max, (estCount || sentenceRange.min) + 1))
  );

  for (const tokens of tokensPer) {
    const uniq = new Set(tokens);
    for (const t of tokens) freq.set(t, (freq.get(t) ?? 0) + 1);
    for (const t of uniq) sentenceCounts.set(t, (sentenceCounts.get(t) ?? 0) + 1);
  }

  const weights = new Map();
  if (sentences.length > 1) {
    for (const [t, c] of sentenceCounts.entries()) {
      const idf = Math.log(1 + sentences.length / (1 + c));
      weights.set(t, idf);
    }
  }
  const avgLen = tokensPer.reduce((t, a) => t + a.length, 0) / tokensPer.length || 0;

  const scored = sentences.map((s, i) => {
    const toks = tokensPer[i];
    if (!toks.length) return { sentence: s, index: i, score: 0 };

    const uniqN = new Set(toks).size;
    const base = toks.reduce((t, k) => t + (freq.get(k) ?? 0), 0);
    const w = toks.reduce((t, k) => {
      const weight = weights.get(k) ?? 1;
      const rareBoost = weight > 1.5 ? weight * 0.6 : 0;
      return t + weight + rareBoost;
    }, 0);
    const norm = (base * 0.6 + w * 1.4) / (toks.length || 1);
    const diversity = 1 + (uniqN / (toks.length || 1)) * 0.1;
    const lengthPenalty = avgLen
      ? 1 - Math.min(0.35, Math.abs(toks.length - avgLen) / Math.max(avgLen, 1))
      : 1;
    const position = 1 + Math.max(0, 0.1 - i / sentences.length) + (i === sentences.length - 1 ? 0.05 : 0);
    return { sentence: s, index: i, score: norm * diversity * lengthPenalty * position };
  });

  const allZero = scored.every((e) => e.score === 0);
  const ranked = allZero ? scored : [...scored].sort((a, b) => b.score - a.score || a.index - b.index);

  const paraCount = pidx.length ? Math.max(...pidx) + 1 : 1;
  const picked = new Set();
  const selected = [];

  const seenParas = new Set();
  for (let i = 0; i < entries.length; i++) {
    const pi = pidx[i] ?? 0;
    if (seenParas.has(pi)) continue;
    seenParas.add(pi);
    if (!picked.has(i)) {
      picked.add(i);
      const ref = scored[i]?.score ?? 0;
      selected.push({ sentence: sentences[i], index: i, score: ref });
    }
  }

  if (!allZero) {
    for (let p = 0; p < paraCount; p++) {
      const c = ranked.find((e) => pidx[e.index] === p);
      if (c && !picked.has(c.index)) {
        picked.add(c.index);
        selected.push(c);
      }
    }
  }

  for (const c of ranked) {
    if (picked.size >= desired) break;
    if (!picked.has(c.index)) {
      picked.add(c.index);
      selected.push(c);
    }
  }

  while (picked.size < sentenceRange.min) {
    const c = ranked.find((e) => !picked.has(e.index));
    if (!c) break;
    picked.add(c.index);
    selected.push(c);
  }

  const ordered = selected.sort((a, b) => a.index - b.index);
  const parts = [];
  let run = 0;

  for (const e of ordered) {
    const sep = parts.length > 0 ? 1 : 0;
    const avail = maxLength - run - sep;
    if (avail <= 0) break;

    if (e.sentence.length <= avail) {
      parts.push(e.sentence);
      run += e.sentence.length + sep;
    } else {
      const t = truncateSentenceAtWordBoundary(e.sentence, avail);
      if (t) {
        parts.push(t);
        run = maxLength;
      }
      break;
    }
  }

  if (!parts.length) {
    return truncateSummary(normalizeWhitespace(text).slice(0, maxLength), maxLength);
  }

  let summary = parts.join(' ');

  if (summary.length < minLength) {
    for (const e of ranked) {
      if (summary.includes(e.sentence)) continue;
      const sep = summary.endsWith(' ') || summary.length === 0 ? 0 : 1;
      const avail = maxLength - summary.length - sep;
      if (avail <= 0) break;

      if (e.sentence.length <= avail) {
        summary = `${summary}${sep ? ' ' : ''}${e.sentence}`;
      } else {
        const t = truncateSentenceAtWordBoundary(e.sentence, avail);
        if (t) summary = `${summary}${sep ? ' ' : ''}${t}`;
        break;
      }
      if (summary.length >= minLength) break;
    }
  }

  if (summary.length < minLength) {
    const padding = normalizeWhitespace(text).slice(0, Math.min(text.length, maxLength));
    if (padding) summary = truncateSummary(`${summary} ${padding}`.trim(), maxLength);
  }
  return truncateSummary(summary.trim(), maxLength);
};

/** ---------- Post-processor (dedupe + punctuation) ---------- */
const cleanSummaryText = (text) => {
  if (!text) return '';
  let t = String(text);

  t = t.replace(/\uFFFD/g, '').replace(/[\u0000-\u001F]+/g, ' ').replace(/\s{2,}/g, ' ');
  t = t
    .replace(/([!?.,;:])\1{1,}/g, '$1')
    .replace(/\.{2,}/g, '.')
    .replace(/,+/g, ',')
    .replace(/\s+([,.;:!?])/g, '$1');

  const raw = t.match(/[^.!?]+[.!?]?/g) || [t];
  const seen = new Set();
  const kept = [];
  for (const s of raw) {
    const trimmed = s.trim();
    if (!trimmed) continue;
    const norm = trimmed.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    if (!norm) continue;
    if (seen.has(norm)) continue;
    seen.add(norm);
    kept.push(trimmed);
  }

  t = kept.join(' ').replace(/\s{2,}/g, ' ').trim();
  t = t.replace(/([.!?])\s*$/, '$1');
  return t;
};

const tokensFromSummary = (text) => String(text || '').toLowerCase().split(/\s+/).filter(Boolean);

const hasRepeatingBigrams = (tokens) => {
  if (tokens.length < 4) return false;
  const counts = new Map();
  for (let i = 0; i < tokens.length - 1; i += 1) {
    const bigram = `${tokens[i]} ${tokens[i + 1]}`;
    counts.set(bigram, (counts.get(bigram) ?? 0) + 1);
    if (counts.get(bigram) >= 3) return true;
  }
  return false;
};

const hasWordStutter = (tokens) => {
  if (!tokens.length) return false;
  let run = 1;
  for (let i = 1; i < tokens.length; i += 1) {
    if (tokens[i] === tokens[i - 1]) {
      run += 1;
      if (run >= 3) return true;
    } else {
      run = 1;
    }
  }
  return false;
};

const looksDegenerate = (text, sourceLength = 0) => {
  const trimmed = cleanSummaryText(text);
  const tokens = tokensFromSummary(trimmed);
  const uniqueTokens = new Set(tokens);

  if (sourceLength > 600 && tokens.length < MIN_TOTAL_TOKEN_COUNT) return true;
  if (tokens.length >= MIN_TOTAL_TOKEN_COUNT && uniqueTokens.size < MIN_UNIQUE_TOKEN_COUNT) return true;
  if (hasRepeatingBigrams(tokens)) return true;
  if (hasWordStutter(tokens)) return true;

  const lastSentence = trimmed.split(/(?<=[.!?])\s+/).filter(Boolean).pop() || '';
  if (sourceLength > 400 && lastSentence.trim().length < 20) return true;

  return false;
};

/** ---------- Pipeline loader ---------- */
async function loadPipelineFactory() {
  if (transformerState.disabled) throw new Error(transformerState.reason || 'Transformer summarizer disabled.');

  if (!loaderPromise) {
    loaderPromise = import('@xenova/transformers').then((mod) => {
      const { pipeline, env } = mod;
      const cacheDir = path.join(process.cwd(), '.cache', 'transformers');
      try { fs.mkdirSync(cacheDir, { recursive: true }); } catch { }

      // Optional HF token for private/gated/rate-limited access
      const HF_TOKEN =
        process.env.HUGGINGFACE_TOKEN ||
        process.env.HF_TOKEN ||
        process.env.HUGGINGFACEHUB_API_TOKEN ||
        '';

      if (HF_TOKEN && typeof fetch === 'function') {
        // Inject Authorization header into fetch used by Transformers.js
        const origFetch = fetch;
        env.fetch = (url, opts = {}) =>
          origFetch(url, {
            ...opts,
            headers: { ...(opts.headers || {}), Authorization: `Bearer ${HF_TOKEN}` },
          });
      }

      env.allowRemoteModels = true;
      env.allowLocalModels = true;
      env.cacheDir = cacheDir;
      if (typeof pipeline !== 'function') throw new Error('Unable to load summarization pipeline.');
      return pipeline;
    });
  }
  return loaderPromise;
}

/** ---------- Model IDs & candidates ---------- */
const FAST_MODEL = process.env.SUMMARIZER_FAST_MODEL || 'Xenova/pegasus-xsum';
const BEST_MODEL = process.env.SUMMARIZER_BEST_MODEL || 'Xenova/bart-large-cnn';
const DEFAULT_MODEL = process.env.SUMMARIZER_MODEL || FAST_MODEL;

const FAST_MODEL_CANDIDATES = (process.env.SUMMARIZER_FAST_MODEL_CANDIDATES ||
  `${FAST_MODEL},Xenova/distilbart-cnn-12-6,Xenova/distilbart-cnn-6-6,Xenova/t5-small`
)
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

/** ----- Pipeline getter ----- */
async function getSummarizer(modelId) {
  if (transformerState.disabled) return null;
  const id = modelId || DEFAULT_MODEL;
  if (instanceByModel.has(id)) return instanceByModel.get(id);

  const p = loadPipelineFactory()
    .then((create) => create('summarization', id))
    .catch((err) => {
      instanceByModel.delete(id);
      // Note: we DON'T disable globally here; higher layer decides.
      throw err;
    });

  instanceByModel.set(id, p);
  return p;
}

/** ----- Try one model ----- */
const attemptTransformerSummary = async (content, cfg, modelId) => {
  if (transformerState.disabled) return { summary: null, model: null, error: null, skipped: true };
  try {
    const summarizer = await getSummarizer(modelId);
    if (typeof summarizer !== 'function') throw new Error('Summarizer pipeline did not return a callable instance.');

    const isPegasus = /pegasus/i.test(modelId || '');
    const options = {
      min_length: cfg.min_length,
      max_length: cfg.max_length,
      num_beams: isPegasus ? 4 : 6,
      length_penalty: isPegasus ? 1.0 : 1.05,
      no_repeat_ngram_size: 3,
      early_stopping: true,
      do_sample: false,
      return_full_text: false,
    };

    const result = await summarizer(content, options);
    const text = Array.isArray(result) ? (result[0]?.summary_text ?? '') : '';
    if (!text) throw new Error('Summarizer returned no content.');
    if (looksDegenerate(text, content.length)) {
      return {
        summary: null,
        model: modelId || DEFAULT_MODEL,
        error: new Error('degenerate-summary'),
        skipped: false,
        degenerate: true,
      };
    }
    return { summary: text.trim(), model: modelId || DEFAULT_MODEL, error: null, skipped: false };
  } catch (error) {
    const msg = String(error?.message || error || '');
    const transient =
      /Unauthorized|401|403|ENOTFOUND|ECONN|network|timed out|fetch/i.test(msg);

    // Only disable globally if it's NOT a transient/network-type issue and NOT degenerate.
    if (!(error && error.message === 'degenerate-summary') && !transient) {
      disableTransformers('transformer-unavailable', error);
    }

    return { summary: null, model: null, error, skipped: false, transient };
  }
};

/** ---------- Config helpers ---------- */
const clampNumber = (v, min, max) => (Number.isNaN(Number(v)) ? min : Math.min(max, Math.max(min, Number(v))));

const resolveLengthPreference = (v) => {
  if (!v) return DEFAULT_SUMMARY_LENGTH_PREFERENCE;
  const s = String(v).trim().toLowerCase();
  return SUMMARY_LENGTH_PREFERENCES[s] ? s : DEFAULT_SUMMARY_LENGTH_PREFERENCE;
};

const inferLengthPreference = (inputLength, requested) => {
  const normalized = requested ? resolveLengthPreference(requested) : DEFAULT_SUMMARY_LENGTH_PREFERENCE;
  if (requested) return normalized;
  if (inputLength <= 600) return 'detailed';
  if (inputLength >= 1500) return 'concise';
  return normalized;
};

const buildSummaryConfig = (inputLength, overrides = {}) => {
  const requested =
    overrides.lengthPreference ?? overrides.length_preference ?? overrides.preference ?? overrides.style;
  const lengthPreference = inferLengthPreference(inputLength, requested);
  const fallback = SUMMARY_LENGTH_PREFERENCES[DEFAULT_SUMMARY_LENGTH_PREFERENCE];
  const pref = SUMMARY_LENGTH_PREFERENCES[lengthPreference] ?? fallback;

  const estimatedMax = clampNumber(Math.round(inputLength * (pref?.maxRatio ?? 0.35)), MIN_SUMMARY_LENGTH, MAX_SUMMARY_LENGTH);
  let maxLength = clampNumber(overrides.max_length ?? overrides.maxLength ?? estimatedMax, MIN_SUMMARY_LENGTH, MAX_SUMMARY_LENGTH);

  const minRatio = pref?.minRatio ?? 0.6;
  const defaultMin = Math.round(maxLength * minRatio);
  const minLengthCandidate = overrides.min_length ?? overrides.minLength ?? defaultMin;
  const min_length = clampNumber(minLengthCandidate, MIN_SUMMARY_LENGTH, Math.max(MIN_SUMMARY_LENGTH, maxLength - 10));
  const max_length = Math.max(min_length + 5, maxLength);

  return { min_length, max_length, length_preference: lengthPreference, lengthPreference };
};

/** ---------- Express ---------- */
const app = express();
app.use((_, res, next) => { res.setHeader('Content-Type', 'application/json; charset=utf-8'); next(); });
app.use(cookieParser());
app.use(cors({
  origin: resolveCorsOrigin,
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '1mb' }));

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.post('/auth/google/token', async (req, res) => {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    return res.status(500).json({ error: 'Google OAuth is not configured.' });
  }
  if (!JWT_SECRET) {
    return res.status(500).json({ error: 'JWT_SECRET is not configured.' });
  }

  const { code, codeVerifier, redirectUri, platform } = req.body ?? {};

  if (!code || typeof code !== 'string') {
    return res.status(400).json({ error: 'Authorization code is required.' });
  }
  if (!redirectUri || typeof redirectUri !== 'string') {
    return res.status(400).json({ error: 'redirectUri is required.' });
  }

  try {
    const oauthClient = createOAuthClient(redirectUri);
    const { tokens } = await oauthClient.getToken({
      code,
      codeVerifier,
      redirect_uri: redirectUri
    });

    oauthClient.setCredentials(tokens);

    if (!tokens.id_token) {
      return res.status(400).json({ error: 'Failed to obtain Google ID token.' });
    }

    const ticket = await oauthClient.verifyIdToken({ idToken: tokens.id_token, audience: GOOGLE_CLIENT_ID });
    const payload = ticket.getPayload();

    if (!payload) {
      return res.status(400).json({ error: 'Unable to read Google profile.' });
    }

    const user = {
      id: payload.sub,
      email: payload.email,
      name: payload.name ?? '',
      picture: payload.picture ?? ''
    };

    const sessionToken = signSessionToken({
      sub: user.id,
      email: user.email,
      name: user.name,
      picture: user.picture
    });

    if (platform === 'web') {
      res.cookie(RESOLVED_COOKIE_NAME, sessionToken, buildCookieOptions());
    }

    return res.json({
      token: platform === 'web' ? undefined : sessionToken,
      idToken: tokens.id_token,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresIn: tokens.expires_in,
      user
    });
  } catch (error) {
    console.error('[auth] Google code exchange failed', error);
    return res.status(400).json({ error: 'Failed to exchange Google authorization code.' });
  }
});

app.get('/auth/session', (req, res) => {
  if (!JWT_SECRET) {
    return res.status(500).json({ error: 'JWT_SECRET is not configured.' });
  }

  const token = extractSessionToken(req);
  if (!token) {
    return res.status(401).json({ error: 'missing_session' });
  }

  try {
    const payload = verifySessionToken(token);
    return res.json({
      user: {
        id: payload.sub,
        email: payload.email,
        name: payload.name ?? '',
        picture: payload.picture ?? ''
      }
    });
  } catch (error) {
    return res.status(401).json({ error: 'invalid_session' });
  }
});

app.post('/auth/signout', (req, res) => {
  if (req.cookies && req.cookies[RESOLVED_COOKIE_NAME]) {
    res.clearCookie(RESOLVED_COOKIE_NAME, buildCookieOptions());
  }
  res.json({ ok: true });
});

app.post('/summaries', async (req, res) => {
  const { text, options = {} } = req.body ?? {};
  const raw = typeof text === 'string' ? text.trim() : '';

  if (!raw) return res.status(400).json({ error: 'Description text is required.' });
  if (raw.length > MAX_INPUT_LENGTH) {
    return res.status(400).json({ error: `Description is too long to summarize. Limit input to ${MAX_INPUT_LENGTH} characters.` });
  }

  const content = sanitizeInputText(raw);
  if (!content) {
    return res.status(400).json({ error: 'Description text is required.' });
  }

  const quality = String(options.quality || '').toLowerCase(); // 'fast' (default) | 'best'
  const explicitModel = typeof options.model === 'string' && options.model ? options.model : null;

  const cfg = buildSummaryConfig(content.length, options);

  // Build candidate list
  const candidates =
    quality === 'best'
      ? [explicitModel || BEST_MODEL]
      : (explicitModel ? [explicitModel] : FAST_MODEL_CANDIDATES);

  let chosen = null;
  let last = null;

  for (const id of candidates) {
    // eslint-disable-next-line no-await-in-loop
    const tx = await attemptTransformerSummary(content, cfg, id);
    last = tx;
    if (tx.summary) {
      chosen = tx;
      break;
    }
    // If degenerate/transient, try next candidate.
    if (tx.degenerate || tx.transient) {
      continue;
    }
    // Hard failure (non-transient): stop trying.
    break;
  }

  if (chosen && chosen.summary) {
    return res.json({
      summary: cleanSummaryText(chosen.summary),
      model: chosen.model || (explicitModel || (quality === 'best' ? BEST_MODEL : FAST_MODEL)),
      options: cfg,
      quality: quality || 'fast',
    });
  }

  if (last && last.degenerate) {
    console.warn('[summaries] transformer output flagged as degenerate, falling back to extractive summarizer.');
  }
  if (last && last.error && !transformerErrorLogged) {
    console.error('[summaries] transformer error, enabling extractive fallback:', last.error);
    transformerErrorLogged = true;
  }
  if (!fallbackNoticeLogged) {
    console.warn('[summaries] using extractive fallback summarizer.');
    fallbackNoticeLogged = true;
  }

  const fb = cleanSummaryText(buildExtractiveSummary(content, cfg) || '');
  if (!fb) {
    return res.status(500).json({
      error: 'Failed to generate summary.',
      details: last?.error?.message ?? String(last?.error || 'unknown'),
    });
  }
  res.json({
    summary: fb,
    model: 'extractive-fallback',
    options: cfg,
    fallback: true,
    fallbackReason: last?.error ? 'transformer-unavailable' : 'transformer-disabled',
    quality: quality || 'fast',
  });
});

if (require.main === module) {
  app.listen(DEFAULT_PORT, () => console.log(`Summary service listening on port ${DEFAULT_PORT}`));
}

module.exports = app;
