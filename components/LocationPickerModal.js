/**
 * Location Picker Modal
 * Modern modal for selecting country, province/state, and city
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSettings } from '../contexts/SettingsContext';

const COUNTRIES = {
  'ZA': { name: 'South Africa', emoji: '🇿🇦' },
  'US': { name: 'United States', emoji: '🇺🇸' },
  'GB': { name: 'United Kingdom', emoji: '🇬🇧' },
  'NG': { name: 'Nigeria', emoji: '🇳🇬' },
  'KE': { name: 'Kenya', emoji: '🇰🇪' },
};

const PROVINCES = {
  'ZA': [
    'Gauteng',
    'Western Cape',
    'KwaZulu-Natal',
    'Eastern Cape',
    'Free State',
    'Limpopo',
    'Mpumalanga',
    'Northern Cape',
    'North West',
  ],
  'US': [
    'California',
    'Texas',
    'Florida',
    'New York',
    'Pennsylvania',
    'Illinois',
    'Ohio',
    'Georgia',
    'North Carolina',
    'Michigan',
  ],
  'GB': ['England', 'Scotland', 'Wales', 'Northern Ireland'],
  'NG': ['Lagos', 'Kano', 'Rivers', 'Oyo', 'Kaduna', 'Abuja'],
  'KE': ['Nairobi', 'Mombasa', 'Kisumu', 'Nakuru', 'Eldoret'],
};

export default function LocationPickerModal({
  visible,
  onClose,
  currentCountry,
  currentProvince,
  currentCity,
  onSave,
}) {
  const { themeColors, accentPreset } = useSettings();
  const [step, setStep] = useState('country'); // 'country', 'province', 'city'
  const [selectedCountry, setSelectedCountry] = useState(currentCountry || '');
  const [selectedProvince, setSelectedProvince] = useState(currentProvince || '');
  const [selectedCity, setSelectedCity] = useState(currentCity || '');
  const [searchQuery, setSearchQuery] = useState('');

  const primaryColor = accentPreset?.buttonBackground || themeColors.primary;

  // Sync with current values when modal opens
  useEffect(() => {
    if (visible) {
      setSelectedCountry(currentCountry || '');
      setSelectedProvince(currentProvince || '');
      setSelectedCity(currentCity || '');
      setSearchQuery('');
      // Determine starting step
      if (!currentCountry) {
        setStep('country');
      } else if (!currentProvince) {
        setStep('province');
      } else {
        setStep('city');
      }
    }
  }, [visible, currentCountry, currentProvince, currentCity]);

  const handleCountrySelect = (countryCode) => {
    setSelectedCountry(countryCode);
    setSelectedProvince(''); // Reset province when country changes
    setSelectedCity(''); // Reset city when country changes
    setSearchQuery('');
    setStep('province'); // Move to province selection
  };

  const handleProvinceSelect = (province) => {
    setSelectedProvince(province);
    setSelectedCity(''); // Reset city when province changes
    setSearchQuery('');
    setStep('city'); // Move to city input
  };

  const handleSave = () => {
    if (!selectedCountry) {
      onSave('', '', '');
      onClose();
      return;
    }

    onSave(selectedCountry, selectedProvince, selectedCity);
    onClose();
  };

  const handleCancel = () => {
    setSelectedCountry(currentCountry || '');
    setSelectedProvince(currentProvince || '');
    setSelectedCity(currentCity || '');
    setSearchQuery('');
    onClose();
  };

  const handleSkip = () => {
    if (step === 'province') {
      setStep('city');
    } else if (step === 'city') {
      handleSave();
    }
  };

  const handleBack = () => {
    if (step === 'city') {
      setStep('province');
    } else if (step === 'province') {
      setStep('country');
    }
  };

  // Filter countries by search
  const filteredCountries = Object.entries(COUNTRIES).filter(([code, data]) =>
    data.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Get provinces for selected country
  const availableProvinces = selectedCountry ? PROVINCES[selectedCountry] || [] : [];

  // Filter provinces by search
  const filteredProvinces = availableProvinces.filter((province) =>
    province.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
      maxHeight: '85%',
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
    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    headerButton: {
      padding: 4,
    },
    searchContainer: {
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: themeColors.divider,
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
    breadcrumb: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 12,
      backgroundColor: themeColors.background,
      borderBottomWidth: 1,
      borderBottomColor: themeColors.divider,
    },
    breadcrumbText: {
      fontSize: 13,
      color: themeColors.textSecondary,
      marginHorizontal: 4,
    },
    breadcrumbActive: {
      color: primaryColor,
      fontWeight: '600',
    },
    scrollView: {
      flex: 1,
    },
    scrollViewContent: {
      padding: 20,
    },
    listItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 14,
      paddingHorizontal: 16,
      backgroundColor: themeColors.background,
      borderRadius: 12,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: themeColors.divider,
    },
    listItemSelected: {
      borderColor: primaryColor,
      backgroundColor: `${primaryColor}10`,
    },
    listItemEmoji: {
      fontSize: 24,
      marginRight: 12,
    },
    listItemText: {
      flex: 1,
      fontSize: 15,
      fontWeight: '500',
      color: themeColors.textPrimary,
    },
    listItemTextSelected: {
      color: primaryColor,
      fontWeight: '600',
    },
    cityInputContainer: {
      marginBottom: 16,
    },
    label: {
      fontSize: 14,
      fontWeight: '600',
      color: themeColors.textPrimary,
      marginBottom: 8,
    },
    cityInput: {
      backgroundColor: themeColors.background,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
      fontSize: 16,
      color: themeColors.textPrimary,
      borderWidth: 1,
      borderColor: themeColors.divider,
    },
    hint: {
      fontSize: 13,
      color: themeColors.textSecondary,
      marginTop: 6,
      lineHeight: 18,
    },
    selectedInfo: {
      backgroundColor: themeColors.background,
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: primaryColor,
    },
    selectedInfoTitle: {
      fontSize: 13,
      fontWeight: '600',
      color: themeColors.textSecondary,
      marginBottom: 8,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    selectedInfoText: {
      fontSize: 15,
      color: themeColors.textPrimary,
      fontWeight: '500',
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
      textAlign: 'center',
    },
  });

  const renderBreadcrumb = () => {
    const countryName = selectedCountry ? COUNTRIES[selectedCountry]?.name : null;

    return (
      <View style={localStyles.breadcrumb}>
        <Text
          style={[
            localStyles.breadcrumbText,
            step === 'country' && localStyles.breadcrumbActive,
          ]}
        >
          {countryName || 'Select Country'}
        </Text>
        {selectedCountry && (
          <>
            <Ionicons name="chevron-forward" size={14} color={themeColors.textSecondary} />
            <Text
              style={[
                localStyles.breadcrumbText,
                step === 'province' && localStyles.breadcrumbActive,
              ]}
            >
              {selectedProvince || 'Select Region'}
            </Text>
          </>
        )}
        {selectedProvince && (
          <>
            <Ionicons name="chevron-forward" size={14} color={themeColors.textSecondary} />
            <Text
              style={[
                localStyles.breadcrumbText,
                step === 'city' && localStyles.breadcrumbActive,
              ]}
            >
              {selectedCity || 'Enter City'}
            </Text>
          </>
        )}
      </View>
    );
  };

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
            <View style={localStyles.headerActions}>
              {step !== 'country' && (
                <TouchableOpacity
                  onPress={handleBack}
                  style={localStyles.headerButton}
                  activeOpacity={0.7}
                >
                  <Ionicons name="arrow-back" size={24} color={themeColors.textPrimary} />
                </TouchableOpacity>
              )}
              <Text style={localStyles.headerTitle}>
                {step === 'country' && 'Select Country'}
                {step === 'province' && 'Select Region'}
                {step === 'city' && 'Enter City'}
              </Text>
            </View>
            <TouchableOpacity
              onPress={handleCancel}
              style={localStyles.headerButton}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={24} color={themeColors.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* Breadcrumb */}
          {renderBreadcrumb()}

          {/* Search (for country and province) */}
          {(step === 'country' || step === 'province') && (
            <View style={localStyles.searchContainer}>
              <TextInput
                style={localStyles.searchInput}
                placeholder={`Search ${step === 'country' ? 'countries' : 'regions'}...`}
                placeholderTextColor={themeColors.textSecondary}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCapitalize="words"
              />
            </View>
          )}

          {/* Content */}
          {step === 'city' ? (
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={localStyles.scrollView}
              keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
            >
              <ScrollView
                contentContainerStyle={localStyles.scrollViewContent}
                showsVerticalScrollIndicator={false}
              >
                {selectedCountry && (
                  <View style={localStyles.selectedInfo}>
                    <Text style={localStyles.selectedInfoTitle}>Location</Text>
                    <Text style={localStyles.selectedInfoText}>
                      {COUNTRIES[selectedCountry]?.emoji} {COUNTRIES[selectedCountry]?.name}
                      {selectedProvince && `, ${selectedProvince}`}
                    </Text>
                  </View>
                )}
                <View style={localStyles.cityInputContainer}>
                  <Text style={localStyles.label}>City</Text>
                  <TextInput
                    style={localStyles.cityInput}
                    placeholder="Enter your city..."
                    placeholderTextColor={themeColors.textSecondary}
                    value={selectedCity}
                    onChangeText={setSelectedCity}
                    autoCapitalize="words"
                    maxLength={50}
                    autoFocus
                  />
                  <Text style={localStyles.hint}>
                    This helps neighbors find you and improves local recommendations
                  </Text>
                </View>
              </ScrollView>
            </KeyboardAvoidingView>
          ) : (
            <ScrollView
              style={localStyles.scrollView}
              contentContainerStyle={localStyles.scrollViewContent}
              showsVerticalScrollIndicator={false}
            >
            {/* Country Selection */}
            {step === 'country' && (
              <>
                {filteredCountries.map(([code, data]) => (
                  <TouchableOpacity
                    key={code}
                    style={[
                      localStyles.listItem,
                      selectedCountry === code && localStyles.listItemSelected,
                    ]}
                    onPress={() => handleCountrySelect(code)}
                    activeOpacity={0.7}
                  >
                    <Text style={localStyles.listItemEmoji}>{data.emoji}</Text>
                    <Text
                      style={[
                        localStyles.listItemText,
                        selectedCountry === code && localStyles.listItemTextSelected,
                      ]}
                    >
                      {data.name}
                    </Text>
                    {selectedCountry === code && (
                      <Ionicons name="checkmark-circle" size={22} color={primaryColor} />
                    )}
                  </TouchableOpacity>
                ))}
                {filteredCountries.length === 0 && (
                  <View style={localStyles.emptyState}>
                    <Ionicons name="search-outline" size={48} color={themeColors.textSecondary} />
                    <Text style={localStyles.emptyText}>
                      No countries found matching "{searchQuery}"
                    </Text>
                  </View>
                )}
              </>
            )}

            {/* Province Selection */}
            {step === 'province' && (
              <>
                {selectedCountry && (
                  <View style={localStyles.selectedInfo}>
                    <Text style={localStyles.selectedInfoTitle}>Selected Country</Text>
                    <Text style={localStyles.selectedInfoText}>
                      {COUNTRIES[selectedCountry]?.emoji} {COUNTRIES[selectedCountry]?.name}
                    </Text>
                  </View>
                )}
                {filteredProvinces.map((province) => (
                  <TouchableOpacity
                    key={province}
                    style={[
                      localStyles.listItem,
                      selectedProvince === province && localStyles.listItemSelected,
                    ]}
                    onPress={() => handleProvinceSelect(province)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        localStyles.listItemText,
                        selectedProvince === province && localStyles.listItemTextSelected,
                      ]}
                    >
                      {province}
                    </Text>
                    {selectedProvince === province && (
                      <Ionicons name="checkmark-circle" size={22} color={primaryColor} />
                    )}
                  </TouchableOpacity>
                ))}
                {filteredProvinces.length === 0 && availableProvinces.length > 0 && (
                  <View style={localStyles.emptyState}>
                    <Ionicons name="search-outline" size={48} color={themeColors.textSecondary} />
                    <Text style={localStyles.emptyText}>
                      No regions found matching "{searchQuery}"
                    </Text>
                  </View>
                )}
              </>
            )}
          </ScrollView>
          )}

          {/* Footer */}
          <View style={localStyles.footer}>
            {step !== 'country' && (
              <TouchableOpacity
                style={[
                  localStyles.footerButton,
                  {
                    backgroundColor: 'transparent',
                    borderWidth: 1.5,
                    borderColor: themeColors.divider,
                  },
                ]}
                onPress={handleSkip}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    localStyles.footerButtonText,
                    { color: themeColors.textSecondary },
                  ]}
                >
                  Skip
                </Text>
              </TouchableOpacity>
            )}
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
                {step === 'city' ? 'Save Location' : 'Continue'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
