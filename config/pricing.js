/**
 * LocalLoop Pricing Configuration
 * All prices are in South African Rand (ZAR)
 * This file should be the single source of truth for pricing across the app and website
 */

export const SUBSCRIPTION_PLANS = {
  basic: {
    name: 'Basic',
    price: 0,
    displayPrice: 'Free',
    currency: 'R',
    features: [
      'View local posts and events',
      'Basic search functionality',
      'Create up to 5 posts per month',
      'Comment on posts',
      'Basic profile',
      'View community announcements',
      '5 AI Cartoon Avatar generations (lifetime)'
    ],
    limitations: {
      postsPerMonth: 5,
      aiCartoonLifetime: 5,
      aiSummarization: false,
      prioritySupport: false,
      verifiedBadge: false,
      analytics: false
    }
  },

  premium: {
    name: 'Premium',
    price: 99,
    displayPrice: 'R99',
    currency: 'R',
    billingPeriod: 'month',
    features: [
      'Everything in Basic',
      'Unlimited posts',
      'Advanced search filters',
      'Priority listing in search results',
      'Business profile with contact info',
      'Post analytics (views, engagement)',
      'Schedule posts in advance',
      '10 AI Cartoon Avatar generations per month',
      'AI-powered post summarization',
      'Remove ads',
      'Premium badge on profile'
    ],
    limitations: {
      postsPerMonth: -1, // Unlimited
      aiCartoonPerMonth: 10,
      aiSummarization: true,
      prioritySupport: false,
      verifiedBadge: false,
      analytics: true,
      scheduledPosts: true,
      businessProfile: true
    }
  },

  gold: {
    name: 'Gold',
    price: 199,
    displayPrice: 'R199',
    currency: 'R',
    billingPeriod: 'month',
    features: [
      'Everything in Premium',
      'Verified business badge',
      'Featured business spotlight',
      'Custom business categories',
      'Advanced analytics dashboard',
      'API access for integrations',
      'Multiple team members',
      'Priority customer support',
      '20 AI Cartoon Avatar generations per month',
      'Custom AI cartoon styles',
      'AI content generation assistant',
      'Bulk post management',
      'Export data and reports',
      'Early access to new features'
    ],
    limitations: {
      postsPerMonth: -1, // Unlimited
      aiCartoonPerMonth: 20,
      aiSummarization: true,
      customAiStyles: true,
      prioritySupport: true,
      verifiedBadge: true,
      analytics: true,
      advancedAnalytics: true,
      teamMembers: 5,
      apiAccess: true,
      bulkOperations: true,
      dataExport: true
    }
  }
};

// AI Features Configuration
export const AI_FEATURES = {
  cartoonAvatar: {
    name: 'AI Cartoon Avatar',
    description: 'Transform your profile photo into various cartoon styles',
    styles: [
      'Pixar Animation',
      'Anime/Manga',
      'Comic Book',
      'Watercolor Art',
      'Disney Classic',
      'Classic Cartoon',
      'Studio Ghibli',
      'Simple Cartoon'
    ],
    limits: {
      basic: { lifetime: 5 },
      premium: { monthly: 10 },
      gold: { monthly: 20, customStyles: true }
    }
  },

  summarization: {
    name: 'AI Summarization',
    description: 'Automatically summarize long posts and conversations',
    models: {
      basic: null,
      premium: 'GPT-3.5',
      gold: 'GPT-4'
    },
    limits: {
      basic: 0,
      premium: 100, // per month
      gold: -1 // unlimited
    }
  },

  contentGeneration: {
    name: 'AI Content Assistant',
    description: 'Help write engaging posts and responses',
    availability: {
      basic: false,
      premium: false,
      gold: true
    }
  }
};

// Payment Gateway Configuration
export const PAYMENT_CONFIG = {
  gateway: 'PayFast',
  merchantId: process.env.PAYFAST_MERCHANT_ID,
  merchantKey: process.env.PAYFAST_MERCHANT_KEY,
  passphrase: process.env.PAYFAST_PASSPHRASE,
  testMode: process.env.NODE_ENV !== 'production',
  webhookUrl: 'https://us-central1-share-your-story-1.cloudfunctions.net/payFastWebhook',
  returnUrl: 'https://us-central1-share-your-story-1.cloudfunctions.net/payFastReturn',
  cancelUrl: 'https://us-central1-share-your-story-1.cloudfunctions.net/payFastCancel'
};

// Promotional Offers
export const PROMOTIONS = {
  newUser: {
    name: 'Welcome Offer',
    description: '50% off Premium for first month',
    discountPercent: 50,
    validForDays: 7,
    applicablePlans: ['premium']
  },

  annualDiscount: {
    name: 'Annual Subscription',
    description: 'Save 20% with annual billing',
    discountPercent: 20,
    applicablePlans: ['premium', 'gold']
  }
};

// Feature Flags
export const FEATURE_FLAGS = {
  aiCartoonAvatars: true,
  aiSummarization: true,
  scheduledPosts: true,
  teamMembers: true,
  apiAccess: true,
  analyticsV2: true,
  darkMode: true,
  videoUploads: false, // Coming soon
  liveStreaming: false, // Coming soon
  marketplace: false // Coming soon
};

// Export helper functions
export const getPlanByName = (planName) => {
  return SUBSCRIPTION_PLANS[planName.toLowerCase()] || SUBSCRIPTION_PLANS.basic;
};

export const isPremiumFeature = (featureName) => {
  const premiumFeatures = [
    'unlimited_posts',
    'ai_summarization',
    'scheduled_posts',
    'analytics',
    'business_profile'
  ];
  return premiumFeatures.includes(featureName);
};

export const isGoldFeature = (featureName) => {
  const goldFeatures = [
    'verified_badge',
    'api_access',
    'team_members',
    'advanced_analytics',
    'custom_ai_styles',
    'bulk_operations'
  ];
  return goldFeatures.includes(featureName);
};

export const calculateMonthlyRevenue = (users) => {
  let revenue = 0;
  users.forEach(user => {
    const plan = user.subscriptionPlan || 'basic';
    revenue += SUBSCRIPTION_PLANS[plan]?.price || 0;
  });
  return revenue;
};

export const formatPrice = (price, currency = 'R') => {
  if (price === 0) return 'Free';
  return `${currency}${price.toLocaleString()}`;
};

export default {
  SUBSCRIPTION_PLANS,
  AI_FEATURES,
  PAYMENT_CONFIG,
  PROMOTIONS,
  FEATURE_FLAGS,
  getPlanByName,
  isPremiumFeature,
  isGoldFeature,
  calculateMonthlyRevenue,
  formatPrice
};