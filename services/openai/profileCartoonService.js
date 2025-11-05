/**
 * Profile Cartoon Generation Service
 * Uses OpenAI DALL-E to convert profile pictures into cartoon/artistic styles
 */

import { isFeatureEnabled } from '../../config/aiFeatures';
import { getOpenAIKey } from './config';

// Available cartoon styles
export const CARTOON_STYLES = {
  PIXAR: {
    id: 'pixar',
    name: 'Pixar Style',
    description: 'Bright, colorful 3D animated character style like Pixar movies',
    prompt: 'in Pixar 3D animation style, vibrant colors, expressive features, professional studio quality',
  },
  ANIME: {
    id: 'anime',
    name: 'Anime',
    description: 'Japanese anime/manga style with bold lines and expressive eyes',
    prompt: 'in anime manga style, bold clean lines, expressive large eyes, vibrant hair colors',
  },
  COMIC: {
    id: 'comic',
    name: 'Comic Book',
    description: 'Bold comic book style with strong outlines and vibrant colors',
    prompt: 'in comic book superhero style, bold ink outlines, vibrant flat colors, dynamic pose',
  },
  WATERCOLOR: {
    id: 'watercolor',
    name: 'Watercolor',
    description: 'Soft artistic watercolor painting style',
    prompt: 'as a watercolor painting, soft blended colors, artistic brush strokes, gentle lighting',
  },
  DISNEY: {
    id: 'disney',
    name: 'Disney Classic',
    description: 'Classic Disney animation style with smooth features',
    prompt: 'in classic Disney animation style, smooth rounded features, warm friendly expression',
  },
  CARTOON: {
    id: 'cartoon',
    name: 'Classic Cartoon',
    description: 'Traditional cartoon style with exaggerated features',
    prompt: 'as a classic cartoon character, exaggerated features, bold colors, fun expression',
  },
  STUDIO_GHIBLI: {
    id: 'ghibli',
    name: 'Studio Ghibli',
    description: 'Soft, dreamy Studio Ghibli animation style',
    prompt: 'in Studio Ghibli animation style, soft features, dreamy atmosphere, hand-drawn quality',
  },
  SOUTH_PARK: {
    id: 'southpark',
    name: 'Simple Cartoon',
    description: 'Simple, minimalist cartoon style with basic shapes',
    prompt: 'in simple minimalist cartoon style, basic geometric shapes, flat colors, cutout paper style',
  },
};

// Usage limits per subscription plan
export const USAGE_LIMITS = {
  basic: {
    monthly: 0,
    lifetime: 1, // Only once ever
  },
  premium: {
    monthly: 2,
    lifetime: null, // Unlimited lifetime
  },
  gold: {
    monthly: 2,
    lifetime: null, // Unlimited lifetime
  },
};

/**
 * Generate a cartoon version of a profile picture
 * @param {string} imageUrl - URL of the original profile picture
 * @param {string} styleId - ID of the cartoon style to apply
 * @param {string} gender - Optional gender hint (male/female/neutral)
 * @returns {Promise<{imageUrl: string, style: string}>}
 */
export async function generateCartoonProfile(imageUrl, styleId = 'pixar', gender = 'neutral') {
  if (!isFeatureEnabled('profileCartoon')) {
    throw new Error('Profile cartoon generation is not enabled');
  }

  const apiKey = getOpenAIKey();
  if (!apiKey) {
    throw new Error('OpenAI API key not configured');
  }

  const style = CARTOON_STYLES[styleId.toUpperCase()] || CARTOON_STYLES.PIXAR;

  // Construct the prompt based on gender hint
  const genderHint = gender !== 'neutral' ? `${gender} ` : '';
  const prompt = `Create a ${genderHint}portrait ${style.prompt}. Focus on the face and upper body. Make it friendly, professional, and suitable for a social media profile picture. High quality, detailed, expressive.`;

  try {
    console.log('[profileCartoonService] Generating cartoon with style:', style.name);

    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt: prompt,
        n: 1,
        size: '1024x1024',
        quality: 'standard', // Use 'standard' for cost efficiency, 'hd' for better quality
        style: 'vivid', // 'vivid' for more dramatic, 'natural' for more realistic
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('[profileCartoonService] OpenAI API error:', errorData);
      throw new Error(errorData.error?.message || 'Failed to generate cartoon profile');
    }

    const data = await response.json();

    if (!data.data || data.data.length === 0) {
      throw new Error('No image generated');
    }

    console.log('[profileCartoonService] Successfully generated cartoon');

    return {
      imageUrl: data.data[0].url,
      style: style.id,
      revisedPrompt: data.data[0].revised_prompt,
    };
  } catch (error) {
    console.error('[profileCartoonService] Error:', error);
    throw error;
  }
}

/**
 * Check if user can generate a cartoon profile
 * @param {object} userProfile - User profile with subscription info
 * @param {number} currentMonthUsage - Number of generations this month
 * @param {number} lifetimeUsage - Total number of generations ever
 * @returns {{canGenerate: boolean, reason: string}}
 */
export function canGenerateCartoon(userProfile, currentMonthUsage = 0, lifetimeUsage = 0) {
  const subscriptionPlan = userProfile?.subscriptionPlan || 'basic';
  const limits = USAGE_LIMITS[subscriptionPlan] || USAGE_LIMITS.basic;

  // Check lifetime limit (for basic plan)
  if (limits.lifetime !== null && lifetimeUsage >= limits.lifetime) {
    return {
      canGenerate: false,
      reason: `Basic plan users can only generate ${limits.lifetime} cartoon profile. Upgrade to Premium for more!`,
    };
  }

  // Check monthly limit
  if (limits.monthly !== null && currentMonthUsage >= limits.monthly) {
    return {
      canGenerate: false,
      reason: `You've used all ${limits.monthly} cartoon generations this month. Your limit resets next month.`,
    };
  }

  return {
    canGenerate: true,
    reason: null,
  };
}

/**
 * Get usage stats display text
 * @param {string} subscriptionPlan - User's subscription plan
 * @param {number} currentMonthUsage - Number of generations this month
 * @param {number} lifetimeUsage - Total number of generations ever
 * @returns {string}
 */
export function getUsageStatsText(subscriptionPlan = 'basic', currentMonthUsage = 0, lifetimeUsage = 0) {
  const limits = USAGE_LIMITS[subscriptionPlan] || USAGE_LIMITS.basic;

  if (subscriptionPlan === 'basic') {
    return lifetimeUsage >= limits.lifetime
      ? 'Used your one-time generation. Upgrade to Premium for 2/month!'
      : 'One-time generation available';
  }

  return `${currentMonthUsage}/${limits.monthly} used this month`;
}
