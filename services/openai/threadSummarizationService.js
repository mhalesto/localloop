/**
 * Thread Summarization Service
 * Summarizes comment threads using OpenAI GPT-3.5-turbo
 * Reuses the core summarization service
 */

import { smartSummarize } from './summarizationService';

/**
 * Summarize a thread of comments
 * @param {Array} comments - Array of comment objects with text and author
 * @param {Object} post - The original post object
 * @param {Object} options - Configuration options
 * @returns {Promise<Object>} Summary result
 */
export async function summarizeThread(comments = [], post = null, options = {}) {
  if (!comments || comments.length === 0) {
    return {
      summary: 'No comments to summarize.',
      method: 'empty',
      commentCount: 0,
    };
  }

  // Build thread text
  let threadText = '';

  // Include original post if provided
  if (post) {
    threadText += `Original Post: ${post.title || ''}\n${post.message || ''}\n\n`;
  }

  // Add all comments
  threadText += 'Comments:\n\n';
  comments.forEach((comment, index) => {
    const author = comment.authorNickname || comment.author?.nickname || 'Anonymous';
    const text = comment.text || comment.message || '';
    threadText += `${index + 1}. ${author}: ${text}\n\n`;
  });

  // Truncate if too long (GPT-3.5 has ~4k token limit)
  if (threadText.length > 8000) {
    threadText = threadText.substring(0, 8000) + '...\n\n[Thread truncated due to length]';
  }

  try {
    const result = await smartSummarize(threadText, {
      quality: 'balanced',
      timeout: 20000, // 20 seconds for longer threads
      ...options,
    });

    return {
      ...result,
      commentCount: comments.length,
      includesPost: !!post,
    };
  } catch (error) {
    console.warn('[Thread Summary] Failed:', error.message);

    // Fallback: just count comments
    return {
      summary: `This thread has ${comments.length} comment${comments.length === 1 ? '' : 's'}.`,
      method: 'fallback',
      commentCount: comments.length,
      error: error.message,
    };
  }
}

/**
 * Get a quick summary of thread activity
 * Extracts key stats without calling AI
 */
export function getThreadStats(comments = []) {
  if (!comments || comments.length === 0) {
    return {
      totalComments: 0,
      uniqueAuthors: 0,
      hasReplies: false,
    };
  }

  const uniqueAuthors = new Set(
    comments.map(c => c.authorUid || c.author?.uid).filter(Boolean)
  );

  // Check if there are nested replies
  const hasReplies = comments.some(c => c.parentId || c.replyTo);

  return {
    totalComments: comments.length,
    uniqueAuthors: uniqueAuthors.size,
    hasReplies,
  };
}
