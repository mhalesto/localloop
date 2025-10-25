// backend/server.js
/* eslint-disable no-console */
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

// ---------------------- Config ----------------------
const DEFAULT_PORT = process.env.PORT ? Number(process.env.PORT) : 4000;
const MAX_INPUT_LENGTH = 4000;
const MIN_SUMMARY_LENGTH = 30;
const MAX_SUMMARY_LENGTH = 560;
const DEFAULT_SUMMARY_LENGTH_PREFERENCE = 'balanced';
const TRANSFORMER_RETRY_DELAY_MS = 5 * 60 * 1000;

// Degeneracy tuning (can be overridden via env)
const DEGEN_MODE = (process.env.SUMMARY_DEGEN_MODE || 'soft').toLowerCase(); // 'off' | 'soft' | 'strict'
const DEGEN_MIN_UNIQUE = Number(process.env.SUMMARY_DEGEN_MIN_UNIQUE || 5);
const DEGEN_MIN_TOTAL = Number(process.env.SUMMARY_DEGEN_MIN_TOTAL || 10);
const DEGEN_BIGRAM_REPEAT_THRESHOLD = Number(
  process.env.SUMMARY_DEGEN_BIGRAM_REPEAT || (DEGEN_MODE === 'strict' ? 3 : 4)
);

// Models
const FAST_MODEL = process.env.SUMMARIZER_FAST_MODEL || 'Xenova/distilbart-cnn-6-6';
const MID_MODEL = process.env.SUMMARIZER_MID_MODEL || 'Xenova/distilbart-cnn-12-6';
const BEST_MODEL = process.env.SUMMARIZER_BEST_MODEL || 'Xenova/bart-large-cnn';
const DEFAULT_MODEL = process.env.SUMMARIZER_MODEL || MID_MODEL;

// Length presets
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

// ---------------------- Utils ----------------------
const parseBooleanEnv = (v) => {
  if (v == null) return false;
  const s = String(v).trim().toLowerCase();
  return s === '1' || s === 'true' || s === 'yes' || s === 'on';
};
const normalizeWhitespace = (s) => String(s ?? '').replace(/\s+/g, ' ').trim();
const sanitizeInputText = (v) => String(v ?? '')
  .replace(/\uFFFD/g, '')
  .replace(/[\u0000-\u001F]+/g, ' ')
  .replace(/[“”]/g, '"').replace(/[‘’]/g, "'")
  .replace(/([!?.,;:])\1{2,}/g, '$1$1')
  .replace(/\s+/g, ' ').trim();

const splitIntoSentences = (value) => {
  const normalized = normalizeWhitespace(value);
  const matches = normalized.match(/[^.!?]+[.!?]?/g);
  if (!matches) return normalized ? [normalized] : [];

  const out = [];
  let pending = '';
  for (const m of matches) {
    const s = m.trim();
    if (!s) continue;
    const isNum = /^[0-9]+\s*[.)-]?$/.test(s);
    if (isNum) { pending = pending ? `${pending} ${s}` : s; continue; }
    let combined = pending ? `${pending} ${s}`.trim() : s;
    pending = '';
    combined = combined.replace(/^[0-9]+\s*[.)-]?\s*/, '');
    if (/^["'“”)]/.test(combined) && out.length) {
      out[out.length - 1] = `${out[out.length - 1]} ${combined}`.trim();
    } else out.push(combined);
  }
  if (pending) out.push(pending);
  return out.filter(Boolean);
};
const splitIntoParagraphSentences = (value) => {
  const segments = String(value ?? '')
    .split(/\n{2,}/).map((s) => s.trim()).filter(Boolean);
  if (!segments.length) {
    return splitIntoSentences(value).map((sentence) => ({ sentence, paragraphIndex: 0 }));
  }
  const res = [];
  segments.forEach((seg, p) => splitIntoSentences(seg).forEach((sentence) => res.push({ sentence, paragraphIndex: p })));
  return res;
};

