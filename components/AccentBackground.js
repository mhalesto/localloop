import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

/** ===== Defaults ===== */
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
  opacityScale: 1,
  // new options
  sideShapesCount: 8,       // how many small pills/circles peek from sides
  headerVariant: 'ribbon',  // 'ribbon' | 'halo' | 'blocks'
  scope: 'body'             // 'body' or 'header' (AppHeader passes header)
};

/** ===== Helpers ===== */
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const scaleOpacity = (value, scale) => clamp01(value * scale);

const applyAlphaToRgba = (color, scale) => {
  if (typeof color !== 'string') return color;
  const m = color.match(/rgba\((\d+),(\d+),(\d+),(\d*\.?\d+)\)/i);
  if (!m) return color;
  const [, r, g, b, a] = m;
  const nextA = clamp01(Number(a) * scale);
  return `rgba(${r},${g},${b},${nextA})`;
};

// deterministic PRNG so shapes don't jump on every render
const mulberry32 = (seed) => {
  let t = seed >>> 0;
  return () => {
    t += 0x6D2B79F5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
};

/** ===== Clouds variant ===== */
function DreamyCloudsBackground({ baseColor, cloudColors, animationDuration, opacityScale }) {
  const animated = useRef(new Animated.Value(0)).current;
  const effectiveScale = clamp01(opacityScale ?? 1);
  const scaledClouds = (cloudColors ?? CLOUD_DEFAULTS.cloudColors).map((c) =>
    applyAlphaToRgba(c ?? CLOUD_DEFAULTS.cloudColors[0], effectiveScale)
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

  const cloudTransforms = useMemo(
    () => [
      {
        translateX: animated.interpolate({ inputRange: [0, 1], outputRange: [-35, 35] }),
        translateY: animated.interpolate({ inputRange: [0, 1], outputRange: [-12, 12] })
      },
      {
        translateX: animated.interpolate({ inputRange: [0, 1], outputRange: [25, -25] }),
        translateY: animated.interpolate({ inputRange: [0, 1], outputRange: [18, -18] })
      },
      {
        translateX: animated.interpolate({ inputRange: [0, 1], outputRange: [-18, 18] }),
        translateY: animated.interpolate({ inputRange: [0, 1], outputRange: [22, -12] })
      }
    ],
    [animated]
  );

  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: baseColor }]}>
      <Animated.View pointerEvents="none" style={[styles.cloud, {
        width: 220, height: 220, top: -80, left: -40,
        backgroundColor: scaledClouds[0] ?? CLOUD_DEFAULTS.cloudColors[0],
        transform: [{ translateX: cloudTransforms[0].translateX }, { translateY: cloudTransforms[0].translateY }]
      }]} />
      <Animated.View pointerEvents="none" style={[styles.cloud, {
        width: 200, height: 200, top: -60, right: -60,
        backgroundColor: scaledClouds[1] ?? CLOUD_DEFAULTS.cloudColors[1],
        transform: [{ translateX: cloudTransforms[1].translateX }, { translateY: cloudTransforms[1].translateY }]
      }]} />
      <Animated.View pointerEvents="none" style={[styles.cloud, {
        width: 180, height: 180, bottom: -90, right: 20,
        backgroundColor: scaledClouds[2] ?? CLOUD_DEFAULTS.cloudColors[2],
        transform: [{ translateX: cloudTransforms[2].translateX }, { translateY: cloudTransforms[2].translateY }]
      }]} />
    </View>
  );
}

