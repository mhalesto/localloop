/**
 * OpenAI Auto-tagging Service
 * Uses GPT-3.5-turbo for intelligent post categorization
 * Much more reliable than Hugging Face with better accuracy
 */

const OPENAI_CHAT_URL = 'https://api.openai.com/v1/chat/completions';

// Same comprehensive category taxonomy
const CATEGORIES = {
  // Life domains
  RELATIONSHIPS: 'relationships',
  MONEY: 'money',
  WORK: 'work',
  SCHOOL: 'school',
  FAMILY: 'family',
  HEALTH: 'health',
  HOUSING: 'housing',

  // Emotions/Tones
  RANT: 'rant',
  ADVICE: 'advice',
  CELEBRATION: 'celebration',
  QUESTION: 'question',
  STORY: 'story',
  JOKE: 'joke',

  // Issues
  CRIME: 'crime',
  SAFETY: 'safety',
  CORRUPTION: 'corruption',
  SERVICE_DELIVERY: 'service delivery',
  TRANSPORT: 'transport',

  // Activities
  FOOD: 'food',
  ENTERTAINMENT: 'entertainment',
  SPORTS: 'sports',
  POLITICS: 'politics',
  NEWS: 'news',
  TECHNOLOGY: 'tech',

  // Local context
  COMMUNITY: 'community',
  LOCAL_BUSINESS: 'local business',
  EVENTS: 'events',
};

const CATEGORY_LABELS = Object.values(CATEGORIES);

/**
 * Clean and prepare text for classification
 */
function prepareText(title, description) {
  const titleText = (title || '').trim();
  const descText = (description || '').trim();

  // Combine title and first part of description for context
  // Limit to 1000 chars for OpenAI (much more generous than HF)
  const combined = descText
    ? `${titleText}. ${descText.substring(0, 1000)}`
    : titleText;

  const cleaned = combined
    .replace(/\*\*/g, '') // Remove markdown bold
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove markdown links
    .replace(/\s+/g, ' ')
    .trim();

  return cleaned;
}

/**
 * Fallback keyword-based classification (same as before)
 */
function keywordBasedClassification(text) {
  const lowerText = text.toLowerCase();
  const tags = [];

  const patterns = {
    money: /\b(money|cash|salary|pay|rent|bill|debt|loan|finance|afford|expensive|cheap|price|cost|R\d+|rand)\b/i,
    relationships: /\b(boyfriend|girlfriend|dating|love|breakup|break up|relationship|partner|husband|wife|crush|romantic)\b/i,
    work: /\b(work|job|boss|colleague|office|employment|unemployed|salary|career|fired|resign|interview)\b/i,
    school: /\b(school|university|college|student|exam|test|study|teacher|lecturer|degree|assignment|class)\b/i,
    family: /\b(family|mother|father|mom|dad|parent|child|son|daughter|brother|sister|sibling)\b/i,
    housing: /\b(landlord|rent|apartment|flat|house|property|lease|evict|accommodation|tenant)\b/i,
    crime: /\b(crime|theft|steal|stolen|rob|robbed|robbery|mugging|violence|attack|assault|hijack)\b/i,
    safety: /\b(safe|unsafe|danger|dangerous|security|risk|threat|protect|afraid|scared)\b/i,
    transport: /\b(taxi|bus|train|uber|bolt|transport|traffic|commute|driving|car|vehicle)\b/i,
    health: /\b(health|medical|doctor|hospital|sick|ill|disease|clinic|medicine|treatment|mental health)\b/i,
    food: /\b(food|restaurant|eat|meal|cook|recipe|hungry|dinner|lunch|breakfast|cuisine)\b/i,
    rant: /\b(angry|frustrated|annoyed|hate|terrible|worst|sick of|tired of|fed up|disgust)\b/i,
    advice: /\b(help|advice|suggest|recommend|should i|what do|how do|tip|guidance|any idea)\b/i,
    question: /\b(why|how|what|when|where|who|can someone|does anyone|is it|should i|\?)\b/i,
    celebration: /\b(happy|excited|proud|celebrate|success|achievement|finally|great news|won|passed)\b/i,
    joke: /\b(lol|haha|funny|hilarious|joke|laugh|comedy|😂|🤣)\b/i,
    politics: /\b(government|anc|da|eff|party|election|vote|president|parliament|minister|political)\b/i,
    corruption: /\b(corrupt|bribe|fraud|dishonest|illegal|scam|cheat)\b/i,
  };

  for (const [category, pattern] of Object.entries(patterns)) {
    if (pattern.test(lowerText)) {
      tags.push(category);
    }
  }

  if (tags.length === 0) {
    tags.push('story');
  }

  return tags.slice(0, 5);
}

/**
 * Call OpenAI GPT-3.5-turbo for classification
 */
