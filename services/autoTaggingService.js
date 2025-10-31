/**
 * Auto-tagging service using zero-shot classification
 * Automatically categorizes posts into relevant topics/tags
 */

const HUGGING_FACE_API_URL = 'https://api-inference.huggingface.co/models/facebook/bart-large-mnli';

// Comprehensive category taxonomy
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

// Category labels for zero-shot classification
const CATEGORY_LABELS = Object.values(CATEGORIES);

// Candidate labels with descriptions for better classification
const ENHANCED_LABELS = {
  'relationships': 'dating, love, breakup, marriage, friendship, romance',
  'money': 'finance, salary, debt, bills, rent, expenses, financial problems',
  'work': 'job, employment, career, workplace, boss, colleague, unemployment',
  'school': 'education, university, college, studying, exams, teachers, students',
  'family': 'parents, children, siblings, relatives, family problems',
  'health': 'medical, healthcare, illness, hospital, doctor, mental health',
  'housing': 'apartment, landlord, rent, mortgage, property, living space',
  'rant': 'complaint, frustration, venting, angry, upset, annoyed',
  'advice': 'help, suggestion, guidance, recommendation, tips, asking for help',
  'celebration': 'happy, success, achievement, good news, proud, excited',
  'question': 'asking, wondering, need help, curious, inquiry',
  'story': 'experience, narrative, happened to me, tale, anecdote',
  'joke': 'funny, humor, comedy, laugh, amusing, entertaining',
  'crime': 'theft, robbery, violence, illegal, criminal activity, mugging',
  'safety': 'security, danger, risk, protection, unsafe, precaution',
  'corruption': 'bribery, fraud, dishonest officials, government corruption',
  'service delivery': 'municipality, government services, infrastructure, utilities, water, electricity',
  'transport': 'taxi, bus, train, traffic, commute, public transport',
  'food': 'restaurant, cooking, eating, meal, recipe, cuisine',
  'entertainment': 'movies, music, shows, nightlife, fun activities',
  'sports': 'football, rugby, soccer, cricket, athletics, sports teams',
  'politics': 'government, elections, political party, parliament, president',
  'news': 'current events, headlines, breaking news, announcement',
  'tech': 'technology, gadgets, apps, internet, smartphones, computers',
  'community': 'neighborhood, neighbors, local area, community issues',
  'local business': 'shop, store, restaurant, local services, small business',
  'events': 'happening, festival, concert, gathering, upcoming event',
};

/**
 * Clean and prepare text for classification
 */
function prepareText(title, description) {
  const titleText = (title || '').trim();
  const descText = (description || '').trim();

  // Combine title and first part of description for context
  const combined = descText
    ? `${titleText}. ${descText.substring(0, 300)}`
    : titleText;

  return combined
    .replace(/\*\*/g, '') // Remove markdown bold
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove markdown links
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Call Hugging Face zero-shot classification API
 */
async function classifyWithHuggingFace(text, candidateLabels, options = {}) {
  const apiKey = process.env.EXPO_PUBLIC_HF_API_KEY;

  if (!apiKey) {
    throw new Error('Hugging Face API key not configured');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), options.timeout || 30000);

  try {
    const response = await fetch(HUGGING_FACE_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: text,
        parameters: {
          candidate_labels: candidateLabels,
          multi_label: true, // Allow multiple categories
        },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.warn('[AutoTagging] HF API error:', response.status, errorText);

      if (response.status === 503) {
        // Model is loading
        throw new Error('MODEL_LOADING');
      }

      throw new Error(`HF API error: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('Classification timeout');
    }
    throw error;
  }
}

/**
 * Fallback keyword-based classification
 */
function keywordBasedClassification(text) {
  const lowerText = text.toLowerCase();
  const tags = [];

  // Define keyword patterns for each category
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

  // Check each pattern
  for (const [category, pattern] of Object.entries(patterns)) {
    if (pattern.test(lowerText)) {
      tags.push(category);
    }
  }

  // If no tags found, classify as 'story' (neutral)
  if (tags.length === 0) {
    tags.push('story');
  }

  return tags.slice(0, 5); // Limit to top 5 tags
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
    minConfidence = 0.3,
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

  // Try AI classification first (if strategy allows)
  if (strategy === 'auto' || strategy === 'ai') {
    try {
      const result = await classifyWithHuggingFace(text, CATEGORY_LABELS, {
        timeout: options.timeout || 15000,
      });

      if (result && result.labels && result.scores) {
        // Filter by confidence threshold and limit to maxTags
        const tagged = result.labels
          .map((label, i) => ({
            label,
            score: result.scores[i],
          }))
          .filter(item => item.score >= minConfidence)
          .slice(0, maxTags);

        if (tagged.length > 0) {
          tags = tagged.map(t => t.label);
          confidence = Object.fromEntries(tagged.map(t => [t.label, t.score]));
          method = 'ai';
        }
      }
    } catch (error) {
      console.warn('[AutoTagging] AI classification failed, using fallback:', error.message);

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
 * Get tag display information
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
