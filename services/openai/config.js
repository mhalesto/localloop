/**
 * OpenAI Configuration
 * Centralized config for OpenAI API access
 */

import Constants from 'expo-constants';

/**
 * Get OpenAI API key from environment
 * Tries multiple sources to ensure it works in all Expo environments
 */
export function getOpenAIKey() {
  // Try process.env first (works in most cases)
  if (process.env.EXPO_PUBLIC_OPENAI_API_KEY) {
    return process.env.EXPO_PUBLIC_OPENAI_API_KEY;
  }

  // Try Constants.expoConfig.extra (works with app.config.js)
  if (Constants.expoConfig?.extra?.EXPO_PUBLIC_OPENAI_API_KEY) {
    return Constants.expoConfig.extra.EXPO_PUBLIC_OPENAI_API_KEY;
  }

  // Try Constants.manifest.extra (works with older Expo versions)
  if (Constants.manifest?.extra?.EXPO_PUBLIC_OPENAI_API_KEY) {
    return Constants.manifest.extra.EXPO_PUBLIC_OPENAI_API_KEY;
  }

  // Try Constants.manifest2 (works with EAS builds)
  if (Constants.manifest2?.extra?.expoClient?.extra?.EXPO_PUBLIC_OPENAI_API_KEY) {
    return Constants.manifest2.extra.expoClient.extra.EXPO_PUBLIC_OPENAI_API_KEY;
  }

  return null;
}

/**
 * Check if OpenAI is configured
 */
export function isOpenAIConfigured() {
  const key = getOpenAIKey();
  return Boolean(key && key.length > 20);
}

/**
 * OpenAI API endpoints
 */
export const OPENAI_ENDPOINTS = {
  CHAT: 'https://api.openai.com/v1/chat/completions',
  MODERATION: 'https://api.openai.com/v1/moderations',
  EMBEDDINGS: 'https://api.openai.com/v1/embeddings',
};

/**
 * Common OpenAI request headers
 */
export function getOpenAIHeaders() {
  const apiKey = getOpenAIKey();

  if (!apiKey) {
    throw new Error('OpenAI API key not configured. Please set EXPO_PUBLIC_OPENAI_API_KEY in your .env file.');
  }

  return {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  };
}
