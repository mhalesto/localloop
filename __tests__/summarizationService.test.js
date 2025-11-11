import { summarizePostDescription } from '../services/summarizationService';
import { summarizeWithGPT4o } from '../services/openai/gpt4Service';

jest.mock('../services/openai/gpt4Service', () => ({
  summarizeWithGPT4o: jest.fn(),
}));

describe('summarizePostDescription', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('uses GPT-4o pipeline for Gold users', async () => {
    summarizeWithGPT4o.mockResolvedValue({
      summary: 'Gold tier summary',
      model: 'gpt-4o-mini',
    });

    const result = await summarizePostDescription('Neighborhood cleanup happening this Saturday!', {
      subscriptionPlan: 'gold',
      lengthPreference: 'balanced',
    });

    expect(summarizeWithGPT4o).toHaveBeenCalledTimes(1);
    expect(result.summary).toBe('Gold tier summary');
    expect(result.goldFeature).toBe(true);
  });

  it('falls back to local summarizer if GPT-4o fails', async () => {
    summarizeWithGPT4o.mockRejectedValueOnce(new Error('GPT model unavailable'));

    const result = await summarizePostDescription('Neighborhood cleanup happening this Saturday!', {
      subscriptionPlan: 'gold',
      lengthPreference: 'balanced',
    });

    expect(summarizeWithGPT4o).toHaveBeenCalled();
    expect(result.model).toBe('local-extractive');
    expect(result.summary.length).toBeGreaterThan(0);
  });

  it('uses local summarizer for non-Gold plans', async () => {
    const text = 'First important update. Followed by extra details about timing. Casual closing sentence.';
    const result = await summarizePostDescription(text, {
      subscriptionPlan: 'basic',
      lengthPreference: 'concise',
    });

    expect(summarizeWithGPT4o).not.toHaveBeenCalled();
    expect(result.model).toBe('local-extractive');
    expect(result.summary).toContain('First important update');
  });
});
