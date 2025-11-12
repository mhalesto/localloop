/**
 * Cartoon Style Selection Modal
 * Allows users to choose a cartoon style for profile picture generation
 */

import React, { useState, useEffect } from 'react';
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
  Alert,
  Switch,
  Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useSettings } from '../contexts/SettingsContext';
import { CARTOON_STYLES, canGenerateCartoon, getUsageStatsText } from '../services/openai/profileCartoonService';
import { requestNotificationPermission, areNotificationsEnabled } from '../services/notificationService';

export default function CartoonStyleModal({
  visible,
  onClose,
  onStyleSelect,
  userProfile,
  usageData,
  isGenerating = false,
  isAdmin = false,
  navigation,
}) {
  const { themeColors, accentPreset } = useSettings();
  const [selectedStyle, setSelectedStyle] = useState(null);
  const [customPrompt, setCustomPrompt] = useState('');
  const [useCustomPrompt, setUseCustomPrompt] = useState(false);
  const [selectedModel, setSelectedModel] = useState('gpt-3.5-turbo'); // GPT-3.5 or GPT-4
  const [notifyWhenDone, setNotifyWhenDone] = useState(false);
  const [hasNotificationPermission, setHasNotificationPermission] = useState(false);
  const [customImage, setCustomImage] = useState(null); // Gold feature: upload custom image
  const [useCustomImage, setUseCustomImage] = useState(false); // Toggle for using custom image vs profile pic
  const [ignoreProfilePicture, setIgnoreProfilePicture] = useState(false); // Gold feature: generate without profile pic
  const primaryColor = accentPreset?.buttonBackground || themeColors.primary;

  // Check notification permissions on mount
  useEffect(() => {
    checkNotificationPermissions();
  }, []);

  const checkNotificationPermissions = async () => {
    const enabled = await areNotificationsEnabled();
    setHasNotificationPermission(enabled);
    if (!enabled) {
      setNotifyWhenDone(false);
    }
  };

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

  const handleNotificationToggle = async (value) => {
    if (value && !hasNotificationPermission) {
      // Request permission
      const granted = await requestNotificationPermission();
      if (granted) {
        setHasNotificationPermission(true);
        setNotifyWhenDone(true);
      } else {
        Alert.alert(
          'Permission Denied',
          'Please enable notifications in your device settings to be notified when your cartoon is ready.',
          [{ text: 'OK' }]
        );
      }
    } else {
      setNotifyWhenDone(value);
    }
  };

  const handlePickImage = async () => {
    try {
      // Request permission
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Denied',
          'Please enable photo library access in your device settings to upload a custom image.',
          [{ text: 'OK' }]
        );
        return;
      }

      // Pick image
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setCustomImage(result.assets[0]);
        setUseCustomImage(true);
      }
    } catch (error) {
      console.error('[CartoonStyleModal] Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.', [{ text: 'OK' }]);
    }
  };

  const handleRemoveCustomImage = () => {
    setCustomImage(null);
    setUseCustomImage(false);
  };

  const handleGenerate = () => {
    if (!canGenerate) return;

    const generationOptions = {
      model: isGoldUser ? selectedModel : 'gpt-3.5-turbo',
      notifyWhenDone,
      customImage: useCustomImage && customImage ? customImage : null,
      ignoreProfilePicture: isGoldUser ? ignoreProfilePicture : false,
    };

    if (useCustomPrompt && customPrompt.trim()) {
      // Send custom prompt for Gold users
      onStyleSelect('custom', customPrompt.trim(), generationOptions);
    } else if (selectedStyle) {
      // Send predefined style
      onStyleSelect(selectedStyle, null, generationOptions);
    }
  };

  const hasSourceImage =
    Boolean(
      (useCustomImage && customImage) ||
      userProfile?.profilePhoto ||
      (isGoldUser && ignoreProfilePicture)
    );

  const needsSourceImage = !hasSourceImage;

  const canProceed =
    canGenerate &&
    !needsSourceImage &&
    (
      (useCustomPrompt && customPrompt.trim().length > 0) ||
      (!useCustomPrompt && selectedStyle)
    );

  const isGenerateDisabled = !canProceed || isGenerating;

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
                <TouchableOpacity
                  style={[localStyles.warningBanner, { backgroundColor: '#FF950015' }]}
                  onPress={() => {
                    onClose();
                    navigation?.navigate('Subscription');
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="information-circle" size={16} color="#FF9500" />
                  <Text style={[localStyles.warningText, { color: '#FF9500' }]}>
                    {reason}
                  </Text>
                  <Ionicons name="arrow-forward" size={16} color="#FF9500" style={{ marginLeft: 8 }} />
                </TouchableOpacity>
              )}
            </View>

          {/* Scrollable Content */}
          <ScrollView
            style={localStyles.scrollView}
            contentContainerStyle={localStyles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
          >
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

              {/* Custom Image Upload for Gold Users */}
              {useCustomPrompt && (
                <View style={localStyles.customImageSection}>
                  <View style={localStyles.customImageHeader}>
                    <Text style={[localStyles.customImageLabel, { color: themeColors.textPrimary }]}>
                      Upload Custom Image (Optional)
                    </Text>
                    <Text style={[localStyles.customImageHint, { color: themeColors.textSecondary }]}>
                      Use a different photo instead of your profile picture
                    </Text>
                  </View>

                  {!customImage ? (
                    <TouchableOpacity
                      style={[localStyles.imagePickerButton, {
                        backgroundColor: themeColors.background,
                        borderColor: themeColors.divider,
                      }]}
                      onPress={handlePickImage}
                      disabled={isGenerating}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="image-outline" size={32} color={themeColors.textSecondary} />
                      <Text style={[localStyles.imagePickerText, { color: themeColors.textSecondary }]}>
                        Tap to upload image
                      </Text>
                    </TouchableOpacity>
                  ) : (
                    <View style={localStyles.imagePreviewContainer}>
                      <Image
                        source={{ uri: customImage.uri }}
                        style={localStyles.imagePreview}
                        resizeMode="cover"
                      />
                      <TouchableOpacity
                        style={[localStyles.removeImageButton, { backgroundColor: '#FF3B30' }]}
                        onPress={handleRemoveCustomImage}
                        disabled={isGenerating}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="trash-outline" size={16} color="#fff" />
                        <Text style={localStyles.removeImageText}>Remove</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              )}
            </View>
          )}

          {/* GPT Model Selection for Gold Users */}
          {isGoldUser && (
            <View style={[localStyles.modelSection, { paddingHorizontal: 20, paddingBottom: 16 }]}>
              <Text style={[localStyles.sectionLabel, { color: themeColors.textSecondary }]}>
                AI Model (Gold Exclusive)
              </Text>
              <View style={localStyles.modelButtons}>
                <TouchableOpacity
                  style={[
                    localStyles.modelButton,
                    {
                      backgroundColor: selectedModel === 'gpt-3.5-turbo' ? primaryColor : themeColors.background,
                      borderColor: selectedModel === 'gpt-3.5-turbo' ? primaryColor : themeColors.divider,
                    },
                  ]}
                  onPress={() => setSelectedModel('gpt-3.5-turbo')}
                  disabled={isGenerating}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      localStyles.modelButtonText,
                      {
                        color: selectedModel === 'gpt-3.5-turbo' ? '#fff' : themeColors.textPrimary,
                      },
                    ]}
                  >
                    GPT-3.5
                  </Text>
                  <Text
                    style={[
                      localStyles.modelButtonSubtext,
                      {
                        color: selectedModel === 'gpt-3.5-turbo' ? '#fff' : themeColors.textSecondary,
                      },
                    ]}
                  >
                    Fast
                  </Text>
                  <Text
                    style={[
                      localStyles.modelButtonUsage,
                      {
                        color: selectedModel === 'gpt-3.5-turbo' ? 'rgba(255,255,255,0.8)' : themeColors.textSecondary,
                      },
                    ]}
                  >
                    {20 - (usageData?.monthlyUsage || 0)} left
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    localStyles.modelButton,
                    {
                      backgroundColor: selectedModel === 'gpt-4' ? primaryColor : themeColors.background,
                      borderColor: selectedModel === 'gpt-4' ? primaryColor : themeColors.divider,
                    },
                  ]}
                  onPress={() => setSelectedModel('gpt-4')}
                  disabled={isGenerating}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      localStyles.modelButtonText,
                      {
                        color: selectedModel === 'gpt-4' ? '#fff' : themeColors.textPrimary,
                      },
                    ]}
                  >
                    GPT-4
                  </Text>
                  <Text
                    style={[
                      localStyles.modelButtonSubtext,
                      {
                        color: selectedModel === 'gpt-4' ? '#fff' : themeColors.textSecondary,
                      },
                    ]}
                  >
                    Best Quality
                  </Text>
                  <Text
                    style={[
                      localStyles.modelButtonUsage,
                      {
                        color: selectedModel === 'gpt-4' ? 'rgba(255,255,255,0.8)' : themeColors.textSecondary,
                      },
                    ]}
                  >
                    {usageData?.gpt4VisionUsage || 0}/5 used
                  </Text>
                </TouchableOpacity>
              </View>

              {/* GPT-4 Usage Info */}
              {selectedModel === 'gpt-4' && (
                <View style={[localStyles.gpt4UsageHint, { backgroundColor: `${primaryColor}10` }]}>
                  <Ionicons name="information-circle-outline" size={16} color={primaryColor} />
                  <Text style={[localStyles.gpt4UsageText, { color: themeColors.textSecondary }]}>
                    GPT-4 Vision: {usageData?.gpt4VisionUsage || 0}/5 used this month
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Notification Toggle */}
          <View style={[localStyles.notificationSection, { paddingHorizontal: 20, paddingBottom: 16 }]}>
            <View style={localStyles.notificationToggle}>
              <View style={localStyles.notificationTextContainer}>
                <Ionicons name="notifications-outline" size={20} color={themeColors.textPrimary} />
                <Text style={[localStyles.notificationLabel, { color: themeColors.textPrimary }]}>
                  Notify me when done
                </Text>
              </View>
              <Switch
                value={notifyWhenDone}
                onValueChange={handleNotificationToggle}
                trackColor={{ false: themeColors.divider, true: `${primaryColor}80` }}
                thumbColor={notifyWhenDone ? primaryColor : '#f4f3f4'}
                disabled={isGenerating}
              />
            </View>
            {notifyWhenDone && (
              <Text style={[localStyles.notificationHint, { color: themeColors.textSecondary }]}>
                You'll receive a notification when your cartoon is ready
              </Text>
            )}
          </View>

          {/* Ignore Profile Picture Toggle (Gold Exclusive) */}
          {isGoldUser && (
            <View style={[localStyles.notificationSection, { paddingHorizontal: 20, paddingBottom: 16, paddingTop: 0 }]}>
              <View style={localStyles.notificationToggle}>
                <View style={localStyles.notificationTextContainer}>
                  <Ionicons name="sparkles" size={20} color="#FFD700" />
                  <Text style={[localStyles.notificationLabel, { color: themeColors.textPrimary }]}>
                    Generate without profile picture
                  </Text>
                </View>
                <Switch
                  value={ignoreProfilePicture}
                  onValueChange={setIgnoreProfilePicture}
                  trackColor={{ false: themeColors.divider, true: `${primaryColor}80` }}
                  thumbColor={ignoreProfilePicture ? primaryColor : '#f4f3f4'}
                  disabled={isGenerating}
                />
              </View>
              {ignoreProfilePicture && (
                <Text style={[localStyles.notificationHint, { color: themeColors.textSecondary }]}>
                  Create anything with text or custom image only
                </Text>
              )}
            </View>
          )}

          {/* Style Options */}
          <View style={localStyles.stylesContainer}>
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
          </View>
          </ScrollView>

          {/* Generate Button */}
          <View style={[localStyles.footer, { borderTopColor: themeColors.divider }]}>
            {needsSourceImage && (
              <Text style={[localStyles.helperText, { color: themeColors.warning || '#f5a623' }]}>
                Add a profile photo or upload a custom image to generate a cartoon.
              </Text>
            )}
            {reason && !canGenerate && (
              <Text style={[localStyles.helperText, { color: themeColors.warning || '#f5a623' }]}>
                {reason}
              </Text>
            )}
            <TouchableOpacity
              style={[
                localStyles.generateButton,
                {
                  backgroundColor: isGenerateDisabled ? themeColors.divider : primaryColor,
                },
              ]}
              onPress={handleGenerate}
              disabled={isGenerateDisabled}
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
    height: '90%',
    paddingBottom: 34,
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    padding: 20,
    paddingBottom: 12,
    flexShrink: 0,
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
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
    flexGrow: 1,
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
    flexShrink: 0,
  },
  helperText: {
    fontSize: 13,
    marginBottom: 8,
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
  modelSection: {
    marginBottom: 4,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  modelButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modelButton: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 2,
    padding: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modelButtonText: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  modelButtonSubtext: {
    fontSize: 11,
    fontWeight: '500',
  },
  modelButtonUsage: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 6,
    opacity: 0.9,
  },
  gpt4UsageHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  gpt4UsageText: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  notificationSection: {
    marginBottom: 8,
  },
  notificationToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  notificationTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  notificationLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  notificationHint: {
    fontSize: 12,
    marginTop: 8,
    marginLeft: 30,
    fontStyle: 'italic',
  },
  customImageSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  customImageHeader: {
    marginBottom: 12,
  },
  customImageLabel: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  customImageHint: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  imagePickerButton: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 150,
  },
  imagePickerText: {
    fontSize: 14,
    marginTop: 12,
    fontWeight: '500',
  },
  imagePreviewContainer: {
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
  },
  imagePreview: {
    width: '100%',
    height: 200,
    borderRadius: 12,
  },
  removeImageButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  removeImageText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
});
