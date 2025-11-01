/**
 * Smart Comment Suggestion Service
 * Helps users write thoughtful, relevant comments using OpenAI GPT-3.5-turbo
 */

const OPENAI_CHAT_URL = 'https://api.openai.com/v1/chat/completions';

/**
 * Suggestion types
 */
export const SUGGESTION_TYPES = {
  THOUGHTFUL: 'thoughtful', // Empathetic, considerate response
  ADVICE: 'advice', // Practical advice
  QUESTION: 'question', // Clarifying questions
  SUPPORT: 'support', // Supportive, encouraging
  PERSPECTIVE: 'perspective', // Alternative viewpoint
};

/**
 * Generate a comment suggestion based on post content and type
 * @param {Object} post - The post to respond to
 * @param {string} suggestionType - Type of suggestion to generate
 * @param {Object} options - Configuration options
 * @returns {Promise<Object>} Suggestion result
 */
export async function suggestComment(post, suggestionType = SUGGESTION_TYPES.THOUGHTFUL, options = {}) {
  const apiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error('OpenAI API key not configured');
  }

  const postText = `Title: ${post.title || ''}\n\n${post.message || post.description || ''}`;

  // Define system prompts for different suggestion types
  const systemPrompts = {
    thoughtful: 'You are a thoughtful community member. Write a considerate, empathetic comment that shows you understand the post. Keep it under 100 words. Be genuine and human.',
    advice: 'You are a helpful advisor. Provide practical, actionable advice based on the post. Keep it under 100 words. Be specific and constructive.',
    question: 'You are a curious community member. Ask 1-2 thoughtful clarifying questions that help understand the situation better. Keep it brief.',
    support: 'You are a supportive friend. Write an encouraging, positive comment that offers emotional support. Keep it under 80 words. Be warm and genuine.',
    perspective: 'You are offering a different viewpoint. Provide an alternative perspective that might be helpful, while being respectful. Keep it under 100 words.',
  };

  const systemPrompt = systemPrompts[suggestionType] || systemPrompts.thoughtful;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), options.timeout || 10000);

  try {
    const response = await fetch(OPENAI_CHAT_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Post:\n\n${postText}\n\nWrite a comment:` },
        ],
        temperature: 0.7, // Higher for more creative responses
        max_tokens: 150,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.warn('[Comment Suggestion] API error:', response.status, errorText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const suggestion = data.choices?.[0]?.message?.content?.trim();

    if (!suggestion) {
      throw new Error('No suggestion in OpenAI response');
    }

    return {
      suggestion,
      type: suggestionType,
      method: 'openai',
      tokens: data.usage?.total_tokens || 0,
      timestamp: Date.now(),
    };
  } catch (error) {
    clearTimeout(timeoutId);

    if (error.name === 'AbortError') {
      throw new Error('Suggestion timeout');
    }

    console.warn('[Comment Suggestion] Failed:', error.message);
    throw error;
  }
}

/**
 * Generate multiple suggestion options at once
 * @param {Object} post - The post to respond to
 * @param {Array} types - Array of suggestion types to generate
 * @returns {Promise<Array>} Array of suggestions
 */
export async function suggestMultipleComments(post, types = [SUGGESTION_TYPES.THOUGHTFUL, SUGGESTION_TYPES.ADVICE]) {
  try {
    const suggestions = await Promise.all(
      types.map(type =>
        suggestComment(post, type).catch(err => ({
          suggestion: null,
          type,
          error: err.message,
        }))
      )
    );

    return suggestions.filter(s => s.suggestion);
  } catch (error) {
    console.warn('[Multiple Suggestions] Failed:', error.message);
    return [];
  }
}

/**
 * Get suggestion type labels for UI
 */
export function getSuggestionTypeLabel(type) {
  const labels = {
    thoughtful: 'Thoughtful Response',
    advice: 'Give Advice',
    question: 'Ask Questions',
    support: 'Be Supportive',
    perspective: 'Different View',
  };

  return labels[type] || 'Suggest Comment';
}

/**
 * Get suggestion type icons
 */
export function getSuggestionTypeIcon(type) {
  const icons = {
    thoughtful: '💭',
    advice: '💡',
    question: '❓',
    support: '❤️',
    perspective: '🔄',
  };

  return icons[type] || '💬';
}
