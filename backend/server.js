// server.js
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

// ---------------- Config ----------------
const DEFAULT_PORT = process.env.PORT ? Number(process.env.PORT) : 4000;
const MAX_INPUT_LENGTH = 4000;
const MIN_SUMMARY_LENGTH = 30;
const MAX_SUMMARY_LENGTH = 560;

const DEFAULT_SUMMARY_LENGTH_PREFERENCE = 'balanced';
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

// ---------------- Utility ----------------
const parseBooleanEnv = (value) => {
  if (value == null) return false;
  const normalized = String(value).trim().toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on';
};

// ---------------- Transformer state ----------------
const disabledSummarizerModes = new Set(['extractive', 'fallback', 'disabled', 'disable', 'off', 'none']);
const transformerState = {
  disabled: false,
  forced: false,
  reason: '',
  lastError: null,
};

const configuredSummarizerMode = String(process.env.SUMMARIZER_MODE ?? '').trim().toLowerCase();
if (configuredSummarizerMode && disabledSummarizerModes.has(configuredSummarizerMode)) {
  transformerState.disabled = true;
  transformerState.forced = true;
  transformerState.reason = `disabled via SUMMARIZER_MODE=${configuredSummarizerMode}`;
}
if (parseBooleanEnv(process.env.SUMMARIZER_TRANSFORMERS_DISABLED)) {
  transformerState.disabled = true;
  transformerState.forced = true;
  transformerState.reason = 'disabled via SUMMARIZER_TRANSFORMERS_DISABLED environment variable';
}

let summarizerLoaderPromise = null;
let summarizerInstancePromise = null;
let transformerErrorLogged = false;
let fallbackNoticeLogged = false;

const disableTransformers = (reason, error) => {
  if (transformerState.forced) return;
  transformerState.disabled = true;
  if (reason) transformerState.reason = reason;
  if (error) transformerState.lastError = error;
  summarizerLoaderPromise = null;
  summarizerInstancePromise = null;
};

if (transformerState.disabled && transformerState.forced) {
  console.info(
    `[summaries] transformer summarizer disabled (${transformerState.reason}). Using extractive summarizer.`
  );
  fallbackNoticeLogged = true;
}

// ---------------- Text helpers ----------------
const normalizeWhitespace = (value) => String(value ?? '').replace(/\s+/g, ' ').trim();

const splitIntoSentences = (value) => {
  const normalized = normalizeWhitespace(value);
  const matches = normalized.match(/[^.!?]+[.!?]?/g);

  if (!matches) {
    return normalized ? [normalized] : [];
  }

  const processed = [];
  let pendingPrefix = '';

  for (const match of matches) {
    const sentence = match.trim();
    if (!sentence) continue;

    const isListMarker = /^[0-9]+\s*[.)-]?$/.test(sentence);
    if (isListMarker) {
      pendingPrefix = pendingPrefix ? `${pendingPrefix} ${sentence}` : sentence;
      continue;
    }

    let combined = pendingPrefix ? `${pendingPrefix} ${sentence}`.trim() : sentence;
    pendingPrefix = '';

    combined = combined.replace(/^[0-9]+\s*[.)-]?\s*/, '');

    if (/^["'“”)]/.test(combined) && processed.length) {
      const lastIndex = processed.length - 1;
      processed[lastIndex] = `${processed[lastIndex]} ${combined}`.trim();
      continue;
    }

    processed.push(combined);
  }

  if (pendingPrefix) processed.push(pendingPrefix);

  return processed.filter(Boolean);
};

const splitIntoParagraphSentences = (value) => {
  const segments = String(value ?? '')
    .split(/\n{2,}/)
    .map((segment) => segment.trim())
    .filter(Boolean);

  const results = [];
  if (!segments.length) {
    return splitIntoSentences(value).map((sentence) => ({ sentence, paragraphIndex: 0 }));
  }

  segments.forEach((segment, paragraphIndex) => {
    const sentences = splitIntoSentences(segment);
    sentences.forEach((sentence) => results.push({ sentence, paragraphIndex }));
  });

  return results;
};

const STOPWORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'but', 'by', 'for', 'from', 'had', 'has', 'have', 'he', 'her', 'his', 'in', 'is', 'it', 'its',
  'of', 'on', 'she', 'that', 'the', 'their', 'there', 'they', 'this', 'to', 'was', 'were', 'will', 'with', 'you',
]);

