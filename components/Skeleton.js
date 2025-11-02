import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSettings } from '../contexts/SettingsContext';

/**
 * Skeleton - Shimmer animated placeholder for loading states
 *
 * Features:
 * - Beautiful shimmer gradient animation
 * - Auto-adapts to light/dark theme
 * - Multiple variants (circle, rounded, rectangle)
 *
 * Usage:
 * <Skeleton width={100} height={20} />
 * <Skeleton variant="circle" size={50} />
 * <Skeleton variant="rounded" width="100%" height={200} />
 */
export default function Skeleton({
  width,
  height,
  variant = 'rectangle', // 'rectangle', 'circle', 'rounded'
  size, // shorthand for width/height when same
  style,
  borderRadius,
}) {
  const { themeColors, isDarkMode } = useSettings();
  const shimmerAnim = useRef(new Animated.Value(-1)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: 1500,
        useNativeDriver: true,
      })
    );
    animation.start();

    return () => animation.stop();
  }, [shimmerAnim]);

  const getVariantStyle = () => {
    switch (variant) {
      case 'circle':
        const circleSize = size || width || height || 50;
        return {
          width: circleSize,
          height: circleSize,
          borderRadius: circleSize / 2,
        };
      case 'rounded':
        return {
          width: size || width || 100,
          height: size || height || 20,
          borderRadius: borderRadius || 8,
        };
      case 'rectangle':
      default:
        return {
          width: size || width || 100,
          height: size || height || 20,
          borderRadius: borderRadius || 4,
        };
    }
  };

  const variantStyle = getVariantStyle();

  // Calculate the shimmer translateX
  const translateX = shimmerAnim.interpolate({
    inputRange: [-1, 1],
    outputRange: [-(variantStyle.width || 100) * 1.2, (variantStyle.width || 100) * 1.2],
  });

  // Theme-based colors
  const baseColor = isDarkMode ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)';
  const shimmerColors = isDarkMode
    ? [
        'rgba(255, 255, 255, 0.06)',
        'rgba(255, 255, 255, 0.15)',
        'rgba(255, 255, 255, 0.06)',
      ]
    : [
        'rgba(0, 0, 0, 0.06)',
        'rgba(0, 0, 0, 0.12)',
        'rgba(0, 0, 0, 0.06)',
      ];

  return (
    <View
      style={[
        styles.skeleton,
        { backgroundColor: baseColor },
        variantStyle,
        style,
      ]}
    >
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          {
            transform: [{ translateX }],
          },
        ]}
      >
        <LinearGradient
          colors={shimmerColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  skeleton: {
    overflow: 'hidden',
    backgroundColor: 'rgba(0, 0, 0, 0.06)',
  },
});
