import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

/**
 * Display a content warning badge
 */
export default function ContentWarningBadge({ warning, size = 'small', style }) {
  if (!warning) return null;

  const styles = size === 'small' ? smallStyles : largeStyles;

  return (
    <View style={[styles.badge, { backgroundColor: warning.color }, style]}>
      <Text style={styles.icon}>{warning.icon}</Text>
      <Text style={styles.label}>{warning.label}</Text>
    </View>
  );
}

/**
 * Display list of content warnings
 */
export function ContentWarningList({ warnings = [], size = 'small', maxDisplay = 3, style }) {
  if (!warnings || warnings.length === 0) return null;

  const displayWarnings = warnings.slice(0, maxDisplay);
  const remaining = warnings.length - maxDisplay;

  return (
    <View style={[listStyles.container, style]}>
      {displayWarnings.map((warning, index) => (
        <ContentWarningBadge
          key={`${warning.label}-${index}`}
          warning={warning}
          size={size}
          style={listStyles.badge}
        />
      ))}
      {remaining > 0 && (
        <View style={[listStyles.moreBadge, size === 'small' ? smallStyles.badge : largeStyles.badge]}>
          <Text style={size === 'small' ? smallStyles.label : largeStyles.label}>
            +{remaining} more
          </Text>
        </View>
      )}
    </View>
  );
}

/**
 * Display sentiment badge
 */
export function SentimentBadge({ sentiment, size = 'small', style }) {
  if (!sentiment) return null;

  const styles = size === 'small' ? smallStyles : largeStyles;

  return (
    <View style={[styles.badge, { backgroundColor: sentiment.color }, style]}>
      <Text style={styles.icon}>{sentiment.icon}</Text>
      <Text style={styles.label}>{sentiment.label}</Text>
    </View>
  );
}

const smallStyles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  icon: {
    fontSize: 12,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
  },
});

const largeStyles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  icon: {
    fontSize: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
});

const listStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  badge: {
    marginRight: 4,
    marginBottom: 4,
  },
  moreBadge: {
    backgroundColor: '#9E9E9E',
  },
});
