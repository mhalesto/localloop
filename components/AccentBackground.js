import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const scaleOpacity = (v: number, s: number) => clamp01(v * s);

const applyAlphaToRgba = (color: string, scale: number) => {
  const m = color?.match(/rgba\((\d+),(\d+),(\d+),(\d*\.?\d+)\)/i);
  if (!m) return color;
  const [, r, g, b, a] = m;
  const next = clamp01(Number(a) * scale);
  return `rgba(${r},${g},${b},${next})`;
};

function DreamyCloudsBackground({ baseColor, cloudColors, animationDuration, opacityScale }: any) {
  const animated = useRef(new Animated.Value(0)).current;
  const scaledClouds = (cloudColors ?? CLOUD_DEFAULTS.cloudColors).map((c: string) =>
    applyAlphaToRgba(c ?? CLOUD_DEFAULTS.cloudColors[0], clamp01(opacityScale ?? 1))
  );

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(animated, { toValue: 1, duration: animationDuration, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(animated, { toValue: 0, duration: animationDuration, easing: Easing.inOut(Easing.quad), useNativeDriver: true })
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [animated, animationDuration]);

  const t = useMemo(
    () => [
      {
        tx: animated.interpolate({ inputRange: [0, 1], outputRange: [-35, 35] }),
        ty: animated.interpolate({ inputRange: [0, 1], outputRange: [-12, 12] })
      },
      {
        tx: animated.interpolate({ inputRange: [0, 1], outputRange: [25, -25] }),
        ty: animated.interpolate({ inputRange: [0, 1], outputRange: [18, -18] })
      },
      {
        tx: animated.interpolate({ inputRange: [0, 1], outputRange: [-18, 18] }),
        ty: animated.interpolate({ inputRange: [0, 1], outputRange: [22, -12] })
      }
    ],
    [animated]
  );

  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: baseColor }]}>
      <Animated.View pointerEvents="none" style={[styles.cloud, { width: 220, height: 220, top: -80, left: -40, backgroundColor: scaledClouds[0], transform: [{ translateX: t[0].tx }, { translateY: t[0].ty }] }]} />
      <Animated.View pointerEvents="none" style={[styles.cloud, { width: 200, height: 200, top: -60, right: -60, backgroundColor: scaledClouds[1], transform: [{ translateX: t[1].tx }, { translateY: t[1].ty }] }]} />
      <Animated.View pointerEvents="none" style={[styles.cloud, { width: 180, height: 180, bottom: -90, right: 20, backgroundColor: scaledClouds[2], transform: [{ translateX: t[2].tx }, { translateY: t[2].ty }] }]} />
    </View>
  );
}

function ShapesBackground({ baseColor, palette, opacityScale }: any) {
  const { backgroundAccent, primary, secondary, tertiary, quaternary } = { ...SHAPES_DEFAULTS.palette, ...(palette ?? {}) };
  const s = clamp01(opacityScale ?? 1);

  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: baseColor }]}>
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: backgroundAccent, opacity: scaleOpacity(0.55, s) }]} />
      <Svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" style={StyleSheet.absoluteFill}>
        <Rect x="-10" y="64" width="68" height="30" rx="11" fill={secondary} opacity={scaleOpacity(0.38, s)} />
        <Circle cx="90" cy="22" r="16" fill={primary} opacity={scaleOpacity(0.52, s)} />
        <Path d="M18 6 L38 6 L28 24 Z" fill={tertiary} opacity={scaleOpacity(0.6, s)} />
        <Circle cx="70" cy="82" r="11" fill={quaternary} opacity={scaleOpacity(0.65, s)} />
        <Path d="M46 40 C52 28, 68 30, 74 44 C78 54, 70 64, 60 64 C50 64, 42 52, 46 40 Z" fill={primary} opacity={scaleOpacity(0.33, s)} />
        <Rect x="58" y="54" width="26" height="26" rx="6" fill={secondary} opacity={scaleOpacity(0.42, s)} />
        <Path d="M4 82 C10 74, 18 74, 24 82 C30 90, 24 96, 16 94 C8 92, -2 90, 4 82 Z" fill={tertiary} opacity={scaleOpacity(0.45, s)} />
        <Circle cx="30" cy="66" r="9" fill={quaternary} opacity={scaleOpacity(0.5, s)} />
        <Rect x="78" y="6" width="24" height="24" rx="8" fill={secondary} opacity={scaleOpacity(0.35, s)} />
        <Path d="M14 48 L26 32 L38 48 Z" fill={primary} opacity={scaleOpacity(0.3, s)} />
      </Svg>
    </View>
  );
}

/**
 * AccentBackground
 * - Bleeds into the system status bar area so shapes aren’t cut off.
 * - Keeps shapes visible and scaled with your “Theme darkness” (never 0).
 */
export default function AccentBackground({ accent, style, bleedIntoStatusBar = true }: any) {
  const insets = useSafeAreaInsets();
  const backgroundStyle = accent?.backgroundStyle;

  if (!backgroundStyle) return null;

  // Ensure shapes are always at least lightly visible even with low scale
  const normalizedScale = Math.max(0.25, Number(backgroundStyle?.options?.opacityScale ?? 1));

  const containerStyle = [
    StyleSheet.absoluteFill,
    style,
    bleedIntoStatusBar && { marginTop: -insets.top, paddingTop: insets.top }
  ];

  if (backgroundStyle.type === 'dreamyClouds') {
    const cfg = { ...CLOUD_DEFAULTS, ...backgroundStyle.options, opacityScale: normalizedScale };
    return (
      <View pointerEvents="none" style={containerStyle}>
        <DreamyCloudsBackground {...cfg} />
      </View>
    );
  }

  if (backgroundStyle.type === 'playfulShapes') {
    const cfg = { ...SHAPES_DEFAULTS, ...backgroundStyle.options, opacityScale: normalizedScale };
    return (
      <View pointerEvents="none" style={containerStyle}>
        <ShapesBackground {...cfg} />
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
