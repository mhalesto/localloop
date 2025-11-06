/**
 * Utility functions for handling user mentions (@username)
 */

import { getUserProfileByUsername } from '../services/userProfileService';

/**
 * Extract all @username mentions from text
 * @param {string} text - The text to parse
 * @returns {Array<string>} Array of mentioned usernames (without @)
 */
export function extractMentions(text) {
  if (!text || typeof text !== 'string') {
    return [];
  }

  // Match @username pattern (alphanumeric, underscores, hyphens)
  // Username must be 3-20 characters
  const mentionRegex = /@([a-zA-Z0-9_-]{3,20})/g;
  const matches = [];
  let match;

  while ((match = mentionRegex.exec(text)) !== null) {
    matches.push(match[1].toLowerCase()); // Store lowercase
  }

  // Return unique usernames
  return [...new Set(matches)];
}

/**
 * Convert mentioned usernames to user IDs
 * @param {Array<string>} usernames - Array of usernames
 * @returns {Promise<Array<string>>} Array of user IDs
 */
export async function resolveMentionedUserIds(usernames) {
  if (!usernames || usernames.length === 0) {
    return [];
  }

  try {
    // Look up each username
    const lookupPromises = usernames.map(async (username) => {
      try {
        const profile = await getUserProfileByUsername(username);
        return profile ? profile.id : null;
      } catch (error) {
        console.warn(`[MentionUtils] Failed to resolve username ${username}:`, error);
        return null;
      }
    });

    const userIds = await Promise.all(lookupPromises);

    // Filter out nulls and return unique IDs
    return [...new Set(userIds.filter((id) => id !== null))];
  } catch (error) {
    console.error('[MentionUtils] Error resolving mentioned user IDs:', error);
    return [];
  }
}

/**
 * Process text to extract mentions and resolve to user IDs
 * @param {string} text - The text containing mentions
 * @returns {Promise<Object>} Object with usernames and userIds arrays
 */
export async function processMentions(text) {
  const usernames = extractMentions(text);

  if (usernames.length === 0) {
    return { usernames: [], userIds: [] };
  }

  const userIds = await resolveMentionedUserIds(usernames);

  return {
    usernames,
    userIds,
  };
}

/**
 * Highlight mentions in text for display
 * @param {string} text - The text containing mentions
 * @param {string} highlightColor - Color for highlighted mentions
 * @returns {Array} Array of text parts with mention flags
 */
export function parseMentionsForDisplay(text, highlightColor = '#6C4DF4') {
  if (!text || typeof text !== 'string') {
    return [{ text, isMention: false }];
  }

  const mentionRegex = /(@[a-zA-Z0-9_-]{3,20})/g;
  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = mentionRegex.exec(text)) !== null) {
    // Add text before mention
    if (match.index > lastIndex) {
      parts.push({
        text: text.substring(lastIndex, match.index),
        isMention: false,
      });
    }

    // Add mention
    parts.push({
      text: match[1],
      isMention: true,
      username: match[1].substring(1), // Remove @ prefix
      color: highlightColor,
    });

    lastIndex = match.index + match[1].length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push({
      text: text.substring(lastIndex),
      isMention: false,
    });
  }

  return parts.length > 0 ? parts : [{ text, isMention: false }];
}
