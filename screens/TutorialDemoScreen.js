import React, { useState, useRef, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSettings } from '../contexts/SettingsContext';
import { useOnboarding } from '../contexts/OnboardingContext';
import TutorialTooltip from '../components/TutorialTooltip';
import OnboardingCompletionModal from '../components/OnboardingCompletionModal';

/**
 * TutorialDemoScreen - Demonstrates the onboarding tutorial system
 */
export default function TutorialDemoScreen({ navigation }) {
  const { themeColors, isDarkMode } = useSettings();
  const { startOnboarding, nextStep, skipStep, completeOnboarding, currentStep, isOnboardingActive, totalSteps } = useOnboarding();

  const [showCompletion, setShowCompletion] = useState(false);
  const [targetPositions, setTargetPositions] = useState({});

  // Refs for measuring UI elements
  const fabButtonRef = useRef(null);
  const titleInputRef = useRef(null);
  const descriptionInputRef = useRef(null);

  const styles = useMemo(() => createStyles(themeColors, isDarkMode), [themeColors, isDarkMode]);

  const handleStartTutorial = () => {
    // Measure all target elements
    measureTargets();
    startOnboarding();
  };

  const measureTargets = () => {
    // Measure FAB button
    fabButtonRef.current?.measure((x, y, width, height, pageX, pageY) => {
      setTargetPositions((prev) => ({
        ...prev,
        fab_button: { x: pageX + width / 2, y: pageY + height / 2 },
      }));
    });

    // Measure title input
    titleInputRef.current?.measure((x, y, width, height, pageX, pageY) => {
      setTargetPositions((prev) => ({
        ...prev,
        title_input: { x: pageX + width / 2, y: pageY + height / 2 },
      }));
    });

    // Measure description input
    descriptionInputRef.current?.measure((x, y, width, height, pageX, pageY) => {
      setTargetPositions((prev) => ({
        ...prev,
        description_input: { x: pageX + width / 2, y: pageY + height / 2 },
      }));
    });
  };

  const handleNext = () => {
    if (currentStep === totalSteps - 1) {
      // Last step - show completion modal
      completeOnboarding();
      setShowCompletion(true);
    } else {
      nextStep();
    }
  };

  const handleCompletionContinue = () => {
    setShowCompletion(false);
    navigation.goBack();
  };

  const getCurrentStepData = () => {
    const steps = [
      {
        title: 'Welcome to LocalLoop!',
        description: 'Let\'s take a quick tour to get you started. You can skip any step at any time.',
        placement: 'center',
        targetPosition: null,
      },
      {
        title: 'Create your first post!',
        description: 'Tap the + button to share your thoughts with your local community',
        placement: 'top',
        targetPosition: targetPositions.fab_button,
      },
      {
        title: 'Give it a catchy title',
        description: 'Make your post stand out with a great headline',
        placement: 'top',
        targetPosition: targetPositions.title_input,
      },
      {
        title: 'Share your thoughts',
        description: 'Write whatever is on your mind. You can format text and @mention other users!',
        placement: 'top',
        targetPosition: targetPositions.description_input,
      },
      {
        title: 'Explore the app!',
        description: 'Check out posts from your area, create events, and connect with your local community!',
        placement: 'center',
        targetPosition: null,
      },
    ];

    return steps[currentStep] || steps[0];
  };

  const stepData = getCurrentStepData();

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={themeColors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: themeColors.textPrimary }]}>
          Tutorial Demo
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.infoCard}>
          <Text style={[styles.infoTitle, { color: themeColors.textPrimary }]}>
            Interactive Onboarding Tutorial
          </Text>
          <Text style={[styles.infoText, { color: themeColors.textSecondary }]}>
            This demonstrates the step-by-step tutorial system that guides new users through creating their first post.
          </Text>
        </View>

        {/* Demo UI elements */}
        <View style={[styles.demoCard, { backgroundColor: themeColors.card }]}>
          <Text style={[styles.demoLabel, { color: themeColors.textSecondary }]}>
            Post Title
          </Text>
          <View
            ref={titleInputRef}
            style={[styles.demoInput, { backgroundColor: themeColors.background, borderColor: themeColors.divider }]}
            onLayout={() => measureTargets()}
          >
            <Text style={{ color: themeColors.textSecondary }}>Enter title...</Text>
          </View>

          <Text style={[styles.demoLabel, { color: themeColors.textSecondary, marginTop: 16 }]}>
            Description
          </Text>
          <View
            ref={descriptionInputRef}
            style={[styles.demoTextArea, { backgroundColor: themeColors.background, borderColor: themeColors.divider }]}
            onLayout={() => measureTargets()}
          >
            <Text style={{ color: themeColors.textSecondary }}>Write something...</Text>
          </View>
        </View>

        {/* Start Tutorial Button */}
        <TouchableOpacity
          style={[styles.startButton, { backgroundColor: themeColors.primaryDark }]}
          onPress={handleStartTutorial}
          activeOpacity={0.8}
        >
          <Ionicons name="play-circle-outline" size={24} color="#fff" style={{ marginRight: 8 }} />
          <Text style={styles.startButtonText}>Start Tutorial</Text>
        </TouchableOpacity>

        {/* Status */}
        {isOnboardingActive && (
          <View style={[styles.statusCard, { backgroundColor: themeColors.card }]}>
            <Text style={[styles.statusText, { color: themeColors.textSecondary }]}>
              Tutorial Active: Step {currentStep + 1} of {totalSteps}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* FAB Button (demo) */}
      <View
        ref={fabButtonRef}
        style={[styles.fab, { backgroundColor: themeColors.primaryDark }]}
        onLayout={() => measureTargets()}
      >
        <Ionicons name="add" size={32} color="#fff" />
      </View>

      {/* Tutorial Tooltip */}
      {isOnboardingActive && (
        <TutorialTooltip
          visible={isOnboardingActive}
          step={currentStep + 1}
          totalSteps={totalSteps}
          title={stepData.title}
          description={stepData.description}
          targetPosition={stepData.targetPosition}
          placement={stepData.placement}
          onNext={handleNext}
          onSkip={skipStep}
          onClose={completeOnboarding}
          accentColor={themeColors.primaryDark}
          isDarkMode={isDarkMode}
        />
      )}

      {/* Completion Modal */}
      <OnboardingCompletionModal
        visible={showCompletion}
        onContinue={handleCompletionContinue}
        onMaybeLater={handleCompletionContinue}
        accentColor={themeColors.primaryDark}
        isDarkMode={isDarkMode}
      />
    </View>
  );
}

