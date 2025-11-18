/**
 * StoryTeller Card Component
 * Displays multiple related cartoon images in a horizontal scrollable row
 * Used when users generate multiple variations of the same scene
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSettings } from '../contexts/SettingsContext';
import LottieView from 'lottie-react-native';

const { width: screenWidth } = Dimensions.get('window');
const CARD_WIDTH = screenWidth * 0.75; // Each image takes 75% of screen width
const CARD_HEIGHT = CARD_WIDTH * 1.2; // 4:5 aspect ratio

export default function StoryTellerCard({
  story,
  onImagePress,
  onLikePress,
  isLiked,
  onMenuPress,
  onCommentPress,
  onSharePress,
  onPromptPress,
  onImageLoad, // Callback when image loads for caching
}) {
  const { themeColors, accentPreset } = useSettings();
  const [loadingStates, setLoadingStates] = useState({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const primaryColor = accentPreset?.buttonBackground || themeColors.primary;

  const handleImageLoadStart = (imageId) => {
    setLoadingStates(prev => ({ ...prev, [imageId]: true }));
  };

  const handleImageLoadEnd = (imageId, imageUrl) => {
    setLoadingStates(prev => ({ ...prev, [imageId]: false }));
    // Notify parent for cache optimization
    if (onImageLoad) {
      onImageLoad(imageUrl);
    }
  };

  const handleScroll = (event) => {
    const contentOffset = event.nativeEvent.contentOffset;
    const viewSize = event.nativeEvent.layoutMeasurement;
    const pageNum = Math.round(contentOffset.x / viewSize.width);
    setCurrentIndex(pageNum);
  };

  return (
    <View style={[styles.container, { backgroundColor: themeColors.card }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: themeColors.divider }]}>
        <View style={styles.headerLeft}>
          <View style={[styles.storyBadge, { backgroundColor: primaryColor + '20' }]}>
            <Ionicons name="images" size={14} color={primaryColor} />
            <Text style={[styles.storyBadgeText, { color: primaryColor }]}>
              Story
            </Text>
          </View>
          <Text style={[styles.storyTitle, { color: themeColors.textPrimary }]}>
            {story.title || story.style}
          </Text>
          <Text style={[styles.imageCount, { color: themeColors.textSecondary }]}>
            {story.images.length} variations
          </Text>
        </View>
        <TouchableOpacity onPress={onMenuPress} activeOpacity={0.7}>
          <Ionicons name="ellipsis-vertical" size={20} color={themeColors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Horizontal Image Scroll */}
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        style={styles.scrollView}
      >
        {story.images.map((image, index) => {
          if (!image?.url) {
            console.warn('[StoryTellerCard] Missing image URL in story', story.id, 'index', index, image);
            return (
              <View key={`missing-${story.id}-${index}`} style={[styles.imageContainer, styles.missingImage]}>
                <Text style={styles.missingText}>Image unavailable</Text>
              </View>
            );
          }
          return (
            <TouchableOpacity
              key={image.id || `${story.id}-${index}`}
              activeOpacity={0.95}
              onPress={() => onImagePress(image, index)}
              style={styles.imageContainer}
            >
              <Image
                source={{ uri: image.url }}
                style={styles.image}
                resizeMode="cover"
                onLoadStart={() => handleImageLoadStart(image.id)}
                onLoadEnd={() => handleImageLoadEnd(image.id, image.url)}
              />
              {loadingStates[image.id] && (
                <View style={styles.loadingOverlay}>
                  <LottieView
                    source={require('../assets/broom.json')}
                    autoPlay
                    loop
                    style={styles.loadingAnimation}
                  />
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Fixed image counter */}
      <View style={[styles.fixedCounter, { backgroundColor: themeColors.card + 'E6' }]}>
        <Text style={[styles.fixedCounterText, { color: themeColors.textPrimary }]}>
          {currentIndex + 1}/{story.images.length}
        </Text>
      </View>

      {/* Page Indicators */}
      <View style={styles.indicators}>
        {story.images.map((_, index) => (
          <View
            key={index}
            style={[
              styles.indicator,
              {
                backgroundColor: index === currentIndex
                  ? primaryColor
                  : themeColors.divider,
                width: index === currentIndex ? 20 : 8,
              }
            ]}
          />
        ))}
      </View>

      {/* Footer */}
      <View style={[styles.footer, { borderTopColor: themeColors.divider }]}>
        <View style={styles.footerLeft}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => onLikePress(story.id)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={isLiked ? "heart" : "heart-outline"}
              size={24}
              color={isLiked ? "#FF4444" : themeColors.textSecondary}
            />
            {story.likes > 0 && (
              <Text style={[styles.actionCount, { color: themeColors.textSecondary }]}>
                {story.likes}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            activeOpacity={0.7}
            onPress={() => onCommentPress && onCommentPress(story)}
          >
            <Ionicons name="chatbubble-outline" size={22} color={themeColors.textSecondary} />
            {story.comments > 0 && (
              <Text style={[styles.actionCount, { color: themeColors.textSecondary }]}>
                {story.comments}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            activeOpacity={0.7}
            onPress={() => onSharePress && onSharePress(story)}
          >
            <Ionicons name="share-outline" size={22} color={themeColors.textSecondary} />
          </TouchableOpacity>
        </View>

        {story.prompt && (
          <TouchableOpacity
            style={[styles.promptButton, { backgroundColor: themeColors.divider + '40' }]}
            activeOpacity={0.7}
            onPress={() => onPromptPress && onPromptPress(story)}
          >
            <Ionicons name="information-circle-outline" size={16} color={themeColors.textSecondary} />
            <Text style={[styles.promptButtonText, { color: themeColors.textSecondary }]}>
              Prompt
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Timestamp */}
      <Text style={[styles.timestamp, { color: themeColors.textSecondary }]}>
        {story.createdAtFormatted || story.createdAt || 'Recently'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    position: 'relative',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  storyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  storyBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  storyTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  imageCount: {
    fontSize: 13,
  },
  scrollView: {
    height: CARD_HEIGHT,
  },
  imageContainer: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  missingImage: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 24,
    padding: 16,
  },
  missingText: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingAnimation: {
    width: 100,
    height: 100,
  },
  fixedCounter: {
    position: 'absolute',
    top: 56,
    right: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    minWidth: 56,
    alignItems: 'center',
    zIndex: 10,
  },
  fixedCounterText: {
    fontSize: 12,
    fontWeight: '700',
  },
  indicators: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
  },
  indicator: {
    height: 8,
    borderRadius: 4,
    transition: 'width 0.3s',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  footerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionCount: {
    fontSize: 13,
    fontWeight: '500',
  },
  promptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  promptButtonText: {
    fontSize: 12,
    fontWeight: '500',
  },
  timestamp: {
    fontSize: 11,
    paddingHorizontal: 12,
    paddingBottom: 10,
  },
});
