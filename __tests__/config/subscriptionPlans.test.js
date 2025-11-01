import {
  SUBSCRIPTION_PLANS,
  getPlanById,
  getPlanLimits,
  canUserPerformAction,
  formatPrice,
} from '../../config/subscriptionPlans';

describe('subscriptionPlans', () => {
  describe('SUBSCRIPTION_PLANS', () => {
    it('should have three plan tiers', () => {
      expect(Object.keys(SUBSCRIPTION_PLANS)).toHaveLength(3);
      expect(SUBSCRIPTION_PLANS.BASIC).toBeDefined();
      expect(SUBSCRIPTION_PLANS.PREMIUM).toBeDefined();
      expect(SUBSCRIPTION_PLANS.GOLD).toBeDefined();
    });

    it('should have correct structure for BASIC plan', () => {
      const basic = SUBSCRIPTION_PLANS.BASIC;
      expect(basic.id).toBe('basic');
      expect(basic.name).toBe('Basic');
      expect(basic.price).toBe(0);
      expect(basic.currency).toBe('ZAR');
      expect(basic.interval).toBe('forever');
      expect(basic.description).toBeTruthy();
      expect(basic.features).toBeInstanceOf(Array);
      expect(basic.limits).toBeDefined();
    });

    it('should have correct structure for PREMIUM plan', () => {
      const premium = SUBSCRIPTION_PLANS.PREMIUM;
      expect(premium.id).toBe('premium');
      expect(premium.name).toBe('Premium');
      expect(premium.price).toBe(49.99);
      expect(premium.currency).toBe('ZAR');
      expect(premium.interval).toBe('month');
      expect(premium.popular).toBe(true);
      expect(premium.description).toBeTruthy();
      expect(premium.features).toBeInstanceOf(Array);
      expect(premium.limits).toBeDefined();
    });

    it('should have correct structure for GOLD plan', () => {
      const gold = SUBSCRIPTION_PLANS.GOLD;
      expect(gold.id).toBe('gold');
      expect(gold.name).toBe('Gold');
      expect(gold.price).toBe(499.99);
      expect(gold.currency).toBe('ZAR');
      expect(gold.interval).toBe('year');
      expect(gold.description).toBeTruthy();
      expect(gold.features).toBeInstanceOf(Array);
      expect(gold.limits).toBeDefined();
      expect(gold.savings).toBe('Save R100/year');
    });

    it('should have correct limits for BASIC plan', () => {
      const limits = SUBSCRIPTION_PLANS.BASIC.limits;
      expect(limits.postsPerDay).toBe(5);
      expect(limits.customThemes).toBe(false);
      expect(limits.aiFeatures).toBe(false);
      expect(limits.premiumBadge).toBe(false);
      expect(limits.prioritySupport).toBe(false);
    });

    it('should have unlimited posts for PREMIUM plan', () => {
      const limits = SUBSCRIPTION_PLANS.PREMIUM.limits;
      expect(limits.postsPerDay).toBe(-1);
      expect(limits.customThemes).toBe(true);
      expect(limits.aiFeatures).toBe(true);
      expect(limits.premiumBadge).toBe(true);
      expect(limits.prioritySupport).toBe(true);
    });

    it('should have unlimited posts for GOLD plan', () => {
      const limits = SUBSCRIPTION_PLANS.GOLD.limits;
      expect(limits.postsPerDay).toBe(-1);
      expect(limits.customThemes).toBe(true);
      expect(limits.aiFeatures).toBe(true);
      expect(limits.premiumBadge).toBe(true);
      expect(limits.prioritySupport).toBe(true);
      expect(limits.earlyAccess).toBe(true);
      expect(limits.goldBadge).toBe(true);
    });
  });

  describe('getPlanById', () => {
    it('should return correct plan for basic', () => {
      const plan = getPlanById('basic');
      expect(plan).toBe(SUBSCRIPTION_PLANS.BASIC);
      expect(plan.id).toBe('basic');
    });

    it('should return correct plan for premium', () => {
      const plan = getPlanById('premium');
      expect(plan).toBe(SUBSCRIPTION_PLANS.PREMIUM);
      expect(plan.id).toBe('premium');
    });

    it('should return correct plan for gold', () => {
      const plan = getPlanById('gold');
      expect(plan).toBe(SUBSCRIPTION_PLANS.GOLD);
      expect(plan.id).toBe('gold');
    });

    it('should return undefined for invalid plan ID', () => {
      const plan = getPlanById('invalid');
      expect(plan).toBeUndefined();
    });

    it('should return undefined for null', () => {
      const plan = getPlanById(null);
      expect(plan).toBeUndefined();
    });
  });

  describe('getPlanLimits', () => {
    it('should return limits for basic plan', () => {
      const limits = getPlanLimits('basic');
      expect(limits).toBe(SUBSCRIPTION_PLANS.BASIC.limits);
      expect(limits.postsPerDay).toBe(5);
    });

    it('should return limits for premium plan', () => {
      const limits = getPlanLimits('premium');
      expect(limits).toBe(SUBSCRIPTION_PLANS.PREMIUM.limits);
      expect(limits.postsPerDay).toBe(-1);
    });

    it('should return limits for gold plan', () => {
      const limits = getPlanLimits('gold');
      expect(limits).toBe(SUBSCRIPTION_PLANS.GOLD.limits);
      expect(limits.postsPerDay).toBe(-1);
    });

    it('should return basic plan limits for invalid plan ID', () => {
      const limits = getPlanLimits('invalid');
      expect(limits).toBe(SUBSCRIPTION_PLANS.BASIC.limits);
    });

    it('should return basic plan limits for null', () => {
      const limits = getPlanLimits(null);
      expect(limits).toBe(SUBSCRIPTION_PLANS.BASIC.limits);
    });
  });

  describe('canUserPerformAction', () => {
    describe('post action', () => {
      it('should return false for basic plan (limited posts)', () => {
        expect(canUserPerformAction('basic', 'post')).toBe(false);
      });

      it('should return true for premium plan (unlimited posts)', () => {
        expect(canUserPerformAction('premium', 'post')).toBe(true);
      });

      it('should return true for gold plan (unlimited posts)', () => {
        expect(canUserPerformAction('gold', 'post')).toBe(true);
      });
    });

    describe('customThemes action', () => {
      it('should return false for basic plan', () => {
        expect(canUserPerformAction('basic', 'customThemes')).toBe(false);
      });

      it('should return true for premium plan', () => {
        expect(canUserPerformAction('premium', 'customThemes')).toBe(true);
      });

      it('should return true for gold plan', () => {
        expect(canUserPerformAction('gold', 'customThemes')).toBe(true);
      });
    });

    describe('aiFeatures action', () => {
      it('should return false for basic plan', () => {
        expect(canUserPerformAction('basic', 'aiFeatures')).toBe(false);
      });

      it('should return true for premium plan', () => {
        expect(canUserPerformAction('premium', 'aiFeatures')).toBe(true);
      });

      it('should return true for gold plan', () => {
        expect(canUserPerformAction('gold', 'aiFeatures')).toBe(true);
      });
    });

    describe('unknown action', () => {
      it('should return false for unknown action', () => {
        expect(canUserPerformAction('premium', 'unknownAction')).toBe(false);
      });
    });

    describe('invalid plan ID', () => {
      it('should return false for invalid plan ID', () => {
        expect(canUserPerformAction('invalid', 'aiFeatures')).toBe(false);
      });
    });
  });

  describe('formatPrice', () => {
    it('should return "Free" for basic plan', () => {
      const formatted = formatPrice(SUBSCRIPTION_PLANS.BASIC);
      expect(formatted).toBe('Free');
    });

    it('should format premium plan price correctly', () => {
      const formatted = formatPrice(SUBSCRIPTION_PLANS.PREMIUM);
      expect(formatted).toBe('R49.99/month');
    });

    it('should format gold plan price correctly', () => {
      const formatted = formatPrice(SUBSCRIPTION_PLANS.GOLD);
      expect(formatted).toBe('R499.99/year');
    });

    it('should handle plan with price 0', () => {
      const freePlan = { price: 0, interval: 'month' };
      expect(formatPrice(freePlan)).toBe('Free');
    });

    it('should format integer prices with two decimal places', () => {
      const plan = { price: 10, interval: 'month' };
      expect(formatPrice(plan)).toBe('R10.00/month');
    });
  });
});