async function classifyWithOpenAI(text, maxTags = 4) {
  const apiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error('OpenAI API key not configured');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

  try {
    const systemPrompt = `You are a post categorization assistant. Analyze the post and categorize it into the most relevant categories from this list:

${CATEGORY_LABELS.join(', ')}

Return ONLY a JSON array of the top ${maxTags} most relevant categories, ordered by relevance. For example: ["money", "work", "advice"]

Be accurate and selective. Only choose categories that truly fit the content.`;

    const userPrompt = `Categorize this post:\n\n${text}`;

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
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3, // Lower temperature for more consistent categorization
        max_tokens: 50,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.warn('[OpenAI AutoTag] API error:', response.status, errorText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No content in OpenAI response');
    }

    // Parse the JSON array from the response
    try {
      const tags = JSON.parse(content.trim());
      if (Array.isArray(tags) && tags.length > 0) {
        // Validate that all tags are in our category list
        const validTags = tags.filter(tag => CATEGORY_LABELS.includes(tag));
        return validTags.length > 0 ? validTags : ['story'];
      }
    } catch (parseError) {
      console.warn('[OpenAI AutoTag] Failed to parse response:', content);
      throw new Error('Invalid JSON response from OpenAI');
    }

    return ['story'];
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('Classification timeout');
    }
    throw error;
  }
}

/**
 * Main auto-tagging function
 * @param {string} title - Post title
 * @param {string} description - Post description/message
 * @param {Object} options - Configuration options
 * @returns {Promise<Object>} Tags and metadata
 */
export async function autoTagPost(title, description, options = {}) {
  const {
    maxTags = 4,
    strategy = 'auto', // 'auto', 'ai', 'keywords'
  } = options;

  const text = prepareText(title, description);

  if (!text || text.length < 10) {
    return {
      tags: ['story'],
      confidence: { story: 1.0 },
      method: 'default',
    };
  }

  let tags = [];
  let confidence = {};
  let method = 'keywords';

  // Try OpenAI classification first (if strategy allows)
  if (strategy === 'auto' || strategy === 'ai') {
    try {
      tags = await classifyWithOpenAI(text, maxTags);

      if (tags.length > 0) {
        // OpenAI doesn't provide confidence scores, so we assign high confidence
        confidence = Object.fromEntries(tags.map((t, i) => [t, 0.9 - (i * 0.1)]));
        method = 'openai';
      }
    } catch (error) {
      console.warn('[OpenAI AutoTag] AI classification failed, using fallback:', error.message);

      // Use keyword fallback
      if (strategy === 'auto') {
        tags = keywordBasedClassification(text);
        confidence = Object.fromEntries(tags.map(t => [t, 0.5]));
        method = 'keywords';
      }
    }
  }

  // Pure keyword-based classification
  if ((strategy === 'keywords' || tags.length === 0) && strategy !== 'ai') {
    tags = keywordBasedClassification(text);
    confidence = Object.fromEntries(tags.map(t => [t, 0.5]));
    method = 'keywords';
  }

  // Ensure we always have at least one tag
  if (tags.length === 0) {
    tags = ['story'];
    confidence = { story: 0.5 };
    method = 'default';
  }

  return {
    tags: tags.slice(0, maxTags),
    confidence,
    method,
    timestamp: Date.now(),
  };
}

/**
 * Get tag display information (same as before)
 */
export function getTagInfo(tag) {
  const colors = {
    // Life domains
    relationships: { bg: '#FF6B9D', text: '#fff' },
    money: { bg: '#4CAF50', text: '#fff' },
    work: { bg: '#2196F3', text: '#fff' },
    school: { bg: '#9C27B0', text: '#fff' },
    family: { bg: '#FF9800', text: '#fff' },
    health: { bg: '#F44336', text: '#fff' },
    housing: { bg: '#795548', text: '#fff' },

    // Emotions/Tones
    rant: { bg: '#FF5252', text: '#fff' },
    advice: { bg: '#00BCD4', text: '#fff' },
    celebration: { bg: '#FFD700', text: '#000' },
    question: { bg: '#673AB7', text: '#fff' },
    story: { bg: '#607D8B', text: '#fff' },
    joke: { bg: '#FFEB3B', text: '#000' },

    // Issues
    crime: { bg: '#B71C1C', text: '#fff' },
    safety: { bg: '#E65100', text: '#fff' },
    corruption: { bg: '#1A237E', text: '#fff' },
    'service delivery': { bg: '#004D40', text: '#fff' },
    transport: { bg: '#0277BD', text: '#fff' },

    // Activities
    food: { bg: '#F57C00', text: '#fff' },
    entertainment: { bg: '#C2185B', text: '#fff' },
    sports: { bg: '#388E3C', text: '#fff' },
    politics: { bg: '#424242', text: '#fff' },
    news: { bg: '#1976D2', text: '#fff' },
    tech: { bg: '#0097A7', text: '#fff' },

    // Local context
    community: { bg: '#7B1FA2', text: '#fff' },
    'local business': { bg: '#5D4037', text: '#fff' },
    events: { bg: '#E91E63', text: '#fff' },
  };

  const icons = {
    relationships: '💕',
    money: '💰',
    work: '💼',
    school: '📚',
    family: '👨‍👩‍👧‍👦',
    health: '🏥',
    housing: '🏠',
    rant: '😤',
    advice: '💡',
    celebration: '🎉',
    question: '❓',
    story: '📖',
    joke: '😂',
    crime: '🚨',
    safety: '⚠️',
    corruption: '⚖️',
    'service delivery': '🚰',
    transport: '🚌',
    food: '🍔',
    entertainment: '🎬',
    sports: '⚽',
    politics: '🏛️',
    news: '📰',
    tech: '💻',
    community: '🏘️',
    'local business': '🏪',
    events: '🎪',
  };

  return {
    label: tag,
    color: colors[tag] || { bg: '#9E9E9E', text: '#fff' },
    icon: icons[tag] || '🏷️',
  };
}

export { CATEGORIES, CATEGORY_LABELS };
