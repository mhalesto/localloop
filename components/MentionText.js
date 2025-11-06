/**
 * MentionText - Displays text with highlighted, tappable @mentions
 *
 * Features:
 * - Highlights @username in accent color
 * - Makes mentions tappable to navigate to profiles
 * - Supports RichText formatting
 */

import React, { useMemo } from 'react';
import { Text, StyleSheet } from 'react-native';
import { parseMentionsForDisplay } from '../utils/mentionUtils';

export default function MentionText({
  children,
  style,
  textColor = '#000000',
  accentColor = '#6C4DF4',
  onMentionPress,
  numberOfLines,
  ...otherProps
}) {
  const text = typeof children === 'string' ? children : '';

  const parts = useMemo(() => {
    return parseMentionsForDisplay(text, accentColor);
  }, [text, accentColor]);

  const handleMentionPress = (username) => {
    if (onMentionPress) {
      onMentionPress(username);
    }
  };

  return (
    <Text style={[{ color: textColor }, style]} numberOfLines={numberOfLines} {...otherProps}>
      {parts.map((part, index) => {
        if (part.isMention) {
          return (
            <Text
              key={`mention-${index}`}
              onPress={() => handleMentionPress(part.username)}
              style={[styles.mention, { color: part.color || accentColor }]}
            >
              {part.text}
            </Text>
          );
        }
        return <Text key={`text-${index}`}>{part.text}</Text>;
      })}
    </Text>
  );
}

const styles = StyleSheet.create({
  mention: {
    fontWeight: '600',
  },
});
