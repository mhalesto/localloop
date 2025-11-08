/**
 * Gold Feature Usage Tracking Service
 *
 * Tracks usage of GPT-4o features for analytics and billing
 */

import { doc, updateDoc, increment, serverTimestamp, getDoc } from 'firebase/firestore';
import { db } from '../api/firebaseClient';

/**
 * Track feature usage
 * @param {string} userId - User ID
 * @param {string} feature - Feature name (summarization, cartoon, composition, etc.)
 * @param {object} metadata - Additional metadata
 */
export async function trackGoldFeatureUsage(userId, feature, metadata = {}) {
  if (!userId || !feature) {
    console.warn('[GoldUsageTracking] Missing userId or feature');
    return;
  }

  try {
    const userRef = doc(db, 'users', userId);
    const updateData = {
      [`goldUsage.${feature}.count`]: increment(1),
      [`goldUsage.${feature}.lastUsed`]: serverTimestamp(),
      'goldUsage.lastActivityAt': serverTimestamp(),
    };

    // Add metadata if provided
    if (metadata.cost) {
      updateData[`goldUsage.${feature}.totalCost`] = increment(metadata.cost);
    }

    if (metadata.tokens) {
      updateData[`goldUsage.${feature}.totalTokens`] = increment(metadata.tokens);
    }

    await updateDoc(userRef, updateData);

    console.log(`[GoldUsageTracking] Tracked ${feature} usage for user ${userId}`);
  } catch (error) {
    console.error('[GoldUsageTracking] Error tracking usage:', error);
    // Don't throw - tracking failures shouldn't break features
  }
}

/**
 * Get user's Gold feature usage stats
 * @param {string} userId - User ID
 * @returns {object} Usage stats
 */
export async function getGoldUsageStats(userId) {
  if (!userId) {
    return null;
  }

  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    const userData = userDoc.data();

    return {
      summarization: userData?.goldUsage?.summarization || { count: 0 },
      cartoon: userData?.goldUsage?.cartoon || { count: 0 },
      composition: userData?.goldUsage?.composition || { count: 0 },
      comments: userData?.goldUsage?.comments || { count: 0 },
      translation: userData?.goldUsage?.translation || { count: 0 },
      lastActivityAt: userData?.goldUsage?.lastActivityAt,
    };
  } catch (error) {
    console.error('[GoldUsageTracking] Error getting stats:', error);
    return null;
  }
}

/**
 * Calculate estimated monthly cost for user
 * @param {object} usage - Usage stats from getGoldUsageStats
 * @returns {number} Estimated cost in USD
 */
export function calculateEstimatedCost(usage) {
  if (!usage) return 0;

  const COSTS = {
    summarization: 0.002,
    cartoon: 0.085, // Vision + HD DALL-E
    composition: 0.01,
    comments: 0.003,
    translation: 0.005,
  };

  let totalCost = 0;

  Object.keys(COSTS).forEach(feature => {
    const count = usage[feature]?.count || 0;
    totalCost += count * COSTS[feature];
  });

  return totalCost;
}

/**
 * Reset monthly usage counters
 * Call this at the start of each month (via cron)
 * @param {string} userId - User ID
 */
export async function resetMonthlyUsage(userId) {
  if (!userId) return;

  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      'goldUsage.summarization.monthlyCount': 0,
      'goldUsage.cartoon.monthlyCount': 0,
      'goldUsage.composition.monthlyCount': 0,
      'goldUsage.comments.monthlyCount': 0,
      'goldUsage.translation.monthlyCount': 0,
      'goldUsage.lastResetAt': serverTimestamp(),
    });

    console.log(`[GoldUsageTracking] Reset monthly usage for user ${userId}`);
  } catch (error) {
    console.error('[GoldUsageTracking] Error resetting usage:', error);
  }
}

/**
 * Check if user has exceeded monthly limits
 * @param {string} userId - User ID
 * @param {string} feature - Feature to check
 * @returns {boolean} True if user can use the feature
 */
export async function canUseGoldFeature(userId, feature) {
  if (!userId || !feature) return false;

  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    const userData = userDoc.data();

    // Check if user has Gold subscription
    if (userData?.subscriptionPlan !== 'gold') {
      return false;
    }

    // For most features, Gold has unlimited usage
    // Only cartoons have monthly limits (20/month)
    if (feature === 'cartoon') {
      const monthlyCount = userData?.goldUsage?.cartoon?.monthlyCount || 0;
      return monthlyCount < 20;
    }

    return true; // Unlimited for other features
  } catch (error) {
    console.error('[GoldUsageTracking] Error checking feature access:', error);
    return false;
  }
}

/**
 * Analytics: Get aggregated usage stats
 * For admin dashboard
 */
export async function getAggregatedUsageStats() {
  // This would typically query all Gold users
  // Implement based on your analytics needs

  // Example structure:
  return {
    totalGoldUsers: 0,
    totalFeatureUsage: {
      summarization: 0,
      cartoon: 0,
      composition: 0,
      comments: 0,
      translation: 0,
    },
    estimatedMonthlyCost: 0,
    revenuePerUser: 150, // R150/month in ZAR
    profitMargin: 0,
  };
}

/**
 * Log usage event to analytics
 * @param {string} userId - User ID
 * @param {string} event - Event name
 * @param {object} properties - Event properties
 */
export function logGoldAnalyticsEvent(userId, event, properties = {}) {
  // Integrate with your analytics platform (Firebase Analytics, Mixpanel, etc.)
  try {
    console.log('[GoldAnalytics]', event, {
      userId,
      ...properties,
      timestamp: new Date().toISOString(),
    });

    // Example: Firebase Analytics
    // logEvent(analytics, event, { userId, ...properties });

    // Example: Mixpanel
    // mixpanel.track(event, { userId, ...properties });
  } catch (error) {
    console.error('[GoldAnalytics] Error logging event:', error);
  }
}

/**
 * Usage tracking middleware
 * Wrap feature calls with this to automatically track usage
 *
 * @example
 * const result = await trackUsage(userId, 'summarization', () => summarizeWithGPT4o(text));
 */
export async function trackUsage(userId, feature, fn, metadata = {}) {
  const startTime = Date.now();

  try {
    const result = await fn();

    // Track successful usage
    const duration = Date.now() - startTime;
    await trackGoldFeatureUsage(userId, feature, {
      ...metadata,
      duration,
      success: true,
    });

    // Log analytics event
    logGoldAnalyticsEvent(userId, `gold_${feature}_used`, {
      duration,
      ...metadata,
    });

    return result;
  } catch (error) {
    // Track failed usage
    const duration = Date.now() - startTime;
    logGoldAnalyticsEvent(userId, `gold_${feature}_failed`, {
      duration,
      error: error.message,
    });

    throw error;
  }
}

export default {
  trackGoldFeatureUsage,
  getGoldUsageStats,
  calculateEstimatedCost,
  resetMonthlyUsage,
  canUseGoldFeature,
  getAggregatedUsageStats,
  logGoldAnalyticsEvent,
  trackUsage,
};
