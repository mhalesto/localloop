const express = require('express');
const cors = require('cors');

const DEFAULT_PORT = process.env.PORT ? Number(process.env.PORT) : 4000;
const MAX_INPUT_LENGTH = 4000;
const MIN_SUMMARY_LENGTH = 30;
const MAX_SUMMARY_LENGTH = 320;
const DEFAULT_SUMMARY_LENGTH_PREFERENCE = 'balanced';
const SUMMARY_LENGTH_PREFERENCES = Object.freeze({
  concise: { maxRatio: 0.24, minRatio: 0.5 },
  balanced: { maxRatio: 0.35, minRatio: 0.65 },
  detailed: { maxRatio: 0.55, minRatio: 0.8 }
});

let summarizerLoaderPromise = null;
let summarizerInstancePromise = null;
let transformerErrorLogged = false;

const normalizeWhitespace = (value) => String(value ?? '').replace(/\s+/g, ' ').trim();

const splitIntoSentences = (value) => {
  const normalized = normalizeWhitespace(value);
  const matches = normalized.match(/[^.!?]+[.!?]?/g);

  if (!matches) {
    return normalized ? [normalized] : [];
  }

  return matches.map((sentence) => sentence.trim()).filter(Boolean);
};

const truncateSummary = (summary, maxLength) => {
  if (summary.length <= maxLength) {
    return summary;
  }

  const trimmed = summary.slice(0, Math.max(0, maxLength - 1)).trimEnd();
  return `${trimmed}…`;
};

const buildExtractiveSummary = (text, summaryConfig) => {
  const sentences = splitIntoSentences(text);
  const minLength = summaryConfig?.min_length ?? MIN_SUMMARY_LENGTH;
  const maxLength = summaryConfig?.max_length ?? MAX_SUMMARY_LENGTH;

  if (!sentences.length) {
    return truncateSummary(normalizeWhitespace(text).slice(0, maxLength), maxLength);
  }

  const chosenSentences = [];
  let totalLength = 0;

  for (const sentence of sentences) {
    const candidateLength = sentence.length;
    const separatorLength = chosenSentences.length > 0 ? 1 : 0;

    if (!chosenSentences.length || totalLength < minLength) {
      chosenSentences.push(sentence);
      totalLength += candidateLength + separatorLength;
      continue;
    }

    if (totalLength + candidateLength + separatorLength > maxLength) {
      const remaining = maxLength - totalLength - separatorLength;
      if (remaining > 0) {
        const truncated = sentence.slice(0, remaining).trim();
        if (truncated) {
          chosenSentences.push(truncated);
          totalLength += truncated.length + separatorLength;
        }
      }
      break;
    }

    chosenSentences.push(sentence);
    totalLength += candidateLength + separatorLength;
  }

  let summary = chosenSentences.join(' ');

  if (!summary) {
    summary = normalizeWhitespace(text).slice(0, maxLength);
  }

  if (summary.length < minLength) {
    const normalized = normalizeWhitespace(text);
    summary = normalized.slice(0, Math.min(normalized.length, maxLength));
  }

  return truncateSummary(summary.trim(), maxLength);
};

async function loadPipelineFactory() {
  if (!summarizerLoaderPromise) {
    summarizerLoaderPromise = import('@xenova/transformers').then((module) => {
      if (!module || typeof module.pipeline !== 'function') {
        throw new Error('Unable to load summarization pipeline.');
      }
      return module.pipeline;
    });
  }
  return summarizerLoaderPromise;
}

async function getSummarizer() {
  if (!summarizerInstancePromise) {
    summarizerInstancePromise = loadPipelineFactory()
      .then((createPipeline) => createPipeline('summarization', 'facebook/bart-large-cnn'))
      .catch((error) => {
        summarizerInstancePromise = null;
        throw error;
      });
  }
  return summarizerInstancePromise;
}

const clampNumber = (value, min, max) => {
  if (Number.isNaN(Number(value))) {
    return min;
  }
  return Math.min(max, Math.max(min, Number(value)));
};

const resolveLengthPreference = (value) => {
  if (!value) {
    return DEFAULT_SUMMARY_LENGTH_PREFERENCE;
  }

  const normalized = String(value).trim().toLowerCase();
  if (SUMMARY_LENGTH_PREFERENCES[normalized]) {
    return normalized;
  }

  return DEFAULT_SUMMARY_LENGTH_PREFERENCE;
};

const buildSummaryConfig = (inputLength, overrides = {}) => {
  const requestedPreference =
    overrides.lengthPreference ?? overrides.length_preference ?? overrides.preference ?? overrides.style;
  const lengthPreference = resolveLengthPreference(requestedPreference);
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

const app = express();

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

  try {
    const summarizer = await getSummarizer();
    const result = await summarizer(content, {
      min_length: summaryConfig.min_length,
      max_length: summaryConfig.max_length
    });
    const summaryText = Array.isArray(result) ? result[0]?.summary_text ?? '' : '';

    if (!summaryText) {
      throw new Error('Summarizer did not return any content.');
    }

    res.json({
      summary: summaryText.trim(),
      model: 'facebook/bart-large-cnn',
      options: summaryConfig,
    });
  } catch (error) {
    if (!transformerErrorLogged) {
      console.error('[summaries] transformer error, enabling extractive fallback:', error);
      transformerErrorLogged = true;
    }

    console.warn('[summaries] using extractive fallback summarizer.');

    const fallbackSummary = buildExtractiveSummary(content, summaryConfig);

    if (!fallbackSummary) {
      console.error('[summaries] fallback summarizer produced no content.');
      return res.status(500).json({
        error: 'Failed to generate summary.',
        details: error?.message ?? String(error),
      });
    }

    res.json({
      summary: fallbackSummary,
      model: 'extractive-fallback',
      options: summaryConfig,
      fallback: true,
    });
  }
});

if (require.main === module) {
  app.listen(DEFAULT_PORT, () => {
    console.log(`Summary service listening on port ${DEFAULT_PORT}`);
  });
}

module.exports = app;
