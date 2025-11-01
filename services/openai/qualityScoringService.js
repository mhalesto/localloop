/**
 * Post Quality Scoring Service
 * Rates posts on clarity, completeness, helpfulness using OpenAI GPT-3.5-turbo
 * Helps boost quality content in feeds
 */

const OPENAI_CHAT_URL = 'https://api.openai.com/v1/chat/completions';

/**
 * Quality dimensions
 */
export const QUALITY_DIMENSIONS = {
  CLARITY: {
    label: 'Clarity',
    description: 'How clear and easy to understand',
    icon: '💡',
  },
  COMPLETENESS: {
    label: 'Completeness',
    description: 'How much detail and context provided',
    icon: '📋',
  },
  HELPFULNESS: {
    label: 'Helpfulness',
    description: 'How useful to the community',
    icon: '🤝',
  },
  ENGAGEMENT: {
    label: 'Engagement',
    description: 'How likely to generate discussion',
    icon: '💬',
  },
};

/**
 * Quality tiers
 */
export const QUALITY_TIERS = {
  EXCELLENT: { label: 'Excellent', min: 8, color: '#4CAF50', icon: '⭐' },
  GOOD: { label: 'Good', min: 6, color: '#2196F3', icon: '👍' },
  FAIR: { label: 'Fair', min: 4, color: '#FF9800', icon: '👌' },
  NEEDS_IMPROVEMENT: { label: 'Needs Work', min: 0, color: '#9E9E9E', icon: '📝' },
};

/**
 * Score post quality
 * @param {Object} post - Post to score
 * @param {Object} options - Configuration options
 * @returns {Promise<Object>} Quality score result
 */
export async function scorePostQuality(post, options = {}) {
  const apiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error('OpenAI API key not configured');
  }

  const postText = `Title: ${post.title || 'No title'}\n\n${post.message || ''}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), options.timeout || 10000);

  try {
    const systemPrompt = `You are a content quality analyzer. Rate this community post on 4 dimensions (0-10 scale):

1. Clarity: How clear and easy to understand
2. Completeness: How much detail and context provided
3. Helpfulness: How useful to the community
4. Engagement: How likely to generate discussion

Return ONLY a JSON object with scores. Example: {"clarity": 8, "completeness": 7, "helpfulness": 9, "engagement": 8}`;

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
          { role: 'user', content: postText },
        ],
        temperature: 0.3, // Lower for consistent scoring
        max_tokens: 50,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.warn('[Quality Score] API error:', response.status, errorText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim();

    if (!content) {
      throw new Error('No content in OpenAI response');
    }

    // Parse JSON scores
    const scores = JSON.parse(content);

    // Calculate overall score (average)
    const overall =
      (scores.clarity + scores.completeness + scores.helpfulness + scores.engagement) / 4;

    // Determine tier
    let tier = QUALITY_TIERS.NEEDS_IMPROVEMENT;
    if (overall >= QUALITY_TIERS.EXCELLENT.min) {
      tier = QUALITY_TIERS.EXCELLENT;
    } else if (overall >= QUALITY_TIERS.GOOD.min) {
      tier = QUALITY_TIERS.GOOD;
    } else if (overall >= QUALITY_TIERS.FAIR.min) {
      tier = QUALITY_TIERS.FAIR;
    }

    return {
      scores,
      overall: Math.round(overall * 10) / 10, // Round to 1 decimal
      tier,
      method: 'openai',
      tokens: data.usage?.total_tokens || 0,
      timestamp: Date.now(),
    };
  } catch (error) {
    clearTimeout(timeoutId);

    if (error.name === 'AbortError') {
      throw new Error('Quality scoring timeout');
    }

    console.warn('[Quality Score] Failed:', error.message);

    // Fallback: basic heuristic scoring
    return basicQualityScore(post);
  }
}

/**
 * Basic quality scoring fallback (heuristic-based)
 */
function basicQualityScore(post) {
  const title = post.title || '';
  const message = post.message || '';
  const totalLength = title.length + message.length;

  // Simple heuristics
  const hasTitle = title.length > 5 ? 2 : 0;
  const hasGoodLength = totalLength > 100 && totalLength < 2000 ? 2 : 1;
  const hasQuestionMark = message.includes('?') ? 1 : 0;
  const wordCount = message.split(/\s+/).length;
  const hasReasonableWords = wordCount > 20 && wordCount < 500 ? 2 : 1;

  const clarity = Math.min(10, hasTitle + hasGoodLength + 4);
  const completeness = Math.min(10, hasGoodLength + hasReasonableWords + 3);
  const helpfulness = Math.min(10, hasQuestionMark + hasGoodLength + 4);
  const engagement = Math.min(10, hasQuestionMark * 2 + hasTitle + 4);

  const overall = (clarity + completeness + helpfulness + engagement) / 4;

  let tier = QUALITY_TIERS.NEEDS_IMPROVEMENT;
  if (overall >= QUALITY_TIERS.EXCELLENT.min) {
    tier = QUALITY_TIERS.EXCELLENT;
  } else if (overall >= QUALITY_TIERS.GOOD.min) {
    tier = QUALITY_TIERS.GOOD;
  } else if (overall >= QUALITY_TIERS.FAIR.min) {
    tier = QUALITY_TIERS.FAIR;
  }

  return {
    scores: {
      clarity,
      completeness,
      helpfulness,
      engagement,
    },
    overall: Math.round(overall * 10) / 10,
    tier,
    method: 'heuristic',
    timestamp: Date.now(),
  };
}

/**
 * Get quality tier from overall score
 */
export function getQualityTier(overallScore) {
  if (overallScore >= QUALITY_TIERS.EXCELLENT.min) {
    return QUALITY_TIERS.EXCELLENT;
  } else if (overallScore >= QUALITY_TIERS.GOOD.min) {
    return QUALITY_TIERS.GOOD;
  } else if (overallScore >= QUALITY_TIERS.FAIR.min) {
    return QUALITY_TIERS.FAIR;
  }
  return QUALITY_TIERS.NEEDS_IMPROVEMENT;
}

/**
 * Get quality badge emoji
 */
export function getQualityBadge(tier) {
  return tier.icon;
}

/**
 * Should boost post in feed based on quality
 */
export function shouldBoostPost(qualityResult) {
  return qualityResult.overall >= QUALITY_TIERS.GOOD.min;
}
