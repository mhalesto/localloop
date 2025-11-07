/**
 * Subscription Utilities
 * Helper functions for subscription enforcement and limits
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { getPlanLimits } from '../config/subscriptionPlans';

// Storage keys for daily limits
const STORAGE_KEYS = {
  POSTS_TODAY: '@posts_today',
  STATUSES_TODAY: '@statuses_today',
  LAST_RESET_DATE: '@last_reset_date',
};

/**
 * Get today's date string (YYYY-MM-DD)
 */
function getTodayString() {
  const today = new Date();
  return today.toISOString().split('T')[0];
}

/**
 * Check if we need to reset daily counters
 */
async function shouldResetCounters() {
  try {
    const lastReset = await AsyncStorage.getItem(STORAGE_KEYS.LAST_RESET_DATE);
    const today = getTodayString();
    return lastReset !== today;
  } catch (error) {
    console.error('[subscriptionUtils] Error checking reset:', error);
    return false;
  }
}

/**
 * Reset daily counters
 */
async function resetDailyCounters() {
  try {
    const today = getTodayString();
    await AsyncStorage.multiSet([
      [STORAGE_KEYS.POSTS_TODAY, '0'],
      [STORAGE_KEYS.STATUSES_TODAY, '0'],
      [STORAGE_KEYS.LAST_RESET_DATE, today],
    ]);
  } catch (error) {
    console.error('[subscriptionUtils] Error resetting counters:', error);
  }
}

/**
 * Get current count for a content type
 */
async function getCount(key) {
  try {
    // Check if we need to reset first
    if (await shouldResetCounters()) {
      await resetDailyCounters();
      return 0;
    }

    const value = await AsyncStorage.getItem(key);
    return value ? parseInt(value, 10) : 0;
  } catch (error) {
    console.error('[subscriptionUtils] Error getting count:', error);
    return 0;
  }
}

/**
 * Increment count for a content type
 */
async function incrementCount(key) {
  try {
    const current = await getCount(key);
    const newCount = current + 1;
    await AsyncStorage.setItem(key, String(newCount));
    return newCount;
  } catch (error) {
    console.error('[subscriptionUtils] Error incrementing count:', error);
    return current;
  }
}

/**
 * Check if user can create a post today
 * @param {string} userPlan - User's subscription plan
 * @param {boolean} isAdmin - Whether the user is an admin
 */
export async function canCreatePost(userPlan = 'basic', isAdmin = false) {
  // Admin users have unlimited access for testing
  if (isAdmin) {
    return { allowed: true, count: 0, limit: -1, remaining: -1 };
  }

  const limits = getPlanLimits(userPlan);

  // Unlimited posts
  if (limits.postsPerDay === -1) {
    return { allowed: true, count: 0, limit: -1 };
  }

  const count = await getCount(STORAGE_KEYS.POSTS_TODAY);
  const allowed = count < limits.postsPerDay;

  return {
    allowed,
    count,
    limit: limits.postsPerDay,
    remaining: Math.max(0, limits.postsPerDay - count),
  };
}

/**
 * Check if user can create a status today
 * @param {string} userPlan - User's subscription plan
 * @param {boolean} isAdmin - Whether the user is an admin
 */
export async function canCreateStatus(userPlan = 'basic', isAdmin = false) {
  // Admin users have unlimited access for testing
  if (isAdmin) {
    return { allowed: true, count: 0, limit: -1, remaining: -1 };
  }

  const limits = getPlanLimits(userPlan);

  // Unlimited statuses
  if (limits.statusesPerDay === -1) {
    return { allowed: true, count: 0, limit: -1 };
  }

  const count = await getCount(STORAGE_KEYS.STATUSES_TODAY);
  const allowed = count < limits.statusesPerDay;

  return {
    allowed,
    count,
    limit: limits.statusesPerDay,
    remaining: Math.max(0, limits.statusesPerDay - count),
  };
}

/**
 * Record that user created a post
 */
export async function recordPostCreated() {
  return await incrementCount(STORAGE_KEYS.POSTS_TODAY);
}

/**
 * Record that user created a status
 */
export async function recordStatusCreated() {
  return await incrementCount(STORAGE_KEYS.STATUSES_TODAY);
}

/**
 * Get daily usage stats
 */
export async function getDailyUsage(userPlan = 'basic') {
  const limits = getPlanLimits(userPlan);
  const postsCount = await getCount(STORAGE_KEYS.POSTS_TODAY);
  const statusesCount = await getCount(STORAGE_KEYS.STATUSES_TODAY);

  return {
    posts: {
      count: postsCount,
      limit: limits.postsPerDay,
      remaining: limits.postsPerDay === -1 ? -1 : Math.max(0, limits.postsPerDay - postsCount),
    },
    statuses: {
      count: statusesCount,
      limit: limits.statusesPerDay,
      remaining: limits.statusesPerDay === -1 ? -1 : Math.max(0, limits.statusesPerDay - statusesCount),
    },
  };
}

/**
 * Reset all counters (for testing)
 */
export async function resetAllCounters() {
  await resetDailyCounters();
}
