import { isFeatureEnabled } from '../config/aiFeatures';

describe('isFeatureEnabled', () => {
  it('requires premium subscription for premium-only features', () => {
    expect(isFeatureEnabled('threadSummarization', false, {}, 'basic')).toBe(false);
    expect(isFeatureEnabled('threadSummarization', true, {}, 'premium')).toBe(true);
  });

  it('requires gold subscription when flagged', () => {
    expect(isFeatureEnabled('smartComposer', true, {}, 'premium')).toBe(false);
    expect(isFeatureEnabled('smartComposer', true, {}, 'gold')).toBe(true);
  });

  it('honors user preference toggles when allowed', () => {
    const prefs = { autoTagging: false };
    expect(isFeatureEnabled('autoTagging', true, prefs, 'premium')).toBe(false);
    expect(isFeatureEnabled('autoTagging', true, {}, 'premium')).toBe(true);
  });
});