const STOPWORDS = new Set(
  'a an and are as at be but by for from had has have he her his in is it its of on she that the their there they this to was were will with you'
    .split(' ')
);
const tokenize = (v) => {
  const m = normalizeWhitespace(v).toLowerCase().match(/[a-z0-9']+/g);
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

// ---------------- Extractive fallback ----------------
const buildExtractiveSummary = (text, cfg) => {
  const entries = splitIntoParagraphSentences(text);
  const sentences = entries.map((e) => e.sentence);
  const pidx = entries.map((e) => e.paragraphIndex);
  const minLength = cfg?.min_length ?? MIN_SUMMARY_LENGTH;
  const maxLength = cfg?.max_length ?? MAX_SUMMARY_LENGTH;
  const prefKey = cfg?.lengthPreference ?? cfg?.length_preference ?? DEFAULT_SUMMARY_LENGTH_PREFERENCE;
  const sentenceRange = SUMMARY_SENTENCE_COUNTS[prefKey] ?? SUMMARY_SENTENCE_COUNTS[DEFAULT_SUMMARY_LENGTH_PREFERENCE];
  if (!sentences.length) return truncateSummary(normalizeWhitespace(text).slice(0, maxLength), maxLength);

  const avgRaw = sentences.reduce((t, s) => t + s.length, 0) / sentences.length || maxLength;
  const tokensPer = sentences.map(tokenize);
  const freq = new Map(); const sentenceCounts = new Map();

  const estCount = Math.ceil((cfg?.max_length ?? maxLength) / Math.max(avgRaw, 85));
  const desired = Math.min(sentences.length, Math.max(sentenceRange.min, Math.min(sentenceRange.max, (estCount || sentenceRange.min) + 1)));

  for (const toks of tokensPer) {
    const uniq = new Set(toks);
    for (const t of toks) freq.set(t, (freq.get(t) ?? 0) + 1);
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
    const lengthPenalty = avgLen ? 1 - Math.min(0.35, Math.abs(toks.length - avgLen) / Math.max(avgLen, 1)) : 1;
    const position = 1 + Math.max(0, 0.1 - i / sentences.length) + (i === sentences.length - 1 ? 0.05 : 0);
    return { sentence: s, index: i, score: norm * diversity * lengthPenalty * position };
  });

  const allZero = scored.every((e) => e.score === 0);
  const ranked = allZero ? scored : [...scored].sort((a, b) => b.score - a.score || a.index - b.index);

  const paraCount = pidx.length ? Math.max(...pidx) + 1 : 1;
  const picked = new Set(); const selected = [];
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
      if (c && !picked.has(c.index)) { picked.add(c.index); selected.push(c); }
    }
  }
  for (const c of ranked) {
    if (picked.size >= desired) break;
    if (!picked.has(c.index)) { picked.add(c.index); selected.push(c); }
  }
  while (picked.size < sentenceRange.min) {
    const c = ranked.find((e) => !picked.has(e.index));
    if (!c) break;
    picked.add(c.index); selected.push(c);
  }

  const ordered = selected.sort((a, b) => a.index - b.index);
  const parts = []; let run = 0;
  for (const e of ordered) {
    const sep = parts.length > 0 ? 1 : 0;
    const avail = maxLength - run - sep;
    if (avail <= 0) break;
    if (e.sentence.length <= avail) { parts.push(e.sentence); run += e.sentence.length + sep; }
    else { const t = truncateSentenceAtWordBoundary(e.sentence, avail); if (t) { parts.push(t); run = maxLength; } break; }
  }
  if (!parts.length) return truncateSummary(normalizeWhitespace(text).slice(0, maxLength), maxLength);

  let summary = parts.join(' ');
  if (summary.length < minLength) {
    for (const e of ranked) {
      if (summary.includes(e.sentence)) continue;
      const sep = summary.endsWith(' ') || summary.length === 0 ? 0 : 1;
      const avail = maxLength - summary.length - sep;
      if (avail <= 0) break;
      if (e.sentence.length <= avail) summary = `${summary}${sep ? ' ' : ''}${e.sentence}`;
      else { const t = truncateSentenceAtWordBoundary(e.sentence, avail); if (t) summary = `${summary}${sep ? ' ' : ''}${t}`; break; }
      if (summary.length >= minLength) break;
    }
  }
  if (summary.length < minLength) {
    const padding = normalizeWhitespace(text).slice(0, Math.min(text.length, maxLength));
    if (padding) summary = truncateSummary(`${summary} ${padding}`.trim(), maxLength);
  }
  return truncateSummary(summary.trim(), maxLength);
};

// ---------------- Post-processing ----------------
const cleanSummaryText = (text) => {
  if (!text) return '';
  let t = String(text)
    .replace(/\uFFFD/g, '')
    .replace(/[\u0000-\u001F]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .replace(/([!?.,;:])\1{1,}/g, '$1')
    .replace(/\.{2,}/g, '.')
    .replace(/,+/g, ',')
    .replace(/\s+([,.;:!?])/g, '$1');

  const raw = t.match(/[^.!?]+[.!?]?/g) || [t];
  const seen = new Set(); const kept = [];
  for (const s of raw) {
    const trimmed = s.trim(); if (!trimmed) continue;
    const norm = trimmed.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    if (!norm || seen.has(norm)) continue;
    seen.add(norm); kept.push(trimmed);
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
    if (counts.get(bigram) >= DEGEN_BIGRAM_REPEAT_THRESHOLD) return true;
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
    } else run = 1;
  }
  return false;
};

