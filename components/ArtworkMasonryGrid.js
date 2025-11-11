import React, { useState, useEffect } from 'react';
import { View, Image, StyleSheet, TouchableOpacity, Text, Dimensions, Modal, StatusBar, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { downloadAsync, documentDirectory } from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';
import LottieView from 'lottie-react-native';
import { useSettings } from '../contexts/SettingsContext';
import { useAuth } from '../contexts/AuthContext';
import { canDownloadArtwork, recordArtworkDownload } from '../utils/subscriptionUtils';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const COLUMN_WIDTH = (SCREEN_WIDTH - 16) / 2; // 2 columns with minimal padding and gap (4px padding each side + 8px gap = 16px)

export default function ArtworkMasonryGrid({ artworks, onArtworkPress }) {
  const { themeColors, userProfile } = useSettings();
  const { currentUser, isAdmin } = useAuth();
  const [promptModal, setPromptModal] = useState({ visible: false, prompt: '', style: '' });
  const [fullScreenImage, setFullScreenImage] = useState({ visible: false, url: '', style: '', prompt: '' });
  const [downloadLimits, setDownloadLimits] = useState({ allowed: true, remaining: -1, limit: -1 });
  const [isDownloading, setIsDownloading] = useState(false);
  const [loadingImages, setLoadingImages] = useState({}); // Track loading state for grid images
  const [fullScreenLoading, setFullScreenLoading] = useState(true); // Track loading for full screen image

  // Check download limits on mount and when modal opens
  useEffect(() => {
    checkDownloadLimits();
  }, [fullScreenImage.visible, isAdmin, userProfile?.subscriptionPlan]);

  // Reset full-screen loading when image changes with timeout fallback
  useEffect(() => {
    if (fullScreenImage.visible && fullScreenImage.url) {
      console.log('[ArtworkMasonryGrid] Full-screen image changed, setting loading state');
      setFullScreenLoading(true);

      // Timeout fallback - if image doesn't load within 10 seconds, hide loader
      const timeout = setTimeout(() => {
        console.log('[ArtworkMasonryGrid] Full-screen image load timeout, forcing hide');
        setFullScreenLoading(false);
      }, 10000);

      return () => clearTimeout(timeout);
    }
  }, [fullScreenImage.url, fullScreenImage.visible]);

  const checkDownloadLimits = async () => {
    const planId = userProfile?.subscriptionPlan || 'basic';
    console.log('[ArtworkMasonryGrid] Checking download limits - planId:', planId, 'isAdmin:', isAdmin);
    const limits = await canDownloadArtwork(planId, isAdmin);
    console.log('[ArtworkMasonryGrid] Download limits:', limits);
    setDownloadLimits(limits);
  };

  const handleDownload = async () => {
    if (!downloadLimits.allowed) {
      Alert.alert(
        'Download Limit Reached',
        `You've used all ${downloadLimits.limit} downloads today. Upgrade to get more!`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Upgrade', onPress: () => { /* Navigate to subscription screen */ } },
        ]
      );
      return;
    }

    try {
      setIsDownloading(true);

      // Request media library permissions
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant permission to save images to your photo library.');
        setIsDownloading(false);
        return;
      }

      // Download the image
      const filename = `artwork-${Date.now()}.jpg`;
      const fileUri = documentDirectory + filename;

      const downloadResult = await downloadAsync(fullScreenImage.url, fileUri);

      // Save to media library
      await MediaLibrary.createAssetAsync(downloadResult.uri);

      // Record the download
      await recordArtworkDownload();

      // Update limits
      await checkDownloadLimits();

      Alert.alert('Success', 'Artwork saved to your photo library!');
    } catch (error) {
      console.error('[ArtworkMasonryGrid] Download error:', error);
      Alert.alert('Download Failed', 'Unable to save the artwork. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  // Split artworks into two columns for masonry layout
  const leftColumn = [];
  const rightColumn = [];

  artworks.forEach((artwork, index) => {
    if (index % 2 === 0) {
      leftColumn.push(artwork);
    } else {
      rightColumn.push(artwork);
    }
  });

  const renderArtworkItem = (artwork) => (
    <View key={artwork.id} style={styles.artworkContainer}>
      <View style={[styles.artworkCard, { backgroundColor: themeColors.card, borderColor: themeColors.divider }]}>
        {/* Artwork Image - opens full screen */}
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => setFullScreenImage({ visible: true, url: artwork.url, style: artwork.style, prompt: artwork.prompt })}
        >
          <Image
            source={{ uri: artwork.url }}
            style={styles.artworkImage}
            resizeMode="cover"
            cache="force-cache"
            onLoadStart={() => {
              console.log('[ArtworkMasonryGrid] Grid image loading started:', artwork.id);
              setLoadingImages(prev => ({ ...prev, [artwork.id]: true }));
            }}
            onLoadEnd={() => {
              console.log('[ArtworkMasonryGrid] Grid image loaded:', artwork.id);
              setLoadingImages(prev => ({ ...prev, [artwork.id]: false }));
            }}
            onError={(error) => {
              console.error('[ArtworkMasonryGrid] Grid image load error:', artwork.id, error?.nativeEvent);
              setLoadingImages(prev => ({ ...prev, [artwork.id]: false }));
            }}
          />
          {/* Loading overlay with broom animation */}
          {loadingImages[artwork.id] && (
            <View style={styles.gridLoadingOverlay}>
              <LottieView
                source={require('../assets/broom.json')}
                autoPlay
                loop
                style={styles.gridLoadingAnimation}
              />
            </View>
          )}
          {/* Info icon for prompt */}
          {artwork.prompt && (
            <TouchableOpacity
              style={[styles.infoIconContainer, { backgroundColor: themeColors.primary }]}
              onPress={(e) => {
                e.stopPropagation();
                setPromptModal({ visible: true, prompt: artwork.prompt, style: artwork.style });
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="information" size={16} color="#fff" />
            </TouchableOpacity>
          )}
        </TouchableOpacity>

        {/* Artist Info - goes to profile */}
        <TouchableOpacity
          style={styles.artworkInfo}
          activeOpacity={0.7}
          onPress={() => onArtworkPress(artwork)}
        >
          {artwork.style && (
            <View style={[styles.styleBadge, { backgroundColor: `${themeColors.primary}20` }]}>
              <Text style={[styles.styleText, { color: themeColors.primary }]} numberOfLines={1}>
                {artwork.style}
              </Text>
            </View>
          )}
          <View style={styles.artistInfo}>
            {artwork.profilePhoto && (
              <Image
                source={{ uri: artwork.profilePhoto }}
                style={styles.artistPhoto}
                cache="force-cache"
              />
            )}
            <Text style={[styles.artistName, { color: themeColors.textSecondary }]} numberOfLines={1}>
              {artwork.displayName || artwork.username}
            </Text>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <>
      <View style={styles.container}>
        <View style={styles.column}>
          {leftColumn.map(renderArtworkItem)}
        </View>
        <View style={styles.column}>
          {rightColumn.map(renderArtworkItem)}
        </View>
      </View>

      {/* Prompt Modal */}
      <Modal
        visible={promptModal.visible}
        transparent
        animationType="fade"
        onRequestClose={() => setPromptModal({ visible: false, prompt: '', style: '' })}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setPromptModal({ visible: false, prompt: '', style: '' })}
        >
          <View style={[styles.promptCard, { backgroundColor: themeColors.card, borderColor: themeColors.divider }]}>
            <View style={styles.promptHeader}>
              <View style={[styles.promptIcon, { backgroundColor: `${themeColors.primary}20` }]}>
                <Ionicons name="sparkles" size={20} color={themeColors.primary} />
              </View>
              <Text style={[styles.promptTitle, { color: themeColors.textPrimary }]}>
                {promptModal.style} Style
              </Text>
              <TouchableOpacity
                onPress={() => setPromptModal({ visible: false, prompt: '', style: '' })}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={20} color={themeColors.textSecondary} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.promptText, { color: themeColors.textSecondary }]}>
              {promptModal.prompt}
            </Text>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Full Screen Image Modal */}
      <Modal
        visible={fullScreenImage.visible}
        transparent={false}
        animationType="fade"
        onRequestClose={() => setFullScreenImage({ visible: false, url: '', style: '', prompt: '' })}
      >
        <StatusBar hidden />
        <View style={styles.fullScreenContainer}>
          {/* Top buttons */}
          <View style={styles.topButtonsContainer}>
            <View style={styles.leftButtonsContainer}>
              {/* Download button */}
              <TouchableOpacity
                style={styles.downloadButtonFullScreen}
                onPress={handleDownload}
                activeOpacity={0.7}
                disabled={isDownloading}
              >
                <View style={styles.downloadIconContainer}>
                  {isDownloading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Ionicons name="download" size={24} color="#fff" />
                  )}
                </View>
              </TouchableOpacity>

              {/* Info button */}
              {fullScreenImage.prompt && (
                <TouchableOpacity
                  style={styles.infoButtonFullScreen}
                  onPress={() => setPromptModal({ visible: true, prompt: fullScreenImage.prompt, style: fullScreenImage.style })}
                  activeOpacity={0.7}
                >
                  <View style={styles.infoIconContainerFullScreen}>
                    <Ionicons name="information" size={24} color="#fff" />
                  </View>
                </TouchableOpacity>
              )}
            </View>

            {/* Close button */}
            <TouchableOpacity
              style={styles.closeButtonFullScreen}
              onPress={() => setFullScreenImage({ visible: false, url: '', style: '', prompt: '' })}
              activeOpacity={0.7}
            >
              <View style={styles.closeIconContainer}>
                <Ionicons name="close" size={28} color="#fff" />
              </View>
            </TouchableOpacity>
          </View>

          {/* Download counter */}
          {downloadLimits.limit !== -1 && (
            <View style={styles.downloadCounterContainer}>
              <View style={styles.downloadCounter}>
                <Ionicons name="download-outline" size={14} color="#fff" />
                <Text style={styles.downloadCounterText}>
                  {downloadLimits.remaining}/{downloadLimits.limit} left today
                </Text>
              </View>
            </View>
          )}

          {fullScreenImage.url ? (
            <Image
              source={{ uri: fullScreenImage.url }}
              style={styles.fullScreenImage}
              resizeMode="contain"
              cache="force-cache"
              onLoadStart={() => {
                if (fullScreenImage.visible && fullScreenImage.url) {
                  console.log('[ArtworkMasonryGrid] Full-screen image loading started');
                  setFullScreenLoading(true);
                }
              }}
              onLoadEnd={() => {
                if (fullScreenImage.visible && fullScreenImage.url) {
                  console.log('[ArtworkMasonryGrid] Full-screen image loaded');
                  setFullScreenLoading(false);
                }
              }}
              onError={(error) => {
                if (fullScreenImage.visible && fullScreenImage.url) {
                  console.error('[ArtworkMasonryGrid] Full-screen image load error:', error?.nativeEvent);
                  setFullScreenLoading(false);
                }
              }}
            />
          ) : null}

          {/* Loading overlay with broom animation */}
          {fullScreenLoading && (
            <View style={styles.fullScreenLoadingOverlay}>
              <LottieView
                source={require('../assets/broom.json')}
                autoPlay
                loop
                style={styles.fullScreenLoadingAnimation}
              />
            </View>
          )}

          {fullScreenImage.style && (
            <View style={styles.fullScreenInfo}>
              <View style={styles.fullScreenBadge}>
                <Ionicons name="brush" size={16} color="#fff" />
                <Text style={styles.fullScreenStyleText}>
                  {fullScreenImage.style} Style
                </Text>
              </View>
            </View>
          )}
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 20,
  },
  column: {
    flex: 1,
    gap: 8,
  },
  artworkContainer: {
    position: 'relative',
  },
  artworkCard: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
    position: 'relative',
  },
  infoIconContainer: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
    zIndex: 1,
  },
  artworkImage: {
    width: '100%',
    height: COLUMN_WIDTH * 1.2, // Slightly taller than wide
    resizeMode: 'cover',
  },
  artworkInfo: {
    padding: 10,
  },
  styleBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    marginBottom: 8,
  },
  styleText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  artistInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  artistPhoto: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  artistName: {
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  promptCard: {
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 10,
  },
  promptHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  promptIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  promptTitle: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  closeButton: {
    padding: 4,
  },
  promptText: {
    fontSize: 14,
    lineHeight: 20,
  },
  fullScreenContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  topButtonsContainer: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    zIndex: 10,
  },
  leftButtonsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  downloadButtonFullScreen: {
    // Left side
  },
  downloadIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoButtonFullScreen: {
    // Left side, next to download
  },
  infoIconContainerFullScreen: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonFullScreen: {
    // Right side
  },
  closeIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  downloadCounterContainer: {
    position: 'absolute',
    top: 105,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
  downloadCounter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
  },
  downloadCounterText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  fullScreenImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  fullScreenInfo: {
    position: 'absolute',
    bottom: 50,
    left: 20,
    right: 20,
    alignItems: 'center',
  },
  fullScreenBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  fullScreenStyleText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  gridLoadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridLoadingAnimation: {
    width: 80,
    height: 80,
  },
  fullScreenLoadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullScreenLoadingAnimation: {
    width: 150,
    height: 150,
  },
});
