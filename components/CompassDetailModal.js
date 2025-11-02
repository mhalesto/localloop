import React, { useMemo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSensors } from '../contexts/SensorsContext';
import { useSettings } from '../contexts/SettingsContext';

const { width } = Dimensions.get('window');
const COMPASS_SIZE = width * 0.7;

export default function CompassDetailModal({ visible, onClose }) {
  const { compassHeading, getCompassDirection, compassEnabled } = useSensors();
  const { themeColors, isDarkMode } = useSettings();
  const rotationAnim = useRef(new Animated.Value(0)).current;
  const previousHeading = useRef(0);

  // Animate compass rotation smoothly
  useEffect(() => {
    if (!visible) return;

    // Calculate shortest rotation path
    let targetRotation = -compassHeading;
    const currentRotation = previousHeading.current;
    let delta = targetRotation - currentRotation;

    // Normalize delta to -180 to 180
    while (delta > 180) delta -= 360;
    while (delta < -180) delta += 360;

    const newRotation = currentRotation + delta;
    previousHeading.current = newRotation;

    Animated.spring(rotationAnim, {
      toValue: newRotation,
      useNativeDriver: true,
      tension: 40,
      friction: 10
    }).start();
  }, [compassHeading, visible]);

  const styles = useMemo(
    () => createStyles(themeColors, { isDarkMode }),
    [themeColors, isDarkMode]
  );

  const direction = getCompassDirection();
  const headingDegrees = Math.round(compassHeading);

  const cardinalDirections = [
    { label: 'N', degrees: 0, color: '#ef4444' },
    { label: 'NE', degrees: 45, color: '#f59e0b' },
    { label: 'E', degrees: 90, color: '#10b981' },
    { label: 'SE', degrees: 135, color: '#06b6d4' },
    { label: 'S', degrees: 180, color: '#3b82f6' },
    { label: 'SW', degrees: 225, color: '#8b5cf6' },
    { label: 'W', degrees: 270, color: '#ec4899' },
    { label: 'NW', degrees: 315, color: '#f43f5e' }
  ];

  const currentCardinal = useMemo(() => {
    return cardinalDirections.find(d => d.label === direction);
  }, [direction]);

  if (!compassEnabled) {
    return null;
  }

  const rotation = rotationAnim.interpolate({
    inputRange: [-360, 360],
    outputRange: ['-360deg', '360deg']
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Ionicons name="compass" size={32} color={themeColors.primary} />
              <View>
                <Text style={styles.headerTitle}>Compass Navigation</Text>
                <Text style={styles.headerSubtitle}>Real-time directional guidance</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={themeColors.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Current Heading */}
            <View style={styles.headingCard}>
              <Text style={styles.headingLabel}>Current Heading</Text>
              <View style={styles.headingRow}>
                <Text style={[styles.headingValue, { color: currentCardinal?.color || themeColors.primary }]}>
                  {direction}
                </Text>
                <Text style={styles.headingDegrees}>{headingDegrees}°</Text>
              </View>
            </View>

            {/* Live Compass */}
            <View style={styles.compassContainer}>
              <View style={[styles.compass, { width: COMPASS_SIZE, height: COMPASS_SIZE }]}>
                {/* Outer circle */}
                <View style={styles.compassCircle}>
                  {/* Cardinal marks */}
                  <Animated.View
                    style={[
                      styles.compassRose,
                      { transform: [{ rotate: rotation }] }
                    ]}
                  >
                    {cardinalDirections.map((dir, index) => {
                      const angle = (dir.degrees * Math.PI) / 180;
                      const radius = COMPASS_SIZE / 2 - 40;
                      const x = Math.sin(angle) * radius;
                      const y = -Math.cos(angle) * radius;

                      return (
                        <View
                          key={dir.label}
                          style={[
                            styles.cardinalMark,
                            {
                              transform: [
                                { translateX: x },
                                { translateY: y }
                              ]
                            }
                          ]}
                        >
                          <Text
                            style={[
                              styles.cardinalLabel,
                              {
                                color: dir.label === 'N' ? '#ef4444' : themeColors.textPrimary,
                                fontWeight: dir.label === 'N' ? '800' : '600'
                              }
                            ]}
                          >
                            {dir.label}
                          </Text>
                        </View>
                      );
                    })}

                    {/* Compass needle */}
                    <View style={styles.needle}>
                      <View style={[styles.needleNorth, { backgroundColor: '#ef4444' }]} />
                      <View style={[styles.needleSouth, { backgroundColor: '#ffffff' }]} />
                    </View>
                  </Animated.View>

                  {/* Center dot */}
                  <View style={styles.centerDot} />
                </View>

                {/* Fixed pointer at top */}
                <View style={styles.fixedPointer}>
                  <View style={styles.pointerTriangle} />
                </View>
              </View>

              <Text style={styles.compassHint}>
                The red needle always points North
              </Text>
            </View>

            {/* Cardinal Directions Guide */}
            <View style={styles.directionsCard}>
              <Text style={styles.sectionTitle}>Cardinal Directions</Text>
              <View style={styles.directionsGrid}>
                {cardinalDirections.map(dir => (
                  <View
                    key={dir.label}
                    style={[
                      styles.directionItem,
                      dir.label === direction && styles.directionItemActive
                    ]}
                  >
                    <View style={[styles.directionDot, { backgroundColor: dir.color }]} />
                    <View style={styles.directionInfo}>
                      <Text style={styles.directionLabel}>{dir.label}</Text>
                      <Text style={styles.directionDegrees}>{dir.degrees}°</Text>
                    </View>
                    {dir.label === direction && (
                      <Ionicons name="checkmark-circle" size={20} color={dir.color} />
                    )}
                  </View>
                ))}
              </View>
            </View>

            {/* Usage Tips */}
            <View style={styles.tipsCard}>
              <Text style={styles.sectionTitle}>How to Use</Text>
              <View style={styles.tip}>
                <Ionicons name="walk-outline" size={20} color={themeColors.primary} />
                <Text style={styles.tipText}>
                  Walk in any direction and the compass will update in real-time
                </Text>
              </View>
              <View style={styles.tip}>
                <Ionicons name="navigate-outline" size={20} color={themeColors.primary} />
                <Text style={styles.tipText}>
                  Use this to find posts in specific directions from your location
                </Text>
              </View>
              <View style={styles.tip}>
                <Ionicons name="location-outline" size={20} color={themeColors.primary} />
                <Text style={styles.tipText}>
                  Combine with activity detection for smart directional discovery
                </Text>
              </View>
            </View>

            {/* Info */}
            <View style={styles.infoCard}>
              <Ionicons name="information-circle-outline" size={20} color={themeColors.textSecondary} />
              <Text style={styles.infoText}>
                The compass uses your device's magnetometer to detect magnetic north.
                Accuracy may be affected by nearby magnetic fields or metal objects.
              </Text>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (palette, { isDarkMode }) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end'
    },
    modal: {
      backgroundColor: palette.background,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      maxHeight: '90%',
      paddingBottom: 20
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 20,
      borderBottomWidth: 1,
      borderBottomColor: palette.divider
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      flex: 1
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: palette.textPrimary
    },
    headerSubtitle: {
      fontSize: 13,
      color: palette.textSecondary,
      marginTop: 2
    },
    closeButton: {
      padding: 8
    },
    content: {
      padding: 20
    },
    headingCard: {
      backgroundColor: isDarkMode ? palette.card : '#f9fafb',
      borderRadius: 16,
      padding: 20,
      marginBottom: 24,
      alignItems: 'center'
    },
    headingLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: palette.textSecondary,
      marginBottom: 8
    },
    headingRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: 12
    },
    headingValue: {
      fontSize: 48,
      fontWeight: '800',
      letterSpacing: -1
    },
    headingDegrees: {
      fontSize: 24,
      fontWeight: '600',
      color: palette.textSecondary
    },
    compassContainer: {
      alignItems: 'center',
      marginBottom: 24
    },
    compass: {
      position: 'relative',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 12
    },
    compassCircle: {
      width: '100%',
      height: '100%',
      borderRadius: 1000,
      backgroundColor: isDarkMode ? palette.card : '#ffffff',
      borderWidth: 3,
      borderColor: palette.divider,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOpacity: isDarkMode ? 0.3 : 0.1,
      shadowRadius: 20,
      shadowOffset: { width: 0, height: 10 },
      elevation: 5
    },
    compassRose: {
      position: 'absolute',
      width: '100%',
      height: '100%',
      alignItems: 'center',
      justifyContent: 'center'
    },
    cardinalMark: {
      position: 'absolute',
      alignItems: 'center',
      justifyContent: 'center'
    },
    cardinalLabel: {
      fontSize: 18,
      fontWeight: '700'
    },
    needle: {
      position: 'absolute',
      width: 6,
      height: '60%',
      alignItems: 'center'
    },
    needleNorth: {
      width: 0,
      height: 0,
      backgroundColor: 'transparent',
      borderStyle: 'solid',
      borderLeftWidth: 8,
      borderRightWidth: 8,
      borderBottomWidth: 60,
      borderLeftColor: 'transparent',
      borderRightColor: 'transparent',
      marginBottom: 4
    },
    needleSouth: {
      width: 0,
      height: 0,
      backgroundColor: 'transparent',
      borderStyle: 'solid',
      borderLeftWidth: 8,
      borderRightWidth: 8,
      borderTopWidth: 40,
      borderLeftColor: 'transparent',
      borderRightColor: 'transparent'
    },
    centerDot: {
      width: 16,
      height: 16,
      borderRadius: 8,
      backgroundColor: palette.textPrimary,
      borderWidth: 3,
      borderColor: '#ffffff'
    },
    fixedPointer: {
      position: 'absolute',
      top: -10,
      alignItems: 'center'
    },
    pointerTriangle: {
      width: 0,
      height: 0,
      backgroundColor: 'transparent',
      borderStyle: 'solid',
      borderLeftWidth: 8,
      borderRightWidth: 8,
      borderTopWidth: 14,
      borderLeftColor: 'transparent',
      borderRightColor: 'transparent',
      borderTopColor: palette.primary
    },
    compassHint: {
      fontSize: 13,
      color: palette.textSecondary,
      textAlign: 'center'
    },
    directionsCard: {
      backgroundColor: isDarkMode ? palette.card : '#f9fafb',
      borderRadius: 16,
      padding: 20,
      marginBottom: 16
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: palette.textPrimary,
      marginBottom: 16
    },
    directionsGrid: {
      gap: 10
    },
    directionItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      borderRadius: 12,
      backgroundColor: palette.background,
      gap: 12
    },
    directionItemActive: {
      borderWidth: 2,
      borderColor: palette.primary
    },
    directionDot: {
      width: 10,
      height: 10,
      borderRadius: 5
    },
    directionInfo: {
      flex: 1
    },
    directionLabel: {
      fontSize: 15,
      fontWeight: '600',
      color: palette.textPrimary
    },
    directionDegrees: {
      fontSize: 13,
      color: palette.textSecondary,
      marginTop: 2
    },
    tipsCard: {
      backgroundColor: isDarkMode ? palette.card : '#f9fafb',
      borderRadius: 16,
      padding: 20,
      marginBottom: 16
    },
    tip: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
      marginBottom: 14
    },
    tipText: {
      flex: 1,
      fontSize: 14,
      color: palette.textPrimary,
      lineHeight: 20
    },
    infoCard: {
      flexDirection: 'row',
      gap: 10,
      backgroundColor: isDarkMode ? palette.card : '#fef3c7',
      borderRadius: 12,
      padding: 14,
      borderWidth: 1,
      borderColor: isDarkMode ? palette.divider : '#fde68a'
    },
    infoText: {
      flex: 1,
      fontSize: 13,
      color: palette.textSecondary,
      lineHeight: 18
    }
  });
