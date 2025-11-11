import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const OnboardingContext = createContext(null);

const ONBOARDING_KEY = '@onboarding_completed';

/**
 * Tutorial steps for the onboarding flow
 */
export const TUTORIAL_STEPS = [
  {
    id: 'welcome',
    title: 'Welcome to LocalLoop!',
    description: 'Let\'s take a quick tour to get you started. You can skip any step at any time.',
    placement: 'center',
    targetPosition: null,
  },
  {
    id: 'create_post',
    title: 'Create your first post!',
    description: 'Tap the + button to share your thoughts with your local community',
    placement: 'top',
    targetKey: 'fab_button', // Will be measured dynamically
  },
  {
    id: 'choose_location',
    title: 'Choose your city',
    description: 'Select where you want to post. Only people in the same city will see it!',
    placement: 'top',
    targetKey: 'location_button',
  },
  {
    id: 'write_title',
    title: 'Give it a catchy title',
    description: 'Make your post stand out with a great headline',
    placement: 'top',
    targetKey: 'title_input',
  },
  {
    id: 'write_description',
    title: 'Share your thoughts',
    description: 'Write whatever is on your mind. You can format text and @mention other users!',
    placement: 'top',
    targetKey: 'description_input',
  },
  {
    id: 'choose_style',
    title: 'Pick a style',
    description: 'Choose a color theme for your post card. Make it uniquely yours!',
    placement: 'top',
    targetKey: 'style_picker',
  },
  {
    id: 'publish',
    title: 'Ready to publish?',
    description: 'Hit Publish to share your post with the community. You can always edit or delete it later!',
    placement: 'top',
    targetKey: 'publish_button',
  },
  {
    id: 'explore',
    title: 'Explore the app!',
    description: 'Check out posts from your area, create events, and connect with your local community!',
    placement: 'center',
    targetPosition: null,
  },
];

export function OnboardingProvider({ children }) {
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [isOnboardingActive, setIsOnboardingActive] = useState(false);
  const [targetPositions, setTargetPositions] = useState({});

  // Load onboarding status on mount
  useEffect(() => {
    loadOnboardingStatus();
  }, []);

  const loadOnboardingStatus = async () => {
    try {
      const completed = await AsyncStorage.getItem(ONBOARDING_KEY);
      setHasCompletedOnboarding(completed === 'true');
    } catch (error) {
      console.error('[OnboardingContext] Failed to load onboarding status:', error);
      setHasCompletedOnboarding(false);
    }
  };

  const startOnboarding = useCallback(() => {
    setCurrentStep(0);
    setIsOnboardingActive(true);
  }, []);

  const nextStep = useCallback(() => {
    if (currentStep < TUTORIAL_STEPS.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      // Completed all steps
      completeOnboarding();
    }
  }, [currentStep]);

  const skipStep = useCallback(() => {
    nextStep();
  }, [nextStep]);

  const completeOnboarding = useCallback(async () => {
    setIsOnboardingActive(false);
    setCurrentStep(0);
    setHasCompletedOnboarding(true);
    try {
      await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    } catch (error) {
      console.error('[OnboardingContext] Failed to save onboarding status:', error);
    }
  }, []);

  const resetOnboarding = useCallback(async () => {
    setHasCompletedOnboarding(false);
    setCurrentStep(0);
    setIsOnboardingActive(false);
    try {
      await AsyncStorage.removeItem(ONBOARDING_KEY);
    } catch (error) {
      console.error('[OnboardingContext] Failed to reset onboarding:', error);
    }
  }, []);

  const registerTarget = useCallback((key, position) => {
    setTargetPositions((prev) => ({
      ...prev,
      [key]: position,
    }));
  }, []);

  const getCurrentStepData = useCallback(() => {
    const step = TUTORIAL_STEPS[currentStep];
    if (!step) return null;

    return {
      ...step,
      targetPosition: step.targetKey ? targetPositions[step.targetKey] : step.targetPosition,
    };
  }, [currentStep, targetPositions]);

  const value = {
    hasCompletedOnboarding,
    currentStep,
    isOnboardingActive,
    totalSteps: TUTORIAL_STEPS.length,
    startOnboarding,
    nextStep,
    skipStep,
    completeOnboarding,
    resetOnboarding,
    registerTarget,
    getCurrentStepData,
  };

  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>;
}

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error('useOnboarding must be used within OnboardingProvider');
  }
  return context;
}
