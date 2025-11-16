import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Image, StyleSheet, TouchableOpacity, Text, Dimensions, Modal, StatusBar, Alert, ActivityIndicator, ScrollView, Share } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { downloadAsync, documentDirectory } from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';
import LottieView from 'lottie-react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, runOnJS } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSettings } from '../contexts/SettingsContext';
import { useAuth } from '../contexts/AuthContext';
import { canDownloadArtwork, recordArtworkDownload } from '../utils/subscriptionUtils';
import StoryTellerCard from './StoryTellerCard';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const COLUMN_WIDTH = (SCREEN_WIDTH - 16) / 2; // 2 columns with minimal padding and gap (4px padding each side + 8px gap = 16px)
const MAX_STORY_CARDS_PER_SECTION = 2;
const MIN_ZOOM_SCALE = 1;
const MAX_ZOOM_SCALE = 4;
const ZOOM_THRESHOLD = 1.01;
const clampValue = (value, min = MIN_ZOOM_SCALE, max = MAX_ZOOM_SCALE) => {
  'worklet';
  return Math.min(Math.max(value, min), max);
};
const clampTranslation = (value, dimension, scaleValue) => {
  'worklet';
  const bound = ((scaleValue - 1) * dimension) / 2;
  if (bound <= 0 || Number.isNaN(bound)) return 0;
  return Math.min(Math.max(value, -bound), bound);
};

