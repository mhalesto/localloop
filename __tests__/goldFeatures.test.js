/**
 * Test Suite for Gold Tier Features
 *
 * Tests all GPT-4o powered Gold features
 */

import {
  summarizeWithGPT4o,
  analyzePhotoForCartoon,
  composePost,
  generateCommentSuggestions,
  translateWithContext,
  isGoldUser,
} from '../services/openai/gpt4Service';
import { summarizePostDescription } from '../services/summarizationService';
import { generateCartoonProfile } from '../services/openai/profileCartoonService';

// Mock Firebase Functions
jest.mock('../api/firebaseClient', () => ({
  app: {},
}));

jest.mock('firebase/functions', () => ({
  getFunctions: jest.fn(),
  httpsCallable: jest.fn(() => jest.fn()),
}));

// Mock OpenAI responses
const mockOpenAIResponse = (data) => {
  const { httpsCallable } = require('firebase/functions');
  httpsCallable.mockImplementation(() => async () => ({ data }));
};

describe('Gold Feature Detection', () => {
  test('isGoldUser returns true for gold subscription', () => {
    const goldUser = { subscriptionPlan: 'gold' };
    expect(isGoldUser(goldUser)).toBe(true);
  });

  test('isGoldUser returns false for premium subscription', () => {
    const premiumUser = { subscriptionPlan: 'premium' };
    expect(isGoldUser(premiumUser)).toBe(false);
  });

  test('isGoldUser returns false for basic subscription', () => {
    const basicUser = { subscriptionPlan: 'basic' };
    expect(isGoldUser(basicUser)).toBe(false);
  });

  test('isGoldUser returns false for missing subscription', () => {
    const noSubUser = {};
    expect(isGoldUser(noSubUser)).toBe(false);
  });
});

describe('GPT-4o Summarization', () => {
  const testText = 'This is a long post about community events. We are organizing a neighborhood cleanup on Saturday. Everyone is welcome to join us at 9 AM in the park. Bring gloves and trash bags. We will provide refreshments.';

  beforeEach(() => {
    mockOpenAIResponse({
      choices: [
        {
          message: {
            content: 'Community cleanup event Saturday at 9 AM in the park. Bring gloves and bags, refreshments provided.',
          },
        },
      ],
    });
  });

  test('summarizes text with professional style', async () => {
    const result = await summarizeWithGPT4o(testText, {
      lengthPreference: 'balanced',
      style: 'professional',
    });

    expect(result.summary).toBeDefined();
    expect(result.model).toBe('gpt-4o-mini');
    expect(result.style).toBe('professional');
  });

  test('summarizes text with emoji style', async () => {
    mockOpenAIResponse({
      choices: [
        {
          message: {
            content: '🧹 Community cleanup Saturday at 9 AM! 🌳 Bring gloves & bags, refreshments provided! 🥤',
          },
        },
      ],
    });

    const result = await summarizeWithGPT4o(testText, {
      lengthPreference: 'concise',
      style: 'emoji',
    });

    expect(result.summary).toContain('🧹');
    expect(result.style).toBe('emoji');
  });

  test('handles different length preferences', async () => {
    const lengths = ['concise', 'balanced', 'detailed'];

    for (const length of lengths) {
      const result = await summarizeWithGPT4o(testText, {
        lengthPreference: length,
        style: 'professional',
      });

      expect(result.lengthPreference).toBe(length);
    }
  });

  test('throws error on empty text', async () => {
    await expect(summarizeWithGPT4o('')).rejects.toThrow();
  });
});

describe('Vision Photo Analysis', () => {
  const testImageUrl = 'https://example.com/photo.jpg';

  beforeEach(() => {
    mockOpenAIResponse({
      choices: [
        {
          message: {
            content: 'Person with short brown hair, blue eyes, round glasses, warm smile, wearing a blue shirt.',
          },
        },
      ],
    });
  });

  test('analyzes photo successfully', async () => {
    const description = await analyzePhotoForCartoon(testImageUrl);

    expect(description).toContain('hair');
    expect(description).toContain('eyes');
    expect(typeof description).toBe('string');
    expect(description.length).toBeGreaterThan(0);
  });

  test('throws error on invalid URL', async () => {
    await expect(analyzePhotoForCartoon('')).rejects.toThrow();
  });

  test('provides detailed description', async () => {
    const description = await analyzePhotoForCartoon(testImageUrl);

    // Should include key features
    expect(description.toLowerCase()).toMatch(/hair|eyes|face|skin/);
  });
});

