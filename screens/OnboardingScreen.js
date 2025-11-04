import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Dimensions,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSettings } from '../contexts/SettingsContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const ONBOARDING_STEPS = [
  {
    id: '1',
    icon: 'home',
    title: 'Welcome to LocalLoop',
    description: 'Connect with your community and discover what\'s happening around you in real-time.',
    color: '#6366f1'
  },
  {
    id: '2',
    icon: 'location',
    title: 'Explore Nearby',
    description: 'Browse statuses from people in your area. See what your neighbors are talking about.',
    color: '#38bdf8'
  },
  {
    id: '3',
    icon: 'create',
    title: 'Share Your Thoughts',
    description: 'Create posts with text and images. Let your community know what\'s on your mind.',
    color: '#f59e0b'
  },
  {
    id: '4',
    icon: 'heart',
    title: 'React & Reply',
    description: 'Engage with posts by reacting with hearts and leaving replies. Join the conversation.',
    color: '#f472b6'
  },
  {
    id: '5',
    icon: 'compass',
    title: 'Discover Content',
    description: 'Explore trending statuses and discover popular posts from your community.',
    color: '#2dd4bf'
  },
  {
    id: '6',
    icon: 'person',
    title: 'Personalize Your Profile',
    description: 'Set your nickname, location, and avatar. Make your profile uniquely yours.',
    color: '#a78bfa'
  }
];

export default function OnboardingScreen({ onComplete }) {
  const insets = useSafeAreaInsets();
  const { themeColors, isDarkMode } = useSettings();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef(null);

  const styles = React.useMemo(
    () => createStyles(themeColors, insets, isDarkMode),
    [themeColors, insets, isDarkMode]
  );

  const handleComplete = async () => {
    try {
      await AsyncStorage.setItem('@onboarding_completed', 'true');
      onComplete?.();
    } catch (error) {
      console.error('Error saving onboarding status:', error);
      onComplete?.();
    }
  };

  const handleNext = () => {
    if (currentIndex < ONBOARDING_STEPS.length - 1) {
      const nextIndex = currentIndex + 1;
      flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
      setCurrentIndex(nextIndex);
    } else {
      handleComplete();
    }
  };

  const handleSkip = () => {
    handleComplete();
  };

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index || 0);
    }
  }).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50
  }).current;

  const renderItem = ({ item }) => (
    <View style={styles.slide}>
      <View style={[styles.iconContainer, { backgroundColor: `${item.color}20` }]}>
        <Ionicons name={item.icon} size={80} color={item.color} />
      </View>
      <Text style={styles.title}>{item.title}</Text>
      <Text style={styles.description}>{item.description}</Text>
    </View>
  );

  const isLastSlide = currentIndex === ONBOARDING_STEPS.length - 1;

  return (
    <View style={styles.container}>
      {/* Skip Button */}
      {!isLastSlide && (
        <TouchableOpacity
          style={styles.skipButton}
          onPress={handleSkip}
          activeOpacity={0.7}
        >
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      )}

      {/* Slides */}
      <FlatList
        ref={flatListRef}
        data={ONBOARDING_STEPS}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        scrollEnabled={true}
        bounces={false}
        decelerationRate="fast"
      />

      {/* Pagination Dots */}
      <View style={styles.pagination}>
        {ONBOARDING_STEPS.map((_, index) => (
          <View
            key={index}
            style={[
              styles.dot,
              index === currentIndex ? styles.activeDot : styles.inactiveDot,
              { backgroundColor: index === currentIndex ? themeColors.primary : themeColors.textSecondary }
            ]}
          />
        ))}
      </View>

      {/* Next/Done Button */}
      <TouchableOpacity
        style={[styles.nextButton, { backgroundColor: themeColors.primary }]}
        onPress={handleNext}
        activeOpacity={0.9}
      >
        <Text style={styles.nextButtonText}>
          {isLastSlide ? 'Get Started' : 'Next'}
        </Text>
        {!isLastSlide && (
          <Ionicons name="arrow-forward" size={20} color="#fff" style={styles.nextButtonIcon} />
        )}
      </TouchableOpacity>
    </View>
  );
}

const createStyles = (palette, insets, isDarkMode) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: palette.background,
      paddingTop: insets.top + 20,
      paddingBottom: insets.bottom + 20
    },
    skipButton: {
      position: 'absolute',
      top: insets.top + 20,
      right: 20,
      zIndex: 10,
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'
    },
    skipText: {
      fontSize: 15,
      fontWeight: '600',
      color: palette.textSecondary
    },
    slide: {
      width: SCREEN_WIDTH,
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 40
    },
    iconContainer: {
      width: 160,
      height: 160,
      borderRadius: 80,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 40,
      shadowColor: '#000',
      shadowOpacity: Platform.OS === 'android' ? 0 : (isDarkMode ? 0.3 : 0.1),
      shadowRadius: Platform.OS === 'android' ? 0 : 20,
      shadowOffset: { width: 0, height: Platform.OS === 'android' ? 0 : 10 },
      elevation: 0
    },
    title: {
      fontSize: 28,
      fontWeight: '700',
      color: palette.textPrimary,
      textAlign: 'center',
      marginBottom: 16,
      letterSpacing: -0.5
    },
    description: {
      fontSize: 16,
      lineHeight: 24,
      color: palette.textSecondary,
      textAlign: 'center',
      maxWidth: 320
    },
    pagination: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 32,
      gap: 8
    },
    dot: {
      width: 8,
      height: 8,
      borderRadius: 4
    },
    activeDot: {
      width: 24,
      borderRadius: 4
    },
    inactiveDot: {
      opacity: 0.3
    },
    nextButton: {
      marginHorizontal: 40,
      marginBottom: 20,
      paddingVertical: 16,
      borderRadius: 14,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOpacity: 0.15,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 8 },
      elevation: 6
    },
    nextButtonText: {
      fontSize: 17,
      fontWeight: '700',
      color: '#fff'
    },
    nextButtonIcon: {
      marginLeft: 8
    }
  });
