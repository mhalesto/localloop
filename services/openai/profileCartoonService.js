/**
 * Profile Cartoon Generation Service
 * Uses OpenAI DALL-E to convert profile pictures into cartoon/artistic styles
 * Gold users get GPT-4o Vision analysis for personalized results
 */

import { isFeatureEnabled } from '../../config/aiFeatures';
import { callOpenAI, OPENAI_ENDPOINTS } from './config';
import { analyzePhotoForCartoon } from './gpt4Service';

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
  // Realistic Photography Styles
  PROFESSIONAL_PORTRAIT: {
    id: 'professional',
    name: 'Professional Portrait',
    description: 'High-quality professional photography with soft studio lighting',
    prompt: 'professional portrait photography, soft studio lighting, clean background, sharp focus, professional headshot quality, natural skin tones, confident expression',
  },
  GOLDEN_HOUR: {
    id: 'golden',
    name: 'Golden Hour',
    description: 'Warm sunset lighting with natural outdoor glow',
    prompt: 'golden hour photography, warm sunset lighting, natural outdoor setting, soft glowing light, dreamy atmosphere, professional photography quality',
  },
  CINEMATIC: {
    id: 'cinematic',
    name: 'Cinematic',
    description: 'Movie-quality dramatic lighting and composition',
    prompt: 'cinematic photography, dramatic lighting, movie poster quality, professional color grading, depth of field, artistic composition',
  },
  FASHION_EDITORIAL: {
    id: 'fashion',
    name: 'Fashion Editorial',
    description: 'High-fashion magazine style with bold creative lighting',
    prompt: 'fashion editorial photography, high-end magazine quality, creative lighting, professional styling, bold composition, vogue style',
  },
  NATURAL_BEAUTY: {
    id: 'natural',
    name: 'Natural Beauty',
    description: 'Soft natural lighting with authentic, organic feel',
    prompt: 'natural beauty photography, soft diffused natural light, authentic expression, minimal retouching, fresh and organic feel',
  },
  DRAMATIC_LIGHTING: {
    id: 'dramatic',
    name: 'Dramatic Lighting',
    description: 'Bold shadows and highlights with artistic flair',
    prompt: 'dramatic portrait lighting, bold shadows and highlights, artistic lighting setup, professional photography, striking contrast',
  },
  // Ultra-Realistic Photographic Styles (Photorealistic Mode)
  ULTRA_REALISTIC: {
    id: 'ultra-realistic',
    name: 'Ultra Realistic',
    description: 'Hyper-realistic photography that looks indistinguishable from reality',
    prompt: 'ultra realistic photography, hyper detailed, photorealistic, high resolution, professional DSLR camera quality, natural skin texture, real photograph, lifelike, 8k quality',
  },
  PROFESSIONAL_HEADSHOT: {
    id: 'headshot',
    name: 'Professional Headshot',
    description: 'Corporate professional headshot for LinkedIn or business use',
    prompt: 'professional corporate headshot, business attire, neutral background, studio lighting, sharp focus, corporate photography, LinkedIn profile quality, professional and approachable',
  },
  PHOTOJOURNALISM: {
    id: 'photojournalism',
    name: 'Photojournalism',
    description: 'Authentic documentary-style candid photography',
    prompt: 'photojournalism style, candid moment, authentic expression, natural lighting, documentary photography, real moment captured, journalistic quality, unposed',
  },
  MAGAZINE_COVER: {
    id: 'magazine',
    name: 'Magazine Cover',
    description: 'High-end magazine cover quality with perfect retouching',
    prompt: 'magazine cover photography, high-end retouching, perfect lighting, professional hair and makeup, glossy magazine quality, cover-worthy shot, sophisticated and polished',
  },
  STREET_PHOTOGRAPHY: {
    id: 'street',
    name: 'Street Photography',
    description: 'Urban candid style with authentic city atmosphere',
    prompt: 'street photography style, urban setting, candid expression, natural city lighting, authentic moment, photojournalistic quality, real urban environment',
  },
  STUDIO_GLAMOUR: {
    id: 'glamour',
    name: 'Studio Glamour',
    description: 'High-key glamour photography with flawless lighting',
    prompt: 'studio glamour photography, high-key lighting, flawless skin, professional retouching, beauty photography, elegant and sophisticated, high-end quality',
  },
};

