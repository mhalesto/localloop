const express = require('express');
const cors = require('cors');

const DEFAULT_PORT = process.env.PORT ? Number(process.env.PORT) : 4000;
const MAX_INPUT_LENGTH = 4000;
const MIN_SUMMARY_LENGTH = 30;
const MAX_SUMMARY_LENGTH = 180;

let summarizerLoaderPromise = null;
let summarizerInstancePromise = null;

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
    summarizerInstancePromise = loadPipelineFactory().then((createPipeline) =>
      createPipeline('summarization', 'facebook/bart-large-cnn')
    );
  }
  return summarizerInstancePromise;
}

const clampNumber = (value, min, max) => {
  if (Number.isNaN(Number(value))) {
    return min;
  }
  return Math.min(max, Math.max(min, Number(value)));
};

const buildSummaryConfig = (inputLength, overrides = {}) => {
  const estimatedMax = clampNumber(Math.round(inputLength * 0.35), MIN_SUMMARY_LENGTH, MAX_SUMMARY_LENGTH);
  const maxLength = clampNumber(overrides.max_length ?? overrides.maxLength ?? estimatedMax, MIN_SUMMARY_LENGTH, MAX_SUMMARY_LENGTH);
  const estimatedMin = Math.max(MIN_SUMMARY_LENGTH, Math.round(maxLength * 0.6));
  const minLengthCandidate = overrides.min_length ?? overrides.minLength ?? estimatedMin;
  const minLength = clampNumber(minLengthCandidate, MIN_SUMMARY_LENGTH, Math.max(MIN_SUMMARY_LENGTH, maxLength - 10));

  return { min_length: minLength, max_length: Math.max(minLength + 5, maxLength) };
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

  try {
    const summarizer = await getSummarizer();
    const summaryConfig = buildSummaryConfig(content.length, options);
    const result = await summarizer(content, summaryConfig);
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
    console.error('[summaries] error:', error);
    res.status(500).json({
      error: 'Failed to generate summary.',
      details: error?.message ?? String(error),
    });
  }
});

if (require.main === module) {
  app.listen(DEFAULT_PORT, () => {
    console.log(`Summary service listening on port ${DEFAULT_PORT}`);
  });
}

module.exports = app;
