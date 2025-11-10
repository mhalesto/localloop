/**
 * GPT-4o Service - Gold Tier Exclusive Features
 * Premium AI features powered by GPT-4o for Gold subscribers
 */

import { callOpenAI, OPENAI_ENDPOINTS } from './config';

/**
 * Summarize text using GPT-4o (Gold tier only)
 * Much higher quality than Hugging Face BART
 *
 * @param {string} text - Text to summarize
 * @param {object} options - Summarization options
 * @param {string} options.lengthPreference - 'concise' | 'balanced' | 'detailed'
 * @param {string} options.style - 'professional' | 'casual' | 'emoji' | 'formal'
 * @returns {Promise<{summary: string, style: string, model: string}>}
 */
export async function summarizeWithGPT4o(text, options = {}) {
  const { lengthPreference = 'balanced', style = 'professional' } = options;

  // System prompts for different styles
  const systemPrompts = {
    professional: 'You are a professional content summarizer. Create clear, concise, and professional summaries that capture the key points.',
    casual: 'You are a friendly, casual summarizer. Create summaries that sound natural and conversational, like you\'re telling a friend about it.',
    emoji: 'You are an enthusiastic summarizer who uses relevant emojis to make summaries engaging and fun. Use 2-4 emojis strategically.',
    formal: 'You are a formal academic summarizer. Create summaries with precise language and objective tone.',
  };

  // Length instructions
  const lengthInstructions = {
    concise: 'Summarize in 1-2 short sentences (max 280 characters, like a tweet).',
    balanced: 'Summarize in 2-3 sentences that capture the main points.',
    detailed: 'Summarize in 4-5 sentences with comprehensive coverage of key details.',
  };

  try {
    const response = await callOpenAI(OPENAI_ENDPOINTS.CHAT, {
      model: 'gpt-4o-mini', // Cost-effective for summaries
      messages: [
        {
          role: 'system',
          content: systemPrompts[style] || systemPrompts.professional
        },
        {
          role: 'user',
          content: `${lengthInstructions[lengthPreference]}\n\nPost content:\n${text}`
        }
      ],
      max_tokens: lengthPreference === 'concise' ? 100 : lengthPreference === 'detailed' ? 200 : 150,
      temperature: 0.7,
    });

    const summary = response.choices[0]?.message?.content?.trim();
    if (!summary) {
      throw new Error('No summary generated');
    }

    return {
      summary,
      style,
      model: 'gpt-4o-mini',
      lengthPreference,
    };
  } catch (error) {
    console.error('[GPT-4o] Summarization error:', error);
    throw new Error(`GPT-4o summarization failed: ${error.message}`);
  }
}

/**
 * Analyze photo with Vision for personalized cartoon generation (Gold tier only)
 * Uses GPT-4o Vision to create detailed description of person
 *
 * @param {string} imageUrl - URL of the profile picture (must be publicly accessible https://)
 * @returns {Promise<string>} Detailed description of the person
 */
