import React from 'react';
import { View, Text, StyleSheet, Switch } from 'react-native';
import { getTogglableFeatures, getFeatureInfo } from '../config/aiFeatures';

/**
 * AI Features Settings Component
 * Shows toggleable AI features for users to enable/disable
 * Matches the SettingsScreen styling pattern
 */
export default function AIFeaturesSettings({
  isPremium = false,
  userPreferences = {},
  onToggleFeature,
  themeColors,
  accentColor,
  inactiveTrackColor,
  activeThumbColor,
  inactiveThumbColor,
}) {
  const togglableFeatures = getTogglableFeatures(isPremium);

  if (togglableFeatures.length === 0) {
    return null;
  }

  return (
    <>
      <Text style={[styles.sectionTitle, { color: themeColors.textPrimary }]}>
        AI Features
      </Text>
      <Text style={[styles.sectionHint, { color: themeColors.textSecondary }]}>
        Customize your AI-powered experience with smart features.
      </Text>

      {togglableFeatures.map(({ name, config }, index) => {
        const info = getFeatureInfo(name);
        const isEnabled = userPreferences[name] !== false; // Default to true
        const isLast = index === togglableFeatures.length - 1;

        return (
          <View
            key={name}
            style={[
              styles.item,
              isLast && styles.itemLast,
              { borderBottomColor: themeColors.divider }
            ]}
          >
            <View style={styles.itemContent}>
              <Text style={styles.itemIcon}>{info.icon}</Text>
              <View style={styles.itemText}>
                <View style={styles.itemTitleRow}>
                  <Text style={[styles.itemTitle, { color: themeColors.textPrimary }]}>
                    {info.title}
                  </Text>
                  {info.badge && (
                    <View
                      style={[
                        styles.badge,
                        {
                          backgroundColor:
                            info.badge === 'FREE'
                              ? '#4CAF50'
                              : info.badge === 'PREMIUM'
                              ? '#FFD700'
                              : themeColors.accent,
                        },
                      ]}
                    >
                      <Text style={styles.badgeText}>{info.badge}</Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.itemSubtitle, { color: themeColors.textSecondary }]}>
                  {info.description}
                </Text>
              </View>
            </View>
            <Switch
              value={isEnabled}
              onValueChange={(value) => onToggleFeature?.(name, value)}
              trackColor={{
                true: accentColor,
                false: inactiveTrackColor,
              }}
              thumbColor={isEnabled ? activeThumbColor : inactiveThumbColor}
              ios_backgroundColor={inactiveTrackColor}
            />
          </View>
        );
      })}
    </>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  sectionHint: {
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 16,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  itemLast: {
    borderBottomWidth: 0,
  },
  itemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 16,
  },
  itemIcon: {
    fontSize: 24,
    marginRight: 12,
    width: 32,
    textAlign: 'center',
  },
  itemText: {
    flex: 1,
  },
  itemTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: '500',
    marginRight: 8,
  },
  itemSubtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.5,
  },
});