export default function ArtworkMasonryGrid({
  artworks = [],
  onArtworkPress,
  navigation,
  storyCollections: storyCollectionsProp = [],
}) {
  const { themeColors, userProfile, accentPreset } = useSettings();
  const { currentUser, isAdmin } = useAuth();
  const [promptModal, setPromptModal] = useState({ visible: false, prompt: '', style: '' });
  const [fullScreenImage, setFullScreenImage] = useState({
    visible: false,
    url: '',
    style: '',
    prompt: '',
    // Story Teller support
    isStory: false,
    images: [],
    currentIndex: 0,
  });
  const [showFullScreenPrompt, setShowFullScreenPrompt] = useState(false); // Toggle prompt card in full screen
  const [downloadLimits, setDownloadLimits] = useState({ allowed: true, remaining: -1, limit: -1 });
  const [isDownloading, setIsDownloading] = useState(false);
  const [loadingImages, setLoadingImages] = useState({}); // Track loading state for grid images
  const [fullScreenLoading, setFullScreenLoading] = useState(true); // Track loading for full screen image
  const [likedArtworks, setLikedArtworks] = useState({}); // Track which artworks user has liked
  const [preloadedImages, setPreloadedImages] = useState(new Set()); // Track preloaded full-screen images
  const scrollViewRef = useRef(null); // Reference to ScrollView for programmatic scrolling
  const [heartAnimations, setHeartAnimations] = useState({}); // Track heart animation state
  const [isZooming, setIsZooming] = useState(false); // Disable swiping while pinch-zooming
  const primaryColor = accentPreset?.buttonBackground || themeColors.primary;
  const handleZoomStateChange = useCallback((zooming) => {
    setIsZooming((prev) => (prev === zooming ? prev : zooming));
  }, []);

  // Check download limits on mount and when modal opens
  useEffect(() => {
    checkDownloadLimits();
  }, [fullScreenImage.visible, isAdmin, userProfile?.subscriptionPlan]);

  // Preload all Story images when modal opens + scroll to correct position
  useEffect(() => {
    if (fullScreenImage.visible && fullScreenImage.isStory && fullScreenImage.images.length > 0) {
      console.log('[ArtworkMasonryGrid] 🖼️ Preloading Story images:', fullScreenImage.images.length);

      // Preload all images in the background
      const preloadPromises = fullScreenImage.images.map((image, index) => {
        return Image.prefetch(image.url)
          .then(() => {
            console.log(`[ArtworkMasonryGrid] ✅ Preloaded image ${index + 1}/${fullScreenImage.images.length}`);
            setPreloadedImages(prev => new Set([...prev, image.url]));
          })
          .catch(error => {
            console.warn(`[ArtworkMasonryGrid] ⚠️ Failed to preload image ${index + 1}:`, error);
          });
      });

      Promise.all(preloadPromises).then(() => {
        console.log('[ArtworkMasonryGrid] 🎉 All Story images preloaded');
      });

      // Scroll to initial position after a short delay
      setTimeout(() => {
        if (scrollViewRef.current && fullScreenImage.currentIndex > 0) {
          scrollViewRef.current.scrollTo({
            x: fullScreenImage.currentIndex * SCREEN_WIDTH,
            y: 0,
            animated: false,
          });
        }
      }, 100);
    }

    // Keep preloaded cache even when modal closes for faster reopening
    // No cleanup needed - grid images stay cached for instant full-screen display
  }, [fullScreenImage.visible, fullScreenImage.isStory]);

  // Show broom loading animation only when initially opening modal (not when swiping)
  useEffect(() => {
    if (fullScreenImage.visible && fullScreenImage.url) {
      console.log('[ArtworkMasonryGrid] Full-screen opening, showing broom animation');
      setFullScreenLoading(true);

      // Show broom for 600ms to cover modal transition
      const minDisplayTimeout = setTimeout(() => {
        setFullScreenLoading(false);
      }, 2000);

      return () => clearTimeout(minDisplayTimeout);
    }
  }, [fullScreenImage.visible]); // Only trigger on modal open/close, not on URL change (swipe)

  useEffect(() => {
    if (!fullScreenImage.visible) {
      setIsZooming(false);
    }
  }, [fullScreenImage.visible]);

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
          { text: 'Upgrade', onPress: () => navigation?.navigate('Subscription') },
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

  const handleLikeArtwork = (artworkId) => {
    const isLiked = likedArtworks[artworkId];

    // Toggle like state
    setLikedArtworks(prev => ({
      ...prev,
      [artworkId]: !isLiked,
    }));

    // Trigger heart bounce animation
    if (!isLiked) {
      setHeartAnimations(prev => ({
        ...prev,
        [artworkId]: true,
      }));

      // Reset animation after animation completes
      setTimeout(() => {
        setHeartAnimations(prev => ({
          ...prev,
          [artworkId]: false,
        }));
      }, 400);
    }

    // TODO: In production, send like to Firestore
    // await updateDoc(doc(db, 'aiArtwork', artworkId), {
    //   likes: increment(isLiked ? -1 : 1),
    //   likedBy: isLiked ? arrayRemove(currentUser.uid) : arrayUnion(currentUser.uid),
    // });
  };

  const handleCommentPress = (story) => {
    // TODO: Open comments modal or navigate to comments screen
    Alert.alert(
      'Comments',
      `View and add comments for this Story Teller collection.\n\nCurrent comments: ${story.comments || 0}`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'View Comments', onPress: () => console.log('Navigate to comments') },
      ]
    );
  };

  const handleSharePress = async (story) => {
    try {
      const message = `Check out this amazing Story Teller collection with ${story.images?.length || 0} variations!\n\nStyle: ${story.style}\n${story.prompt ? `\nPrompt: ${story.prompt}` : ''}`;

      await Share.share({
        message,
        title: 'Story Teller Collection',
      });
    } catch (error) {
      console.error('[ArtworkMasonryGrid] Error sharing story:', error);
    }
  };

  const handlePromptPress = (story) => {
    if (story.prompt) {
      Alert.alert(
        'AI Prompt',
        story.prompt,
        [
          { text: 'Close', style: 'cancel' },
          {
            text: 'Copy',
            onPress: () => {
              // TODO: Copy to clipboard
              console.log('Copy prompt to clipboard');
            },
          },
        ]
      );
    }
  };

  const handleDownloadAll = async (story) => {
    if (!story.images || story.images.length === 0) {
      Alert.alert('Error', 'No images to download');
      return;
    }

    try {
      // Request media library permissions
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant permission to save images to your photo library.');
        return;
      }

      setIsDownloading(true);
      console.log('[ArtworkMasonryGrid] Downloading', story.images.length, 'images from Story collection');

      let successCount = 0;
      let failCount = 0;

      // Download each image
      for (const [index, image] of story.images.entries()) {
        try {
          console.log(`[ArtworkMasonryGrid] Downloading image ${index + 1}/${story.images.length}`);

          const filename = `story-${story.style}-${index + 1}-${Date.now()}.jpg`;
          const fileUri = documentDirectory + filename;

          const downloadResult = await downloadAsync(image.url, fileUri);

          // Save to media library
          await MediaLibrary.createAssetAsync(downloadResult.uri);
          successCount++;

          console.log(`[ArtworkMasonryGrid] ✅ Downloaded image ${index + 1}`);
        } catch (error) {
          console.error(`[ArtworkMasonryGrid] ❌ Failed to download image ${index + 1}:`, error);
          failCount++;
        }
      }

      setIsDownloading(false);

      // Show result
      if (successCount > 0 && failCount === 0) {
        Alert.alert(
          'Success! 🎉',
          `All ${successCount} images saved to your photo library!`
        );
      } else if (successCount > 0 && failCount > 0) {
        Alert.alert(
          'Partial Success',
          `${successCount} images saved successfully.\n${failCount} images failed to download.`
        );
      } else {
        Alert.alert(
          'Download Failed',
          'Unable to save images. Please try again.'
        );
      }
    } catch (error) {
      console.error('[ArtworkMasonryGrid] Download all error:', error);
      setIsDownloading(false);
      Alert.alert('Download Failed', 'Unable to save images. Please try again.');
    }
  };

  const isStoryCollection = (item) => item?.type === 'story' && item.images && item.images.length > 1;
  const derivedStoryCollections = storyCollectionsProp.length > 0
    ? storyCollectionsProp
    : artworks.filter(isStoryCollection);
  const processedItems = storyCollectionsProp.length > 0
    ? artworks
    : artworks.filter((item) => !isStoryCollection(item));
  const storyCollections = derivedStoryCollections.slice(0, MAX_STORY_CARDS_PER_SECTION);

  // Split regular artworks into two columns for masonry layout
  const leftColumn = [];
  const rightColumn = [];

  processedItems.forEach((artwork, index) => {
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
          onPress={() => setFullScreenImage({
            visible: true,
            url: artwork.url,
            style: artwork.style,
            prompt: artwork.prompt,
            isStory: false,
            images: [],
            currentIndex: 0,
          })}
        >
          <Image
            source={{ uri: artwork.url }}
            style={styles.artworkImage}
            resizeMode="cover"
            cache="force-cache"
            timeout={30000}
            onLoadStart={() => {
              console.log('[ArtworkMasonryGrid] Grid image loading started:', artwork.id);
              setLoadingImages(prev => ({ ...prev, [artwork.id]: true }));
            }}
            onLoadEnd={() => {
              console.log('[ArtworkMasonryGrid] Grid image loaded:', artwork.id);
              setLoadingImages(prev => ({ ...prev, [artwork.id]: false }));
              // Add to preloaded cache for instant full-screen display
              setPreloadedImages(prev => new Set([...prev, artwork.url]));
            }}
            onError={(error) => {
              console.error('[ArtworkMasonryGrid] Grid image load error:', artwork.id, error?.nativeEvent);
              setLoadingImages(prev => ({ ...prev, [artwork.id]: false }));
              // Silently fail - image will show as blank with loading state removed
            }}
            defaultSource={require('../assets/icon.png')}
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

        {/* Artist Info and Heart Reaction Row */}
        <View style={styles.artworkInfo}>
          <TouchableOpacity
            style={styles.artistInfoTouchable}
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

          {/* Heart Reaction - on the right */}
          <TouchableOpacity
            style={styles.heartButton}
            onPress={() => handleLikeArtwork(artwork.id)}
            activeOpacity={0.7}
          >
            <View style={heartAnimations[artwork.id] && styles.heartAnimationContainer}>
              <Ionicons
                name={likedArtworks[artwork.id] ? "heart" : "heart-outline"}
                size={20}
                color={likedArtworks[artwork.id] ? primaryColor : themeColors.textSecondary}
              />
            </View>
            <Text style={[styles.likeCount, { color: themeColors.textSecondary }]}>
              {(artwork.likes || 0) + (likedArtworks[artwork.id] ? 1 : 0)}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <>
      <View style={styles.container}>
        {/* Story Teller Collections - Full Width Cards */}
        {storyCollections.length > 0 && (
          <View style={styles.storySection}>
            {storyCollections.map((story) => (
              <StoryTellerCard
                key={story.id}
                story={story}
                onImagePress={(image, index) => {
                  // Open full screen view with all story images for swiping
                  setFullScreenImage({
                    visible: true,
                    url: image.url,
                    style: story.style,
                    prompt: story.prompt,
                    isStory: true,
                    images: story.images || [],
                    currentIndex: index,
                  });
                }}
                onImageLoad={(imageUrl) => {
                  // Add to preloaded cache for instant full-screen display
                  setPreloadedImages(prev => new Set([...prev, imageUrl]));
                }}
                onLikePress={(storyId) => handleLikeArtwork(storyId)}
                isLiked={likedArtworks[story.id]}
                onCommentPress={handleCommentPress}
                onSharePress={handleSharePress}
                onPromptPress={handlePromptPress}
                onMenuPress={() => {
                  // Handle menu actions (download, share, etc.)
                  Alert.alert(
                    'Story Actions',
                    'What would you like to do?',
                    [
                      {
                        text: `Download All (${story.images?.length || 0} images)`,
                        onPress: () => handleDownloadAll(story)
                      },
                      { text: 'Share', onPress: () => handleSharePress(story) },
                      { text: 'Cancel', style: 'cancel' },
                    ]
                  );
                }}
              />
            ))}
          </View>
        )}

        {/* Regular Artworks - Masonry Grid */}
        <View style={styles.gridColumns}>
          <View style={styles.column}>
            {leftColumn.map(renderArtworkItem)}
          </View>
          <View style={styles.column}>
            {rightColumn.map(renderArtworkItem)}
          </View>
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
                  onPress={() => setShowFullScreenPrompt(!showFullScreenPrompt)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.infoIconContainerFullScreen, showFullScreenPrompt && { backgroundColor: 'rgba(255, 255, 255, 0.3)' }]}>
                    <Ionicons name="information" size={24} color="#fff" />
                  </View>
                </TouchableOpacity>
              )}
            </View>

            {/* Close button */}
            <TouchableOpacity
              style={styles.closeButtonFullScreen}
              onPress={() => setFullScreenImage({
                visible: false,
                url: '',
                style: '',
                prompt: '',
                isStory: false,
                images: [],
                currentIndex: 0,
              })}
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

          {/* Prompt Card - Toggleable */}
          {showFullScreenPrompt && fullScreenImage.prompt && (
            <View style={styles.fullScreenPromptCard}>
              <View style={[styles.promptCardInner, { backgroundColor: themeColors.card, borderColor: themeColors.divider }]}>
                <View style={styles.promptCardHeader}>
                  <View style={[styles.promptCardIcon, { backgroundColor: `${themeColors.primary}20` }]}>
                    <Ionicons name="sparkles" size={18} color={themeColors.primary} />
                  </View>
                  <Text style={[styles.promptCardTitle, { color: themeColors.textPrimary }]}>
                    {fullScreenImage.style} Style
                  </Text>
                </View>
                <Text style={[styles.promptCardText, { color: themeColors.textSecondary }]}>
                  {fullScreenImage.prompt}
                </Text>
              </View>
            </View>
          )}

          {fullScreenImage.isStory && fullScreenImage.images.length > 0 ? (
            // Story Teller: Swipeable gallery with preloaded images
            <ScrollView
              ref={scrollViewRef}
              horizontal
              pagingEnabled
              scrollEnabled={!isZooming}
              showsHorizontalScrollIndicator={false}
              style={styles.fullScreenScrollView}
              onScroll={(event) => {
                const offsetX = event.nativeEvent.contentOffset.x;
                const newIndex = Math.round(offsetX / SCREEN_WIDTH);
                if (newIndex !== fullScreenImage.currentIndex && newIndex >= 0 && newIndex < fullScreenImage.images.length) {
                  setFullScreenImage(prev => ({
                    ...prev,
                    currentIndex: newIndex,
                    url: prev.images[newIndex]?.url || prev.url,
                  }));
                }
              }}
              scrollEventThrottle={16}
            >
              {fullScreenImage.images.map((image, index) => (
                <View key={image.id || index} style={styles.fullScreenImageContainer}>
                  <ZoomableImage
                    uri={image.url}
                    style={styles.fullScreenImage}
                    resizeMode="contain"
                    imageProps={{ cache: 'force-cache' }}
                    onZoomStateChange={handleZoomStateChange}
                    viewportWidth={SCREEN_WIDTH}
                    viewportHeight={SCREEN_HEIGHT}
                  />
                </View>
              ))}
            </ScrollView>
          ) : fullScreenImage.url ? (
            // Single image
            <ZoomableImage
              uri={fullScreenImage.url}
              style={styles.fullScreenImage}
              resizeMode="contain"
              imageProps={{ cache: 'force-cache' }}
              onZoomStateChange={handleZoomStateChange}
              viewportWidth={SCREEN_WIDTH}
              viewportHeight={SCREEN_HEIGHT}
            />
          ) : null}

          {/* Loading overlay with broom animation - shows briefly during transition */}
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

          {/* Info badges at bottom */}
          <View style={styles.fullScreenInfo}>
            {fullScreenImage.style && (
              <View style={styles.fullScreenBadge}>
                <Ionicons name="brush" size={16} color="#fff" />
                <Text style={styles.fullScreenStyleText}>
                  {fullScreenImage.style} Style
                </Text>
              </View>
            )}

            {/* Image counter for Story Teller */}
            {fullScreenImage.isStory && fullScreenImage.images.length > 1 && (
              <View style={[styles.fullScreenBadge, styles.imageCounterBadge]}>
                <Ionicons name="images" size={16} color="#fff" />
                <Text style={styles.fullScreenStyleText}>
                  {fullScreenImage.currentIndex + 1}/{fullScreenImage.images.length}
                </Text>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
}

function ZoomableImage({
  uri,
  style,
  resizeMode = 'contain',
  imageProps = {},
  onZoomStateChange,
  viewportWidth = SCREEN_WIDTH,
  viewportHeight = SCREEN_HEIGHT,
}) {
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const zoomActive = useSharedValue(0);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const panStartX = useSharedValue(0);
  const panStartY = useSharedValue(0);

  const notifyZoomStateChange = useCallback((active) => {
    onZoomStateChange?.(active);
  }, [onZoomStateChange]);

  useEffect(() => {
    scale.value = 1;
    savedScale.value = 1;
    zoomActive.value = 0;
    translateX.value = 0;
    translateY.value = 0;
    notifyZoomStateChange(false);
  }, [uri, scale, savedScale, zoomActive, translateX, translateY, notifyZoomStateChange]);

  if (!uri) {
    return null;
  }

  const pinchGesture = Gesture.Pinch()
    .onStart(() => {
      'worklet';
      savedScale.value = scale.value;
    })
    .onUpdate((event) => {
      'worklet';
      const nextScale = clampValue(savedScale.value * event.scale, MIN_ZOOM_SCALE, MAX_ZOOM_SCALE);
      scale.value = nextScale;
      translateX.value = clampTranslation(translateX.value, viewportWidth, nextScale);
      translateY.value = clampTranslation(translateY.value, viewportHeight, nextScale);
      const nextActive = nextScale > ZOOM_THRESHOLD ? 1 : 0;
      if (zoomActive.value !== nextActive) {
        zoomActive.value = nextActive;
        runOnJS(notifyZoomStateChange)(!!nextActive);
      }
    })
    .onEnd(() => {
      'worklet';
      savedScale.value = clampValue(scale.value, MIN_ZOOM_SCALE, MAX_ZOOM_SCALE);
    })
    .onFinalize(() => {
      'worklet';
      if (scale.value < MIN_ZOOM_SCALE) {
        scale.value = withTiming(MIN_ZOOM_SCALE);
        savedScale.value = MIN_ZOOM_SCALE;
      } else if (scale.value > MAX_ZOOM_SCALE) {
        scale.value = withTiming(MAX_ZOOM_SCALE);
        savedScale.value = MAX_ZOOM_SCALE;
      }
      translateX.value = clampTranslation(translateX.value, viewportWidth, scale.value);
      translateY.value = clampTranslation(translateY.value, viewportHeight, scale.value);
      if (scale.value <= MIN_ZOOM_SCALE) {
        translateX.value = withTiming(0);
        translateY.value = withTiming(0);
      }
      const nextActive = scale.value > ZOOM_THRESHOLD ? 1 : 0;
      if (zoomActive.value !== nextActive) {
        zoomActive.value = nextActive;
        runOnJS(notifyZoomStateChange)(!!nextActive);
      }
    });

  const panGesture = Gesture.Pan()
    .onStart(() => {
      'worklet';
      panStartX.value = translateX.value;
      panStartY.value = translateY.value;
    })
    .onUpdate((event) => {
      'worklet';
      if (scale.value <= ZOOM_THRESHOLD) {
        translateX.value = withTiming(0);
        translateY.value = withTiming(0);
        return;
      }
      const nextX = clampTranslation(panStartX.value + event.translationX, viewportWidth, scale.value);
      const nextY = clampTranslation(panStartY.value + event.translationY, viewportHeight, scale.value);
      translateX.value = nextX;
      translateY.value = nextY;
      if (zoomActive.value === 0) {
        zoomActive.value = 1;
        runOnJS(notifyZoomStateChange)(true);
      }
    })
    .onEnd(() => {
      'worklet';
      translateX.value = clampTranslation(translateX.value, viewportWidth, scale.value);
      translateY.value = clampTranslation(translateY.value, viewportHeight, scale.value);
    })
    .onFinalize(() => {
      'worklet';
      if (scale.value <= MIN_ZOOM_SCALE) {
        translateX.value = withTiming(0);
        translateY.value = withTiming(0);
        if (zoomActive.value !== 0) {
          zoomActive.value = 0;
          runOnJS(notifyZoomStateChange)(false);
        }
      }
    });

  const combinedGesture = Gesture.Simultaneous(pinchGesture, panGesture);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { translateX: translateX.value },
      { translateY: translateY.value },
    ],
  }));

  return (
    <GestureDetector gesture={combinedGesture}>
      <Animated.Image
        source={{ uri }}
        style={[style, animatedStyle]}
        resizeMode={resizeMode}
        {...imageProps}
      />
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingBottom: 20,
  },
  storySection: {
    paddingHorizontal: 8,
    marginBottom: 16,
  },
  gridColumns: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 4,
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  artistInfoTouchable: {
    flex: 1,
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
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
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
  imageCounterBadge: {
    backgroundColor: 'rgba(108, 77, 244, 0.9)',
  },
  fullScreenStyleText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  fullScreenScrollView: {
    flex: 1,
  },
  fullScreenImageContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
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
  fullScreenPromptCard: {
    position: 'absolute',
    top: 110,
    left: 20,
    right: 20,
    zIndex: 11,
  },
  promptCardInner: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  promptCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  promptCardIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  promptCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
  },
  promptCardText: {
    fontSize: 14,
    lineHeight: 20,
  },
  heartButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingLeft: 8,
  },
  heartAnimationContainer: {
    transform: [{ scale: 1.4 }],
  },
  likeCount: {
    fontSize: 13,
    fontWeight: '600',
  },
});