export async function analyzePhotoForCartoon(imageUrl, model = 'gpt-4o') {
  try {
    // Validate that we have a publicly accessible URL
    if (!imageUrl || !imageUrl.startsWith('https://')) {
      throw new Error('Vision analysis requires a publicly accessible HTTPS URL. Local file paths are not supported.');
    }

    // Map user-friendly model names to vision-capable models
    const visionModel = model === 'gpt-3.5-turbo' ? 'gpt-4o-mini' : model === 'gpt-4' ? 'gpt-4o' : 'gpt-4o';

    console.log(`[GPT Vision] Analyzing profile photo using ${visionModel}`);

    const response = await callOpenAI(OPENAI_ENDPOINTS.CHAT, {
      model: visionModel,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Analyze this person's appearance in detail for creating a personalized cartoon avatar. Provide a comprehensive description including:

- Hair: style, length, color, texture
- Face shape: oval, round, square, heart-shaped, etc.
- Eyes: color, size, shape, any distinctive features
- Nose: shape and size
- Mouth: lips shape, smile type
- Facial hair: if any (beard, mustache style)
- Skin tone: specific description
- Age range: approximate
- Expression: mood and feeling
- Glasses or accessories: if visible
- Clothing: visible attire and colors
- Any distinctive or unique features

Be specific and detailed. This will be used to create a cartoon that truly looks like this person.`,
            },
            {
              type: 'image_url',
              image_url: {
                url: imageUrl,
                detail: 'high', // High detail for Gold users
              },
            },
          ],
        },
      ],
      max_tokens: 400,
    });

    const description = response.choices[0]?.message?.content?.trim();
    if (!description) {
      throw new Error('No description generated');
    }

    console.log('[GPT-4o Vision] Generated personalized description:', description.substring(0, 100) + '...');
    return description;

  } catch (error) {
    console.error('[GPT-4o Vision] Analysis error:', error);
    // Return a fallback but throw so caller knows it failed
    throw new Error(`Vision analysis failed: ${error.message}`);
  }
}

/**
 * Smart Post Composer - AI-assisted post writing (Gold tier only)
 * Helps users write engaging posts based on their ideas
 *
 * @param {string} userIdea - User's initial idea or topic
 * @param {object} options - Composition options
 * @param {string} options.tone - 'friendly' | 'professional' | 'excited' | 'thoughtful'
 * @param {string} options.length - 'short' | 'medium' | 'long'
 * @param {boolean} options.includeHashtags - Whether to include hashtags
 * @param {boolean} options.includeEmojis - Whether to include emojis
 * @returns {Promise<{content: string, hashtags: string[]}>}
 */
export async function composePost(userIdea, options = {}) {
  const {
    tone = 'friendly',
    length = 'medium',
    includeHashtags = true,
    includeEmojis = false,
  } = options;

  const toneInstructions = {
    friendly: 'Write in a warm, approachable, and friendly tone.',
    professional: 'Write in a professional, polished tone suitable for business contexts.',
    excited: 'Write with enthusiasm and excitement, like sharing great news!',
    thoughtful: 'Write in a reflective, thoughtful tone that invites discussion.',
  };

  const lengthInstructions = {
    short: '1-2 short paragraphs (max 500 characters)',
    medium: '2-3 paragraphs (max 1000 characters)',
    long: '3-4 detailed paragraphs (max 1500 characters)',
  };

  try {
    const response = await callOpenAI(OPENAI_ENDPOINTS.CHAT, {
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a helpful assistant that writes engaging social media posts for a neighborhood community app. ${toneInstructions[tone]} Focus on building community, encouraging interaction, and being authentic.`,
        },
        {
          role: 'user',
          content: `Write a post about: ${userIdea}

Length: ${lengthInstructions[length]}
${includeEmojis ? 'Include 2-3 relevant emojis naturally in the text.' : 'Do not use emojis.'}
${includeHashtags ? 'Suggest 3-5 relevant hashtags at the end (format: #hashtag).' : 'Do not include hashtags.'}

Write the post now:`,
        },
      ],
      max_tokens: length === 'short' ? 200 : length === 'long' ? 500 : 350,
      temperature: 0.8, // Higher creativity for writing
    });

    let content = response.choices[0]?.message?.content?.trim();
    if (!content) {
      throw new Error('No content generated');
    }

    // Extract hashtags if present
    const hashtagMatches = content.match(/#\w+/g) || [];
    const hashtags = hashtagMatches.map(tag => tag.substring(1)); // Remove #

    // Remove hashtags from content if they're at the end
    if (hashtags.length > 0) {
      const hashtagSection = hashtagMatches.join(' ');
      if (content.endsWith(hashtagSection)) {
        content = content.substring(0, content.length - hashtagSection.length).trim();
      }
    }

    return {
      content,
      hashtags,
      model: 'gpt-4o-mini',
      tone,
      length,
    };

  } catch (error) {
    console.error('[GPT-4o] Post composition error:', error);
    throw new Error(`Post composition failed: ${error.message}`);
  }
}

/**
 * Enhanced Comment Suggestions (Gold tier only)
 * Generate thoughtful, personalized comment suggestions
 *
 * @param {string} postContent - The post content
 * @param {object} options - Comment options
 * @param {string} options.tone - 'supportive' | 'curious' | 'appreciative' | 'conversational'
 * @param {number} options.count - Number of suggestions (1-3)
 * @returns {Promise<string[]>} Array of comment suggestions
 */
export async function generateCommentSuggestions(postContent, options = {}) {
  const { tone = 'supportive', count = 3 } = options;

  const toneInstructions = {
    supportive: 'supportive and encouraging',
    curious: 'curious and inquisitive, asking thoughtful questions',
    appreciative: 'appreciative and grateful',
    conversational: 'conversational and friendly',
  };

  try {
    const response = await callOpenAI(OPENAI_ENDPOINTS.CHAT, {
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that suggests thoughtful, authentic comments for neighborhood community posts.',
        },
        {
          role: 'user',
          content: `Generate ${count} different ${toneInstructions[tone]} comment${count > 1 ? 's' : ''} for this post. Make them genuine, brief (1-2 sentences), and varied.

Post:
${postContent}

Provide exactly ${count} comment suggestion${count > 1 ? 's' : ''}, one per line, numbered (1., 2., 3.):`,
        },
      ],
      max_tokens: 200,
      temperature: 0.9, // High creativity for varied suggestions
    });

    const suggestions = response.choices[0]?.message?.content?.trim();
    if (!suggestions) {
      throw new Error('No suggestions generated');
    }

    // Parse numbered suggestions
    const parsed = suggestions
      .split('\n')
      .map(line => line.replace(/^\d+\.\s*/, '').trim())
      .filter(line => line.length > 0)
      .slice(0, count);

    return parsed;

  } catch (error) {
    console.error('[GPT-4o] Comment suggestions error:', error);
    throw new Error(`Comment suggestions failed: ${error.message}`);
  }
}

