/**
 * OpenAI Configuration
 * Centralized config for OpenAI API access through Firebase Functions
 *
 * SECURITY: All OpenAI API calls go through Firebase Functions to keep API keys secure
 */

import { getFunctions, httpsCallable } from 'firebase/functions';
import { firebaseApp } from '../../api/firebaseConfig';

const functions = getFunctions(firebaseApp);

/**
 * Check if OpenAI is configured (always true now since it's backend-based)
 */
export function isOpenAIConfigured() {
  return true; // OpenAI is configured on the backend
}

/**
 * Call OpenAI services through Firebase Functions
 * This ensures API keys are never exposed to the client
 *
 * @param {string} service - The OpenAI service to call
 * @param {object} params - Parameters for the service
 * @returns {Promise<object>} The response from OpenAI
 */
export async function callOpenAIService(service, params) {
  try {
    const openAIProxy = httpsCallable(functions, 'openAIProxy');
    const result = await openAIProxy({ service, params });

    if (result.data?.success) {
      return result.data.data;
    } else {
      throw new Error('OpenAI service call failed');
    }
  } catch (error) {
    console.error(`[OpenAI Config] Error calling ${service}:`, error);

    // Provide user-friendly error messages
    if (error.code === 'unauthenticated') {
      throw new Error('Please sign in to use AI features');
    } else if (error.code === 'failed-precondition') {
      throw new Error('AI service is temporarily unavailable');
    } else {
      throw new Error('Failed to process AI request. Please try again.');
    }
  }
}

/**
 * Legacy function - no longer returns actual API key
 * @deprecated API keys are now server-side only
 */
export function getOpenAIKey() {
  console.warn('getOpenAIKey() is deprecated. OpenAI API keys are now server-side only.');
  return null;
}

/**
 * Legacy function - no longer returns actual headers
 * @deprecated Headers are now handled server-side
 */
export function getOpenAIHeaders() {
  console.warn('getOpenAIHeaders() is deprecated. OpenAI headers are now handled server-side.');
  return {};
}