describe('Smart Post Composer', () => {
  beforeEach(() => {
    mockOpenAIResponse({
      choices: [
        {
          message: {
            content: 'Looking for a reliable plumber in the area! Does anyone have recommendations? Would really appreciate your help! #plumbing #help #recommendations',
          },
        },
      ],
    });
  });

  test('composes post with friendly tone', async () => {
    const result = await composePost('need plumber recommendations', {
      tone: 'friendly',
      length: 'short',
      includeHashtags: true,
    });

    expect(result.content).toBeDefined();
    expect(result.hashtags).toBeDefined();
    expect(result.hashtags.length).toBeGreaterThan(0);
    expect(result.tone).toBe('friendly');
  });

  test('composes post with professional tone', async () => {
    const result = await composePost('organizing community meeting', {
      tone: 'professional',
      length: 'medium',
      includeHashtags: false,
    });

    expect(result.content).toBeDefined();
    expect(result.tone).toBe('professional');
  });

  test('includes emojis when requested', async () => {
    mockOpenAIResponse({
      choices: [
        {
          message: {
            content: '🎉 Exciting news! Looking for a plumber! 🔧',
          },
        },
      ],
    });

    const result = await composePost('need plumber', {
      tone: 'excited',
      includeEmojis: true,
    });

    expect(result.content).toMatch(/[\u{1F300}-\u{1F9FF}]/u); // Contains emoji
  });

  test('extracts hashtags correctly', async () => {
    const result = await composePost('plumber needed', {
      includeHashtags: true,
    });

    expect(result.hashtags).toContain('plumbing');
    expect(result.hashtags).toContain('help');
  });

  test('throws error on empty idea', async () => {
    await expect(composePost('')).rejects.toThrow();
  });
});

describe('Enhanced Comment Suggestions', () => {
  const testPost = 'Just moved to the neighborhood! Looking forward to meeting everyone.';

  beforeEach(() => {
    mockOpenAIResponse({
      choices: [
        {
          message: {
            content: '1. Welcome to the neighborhood! So great to have you here!\n2. Hi there! Feel free to reach out if you need any recommendations.\n3. Welcome! There are lots of friendly folks around here.',
          },
        },
      ],
    });
  });

  test('generates supportive comment suggestions', async () => {
    const suggestions = await generateCommentSuggestions(testPost, {
      tone: 'supportive',
      count: 3,
    });

    expect(suggestions).toHaveLength(3);
    expect(suggestions[0]).toContain('Welcome');
  });

  test('generates curious comment suggestions', async () => {
    mockOpenAIResponse({
      choices: [
        {
          message: {
            content: '1. What brought you to the area?\n2. Where did you move from?\n3. Are you looking for any specific recommendations?',
          },
        },
      ],
    });

    const suggestions = await generateCommentSuggestions(testPost, {
      tone: 'curious',
      count: 3,
    });

    expect(suggestions).toHaveLength(3);
    expect(suggestions[0]).toMatch(/\?/); // Should be a question
  });

  test('generates variable number of suggestions', async () => {
    const counts = [1, 2, 3];

    for (const count of counts) {
      const suggestions = await generateCommentSuggestions(testPost, {
        tone: 'conversational',
        count,
      });

      expect(suggestions.length).toBeLessThanOrEqual(count);
    }
  });
});

describe('Cultural-Context Translation', () => {
  beforeEach(() => {
    mockOpenAIResponse({
      choices: [
        {
          message: {
            content: 'Sawubona! Siyakwamukela emphakathini wethu.',
          },
        },
      ],
    });
  });

  test('translates to isiZulu', async () => {
    const result = await translateWithContext(
      'Hello! Welcome to our community.',
      'zu'
    );

    expect(result.translation).toBeDefined();
    expect(result.language).toBe('isiZulu');
    expect(result.model).toBe('gpt-4o-mini');
  });

  test('translates to Afrikaans', async () => {
    mockOpenAIResponse({
      choices: [
        {
          message: {
            content: 'Hallo! Welkom by ons gemeenskap.',
          },
        },
      ],
    });

    const result = await translateWithContext(
      'Hello! Welcome to our community.',
      'af'
    );

    expect(result.translation).toBeDefined();
    expect(result.language).toBe('Afrikaans');
  });

  test('handles all supported languages', async () => {
    const languages = ['zu', 'xh', 'af', 'st', 'nso', 'tn', 'ts', 've', 'ss', 'nr'];

    for (const lang of languages) {
      const result = await translateWithContext('Hello', lang);
      expect(result.translation).toBeDefined();
    }
  });
});