/**
 * Enhanced Translation with Cultural Context (Gold tier only)
 * Translate with cultural awareness and natural phrasing
 *
 * @param {string} text - Text to translate
 * @param {string} targetLanguage - Target language
 * @returns {Promise<{translation: string, language: string}>}
 */
export async function translateWithContext(text, targetLanguage) {
  const languageInstructions = {
    'zu': 'isiZulu',
    'xh': 'isiXhosa',
    'af': 'Afrikaans',
    'st': 'Sesotho',
    'nso': 'Sepedi',
    'tn': 'Setswana',
    'ts': 'Xitsonga',
    've': 'Tshivenda',
    'ss': 'siSwati',
    'nr': 'isiNdebele',
    'en': 'English',
  };

  const languageName = languageInstructions[targetLanguage] || targetLanguage;

  try {
    const response = await callOpenAI(OPENAI_ENDPOINTS.CHAT, {
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are an expert translator specializing in South African languages. Translate with cultural awareness and natural phrasing that respects local customs and expressions.`,
        },
        {
          role: 'user',
          content: `Translate this text to ${languageName}. Make it sound natural and culturally appropriate for South African speakers.

Text:
${text}

Translation:`,
        },
      ],
      max_tokens: 300,
      temperature: 0.3, // Lower temperature for accuracy
    });

    const translation = response.choices[0]?.message?.content?.trim();
    if (!translation) {
      throw new Error('No translation generated');
    }

    return {
      translation,
      language: languageName,
      model: 'gpt-4o-mini',
    };

  } catch (error) {
    console.error('[GPT-4o] Translation error:', error);
    throw new Error(`Translation failed: ${error.message}`);
  }
}

/**
 * Improve Post - Generate 1 better version of existing post (Premium/Gold tier)
 * AI-assisted post improvement - users can regenerate if not satisfied
 *
 * @param {string} title - Post title
 * @param {string} description - Post description/content
 * @param {object} options - Improvement options
 * @param {string} options.style - 'engaging' | 'professional' | 'friendly' | 'enthusiastic'
 * @returns {Promise<{improvedVersion: string, model: string}>}
 */
export async function improvePost(title, description, options = {}) {
  const { style = 'engaging' } = options;

  const styleInstructions = {
    engaging: 'Make it more engaging and compelling while keeping the original message. Add energy and draw readers in.',
    professional: 'Make it more professional and polished. Improve clarity and structure while maintaining warmth.',
    friendly: 'Make it more friendly and conversational. Sound natural and approachable while staying clear.',
    enthusiastic: 'Make it more enthusiastic and exciting! Build excitement while keeping it genuine and authentic.',
  };

  try {
    const response = await callOpenAI(OPENAI_ENDPOINTS.CHAT, {
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a writing assistant that helps improve neighborhood community posts. ${styleInstructions[style]} Always keep the core message intact.`,
        },
        {
          role: 'user',
          content: `Improve this post to make it better. Keep the same essential meaning but make it more impactful.

Title: ${title || '(No title)'}
Description: ${description}

Instructions:
- Maintain the original length (don't make it much longer or shorter)
- Keep the core message and key details
- ${styleInstructions[style]}
- Return ONLY the improved text, no labels or explanations`,
        },
      ],
      max_tokens: 400,
      temperature: 0.8, // Higher creativity for variations
    });

    const improvedVersion = response.choices[0]?.message?.content?.trim();
    if (!improvedVersion) {
      throw new Error('No improvement generated');
    }

    return {
      improvedVersion,
      model: 'gpt-4o-mini',
      style,
    };

  } catch (error) {
    console.error('[GPT-4o] Post improvement error:', error);
    throw new Error(`Post improvement failed: ${error.message}`);
  }
}

/**
 * Check if user has Gold subscription
 * Helper function to verify Gold tier access
 */
export function isGoldUser(userProfile) {
  return userProfile?.subscriptionPlan === 'gold';
}

/**
 * Export all Gold features
 */
export const GoldFeatures = {
  summarizeWithGPT4o,
  analyzePhotoForCartoon,
  composePost,
  improvePost,
  generateCommentSuggestions,
  translateWithContext,
  isGoldUser,
};

export default GoldFeatures;
