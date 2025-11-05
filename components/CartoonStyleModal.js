/**
 * Cartoon Style Selection Modal
 * Allows users to choose a cartoon style for profile picture generation
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSettings } from '../contexts/SettingsContext';
import { CARTOON_STYLES, canGenerateCartoon, getUsageStatsText } from '../services/openai/profileCartoonService';

export default function CartoonStyleModal({
  visible,
  onClose,
  onStyleSelect,
  userProfile,
  usageData,
  isGenerating = false,
}) {
  const { themeColors, accentPreset } = useSettings();
  const [selectedStyle, setSelectedStyle] = useState(null);
  const primaryColor = accentPreset?.buttonBackground || themeColors.primary;

  const subscriptionPlan = userProfile?.subscriptionPlan || 'basic';
  const { canGenerate, reason } = canGenerateCartoon(
    userProfile,
    usageData?.monthlyUsage || 0,
    usageData?.lifetimeUsage || 0
  );

  const usageText = getUsageStatsText(
    subscriptionPlan,
    usageData?.monthlyUsage || 0,
    usageData?.lifetimeUsage || 0
  );

  const styles = Object.values(CARTOON_STYLES);

  const handleStyleSelect = (styleId) => {
    if (!canGenerate) return;
    setSelectedStyle(styleId);
  };

  const handleGenerate = () => {
    if (selectedStyle && canGenerate) {
      onStyleSelect(selectedStyle);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={() => {
        // Don't allow closing while generating
        if (!isGenerating) {
          onClose();
        }
      }}
    >
      <View style={localStyles.modalOverlay}>
        <View style={[localStyles.modalContent, { backgroundColor: themeColors.card }]}>
          {/* Header */}
          <View style={localStyles.header}>
            <View style={localStyles.headerTop}>
              <Text style={[localStyles.title, { color: themeColors.textPrimary }]}>
                Choose Cartoon Style
              </Text>
              <TouchableOpacity onPress={onClose} disabled={isGenerating}>
                <Ionicons
                  name="close"
                  size={28}
                  color={themeColors.textSecondary}
                  style={{ opacity: isGenerating ? 0.5 : 1 }}
                />
              </TouchableOpacity>
            </View>

            {/* Usage Stats */}
            <View style={[localStyles.usageBanner, { backgroundColor: `${primaryColor}15` }]}>
              <Ionicons name="sparkles" size={16} color={primaryColor} />
              <Text style={[localStyles.usageText, { color: themeColors.textSecondary }]}>
                {usageText}
              </Text>
            </View>

            {!canGenerate && (
              <View style={[localStyles.warningBanner, { backgroundColor: '#FF950015' }]}>
                <Ionicons name="information-circle" size={16} color="#FF9500" />
                <Text style={[localStyles.warningText, { color: '#FF9500' }]}>
                  {reason}
                </Text>
              </View>
            )}
          </View>

          {/* Style Options */}
          <ScrollView
            style={localStyles.scrollView}
            contentContainerStyle={localStyles.stylesContainer}
            showsVerticalScrollIndicator={false}
          >
            {styles.map((style) => {
              const isSelected = selectedStyle === style.id;
              return (
                <TouchableOpacity
                  key={style.id}
                  style={[
                    localStyles.styleCard,
                    {
                      backgroundColor: themeColors.background,
                      borderColor: isSelected ? primaryColor : themeColors.divider,
                      borderWidth: isSelected ? 2 : 1,
                      opacity: canGenerate ? 1 : 0.5,
                    },
                  ]}
                  onPress={() => handleStyleSelect(style.id)}
                  disabled={!canGenerate || isGenerating}
                  activeOpacity={0.7}
                >
                  {isSelected && (
                    <View style={[localStyles.selectedBadge, { backgroundColor: primaryColor }]}>
                      <Ionicons name="checkmark" size={16} color="#fff" />
                    </View>
                  )}

                  <Text style={[localStyles.styleName, { color: themeColors.textPrimary }]}>
                    {style.name}
                  </Text>
                  <Text style={[localStyles.styleDescription, { color: themeColors.textSecondary }]}>
                    {style.description}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Generate Button */}
          <View style={[localStyles.footer, { borderTopColor: themeColors.divider }]}>
            <TouchableOpacity
              style={[
                localStyles.generateButton,
                {
                  backgroundColor: selectedStyle && canGenerate ? primaryColor : themeColors.divider,
                },
              ]}
              onPress={handleGenerate}
              disabled={!selectedStyle || !canGenerate || isGenerating}
              activeOpacity={0.8}
            >
              {isGenerating ? (
                <>
                  <ActivityIndicator color="#fff" />
                  <Text style={[localStyles.generateButtonText, { marginLeft: 8 }]}>Generating...</Text>
                </>
              ) : (
                <>
                  <Ionicons name="color-wand" size={20} color="#fff" />
                  <Text style={localStyles.generateButtonText}>Generate Cartoon</Text>
                </>
              )}
            </TouchableOpacity>
            {isGenerating && (
              <Text style={[localStyles.generatingHint, { color: themeColors.textSecondary }]}>
                This may take 10-20 seconds. Please wait...
              </Text>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const localStyles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingBottom: 34,
  },
  header: {
    padding: 20,
    paddingBottom: 12,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
  },
  usageBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  usageText: {
    fontSize: 13,
    fontWeight: '600',
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  warningText: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  scrollView: {
    maxHeight: 450,
  },
  stylesContainer: {
    padding: 20,
    paddingTop: 8,
    gap: 12,
  },
  styleCard: {
    borderRadius: 12,
    padding: 16,
    position: 'relative',
  },
  selectedBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  styleName: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 6,
  },
  styleDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  footer: {
    padding: 20,
    paddingTop: 16,
    borderTopWidth: 1,
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    borderRadius: 12,
  },
  generateButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
  generatingHint: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 12,
    fontStyle: 'italic',
  },
});
