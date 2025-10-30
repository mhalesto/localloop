import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, PanResponder, StyleSheet, View } from 'react-native';

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const snapToStep = (value, step, min) => {
  if (!step || step <= 0) {
    return value;
  }
  const rounded = Math.round((value - min) / step) * step + min;
  return rounded;
};

const THUMB_SIZE = 24;

export default function PremiumSlider({
  value,
  minimumValue = 0,
  maximumValue = 1,
  step = 1,
  onValueChange,
  onSlidingComplete,
  trackColor = 'rgba(255,255,255,0.15)',
  fillColor = '#6C4DF5',
  thumbColor = '#6C4DF5',
  style,
  disabled = false
}) {
  const [trackWidth, setTrackWidth] = useState(0);
  const currentRef = useRef(value ?? minimumValue);
  const isDraggingRef = useRef(false);
  const animatedPercent = useRef(new Animated.Value(0)).current;

  const range = maximumValue - minimumValue || 1;
  const percent = useMemo(() => {
    if (maximumValue <= minimumValue) {
      return 0;
    }
    const clamped = clamp(
      typeof value === 'number' ? value : minimumValue,
      minimumValue,
      maximumValue
    );
    return (clamped - minimumValue) / range;
  }, [maximumValue, minimumValue, range, value]);

  useEffect(() => {
    animatedPercent.setValue(percent);
  }, [animatedPercent, percent]);

  const effectiveWidth = useMemo(
    () => Math.max(1, trackWidth - THUMB_SIZE),
    [trackWidth]
  );

  const updateFromPosition = useCallback(
    (positionX) => {
      if (disabled || effectiveWidth <= 0) {
        return;
      }
      const clampedPosition = clamp(positionX - THUMB_SIZE / 2, 0, effectiveWidth);
      const rawValue = minimumValue + (clampedPosition / effectiveWidth) * range;
      const snapped = step > 0
        ? clamp(snapToStep(rawValue, step, minimumValue), minimumValue, maximumValue)
        : clamp(rawValue, minimumValue, maximumValue);

      currentRef.current = snapped;
      const nextPercent = (snapped - minimumValue) / range;
      animatedPercent.setValue(nextPercent);
      onValueChange?.(snapped);
    },
    [animatedPercent, disabled, effectiveWidth, maximumValue, minimumValue, onValueChange, range, step]
  );

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !disabled,
        onStartShouldSetPanResponderCapture: () => !disabled,
        onMoveShouldSetPanResponder: () => !disabled,
        onMoveShouldSetPanResponderCapture: () => !disabled,
        onPanResponderGrant: (evt) => {
          isDraggingRef.current = true;
          updateFromPosition(evt.nativeEvent.locationX);
        },
        onPanResponderMove: (evt) => {
          updateFromPosition(evt.nativeEvent.locationX);
        },
        onPanResponderRelease: (evt) => {
          updateFromPosition(evt.nativeEvent.locationX);
          onSlidingComplete?.(currentRef.current);
          isDraggingRef.current = false;
        },
        onPanResponderTerminationRequest: () => true,
        onPanResponderTerminate: () => {
          onSlidingComplete?.(currentRef.current);
          isDraggingRef.current = false;
        }
      }),
    [disabled, onSlidingComplete, updateFromPosition]
  );

  useEffect(() => {
    if (!isDraggingRef.current) {
      animatedPercent.setValue(percent);
    }
  }, [animatedPercent, percent]);

  const fillWidth = animatedPercent.interpolate({
    inputRange: [0, 1],
    outputRange: [THUMB_SIZE / 2, effectiveWidth + THUMB_SIZE / 2],
    extrapolate: 'clamp'
  });

  const thumbTranslate = animatedPercent.interpolate({
    inputRange: [0, 1],
    outputRange: [0, effectiveWidth],
    extrapolate: 'clamp'
  });

  return (
    <View
      style={[styles.container, style]}
      onLayout={(event) => {
        setTrackWidth(event.nativeEvent.layout.width);
      }}
      {...panResponder.panHandlers}
    >
      <View style={[styles.track, { backgroundColor: trackColor }]} />
      <Animated.View
        style={[styles.fill, { width: fillWidth, backgroundColor: fillColor }]}
      />
      <Animated.View
        style={[
          styles.thumb,
          {
            backgroundColor: thumbColor,
            transform: [{ translateX: thumbTranslate }]
          }
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 32,
    borderRadius: 20,
    justifyContent: 'center'
  },
  track: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 6,
    borderRadius: 6,
    opacity: 0.6
  },
  fill: {
    position: 'absolute',
    left: 0,
    height: 6,
    borderRadius: 6
  },
  thumb: {
    position: 'absolute',
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3
  }
});