const GOLD_LIMITS = {
  monthly: 200, // Gold users can generate 200 cartoons per month
  lifetime: null, // Unlimited lifetime
  historyLimit: 100, // Gold users can save 100 cartoons in history
  gpt4VisionMonthly: 200, // Gold users get 200 GPT-4 Vision generations per month
};

// Advanced models count against the GPT-4 Vision pool
const ADVANCED_VISION_MODELS = ['gpt-4', 'gpt-5', 'gpt-5.1'];

// Usage limits per subscription plan
export const USAGE_LIMITS = {
  basic: {
    monthly: 0,
    lifetime: 5, // Free users get 5 lifetime generations
    historyLimit: 10, // Free Go users can save 10 cartoons in history
    gpt4VisionMonthly: 0, // No GPT-4 Vision for Basic
  },
  premium: {
    monthly: 10, // Premium users get 10 generations per month
    lifetime: null, // Unlimited lifetime
    historyLimit: 50, // Premium users can save 50 cartoons in history
    gpt4VisionMonthly: 0, // No GPT-4 Vision for Premium
  },
  gold: GOLD_LIMITS, // Legacy name for Premium tier in some configs
  ultimate: GOLD_LIMITS, // Actual Gold plan (user-facing "Gold")
};

export function normalizeSubscriptionPlan(plan = 'basic') {
  if (!plan) {
    return 'basic';
  }
  const normalized = typeof plan === 'string' ? plan.toLowerCase() : String(plan).toLowerCase();
  return USAGE_LIMITS[normalized] ? normalized : 'basic';
}

/**
 * Analyze profile picture using Vision API
 * @param {string} imageUrl - URL of the profile picture
 * @param {string} apiKey - OpenAI API key
 * @returns {Promise<string>} Description of the person
 */
async function analyzeProfilePicture(imageUrl, apiKey) {
  try {
    console.log('[profileCartoonService] Analyzing profile picture with Vision API');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Describe this person\'s appearance in detail for creating a cartoon portrait. Focus on: facial features, hair style and color, skin tone, expression, clothing visible, and any distinctive characteristics. Keep it concise but descriptive (2-3 sentences).',
              },
              {
                type: 'image_url',
                image_url: {
                  url: imageUrl,
                  detail: 'low', // Use 'low' for cost efficiency
                },
              },
            ],
          },
        ],
        max_tokens: 150,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('[profileCartoonService] Vision API error:', errorData);
      throw new Error('Failed to analyze profile picture');
    }

    const data = await response.json();
    const description = data.choices[0]?.message?.content || '';

    console.log('[profileCartoonService] Profile description:', description);
    return description;

  } catch (error) {
    console.error('[profileCartoonService] Error analyzing image:', error);
    // If analysis fails, return generic description
    return 'A person with a friendly expression';
  }
}

// Track last request time to prevent rate limiting
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 3000; // 3 seconds between requests

/**
 * Generate multiple cartoon variations (Story Teller mode)
 * @param {string} imageUrl - URL of the original image
 * @param {string} styleId - Style ID or 'custom'
 * @param {number} quantity - Number of variations to generate (2-5)
 * @param {string} gender - Gender hint
 * @param {string} customPrompt - Custom prompt for variations
 * @param {string} subscriptionPlan - User's plan
 * @param {string} model - AI model to use ('gpt-3.5-turbo' | 'gpt-4' | 'gpt-5.1')
 * @param {number} gpt4VisionUsage - GPT-4 usage count
 * @param {function} onProgress - Progress callback ({current, total, image})
 * @returns {Promise<Array>} Array of generated image URLs and metadata
 */