const tokenize = (value) => {
  const matches = normalizeWhitespace(value).toLowerCase().match(/[a-z0-9']+/g);
  if (!matches) return [];
  return matches.filter((token) => token && !STOPWORDS.has(token));
};

const truncateSummary = (summary, maxLength) => {
  if (summary.length <= maxLength) return summary;
  const trimmed = summary.slice(0, Math.max(0, maxLength - 1)).trimEnd();
  return `${trimmed}…`;
};

const truncateSentenceAtWordBoundary = (sentence, maxLength) => {
  if (sentence.length <= maxLength) return sentence.trim();
  const clipped = sentence.slice(0, Math.max(0, maxLength));
  const lastSpace = clipped.lastIndexOf(' ');
  if (lastSpace <= 0) return clipped.trim();
  return clipped.slice(0, lastSpace).trim();
};

// ---- Extractive fallback (your original scoring, unchanged) ----
const buildExtractiveSummary = (text, summaryConfig) => {
  const paragraphEntries = splitIntoParagraphSentences(text);
  const sentences = paragraphEntries.map((entry) => entry.sentence);
  const paragraphIndexes = paragraphEntries.map((entry) => entry.paragraphIndex);
  const minLength = summaryConfig?.min_length ?? MIN_SUMMARY_LENGTH;
  const maxLength = summaryConfig?.max_length ?? MAX_SUMMARY_LENGTH;
  const preferenceKey =
    summaryConfig?.lengthPreference ?? summaryConfig?.length_preference ?? DEFAULT_SUMMARY_LENGTH_PREFERENCE;
  const sentenceRange = SUMMARY_SENTENCE_COUNTS[preferenceKey] ?? SUMMARY_SENTENCE_COUNTS[DEFAULT_SUMMARY_LENGTH_PREFERENCE];

  if (!sentences.length) {
    return truncateSummary(normalizeWhitespace(text).slice(0, maxLength), maxLength);
  }

  const rawAverageSentenceLength =
    sentences.reduce((total, sentence) => total + sentence.length, 0) / sentences.length || maxLength;
  const sentenceTokens = sentences.map((sentence) => tokenize(sentence));
  const frequencyMap = new Map();
  const tokenSentenceCounts = new Map();

  const estimatedCount = Math.ceil((summaryConfig?.max_length ?? maxLength) / Math.max(rawAverageSentenceLength, 85));
  const desiredSentenceCount = Math.min(
    sentences.length,
    Math.max(sentenceRange.min, Math.min(sentenceRange.max, (estimatedCount || sentenceRange.min) + 1))
  );

  for (const tokens of sentenceTokens) {
    const uniqueTokens = new Set(tokens);
    for (const token of tokens) {
      frequencyMap.set(token, (frequencyMap.get(token) ?? 0) + 1);
    }
    for (const token of uniqueTokens) {
      tokenSentenceCounts.set(token, (tokenSentenceCounts.get(token) ?? 0) + 1);
    }
  }

  const tokenWeights = new Map();
  if (sentences.length > 1) {
    for (const [token, count] of tokenSentenceCounts.entries()) {
      const idf = Math.log(1 + sentences.length / (1 + count));
      tokenWeights.set(token, idf);
    }
  }
  const averageLength =
    sentenceTokens.reduce((total, tokens) => total + tokens.length, 0) / sentenceTokens.length || 0;

  const scoredSentences = sentences.map((sentence, index) => {
    const tokens = sentenceTokens[index];
    if (!tokens.length) return { sentence, index, score: 0 };

    const uniqueTokenCount = new Set(tokens).size;
    const baseScore = tokens.reduce((total, token) => total + (frequencyMap.get(token) ?? 0), 0);
    const weightScore = tokens.reduce((total, token) => {
      const weight = tokenWeights.get(token) ?? 1;
      const rarityBoost = weight > 1.5 ? weight * 0.6 : 0;
      return total + weight + rarityBoost;
    }, 0);
    const normalizedScore = (baseScore * 0.6 + weightScore * 1.4) / (tokens.length || 1);
    const diversityBoost = 1 + (uniqueTokenCount / (tokens.length || 1)) * 0.1;
    const lengthPenalty = averageLength
      ? 1 - Math.min(0.35, Math.abs(tokens.length - averageLength) / Math.max(averageLength, 1))
      : 1;
    const positionBoost = 1 + Math.max(0, 0.1 - index / sentences.length) + (index === sentences.length - 1 ? 0.05 : 0);

    return { sentence, index, score: normalizedScore * diversityBoost * lengthPenalty * positionBoost };
  });

  const allScoresZero = scoredSentences.every((e) => e.score === 0);
  const rankedByScore = allScoresZero
    ? scoredSentences
    : [...scoredSentences].sort((a, b) => b.score - a.score || a.index - b.index);

  const paragraphCount = paragraphIndexes.length ? Math.max(...paragraphIndexes) + 1 : 1;
  const selectedIndexSet = new Set();
  const selectedEntries = [];

  const seenParagraphs = new Set();
  for (let i = 0; i < paragraphEntries.length; i += 1) {
    const paragraphIndex = paragraphIndexes[i] ?? 0;
    if (seenParagraphs.has(paragraphIndex)) continue;
    seenParagraphs.add(paragraphIndex);
    if (!selectedIndexSet.has(i)) {
      selectedIndexSet.add(i);
      const referenceScore = scoredSentences[i]?.score ?? 0;
      selectedEntries.push({ sentence: sentences[i], index: i, score: referenceScore });
    }
  }

  if (!allScoresZero) {
    for (let paragraph = 0; paragraph < paragraphCount; paragraph += 1) {
      const candidate = rankedByScore.find((entry) => paragraphIndexes[entry.index] === paragraph);
      if (candidate && !selectedIndexSet.has(candidate.index)) {
        selectedIndexSet.add(candidate.index);
        selectedEntries.push(candidate);
      }
    }
  }

  for (const candidate of rankedByScore) {
    if (selectedIndexSet.size >= desiredSentenceCount) break;
    if (!selectedIndexSet.has(candidate.index)) {
      selectedIndexSet.add(candidate.index);
      selectedEntries.push(candidate);
    }
  }

  if (!selectedIndexSet.size && sentences.length) {
    selectedIndexSet.add(0);
    selectedEntries.push({ sentence: sentences[0], index: 0, score: 0 });
  }

  while (selectedIndexSet.size < SUMMARY_SENTENCE_COUNTS[summaryConfig.lengthPreference].min) {
    const candidate = rankedByScore.find((entry) => !selectedIndexSet.has(entry.index));
    if (!candidate) break;
    selectedIndexSet.add(candidate.index);
    selectedEntries.push(candidate);
  }

  const ordered = selectedEntries.sort((a, b) => a.index - b.index);
  const summaryParts = [];
  let runningLength = 0;

  for (const entry of ordered) {
    const separatorLength = summaryParts.length > 0 ? 1 : 0;
    const available = maxLength - runningLength - separatorLength;
    if (available <= 0) break;

    if (entry.sentence.length <= available) {
      summaryParts.push(entry.sentence);
      runningLength += entry.sentence.length + separatorLength;
    } else {
      const truncated = truncateSentenceAtWordBoundary(entry.sentence, available);
      if (truncated) {
        summaryParts.push(truncated);
        runningLength = maxLength;
      }
      break;
    }
  }

  if (!summaryParts.length) {
    return truncateSummary(normalizeWhitespace(text).slice(0, maxLength), maxLength);
  }

  let summary = summaryParts.join(' ');

  if (summary.length < minLength) {
    for (const entry of rankedByScore) {
      if (summary.includes(entry.sentence)) continue;

      const separatorLength = summary.endsWith(' ') || summary.length === 0 ? 0 : 1;
      const available = maxLength - summary.length - separatorLength;
      if (available <= 0) break;

      if (entry.sentence.length <= available) {
        summary = `${summary}${separatorLength ? ' ' : ''}${entry.sentence}`;
      } else {
        const truncated = truncateSentenceAtWordBoundary(entry.sentence, available);
        if (truncated) {
          summary = `${summary}${separatorLength ? ' ' : ''}${truncated}`;
        }
        break;
      }

      if (summary.length >= minLength) break;
    }
  }

  if (summary.length < minLength) {
    const normalized = normalizeWhitespace(text);
    const padding = normalized.slice(0, Math.min(normalized.length, maxLength));
    if (padding) {
      summary = truncateSummary(`${summary} ${padding}`.trim(), maxLength);
    }
  }

  return truncateSummary(summary.trim(), maxLength);
};

// ---------------- Transformers.js loader ----------------
async function loadPipelineFactory() {
  if (transformerState.disabled) {
    throw new Error(transformerState.reason || 'Transformer summarizer disabled.');
  }

  if (!summarizerLoaderPromise) {
    summarizerLoaderPromise = import('@xenova/transformers').then((module) => {
      const { pipeline, env } = module;

      // Ensure a cache directory exists
      const cacheDir = path.join(process.cwd(), '.cache', 'transformers');
      try {
        fs.mkdirSync(cacheDir, { recursive: true });
      } catch (_) { }

      // Configure Transformers.js environment
      env.allowRemoteModels = true;
      env.allowLocalModels = true;
      env.cacheDir = cacheDir;

      if (typeof pipeline !== 'function') {
        throw new Error('Unable to load summarization pipeline.');
      }
      return pipeline;
    });
  }
  return summarizerLoaderPromise;
}

const DEFAULT_MODEL = process.env.SUMMARIZER_MODEL || 'Xenova/distilbart-cnn-6-6';

async function getSummarizer() {
  if (transformerState.disabled) return null;

  if (!summarizerInstancePromise) {
    summarizerInstancePromise = loadPipelineFactory()
      .then((createPipeline) => createPipeline('summarization', DEFAULT_MODEL))
      .catch((error) => {
        summarizerInstancePromise = null;
        disableTransformers('transformer-pipeline-load-failed', error);
        throw error;
      });
  }
  return summarizerInstancePromise;
}

const attemptTransformerSummary = async (content, summaryConfig) => {
  if (transformerState.disabled) {
    return { summary: null, model: null, error: null, skipped: true };
  }

  try {
    const summarizer = await getSummarizer();
    if (typeof summarizer !== 'function') {
      throw new Error('Summarizer pipeline did not return a callable instance.');
    }

    const result = await summarizer(content, {
      min_length: summaryConfig.min_length,
      max_length: summaryConfig.max_length,
    });

    const summaryText = Array.isArray(result) ? result[0]?.summary_text ?? '' : '';
    if (!summaryText) {
      throw new Error('Summarizer did not return any content.');
    }

    return {
      summary: summaryText.trim(),
      model: DEFAULT_MODEL,
      error: null,
      skipped: false,
    };
  } catch (error) {
    disableTransformers('transformer-unavailable', error);
    return { summary: null, model: null, error, skipped: false };
  }
};

// ---------------- Length & post-processing helpers ----------------
const clampNumber = (value, min, max) => {
  if (Number.isNaN(Number(value))) return min;
  return Math.min(max, Math.max(min, Number(value)));
};

const resolveLengthPreference = (value) => {
  if (!value) return DEFAULT_SUMMARY_LENGTH_PREFERENCE;
  const normalized = String(value).trim().toLowerCase();
  if (SUMMARY_LENGTH_PREFERENCES[normalized]) return normalized;
  return DEFAULT_SUMMARY_LENGTH_PREFERENCE;
};

// Heuristic: if no explicit preference, choose based on input size.
const inferLengthPreference = (inputLength, requestedPref) => {
  if (requestedPref) return resolveLengthPreference(requestedPref);
  if (inputLength >= 1500) return 'concise';
  if (inputLength <= 700) return 'balanced';
  return DEFAULT_SUMMARY_LENGTH_PREFERENCE;
};

const buildSummaryConfig = (inputLength, overrides = {}) => {
  const requestedPreference =
    overrides.lengthPreference ?? overrides.length_preference ?? overrides.preference ?? overrides.style;

  const lengthPreference = inferLengthPreference(inputLength, requestedPreference);
  const fallbackPreferenceConfig = SUMMARY_LENGTH_PREFERENCES[DEFAULT_SUMMARY_LENGTH_PREFERENCE];
  const preferenceConfig = SUMMARY_LENGTH_PREFERENCES[lengthPreference] ?? fallbackPreferenceConfig;
  const maxRatio = preferenceConfig?.maxRatio ?? fallbackPreferenceConfig?.maxRatio ?? 0.35;

  const estimatedMax = clampNumber(
    Math.round(inputLength * maxRatio),
    MIN_SUMMARY_LENGTH,
    MAX_SUMMARY_LENGTH
  );

  let maxLength = clampNumber(
    overrides.max_length ?? overrides.maxLength ?? estimatedMax,
    MIN_SUMMARY_LENGTH,
    MAX_SUMMARY_LENGTH
  );

  const minRatio = preferenceConfig?.minRatio ?? fallbackPreferenceConfig?.minRatio ?? 0.6;
  const defaultMinCandidate = Math.round(maxLength * minRatio);
  const minLengthCandidate = overrides.min_length ?? overrides.minLength ?? defaultMinCandidate;

  const minLength = clampNumber(
    minLengthCandidate,
    MIN_SUMMARY_LENGTH,
    Math.max(MIN_SUMMARY_LENGTH, maxLength - 10)
  );

  const normalizedMax = Math.max(minLength + 5, maxLength);

  return {
    min_length: minLength,
    max_length: normalizedMax,
    length_preference: lengthPreference,
    lengthPreference
  };
};

// Post-processor: normalize quotes/punctuation, remove near-dups, tidy endings
function polishSummary(raw) {
  let s = String(raw || '')
    .replace(/\s+/g, ' ')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .trim();

  // collapse repeated punctuation like "..", "!!"
  s = s.replace(/([.!?])\s*(?=\1)/g, '');

  // split to sentences
  const sentences = s.split(/(?<=[.!?])\s+/).filter(Boolean);

  // simple near-dup key (lowercase, strip punctuation & common stopwords)
  const STOP = /\b(?:the|a|an|and|or|to|of|in|on|by|for|with|as|that|this|was|were|is|are|be|been|has|have|had)\b/gi;
  const seen = new Set();
  const uniq = [];
  for (const sent of sentences) {
    const key = sent
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(STOP, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (!key) continue;
    if (seen.has(key)) continue;
    seen.add(key);
    uniq.push(sent);
  }

  let out = uniq.join(' ')
    .replace(/\s*'\s*s\b/g, "'s") // fix " ’ s" → "'s"
    .replace(/\s*\.\./g, '.')     // remove double periods
    .trim();

  return out;
}

// Ensure summary stays within the sentence range for chosen preference
function clipToSentenceRange(text, preferenceKey) {
  const range = SUMMARY_SENTENCE_COUNTS[preferenceKey] ?? SUMMARY_SENTENCE_COUNTS[DEFAULT_SUMMARY_LENGTH_PREFERENCE];
  const parts = text.split(/(?<=[.!?])\s+/).filter(Boolean);
  if (parts.length <= range.max) return text;
  return parts.slice(0, range.max).join(' ').trim();
}

// ---------------- Express app & routes ----------------
const app = express();

// Force UTF-8 for all JSON responses (prevents mojibake)
app.use((_, res, next) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  next();
});
app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.post('/summaries', async (req, res) => {
  const { text, options = {} } = req.body ?? {};
  const content = typeof text === 'string' ? text.trim() : '';

  if (!content) {
    return res.status(400).json({ error: 'Description text is required.' });
  }

  if (content.length > MAX_INPUT_LENGTH) {
    return res.status(400).json({
      error: `Description is too long to summarize. Limit input to ${MAX_INPUT_LENGTH} characters.`,
    });
  }

  const summaryConfig = buildSummaryConfig(content.length, options);

  const transformerOutcome = await attemptTransformerSummary(content, summaryConfig);

  let rawSummary = transformerOutcome.summary;
  let model = transformerOutcome.model ?? DEFAULT_MODEL;
  let fallback = false;

  if (!rawSummary) {
    if (transformerOutcome.error && !transformerErrorLogged) {
      console.error('[summaries] transformer error, enabling extractive fallback:', transformerOutcome.error);
      transformerErrorLogged = true;
    }

    if (!fallbackNoticeLogged) {
      if (transformerOutcome.error) {
        console.warn('[summaries] using extractive fallback summarizer.');
      } else if (transformerState.forced) {
        console.info('[summaries] transformer summarizer disabled by configuration. Using extractive summarizer.');
      } else {
        console.warn('[summaries] using extractive fallback summarizer.');
      }
      fallbackNoticeLogged = true;
    }

    rawSummary = buildExtractiveSummary(content, summaryConfig);
    model = 'extractive-fallback';
    fallback = true;

    if (!rawSummary) {
      console.error('[summaries] fallback summarizer produced no content.');
      return res.status(500).json({
        error: 'Failed to generate summary.',
        details: transformerOutcome.error?.message ?? String(transformerOutcome.error),
      });
    }
  }

  // Post-process: polish & sentence cap
  const polished = clipToSentenceRange(polishSummary(rawSummary), summaryConfig.lengthPreference);

  return res.json({
    summary: polished,
    model,
    options: summaryConfig,
    fallback,
    fallbackReason: !fallback ? undefined : (transformerOutcome.error ? 'transformer-unavailable' : 'transformer-disabled'),
  });
});

// ---------------- Start server ----------------
if (require.main === module) {
  app.listen(DEFAULT_PORT, () => {
    console.log(`Summary service listening on port ${DEFAULT_PORT}`);
  });
}

module.exports = app;
