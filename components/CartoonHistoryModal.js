/**
 * Cartoon History Modal
 * View and manage saved cartoon profile pictures
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
  Alert,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system/legacy';
import { Ionicons } from '@expo/vector-icons';
import { useSettings } from '../contexts/SettingsContext';
import { CARTOON_STYLES } from '../services/openai/profileCartoonService';

export default function CartoonHistoryModal({
  visible,
  onClose,
  pictureHistory = [],
  currentProfilePhoto = null,
  onSetAsProfile,
  onDelete,
  onClearAll,
  isProcessing = false,
}) {
  const { themeColors, accentPreset } = useSettings();
  const [processingId, setProcessingId] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);
  const primaryColor = accentPreset?.buttonBackground || themeColors.primary;

  const handleSetAsProfile = async (pictureUrl, pictureId) => {
    setProcessingId(pictureId);
    try {
      await onSetAsProfile(pictureUrl);
    } finally {
      setProcessingId(null);
    }
  };

  const handleDelete = (picture) => {
    console.log('[CartoonHistoryModal] Delete button pressed for picture:', picture.id);
    // Just call onDelete - parent will handle confirmation and processing state
    onDelete(picture.id);
    console.log('[CartoonHistoryModal] onDelete called');
  };

  const handleClearAll = () => {
    // Just call onClearAll directly - let parent handle confirmation
    onClearAll();
  };

  const handleDownload = async (picture) => {
    setDownloadingId(picture.id);

    try {
      // Request permissions
      const { status } = await MediaLibrary.requestPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert(
          'Permission Denied',
          'Please enable photo library access in your device settings to download images.',
          [{ text: 'OK' }]
        );
        setDownloadingId(null);
        return;
      }

      // Download the image to cache
      const filename = `cartoon-${picture.style}-${Date.now()}.jpg`;
      const fileUri = `${FileSystem.cacheDirectory}${filename}`;

      console.log('[CartoonHistoryModal] Downloading image from:', picture.url);
      const downloadResult = await FileSystem.downloadAsync(picture.url, fileUri);

      if (downloadResult.status !== 200) {
        throw new Error('Failed to download image');
      }

      // Save to photo library
      const asset = await MediaLibrary.createAssetAsync(downloadResult.uri);

      // Optional: Create album and add to it
      if (Platform.OS === 'ios') {
        const album = await MediaLibrary.getAlbumAsync('LocalLoop Cartoons');
        if (album === null) {
          await MediaLibrary.createAlbumAsync('LocalLoop Cartoons', asset, false);
        } else {
          await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
        }
      }

      Alert.alert(
        'Success',
        'Cartoon saved to your photo library!',
        [{ text: 'OK' }]
      );

      console.log('[CartoonHistoryModal] Image saved successfully');
    } catch (error) {
      console.error('[CartoonHistoryModal] Error downloading image:', error);
      Alert.alert(
        'Download Failed',
        'Unable to save the image. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setDownloadingId(null);
    }
  };

  const getStyleName = (styleId) => {
    const style = Object.values(CARTOON_STYLES).find(s => s.id === styleId);
    return style?.name || styleId;
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={localStyles.modalOverlay}>
        <View style={[localStyles.modalContent, { backgroundColor: themeColors.card }]}>
          {/* Header */}
          <View style={localStyles.header}>
            <View style={localStyles.headerTop}>
              <View>
                <Text style={[localStyles.title, { color: themeColors.textPrimary }]}>
                  Cartoon History
                </Text>
                <Text style={[localStyles.subtitle, { color: themeColors.textSecondary }]}>
                  {Math.min(pictureHistory.length, 3)} of 3 saved
                </Text>
              </View>
              <TouchableOpacity onPress={onClose}>
                <Ionicons name="close" size={28} color={themeColors.textSecondary} />
              </TouchableOpacity>
            </View>

            {pictureHistory.length > 0 && (
              <TouchableOpacity
                style={[localStyles.clearAllButton, { backgroundColor: `${primaryColor}15` }]}
                onPress={handleClearAll}
                disabled={isProcessing}
              >
                <Ionicons name="trash-outline" size={16} color={primaryColor} />
                <Text style={[localStyles.clearAllText, { color: primaryColor }]}>
                  Clear All
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Picture Grid */}
          <ScrollView
            style={localStyles.scrollView}
            contentContainerStyle={localStyles.gridContainer}
            showsVerticalScrollIndicator={false}
          >
            {pictureHistory.length === 0 ? (
              <View style={localStyles.emptyState}>
                <Ionicons name="images-outline" size={64} color={themeColors.textSecondary} opacity={0.3} />
                <Text style={[localStyles.emptyText, { color: themeColors.textSecondary }]}>
                  No cartoon pictures yet
                </Text>
                <Text style={[localStyles.emptySubtext, { color: themeColors.textSecondary }]}>
                  Generate your first cartoon avatar!
                </Text>
              </View>
            ) : (
              pictureHistory.map((picture) => {
                const isCurrentProfile = picture.url === currentProfilePhoto;
                const isProcessingThis = processingId === picture.id;

                return (
                  <View
                    key={picture.id}
                    style={[
                      localStyles.pictureCard,
                      {
                        backgroundColor: themeColors.background,
                        borderColor: isCurrentProfile ? primaryColor : themeColors.divider,
                        borderWidth: isCurrentProfile ? 2 : 1,
                      },
                    ]}
                  >
                    {/* Image */}
                    <Image
                      source={{ uri: picture.url }}
                      style={localStyles.pictureImage}
                      contentFit="cover"
                      transition={200}
                      placeholder={{ blurhash: 'L6PZfSi_.AyE_3t7t7R**0o#DgR4' }}
                      cachePolicy="memory-disk"
                      priority="high"
                    />

                    {/* Current Badge */}
                    {isCurrentProfile && (
                      <View style={[localStyles.currentBadge, { backgroundColor: primaryColor }]}>
                        <Ionicons name="checkmark-circle" size={16} color="#fff" />
                        <Text style={localStyles.currentText}>Current</Text>
                      </View>
                    )}

                    {/* Info */}
                    <View style={localStyles.pictureInfo}>
                      <Text style={[localStyles.styleName, { color: themeColors.textPrimary }]}>
                        {getStyleName(picture.style)}
                      </Text>
                      <Text style={[localStyles.dateText, { color: themeColors.textSecondary }]}>
                        {formatDate(picture.createdAt)}
                      </Text>
                    </View>

                    {/* Actions */}
                    <View style={localStyles.actions}>
                      {!isCurrentProfile && (
                        <TouchableOpacity
                          style={[localStyles.actionButton, { backgroundColor: `${primaryColor}15` }]}
                          onPress={() => handleSetAsProfile(picture.url, picture.id)}
                          disabled={isProcessingThis}
                        >
                          {isProcessingThis ? (
                            <ActivityIndicator size="small" color={primaryColor} />
                          ) : (
                            <>
                              <Ionicons name="person-circle-outline" size={18} color={primaryColor} />
                              <Text style={[localStyles.actionText, { color: primaryColor }]}>
                                Use as Profile
                              </Text>
                            </>
                          )}
                        </TouchableOpacity>
                      )}

                      <TouchableOpacity
                        style={[localStyles.downloadButton, { backgroundColor: '#34C75915' }]}
                        onPress={() => handleDownload(picture)}
                        disabled={downloadingId === picture.id}
                      >
                        {downloadingId === picture.id ? (
                          <ActivityIndicator size="small" color="#34C759" />
                        ) : (
                          <Ionicons name="download-outline" size={20} color="#34C759" />
                        )}
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[localStyles.deleteButton, { backgroundColor: '#FF353515' }]}
                        onPress={() => handleDelete(picture)}
                        disabled={isProcessingThis}
                      >
                        {isProcessingThis ? (
                          <ActivityIndicator size="small" color="#FF3535" />
                        ) : (
                          <Ionicons name="trash-outline" size={20} color="#FF3535" />
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            )}
          </ScrollView>
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
    maxHeight: '85%',
    paddingBottom: 34,
  },
  header: {
    padding: 20,
    paddingBottom: 16,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
  },
  clearAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  clearAllText: {
    fontSize: 14,
    fontWeight: '600',
  },
  scrollView: {
    maxHeight: 500,
  },
  gridContainer: {
    padding: 20,
    paddingTop: 0,
    gap: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 17,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 4,
  },
  pictureCard: {
    borderRadius: 16,
    padding: 12,
  },
  pictureImage: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 12,
    marginBottom: 12,
  },
  currentBadge: {
    position: 'absolute',
    top: 20,
    left: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  currentText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  pictureInfo: {
    marginBottom: 12,
  },
  styleName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  dateText: {
    fontSize: 13,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  downloadButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  deleteButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
});
