/**
 * Pronouns Picker Component
 * Simple modal for selecting pronouns
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSettings } from '../contexts/SettingsContext';
import { PRONOUNS_OPTIONS } from '../constants/profileConstants';

export default function PronounsPicker({
  visible,
  onClose,
  selectedPronouns = '',
  onSelect,
}) {
  const { themeColors, accentPreset } = useSettings();
  const [localSelection, setLocalSelection] = useState(selectedPronouns);

  const primaryColor = accentPreset?.buttonBackground || themeColors.primary;

  const handleSelect = (value) => {
    setLocalSelection(value);
  };

  const handleSave = () => {
    onSelect(localSelection);
    onClose();
  };

  const handleCancel = () => {
    setLocalSelection(selectedPronouns); // Reset to original
    onClose();
  };

  const localStyles = StyleSheet.create({
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 20,
    },
    modalContainer: {
      backgroundColor: themeColors.card,
      borderRadius: 20,
      width: '100%',
      maxWidth: 400,
      overflow: 'hidden',
    },
    header: {
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: themeColors.divider,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: themeColors.textPrimary,
      textAlign: 'center',
    },
    headerSubtitle: {
      fontSize: 13,
      color: themeColors.textSecondary,
      textAlign: 'center',
      marginTop: 4,
    },
    optionsContainer: {
      paddingVertical: 8,
    },
    option: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: themeColors.divider,
    },
    optionLast: {
      borderBottomWidth: 0,
    },
    optionText: {
      fontSize: 16,
      color: themeColors.textPrimary,
      flex: 1,
    },
    optionTextSelected: {
      fontWeight: '600',
    },
    checkIcon: {
      marginLeft: 12,
    },
    footer: {
      flexDirection: 'row',
      gap: 12,
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderTopWidth: 1,
      borderTopColor: themeColors.divider,
    },
    footerButton: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    footerButtonText: {
      fontSize: 16,
      fontWeight: '600',
    },
  });

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={handleCancel}
    >
      <View style={localStyles.modalOverlay}>
        <View style={localStyles.modalContainer}>
          {/* Header */}
          <View style={localStyles.header}>
            <Text style={localStyles.headerTitle}>Select Pronouns</Text>
            <Text style={localStyles.headerSubtitle}>
              Choose how you'd like others to refer to you
            </Text>
          </View>

          {/* Options */}
          <View style={localStyles.optionsContainer}>
            {PRONOUNS_OPTIONS.map((option, index) => {
              const isSelected = localSelection === option.value;
              const isLast = index === PRONOUNS_OPTIONS.length - 1;

              return (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    localStyles.option,
                    isLast && localStyles.optionLast,
                  ]}
                  onPress={() => handleSelect(option.value)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      localStyles.optionText,
                      isSelected && localStyles.optionTextSelected,
                      isSelected && { color: primaryColor },
                    ]}
                  >
                    {option.label}
                  </Text>
                  {isSelected && (
                    <Ionicons
                      name="checkmark-circle"
                      size={22}
                      color={primaryColor}
                      style={localStyles.checkIcon}
                    />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

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
                Save
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
