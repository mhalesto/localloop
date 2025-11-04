/**
 * Title Generation Service
 * Auto-generates catchy, relevant titles from post content using OpenAI GPT-3.5-turbo
 */

import { getOpenAIHeaders, OPENAI_ENDPOINTS } from './config';

/**
 * Title styles
 */
export const TITLE_STYLES = {
  CATCHY: 'catchy', // Attention-grabbing, engaging
  DESCRIPTIVE: 'descriptive', // Clear, informative
  QUESTION: 'question', // Question format
  EMOTIONAL: 'emotional', // Emotionally resonant
  DIRECT: 'direct', // Straight to the point
};

/**
 * Generate a title from post content
 * @param {string} message - Post message/description
 * @param {string} style - Title style
 * @param {Object} options - Configuration options
 * @returns {Promise<Object>} Generated title result
 */
export async function generateTitle(message, style = TITLE_STYLES.DESCRIPTIVE, options = {}) {
  if (!message || message.trim().length < 10) {
    throw new Error('Message too short to generate title');
  }

  // Define system prompts for different styles
  const systemPrompts = {
    catchy:
      'You are a creative title writer. Generate an attention-grabbing, engaging title (max 70 characters) for this post. Make it interesting and clickable.',
    descriptive:
      'You are a clear communicator. Generate a descriptive, informative title (max 70 characters) that clearly explains what the post is about.',
    question:
      'You are a curious questioner. Turn the main idea of this post into a compelling question (max 70 characters) that would make people want to read it.',
    emotional:
      'You are an empathetic writer. Generate an emotionally resonant title (max 70 characters) that captures the feeling or tone of this post.',
    direct:
      'You are a direct communicator. Generate a straight-to-the-point title (max 70 characters) that summarizes the post in the simplest way.',
  };

  const systemPrompt = systemPrompts[style] || systemPrompts.descriptive;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), options.timeout || 8000);

  try {
    // Truncate long messages
    const truncatedMessage = message.length > 1000 ? message.substring(0, 1000) + '...' : message;

    const response = await fetch(OPENAI_ENDPOINTS.CHAT, {
      method: 'POST',
      headers: getOpenAIHeaders(),
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: `Generate a title for this post:\n\n${truncatedMessage}`,
          },
        ],
        temperature: style === TITLE_STYLES.CATCHY ? 0.8 : 0.5,
        max_tokens: 30,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.warn('[Title Generation] API error:', response.status, errorText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    let title = data.choices?.[0]?.message?.content?.trim();

    if (!title) {
      throw new Error('No title in OpenAI response');
    }

    // Remove quotes if present
    title = title.replace(/^["']|["']$/g, '');

    // Ensure it's not too long (fits in 2 lines nicely)
    if (title.length > 70) {
      title = title.substring(0, 67) + '...';
    }

    return {
      title,
      style,
      method: 'openai',
      tokens: data.usage?.total_tokens || 0,
      timestamp: Date.now(),
    };
  } catch (error) {
    clearTimeout(timeoutId);

    if (error.name === 'AbortError') {
      throw new Error('Title generation timeout');
    }

    console.warn('[Title Generation] Failed:', error.message);
    throw error;
  }
}

/**
 * Generate multiple title options at once
 * @param {string} message - Post message/description
 * @param {Array} styles - Array of title styles to generate
 * @returns {Promise<Array>} Array of title options
 */
export async function generateMultipleTitles(
  message,
  styles = [TITLE_STYLES.DESCRIPTIVE, TITLE_STYLES.CATCHY, TITLE_STYLES.QUESTION]
) {
  try {
    const titles = await Promise.all(
      styles.map(style =>
        generateTitle(message, style).catch(err => ({
          title: null,
          style,
          error: err.message,
        }))
      )
    );

    return titles.filter(t => t.title);
  } catch (error) {
    console.warn('[Multiple Titles] Failed:', error.message);
    return [];
  }
}

/**
 * Get title style labels for UI
 */
export function getTitleStyleLabel(style) {
  const labels = {
    catchy: 'Catchy',
    descriptive: 'Descriptive',
    question: 'Question',
    emotional: 'Emotional',
    direct: 'Direct',
  };

  return labels[style] || 'Default';
}

/**
 * Get title style icons
 */
export function getTitleStyleIcon(style) {
  const icons = {
    catchy: '✨',
    descriptive: '📝',
    question: '❓',
    emotional: '❤️',
    direct: '🎯',
  };

  return icons[style] || '📰';
}

/**
 * Generate fallback title from message
 * Extracts first sentence or first 50 chars
 */
export function generateFallbackTitle(message) {
  if (!message || message.trim().length === 0) {
    return 'Untitled Post';
  }

  // Try to get first sentence
  const firstSentence = message.split(/[.!?]/)[0].trim();

  if (firstSentence.length > 0 && firstSentence.length <= 70) {
    return firstSentence;
  }

  // Otherwise take first 67 chars (fits nicely in 2 lines)
  const truncated = message.substring(0, 67).trim();
  return truncated + (message.length > 67 ? '...' : '');
}