const createStyles = (themeColors, isDarkMode) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingTop: 60,
      paddingBottom: 16,
    },
    backButton: {
      width: 40,
      height: 40,
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '700',
    },
    content: {
      flex: 1,
      padding: 20,
    },
    infoCard: {
      marginBottom: 24,
    },
    infoTitle: {
      fontSize: 20,
      fontWeight: '700',
      marginBottom: 8,
    },
    infoText: {
      fontSize: 15,
      lineHeight: 22,
    },
    demoCard: {
      padding: 20,
      borderRadius: 16,
      marginBottom: 24,
    },
    demoLabel: {
      fontSize: 13,
      fontWeight: '600',
      marginBottom: 8,
    },
    demoInput: {
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderRadius: 12,
      borderWidth: 1,
    },
    demoTextArea: {
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderRadius: 12,
      borderWidth: 1,
      minHeight: 100,
    },
    startButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 16,
      borderRadius: 14,
      marginBottom: 16,
    },
    startButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: '#fff',
    },
    statusCard: {
      padding: 16,
      borderRadius: 12,
      alignItems: 'center',
    },
    statusText: {
      fontSize: 14,
      fontWeight: '500',
    },
    fab: {
      position: 'absolute',
      bottom: 32,
      right: 24,
      width: 64,
      height: 64,
      borderRadius: 32,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
    },
  });
