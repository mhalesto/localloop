/**
 * Cartoon Generation Progress Component
 * Shows broom animation while AI avatar is being generated
 * Can be minimized to continue using the app
 * Sends notification when complete if enabled
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
  Platform,
} from 'react-native';
import LottieView from 'lottie-react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSettings } from '../contexts/SettingsContext';
import { scheduleLocalNotification } from '../services/notificationsService';

export default function CartoonGenerationProgress({
  visible,
  onClose,
  onComplete,
  styleName = 'AI Avatar',
  notifyWhenDone = false,
  isStoryTeller = false,
  totalImages = 1,
  currentImage = 1,
  completedImages = 0,
}) {
  const { themeColors } = useSettings();
  const [isMinimized, setIsMinimized] = useState(false);
  const [generationComplete, setGenerationComplete] = useState(false);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  // Debug logging
  useEffect(() => {
    if (visible) {
      console.log('[CartoonGenerationProgress] 🎯 Progress modal visible with:', {
        isStoryTeller,
        totalImages,
        currentImage,
        completedImages,
        styleName,
      });
    }
  }, [visible, isStoryTeller, totalImages, currentImage, completedImages]);

  // Animate minimize/maximize
  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: isMinimized ? 1 : 0,
      useNativeDriver: true,
      tension: 50,
      friction: 8,
    }).start();

    Animated.spring(scaleAnim, {
      toValue: isMinimized ? 0.6 : 1,
      useNativeDriver: true,
      tension: 50,
      friction: 8,
    }).start();
  }, [isMinimized]);

  // Animate progress bar
  useEffect(() => {
    if (isStoryTeller && totalImages > 0) {
      const progress = completedImages / totalImages;
      Animated.spring(progressAnim, {
        toValue: progress,
        useNativeDriver: false,
        tension: 50,
        friction: 8,
      }).start();
    }
  }, [completedImages, totalImages, isStoryTeller]);

  const handleMinimize = () => {
    setIsMinimized(true);
  };

  const handleMaximize = () => {
    setIsMinimized(false);
  };

  const handleComplete = async () => {
    setGenerationComplete(true);

    // Send notification if enabled
    if (notifyWhenDone) {
      await scheduleLocalNotification({
        title: '✨ AI Avatar Ready!',
        body: `Your ${styleName} avatar has been generated successfully.`,
        data: { type: 'cartoon_generation_complete' },
      });
    }

    // Call onComplete callback
    if (onComplete) {
      onComplete();
    }
  };

  if (!visible) return null;

  // Minimized floating widget
  if (isMinimized) {
    return (
      <Animated.View
        style={[
          styles.minimizedContainer,
          {
            backgroundColor: themeColors.card,
            borderColor: themeColors.divider,
            transform: [
              {
                translateY: slideAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [500, 0],
                }),
              },
              { scale: scaleAnim },
            ],
          },
        ]}
      >
        <TouchableOpacity
          style={styles.minimizedContent}
          onPress={handleMaximize}
          activeOpacity={0.8}
        >
          <View style={styles.minimizedAnimation}>
            <LottieView
              source={require('../assets/broom.json')}
              autoPlay
              loop
              style={styles.minimizedLottie}
            />
          </View>
          <View style={styles.minimizedTextContainer}>
            <Text style={[styles.minimizedTitle, { color: themeColors.textPrimary }]}>
              {isStoryTeller ? `${completedImages}/${totalImages} images` : 'Generating...'}
            </Text>
            <Text style={[styles.minimizedSubtitle, { color: themeColors.textSecondary }]}>
              Tap to expand
            </Text>
          </View>
          <TouchableOpacity
            style={styles.minimizedCloseButton}
            onPress={(e) => {
              e.stopPropagation();
              onClose();
            }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close" size={16} color={themeColors.textSecondary} />
          </TouchableOpacity>
        </TouchableOpacity>
      </Animated.View>
    );
  }

  // Full modal view
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: themeColors.card }]}>
          {/* Header with minimize button */}
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: themeColors.textPrimary }]}>
              Generating {styleName}
            </Text>
            <View style={styles.headerButtons}>
              <TouchableOpacity
                style={[styles.iconButton, { backgroundColor: themeColors.divider }]}
                onPress={handleMinimize}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="remove" size={20} color={themeColors.textPrimary} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.iconButton, { backgroundColor: themeColors.divider, marginLeft: 8 }]}
                onPress={onClose}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={20} color={themeColors.textPrimary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Broom animation */}
          <View style={styles.animationContainer}>
            <LottieView
              source={require('../assets/broom.json')}
              autoPlay
              loop
              style={styles.lottieAnimation}
            />
          </View>

          {/* Progress text */}
          <View style={styles.textContainer}>
            {isStoryTeller ? (
              <>
                <Text style={[styles.progressTitle, { color: themeColors.textPrimary }]}>
                  Generating image {currentImage} of {totalImages}
                </Text>
                <Text style={[styles.progressSubtitle, { color: themeColors.textSecondary }]}>
                  Creating your Story Teller collection...
                </Text>

                {/* Progress Bar */}
                <View style={styles.progressBarContainer}>
                  <View style={[styles.progressBarTrack, { backgroundColor: themeColors.divider }]}>
                    <Animated.View
                      style={[
                        styles.progressBarFill,
                        {
                          backgroundColor: themeColors.primary,
                          width: progressAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: ['0%', '100%'],
                          }),
                        },
                      ]}
                    />
                  </View>
                  <Text style={[styles.progressPercentage, { color: themeColors.textSecondary }]}>
                    {Math.round((completedImages / totalImages) * 100)}%
                  </Text>
                </View>

                {/* Individual Image Status */}
                <View style={styles.imageStatusContainer}>
                  {Array.from({ length: totalImages }).map((_, index) => (
                    <View
                      key={index}
                      style={[
                        styles.imageStatusDot,
                        {
                          backgroundColor:
                            index < completedImages
                              ? '#4CAF50'
                              : index === completedImages
                              ? themeColors.primary
                              : themeColors.divider,
                        },
                      ]}
                    >
                      {index < completedImages && (
                        <Ionicons name="checkmark" size={12} color="#FFF" />
                      )}
                      {index === completedImages && !generationComplete && (
                        <View style={styles.pulsingDot} />
                      )}
                    </View>
                  ))}
                </View>
              </>
            ) : (
              <>
                <Text style={[styles.progressTitle, { color: themeColors.textPrimary }]}>
                  Creating your AI avatar...
                </Text>
                <Text style={[styles.progressSubtitle, { color: themeColors.textSecondary }]}>
                  This usually takes 10-30 seconds
                </Text>
              </>
            )}

            {notifyWhenDone && (
              <View style={styles.notificationBadge}>
                <Ionicons name="notifications" size={14} color="#6C4DF4" />
                <Text style={styles.notificationText}>
                  You'll be notified when it's ready
                </Text>
              </View>
            )}
          </View>

          {/* Minimize hint */}
          <TouchableOpacity
            style={[styles.minimizeHint, { backgroundColor: `${themeColors.primary}15` }]}
            onPress={handleMinimize}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-down" size={16} color={themeColors.primary} />
            <Text style={[styles.minimizeHintText, { color: themeColors.primary }]}>
              Minimize and continue browsing
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  // Full modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  animationContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 200,
    marginBottom: 24,
  },
  lottieAnimation: {
    width: 200,
    height: 200,
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  progressTitle: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  progressSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  notificationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F3F0FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginTop: 12,
  },
  notificationText: {
    fontSize: 12,
    color: '#6C4DF4',
    fontWeight: '500',
  },
  minimizeHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  minimizeHintText: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Minimized widget styles
  minimizedContainer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 100 : 80,
    right: 16,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 1000,
  },
  minimizedContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 10,
  },
  minimizedAnimation: {
    width: 40,
    height: 40,
  },
  minimizedLottie: {
    width: 40,
    height: 40,
  },
  minimizedTextContainer: {
    flex: 1,
  },
  minimizedTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  minimizedSubtitle: {
    fontSize: 11,
  },
  minimizedCloseButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Story Teller progress styles
  progressBarContainer: {
    marginTop: 20,
    marginBottom: 16,
    width: '100%',
  },
  progressBarTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressPercentage: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  imageStatusContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginTop: 12,
  },
  imageStatusDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  pulsingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFF',
  },
});
