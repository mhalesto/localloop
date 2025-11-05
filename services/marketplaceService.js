import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  where
} from 'firebase/firestore';
import { db } from '../api/firebaseClient';

const normalizeTimestamp = (value) => {
  if (!value) return Date.now();
  if (typeof value === 'number') return value;
  if (value.toMillis) return value.toMillis();
  return Date.now();
};

export async function fetchMarketListingsForCity(city, { limit: limitCount = 8 } = {}) {
  if (!city) return [];
  if (!db) return [];
  try {
    const postsRef = collection(db, 'posts');
    const q = query(
      postsRef,
      where('city', '==', city),
      where('isMarketListing', '==', true),
      orderBy('createdAt', 'desc'),
      limit(limitCount * 3)
    );

    const snapshot = await getDocs(q);
    const listings = snapshot.docs.map((docSnap) => {
      const data = docSnap.data();
      const market = data.marketListing || {};
      const createdAt = normalizeTimestamp(data.createdAt);
      const boostedUntil = Number(market.boostedUntil ?? 0);
      const boostCount = Number(market.boostCount ?? 0);
      const boostWeight = Number(market.boostWeight ?? 0);

      return {
        id: docSnap.id,
        city: data.city,
        title: data.title,
        message: data.message,
        author: data.author || {},
        authorUsername: data.authorUsername,
        authorDisplayName: data.authorDisplayName,
        authorAvatar: data.authorAvatar,
        createdAt,
        marketListing: {
          ...market,
          boostedUntil,
          boostCount,
          boostWeight,
        },
        isMarketListing: true,
      };
    });

    const now = Date.now();
    listings.sort((a, b) => {
      const aBoosted = (a.marketListing?.boostedUntil ?? 0) > now ? 1 : 0;
      const bBoosted = (b.marketListing?.boostedUntil ?? 0) > now ? 1 : 0;
      if (aBoosted !== bBoosted) {
        return bBoosted - aBoosted;
      }
      const weightA = a.marketListing?.boostWeight ?? 0;
      const weightB = b.marketListing?.boostWeight ?? 0;
      if (weightA !== weightB) {
        return weightB - weightA;
      }
      return (b.createdAt ?? 0) - (a.createdAt ?? 0);
    });

    return listings.slice(0, limitCount);
  } catch (error) {
    console.warn('[Marketplace] Failed to fetch listings for feed:', error?.message || error);
    return [];
  }
}

/**
 * Count how many active market listings a user has
 */
export async function countUserActiveListings(userId) {
  if (!userId || !db) return 0;

  try {
    const postsRef = collection(db, 'posts');
    const q = query(
      postsRef,
      where('author.uid', '==', userId),
      where('isMarketListing', '==', true)
    );

    const snapshot = await getDocs(q);
    return snapshot.size;
  } catch (error) {
    console.warn('[Marketplace] Failed to count user listings:', error?.message || error);
    return 0;
  }
}
