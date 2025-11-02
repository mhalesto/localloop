import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSensors } from '../contexts/SensorsContext';
import { useSettings } from '../contexts/SettingsContext';

export default function NeighborhoodExplorer() {
  const {
    dailySteps,
    currentActivity,
    proximityRadius,
    atmosphericPressure,
    weatherCondition,
    compassHeading,
    getCompassDirection,
    ambientLight,
    explorationProgress,
    stepCounterEnabled,
    motionDetectionEnabled,
    barometerEnabled,
    compassEnabled,
    ambientLightEnabled
  } = useSensors();

  const { themeColors, isDarkMode } = useSettings();

  const styles = useMemo(
    () => createStyles(themeColors, { isDarkMode }),
    [themeColors, isDarkMode]
  );

  const activityIcon = useMemo(() => {
    switch (currentActivity) {
      case 'WALKING':
        return 'walk';
      case 'RUNNING':
        return 'fitness';
      case 'DRIVING':
        return 'car';
      default:
        return 'body';
    }
  }, [currentActivity]);

  const activityColor = useMemo(() => {
    switch (currentActivity) {
      case 'WALKING':
        return '#10b981';
      case 'RUNNING':
        return '#f59e0b';
      case 'DRIVING':
        return '#3b82f6';
      default:
        return '#6b7280';
    }
  }, [currentActivity]);

  const weatherIcon = useMemo(() => {
    switch (weatherCondition) {
      case 'stormy':
        return 'thunderstorm';
      case 'rainy':
        return 'rainy';
      case 'clear':
        return 'sunny';
      default:
        return 'partly-sunny';
    }
  }, [weatherCondition]);

  const weatherEmoji = useMemo(() => {
    switch (weatherCondition) {
      case 'stormy':
        return '⛈️';
      case 'rainy':
        return '🌧️';
      case 'clear':
        return '☀️';
      default:
        return '⛅';
    }
  }, [weatherCondition]);

  const lightCondition = useMemo(() => {
    if (!ambientLight) return 'Unknown';
    if (ambientLight < 10) return 'Dark';
    if (ambientLight < 50) return 'Dim';
    if (ambientLight < 1000) return 'Indoor';
    if (ambientLight < 10000) return 'Bright';
    return 'Very Bright';
  }, [ambientLight]);

  const distanceInKm = useMemo(() => {
    return (explorationProgress.totalDistance / 1000).toFixed(2);
  }, [explorationProgress.totalDistance]);

  // If no sensors are enabled, don't render anything
  if (!stepCounterEnabled && !motionDetectionEnabled && !barometerEnabled &&
      !compassEnabled && !ambientLightEnabled) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="location" size={24} color={themeColors.primary} />
        <Text style={styles.title}>Neighborhood Explorer</Text>
      </View>

      <View style={styles.statsGrid}>
        {/* Step Counter */}
        {stepCounterEnabled && (
          <View style={styles.statCard}>
            <Ionicons name="footsteps" size={32} color="#10b981" />
            <Text style={styles.statValue}>{dailySteps.toLocaleString()}</Text>
            <Text style={styles.statLabel}>Steps Today</Text>
            <Text style={styles.statSubtext}>{distanceInKm} km traveled</Text>
          </View>
        )}

        {/* Activity Detection */}
        {motionDetectionEnabled && (
          <View style={styles.statCard}>
            <Ionicons name={activityIcon} size={32} color={activityColor} />
            <Text style={[styles.statValue, { color: activityColor }]}>
              {currentActivity}
            </Text>
            <Text style={styles.statLabel}>Current Activity</Text>
            <Text style={styles.statSubtext}>
              {proximityRadius}m discovery radius
            </Text>
          </View>
        )}

        {/* Weather Condition */}
        {barometerEnabled && atmosphericPressure && (
          <View style={styles.statCard}>
            <Text style={styles.weatherEmoji}>{weatherEmoji}</Text>
            <Text style={styles.statValue}>
              {atmosphericPressure.toFixed(0)} hPa
            </Text>
            <Text style={styles.statLabel}>Atmospheric Pressure</Text>
            <Text style={styles.statSubtext}>
              Condition: {weatherCondition}
            </Text>
          </View>
        )}

        {/* Compass Direction */}
        {compassEnabled && (
          <View style={styles.statCard}>
            <Ionicons name="compass" size={32} color="#3b82f6" />
            <Text style={styles.statValue}>{getCompassDirection()}</Text>
            <Text style={styles.statLabel}>Heading</Text>
            <Text style={styles.statSubtext}>
              {Math.round(compassHeading)}°
            </Text>
          </View>
        )}

        {/* Ambient Light */}
        {ambientLightEnabled && ambientLight !== null && (
          <View style={styles.statCard}>
            <Ionicons name="sunny" size={32} color="#f59e0b" />
            <Text style={styles.statValue}>{Math.round(ambientLight)} lux</Text>
            <Text style={styles.statLabel}>Ambient Light</Text>
            <Text style={styles.statSubtext}>{lightCondition}</Text>
          </View>
        )}

        {/* Exploration Progress */}
        {stepCounterEnabled && (
          <View style={styles.statCard}>
            <Ionicons name="trophy" size={32} color="#a855f7" />
            <Text style={styles.statValue}>
              {explorationProgress.neighborhoodCoverage.toFixed(0)}%
            </Text>
            <Text style={styles.statLabel}>Explored</Text>
            <Text style={styles.statSubtext}>
              {explorationProgress.locationsVisited.length} locations
            </Text>
          </View>
        )}
      </View>

      {/* Activity-based Discovery Hint */}
      {motionDetectionEnabled && (
        <View style={styles.hintCard}>
          <Ionicons
            name="information-circle-outline"
            size={18}
            color={themeColors.textSecondary}
          />
          <Text style={styles.hintText}>
            {currentActivity === 'STATIONARY'
              ? 'Showing hyper-local posts within 100m'
              : currentActivity === 'WALKING'
              ? 'Walking mode: discovering posts within 500m'
              : currentActivity === 'RUNNING'
              ? 'Running mode: expanding to 1km radius'
              : 'Moving fast: showing neighborhood-wide posts (5km)'}
          </Text>
        </View>
      )}
    </View>
  );
}