export async function generateStoryTellerBatch(
  imageUrl,
  styleId = 'pixar',
  quantity = 3,
  gender = 'neutral',
  customPrompt = null,
  subscriptionPlan = 'gold',
  model = 'gpt-3.5-turbo',
  gpt4VisionUsage = 0,
  onProgress = null,
  photorealisticMode = false
) {
  const normalizedPlan = normalizeSubscriptionPlan(subscriptionPlan);
  const isGoldTier = normalizedPlan === 'gold' || normalizedPlan === 'ultimate';
  const limits = USAGE_LIMITS[normalizedPlan] || USAGE_LIMITS.basic;
  const gpt4Limit = limits.gpt4VisionMonthly || 0;
  let actualModel = model;

  if (quantity < 2 || quantity > 5) {
    throw new Error('Story Teller mode requires 2-5 images');
  }

  console.log(`[profileCartoonService] 🎨 Starting Story Teller batch generation:`, {
    quantity,
    styleId,
    hasCustomPrompt: !!customPrompt,
    subscriptionPlan: normalizedPlan,
    model: actualModel
  });

  const results = [];

  if (isGoldTier && ADVANCED_VISION_MODELS.includes(model) && gpt4Limit && gpt4VisionUsage >= gpt4Limit) {
    console.log(`[profileCartoonService] Advanced Vision limit reached (${gpt4VisionUsage}/${gpt4Limit}) for ${model}, falling back to GPT-3.5 for Story Teller`);
    actualModel = 'gpt-3.5-turbo';
  }

  // STEP 1: Generate the first reference image and extract its revised prompt
  console.log('[profileCartoonService] 🎨 Generating first image as reference...');

  let firstImagePrompt = null;
  let baseCharacterDescription = null;

  // Get Vision description if available
  if (imageUrl) {
    try {
      console.log('[profileCartoonService] 🔍 Analyzing image for character details...');
      baseCharacterDescription = await analyzePhotoForCartoon(imageUrl, actualModel);
      console.log('[profileCartoonService] ✅ Vision analysis complete');
    } catch (error) {
      console.warn('[profileCartoonService] Vision analysis failed, will use generic description');
    }
  }

  // Generate first image and capture DALL-E's revised prompt
  const photorealisticEnhancement = photorealisticMode ? ' Use photorealistic style that looks like a real photograph. Natural skin texture, realistic lighting, authentic details.' : '';
  let firstPrompt;
  if (styleId === 'custom' && customPrompt) {
    if (baseCharacterDescription) {
      firstPrompt = `Create a cartoon avatar: ${customPrompt}. Based on this person: ${baseCharacterDescription}. Looking directly at camera. High quality, detailed, profile picture.${photorealisticEnhancement}`;
    } else {
      firstPrompt = `${customPrompt}. Looking directly at camera. High quality, detailed, professional illustration.${photorealisticEnhancement}`;
    }
  } else {
    const style = CARTOON_STYLES[styleId.toUpperCase()] || CARTOON_STYLES.PIXAR;
    if (baseCharacterDescription) {
      firstPrompt = `Create a ${style.prompt} portrait avatar based on: ${baseCharacterDescription}. Looking directly at camera. High quality, detailed, profile picture.${photorealisticEnhancement}`;
    } else {
      const genderHint = gender !== 'neutral' ? `${gender} ` : '';
      firstPrompt = `Create a ${genderHint}${style.prompt} portrait. Looking directly at camera. High quality, detailed, profile picture.${photorealisticEnhancement}`;
    }
  }

  if (photorealisticMode) {
    console.log('[profileCartoonService] 📸 PHOTOREALISTIC MODE ENABLED for Story Teller batch');
  }

  const imageQuality = isGoldTier ? 'hd' : 'standard';
  const imageStyle = photorealisticMode ? 'natural' : 'vivid';

  const firstGeneration = await callOpenAI(OPENAI_ENDPOINTS.IMAGES, {
    model: 'dall-e-3',
    prompt: firstPrompt,
    n: 1,
    size: '1024x1024',
    quality: imageQuality,
    style: imageStyle,
  });

  const firstImage = {
    imageUrl: firstGeneration.data[0].url,
    usedGpt4: isGoldTier && ADVANCED_VISION_MODELS.includes(actualModel),
    revised_prompt: firstGeneration.data[0].revised_prompt,
  };

  // Extract DALL-E's interpretation from the revised prompt
  firstImagePrompt = firstGeneration.data[0].revised_prompt;
  console.log('[profileCartoonService] ✅ First image generated, DALL-E revised prompt:', firstImagePrompt.substring(0, 150) + '...');

  results.push({
    ...firstImage,
    variation: 0,
    variationPrompt: '',
  });

  // Report progress for first image
  if (onProgress) {
    onProgress({
      current: 1,
      total: quantity,
      image: firstImage,
    });
  }

  // STEP 2: Define pose/expression variations
  const poseVariations = [
    'looking directly at the camera with a neutral expression',
    'turned slightly to the left with a warm, genuine smile',
    'facing right with eyes full of wonder and curiosity',
    'laughing joyfully with bright, sparkling eyes',
    'thoughtful and contemplative, gazing slightly upward',
  ];

  // STEP 3: Generate remaining variations using DALL-E's revised prompt
  // Use the EXACT character description DALL-E generated for the first image
  for (let i = 1; i < quantity; i++) {
    try {
      console.log(`[profileCartoonService] 🎨 Generating variation ${i + 1}/${quantity}...`);

      // Use DALL-E's own revised prompt as the character description
      // This ensures maximum consistency since we're using DALL-E's exact interpretation
      const finalPrompt = `${firstImagePrompt}

IMPORTANT: Keep the EXACT SAME character, clothing, hairstyle, colors, and art style as described above.
ONLY change the following - Pose and expression: ${poseVariations[i - 1]}`;

      console.log(`[profileCartoonService] 🎨 Variation ${i + 1}:`, {
        pose: poseVariations[i - 1],
        usingRevisedPrompt: true,
        revisedPromptPreview: firstImagePrompt.substring(0, 100) + '...',
        promptLength: finalPrompt.length
      });

      // Generate directly with DALL-E using the final prompt
      const imageQuality = isGoldTier ? 'hd' : 'standard';

      const data = await callOpenAI(OPENAI_ENDPOINTS.IMAGES, {
        model: 'dall-e-3',
        prompt: finalPrompt,
        n: 1,
        size: '1024x1024',
        quality: imageQuality,
        style: imageStyle, // Use photorealistic 'natural' style if enabled
      });

      const result = {
        imageUrl: data.data[0].url,
        usedGpt4: isGoldTier && ADVANCED_VISION_MODELS.includes(actualModel),
        revised_prompt: data.data[0].revised_prompt || null,
      };

      console.log(`[profileCartoonService] ✅ Image ${i + 1} generated:`, {
        hasImageUrl: !!result.imageUrl,
        imageUrlPreview: result.imageUrl ? result.imageUrl.substring(0, 50) + '...' : 'No URL',
        usedGpt4: result.usedGpt4,
      });

      results.push({
        ...result,
        variation: i,
        variationPrompt: poseVariations[i - 1],
      });

      // Report progress
      if (onProgress) {
        onProgress({
          current: i + 1,
          total: quantity,
          image: result,
        });
      }

      console.log(`[profileCartoonService] 📊 Story Teller progress: ${i + 1}/${quantity} completed, ${results.length} results collected`);

      // Add delay between requests to avoid rate limiting
      if (i < quantity - 1) {
        console.log(`[profileCartoonService] ⏳ Waiting 2s before next generation...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    } catch (error) {
      console.error(`[profileCartoonService] ❌ Failed to generate variation ${i + 1}:`, error);
      throw new Error(`Failed to generate variation ${i + 1}: ${error.message}`);
    }
  }

  console.log(`[profileCartoonService] 🎉 Story Teller batch complete:`, {
    requestedQuantity: quantity,
    actualResults: results.length,
    allHaveUrls: results.every(r => !!r.imageUrl),
    resultSummary: results.map((r, idx) => ({
      index: idx,
      hasUrl: !!r.imageUrl,
      variation: r.variation
    }))
  });

  return results;
}

/**
 * Generate a cartoon version of a profile picture
 * @param {string} imageUrl - URL of the original profile picture
 * @param {string} styleId - ID of the cartoon style to apply, or 'custom' for custom prompt
 * @param {string} gender - Optional gender hint (male/female/neutral)
 * @param {string} customPrompt - Optional custom prompt for Gold users (only used if styleId is 'custom')
 * @param {string} subscriptionPlan - User's subscription plan ('basic' | 'premium' | 'gold')
 * @param {string} model - AI model to use ('gpt-3.5-turbo' | 'gpt-4' | 'gpt-5.1')
 * @param {number} gpt4VisionUsage - Current GPT-4 Vision usage this month
 * @returns {Promise<{imageUrl: string, style: string, enhanced: boolean, usedGpt4: boolean}>}
 */
export async function generateCartoonProfile(imageUrl, styleId = 'pixar', gender = 'neutral', customPrompt = null, subscriptionPlan = 'basic', model = 'gpt-3.5-turbo', gpt4VisionUsage = 0, photorealisticMode = false) {
  if (!isFeatureEnabled('profileCartoon')) {
    throw new Error('Profile cartoon generation is not enabled');
  }
  const normalizedPlan = normalizeSubscriptionPlan(subscriptionPlan);
  const isGoldTier = normalizedPlan === 'gold' || normalizedPlan === 'ultimate';

  // Rate limiting: ensure minimum time between requests
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    const waitTime = MIN_REQUEST_INTERVAL - timeSinceLastRequest;
    console.log(`[profileCartoonService] Rate limiting: waiting ${waitTime}ms before request`);
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }

  // Check GPT-4 Vision limit for Gold/Ultimate users (Premium tier = 'gold', Gold tier = 'ultimate')
  let actualModel = model;
  const limits = USAGE_LIMITS[normalizedPlan] || USAGE_LIMITS.basic;
  const gpt4Limit = limits.gpt4VisionMonthly || 0;

  if (isGoldTier && ADVANCED_VISION_MODELS.includes(model) && gpt4Limit && gpt4VisionUsage >= gpt4Limit) {
    console.log(`[profileCartoonService] Advanced Vision limit reached (${gpt4VisionUsage}/${gpt4Limit}) for ${model}, falling back to GPT-3.5`);
    actualModel = 'gpt-3.5-turbo';
  }

  let prompt;
  let styleName;
  let personalizedDescription = null;
  let usedGpt4 = false;

  // ALL users get Vision analysis for accurate, personalized cartoons
  // Only skip if no image URL is provided (text-only generation)
  if (imageUrl) {
    try {
      // Check if we have a valid public URL
      if (!imageUrl.startsWith('https://')) {
        console.warn('[profileCartoonService] ⚠️ SKIPPING Vision analysis - profile photo not yet uploaded to cloud storage');
        console.warn('[profileCartoonService] Photo URL:', imageUrl.substring(0, 50) + '...');
        console.warn('[profileCartoonService] This will result in a generic cartoon that may not resemble the user');
        throw new Error('Profile photo must be uploaded to cloud storage before generating cartoon. Please wait a few seconds for upload to complete.');
      } else {
        // Use requested advanced model when available, otherwise fall back to GPT-4o mini
        const visionModel = actualModel === 'gpt-4' ? 'gpt-4' : actualModel === 'gpt-5.1' ? 'gpt-5.1' : 'gpt-3.5-turbo';
        console.log(`[profileCartoonService] ✅ Analyzing photo with ${visionModel} Vision for personalized cartoon (ALL users)`);
        console.log(`[profileCartoonService] Photo URL: ${imageUrl.substring(0, 80)}...`);

        // Use Vision analysis for ALL users to ensure accurate likeness
        personalizedDescription = await analyzePhotoForCartoon(imageUrl, visionModel);
        console.log('[profileCartoonService] ✅ Vision analysis complete:', personalizedDescription);

        // Only track GPT-4 usage for Gold/Ultimate users using the full GPT-4 model
        if (isGoldTier && ADVANCED_VISION_MODELS.includes(actualModel)) {
          usedGpt4 = true;
        }
      }
    } catch (visionError) {
      console.error('[profileCartoonService] ❌ Vision analysis failed:', visionError.message);
      console.error('[profileCartoonService] Stack:', visionError.stack);
      // Re-throw the error if it's about cloud storage URL
      if (visionError.message.includes('cloud storage') || visionError.message.includes('uploaded')) {
        throw visionError;
      }
      // For other errors, continue without personalization - fallback to gender-based prompt
      console.warn('[profileCartoonService] Falling back to generic prompt without Vision analysis');
    }
  }

  // Check if using custom prompt (Gold exclusive feature)
  if (styleId === 'custom' && customPrompt) {
    styleName = 'Custom';
    const photorealisticEnhancement = photorealisticMode ? ' Use photorealistic style that looks like a real photograph taken with a professional camera. Natural skin texture, realistic lighting, authentic details.' : '';
    // Enhance the custom prompt with personalized details if available
    if (personalizedDescription) {
      prompt = `Create a portrait cartoon avatar: ${customPrompt}. Based on this person: ${personalizedDescription}. Focus on the face and upper body. Make it suitable for a social media profile picture. High quality, detailed, creative.${photorealisticEnhancement}`;
      console.log('[profileCartoonService] Using CUSTOM prompt with Vision personalization (Gold)');
    } else if (!imageUrl) {
      // Text-only generation: Complete creative freedom
      prompt = `${customPrompt}. High quality, detailed, creative, professional illustration.${photorealisticEnhancement}`;
      console.log('[profileCartoonService] Using CUSTOM prompt for text-only generation (unlimited creativity)');
    } else {
      // Custom image provided
      prompt = `Create a portrait cartoon avatar: ${customPrompt}. Focus on the face and upper body. Make it suitable for a social media profile picture. High quality, detailed, creative.${photorealisticEnhancement}`;
      console.log('[profileCartoonService] Using CUSTOM prompt from Gold user');
    }
    if (photorealisticMode) {
      console.log('[profileCartoonService] 📸 PHOTOREALISTIC MODE ENABLED for custom prompt');
    }
  } else {
    // Use predefined style
    const style = CARTOON_STYLES[styleId.toUpperCase()] || CARTOON_STYLES.PIXAR;
    styleName = style.name;

    if (personalizedDescription) {
      // ALL users: Use personalized Vision description for accurate likeness
      const photorealisticEnhancement = photorealisticMode ? ' Use photorealistic style that looks like a real photograph taken with a professional camera. Natural skin texture, realistic lighting, authentic details.' : '';
      prompt = `Create a ${style.prompt} portrait avatar based on this description: ${personalizedDescription}. Match the hairstyle, facial features, expression, clothing colors/patterns, and accessories exactly as described. High quality, detailed, suitable for a profile picture.${photorealisticEnhancement}`;
      console.log('[profileCartoonService] Using predefined style with Vision personalization (ALL users)');
      if (photorealisticMode) {
        console.log('[profileCartoonService] 📸 PHOTOREALISTIC MODE ENABLED - Enhanced for ultra-realistic output');
      }
    } else {
      // Fallback: Use generic prompt (only if Vision failed)
      const genderHint = gender !== 'neutral' ? `${gender} ` : '';
      const photorealisticEnhancement = photorealisticMode ? ' Use photorealistic style that looks like a real photograph taken with a professional camera. Natural skin texture, realistic lighting, authentic details.' : '';
      prompt = `Create a ${genderHint}portrait ${style.prompt}. Focus on the face and upper body. Make it friendly, professional, and suitable for a social media profile picture. High quality, detailed, expressive.${photorealisticEnhancement}`;
      console.log('[profileCartoonService] Using generic prompt (Vision analysis unavailable)');
      if (photorealisticMode) {
        console.log('[profileCartoonService] 📸 PHOTOREALISTIC MODE ENABLED - Enhanced for ultra-realistic output');
      }
    }
  }

  try {
    lastRequestTime = Date.now(); // Update last request time
    console.log('[profileCartoonService] Starting cartoon generation with style:', styleName);
    console.log('[profileCartoonService] Full prompt:', prompt);
    console.log('[profileCartoonService] Prompt length:', prompt.length);

    // Try up to 2 times with backoff (we already have rate limiting)
    let lastError = null;
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        console.log(`[profileCartoonService] Attempt ${attempt}/2: Generating with DALL-E 3`);

        // Gold/Ultimate users get HD quality for better results (Premium tier = 'gold', Gold tier = 'ultimate')
        const imageQuality = isGoldTier ? 'hd' : 'standard';
        console.log(`[profileCartoonService] Using ${imageQuality} quality (${normalizedPlan} plan)`);

        // Use 'natural' style for photorealistic mode for more realistic results
        const imageStyle = photorealisticMode ? 'natural' : 'vivid';
        console.log(`[profileCartoonService] Using ${imageStyle} style (photorealistic: ${photorealisticMode})`);

        const data = await callOpenAI(OPENAI_ENDPOINTS.IMAGES, {
          model: 'dall-e-3',
          prompt: prompt,
          n: 1,
          size: '1024x1024',
          quality: imageQuality,
          style: imageStyle,
        });

        if (!data || !data.data || data.data.length === 0) {
          console.error(`[profileCartoonService] Attempt ${attempt} failed: No image in response`);

          // Retry if we haven't exceeded attempts
          if (attempt < 2) {
            const delay = 5000; // Wait 5 seconds before retry
            console.log(`[profileCartoonService] Retrying in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            lastError = new Error('AI service is busy. Please try again in a moment.');
            continue;
          }

          throw new Error('No image generated. Please try again.');
        }

        console.log('[profileCartoonService] Successfully generated cartoon');

        return {
          imageUrl: data.data[0].url,
          style: styleId === 'custom' ? 'custom' : styleId,
          revisedPrompt: data.data[0].revised_prompt,
          enhanced: personalizedDescription !== null, // Indicates Vision analysis was used
          quality: imageQuality,
          subscriptionPlan: normalizedPlan,
          usedGpt4, // Track if GPT-4/GPT-5 Vision was used
        };

      } catch (error) {
        if (attempt === 2) {
          throw error;
        }
        lastError = error;
      }
    }

    throw lastError || new Error('Failed after retries. Please try again later.');

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
 * @param {boolean} isAdmin - Whether the user is an admin
 * @returns {{canGenerate: boolean, reason: string}}
 */
export function canGenerateCartoon(userProfile, currentMonthUsage = 0, lifetimeUsage = 0, isAdmin = false) {
  // Admin users have unlimited access for testing
  if (isAdmin) {
    return {
      canGenerate: true,
      reason: null,
    };
  }

  const subscriptionPlan = normalizeSubscriptionPlan(userProfile?.subscriptionPlan || 'basic');
  const limits = USAGE_LIMITS[subscriptionPlan] || USAGE_LIMITS.basic;

  // Check lifetime limit (for basic plan)
  if (limits.lifetime !== null && lifetimeUsage >= limits.lifetime) {
    return {
      canGenerate: false,
      reason: `Basic plan users can generate ${limits.lifetime} cartoon profiles. Upgrade to Go for ${USAGE_LIMITS.premium.monthly} generations/month!`,
    };
  }

  // Check monthly limit (only for premium users with monthly > 0)
  if (limits.monthly !== null && limits.monthly > 0 && currentMonthUsage >= limits.monthly) {
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
  const normalizedPlan = normalizeSubscriptionPlan(subscriptionPlan);
  const limits = USAGE_LIMITS[normalizedPlan] || USAGE_LIMITS.basic;

  if (normalizedPlan === 'basic') {
    return lifetimeUsage >= limits.lifetime
      ? `Used all ${limits.lifetime} generations. Upgrade to Go for ${USAGE_LIMITS.premium.monthly} generations/month!`
      : `${lifetimeUsage}/${limits.lifetime} lifetime generations used`;
  }

  return `${currentMonthUsage}/${limits.monthly} used this month`;
}

/**
 * Get history limit based on subscription plan
 * @param {string} subscriptionPlan - User's subscription plan
 * @returns {number}
 */
export function getHistoryLimit(subscriptionPlan = 'basic') {
  const normalizedPlan = normalizeSubscriptionPlan(subscriptionPlan);
  const limits = USAGE_LIMITS[normalizedPlan] || USAGE_LIMITS.basic;
  return limits.historyLimit;
}
