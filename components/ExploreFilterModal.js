import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSettings } from '../contexts/SettingsContext';

export default function ExploreFilterModal({ visible, onClose, filters, onSaveFilters, userProfile, navigation }) {
  const { themeColors, isDarkMode } = useSettings();
  const [localFilters, setLocalFilters] = useState(filters);

  // Check if user is on Basic plan
  const userPlan = userProfile?.subscriptionPlan || 'basic';
  const isBasicUser = userPlan === 'basic';
  const canCustomize = !isBasicUser; // Premium and Gold can customize

  useEffect(() => {
    if (visible) {
      setLocalFilters(filters);
    }
  }, [visible, filters]);

  const handleToggle = (key) => {
    // Basic users cannot customize filters
    if (isBasicUser) {
      Alert.alert(
        'Premium Feature',
        'Customize your Explore filters with Premium or Gold! Basic users enjoy our recommended settings for the best experience.',
        [
          { text: 'Maybe Later', style: 'cancel' },
          {
            text: 'Upgrade Now',
            onPress: () => {
              onClose();
              navigation?.navigate('Subscription');
            },
          },
        ]
      );
      return;
    }

    setLocalFilters((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSave = () => {
    onSaveFilters(localFilters);
    onClose();
  };

  const handleReset = () => {
    // Default filters for all users (especially Basic users who can't customize)
    const defaultFilters = {
      showNearbyCities: true,
      showPostsFromCurrentCity: true,
      showPostBackgrounds: true,
      showAIArtGallery: true,
      showLocalUsers: true,
      showTrendingCities: true,
    };
    setLocalFilters(defaultFilters);
  };

  const filterOptions = [
    {
      key: 'showNearbyCities',
      label: 'Nearby Cities',
      description: 'Show cities close to your location',
      icon: 'location',
      color: '#10b981',
    },
    {
      key: 'showPostsFromCurrentCity',
      label: 'Posts from Current City',
      description: 'Display posts from your current city',
      icon: 'document-text',
      color: '#3b82f6',
    },
    {
      key: 'showPostBackgrounds',
      label: 'Post Backgrounds',
      description: 'Show original post colors on cards',
      icon: 'color-fill',
      color: '#ec4899',
    },
    {
      key: 'showAIArtGallery',
      label: 'AI Art Gallery',
      description: 'View AI-generated artwork from your city',
      icon: 'color-palette',
      color: '#a855f7',
    },
    {
      key: 'showLocalUsers',
      label: 'Local Users',
      description: 'Discover users in your area',
      icon: 'people',
      color: '#f59e0b',
    },
    {
      key: 'showTrendingCities',
      label: 'Trending Cities',
      description: 'Show cities with recent activity',
      icon: 'flame',
      color: '#ef4444',
    },
  ];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.modalContainer, { backgroundColor: themeColors.card }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: themeColors.divider }]}>
            <View style={styles.headerLeft}>
              <Ionicons name="options" size={24} color={themeColors.primary} />
              <Text style={[styles.title, { color: themeColors.textPrimary }]}>
                Explore Filters
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeButton}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={24} color={themeColors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Scrollable content */}
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <Text style={[styles.subtitle, { color: themeColors.textSecondary }]}>
              {isBasicUser
                ? 'These are the recommended filters for Basic users. Upgrade to Premium or Gold to customize your Explore experience!'
                : 'Customize what you see on the Explore screen. Your preferences will be saved automatically.'}
            </Text>

            {/* Premium Feature Banner for Basic Users */}
            {isBasicUser && (
              <View style={[styles.premiumBanner, { backgroundColor: `${themeColors.primary}15`, borderColor: themeColors.primary }]}>
                <Ionicons name="lock-closed" size={20} color={themeColors.primary} />
                <View style={styles.premiumBannerText}>
                  <Text style={[styles.premiumBannerTitle, { color: themeColors.primary }]}>
                    Premium Feature
                  </Text>
                  <Text style={[styles.premiumBannerDescription, { color: themeColors.textSecondary }]}>
                    Upgrade to customize your filters
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.upgradeBadge, { backgroundColor: themeColors.primary }]}
                  onPress={() => {
                    onClose();
                    navigation?.navigate('Subscription');
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.upgradeBadgeText}>Upgrade</Text>
                </TouchableOpacity>
              </View>
            )}

            {filterOptions.map((option) => (
              <View
                key={option.key}
                style={[
                  styles.filterOption,
                  {
                    backgroundColor: isDarkMode ? themeColors.background : '#f9fafb',
                    borderColor: themeColors.divider,
                  },
                ]}
              >
                <View style={styles.filterLeft}>
                  <View
                    style={[
                      styles.iconContainer,
                      { backgroundColor: `${option.color}15` },
                    ]}
                  >
                    <Ionicons name={option.icon} size={20} color={option.color} />
                  </View>
                  <View style={styles.filterText}>
                    <View style={styles.labelRow}>
                      <Text style={[styles.filterLabel, { color: themeColors.textPrimary }]}>
                        {option.label}
                      </Text>
                      {isBasicUser && (
                        <View style={styles.lockBadge}>
                          <Ionicons name="lock-closed" size={10} color={themeColors.textSecondary} />
                        </View>
                      )}
                    </View>
                    <Text style={[styles.filterDescription, { color: themeColors.textSecondary }]}>
                      {option.description}
                    </Text>
                  </View>
                </View>
                <Switch
                  value={localFilters[option.key]}
                  onValueChange={() => handleToggle(option.key)}
                  trackColor={{ false: themeColors.divider, true: option.color }}
                  thumbColor={localFilters[option.key] ? '#fff' : '#f4f3f4'}
                  disabled={isBasicUser}
                  style={isBasicUser ? styles.disabledSwitch : null}
                />
              </View>
            ))}
          </ScrollView>

          {/* Footer actions */}
          <View style={[styles.footer, { borderTopColor: themeColors.divider }]}>
            {!isBasicUser && (
              <TouchableOpacity
                style={[
                  styles.resetButton,
                  {
                    backgroundColor: isDarkMode ? themeColors.background : '#f3f4f6',
                    borderColor: themeColors.divider,
                  },
                ]}
                onPress={handleReset}
                activeOpacity={0.85}
              >
                <Ionicons name="refresh" size={18} color={themeColors.textPrimary} />
                <Text style={[styles.resetButtonText, { color: themeColors.textPrimary }]}>
                  Reset
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[
                isBasicUser ? styles.closeButtonFull : styles.saveButton,
                { backgroundColor: themeColors.primary }
              ]}
              onPress={isBasicUser ? onClose : handleSave}
              activeOpacity={0.85}
            >
              <Ionicons name={isBasicUser ? "close" : "checkmark"} size={18} color="#fff" />
              <Text style={styles.saveButtonText}>
                {isBasicUser ? 'Close' : 'Apply Filters'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '85%',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: -4 },
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  closeButton: {
    padding: 4,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 10,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
  },
  premiumBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    marginBottom: 20,
    borderWidth: 1.5,
    gap: 12,
  },
  premiumBannerText: {
    flex: 1,
  },
  premiumBannerTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  premiumBannerDescription: {
    fontSize: 12,
    lineHeight: 16,
  },
  upgradeBadge: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  upgradeBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  filterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  filterLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  filterText: {
    flex: 1,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  filterLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  lockBadge: {
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: 8,
    padding: 4,
  },
  filterDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
  },
  resetButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  resetButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  closeButtonFull: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  disabledSwitch: {
    opacity: 0.6,
  },
});
