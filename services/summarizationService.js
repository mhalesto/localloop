// src/services/summarizationService.js
import { summarizeWithGPT4o } from './openai/gpt4Service';

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

const STOPWORDS = new Set([
  'the', 'is', 'at', 'which', 'on', 'a', 'an', 'as', 'are', 'was', 'were', 'be', 'been',
  'have', 'has', 'had', 'do', 'does', 'did', 'to', 'of', 'in', 'for', 'with', 'by', 'and',
  'or', 'but', 'about', 'into', 'through', 'during', 'before', 'after', 'above', 'below',
  'between', 'under', 'over', 'again', 'further', 'then', 'once', 'here', 'there', 'when',
  'where', 'why', 'how', 'all', 'any', 'both', 'each', 'few', 'more', 'most', 'other',
  'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very'
]);

const splitIntoSentences = (text) => {
  const matches = text.match(/[^.!?]+[.!?]+|\S+/g);
  if (!matches) return [text];
  return matches.map((sentence) => sentence.trim()).filter(Boolean);
};

const tokenize = (sentence) =>
  sentence
    .toLowerCase()
    .replace(/[^a-z0-9\s]/gi, ' ')
    .split(/\s+/)
    .filter((token) => token && !STOPWORDS.has(token));

const scoreSentences = (sentences) => {
  const tf = new Map();
  const allTokens = [];

  sentences.forEach((sentence) => {
    const tokens = tokenize(sentence);
    tokens.forEach((token) => tf.set(token, (tf.get(token) ?? 0) + 1));
    allTokens.push(tokens);
  });

  const maxFreq = Math.max(...tf.values(), 1);
  const normalizedTf = new Map();
  tf.forEach((count, word) => normalizedTf.set(word, count / maxFreq));

  return sentences.map((sentence, index) => {
    const tokens = allTokens[index];
    if (!tokens.length) return { sentence, score: 0 };

    const baseScore =
      tokens.reduce((sum, token) => sum + (normalizedTf.get(token) ?? 0), 0) / tokens.length;

    // Slightly boost earlier sentences so announcements keep key info
    const positionBoost = 1 - index / Math.max(sentences.length - 1, 1);
    return { sentence, score: baseScore * (0.85 + 0.15 * positionBoost) };
  });
};

const getTargetSentenceCount = (lengthPreference, totalSentences) => {
  switch (lengthPreference) {
    case 'concise':
      return Math.max(1, Math.round(totalSentences * 0.2));
    case 'detailed':
      return Math.max(3, Math.round(totalSentences * 0.6));
    default:
      return Math.max(2, Math.round(totalSentences * 0.35));
  }
};

const buildLocalSummary = (text, lengthPreference = 'balanced') => {
  const sentences = splitIntoSentences(text);
  if (sentences.length <= 2) {
    return text.length > 600 ? `${text.slice(0, 580).trim()}…` : text;
  }

  const sentenceScores = scoreSentences(sentences)
    .sort((a, b) => b.score - a.score)
    .slice(0, getTargetSentenceCount(lengthPreference, sentences.length))
    .sort((a, b) => sentences.indexOf(a.sentence) - sentences.indexOf(b.sentence))
    .map(({ sentence }) => sentence);

  if (!sentenceScores.length) {
    return sentences.slice(0, getTargetSentenceCount(lengthPreference, sentences.length)).join(' ');
  }

  return sentenceScores.join(' ').trim();
};

/**
 * Summarize post description
 * @param {string} description
 * @param {{ signal?: AbortSignal, lengthPreference?: 'concise'|'balanced'|'detailed', quality?: 'fast'|'best', model?: string, timeoutMs?: number, subscriptionPlan?: string, style?: string }} opts
 */
export async function summarizePostDescription(
  description,
  { lengthPreference, quality, subscriptionPlan = 'basic', style = 'professional' } = {}
) {
  const text = normalizeDescription(description);
  if (!text) {
    throw new Error('Add a description before requesting a summary.');
  }

  // Gold/Ultimate users get GPT-4o summaries with style options
  if (subscriptionPlan === 'gold' || subscriptionPlan === 'ultimate') {
    try {
      console.log('[SummaryService] Gold user detected - using GPT-4o summarization');
      const gpt4Result = await summarizeWithGPT4o(text, {
        lengthPreference: lengthPreference || 'balanced',
        style: style || 'professional',
      });

      return {
        summary: clean(String(gpt4Result.summary)).normalize('NFC'),
        model: gpt4Result.model,
        options: { lengthPreference, style },
        fallback: false,
        quality: 'best',
        goldFeature: true,
      };
    } catch (gpt4Error) {
      console.log('[SummaryService] GPT-4o failed, falling back to local summarizer:', gpt4Error.message);
    }
  }

  const localSummary = buildLocalSummary(text, lengthPreference || 'balanced');
  return {
    summary: clean(localSummary).normalize('NFC'),
    model: 'local-extractive',
    options: { lengthPreference },
    fallback: false,
    quality: quality || 'fast',
  };
}
