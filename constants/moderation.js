export const HUGGING_FACE_TOXICITY_MODEL = 'facebook/bart-large-mnli';
export const HUGGING_FACE_LANGUAGE_MODEL = 'papluca/xlm-roberta-base-language-detection';

export const MODERATION_LABELS = Object.freeze([
  'toxic',
  'hate',
  'harassment',
  'sexual',
  'nsfw',
  'self-harm',
  'safe'
]);

export const MODERATION_THRESHOLDS = Object.freeze({
  block: 0.75,
  review: 0.55,
  info: 0.3
});

export const MODERATION_BLOCK_LABELS = Object.freeze(['hate', 'harassment', 'self-harm']);
export const MODERATION_REVIEW_LABELS = Object.freeze(['toxic', 'sexual', 'nsfw']);

export const DEFAULT_MODERATION_ACTION = 'allow'; // allow | review | block
