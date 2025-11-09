/**
 * Interests Selector Modal
 * Allows users to select up to 10 interests from predefined categories
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSettings } from '../contexts/SettingsContext';
import { INTEREST_CATEGORIES, ALL_INTERESTS, PROFILE_LIMITS } from '../constants/profileConstants';

export default function InterestsSelectorModal({
  visible,
  onClose,
  selectedInterests = [],
  onSave,
}) {
  const { themeColors, accentPreset } = useSettings();
  const [localSelectedInterests, setLocalSelectedInterests] = useState(selectedInterests);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState(Object.keys(INTEREST_CATEGORIES)[0]);

  const primaryColor = accentPreset?.buttonBackground || themeColors.primary;

  // Filter interests by search query
  const filteredInterests = useMemo(() => {
    if (!searchQuery.trim()) {
      return INTEREST_CATEGORIES;
    }

    const query = searchQuery.toLowerCase();
    const filtered = {};

    Object.entries(INTEREST_CATEGORIES).forEach(([category, interests]) => {
      const matchingInterests = interests.filter((interest) =>
        interest.label.toLowerCase().includes(query)
      );
      if (matchingInterests.length > 0) {
        filtered[category] = matchingInterests;
      }
    });

    return filtered;
  }, [searchQuery]);

  const toggleInterest = (interestId) => {
    setLocalSelectedInterests((prev) => {
      if (prev.includes(interestId)) {
        // Remove interest
        return prev.filter((id) => id !== interestId);
      } else {
        // Add interest if not at max
        if (prev.length >= PROFILE_LIMITS.MAX_INTERESTS) {
          return prev; // Don't add if at limit
        }
        return [...prev, interestId];
      }
    });
  };

  const handleSave = () => {
    onSave(localSelectedInterests);
    onClose();
  };

  const handleCancel = () => {
    setLocalSelectedInterests(selectedInterests); // Reset to original
    setSearchQuery('');
    onClose();
  };

  const localStyles = StyleSheet.create({
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      justifyContent: 'flex-end',
    },
    modalContainer: {
      backgroundColor: themeColors.card,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      maxHeight: '90%',
      paddingBottom: 40,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: themeColors.divider,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: themeColors.textPrimary,
    },
    closeButton: {
      padding: 8,
    },
    searchContainer: {
      paddingHorizontal: 20,
      paddingVertical: 12,
    },
    searchInput: {
      backgroundColor: themeColors.background,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
      fontSize: 15,
      color: themeColors.textPrimary,
      borderWidth: 1,
      borderColor: themeColors.divider,
    },
    selectedCountContainer: {
      paddingHorizontal: 20,
      paddingVertical: 8,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    selectedCount: {
      fontSize: 13,
      fontWeight: '600',
      color: themeColors.textSecondary,
    },
    categoryTabs: {
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: themeColors.divider,
    },
    categoryTabsScroll: {
      flexDirection: 'row',
      gap: 8,
    },
    categoryTab: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      borderWidth: 1,
    },
    categoryTabText: {
      fontSize: 13,
      fontWeight: '600',
    },
    contentContainer: {
      paddingHorizontal: 20,
      paddingVertical: 16,
    },
    categorySection: {
      marginBottom: 20,
    },
    categoryTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: themeColors.textPrimary,
      marginBottom: 12,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    interestsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    interestPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 20,
      borderWidth: 1.5,
    },
    interestPillText: {
      fontSize: 14,
      fontWeight: '600',
    },
    footer: {
      flexDirection: 'row',
      gap: 12,
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 8,
      borderTopWidth: 1,
      borderTopColor: themeColors.divider,
    },
    footerButton: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    footerButtonText: {
      fontSize: 16,
      fontWeight: '700',
    },
    emptyState: {
      paddingVertical: 40,
      alignItems: 'center',
    },
    emptyText: {
      fontSize: 15,
      color: themeColors.textSecondary,
      marginTop: 12,
    },
  });

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleCancel}
    >
      <View style={localStyles.modalOverlay}>
        <View style={localStyles.modalContainer}>
          {/* Header */}
          <View style={localStyles.header}>
            <Text style={localStyles.headerTitle}>Select Interests</Text>
            <TouchableOpacity
              onPress={handleCancel}
              style={localStyles.closeButton}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={24} color={themeColors.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* Search */}
          <View style={localStyles.searchContainer}>
            <TextInput
              style={localStyles.searchInput}
              placeholder="Search interests..."
              placeholderTextColor={themeColors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {/* Selected Count */}
          <View style={localStyles.selectedCountContainer}>
            <Ionicons
              name="checkmark-circle"
              size={16}
              color={localSelectedInterests.length >= PROFILE_LIMITS.MAX_INTERESTS ? '#FF3B30' : primaryColor}
            />
            <Text style={localStyles.selectedCount}>
              {localSelectedInterests.length}/{PROFILE_LIMITS.MAX_INTERESTS} selected
              {localSelectedInterests.length >= PROFILE_LIMITS.MAX_INTERESTS && ' (Max reached)'}
            </Text>
          </View>

          {/* Category Tabs (only show when not searching) */}
          {!searchQuery.trim() && (
            <View style={localStyles.categoryTabs}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={localStyles.categoryTabsScroll}
              >
                {Object.keys(INTEREST_CATEGORIES).map((category) => {
                  const isActive = activeCategory === category;
                  return (
                    <TouchableOpacity
                      key={category}
                      style={[
                        localStyles.categoryTab,
                        {
                          backgroundColor: isActive ? primaryColor : 'transparent',
                          borderColor: isActive ? primaryColor : themeColors.divider,
                        },
                      ]}
                      onPress={() => setActiveCategory(category)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          localStyles.categoryTabText,
                          {
                            color: isActive ? '#fff' : themeColors.textSecondary,
                          },
                        ]}
                      >
                        {category}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* Interests Grid */}
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={localStyles.contentContainer}
            showsVerticalScrollIndicator={false}
          >
            {Object.keys(filteredInterests).length === 0 ? (
              <View style={localStyles.emptyState}>
                <Ionicons name="search" size={48} color={themeColors.textSecondary} />
                <Text style={localStyles.emptyText}>
                  No interests found for "{searchQuery}"
                </Text>
              </View>
            ) : (
              Object.entries(filteredInterests)
                .filter(([category]) => searchQuery.trim() || category === activeCategory)
                .map(([category, interests]) => (
                  <View key={category} style={localStyles.categorySection}>
                    {searchQuery.trim() && (
                      <Text style={localStyles.categoryTitle}>{category}</Text>
                    )}
                    <View style={localStyles.interestsGrid}>
                      {interests.map((interest) => {
                        const isSelected = localSelectedInterests.includes(interest.id);
                        return (
                          <TouchableOpacity
                            key={interest.id}
                            style={[
                              localStyles.interestPill,
                              {
                                backgroundColor: isSelected ? primaryColor : themeColors.background,
                                borderColor: isSelected ? primaryColor : themeColors.divider,
                              },
                            ]}
                            onPress={() => toggleInterest(interest.id)}
                            activeOpacity={0.7}
                          >
                            <Ionicons
                              name={interest.icon}
                              size={16}
                              color={isSelected ? '#fff' : themeColors.textPrimary}
                            />
                            <Text
                              style={[
                                localStyles.interestPillText,
                                {
                                  color: isSelected ? '#fff' : themeColors.textPrimary,
                                },
                              ]}
                            >
                              {interest.label}
                            </Text>
                            {isSelected && (
                              <Ionicons name="checkmark-circle" size={16} color="#fff" />
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                ))
            )}
          </ScrollView>

          {/* Footer */}
          <View style={localStyles.footer}>
            <TouchableOpacity
              style={[
                localStyles.footerButton,
                {
                  backgroundColor: 'transparent',
                  borderWidth: 1.5,
                  borderColor: themeColors.divider,
                },
              ]}
              onPress={handleCancel}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  localStyles.footerButtonText,
                  { color: themeColors.textSecondary },
                ]}
              >
                Cancel
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                localStyles.footerButton,
                { backgroundColor: primaryColor },
              ]}
              onPress={handleSave}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  localStyles.footerButtonText,
                  { color: '#fff' },
                ]}
              >
                Save ({localSelectedInterests.length})
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