// Softened degeneracy check:
// - Skips for short sources
// - Soft thresholds by default
// - Can be disabled entirely via SUMMARY_DEGEN_MODE=off
const looksDegenerate = (text, sourceLength = 0) => {
  if (DEGEN_MODE === 'off') return false;

  const trimmed = cleanSummaryText(text);
  const tokens = tokensFromSummary(trimmed);
  const uniqueTokens = new Set(tokens);

  // Skip checks for short inputs; neural summaries for short blurbs can look repetitive by nature
  if (sourceLength < 600) return false;

  if (tokens.length >= DEGEN_MIN_TOTAL && uniqueTokens.size < DEGEN_MIN_UNIQUE) return true;
  if (hasRepeatingBigrams(tokens)) return true;
  if (hasWordStutter(tokens)) return true;

  // Only apply last-sentence length sanity for very long sources
  if (sourceLength > 1200) {
    const lastSentence = trimmed.split(/(?<=[.!?])\s+/).filter(Boolean).pop() || '';
    if (lastSentence.trim().length < 16) return true;
  }
  return false;
};

// ---------------- Transformer loader/state ----------------
const disabledModes = new Set(['extractive', 'fallback', 'disabled', 'disable', 'off', 'none']);
const transformerState = { disabled: false, forced: false, reason: '', lastError: null };
const configured = String(process.env.SUMMARIZER_MODE ?? '').trim().toLowerCase();
if (configured && disabledModes.has(configured)) {
  transformerState.disabled = true; transformerState.forced = true;
  transformerState.reason = `disabled via SUMMARIZER_MODE=${configured}`;
}
if (parseBooleanEnv(process.env.SUMMARIZER_TRANSFORMERS_DISABLED)) {
  transformerState.disabled = true; transformerState.forced = true;
  transformerState.reason = 'disabled via SUMMARIZER_TRANSFORMERS_DISABLED';
}

let loaderPromise = null;
const instanceByModel = new Map();
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
  transformerState.reason = reason || transformerState.reason;
  transformerState.lastError = error || null;
  loaderPromise = null; instanceByModel.clear();
  scheduleRetryEnable();
};
if (transformerState.disabled && transformerState.forced) {
  console.info('[summaries] transformers disabled:', transformerState.reason);
  fallbackNoticeLogged = true;
}

async function loadPipelineFactory() {
  if (transformerState.disabled) throw new Error(transformerState.reason || 'Transformer summarizer disabled.');
  if (!loaderPromise) {
    loaderPromise = import('@xenova/transformers').then((mod) => {
      const { pipeline, env } = mod;
      const cacheDir = path.join(process.cwd(), '.cache', 'transformers');
      try { fs.mkdirSync(cacheDir, { recursive: true }); } catch { }
      env.allowRemoteModels = true; env.allowLocalModels = true; env.cacheDir = cacheDir;
      if (typeof pipeline !== 'function') throw new Error('Unable to load summarization pipeline.');
      return pipeline;
    });
  }
  return loaderPromise;
}
async function getSummarizer(modelId) {
  if (transformerState.disabled) return null;
  const id = modelId || DEFAULT_MODEL;
  if (instanceByModel.has(id)) return instanceByModel.get(id);
  const p = loadPipelineFactory()
    .then((create) => create('summarization', id))
    .catch((err) => { instanceByModel.delete(id); disableTransformers('transformer-pipeline-load-failed', err); throw err; });
  instanceByModel.set(id, p);
  return p;
}

// One shot summarization with options (internal)
async function runPipelineOnce(content, cfg, modelId, decodingTweaks = {}) {
  const summarizer = await getSummarizer(modelId);
  if (typeof summarizer !== 'function') throw new Error('Summarizer pipeline did not return a callable instance.');
  const options = {
    min_length: cfg.min_length,
    max_length: cfg.max_length,
    num_beams: decodingTweaks.num_beams ?? (modelId === BEST_MODEL ? 6 : 4),
    length_penalty: decodingTweaks.length_penalty ?? 1.05,
    no_repeat_ngram_size: decodingTweaks.no_repeat_ngram_size ?? 3,
    early_stopping: true,
    do_sample: false,
    return_full_text: false,
  };
  const result = await summarizer(content, options);
  const text = Array.isArray(result) ? (result[0]?.summary_text ?? '') : '';
  return (text || '').trim();
}