describe('Summarization Service Integration', () => {
  const testDescription = 'Long description about an event...';

  test('Gold users get GPT-4o summaries', async () => {
    mockOpenAIResponse({
      choices: [
        {
          message: {
            content: 'Event summary from GPT-4o',
          },
        },
      ],
    });

    const result = await summarizePostDescription(testDescription, {
      subscriptionPlan: 'gold',
      style: 'professional',
    });

    expect(result.goldFeature).toBe(true);
    expect(result.model).toBe('gpt-4o-mini');
  });

  test('Basic users get local summaries', async () => {
    const result = await summarizePostDescription(testDescription, {
      subscriptionPlan: 'basic',
    });

    expect(result.goldFeature).toBeUndefined();
    expect(result.model).toBe('local-extractive');
  });

  test('Premium users get local summaries', async () => {
    const result = await summarizePostDescription(testDescription, {
      subscriptionPlan: 'premium',
    });

    expect(result.goldFeature).toBeUndefined();
    expect(result.model).toBe('local-extractive');
  });
});

describe('Cartoon Generation Integration', () => {
  const testImageUrl = 'https://example.com/profile.jpg';

  beforeEach(() => {
    // Mock Vision analysis
    mockOpenAIResponse({
      choices: [
        {
          message: {
            content: 'Person with brown hair and glasses',
          },
        },
      ],
    });
  });

  test('Gold users get Vision analysis', async () => {
    const result = await generateCartoonProfile(
      testImageUrl,
      'pixar',
      'neutral',
      null,
      'gold'
    );

    expect(result.enhanced).toBe(true);
    expect(result.quality).toBe('hd');
    expect(result.subscriptionPlan).toBe('gold');
  });

  test('Basic users get standard quality', async () => {
    const result = await generateCartoonProfile(
      testImageUrl,
      'pixar',
      'neutral',
      null,
      'basic'
    );

    expect(result.enhanced).toBe(false);
    expect(result.quality).toBe('standard');
  });

  test('Premium users get standard quality', async () => {
    const result = await generateCartoonProfile(
      testImageUrl,
      'pixar',
      'neutral',
      null,
      'premium'
    );

    expect(result.enhanced).toBe(false);
    expect(result.quality).toBe('standard');
  });

  test('Gold users with custom prompts get Vision enhancement', async () => {
    const result = await generateCartoonProfile(
      testImageUrl,
      'custom',
      'neutral',
      'superhero in space',
      'gold'
    );

    expect(result.style).toBe('custom');
    expect(result.enhanced).toBe(true);
  });
});

describe('Error Handling', () => {
  test('handles OpenAI API errors gracefully', async () => {
    mockOpenAIResponse({ error: { message: 'API Error' } });

    await expect(
      summarizeWithGPT4o('test text')
    ).rejects.toThrow();
  });

  test('handles network errors', async () => {
    const { httpsCallable } = require('firebase/functions');
    httpsCallable.mockImplementation(() => async () => {
      throw new Error('Network error');
    });

    await expect(
      summarizeWithGPT4o('test text')
    ).rejects.toThrow();
  });

  test('handles malformed responses', async () => {
    mockOpenAIResponse({ choices: [] });

    await expect(
      summarizeWithGPT4o('test text')
    ).rejects.toThrow();
  });
});

describe('Performance', () => {
  test('summarization completes within reasonable time', async () => {
    mockOpenAIResponse({
      choices: [{ message: { content: 'Summary' } }],
    });

    const start = Date.now();
    await summarizeWithGPT4o('test text');
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
  });

  test('comment suggestions complete quickly', async () => {
    mockOpenAIResponse({
      choices: [{ message: { content: '1. Great!\n2. Awesome!\n3. Nice!' } }],
    });

    const start = Date.now();
    await generateCommentSuggestions('test post', { count: 3 });
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(5000);
  });
});