const createStyles = (palette, { isDarkMode }) =>
  StyleSheet.create({
    container: {
      backgroundColor: palette.card,
      borderRadius: 18,
      padding: 20,
      marginBottom: 16,
      shadowColor: '#000',
      shadowOpacity: isDarkMode ? 0.2 : 0.06,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 6 },
      elevation: 3
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 20,
      gap: 10
    },
    title: {
      fontSize: 18,
      fontWeight: '700',
      color: palette.textPrimary
    },
    statsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
      marginBottom: 16
    },
    statCard: {
      flex: 1,
      minWidth: '45%',
      backgroundColor: isDarkMode ? palette.background : '#f9fafb',
      borderRadius: 14,
      padding: 16,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: palette.divider
    },
    weatherEmoji: {
      fontSize: 32,
      marginBottom: 8
    },
    statValue: {
      fontSize: 20,
      fontWeight: '700',
      color: palette.textPrimary,
      marginTop: 8,
      marginBottom: 4
    },
    statLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: palette.textSecondary,
      marginBottom: 2
    },
    statSubtext: {
      fontSize: 11,
      color: palette.textSecondary,
      textAlign: 'center'
    },
    hintCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDarkMode ? palette.background : '#eff6ff',
      borderRadius: 12,
      padding: 12,
      gap: 8,
      borderWidth: 1,
      borderColor: isDarkMode ? palette.divider : '#dbeafe'
    },
    hintText: {
      flex: 1,
      fontSize: 13,
      color: palette.textSecondary,
      lineHeight: 18
    }
  });
