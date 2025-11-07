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
  TextInput,
  KeyboardAvoidingView,
  Platform,
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
  isAdmin = false,
}) {
  const { themeColors, accentPreset } = useSettings();
  const [selectedStyle, setSelectedStyle] = useState(null);
  const [customPrompt, setCustomPrompt] = useState('');
  const [useCustomPrompt, setUseCustomPrompt] = useState(false);
  const primaryColor = accentPreset?.buttonBackground || themeColors.primary;

  const subscriptionPlan = userProfile?.subscriptionPlan || 'basic';
  const isGoldUser = subscriptionPlan === 'gold' || isAdmin; // Admin has Gold features

  const { canGenerate, reason } = canGenerateCartoon(
    userProfile,
    usageData?.monthlyUsage || 0,
    usageData?.lifetimeUsage || 0,
    isAdmin
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
    setUseCustomPrompt(false); // Deselect custom prompt when selecting a style
  };

  const handleToggleCustomPrompt = () => {
    if (!isGoldUser || !canGenerate) return;
    setUseCustomPrompt(!useCustomPrompt);
    if (!useCustomPrompt) {
      setSelectedStyle(null); // Clear style selection when using custom prompt
    }
  };

  const handleGenerate = () => {
    if (!canGenerate) return;

    if (useCustomPrompt && customPrompt.trim()) {
      // Send custom prompt for Gold users
      onStyleSelect('custom', customPrompt.trim());
    } else if (selectedStyle) {
      // Send predefined style
      onStyleSelect(selectedStyle);
    }
  };

  const canProceed = canGenerate && ((useCustomPrompt && customPrompt.trim().length > 0) || (!useCustomPrompt && selectedStyle));

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
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
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

          {/* Gold Custom Prompt Option */}
          {isGoldUser && (
            <View style={[localStyles.customPromptSection, { paddingHorizontal: 20, paddingBottom: 8 }]}>
              <TouchableOpacity
                style={[
                  localStyles.customPromptToggle,
                  {
                    backgroundColor: useCustomPrompt ? `${primaryColor}15` : themeColors.background,
                    borderColor: useCustomPrompt ? primaryColor : themeColors.divider,
                    borderWidth: useCustomPrompt ? 2 : 1,
                  },
                ]}
                onPress={handleToggleCustomPrompt}
                disabled={!canGenerate || isGenerating}
                activeOpacity={0.7}
              >
                <View style={localStyles.customPromptHeader}>
                  <Ionicons name="create" size={20} color={primaryColor} />
                  <Text style={[localStyles.customPromptTitle, { color: themeColors.textPrimary }]}>
                    Custom Request (Gold Exclusive)
                  </Text>
                  {useCustomPrompt && (
                    <View style={[localStyles.selectedBadge, { backgroundColor: primaryColor }]}>
                      <Ionicons name="checkmark" size={16} color="#fff" />
                    </View>
                  )}
                </View>
                <Text style={[localStyles.customPromptDesc, { color: themeColors.textSecondary }]}>
                  Describe your own cartoon style
                </Text>
              </TouchableOpacity>

              {useCustomPrompt && (
                <TextInput
                  style={[
                    localStyles.customPromptInput,
                    {
                      backgroundColor: themeColors.background,
                      borderColor: themeColors.divider,
                      color: themeColors.textPrimary,
                    },
                  ]}
                  placeholder="E.g., 'Make me look like a superhero in a cyberpunk city, neon colors and futuristic style'"
                  placeholderTextColor={themeColors.textSecondary}
                  value={customPrompt}
                  onChangeText={setCustomPrompt}
                  multiline
                  numberOfLines={3}
                  maxLength={300}
                  editable={!isGenerating}
                  textAlignVertical="top"
                />
              )}

              {useCustomPrompt && (
                <Text style={[localStyles.charCount, { color: themeColors.textSecondary }]}>
                  {customPrompt.length}/300 characters
                </Text>
              )}
            </View>
          )}

          {/* Style Options */}
          <ScrollView
            style={localStyles.scrollView}
            contentContainerStyle={localStyles.stylesContainer}
            showsVerticalScrollIndicator={false}
          >
            {!useCustomPrompt && styles.map((style) => {
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

            {useCustomPrompt && (
              <View style={[localStyles.customPromptPlaceholder, { backgroundColor: themeColors.background }]}>
                <Ionicons name="brush" size={40} color={primaryColor} style={{ opacity: 0.3 }} />
                <Text style={[localStyles.placeholderText, { color: themeColors.textSecondary }]}>
                  Describe your custom cartoon style above
                </Text>
              </View>
            )}
          </ScrollView>

          {/* Generate Button */}
          <View style={[localStyles.footer, { borderTopColor: themeColors.divider }]}>
            <TouchableOpacity
              style={[
                localStyles.generateButton,
                {
                  backgroundColor: canProceed ? primaryColor : themeColors.divider,
                },
              ]}
              onPress={handleGenerate}
              disabled={!canProceed || isGenerating}
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
                  <Text style={localStyles.generateButtonText}>
                    {useCustomPrompt ? 'Generate Custom Avatar' : 'Generate Cartoon'}
                  </Text>
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
      </KeyboardAvoidingView>
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
  customPromptSection: {
    marginBottom: 8,
  },
  customPromptToggle: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  customPromptHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  customPromptTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  customPromptDesc: {
    fontSize: 13,
    marginLeft: 28,
  },
  customPromptInput: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    fontSize: 15,
    minHeight: 100,
    marginTop: 8,
  },
  charCount: {
    fontSize: 12,
    textAlign: 'right',
    marginTop: 6,
    fontStyle: 'italic',
  },
  customPromptPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 60,
    borderRadius: 12,
    marginVertical: 20,
  },
  placeholderText: {
    fontSize: 14,
    marginTop: 12,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
