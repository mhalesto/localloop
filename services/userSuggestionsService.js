/**
 * User Suggestions Service
 * Suggest users based on shared interests, location, and mutual connections
 */

import { getFirestore, collection, query, where, getDocs, limit, orderBy } from 'firebase/firestore';
import { app } from '../api/firebaseConfig';

const db = getFirestore(app);

/**
 * Calculate similarity score between two users
 * @param {object} currentUser - Current user profile
 * @param {object} otherUser - Other user profile
 * @returns {number} Similarity score (0-100)
 */
function calculateSimilarityScore(currentUser, otherUser) {
  let score = 0;

  // Shared interests (50 points max)
  const currentInterests = currentUser.interests || [];
  const otherInterests = otherUser.interests || [];
  const sharedInterests = currentInterests.filter((interest) =>
    otherInterests.includes(interest)
  );
  score += Math.min((sharedInterests.length / Math.max(currentInterests.length, 1)) * 50, 50);

  // Same location (30 points)
  if (currentUser.city && currentUser.city === otherUser.city) {
    score += 30;
  } else if (currentUser.province && currentUser.province === otherUser.province) {
    score += 15;
  } else if (currentUser.country && currentUser.country === otherUser.country) {
    score += 5;
  }

  // Same profession field (10 points)
  if (currentUser.profession && otherUser.profession) {
    const currentProfessionLower = currentUser.profession.toLowerCase();
    const otherProfessionLower = otherUser.profession.toLowerCase();

    // Check for similar profession keywords
    const professionKeywords = ['developer', 'designer', 'engineer', 'artist', 'teacher', 'manager'];
    const hasSimilarProfession = professionKeywords.some((keyword) =>
      currentProfessionLower.includes(keyword) && otherProfessionLower.includes(keyword)
    );

    if (hasSimilarProfession || currentProfessionLower === otherProfessionLower) {
      score += 10;
    }
  }

  // Active profile bonus (10 points)
  if (otherUser.profilePhoto) score += 5;
  if (otherUser.bio) score += 5;

  return Math.min(score, 100);
}

/**
 * Get suggested users based on interests and location
 * @param {string} userId - Current user ID
 * @param {object} userProfile - Current user profile
 * @param {number} maxResults - Maximum number of suggestions
 * @returns {Promise<Array>} Suggested users with scores
 */
export async function getSuggestedUsers(userId, userProfile, maxResults = 10) {
  try {
    const suggestions = [];
    const userInterests = userProfile.interests || [];

    // If user has no interests, suggest users from same location
    if (userInterests.length === 0) {
      if (userProfile.city) {
        const localUsersQuery = query(
          collection(db, 'users'),
          where('city', '==', userProfile.city),
          where('isPublicProfile', '==', true),
          limit(maxResults * 2)
        );

        const snapshot = await getDocs(localUsersQuery);
        snapshot.docs.forEach((doc) => {
          if (doc.id !== userId) {
            const userData = doc.data();
            suggestions.push({
              uid: doc.id,
              username: userData.username,
              displayName: userData.displayName,
              profilePhoto: userData.profilePhoto,
              bio: userData.bio,
              interests: userData.interests || [],
              profession: userData.profession,
              city: userData.city,
              score: 30, // Location match score
              reason: 'Near you',
            });
          }
        });
      }
    } else {
      // Get users with any shared interests
      const usersQuery = query(
        collection(db, 'users'),
        where('isPublicProfile', '==', true),
        limit(100) // Get more to filter and sort
      );

      const snapshot = await getDocs(usersQuery);

      snapshot.docs.forEach((doc) => {
        if (doc.id !== userId) {
          const userData = doc.data();
          const otherInterests = userData.interests || [];

          // Check for shared interests
          const sharedInterests = userInterests.filter((interest) =>
            otherInterests.includes(interest)
          );

          if (sharedInterests.length > 0) {
            const score = calculateSimilarityScore(userProfile, userData);

            // Determine primary reason
            let reason = '';
            if (sharedInterests.length >= 3) {
              reason = `${sharedInterests.length} shared interests`;
            } else if (sharedInterests.length > 0) {
              reason = 'Similar interests';
            } else if (userData.city === userProfile.city) {
              reason = 'Near you';
            } else {
              reason = 'Suggested for you';
            }

            suggestions.push({
              uid: doc.id,
              username: userData.username,
              displayName: userData.displayName,
              profilePhoto: userData.profilePhoto,
              bio: userData.bio,
              interests: otherInterests,
              profession: userData.profession,
              city: userData.city,
              sharedInterests,
              score,
              reason,
            });
          }
        }
      });
    }

    // Sort by score (highest first) and return top N
    suggestions.sort((a, b) => b.score - a.score);
    return suggestions.slice(0, maxResults);
  } catch (error) {
    console.error('[userSuggestionsService] Error getting suggested users:', error);
    return [];
  }
}

/**
 * Get users by specific interest
 * @param {string} interestId - Interest ID
 * @param {string} currentUserId - Current user ID (to exclude)
 * @param {number} maxResults - Maximum results
 * @returns {Promise<Array>} Users with this interest
 */
export async function getUsersByInterest(interestId, currentUserId, maxResults = 20) {
  try {
    const usersQuery = query(
      collection(db, 'users'),
      where('interests', 'array-contains', interestId),
      where('isPublicProfile', '==', true),
      limit(maxResults + 1) // +1 to exclude current user
    );

    const snapshot = await getDocs(usersQuery);
    const users = [];

    snapshot.docs.forEach((doc) => {
      if (doc.id !== currentUserId) {
        const userData = doc.data();
        users.push({
          uid: doc.id,
          username: userData.username,
          displayName: userData.displayName,
          profilePhoto: userData.profilePhoto,
          bio: userData.bio,
          interests: userData.interests || [],
          profession: userData.profession,
          city: userData.city,
        });
      }
    });

    return users.slice(0, maxResults);
  } catch (error) {
    console.error('[userSuggestionsService] Error getting users by interest:', error);
    return [];
  }
}

/**
 * Search users by profession
 * @param {string} profession - Profession keyword
 * @param {string} currentUserId - Current user ID (to exclude)
 * @param {number} maxResults - Maximum results
 * @returns {Promise<Array>} Users matching profession
 */
export async function searchUsersByProfession(profession, currentUserId, maxResults = 20) {
  try {
    // Since Firestore doesn't support text search, we'll get all users
    // and filter client-side (for small datasets)
    // For production, consider Algolia or similar
    const usersQuery = query(
      collection(db, 'users'),
      where('isPublicProfile', '==', true),
      limit(100)
    );

    const snapshot = await getDocs(usersQuery);
    const users = [];
    const searchTerm = profession.toLowerCase();

    snapshot.docs.forEach((doc) => {
      if (doc.id !== currentUserId) {
        const userData = doc.data();
        const userProfession = (userData.profession || '').toLowerCase();

        if (userProfession.includes(searchTerm)) {
          users.push({
            uid: doc.id,
            username: userData.username,
            displayName: userData.displayName,
            profilePhoto: userData.profilePhoto,
            bio: userData.bio,
            profession: userData.profession,
            company: userData.company,
            interests: userData.interests || [],
            city: userData.city,
          });
        }
      }
    });

    return users.slice(0, maxResults);
  } catch (error) {
    console.error('[userSuggestionsService] Error searching users by profession:', error);
    return [];
  }
}
