import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

const CLOUD_DEFAULTS = {
  baseColor: '#F9E6FA',
  cloudColors: ['rgba(255,255,255,0.65)', 'rgba(255,255,255,0.42)', 'rgba(255,255,255,0.28)'],
  animationDuration: 14000,
  opacityScale: 1
};

const SHAPES_DEFAULTS = {
  baseColor: '#F1F3FF',
  palette: {
    backgroundAccent: '#E7E9FF',
    primary: '#ECB2DE',
    secondary: '#F5D6A5',
    tertiary: '#9DD4FF',
    quaternary: '#7BD8C6'
  },
  opacityScale: 1
};

const clamp01 = (value) => Math.max(0, Math.min(1, value));

const scaleOpacity = (value, scale) => clamp01(value * scale);

const applyAlphaToRgba = (color, scale) => {
  if (typeof color !== 'string') {
    return color;
  }
  const match = color.match(/rgba\((\d+),(\d+),(\d+),(\d*\.?\d+)\)/i);
  if (!match) {
    return color;
  }
  const [, r, g, b, a] = match;
  const nextAlpha = clamp01(Number(a) * scale);
  return `rgba(${r},${g},${b},${nextAlpha})`;
};

function DreamyCloudsBackground({ baseColor, cloudColors, animationDuration, opacityScale }) {
  const animated = useRef(new Animated.Value(0)).current;
  const effectiveScale = clamp01(opacityScale ?? 1);
  const scaledClouds = (cloudColors ?? CLOUD_DEFAULTS.cloudColors).map((color) =>
    applyAlphaToRgba(color ?? CLOUD_DEFAULTS.cloudColors[0], effectiveScale)
  );

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(animated, {
          toValue: 1,
          duration: animationDuration,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true
        }),
        Animated.timing(animated, {
          toValue: 0,
          duration: animationDuration,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true
        })
      ])
    );
    loop.start();
    return () => {
      loop.stop();
    };
  }, [animated, animationDuration]);

  const cloudTransforms = useMemo(
    () => [
      {
        translateX: animated.interpolate({
          inputRange: [0, 1],
          outputRange: [-35, 35]
        }),
        translateY: animated.interpolate({
          inputRange: [0, 1],
          outputRange: [-12, 12]
        })
      },
      {
        translateX: animated.interpolate({
          inputRange: [0, 1],
          outputRange: [25, -25]
        }),
        translateY: animated.interpolate({
          inputRange: [0, 1],
          outputRange: [18, -18]
        })
      },
      {
        translateX: animated.interpolate({
          inputRange: [0, 1],
          outputRange: [-18, 18]
        }),
        translateY: animated.interpolate({
          inputRange: [0, 1],
          outputRange: [22, -12]
        })
      }
    ],
    [animated]
  );

  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: baseColor }]}>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.cloud,
          {
            width: 220,
            height: 220,
            top: -80,
            left: -40,
            backgroundColor: scaledClouds[0] ?? CLOUD_DEFAULTS.cloudColors[0],
            transform: [{ translateX: cloudTransforms[0].translateX }, { translateY: cloudTransforms[0].translateY }]
          }
        ]}
      />
      <Animated.View
        pointerEvents="none"
        style={[
          styles.cloud,
          {
            width: 200,
            height: 200,
            top: -60,
            right: -60,
            backgroundColor: scaledClouds[1] ?? CLOUD_DEFAULTS.cloudColors[1],
            transform: [{ translateX: cloudTransforms[1].translateX }, { translateY: cloudTransforms[1].translateY }]
          }
        ]}
      />
      <Animated.View
        pointerEvents="none"
        style={[
          styles.cloud,
          {
            width: 180,
            height: 180,
            bottom: -90,
            right: 20,
            backgroundColor: scaledClouds[2] ?? CLOUD_DEFAULTS.cloudColors[2],
            transform: [{ translateX: cloudTransforms[2].translateX }, { translateY: cloudTransforms[2].translateY }]
          }
        ]}
      />
    </View>
  );
}

function ShapesBackground({ baseColor, palette, opacityScale }) {
  const { backgroundAccent, primary, secondary, tertiary, quaternary } = {
    ...SHAPES_DEFAULTS.palette,
    ...(palette ?? {})
  };
  const scale = clamp01(opacityScale ?? 1);

  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: baseColor }]}>
      <View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { backgroundColor: backgroundAccent, opacity: scaleOpacity(0.55, scale) }]}
      />
      <Svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" style={StyleSheet.absoluteFill}>
        <Rect x="-10" y="64" width="68" height="30" rx="11" fill={secondary} opacity={scaleOpacity(0.38, scale)} />
        <Circle cx="90" cy="22" r="16" fill={primary} opacity={scaleOpacity(0.52, scale)} />
        <Path d="M18 6 L38 6 L28 24 Z" fill={tertiary} opacity={scaleOpacity(0.6, scale)} />
        <Circle cx="70" cy="82" r="11" fill={quaternary} opacity={scaleOpacity(0.65, scale)} />
        <Path d="M46 40 C52 28, 68 30, 74 44 C78 54, 70 64, 60 64 C50 64, 42 52, 46 40 Z" fill={primary} opacity={scaleOpacity(0.33, scale)} />
        <Rect x="58" y="54" width="26" height="26" rx="6" fill={secondary} opacity={scaleOpacity(0.42, scale)} />
        <Path d="M4 82 C10 74, 18 74, 24 82 C30 90, 24 96, 16 94 C8 92, -2 90, 4 82 Z" fill={tertiary} opacity={scaleOpacity(0.45, scale)} />
        <Circle cx="30" cy="66" r="9" fill={quaternary} opacity={scaleOpacity(0.5, scale)} />
        <Rect x="78" y="6" width="24" height="24" rx="8" fill={secondary} opacity={scaleOpacity(0.35, scale)} />
        <Path d="M14 48 L26 32 L38 48 Z" fill={primary} opacity={scaleOpacity(0.3, scale)} />
      </Svg>
    </View>
  );
}

export default function AccentBackground({ accent, style }) {
  const backgroundStyle = accent?.backgroundStyle;

  if (!backgroundStyle) {
    return null;
  }

  if (backgroundStyle.type === 'dreamyClouds') {
    const config = {
      ...CLOUD_DEFAULTS,
      ...backgroundStyle.options
    };
    return (
      <View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, style]}
      >
        <DreamyCloudsBackground
          baseColor={config.baseColor}
          cloudColors={config.cloudColors}
          animationDuration={config.animationDuration}
          opacityScale={config.opacityScale}
        />
      </View>
    );
  }

  if (backgroundStyle.type === 'playfulShapes') {
    const config = {
      ...SHAPES_DEFAULTS,
      ...backgroundStyle.options
    };
    return (
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, style]}>
        <ShapesBackground
          baseColor={config.baseColor}
          palette={config.palette}
          opacityScale={config.opacityScale}
        />
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  cloud: {
    position: 'absolute',
    borderRadius: 120,
    opacity: 0.9,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 6 }
  }
});
