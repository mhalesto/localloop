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
import AnimatedWeatherBackground from './AnimatedWeatherBackground';

const { width, height } = Dimensions.get('window');

export default function FullScreenWeatherModal({ visible, onClose }) {
  const { atmosphericPressure, weatherCondition, pressureHistory } = useSensors();
  const { themeColors, isDarkMode } = useSettings();

  const styles = useMemo(
    () => createStyles(themeColors, { isDarkMode }),
    [themeColors, isDarkMode]
  );

  // Determine if it's night time
  const currentHour = new Date().getHours();
  const isNight = currentHour < 6 || currentHour >= 20;
  const isDawn = currentHour >= 6 && currentHour < 8;
  const isDusk = currentHour >= 18 && currentHour < 20;

  // Weather condition mapping with time-aware gradients
  const weatherInfo = useMemo(() => {
    const baseTemp = 30;

    // Night time gradients
    if (isNight) {
      switch (weatherCondition) {
        case 'stormy':
          return {
            icon: 'thunderstorm',
            description: 'Thunderstorms',
            gradient: ['#1a1a2e', '#0f0f1e', '#05050a'],
            temp: baseTemp - 4
          };
        case 'rainy':
          return {
            icon: 'rainy',
            description: 'Rain',
            gradient: ['#1e2630', '#151a23', '#0a0d12'],
            temp: baseTemp - 3
          };
        case 'clear':
          return {
            icon: 'moon',
            description: 'Clear Night',
            gradient: ['#0f2847', '#0a1929', '#050a14'],
            temp: baseTemp - 5
          };
        default:
          return {
            icon: 'cloudy-night',
            description: 'Partly Cloudy',
            gradient: ['#243548', '#1a2635', '#0f1722'],
            temp: baseTemp - 4
          };
      }
    }

    // Dawn gradients
    if (isDawn) {
      switch (weatherCondition) {
        case 'stormy':
          return {
            icon: 'thunderstorm',
            description: 'Thunderstorms',
            gradient: ['#3d4e6e', '#2a3550', '#1a2133'],
            temp: baseTemp - 2
          };
        case 'rainy':
          return {
            icon: 'rainy',
            description: 'Rain',
            gradient: ['#5a6b8a', '#3f4e6a', '#2a3548'],
            temp: baseTemp - 1
          };
        case 'clear':
          return {
            icon: 'partly-sunny',
            description: 'Sunrise',
            gradient: ['#ff9a76', '#ff7f66', '#ff6b55'],
            temp: baseTemp - 1
          };
        default:
          return {
            icon: 'partly-sunny',
            description: 'Partly Cloudy',
            gradient: ['#7a8ba3', '#5a6b85', '#3f4e68'],
            temp: baseTemp - 1
          };
      }
    }

    // Dusk gradients
    if (isDusk) {
      switch (weatherCondition) {
        case 'stormy':
          return {
            icon: 'thunderstorm',
            description: 'Thunderstorms',
            gradient: ['#3d4e6e', '#2a3550', '#1a2133'],
            temp: baseTemp
          };
        case 'rainy':
          return {
            icon: 'rainy',
            description: 'Rain',
            gradient: ['#5a6b8a', '#3f4e6a', '#2a3548'],
            temp: baseTemp
          };
        case 'clear':
          return {
            icon: 'partly-sunny',
            description: 'Sunset',
            gradient: ['#ff7e5f', '#feb47b', '#ff9a76'],
            temp: baseTemp + 1
          };
        default:
          return {
            icon: 'partly-sunny',
            description: 'Partly Cloudy',
            gradient: ['#7a8ba3', '#5a6b85', '#3f4e68'],
            temp: baseTemp
          };
      }
    }

    // Day time gradients
    switch (weatherCondition) {
      case 'stormy':
        return {
          icon: 'thunderstorm',
          description: 'Thunderstorms',
          gradient: ['#4a5568', '#2d3748', '#1a202c'],
          temp: baseTemp - 2
        };
      case 'rainy':
        return {
          icon: 'rainy',
          description: 'Rain',
          gradient: ['#667eea', '#4a5568', '#2d3748'],
          temp: baseTemp - 1
        };
      case 'clear':
        return {
          icon: 'sunny',
          description: 'Clear Sky',
          gradient: ['#56ccf2', '#2f80ed', '#2d9cdb'],
          temp: baseTemp + 2
        };
      default:
        return {
          icon: 'partly-sunny',
          description: 'Partly Cloudy',
          gradient: ['#89a9c7', '#6b8cae', '#4d6f91'],
          temp: baseTemp
        };
    }
  }, [weatherCondition, isNight, isDawn, isDusk]);

  // Generate 24-hour forecast data with realistic icons
  const hourlyForecast = useMemo(() => {
    const forecast = [];
    const now = new Date();

    for (let i = 0; i < 24; i++) {
      const time = new Date(now.getTime() + i * 60 * 60 * 1000);
      const hour = time.getHours();
      const hourIsNight = hour < 6 || hour >= 20;
      const hourIsDawn = hour >= 6 && hour < 8;
      const hourIsDusk = hour >= 18 && hour < 20;

      // Simulate temperature variation throughout the day
      let temp = weatherInfo.temp;
      if (hour >= 0 && hour < 6) temp -= 3; // Cooler at night
      else if (hour >= 6 && hour < 9) temp -= 1; // Cool morning
      else if (hour >= 9 && hour < 12) temp += 1; // Warming up
      else if (hour >= 12 && hour < 16) temp += 3; // Warmest
      else if (hour >= 16 && hour < 19) temp += 1; // Cooling down
      else temp -= 2; // Evening

      // Determine realistic icon based on time and weather
      let icon;
      if (weatherCondition === 'stormy') {
        icon = 'thunderstorm';
      } else if (weatherCondition === 'rainy') {
        icon = 'rainy';
      } else if (hourIsNight) {
        // Night icons
        if (weatherCondition === 'clear') {
          icon = 'moon';
        } else {
          icon = 'cloudy-night';
        }
      } else if (hourIsDawn || hourIsDusk) {
        // Dawn/Dusk icons
        icon = 'partly-sunny';
      } else {
        // Day icons
        if (weatherCondition === 'clear') {
          icon = 'sunny';
        } else {
          icon = 'partly-sunny';
        }
      }

      forecast.push({
        time: hour === 0 ? '12AM' : hour < 12 ? `${hour}AM` : hour === 12 ? '12PM' : `${hour - 12}PM`,
        hour,
        temp: Math.round(temp),
        icon,
        isNight: hourIsNight
      });
    }

    return forecast;
  }, [weatherInfo.temp, weatherCondition]);

  // Generate 10-day forecast with varied weather
  const dailyForecast = useMemo(() => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const weatherIcons = ['sunny', 'partly-sunny', 'cloudy', 'rainy', 'thunderstorm'];
    const forecast = [];
    const now = new Date();

    for (let i = 0; i < 10; i++) {
      const date = new Date(now.getTime() + i * 24 * 60 * 60 * 1000);
      const dayName = i === 0 ? 'Today' : days[date.getDay()];

      // Vary weather realistically over days
      let icon;
      let tempAdjust = 0;

      if (i === 0) {
        // Today - use current condition
        icon = weatherCondition === 'stormy' ? 'thunderstorm' :
               weatherCondition === 'rainy' ? 'rainy' :
               weatherCondition === 'clear' ? 'sunny' : 'partly-sunny';
      } else if (i === 1 || i === 2) {
        // Next couple days - similar to current
        icon = weatherCondition === 'stormy' ? 'rainy' :
               weatherCondition === 'rainy' ? 'cloudy' : 'partly-sunny';
        tempAdjust = -1;
      } else if (i === 3 || i === 4) {
        // Mid-range forecast - improving
        icon = 'partly-sunny';
        tempAdjust = 1;
      } else if (i === 5 || i === 6) {
        // Later days - clear
        icon = 'sunny';
        tempAdjust = 2;
      } else {
        // Far forecast - varied
        icon = i % 2 === 0 ? 'partly-sunny' : 'cloudy';
        tempAdjust = 0;
      }

      // Simulate temperature ranges with realistic variation
      const high = weatherInfo.temp + tempAdjust + Math.floor(Math.random() * 3);
      const low = high - 8 - Math.floor(Math.random() * 3);

      forecast.push({
        day: dayName,
        icon,
        high,
        low
      });
    }

    return forecast;
  }, [weatherInfo.temp, weatherCondition]);

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
        <AnimatedWeatherBackground condition={weatherCondition} isNight={isNight} />
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
                {hourlyForecast.map((item, index) => {
                  // Determine icon color based on type
                  const getIconColor = () => {
                    if (item.icon === 'moon' || item.icon === 'cloudy-night') return '#a78bfa'; // Purple for night
                    if (item.icon === 'sunny') return '#fbbf24'; // Yellow/gold for sun
                    if (item.icon === 'partly-sunny') return '#fcd34d'; // Light yellow for partly sunny
                    if (item.icon === 'cloudy') return '#d1d5db'; // Light gray for clouds
                    if (item.icon === 'thunderstorm') return '#f472b6'; // Pink for storms
                    if (item.icon === 'rainy') return '#60a5fa'; // Blue for rain
                    return '#e5e7eb'; // Default light gray
                  };

                  return (
                    <View key={index} style={styles.hourlyItem}>
                      <Text style={styles.hourlyTime}>
                        {index === 0 ? 'Now' : item.time}
                      </Text>
                      <Ionicons name={item.icon} size={28} color={getIconColor()} />
                      <Text style={styles.hourlyTemp}>{item.temp}°</Text>
                    </View>
                  );
                })}
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
              {dailyForecast.map((item, index) => {
                // Determine icon color based on type
                const getDailyIconColor = () => {
                  if (item.icon === 'sunny') return '#fbbf24'; // Yellow/gold for sun
                  if (item.icon === 'partly-sunny') return '#fcd34d'; // Light yellow for partly sunny
                  if (item.icon === 'cloudy') return '#d1d5db'; // Light gray for clouds
                  if (item.icon === 'thunderstorm') return '#f472b6'; // Pink for storms
                  if (item.icon === 'rainy') return '#60a5fa'; // Blue for rain
                  if (item.icon === 'moon') return '#a78bfa'; // Purple for moon
                  if (item.icon === 'cloudy-night') return '#a78bfa'; // Purple for cloudy night
                  return '#e5e7eb'; // Default light gray
                };

                return (
                  <View key={index} style={styles.dailyItem}>
                    <Text style={styles.dailyDay}>{item.day}</Text>
                    <Ionicons name={item.icon} size={24} color={getDailyIconColor()} />
                    <View style={styles.dailyTemps}>
                      <Text style={styles.dailyLow}>{item.low}°</Text>
                      <View style={styles.tempBar}>
                        <View style={styles.tempBarFill} />
                      </View>
                      <Text style={styles.dailyHigh}>{item.high}°</Text>
                    </View>
                  </View>
                );
              })}
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
