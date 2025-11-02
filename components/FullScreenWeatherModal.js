import React, { useMemo } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  StatusBar
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSensors } from '../contexts/SensorsContext';
import { useSettings } from '../contexts/SettingsContext';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

export default function FullScreenWeatherModal({ visible, onClose }) {
  const { atmosphericPressure, weatherCondition, pressureHistory } = useSensors();
  const { themeColors, isDarkMode } = useSettings();

  const styles = useMemo(
    () => createStyles(themeColors, { isDarkMode }),
    [themeColors, isDarkMode]
  );

  // Weather condition mapping
  const weatherInfo = useMemo(() => {
    switch (weatherCondition) {
      case 'stormy':
        return {
          icon: 'thunderstorm',
          description: 'Thunderstorms',
          gradient: ['#2D3561', '#1F1F3A', '#0F0F1E'],
          temp: 28
        };
      case 'rainy':
        return {
          icon: 'rainy',
          description: 'Rain',
          gradient: ['#3A4A5E', '#2C3847', '#1E2630'],
          temp: 26
        };
      case 'clear':
        return {
          icon: 'sunny',
          description: 'Clear',
          gradient: ['#5374E7', '#3E5BA9', '#2A4073'],
          temp: 32
        };
      default:
        return {
          icon: 'partly-sunny',
          description: 'Partly Cloudy',
          gradient: ['#4A5F7D', '#374A62', '#243548'],
          temp: 30
        };
    }
  }, [weatherCondition]);

  // Generate 24-hour forecast data
  const hourlyForecast = useMemo(() => {
    const forecast = [];
    const now = new Date();

    for (let i = 0; i < 24; i++) {
      const time = new Date(now.getTime() + i * 60 * 60 * 1000);
      const hour = time.getHours();

      // Simulate temperature variation throughout the day
      let temp = weatherInfo.temp;
      if (hour >= 0 && hour < 6) temp -= 3; // Cooler at night
      else if (hour >= 6 && hour < 12) temp += 1; // Warming up
      else if (hour >= 12 && hour < 18) temp += 2; // Warmest
      else temp -= 1; // Cooling down

      // Vary weather conditions slightly
      let condition = weatherCondition;
      let icon = weatherInfo.icon;

      forecast.push({
        time: hour === 0 ? '12AM' : hour < 12 ? `${hour}AM` : hour === 12 ? '12PM' : `${hour - 12}PM`,
        hour,
        temp: Math.round(temp),
        icon,
        condition
      });
    }

    return forecast;
  }, [weatherInfo.temp, weatherCondition, weatherInfo.icon]);

  // Generate 10-day forecast
  const dailyForecast = useMemo(() => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const forecast = [];
    const now = new Date();

    for (let i = 0; i < 10; i++) {
      const date = new Date(now.getTime() + i * 24 * 60 * 60 * 1000);
      const dayName = i === 0 ? 'Today' : days[date.getDay()];

      // Simulate temperature ranges
      const high = weatherInfo.temp + Math.floor(Math.random() * 4);
      const low = high - 8 - Math.floor(Math.random() * 3);

      forecast.push({
        day: dayName,
        icon: i % 3 === 0 ? 'rainy' : i % 2 === 0 ? 'partly-sunny' : 'sunny',
        high,
        low
      });
    }

    return forecast;
  }, [weatherInfo.temp]);

  const currentTemp = Math.round(weatherInfo.temp);
  const highTemp = Math.max(...hourlyForecast.slice(0, 24).map(h => h.temp));
  const lowTemp = Math.min(...hourlyForecast.slice(0, 24).map(h => h.temp));

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <LinearGradient
        colors={weatherInfo.gradient}
        style={styles.container}
      >
        <StatusBar barStyle="light-content" />

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="chevron-back" size={28} color="#ffffff" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuButton}>
            <Ionicons name="ellipsis-horizontal" size={24} color="#ffffff" />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Location & Current Weather */}
          <View style={styles.currentWeather}>
            <Text style={styles.location}>Your Location</Text>
            <Text style={styles.currentTemp}>{currentTemp}°</Text>
            <Text style={styles.description}>{weatherInfo.description}</Text>
            <Text style={styles.hiLow}>H:{highTemp}° L:{lowTemp}°</Text>
          </View>

          {/* Hourly Forecast */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="time-outline" size={16} color="rgba(255,255,255,0.6)" />
              <Text style={styles.sectionTitle}>HOURLY FORECAST</Text>
            </View>
            <View style={styles.hourlyContainer}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.hourlyContent}
              >
                {hourlyForecast.map((item, index) => (
                  <View key={index} style={styles.hourlyItem}>
                    <Text style={styles.hourlyTime}>
                      {index === 0 ? 'Now' : item.time}
                    </Text>
                    <Ionicons name={item.icon} size={28} color="#ffffff" />
                    <Text style={styles.hourlyTemp}>{item.temp}°</Text>
                  </View>
                ))}
              </ScrollView>
            </View>
          </View>

          {/* 10-Day Forecast */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="calendar-outline" size={16} color="rgba(255,255,255,0.6)" />
              <Text style={styles.sectionTitle}>10-DAY FORECAST</Text>
            </View>
            <View style={styles.dailyContainer}>
              {dailyForecast.map((item, index) => (
                <View key={index} style={styles.dailyItem}>
                  <Text style={styles.dailyDay}>{item.day}</Text>
                  <Ionicons name={item.icon} size={24} color="#ffffff" />
                  <View style={styles.dailyTemps}>
                    <Text style={styles.dailyLow}>{item.low}°</Text>
                    <View style={styles.tempBar}>
                      <View style={styles.tempBarFill} />
                    </View>
                    <Text style={styles.dailyHigh}>{item.high}°</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* Weather Details */}
          <View style={styles.section}>
            <View style={styles.detailsGrid}>
              <View style={styles.detailCard}>
                <View style={styles.detailHeader}>
                  <Ionicons name="speedometer-outline" size={16} color="rgba(255,255,255,0.6)" />
                  <Text style={styles.detailTitle}>PRESSURE</Text>
                </View>
                <Text style={styles.detailValue}>
                  {atmosphericPressure ? `${atmosphericPressure.toFixed(0)} hPa` : 'N/A'}
                </Text>
                <Text style={styles.detailSubtext}>
                  {atmosphericPressure && atmosphericPressure < 1000
                    ? 'Low pressure system'
                    : 'High pressure system'}
                </Text>
              </View>

              <View style={styles.detailCard}>
                <View style={styles.detailHeader}>
                  <Ionicons name="water-outline" size={16} color="rgba(255,255,255,0.6)" />
                  <Text style={styles.detailTitle}>HUMIDITY</Text>
                </View>
                <Text style={styles.detailValue}>65%</Text>
                <Text style={styles.detailSubtext}>The dew point is 18° right now</Text>
              </View>

              <View style={styles.detailCard}>
                <View style={styles.detailHeader}>
                  <Ionicons name="eye-outline" size={16} color="rgba(255,255,255,0.6)" />
                  <Text style={styles.detailTitle}>VISIBILITY</Text>
                </View>
                <Text style={styles.detailValue}>10 km</Text>
                <Text style={styles.detailSubtext}>Clear visibility</Text>
              </View>

              <View style={styles.detailCard}>
                <View style={styles.detailHeader}>
                  <Ionicons name="sunny-outline" size={16} color="rgba(255,255,255,0.6)" />
                  <Text style={styles.detailTitle}>UV INDEX</Text>
                </View>
                <Text style={styles.detailValue}>6</Text>
                <Text style={styles.detailSubtext}>High - Use protection</Text>
              </View>
            </View>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Weather data provided by device sensors</Text>
            <Text style={styles.footerText}>Last updated: {new Date().toLocaleTimeString()}</Text>
          </View>
        </ScrollView>
      </LinearGradient>
    </Modal>
  );
}

const createStyles = (palette, { isDarkMode }) =>
  StyleSheet.create({
    container: {
      flex: 1
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingTop: StatusBar.currentHeight || 44,
      paddingHorizontal: 16,
      paddingBottom: 12
    },
    closeButton: {
      width: 40,
      height: 40,
      justifyContent: 'center',
      alignItems: 'flex-start'
    },
    menuButton: {
      width: 40,
      height: 40,
      justifyContent: 'center',
      alignItems: 'flex-end'
    },
    scrollView: {
      flex: 1
    },
    scrollContent: {
      paddingBottom: 40
    },
    currentWeather: {
      alignItems: 'center',
      paddingVertical: 40,
      paddingHorizontal: 20
    },
    location: {
      fontSize: 32,
      fontWeight: '400',
      color: '#ffffff',
      marginBottom: 8
    },
    currentTemp: {
      fontSize: 96,
      fontWeight: '200',
      color: '#ffffff',
      lineHeight: 96,
      marginBottom: 8
    },
    description: {
      fontSize: 24,
      fontWeight: '500',
      color: '#ffffff',
      marginBottom: 4
    },
    hiLow: {
      fontSize: 18,
      fontWeight: '500',
      color: 'rgba(255,255,255,0.8)'
    },
    section: {
      marginTop: 24,
      paddingHorizontal: 16
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 12
    },
    sectionTitle: {
      fontSize: 12,
      fontWeight: '600',
      color: 'rgba(255,255,255,0.6)',
      letterSpacing: 0.5
    },
    hourlyContainer: {
      backgroundColor: 'rgba(255,255,255,0.15)',
      borderRadius: 16,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.2)'
    },
    hourlyContent: {
      paddingVertical: 16,
      paddingHorizontal: 8
    },
    hourlyItem: {
      alignItems: 'center',
      paddingHorizontal: 12,
      gap: 8
    },
    hourlyTime: {
      fontSize: 14,
      fontWeight: '500',
      color: 'rgba(255,255,255,0.8)'
    },
    hourlyTemp: {
      fontSize: 18,
      fontWeight: '500',
      color: '#ffffff'
    },
    dailyContainer: {
      backgroundColor: 'rgba(255,255,255,0.15)',
      borderRadius: 16,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.2)',
      paddingVertical: 8
    },
    dailyItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 10,
      paddingHorizontal: 16,
      gap: 12
    },
    dailyDay: {
      fontSize: 16,
      fontWeight: '500',
      color: '#ffffff',
      width: 80
    },
    dailyTemps: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8
    },
    dailyLow: {
      fontSize: 16,
      fontWeight: '500',
      color: 'rgba(255,255,255,0.5)',
      width: 35,
      textAlign: 'right'
    },
    dailyHigh: {
      fontSize: 16,
      fontWeight: '500',
      color: '#ffffff',
      width: 35
    },
    tempBar: {
      flex: 1,
      height: 4,
      backgroundColor: 'rgba(255,255,255,0.2)',
      borderRadius: 2,
      overflow: 'hidden'
    },
    tempBarFill: {
      height: '100%',
      width: '60%',
      backgroundColor: '#FFA500',
      borderRadius: 2
    },
    detailsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12
    },
    detailCard: {
      flex: 1,
      minWidth: '47%',
      backgroundColor: 'rgba(255,255,255,0.15)',
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.2)'
    },
    detailHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 12
    },
    detailTitle: {
      fontSize: 11,
      fontWeight: '600',
      color: 'rgba(255,255,255,0.6)',
      letterSpacing: 0.5
    },
    detailValue: {
      fontSize: 28,
      fontWeight: '400',
      color: '#ffffff',
      marginBottom: 4
    },
    detailSubtext: {
      fontSize: 13,
      color: 'rgba(255,255,255,0.6)',
      lineHeight: 18
    },
    footer: {
      marginTop: 32,
      paddingHorizontal: 16,
      alignItems: 'center',
      gap: 4
    },
    footerText: {
      fontSize: 12,
      color: 'rgba(255,255,255,0.4)',
      textAlign: 'center'
    }
  });
