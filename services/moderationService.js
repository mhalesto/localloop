import {
  DEFAULT_MODERATION_ACTION,
  HUGGING_FACE_LANGUAGE_MODEL,
  HUGGING_FACE_TOXICITY_MODEL,
  MODERATION_BLOCK_LABELS,
  MODERATION_LABELS,
  MODERATION_REVIEW_LABELS,
  MODERATION_THRESHOLDS
} from '../constants/moderation';

const HUGGING_FACE_API_BASE = 'https://api-inference.huggingface.co/models';
const HF_API_KEY = process.env.EXPO_PUBLIC_HF_API_KEY ?? process.env.HUGGING_FACE_API_KEY ?? null;

const buildHeaders = () => {
  if (!HF_API_KEY) {
    throw new Error('Hugging Face API key is not configured. Add EXPO_PUBLIC_HF_API_KEY to your env config.');
  }
  return {
    Authorization: `Bearer ${HF_API_KEY}`,
    'Content-Type': 'application/json',
    Accept: 'application/json'
  };
};

const callModel = async (modelId, payload) => {
  const response = await fetch(`${HUGGING_FACE_API_BASE}/${modelId}`, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify({
      ...payload,
      options: { wait_for_model: true, use_cache: true, ...payload?.options }
    })
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(
      `Hugging Face inference failed (${response.status}): ${errorText || response.statusText}`
    );
  }
  return response.json();
};

const sanitizeText = (title = '', message = '') => {
  const segments = [title, message]
    .map((segment) => (segment ?? '').toString().trim())
    .filter(Boolean);
  const combined = segments.length ? segments.join('\n\n') : '';

  // Truncate to 1000 chars to prevent API timeouts with very long posts
  return combined.length > 1000 ? combined.substring(0, 1000) : combined;
};

const scoreLabels = (classification = []) => {
  if (!Array.isArray(classification)) {
    return {};
  }
  return classification.reduce((map, item) => {
    const label = item?.label?.toLowerCase?.();
    const score = typeof item?.score === 'number' ? item.score : 0;
    if (!label) {
      return map;
    }
    map[label] = Math.max(map[label] ?? 0, score);
    return map;
  }, {});
};

const decideAction = (scores) => {
  const blockThreshold = MODERATION_THRESHOLDS.block ?? 0.75;
  const reviewThreshold = MODERATION_THRESHOLDS.review ?? 0.55;

  let action = DEFAULT_MODERATION_ACTION;
  const matchedLabels = [];

  MODERATION_BLOCK_LABELS.forEach((label) => {
    if ((scores[label] ?? 0) >= blockThreshold) {
      action = 'block';
      matchedLabels.push(label);
    }
  });

  if (action !== 'block') {
    MODERATION_REVIEW_LABELS.forEach((label) => {
      if ((scores[label] ?? 0) >= reviewThreshold) {
        action = action === 'review' ? action : 'review';
        matchedLabels.push(label);
      }
    });
  }

  return { action, matchedLabels };
};

const detectLanguage = async (text) => {
  try {
    const response = await callModel(HUGGING_FACE_LANGUAGE_MODEL, { inputs: text });
    const firstResult = Array.isArray(response) ? response[0] : response;
    if (!Array.isArray(firstResult)) {
      return null;
    }
    const [best] = firstResult;
    if (!best?.label) {
      return null;
    }
    return {
      label: best.label,
      score: best.score ?? 0
    };
  } catch (error) {
    console.warn('[moderationService] language detection failed', error);
    return null;
  }
};

export async function analyzePostContent({ title = '', message = '' } = {}) {
  const text = sanitizeText(title, message);
  if (!text) {
    return {
      action: DEFAULT_MODERATION_ACTION,
      scores: {},
      matchedLabels: [],
      language: null,
      raw: null,
    };
  }

  try {
    const classification = await callModel(HUGGING_FACE_TOXICITY_MODEL, {
      inputs: text,
      parameters: {
        candidate_labels: MODERATION_LABELS,
        multi_label: true
      }
    });

    const raw = Array.isArray(classification) ? classification[0] ?? classification : classification;
    const scores = scoreLabels(raw?.labels?.length ? raw.labels.map((label, index) => ({
      label,
      score: Array.isArray(raw.scores) ? raw.scores[index] ?? 0 : 0
    })) : raw);

    const { action, matchedLabels } = decideAction(scores);
    const language = await detectLanguage(text);

    return {
      action,
      scores,
      matchedLabels,
      language,
      raw
    };
  } catch (error) {
    console.warn('[moderationService] analyzePostContent failed', error);
    return {
      action: DEFAULT_MODERATION_ACTION,
      scores: {},
      matchedLabels: [],
      language: null,
      error: error.message,
      raw: null,
    };
  }
}
