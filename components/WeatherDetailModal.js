import React, { useMemo, useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSensors } from '../contexts/SensorsContext';
import { useSettings } from '../contexts/SettingsContext';

const { width } = Dimensions.get('window');

export default function WeatherDetailModal({ visible, onClose }) {
  const { atmosphericPressure, weatherCondition, barometerEnabled } = useSensors();
  const { themeColors, isDarkMode } = useSettings();
  const [pressureHistory, setPressureHistory] = useState([]);

  // Track pressure over time (mock data for now, you can enhance this)
  useEffect(() => {
    if (!atmosphericPressure) return;

    setPressureHistory(prev => {
      const newHistory = [...prev, {
        pressure: atmosphericPressure,
        timestamp: new Date(),
        condition: weatherCondition
      }];
      // Keep last 24 hours
      return newHistory.slice(-24);
    });
  }, [atmosphericPressure, weatherCondition]);

  const styles = useMemo(
    () => createStyles(themeColors, { isDarkMode }),
    [themeColors, isDarkMode]
  );

  const weatherIcon = useMemo(() => {
    switch (weatherCondition) {
      case 'stormy':
        return { icon: 'thunderstorm', emoji: '⛈️', color: '#6366f1' };
      case 'rainy':
        return { icon: 'rainy', emoji: '🌧️', color: '#3b82f6' };
      case 'clear':
        return { icon: 'sunny', emoji: '☀️', color: '#f59e0b' };
      default:
        return { icon: 'partly-sunny', emoji: '⛅', color: '#8b5cf6' };
    }
  }, [weatherCondition]);

  const pressureChange = useMemo(() => {
    if (pressureHistory.length < 2) return 0;
    const recent = pressureHistory[pressureHistory.length - 1].pressure;
    const previous = pressureHistory[pressureHistory.length - 2].pressure;
    return recent - previous;
  }, [pressureHistory]);

  const trend = pressureChange > 0 ? 'rising' : pressureChange < 0 ? 'falling' : 'steady';

  const forecast = useMemo(() => {
    if (trend === 'falling') {
      return weatherCondition === 'clear'
        ? 'Clouds likely developing'
        : 'Rain possible within hours';
    } else if (trend === 'rising') {
      return 'Conditions improving';
    }
    return 'Stable weather expected';
  }, [trend, weatherCondition]);

  if (!barometerEnabled) {
    return null;
  }

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
              <Text style={styles.headerEmoji}>{weatherIcon.emoji}</Text>
              <View>
                <Text style={styles.headerTitle}>Weather Conditions</Text>
                <Text style={styles.headerSubtitle}>Real-time atmospheric data</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={themeColors.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Current Conditions */}
            <View style={styles.currentCard}>
              <Text style={styles.sectionTitle}>Current Conditions</Text>
              <View style={styles.currentRow}>
                <View style={styles.currentMain}>
                  <Text style={styles.pressureValue}>
                    {atmosphericPressure?.toFixed(1) || '--'} hPa
                  </Text>
                  <Text style={[styles.conditionText, { color: weatherIcon.color }]}>
                    {weatherCondition.charAt(0).toUpperCase() + weatherCondition.slice(1)}
                  </Text>
                </View>
                <View style={styles.trendBadge}>
                  <Ionicons
                    name={trend === 'rising' ? 'trending-up' : trend === 'falling' ? 'trending-down' : 'remove'}
                    size={20}
                    color={trend === 'rising' ? '#10b981' : trend === 'falling' ? '#ef4444' : '#6b7280'}
                  />
                  <Text style={styles.trendText}>
                    {trend === 'rising' ? 'Rising' : trend === 'falling' ? 'Falling' : 'Steady'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Forecast */}
            <View style={styles.forecastCard}>
              <View style={styles.forecastHeader}>
                <Ionicons name="telescope-outline" size={20} color={themeColors.primary} />
                <Text style={styles.forecastTitle}>Short-term Forecast</Text>
              </View>
              <Text style={styles.forecastText}>{forecast}</Text>
              <Text style={styles.forecastMeta}>
                Based on pressure {trend === 'steady' ? 'stability' : `${trend} trend`}
              </Text>
            </View>

            {/* Pressure Graph */}
            {pressureHistory.length > 1 && (() => {
              const maxPressure = Math.max(...pressureHistory.map(h => h.pressure));
              const minPressure = Math.min(...pressureHistory.map(h => h.pressure));
              const range = maxPressure - minPressure || 1;

              return (
                <View style={styles.graphCard}>
                  <Text style={styles.sectionTitle}>Pressure History</Text>
                  <Text style={styles.graphSubtitle}>Last {pressureHistory.length} readings</Text>
                  <View style={styles.graph}>
                    {pressureHistory.map((item, index) => {
                      const height = ((item.pressure - minPressure) / range) * 100;

                      return (
                        <View key={index} style={styles.graphBar}>
                          <View
                            style={[
                              styles.bar,
                              {
                                height: `${height}%`,
                                backgroundColor: weatherIcon.color,
                                opacity: 0.3 + (index / pressureHistory.length) * 0.7
                              }
                            ]}
                          />
                        </View>
                      );
                    })}
                  </View>
                  <View style={styles.graphLabels}>
                    <Text style={styles.graphLabel}>{minPressure.toFixed(0)}</Text>
                    <Text style={styles.graphLabel}>{maxPressure.toFixed(0)}</Text>
                  </View>
                </View>
              );
            })()}

            {/* Pressure Zones */}
            <View style={styles.zonesCard}>
              <Text style={styles.sectionTitle}>Pressure Zones</Text>
              <View style={styles.zone}>
                <View style={[styles.zoneDot, { backgroundColor: '#6366f1' }]} />
                <View style={styles.zoneInfo}>
                  <Text style={styles.zoneLabel}>Stormy {'(<'} 1000 hPa)</Text>
                  <Text style={styles.zoneDesc}>Low pressure system, storms likely</Text>
                </View>
              </View>
              <View style={styles.zone}>
                <View style={[styles.zoneDot, { backgroundColor: '#3b82f6' }]} />
                <View style={styles.zoneInfo}>
                  <Text style={styles.zoneLabel}>Rainy (1000-1010 hPa)</Text>
                  <Text style={styles.zoneDesc}>Below average, rain possible</Text>
                </View>
              </View>
              <View style={styles.zone}>
                <View style={[styles.zoneDot, { backgroundColor: '#8b5cf6' }]} />
                <View style={styles.zoneInfo}>
                  <Text style={styles.zoneLabel}>Normal (1010-1020 hPa)</Text>
                  <Text style={styles.zoneDesc}>Standard atmospheric pressure</Text>
                </View>
              </View>
              <View style={styles.zone}>
                <View style={[styles.zoneDot, { backgroundColor: '#f59e0b' }]} />
                <View style={styles.zoneInfo}>
                  <Text style={styles.zoneLabel}>Clear {'(>'} 1020 hPa)</Text>
                  <Text style={styles.zoneDesc}>High pressure, clear skies</Text>
                </View>
              </View>
            </View>

            {/* Info */}
            <View style={styles.infoCard}>
              <Ionicons name="information-circle-outline" size={20} color={themeColors.textSecondary} />
              <Text style={styles.infoText}>
                Atmospheric pressure is measured by your device's barometer.
                Falling pressure often indicates approaching bad weather, while rising pressure suggests improving conditions.
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
    headerEmoji: {
      fontSize: 32
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
    currentCard: {
      backgroundColor: isDarkMode ? palette.card : '#f9fafb',
      borderRadius: 16,
      padding: 20,
      marginBottom: 16
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: palette.textPrimary,
      marginBottom: 12
    },
    currentRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between'
    },
    currentMain: {
      flex: 1
    },
    pressureValue: {
      fontSize: 32,
      fontWeight: '700',
      color: palette.textPrimary,
      marginBottom: 4
    },
    conditionText: {
      fontSize: 16,
      fontWeight: '600'
    },
    trendBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: palette.background,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 12
    },
    trendText: {
      fontSize: 14,
      fontWeight: '600',
      color: palette.textPrimary
    },
    forecastCard: {
      backgroundColor: isDarkMode ? palette.card : '#eff6ff',
      borderRadius: 16,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: isDarkMode ? palette.divider : '#dbeafe'
    },
    forecastHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 8
    },
    forecastTitle: {
      fontSize: 15,
      fontWeight: '600',
      color: palette.textPrimary
    },
    forecastText: {
      fontSize: 16,
      color: palette.textPrimary,
      marginBottom: 6
    },
    forecastMeta: {
      fontSize: 13,
      color: palette.textSecondary
    },
    graphCard: {
      backgroundColor: isDarkMode ? palette.card : '#f9fafb',
      borderRadius: 16,
      padding: 20,
      marginBottom: 16
    },
    graphSubtitle: {
      fontSize: 13,
      color: palette.textSecondary,
      marginBottom: 16
    },
    graph: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      height: 120,
      gap: 2,
      marginBottom: 8
    },
    graphBar: {
      flex: 1,
      justifyContent: 'flex-end'
    },
    bar: {
      borderRadius: 2
    },
    graphLabels: {
      flexDirection: 'row',
      justifyContent: 'space-between'
    },
    graphLabel: {
      fontSize: 12,
      color: palette.textSecondary,
      fontWeight: '600'
    },
    zonesCard: {
      backgroundColor: isDarkMode ? palette.card : '#f9fafb',
      borderRadius: 16,
      padding: 20,
      marginBottom: 16
    },
    zone: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
      gap: 12
    },
    zoneDot: {
      width: 12,
      height: 12,
      borderRadius: 6
    },
    zoneInfo: {
      flex: 1
    },
    zoneLabel: {
      fontSize: 15,
      fontWeight: '600',
      color: palette.textPrimary,
      marginBottom: 2
    },
    zoneDesc: {
      fontSize: 13,
      color: palette.textSecondary
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