/** ===== Playful Shapes (body + edges + header hero) ===== */
function ShapesSVG({
  width,
  height,
  palette,
  baseColor,
  opacityScale,
  sideShapesCount = 8,
  scope = 'body',
  headerVariant = 'ribbon'
}) {
  const { backgroundAccent, primary, secondary, tertiary, quaternary } = {
    ...SHAPES_DEFAULTS.palette,
    ...(palette ?? {})
  };
  const scale = clamp01(opacityScale ?? 1);

  // Base layer
  const baseLayer = (
    <>
      <Rect x="-10" y="64" width="68" height="30" rx="11" fill={secondary} opacity={scaleOpacity(0.38, scale)} />
      <Circle cx="90" cy="22" r="16" fill={primary} opacity={scaleOpacity(0.52, scale)} />
      <Path d="M18 6 L38 6 L28 24 Z" fill={tertiary} opacity={scaleOpacity(0.6, scale)} />
      <Circle cx="70" cy="82" r="11" fill={quaternary} opacity={scaleOpacity(0.65, scale)} />
      <Path d="M46 40 C52 28, 68 30, 74 44 C78 54, 70 64, 60 64 C50 64, 42 52, 46 40 Z"
        fill={primary} opacity={scaleOpacity(0.33, scale)} />
      <Rect x="58" y="54" width="26" height="26" rx="6" fill={secondary} opacity={scaleOpacity(0.42, scale)} />
      <Path d="M4 82 C10 74, 18 74, 24 82 C30 90, 24 96, 16 94 C8 92, -2 90, 4 82 Z"
        fill={tertiary} opacity={scaleOpacity(0.45, scale)} />
      <Circle cx="30" cy="66" r="9" fill={quaternary} opacity={scaleOpacity(0.5, scale)} />
      <Rect x="78" y="6" width="24" height="24" rx="8" fill={secondary} opacity={scaleOpacity(0.35, scale)} />
      <Path d="M14 48 L26 32 L38 48 Z" fill={primary} opacity={scaleOpacity(0.3, scale)} />
    </>
  );

  // Edge “peek” shapes along left/right
  const seed = Math.round(width * 97 + height * 71);
  const rand = mulberry32(seed);
  const colors = [primary, secondary, tertiary, quaternary];

  const edges = Array.from({ length: sideShapesCount }).map((_, i) => {
    const leftSide = rand() > 0.5;
    const y = rand() * 100;           // 0..100 viewport Y
    const r = 6 + rand() * 10;        // radius/size
    const isCircle = rand() > 0.45;
    const color = colors[i % colors.length];
    const x = leftSide ? -r * 0.7 : 100 + r * 0.7; // slightly off-screen
    const op = scaleOpacity(0.24 + rand() * 0.2, scale);

    if (isCircle) {
      return <Circle key={`edge-c-${i}`} cx={x} cy={y} r={r} fill={color} opacity={op} />;
    }
    const w = 10 + rand() * 20;
    const h = 6 + rand() * 16;
    const rx = 3 + rand() * 6;
    return <Rect key={`edge-r-${i}`} x={x - w / 2} y={y - h / 2} width={w} height={h} rx={rx} fill={color} opacity={op} />;
  });

  // Header “hero” composition
  const hero =
    scope !== 'header'
      ? null
      : {
        ribbon: (
          <>
            {/* soft background wash */}
            <Rect x="-10" y="-10" width="130" height="70" rx="24" fill={backgroundAccent} opacity={scaleOpacity(0.45, scale)} />
            {/* big diagonal ribbon */}
            <Path
              d="M-10,30 C30,10 70,20 110,0 L110,-10 L-10,-10 Z"
              fill={tertiary}
              opacity={scaleOpacity(0.45, scale)}
            />
            {/* accents */}
            <Circle cx="92" cy="20" r="14" fill={primary} opacity={scaleOpacity(0.6, scale)} />
            <Rect x="12" y="48" width="36" height="14" rx="7" fill={quaternary} opacity={scaleOpacity(0.65, scale)} />
          </>
        ),
        halo: (
          <>
            <Circle cx="-8" cy="-8" r="36" fill={primary} opacity={scaleOpacity(0.45, scale)} />
            <Circle cx="20" cy="6" r="18" fill={secondary} opacity={scaleOpacity(0.45, scale)} />
            <Rect x="70" y="0" width="40" height="20" rx="10" fill={tertiary} opacity={scaleOpacity(0.4, scale)} />
          </>
        ),
        blocks: (
          <>
            <Rect x="-12" y="-8" width="58" height="28" rx="10" fill={secondary} opacity={scaleOpacity(0.5, scale)} />
            <Rect x="30" y="18" width="48" height="18" rx="8" fill={tertiary} opacity={scaleOpacity(0.45, scale)} />
            <Circle cx="90" cy="6" r="12" fill={primary} opacity={scaleOpacity(0.55, scale)} />
          </>
        )
      }[headerVariant] ?? null;

  return (
    <Svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" style={StyleSheet.absoluteFill}>
      {/* subtle wash */}
      <Rect x="0" y="0" width="100" height="100" fill={baseColor} opacity={scaleOpacity(0.55, opacityScale ?? 1)} />
      {scope === 'header' ? hero : baseLayer}
      {edges}
    </Svg>
  );
}

/** ===== Public component =====
 * region: 'body' | 'header' — AppHeader passes 'header'
 */
export default function AccentBackground({ accent, style, region = 'body' }) {
  const backgroundStyle = accent?.backgroundStyle;
  const [size, setSize] = useState({ w: 0, h: 0 });
  const onLayout = (e) => {
    const { width, height } = e.nativeEvent.layout;
    if (width !== size.w || height !== size.h) setSize({ w: width, h: height });
  };

  if (!backgroundStyle) return null;

  // Dreamy clouds
  if (backgroundStyle.type === 'dreamyClouds') {
    const config = { ...CLOUD_DEFAULTS, ...(backgroundStyle.options || {}) };
    return (
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, style]} onLayout={onLayout}>
        <DreamyCloudsBackground
          baseColor={config.baseColor}
          cloudColors={config.cloudColors}
          animationDuration={config.animationDuration}
          opacityScale={config.opacityScale}
        />
      </View>
    );
  }

  // Playful shapes with edge + header hero
  if (backgroundStyle.type === 'playfulShapes') {
    const merged = { ...SHAPES_DEFAULTS, ...(backgroundStyle.options || {}) };
    return (
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, style]} onLayout={onLayout}>
        {/* subtle back wash so shapes don't get cut by status bar; keep transparent look */}
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: merged.baseColor, opacity: 0.0 }]} />
        {size.w > 0 && size.h > 0 ? (
          <ShapesSVG
            width={size.w}
            height={size.h}
            palette={merged.palette}
            baseColor={merged.baseColor}
            opacityScale={merged.opacityScale}
            sideShapesCount={merged.sideShapesCount}
            scope={region === 'header' ? 'header' : 'body'}
            headerVariant={merged.headerVariant}
          />
        ) : null}
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