// Attempts with degeneracy-aware retry before extractive fallback
async function attemptTransformerSummary(content, cfg, modelId, quality) {
  if (transformerState.disabled) return { summary: null, model: null, error: null, skipped: true };

  const primaryModel = modelId || (quality === 'best' ? BEST_MODEL : DEFAULT_MODEL);
  const altModel = (() => {
    // Choose a reasonable alternate for retry
    if (primaryModel === MID_MODEL) return BEST_MODEL;
    if (primaryModel === BEST_MODEL) return MID_MODEL;
    if (primaryModel === FAST_MODEL) return MID_MODEL;
    return BEST_MODEL;
  })();

  try {
    // First try
    const first = await runPipelineOnce(content, cfg, primaryModel);
    if (first && !looksDegenerate(first, content.length)) {
      return { summary: first, model: primaryModel, error: null, skipped: false };
    }
    if (first) {
      console.warn('[summaries] primary output flagged as degenerate; retrying with stricter decoding.');
    }

    // Retry on same model with stricter decoding
    const stricter = await runPipelineOnce(content, cfg, primaryModel, {
      no_repeat_ngram_size: 4,
      length_penalty: 1.1,
      num_beams: Math.max(5, primaryModel === BEST_MODEL ? 7 : 5),
    });
    if (stricter && !looksDegenerate(stricter, content.length)) {
      return { summary: stricter, model: primaryModel, error: null, skipped: false };
    }

    // Final retry using alternate model
    console.warn('[summaries] second output still degenerate; retrying with alternate model:', altModel);
    const alt = await runPipelineOnce(content, cfg, altModel, {
      no_repeat_ngram_size: 4,
      length_penalty: 1.1,
      num_beams: Math.max(5, altModel === BEST_MODEL ? 7 : 5),
    });
    if (alt && !looksDegenerate(alt, content.length)) {
      return { summary: alt, model: altModel, error: null, skipped: false };
    }

    // All neural attempts deemed degenerate
    const err = new Error('degenerate-summary');
    err.code = 'DEGENERATE';
    return { summary: null, model: null, error: err, skipped: false, degenerate: true };
  } catch (error) {
    if (error && (error.code === 'DEGENERATE' || error.message === 'degenerate-summary')) {
      return { summary: null, model: null, error, skipped: false, degenerate: true };
    }
    disableTransformers('transformer-unavailable', error);
    return { summary: null, model: null, error, skipped: false };
  }
}

// ---------------- Length config helpers ----------------
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
  const requested = overrides.lengthPreference ?? overrides.length_preference ?? overrides.preference ?? overrides.style;
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

// ---------------- Express ----------------
const app = express();
app.use((_, res, next) => { res.setHeader('Content-Type', 'application/json; charset=utf-8'); next(); });
app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.post('/summaries', async (req, res) => {
  const { text, options = {} } = req.body ?? {};
  const raw = typeof text === 'string' ? text.trim() : '';
  if (!raw) return res.status(400).json({ error: 'Description text is required.' });
  if (raw.length > MAX_INPUT_LENGTH) {
    return res.status(400).json({ error: `Description is too long to summarize. Limit input to ${MAX_INPUT_LENGTH} characters.` });
  }

  const content = sanitizeInputText(raw);
  if (!content) return res.status(400).json({ error: 'Description text is required.' });

  const quality = String(options.quality || '').toLowerCase(); // 'fast' | 'best'
  const requestedModel =
    (typeof options.model === 'string' && options.model) ||
    (quality === 'best' ? BEST_MODEL : DEFAULT_MODEL);

  const cfg = buildSummaryConfig(content.length, options);
  const tx = await attemptTransformerSummary(content, cfg, requestedModel, quality);

  if (tx.summary) {
    return res.json({
      summary: cleanSummaryText(tx.summary),
      model: tx.model || requestedModel,
      options: cfg,
      quality: quality || 'fast',
    });
  }

  if (tx.degenerate) {
    console.warn('[summaries] transformer output flagged as degenerate after retries; falling back to extractive summarizer.');
  }
  if (tx.error && !transformerErrorLogged && !tx.degenerate) {
    console.error('[summaries] transformer error, enabling extractive fallback:', tx.error);
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
      details: tx.error?.message ?? String(tx.error || 'unknown'),
    });
  }
  res.json({
    summary: fb,
    model: 'extractive-fallback',
    options: cfg,
    fallback: true,
    fallbackReason: tx.degenerate ? 'degenerate-output' : (tx.error ? 'transformer-unavailable' : 'transformer-disabled'),
    quality: quality || 'fast',
  });
});

if (require.main === module) {
  app.listen(DEFAULT_PORT, () => console.log(`Summary service listening on port ${DEFAULT_PORT}`));
}

module.exports = app;
