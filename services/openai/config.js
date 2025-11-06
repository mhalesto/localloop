/**
 * OpenAI Configuration
 * Centralized config for OpenAI API access through Firebase proxy
 */

import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '../../api/firebaseClient';

/**
 * Check if OpenAI is configured on the server
 * For now, we always return true since the check happens server-side
 */
export function isOpenAIConfigured() {
  return true; // The server will handle the actual check
}

/**
 * OpenAI API endpoints
 */
export const OPENAI_ENDPOINTS = {
  CHAT: '/v1/chat/completions',
  MODERATION: '/v1/moderations',
  EMBEDDINGS: '/v1/embeddings',
  IMAGES: '/v1/images/generations',
};

/**
 * Make a request to OpenAI through our Firebase proxy
 * This keeps the API key secure on the server side
 */
export async function callOpenAI(endpoint, body) {
  try {
    const functions = getFunctions(app);
    const openAIProxy = httpsCallable(functions, 'openAIProxy');

    const result = await openAIProxy({
      endpoint,
      body
    });

    return result.data;
  } catch (error) {
    console.error('[OpenAI Config] Error calling proxy:', error);

    // Handle specific error types
    if (error.code === 'unauthenticated') {
      throw new Error('You must be signed in to use AI features');
    } else if (error.code === 'failed-precondition') {
      throw new Error('AI features are not available at the moment. Please try again later.');
    } else {
      throw new Error(error.message || 'Failed to process AI request');
    }
  }
}

/**
 * Legacy functions for backward compatibility
 */
export function getOpenAIKey() {
  // No longer used - API key is stored server-side
  return null;
}

export function getOpenAIHeaders() {
  // No longer used - headers are set server-side
  throw new Error('Direct OpenAI API access is disabled. Use callOpenAI() instead.');
}
