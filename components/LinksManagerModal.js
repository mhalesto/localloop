/**
 * Links Manager Modal
 * Allows users to add and manage up to 5 links (social media, website, etc.)
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
  Alert,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSettings } from '../contexts/SettingsContext';
import { LINK_TYPES } from '../constants/profileConstants';

// MVP: Limit to 1 link for now
const MAX_LINKS = 1;

export default function LinksManagerModal({
  visible,
  onClose,
  links = [],
  onSave,
}) {
  const { themeColors, accentPreset } = useSettings();
  const [localLinks, setLocalLinks] = useState(links);
  const [showAddLink, setShowAddLink] = useState(false);
  const [newLinkType, setNewLinkType] = useState('website');
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [newLinkLabel, setNewLinkLabel] = useState('');

  // Sync local state when modal opens or links prop changes
  useEffect(() => {
    if (visible) {
      console.log('[LinksManagerModal] Modal opened, syncing links:', links);
      setLocalLinks(links);
      setShowAddLink(false);
      setNewLinkUrl('');
      setNewLinkLabel('');
      setNewLinkType('website');
    }
  }, [visible, links]);

  const primaryColor = accentPreset?.buttonBackground || themeColors.primary;

  const validateUrl = (url) => {
    // Basic URL validation
    const urlPattern = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/;
    return urlPattern.test(url);
  };

  const handleAddLink = () => {
    if (!newLinkUrl.trim()) {
      Alert.alert('Error', 'Please enter a URL');
      return;
    }

    if (!validateUrl(newLinkUrl)) {
      Alert.alert('Error', 'Please enter a valid URL (e.g., https://example.com)');
      return;
    }

    if (localLinks.length >= MAX_LINKS) {
      Alert.alert('Limit Reached', `You can add up to ${MAX_LINKS} link${MAX_LINKS > 1 ? 's' : ''}`);
      return;
    }

    // Add https:// if not present
    let finalUrl = newLinkUrl.trim();
    if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
      finalUrl = 'https://' + finalUrl;
    }

    const linkType = LINK_TYPES.find((type) => type.id === newLinkType);
    const newLink = {
      id: Date.now().toString(),
      type: newLinkType,
      url: finalUrl,
      label: newLinkLabel.trim() || linkType.label,
    };

    setLocalLinks([...localLinks, newLink]);
    setShowAddLink(false);
    setNewLinkUrl('');
    setNewLinkLabel('');
    setNewLinkType('website');
  };

  const handleRemoveLink = (linkId) => {
    Alert.alert(
      'Remove Link',
      'Are you sure you want to remove this link?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            setLocalLinks(localLinks.filter((link) => link.id !== linkId));
          },
        },
      ]
    );
  };

  const handleSave = () => {
    onSave(localLinks);
    onClose();
  };

  const handleCancel = () => {
    setLocalLinks(links); // Reset to original
    setShowAddLink(false);
    setNewLinkUrl('');
    setNewLinkLabel('');
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
    closeButton: {
      padding: 8,
    },
    contentContainer: {
      paddingHorizontal: 20,
      paddingVertical: 16,
    },
    linkCountContainer: {
      paddingHorizontal: 20,
      paddingVertical: 8,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    linkCount: {
      fontSize: 13,
      fontWeight: '600',
      color: themeColors.textSecondary,
    },
    linkItem: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: themeColors.background,
      borderRadius: 12,
      padding: 12,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: themeColors.divider,
    },
    linkIconContainer: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    linkInfo: {
      flex: 1,
    },
    linkLabel: {
      fontSize: 15,
      fontWeight: '600',
      color: themeColors.textPrimary,
      marginBottom: 2,
    },
    linkUrl: {
      fontSize: 13,
      color: themeColors.textSecondary,
    },
    linkActions: {
      flexDirection: 'row',
      gap: 8,
    },
    linkActionButton: {
      padding: 8,
    },
    addLinkButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 14,
      borderRadius: 12,
      borderWidth: 1.5,
      borderStyle: 'dashed',
      borderColor: themeColors.divider,
      marginBottom: 16,
    },
    addLinkButtonText: {
      fontSize: 15,
      fontWeight: '600',
      color: themeColors.textSecondary,
    },
    addLinkForm: {
      backgroundColor: themeColors.background,
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: primaryColor,
    },
    formLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: themeColors.textSecondary,
      marginBottom: 8,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    linkTypeSelector: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 16,
    },
    linkTypeButton: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: themeColors.divider,
      backgroundColor: themeColors.card,
    },
    linkTypeButtonSelected: {
      borderColor: primaryColor,
      backgroundColor: primaryColor,
    },
    linkTypeButtonText: {
      fontSize: 13,
      fontWeight: '600',
      color: themeColors.textPrimary,
    },
    linkTypeButtonTextSelected: {
      color: '#fff',
    },
    input: {
      backgroundColor: themeColors.card,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 15,
      color: themeColors.textPrimary,
      borderWidth: 1,
      borderColor: themeColors.divider,
      marginBottom: 12,
    },
    inputHint: {
      fontSize: 12,
      color: themeColors.textSecondary,
      marginTop: -8,
      marginBottom: 12,
    },
    formActions: {
      flexDirection: 'row',
      gap: 8,
    },
    formButton: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    formButtonText: {
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
      textAlign: 'center',
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
            <Text style={localStyles.headerTitle}>Manage Links</Text>
            <TouchableOpacity
              onPress={handleCancel}
              style={localStyles.closeButton}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={24} color={themeColors.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* Link Count */}
          <View style={localStyles.linkCountContainer}>
            <Ionicons
              name="link"
              size={16}
              color={localLinks.length >= MAX_LINKS ? '#FF3B30' : primaryColor}
            />
            <Text style={localStyles.linkCount}>
              {localLinks.length}/{MAX_LINKS} link{MAX_LINKS > 1 ? 's' : ''}
              {localLinks.length >= MAX_LINKS && ' (Max reached)'}
            </Text>
          </View>

          {/* Links List */}
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={localStyles.contentContainer}
            showsVerticalScrollIndicator={false}
          >
            {/* Add Link Form */}
            {showAddLink && (
              <View style={localStyles.addLinkForm}>
                <Text style={localStyles.formLabel}>Link Type</Text>
                <View style={localStyles.linkTypeSelector}>
                  {LINK_TYPES.map((type) => {
                    const isSelected = newLinkType === type.id;
                    return (
                      <TouchableOpacity
                        key={type.id}
                        style={[
                          localStyles.linkTypeButton,
                          isSelected && localStyles.linkTypeButtonSelected,
                        ]}
                        onPress={() => setNewLinkType(type.id)}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            localStyles.linkTypeButtonText,
                            isSelected && localStyles.linkTypeButtonTextSelected,
                          ]}
                        >
                          {type.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <Text style={localStyles.formLabel}>URL</Text>
                <TextInput
                  style={localStyles.input}
                  placeholder="https://example.com"
                  placeholderTextColor={themeColors.textSecondary}
                  value={newLinkUrl}
                  onChangeText={setNewLinkUrl}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                />

                <Text style={localStyles.formLabel}>Custom Label (Optional)</Text>
                <TextInput
                  style={localStyles.input}
                  placeholder="My Website"
                  placeholderTextColor={themeColors.textSecondary}
                  value={newLinkLabel}
                  onChangeText={setNewLinkLabel}
                  autoCapitalize="words"
                  maxLength={30}
                />
                <Text style={localStyles.inputHint}>
                  Leave blank to use default label
                </Text>

                <View style={localStyles.formActions}>
                  <TouchableOpacity
                    style={[
                      localStyles.formButton,
                      {
                        backgroundColor: 'transparent',
                        borderWidth: 1,
                        borderColor: themeColors.divider,
                      },
                    ]}
                    onPress={() => {
                      setShowAddLink(false);
                      setNewLinkUrl('');
                      setNewLinkLabel('');
                    }}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        localStyles.formButtonText,
                        { color: themeColors.textSecondary },
                      ]}
                    >
                      Cancel
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      localStyles.formButton,
                      { backgroundColor: primaryColor },
                    ]}
                    onPress={handleAddLink}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        localStyles.formButtonText,
                        { color: '#fff' },
                      ]}
                    >
                      Add Link
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Existing Links */}
            {localLinks.map((link) => {
              const linkType = LINK_TYPES.find((type) => type.id === link.type);
              return (
                <View key={link.id} style={localStyles.linkItem}>
                  <View
                    style={[
                      localStyles.linkIconContainer,
                      { backgroundColor: linkType?.color + '20' },
                    ]}
                  >
                    <Ionicons
                      name={linkType?.icon || 'link'}
                      size={20}
                      color={linkType?.color || themeColors.textPrimary}
                    />
                  </View>
                  <View style={localStyles.linkInfo}>
                    <Text style={localStyles.linkLabel} numberOfLines={1}>
                      {link.label}
                    </Text>
                    <Text style={localStyles.linkUrl} numberOfLines={1}>
                      {link.url}
                    </Text>
                  </View>
                  <View style={localStyles.linkActions}>
                    <TouchableOpacity
                      style={localStyles.linkActionButton}
                      onPress={() => Linking.openURL(link.url)}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name="open-outline"
                        size={20}
                        color={themeColors.textSecondary}
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={localStyles.linkActionButton}
                      onPress={() => handleRemoveLink(link.id)}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name="trash-outline"
                        size={20}
                        color="#FF3B30"
                      />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}

            {/* Add Link Button */}
            {!showAddLink && localLinks.length < MAX_LINKS && (
              <TouchableOpacity
                style={localStyles.addLinkButton}
                onPress={() => setShowAddLink(true)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="add-circle-outline"
                  size={20}
                  color={themeColors.textSecondary}
                />
                <Text style={localStyles.addLinkButtonText}>Add Link</Text>
              </TouchableOpacity>
            )}

            {/* Empty State */}
            {localLinks.length === 0 && !showAddLink && (
              <View style={localStyles.emptyState}>
                <Ionicons name="link-outline" size={48} color={themeColors.textSecondary} />
                <Text style={localStyles.emptyText}>
                  No links added yet.{'\n'}Add your website or social media profiles.
                </Text>
              </View>
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
                Save Links
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
