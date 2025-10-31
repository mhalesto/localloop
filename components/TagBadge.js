import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { getTagInfo } from '../services/autoTaggingService';

export default function TagBadge({ tag, showIcon = false, size = 'small', style }) {
  const tagInfo = getTagInfo(tag);

  const sizeStyles = {
    small: {
      container: styles.containerSmall,
      text: styles.textSmall,
      icon: styles.iconSmall,
    },
    medium: {
      container: styles.containerMedium,
      text: styles.textMedium,
      icon: styles.iconMedium,
    },
  };

  const currentSize = sizeStyles[size] || sizeStyles.small;

  return (
    <View
      style={[
        styles.container,
        currentSize.container,
        { backgroundColor: tagInfo.color.bg },
        style,
      ]}
    >
      {showIcon && (
        <Text style={[styles.icon, currentSize.icon]}>
          {tagInfo.icon}
        </Text>
      )}
      <Text
        style={[
          styles.text,
          currentSize.text,
          { color: tagInfo.color.text },
        ]}
        numberOfLines={1}
      >
        {tagInfo.label}
      </Text>
    </View>
  );
}

export function TagList({ tags = [], maxTags = 4, showIcons = false, size = 'small', style }) {
  if (!tags || tags.length === 0) return null;

  const displayTags = tags.slice(0, maxTags);

  return (
    <View style={[styles.listContainer, style]}>
      {displayTags.map((tag, index) => (
        <TagBadge
          key={`${tag}-${index}`}
          tag={tag}
          showIcon={showIcons}
          size={size}
          style={styles.listItem}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
  containerSmall: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  containerMedium: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  text: {
    fontWeight: '600',
  },
  textSmall: {
    fontSize: 11,
  },
  textMedium: {
    fontSize: 13,
  },
  icon: {
    marginRight: 4,
  },
  iconSmall: {
    fontSize: 10,
  },
  iconMedium: {
    fontSize: 12,
  },
  listContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  listItem: {
    marginBottom: 2,
  },
});
