import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSettings } from '../contexts/SettingsContext';

export default function ExploreFilterModal({ visible, onClose, filters, onSaveFilters }) {
  const { themeColors, isDarkMode } = useSettings();
  const [localFilters, setLocalFilters] = useState(filters);

  useEffect(() => {
    if (visible) {
      setLocalFilters(filters);
    }
  }, [visible, filters]);

  const handleToggle = (key) => {
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
    const defaultFilters = {
      showNearbyCities: true,
      showPostsFromCurrentCity: false,
      showStatusesFromCurrentCity: false,
      showLocalUsers: false,
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
      key: 'showStatusesFromCurrentCity',
      label: 'Statuses from Current City',
      description: 'Show status updates from your city',
      icon: 'chatbubble-ellipses',
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
              Customize what you see on the Explore screen. Your preferences will be saved automatically.
            </Text>

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
                    <Text style={[styles.filterLabel, { color: themeColors.textPrimary }]}>
                      {option.label}
                    </Text>
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
                />
              </View>
            ))}
          </ScrollView>

          {/* Footer actions */}
          <View style={[styles.footer, { borderTopColor: themeColors.divider }]}>
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

            <TouchableOpacity
              style={[styles.saveButton, { backgroundColor: themeColors.primary }]}
              onPress={handleSave}
              activeOpacity={0.85}
            >
              <Ionicons name="checkmark" size={18} color="#fff" />
              <Text style={styles.saveButtonText}>Apply Filters</Text>
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
    maxHeight: '85%',
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
  filterLabel: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
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
});
