import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ScrollView,
  Switch,
  Text,
  TouchableOpacity,
  View,
  StyleSheet,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  ActivityIndicator
} from 'react-native';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ScreenLayout from '../components/ScreenLayout';
import Slider from '@react-native-community/slider';
import {
  useSettings,
  DEFAULT_TITLE_FONT_SIZE,
  DEFAULT_DESCRIPTION_FONT_SIZE,
  PREMIUM_TITLE_FONT_SIZE_RANGE,
  PREMIUM_DESCRIPTION_FONT_SIZE_RANGE,
  PREMIUM_ACCENT_BRIGHTNESS_RANGE,
  PREMIUM_ACCENT_SHADE_RANGE
} from '../contexts/SettingsContext';
import ShareLocationModal from '../components/ShareLocationModal';
import { avatarOptions, getAvatarConfig } from '../constants/avatars';
import { SIGNUP_BONUS_POINTS } from '../constants/authConfig';
import { useAuth } from '../contexts/AuthContext';
import PremiumBadge from '../components/PremiumBadge';
import PremiumSuccessModal from '../components/PremiumSuccessModal';
import LoadingOverlay from '../components/LoadingOverlay';
import AIFeaturesSettings from '../components/AIFeaturesSettings';
import UpgradePromptModal from '../components/UpgradePromptModal';
import { useSensors } from '../contexts/SensorsContext';
import { canUserPerformAction, getRequiredPlan, getPlanLimits } from '../config/subscriptionPlans';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useAlert } from '../contexts/AlertContext';
import CartoonStyleModal from '../components/CartoonStyleModal';
import CartoonHistoryModal from '../components/CartoonHistoryModal';
import CartoonSuccessModal from '../components/CartoonSuccessModal';
import CartoonGenerationProgress from '../components/CartoonGenerationProgress';
import EmailVerificationBanner from '../components/EmailVerificationBanner';
import { generateCartoonProfile, getUsageStatsText } from '../services/openai/profileCartoonService';
import { scheduleCartoonReadyNotification } from '../services/notificationService';
import {
  getCartoonProfileData,
  checkAndResetMonthlyUsage,
  uploadCartoonToStorage,
  recordCartoonGeneration,
  setAsProfilePicture,
  removePictureFromHistory,
  clearCartoonHistory,
  uploadTemporaryCustomImage,
  deleteTemporaryCustomImage,
} from '../services/cartoonProfileService';
import { LinearGradient } from 'expo-linear-gradient';
import LottieView from 'lottie-react-native';
import { buildDreamyAccent } from '../utils/dreamyPalette';

const GOLD_BADGE_ANIMATION = require('../assets/premium-gold-badge.json');

export default function SettingsScreen({ navigation }) {
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const {
    user,
    profile: authProfile,
    emailVerified,
    startGoogleSignIn,
    signOut: signOutAccount,
    isSigningIn,
    isResettingPassword,
    isRedeeming,
    authError,
    hasActivePremium: premiumUnlocked,
    pointsToNextPremium,
    premiumDayCost,
    premiumAccessDurationMs,
    canUseGoogleSignIn,
    signInWithEmail,
    signUpWithEmail,
    sendPasswordReset,
    redeemPremiumDay,
    clearAuthError,
    isAdmin,
    googleReadyOnThisPlatform
  } = useAuth();
  const {
    showAddShortcut,
    setShowAddShortcut,
    showDiscoveryOnExplore,
    setShowDiscoveryOnExplore,
    showHeaderBar,
    setShowHeaderBar,
    accentOptions,
    accentKey,
    setAccentKey,
    accentPreset,
    premiumAccentOptions,
    premiumAccentEnabled,
    setPremiumAccentEnabled,
    premiumAccentKey,
    setPremiumAccentKey,
    premiumAccentBrightness,
    setPremiumAccentBrightness,
    premiumAccentShade,
    setPremiumAccentShade,
    userProfile,
    updateUserProfile,
    reloadProfile,
    locationPermissionStatus,
    setLocationPermissionStatus,
    isDarkMode,
    setIsDarkMode,
    themeColors,
    dreamyScrollIndicatorEnabled,
    setDreamyScrollIndicatorEnabled,
    premiumTypographyEnabled,
    setPremiumTypographyEnabled,
    premiumTitleFontSizeEnabled,
    setPremiumTitleFontSizeEnabled,
    premiumDescriptionFontSizeEnabled,
    setPremiumDescriptionFontSizeEnabled,
    premiumTitleFontSize,
    setPremiumTitleFontSize,
    premiumDescriptionFontSize,
    setPremiumDescriptionFontSize,
    premiumSummariesEnabled,
    setPremiumSummariesEnabled,
    premiumSummaryLength,
    setPremiumSummaryLength,
    premiumSummaryLengthOptions
  } = useSettings();

  const {
    stepCounterEnabled,
    toggleStepCounter,
    motionDetectionEnabled,
    toggleMotionDetection,
    shakeEnabled,
    toggleShake,
    barometerEnabled,
    toggleBarometer,
    compassEnabled,
    toggleCompass,
    ambientLightEnabled,
    toggleAmbientLight
  } = useSensors();

  const { showAlert } = useAlert();

  const [nicknameDraft, setNicknameDraft] = useState(userProfile.nickname ?? '');
  const [locationPickerVisible, setLocationPickerVisible] = useState(false);
  const avatarConfig = getAvatarConfig(userProfile.avatarKey);
  const locationEnabled = locationPermissionStatus === 'granted';
  const [titleSizeDraft, setTitleSizeDraft] = useState(String(premiumTitleFontSize));
  const [descriptionSizeDraft, setDescriptionSizeDraft] = useState(
    String(premiumDescriptionFontSize)
  );
  const [signingOut, setSigningOut] = useState(false);
  const [emailAuthVisible, setEmailAuthVisible] = useState(false);
  const [emailAuthMode, setEmailAuthMode] = useState('signIn');
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState('');
  const [displayNameInput, setDisplayNameInput] = useState('');
  const [emailLocalError, setEmailLocalError] = useState('');
  const [emailStatusMessage, setEmailStatusMessage] = useState('');
  const [premiumSuccessVisible, setPremiumSuccessVisible] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [enablingDiscovery, setEnablingDiscovery] = useState(false);

  // Cartoon profile state
  const [cartoonStyleModalVisible, setCartoonStyleModalVisible] = useState(false);
  const [cartoonHistoryModalVisible, setCartoonHistoryModalVisible] = useState(false);
  const [cartoonSuccessModalVisible, setCartoonSuccessModalVisible] = useState(false);
  const [cartoonUsageData, setCartoonUsageData] = useState(null);
  const [cartoonPictureHistory, setCartoonPictureHistory] = useState([]);
  const [isGeneratingCartoon, setIsGeneratingCartoon] = useState(false);
  const [isCartoonProcessing, setIsCartoonProcessing] = useState(false);
  const [showGenerationProgress, setShowGenerationProgress] = useState(false);
  const [currentGenerationStyle, setCurrentGenerationStyle] = useState('AI Avatar');
  const [currentGenerationNotify, setCurrentGenerationNotify] = useState(false);

  // Upgrade modal state
  const [upgradeModalVisible, setUpgradeModalVisible] = useState(false);
  const [upgradeFeature, setUpgradeFeature] = useState({
    name: 'Premium Feature',
    description: 'This feature requires a Premium or Gold subscription',
    requiredPlan: 'premium',
    icon: 'star',
  });

  // Reset subscription state (for testing) - COMMENTED OUT FOR PRODUCTION
  // const [resettingSubscription, setResettingSubscription] = useState(false);

  const isEmailBusy = isSigningIn || isResettingPassword;

  // Get user's current plan
  const userPlan = userProfile?.subscriptionPlan || 'basic';
  const isGoldMember = userPlan === 'gold'; // Premium tier
  const isUltimateMember = userPlan === 'ultimate'; // Gold/Ultimate tier
  const isPremiumOrAbove = userPlan === 'gold' || userPlan === 'ultimate'; // Premium or Gold tier

  // Check subscription feature access
  const canUseTypography = canUserPerformAction(userPlan, 'customTypography', isAdmin);
  const canUsePremiumThemes = canUserPerformAction(userPlan, 'premiumThemes', isAdmin);
  const hasAnyPaidPlan = userPlan !== 'basic' || isAdmin;

  const goldAccent = useMemo(
    () => buildDreamyAccent(accentPreset, themeColors),
    [accentPreset, themeColors]
  );

  const emailModeTitle = useMemo(() => {
    switch (emailAuthMode) {
      case 'signUp':
        return 'Create your account';
      case 'reset':
        return 'Reset password';
      default:
        return 'Sign in with email';
    }
  }, [emailAuthMode]);

  const emailPrimaryButtonLabel = useMemo(() => {
    switch (emailAuthMode) {
      case 'signUp':
        return isEmailBusy ? 'Creating account...' : 'Create account';
      case 'reset':
        return isEmailBusy ? 'Sending reset email...' : 'Send reset email';
      default:
        return isEmailBusy ? 'Signing in...' : 'Sign in';
    }
  }, [emailAuthMode, isEmailBusy]);

  const resetEmailForm = useCallback(() => {
    setEmailInput('');
    setPasswordInput('');
    setConfirmPasswordInput('');
    setDisplayNameInput('');
  }, []);

  const updateEmailMode = useCallback(
    (mode) => {
      setEmailAuthMode(mode);
      setEmailLocalError('');
      setEmailStatusMessage('');
      clearAuthError();
    },
    [clearAuthError]
  );

  const closeEmailAuth = useCallback(() => {
    setEmailAuthVisible(false);
    resetEmailForm();
    setEmailLocalError('');
    setEmailStatusMessage('');
    clearAuthError();
    updateEmailMode('signIn');
  }, [clearAuthError, resetEmailForm, updateEmailMode]);

  const openEmailAuth = useCallback(
    (mode = 'signIn') => {
      resetEmailForm();
      updateEmailMode(mode);
      setEmailAuthVisible(true);
    },
    [resetEmailForm, updateEmailMode]
  );

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  const ghostIdentifier = useMemo(() => {
    if (userProfile.nickname?.trim()) {
      return userProfile.nickname.trim();
    }
    return `Ghost #${Math.floor(Math.random() * 999)}`;
  }, [userProfile.nickname]);

  // TESTING: Disable dev build bypass to test subscription gating in Expo Go
  const isDevBuild = false; // __DEV__ === true;
  const accentSwitchColor = accentPreset.buttonBackground ?? themeColors.primaryDark;
  const inactiveTrackColor = isDarkMode ? '#3D3561' : '#d1d5db';
  const inactiveThumbColor = isDarkMode ? '#252047' : '#f4f3f4';
  const activeThumbColor = '#ffffff';
  const sliderTrackColor = isDarkMode ? 'rgba(255,255,255,0.22)' : 'rgba(15,10,42,0.12)';
  const styles = useMemo(
    () => createStyles(themeColors, { isDarkMode }),
    [themeColors, isDarkMode]
  );
  const pointsBalance = authProfile?.points ?? 0;
  const premiumExpiryLabel = useMemo(() => {
    if (!authProfile?.premiumExpiresAt) {
      return null;
    }
    try {
      return new Date(authProfile.premiumExpiresAt).toLocaleString();
    } catch (error) {
      return null;
    }
  }, [authProfile?.premiumExpiresAt]);
  const redeemDisabled = !user || pointsBalance < premiumDayCost || isRedeeming;
  const googleButtonDisabled = isSigningIn; // let startGoogleSignIn() surface config/init errors
  const googleDisabledMessage = useMemo(() => {
    if (Platform.OS === 'ios' && !googleReadyOnThisPlatform) {
      return 'Google Sign-In is temporarily disabled on iOS until EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID is set.';
    }
    return 'Add your Google OAuth client IDs in constants/authConfig.js.';
  }, [googleReadyOnThisPlatform]);
  const hoursOfPremium = useMemo(
    () => Math.max(Math.round(premiumAccessDurationMs / (60 * 60 * 1000)), 1),
    [premiumAccessDurationMs]
  );
  const pointsGap = Math.max(pointsToNextPremium, 0);
  const discoveryPresetActive = useMemo(
    () =>
      stepCounterEnabled &&
      motionDetectionEnabled &&
      compassEnabled &&
      barometerEnabled,
    [stepCounterEnabled, motionDetectionEnabled, compassEnabled, barometerEnabled]
  );

  const enableDiscoveryPreset = useCallback(async () => {
    if (discoveryPresetActive || enablingDiscovery) return;
    setEnablingDiscovery(true);
    try {
      if (!showDiscoveryOnExplore) {
        setShowDiscoveryOnExplore(true);
      }
      await Promise.all([
        stepCounterEnabled ? Promise.resolve() : toggleStepCounter(true),
        motionDetectionEnabled ? Promise.resolve() : toggleMotionDetection(true),
        compassEnabled ? Promise.resolve() : toggleCompass(true),
        barometerEnabled ? Promise.resolve() : toggleBarometer(true),
        Platform.OS === 'android' && !ambientLightEnabled
          ? toggleAmbientLight(true)
          : Promise.resolve(),
      ]);
      if (!shakeEnabled) {
        await toggleShake(true);
      }
    } catch (error) {
      console.warn('[Settings] Failed to enable discovery preset', error);
    } finally {
      setEnablingDiscovery(false);
    }
  }, [
    discoveryPresetActive,
    enablingDiscovery,
    showDiscoveryOnExplore,
    setShowDiscoveryOnExplore,
    stepCounterEnabled,
    motionDetectionEnabled,
    compassEnabled,
    barometerEnabled,
    ambientLightEnabled,
    shakeEnabled,
    toggleStepCounter,
    toggleMotionDetection,
    toggleCompass,
    toggleBarometer,
    toggleAmbientLight,
    toggleShake
  ]);

  useEffect(() => {
    setNicknameDraft(userProfile.nickname ?? '');
  }, [userProfile.nickname]);

  useEffect(() => {
    setTitleSizeDraft(String(premiumTitleFontSize));
  }, [premiumTitleFontSize]);

  useEffect(() => {
    setDescriptionSizeDraft(String(premiumDescriptionFontSize));
  }, [premiumDescriptionFontSize]);

  useEffect(() => () => clearAuthError(), [clearAuthError]);

  useEffect(() => {
    if (user && emailAuthVisible) {
      closeEmailAuth();
    }
  }, [user, emailAuthVisible, closeEmailAuth]);

  const showPremiumRequiredAlert = useCallback(
    () =>
      showAlert(
        'Premium required',
        'Redeem a premium day from the Account section to unlock this feature.',
        [],
        { type: 'warning' }
      ),
    [showAlert]
  );

  const handleGoogleSignInPress = useCallback(async () => {
    setAuthLoading(true);
    await startGoogleSignIn();
    setTimeout(() => setAuthLoading(false), 2000);
  }, [startGoogleSignIn]);

  const handleEmailAuthSubmit = useCallback(async () => {
    const trimmedEmail = emailInput.trim();
    setEmailLocalError('');
    setEmailStatusMessage('');
    clearAuthError();
    setAuthLoading(true);

    const emailPattern = /.+@.+\..+/;
    if (!trimmedEmail || !emailPattern.test(trimmedEmail)) {
      setEmailLocalError('Enter a valid email address.');
      setAuthLoading(false);
      return;
    }

    if (emailAuthMode === 'signIn') {
      if (!passwordInput) {
        setEmailLocalError('Enter your password to continue.');
        setAuthLoading(false);
        return;
      }
      const result = await signInWithEmail({ email: trimmedEmail, password: passwordInput });
      if (result?.ok) {
        resetEmailForm();
        setEmailStatusMessage('Signed in successfully.');
      }
      setTimeout(() => setAuthLoading(false), 2000);
      return;
    }

    if (emailAuthMode === 'signUp') {
      if (!displayNameInput.trim()) {
        setEmailLocalError('Add a display name so friends recognize you.');
        setAuthLoading(false);
        return;
      }
      if (passwordInput.length < 6) {
        setEmailLocalError('Passwords must be at least 6 characters.');
        setAuthLoading(false);
        return;
      }
      if (passwordInput !== confirmPasswordInput) {
        setEmailLocalError('Passwords do not match.');
        setAuthLoading(false);
        return;
      }
      const result = await signUpWithEmail({
        email: trimmedEmail,
        password: passwordInput,
        displayName: displayNameInput,
      });
      if (result?.ok) {
        resetEmailForm();
        setEmailStatusMessage('Account created! You are ready to explore.');
      }
      setTimeout(() => setAuthLoading(false), 2000);
      return;
    }

    // reset password flow
    const result = await sendPasswordReset(trimmedEmail);
    if (result?.ok) {
      setEmailStatusMessage('Password reset email sent. Check your inbox.');
    }
    setTimeout(() => setAuthLoading(false), 2000);
  }, [
    emailInput,
    passwordInput,
    confirmPasswordInput,
    displayNameInput,
    emailAuthMode,
    signInWithEmail,
    signUpWithEmail,
    sendPasswordReset,
    resetEmailForm,
    clearAuthError,
  ]);

  const handleSwitchToMode = useCallback(
    (mode) => {
      updateEmailMode(mode);
      if (mode !== 'reset') {
        setEmailStatusMessage('');
      }
    },
    [updateEmailMode]
  );

  const handleSignOut = useCallback(async () => {
    setSigningOut(true);
    try {
      // Clear all local state
      setCartoonUsageData(null);
      setCartoonPictureHistory([]);
      setNicknameDraft('');

      // Sign out
      await signOutAccount();
    } finally {
      setSigningOut(false);
    }
  }, [signOutAccount]);

  const handleViewOnboarding = useCallback(async () => {
    try {
      await AsyncStorage.removeItem('@onboarding_completed');
      showAlert(
        'Restart Required',
        'Please restart the app to view the onboarding experience again.',
        [{ text: 'OK' }],
        { type: 'info' }
      );
    } catch (error) {
      console.error('Error resetting onboarding:', error);
      showAlert('Error', 'Unable to reset onboarding. Please try again.', [], { type: 'error' });
    }
  }, [showAlert]);

  // Show upgrade prompt helper
  const showUpgradePrompt = useCallback((featureName, featureDescription, requiredPlan, icon) => {
    setUpgradeFeature({
      name: featureName,
      description: featureDescription,
      requiredPlan,
      icon,
    });
    setUpgradeModalVisible(true);
  }, []);

  const handleUpgradeNow = useCallback(() => {
    setUpgradeModalVisible(false);
    navigation.navigate('Subscription');
  }, [navigation]);

  const handleRedeemPremium = useCallback(async () => {
    const result = await redeemPremiumDay();
    if (result?.ok) {
      setPremiumSuccessVisible(true);
    }
  }, [redeemPremiumDay]);

  // COMMENTED OUT FOR PRODUCTION - Reset subscription handler
  /* const handleResetSubscription = useCallback(async () => {
    showAlert(
      'Reset Subscription',
      'This will reset your subscription back to Basic. This is for testing only. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            try {
              setResettingSubscription(true);
              const functions = getFunctions();
              const resetMySubscription = httpsCallable(functions, 'resetMySubscription');
              const result = await resetMySubscription();

              if (result.data.success) {
                // Reload profile from Firestore to sync subscription status
                await reloadProfile();

                // Premium features will auto-disable due to useEffect in SettingsContext
                showAlert(
                  'Success',
                  'Your subscription has been reset to Basic. Premium features have been disabled.',
                  [{ text: 'OK' }],
                  { icon: 'checkmark-circle', iconColor: '#34C759' }
                );
              }
            } catch (error) {
              console.error('[SettingsScreen] Reset error:', error);
              showAlert(
                'Error',
                'Failed to reset subscription. Please try again.',
                [{ text: 'OK' }],
                { icon: 'alert-circle', iconColor: '#FF3B30' }
              );
            } finally {
              setResettingSubscription(false);
            }
          },
        },
      ],
      { icon: 'refresh', iconColor: '#FF3B30' }
    );
  }, [reloadProfile, showAlert]); */

  const handleTogglePremiumAccent = (value) => {
    // Check if user has access to premium themes
    if (value && !canUserPerformAction(userPlan, 'premiumThemes', isAdmin)) {
      showUpgradePrompt(
        'Premium Gradient Themes',
        'Unlock 15+ stunning gradient accent themes with smooth animations and beautiful colors.',
        'premium',
        'color-palette'
      );
      return;
    }
    setPremiumAccentEnabled(value);
  };

  const handleSelectPremiumAccent = (key) => {
    if (!premiumUnlocked && !isDevBuild) {
      showPremiumRequiredAlert();
      return;
    }
    setPremiumAccentKey(key);
  };

  const handleSelectBrightness = (value) => {
    if (!premiumUnlocked && !isDevBuild) {
      showPremiumRequiredAlert();
      return;
    }
    setPremiumAccentBrightness(value);
  };

  const handleBrightnessSliderChange = useCallback(
    (rawValue) => {
      setPremiumAccentBrightness(clamp(rawValue, PREMIUM_ACCENT_BRIGHTNESS_RANGE.min, PREMIUM_ACCENT_BRIGHTNESS_RANGE.max));
    },
    [setPremiumAccentBrightness]
  );

  const handleBrightnessSlidingComplete = useCallback(
    (rawValue) => {
      setPremiumAccentBrightness(clamp(Math.round(rawValue), PREMIUM_ACCENT_BRIGHTNESS_RANGE.min, PREMIUM_ACCENT_BRIGHTNESS_RANGE.max));
    },
    [setPremiumAccentBrightness]
  );

  const handleSelectShade = (value) => {
    if (!premiumUnlocked && !isDevBuild) {
      showPremiumRequiredAlert();
      return;
    }
    setPremiumAccentShade(value);
  };

  const handleShadeSliderChange = useCallback(
    (rawValue) => {
      setPremiumAccentShade(clamp(rawValue, PREMIUM_ACCENT_SHADE_RANGE.min, PREMIUM_ACCENT_SHADE_RANGE.max));
    },
    [setPremiumAccentShade]
  );

  const handleShadeSlidingComplete = useCallback(
    (rawValue) => {
      setPremiumAccentShade(clamp(Math.round(rawValue), PREMIUM_ACCENT_SHADE_RANGE.min, PREMIUM_ACCENT_SHADE_RANGE.max));
    },
    [setPremiumAccentShade]
  );

  const handleSelectSummaryLength = (value) => {
    if (!premiumUnlocked) {
      showPremiumRequiredAlert();
      return;
    }
    setPremiumSummaryLength(value);
  };

  const summaryLengthOptions = premiumSummaryLengthOptions ?? [];

  const handleTogglePremiumTypography = (value) => {
    // Check if user has access to custom typography
    if (value && !canUserPerformAction(userPlan, 'customTypography', isAdmin)) {
      showUpgradePrompt(
        'Custom Typography',
        'Adjust title and description font sizes to match your reading preference.',
        'premium',
        'text'
      );
      return;
    }
    setPremiumTypographyEnabled(value);
  };

  const handleToggleTitleSizeOverride = (value) => {
    if (value && !premiumUnlocked) {
      showPremiumRequiredAlert();
      return;
    }
    setPremiumTitleFontSizeEnabled(value);
  };

  const handleToggleDescriptionSizeOverride = (value) => {
    if (value && !premiumUnlocked) {
      showPremiumRequiredAlert();
      return;
    }
    setPremiumDescriptionFontSizeEnabled(value);
  };

  const handleTogglePremiumSummaries = (value) => {
    if (value && !hasAnyPaidPlan) {
      showPremiumRequiredAlert();
      return;
    }
    setPremiumSummariesEnabled(value);
  };

  const handleNicknameChange = (value) => {
    const trimmedValue = value.slice(0, 32);
    setNicknameDraft(trimmedValue);
    updateUserProfile({ nickname: trimmedValue });
  };

  const handleTitleSizeChange = (value) => {
    const sanitized = value.replace(/[^0-9]/g, '');
    setTitleSizeDraft(sanitized);
    if (!sanitized) {
      return;
    }
    const numeric = parseInt(sanitized, 10);
    if (!Number.isNaN(numeric)) {
      const clamped = clamp(
        numeric,
        PREMIUM_TITLE_FONT_SIZE_RANGE.min,
        PREMIUM_TITLE_FONT_SIZE_RANGE.max
      );
      setPremiumTitleFontSize(clamped);
    }
  };

  const handleTitleSizeBlur = () => {
    const numeric = parseInt(titleSizeDraft, 10);
    if (Number.isNaN(numeric)) {
      setTitleSizeDraft(String(premiumTitleFontSize));
      return;
    }
    const clampedValue = clamp(
      numeric,
      PREMIUM_TITLE_FONT_SIZE_RANGE.min,
      PREMIUM_TITLE_FONT_SIZE_RANGE.max
    );
    setPremiumTitleFontSize(clampedValue);
    setTitleSizeDraft(String(clampedValue));
  };

  const handleDescriptionSizeChange = (value) => {
    const sanitized = value.replace(/[^0-9]/g, '');
    setDescriptionSizeDraft(sanitized);
    if (!sanitized) {
      return;
    }
    const numeric = parseInt(sanitized, 10);
    if (!Number.isNaN(numeric)) {
      const clamped = clamp(
        numeric,
        PREMIUM_DESCRIPTION_FONT_SIZE_RANGE.min,
        PREMIUM_DESCRIPTION_FONT_SIZE_RANGE.max
      );
      setPremiumDescriptionFontSize(clamped);
    }
  };

  const handleDescriptionSizeBlur = () => {
    const numeric = parseInt(descriptionSizeDraft, 10);
    if (Number.isNaN(numeric)) {
      setDescriptionSizeDraft(String(premiumDescriptionFontSize));
      return;
    }
    const clampedValue = clamp(
      numeric,
      PREMIUM_DESCRIPTION_FONT_SIZE_RANGE.min,
      PREMIUM_DESCRIPTION_FONT_SIZE_RANGE.max
    );
    setPremiumDescriptionFontSize(clampedValue);
    setDescriptionSizeDraft(String(clampedValue));
  };

  const handleSelectLocation = (cityName, meta = {}) => {
    updateUserProfile({
      city: cityName ?? '',
      province: meta.province ?? '',
      country: meta.country ?? ''
    });
    setLocationPickerVisible(false);
  };

  const handleClearLocation = () => {
    updateUserProfile({ city: '', province: '', country: '' });
  };

  const handleToggleLocation = async (value) => {
    if (value) {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setLocationPermissionStatus(status);
          showAlert(
            'Permission needed',
            'We need location permission to suggest nearby rooms.',
            [],
            { type: 'warning' }
          );
          return;
        }
        setLocationPermissionStatus('granted');
        try {
          const position = await Location.getCurrentPositionAsync({});
          const [address] = await Location.reverseGeocodeAsync(position.coords);
          if (address) {
            updateUserProfile({
              city: address.city ?? address.subregion ?? userProfile.city,
              province: address.region ?? userProfile.province,
              country: address.country ?? userProfile.country
            });
          }
        } catch (err) {
          // ignore reverse geocode failures
        }
      } catch (error) {
        showAlert('Location error', 'Unable to access location right now.', [], { type: 'error' });
        setLocationPermissionStatus('denied');
      }
    } else {
      setLocationPermissionStatus('disabled');
    }
  };

  const locationSummary = useMemo(() => {
    if (!userProfile.city) {
      return 'No location set yet.';
    }
    const parts = [userProfile.city];
    if (userProfile.province) parts.push(userProfile.province);
    if (userProfile.country) parts.push(userProfile.country);
    return parts.join(', ');
  }, [userProfile.city, userProfile.country, userProfile.province]);

  // [AI-FEATURES] Handler for toggling AI features
  const handleToggleAIFeature = (featureName, value) => {
    updateUserProfile({
      aiPreferences: {
        ...(userProfile.aiPreferences || {}),
        [featureName]: value,
      },
    });
  };

  // Load cartoon usage data when screen mounts or user changes
  // Reload profile when user changes (after sign out/sign in)
  useEffect(() => {
    if (user?.uid) {
      reloadProfile();
      loadCartoonData();
    }
  }, [user?.uid]);

  const loadCartoonData = async () => {
    try {
      if (!user?.uid) return;

      const data = await checkAndResetMonthlyUsage(user.uid);
      setCartoonUsageData({
        monthlyUsage: data.monthlyUsage,
        lifetimeUsage: data.lifetimeUsage,
        gpt4VisionUsage: data.gpt4VisionUsage || 0, // GPT-4 Vision usage
      });
      setCartoonPictureHistory(data.pictureHistory || []);
    } catch (error) {
      console.error('[SettingsScreen] Error loading cartoon data:', error);
    }
  };

  // Open style selection modal
  const handleOpenCartoonGenerator = () => {
    // Check email verification first (required for all AI features to prevent abuse)
    // Google users are automatically verified by Google
    const isGoogleUser = user?.providerData?.some(provider => provider.providerId === 'google.com');

    if (!emailVerified && !isGoogleUser) {
      showAlert(
        'Email Verification Required',
        'Please verify your email address before using AI features. Check your inbox for the verification link or click "Resend" on the verification banner.',
        [],
        { type: 'warning', icon: 'mail-outline', iconColor: '#FF9500' }
      );
      return;
    }

    setCartoonStyleModalVisible(true);
  };

  // Open history modal
  const handleOpenCartoonHistory = () => {
    // Check email verification first
    const isGoogleUser = user?.providerData?.some(provider => provider.providerId === 'google.com');

    if (!emailVerified && !isGoogleUser) {
      showAlert(
        'Email Verification Required',
        'Please verify your email address to access AI features.',
        [],
        { type: 'warning', icon: 'mail-outline', iconColor: '#FF9500' }
      );
      return;
    }

    setCartoonHistoryModalVisible(true);
  };

  // Handle style selection and generation
  const handleGenerateCartoon = async (styleId, customPrompt = null, generationOptions = {}) => {
    // Check email verification first (required for all AI features to prevent abuse)
    // Google users are automatically verified by Google
    const isGoogleUser = user?.providerData?.some(provider => provider.providerId === 'google.com');

    if (!emailVerified && !isGoogleUser) {
      showAlert(
        'Email Verification Required',
        'Please verify your email address before using AI features. Check your inbox for the verification link or click "Resend" on the verification banner.',
        [],
        { type: 'warning' }
      );
      return;
    }

    // For custom prompts with custom images or ignoreProfilePicture flag, we allow generation without profile photo
    const { customImage, ignoreProfilePicture } = generationOptions;
    const needsProfilePhoto = !customImage && !ignoreProfilePicture;

    if (!user?.uid || (needsProfilePhoto && !userProfile?.profilePhoto)) {
      showAlert('Error', 'Please set a profile photo, upload a custom image, or enable "Generate without profile picture" before generating.', [], { type: 'warning' });
      return;
    }

    // Validate Gold users for custom prompts
    if (styleId === 'custom' && userProfile?.subscriptionPlan !== 'gold' && !isAdmin) {
      showAlert('Premium Feature', 'Custom prompts and custom images are exclusive to Gold members. Upgrade to Gold to unlock unlimited creative generation!', [], { type: 'warning' });
      return;
    }

    // Close style modal and show progress indicator
    setCartoonStyleModalVisible(false);
    setIsGeneratingCartoon(true);

    // Extract options
    const { notifyWhenDone = false } = generationOptions;

    // Store generation info for progress indicator
    const styleName = styleId === 'custom' ? 'Custom Avatar' : (styleId.charAt(0).toUpperCase() + styleId.slice(1));
    setCurrentGenerationStyle(styleName);
    setCurrentGenerationNotify(notifyWhenDone);
    setShowGenerationProgress(true);

    let tempImageData = null; // Store temp image info for cleanup

    try {
      // Extract model option
      const { model = 'gpt-3.5-turbo' } = generationOptions;

      // Determine which image to use
      let imageUrlToUse = null;
      if (customImage) {
        // Gold user uploaded a custom image
        console.log('[SettingsScreen] Uploading custom image for Gold user');
        tempImageData = await uploadTemporaryCustomImage(user.uid, customImage);
        imageUrlToUse = tempImageData.url;
        console.log('[SettingsScreen] Using custom image URL:', imageUrlToUse);
      } else if (!ignoreProfilePicture && userProfile.profilePhoto) {
        // Use profile photo (default behavior)
        imageUrlToUse = userProfile.profilePhoto;
        console.log('[SettingsScreen] Using profile photo');
      } else if (ignoreProfilePicture) {
        // Gold user wants to generate without any image reference (text-only)
        imageUrlToUse = null;
        console.log('[SettingsScreen] Text-only generation (ignoring profile picture)');
      }

      // Generate cartoon using OpenAI with selected model
      const result = await generateCartoonProfile(
        imageUrlToUse,
        styleId,
        userProfile.gender || 'neutral',
        customPrompt, // Pass custom prompt for Gold users
        userProfile?.subscriptionPlan || 'basic', // Pass subscription plan for Vision analysis
        model, // Pass selected GPT model
        cartoonUsageData?.gpt4VisionUsage || 0 // Pass current GPT-4 Vision usage
      );

      // Upload to Firebase Storage
      const storageUrl = await uploadCartoonToStorage(user.uid, result.imageUrl, styleId);

      // Record generation and update history (use 'custom' as style if custom prompt)
      await recordCartoonGeneration(
        user.uid,
        storageUrl,
        styleId === 'custom' ? 'custom' : styleId,
        isAdmin,
        userPlan,
        result.usedGpt4,
        customPrompt || null // Save the prompt if provided
      );

      // Delete temporary custom image if it was used
      if (tempImageData) {
        await deleteTemporaryCustomImage(tempImageData.storagePath);
        tempImageData = null;
      }

      // Reload data to update UI
      await loadCartoonData();

      // Close progress indicator
      setShowGenerationProgress(false);
      setIsGeneratingCartoon(false);

      // Wait for progress to close
      await new Promise(resolve => setTimeout(resolve, 300));

      // Send notification if requested
      if (notifyWhenDone) {
        const styleName = styleId === 'custom' ? 'custom' : styleId;
        await scheduleCartoonReadyNotification(styleName);
      }

      // Show success modal with quote
      setCartoonSuccessModalVisible(true);
    } catch (error) {
      console.error('[SettingsScreen] Error generating cartoon:', error);

      // Clean up temporary image on error
      if (tempImageData) {
        await deleteTemporaryCustomImage(tempImageData.storagePath);
      }

      // Close progress indicator
      setShowGenerationProgress(false);
      setIsGeneratingCartoon(false);

      // Wait for progress to close
      await new Promise(resolve => setTimeout(resolve, 300));

      showAlert('Error', error.message || 'Failed to generate cartoon. Please try again.', [], { type: 'error' });
    }
  };

  // Set cartoon as profile picture
  const handleSetCartoonAsProfile = async (pictureUrl) => {
    if (!user?.uid) return;

    setIsCartoonProcessing(true);

    // Close modal immediately to prevent freezing
    setCartoonHistoryModalVisible(false);

    try {
      // Wait for modal to fully close
      await new Promise(resolve => setTimeout(resolve, 300));

      await setAsProfilePicture(user.uid, pictureUrl);
      await reloadProfile();

      // Show success alert after everything completes
      showAlert('Success', 'Your cartoon avatar is now your profile picture!', [], { type: 'success' });
    } catch (error) {
      console.error('[SettingsScreen] Error setting profile:', error);
      showAlert('Error', 'Failed to update profile picture. Please try again.', [], { type: 'error' });
    } finally {
      setIsCartoonProcessing(false);
    }
  };

  // Delete a single cartoon picture
  const handleDeleteCartoonPicture = async (pictureId) => {
    if (!user?.uid) return;

    try {
      await removePictureFromHistory(user.uid, pictureId);
      await loadCartoonData();
      // Success - no alert needed, user already confirmed
    } catch (error) {
      console.error('[SettingsScreen] Error deleting picture:', error);
      showAlert('Error', 'Failed to delete picture. Please try again.', [], { type: 'error' });
    }
  };

  // Clear all cartoon history
  const handleClearCartoonHistory = async () => {
    if (!user?.uid) return;

    setIsCartoonProcessing(true);

    // Close modal immediately
    setCartoonHistoryModalVisible(false);

    try {
      // Wait for modal to close
      await new Promise(resolve => setTimeout(resolve, 300));

      await clearCartoonHistory(user.uid);
      await loadCartoonData();

      // Show success after completion
      showAlert('Success', 'All cartoon pictures cleared.', [], { type: 'success' });
    } catch (error) {
      console.error('[SettingsScreen] Error clearing history:', error);
      showAlert('Error', 'Failed to clear history. Please try again.', [], { type: 'error' });
    } finally {
      setIsCartoonProcessing(false);
    }
  };

  return (
    <ScreenLayout
      title="Settings"
      subtitle="Control your experience"
      navigation={navigation}
      activeTab="settings"
      showFooter
      contentStyle={styles.screenContent}
    >
      <Modal
        visible={emailAuthVisible}
        transparent
        animationType="slide"
        onRequestClose={closeEmailAuth}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.emailModalBackdrop}
        >
          <TouchableWithoutFeedback onPress={closeEmailAuth}>
            <View style={styles.emailModalOverlay} />
          </TouchableWithoutFeedback>
          <View style={styles.emailModalCard}>
            <View style={styles.emailModalHeader}>
              <Text style={styles.emailModalTitle}>{emailModeTitle}</Text>
              <TouchableOpacity
                onPress={closeEmailAuth}
                style={styles.emailCloseButton}
                activeOpacity={0.85}
              >
                <Ionicons name="close" size={20} color={themeColors.textPrimary} />
              </TouchableOpacity>
            </View>
            <Text style={styles.emailModalHint}>
              {emailAuthMode === 'signIn'
                ? 'Sign in to sync your nickname and pick up right where you left off.'
                : emailAuthMode === 'signUp'
                  ? 'Create an account to stash rewards and customize your experience.'
                  : 'Enter your account email and we will send reset instructions.'}
            </Text>
            <View style={styles.emailForm}>
              <TextInput
                style={styles.emailInput}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                placeholder="you@example.com"
                placeholderTextColor={themeColors.textSecondary}
                value={emailInput}
                onChangeText={setEmailInput}
              />
              {emailAuthMode !== 'reset' ? (
                <TextInput
                  style={styles.emailInput}
                  secureTextEntry
                  placeholder="Password"
                  placeholderTextColor={themeColors.textSecondary}
                  value={passwordInput}
                  onChangeText={setPasswordInput}
                />
              ) : null}
              {emailAuthMode === 'signUp' ? (
                <>
                  <TextInput
                    style={styles.emailInput}
                    secureTextEntry
                    placeholder="Confirm password"
                    placeholderTextColor={themeColors.textSecondary}
                    value={confirmPasswordInput}
                    onChangeText={setConfirmPasswordInput}
                  />
                  <TextInput
                    style={styles.emailInput}
                    placeholder="Display name"
                    placeholderTextColor={themeColors.textSecondary}
                    value={displayNameInput}
                    onChangeText={setDisplayNameInput}
                  />
                </>
              ) : null}
            </View>
            {emailLocalError ? (
              <Text style={styles.emailErrorText}>{emailLocalError}</Text>
            ) : null}
            {authError ? <Text style={styles.emailErrorText}>{authError}</Text> : null}
            {emailStatusMessage ? (
              <Text style={styles.emailStatusText}>{emailStatusMessage}</Text>
            ) : null}
            <TouchableOpacity
              style={[styles.emailSubmitButton, isEmailBusy && styles.emailSubmitButtonDisabled]}
              onPress={handleEmailAuthSubmit}
              activeOpacity={0.85}
              disabled={isEmailBusy}
            >
              {isEmailBusy ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.emailSubmitLabel}>{emailPrimaryButtonLabel}</Text>
              )}
            </TouchableOpacity>
            <View style={styles.emailFooterLinks}>
              {emailAuthMode === 'signIn' ? (
                <>
                  <TouchableOpacity
                    onPress={() => handleSwitchToMode('reset')}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.emailFooterLink}>Forgot password?</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleSwitchToMode('signUp')}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.emailFooterLink}>Need an account? Sign up</Text>
                  </TouchableOpacity>
                </>
              ) : null}
              {emailAuthMode === 'signUp' ? (
                <TouchableOpacity
                  onPress={() => handleSwitchToMode('signIn')}
                  activeOpacity={0.8}
                >
                  <Text style={styles.emailFooterLink}>Already have an account? Sign in</Text>
                </TouchableOpacity>
              ) : null}
              {emailAuthMode === 'reset' ? (
                <TouchableOpacity
                  onPress={() => handleSwitchToMode('signIn')}
                  activeOpacity={0.8}
                >
                  <Text style={styles.emailFooterLink}>Return to sign in</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <EmailVerificationBanner />
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          {user ? (
            <>
              <Text style={styles.sectionHint}>
                Signed in with Google. Your rewards travel with you.
              </Text>
              {isPremiumOrAbove ? (
                <LinearGradient
                  colors={goldAccent.gradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.goldHero}
                >
                  <View style={styles.goldHeroCopy}>
                    <View style={styles.goldHeroBadgeRow}>
                      <PremiumBadge size={40} />
                      <Text style={styles.goldHeroTitle}>
                        {isUltimateMember ? 'Gold lounge access' : 'Premium lounge access'}
                      </Text>
                    </View>
                    <Text style={styles.goldHeroSubtitle}>
                      {isUltimateMember
                        ? 'Thanks for backing the community. Your boosts, VIP support, and secret drops stay active while this badge glows.'
                        : 'Thank you for being a Premium subscriber! Enjoy unlimited AI features, custom prompts, and VIP support.'}
                    </Text>
                    <View style={styles.goldHeroPerks}>
                      <View style={styles.goldHeroChip}>
                        <Ionicons name="flash-outline" size={14} color="#fff" />
                        <Text style={styles.goldHeroChipText}>Daily boost</Text>
                      </View>
                      <View style={styles.goldHeroChip}>
                        <Ionicons name="shield-checkmark-outline" size={14} color="#fff" />
                        <Text style={styles.goldHeroChipText}>Priority support</Text>
                      </View>
                      <View style={styles.goldHeroChip}>
                        <Ionicons name="sparkles-outline" size={14} color="#fff" />
                        <Text style={styles.goldHeroChipText}>
                          {isUltimateMember ? 'Exclusive drops' : 'Premium features'}
                        </Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      style={styles.goldHeroButton}
                      onPress={() => navigation.navigate('Subscription')}
                      activeOpacity={0.9}
                    >
                      <Text style={styles.goldHeroButtonText}>
                        {isUltimateMember ? 'View Gold perks' : 'View Premium perks'}
                      </Text>
                      <Ionicons name="chevron-forward" size={16} color="#0d0f1c" />
                    </TouchableOpacity>
                  </View>
                  <View style={styles.goldHeroArt}>
                    <LottieView
                      source={GOLD_BADGE_ANIMATION}
                      autoPlay
                      loop
                      style={styles.goldHeroAnimation}
                    />
                  </View>
                </LinearGradient>
              ) : null}
              <View style={styles.item}>
                <View>
                  <Text style={styles.itemTitle}>
                    {userProfile?.displayName || authProfile?.displayName || user.displayName || 'Mystery guest'}
                  </Text>
                  <Text style={styles.itemSubtitle}>
                    {authProfile?.email || user.email || 'Signed in with Google'}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[
                    styles.authButton,
                    styles.signOutButton,
                    signingOut && styles.authButtonDisabled
                  ]}
                  onPress={handleSignOut}
                  activeOpacity={0.85}
                  disabled={signingOut}
                >
                  <Text style={styles.authButtonText}>
                    {signingOut ? 'Signing out...' : 'Sign out'}
                  </Text>
                </TouchableOpacity>
              </View>
              {/* Tutorial Demo Button */}
              <TouchableOpacity
                style={styles.profileLinkRow}
                onPress={() => navigation.navigate('TutorialDemo')}
                activeOpacity={0.85}
              >
                <View style={styles.profileLinkCopy}>
                  <Text style={styles.profileLinkLabel}>📚 Tutorial & Onboarding</Text>
                  <Text style={styles.profileLinkHint}>See the interactive step-by-step guide</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} style={styles.profileLinkIcon} />
              </TouchableOpacity>

              {/* [PUBLIC-MODE] View Public Profile button */}
              {userProfile?.isPublicProfile ? (
                <TouchableOpacity
                  style={styles.profileLinkRow}
                  onPress={() => navigation.navigate('PublicProfile', { userId: user?.uid })}
                  activeOpacity={0.85}
                >
                  <View style={styles.profileLinkCopy}>
                    <Text style={styles.profileLinkLabel}>View public profile</Text>
                    <Text style={styles.profileLinkHint}>@{userProfile.username} · {userProfile.followersCount || 0} followers</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} style={styles.profileLinkIcon} />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.profileLinkRow}
                  onPress={() => navigation.navigate('ProfileSetup')}
                  activeOpacity={0.85}
                >
                  <View style={styles.profileLinkCopy}>
                    <Text style={styles.profileLinkLabel}>Create public profile</Text>
                    <Text style={styles.profileLinkHint}>Post as yourself and build a following</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} style={styles.profileLinkIcon} />
                </TouchableOpacity>
              )}

              {isAdmin ? (
                <TouchableOpacity
                  style={styles.profileLinkRow}
                  onPress={() => navigation.navigate('Moderation')}
                  activeOpacity={0.85}
                >
                  <View style={styles.profileLinkCopy}>
                    <Text style={styles.profileLinkLabel}>Moderation dashboard</Text>
                    <Text style={styles.profileLinkHint}>Review reported posts and statuses</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} style={styles.profileLinkIcon} />
                </TouchableOpacity>
              ) : null}
              <View style={styles.rewardsCard}>
                {/* Show paid subscription card for Go/Premium/Ultimate subscribers */}
                {userPlan === 'premium' || userPlan === 'gold' || userPlan === 'ultimate' ? (
                  <>
                    <View style={styles.rewardsHeader}>
                      <Text style={styles.rewardsLabel}>
                        {userPlan === 'ultimate' ? '👑 Gold Subscriber' : userPlan === 'gold' ? '👑 Premium Subscriber' : '⭐ Go Subscriber'}
                      </Text>
                      <View style={styles.rewardsPointsRow}>
                        {userPlan === 'gold' || userPlan === 'ultimate' ? (
                          <Text style={[styles.rewardsPoints, { color: '#FFD700' }]}>
                            {userPlan === 'ultimate' ? 'Gold' : 'Premium'}
                          </Text>
                        ) : (
                          <Text style={[styles.rewardsPoints, { color: themeColors.primary }]}>Go</Text>
                        )}
                      </View>
                    </View>
                    <Text style={styles.rewardsMeta}>
                      {userPlan === 'ultimate'
                        ? 'Thank you for being a Gold subscriber! Enjoy ultimate AI features, custom prompts, VIP support, and exclusive drops.'
                        : userPlan === 'gold'
                        ? 'Thank you for being a Premium subscriber! Enjoy unlimited AI features, custom prompts, and VIP support.'
                        : 'Thank you for being a Go subscriber! Enjoy unlimited posts, AI features, and ad-free experience.'}
                    </Text>

                    {/* Manage Subscription Button */}
                    <TouchableOpacity
                      style={styles.subscriptionButton}
                      onPress={() => navigation.navigate('Subscription')}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="star-outline" size={20} color={themeColors.primary} />
                      <Text style={[styles.subscriptionButtonText, { color: themeColors.primary }]}>
                        Manage Subscription
                      </Text>
                      <Ionicons name="chevron-forward" size={20} color={themeColors.textSecondary} />
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    {/* Show point-based premium card for Basic users */}
                    <View style={styles.rewardsHeader}>
                      <Text style={styles.rewardsLabel}>Point balance</Text>
                      <View style={styles.rewardsPointsRow}>
                        <Text style={styles.rewardsPoints}>{pointsBalance} pts</Text>
                        {premiumUnlocked && <PremiumBadge size={32} style={styles.premiumBadge} />}
                      </View>
                    </View>
                    <Text style={styles.rewardsMeta}>
                      {premiumUnlocked
                        ? premiumExpiryLabel
                          ? `Premium active | expires ${premiumExpiryLabel}`
                          : 'Premium active - enjoy the perks!'
                        : `Collect ${premiumDayCost} points to unlock a day of premium access.`}
                    </Text>
                    <TouchableOpacity
                      style={[
                        styles.redeemButton,
                        redeemDisabled && styles.redeemButtonDisabled
                      ]}
                      onPress={handleRedeemPremium}
                      activeOpacity={0.85}
                      disabled={redeemDisabled}
                    >
                      <Text
                        style={[
                          styles.redeemButtonLabel,
                          redeemDisabled && styles.redeemButtonLabelDisabled
                        ]}
                      >
                        {isRedeeming
                          ? 'Activating...'
                          : premiumUnlocked
                            ? `Extend premium (${premiumDayCost} pts)`
                            : `Unlock premium (${premiumDayCost} pts)`}
                      </Text>
                    </TouchableOpacity>
                    {!premiumUnlocked && pointsGap > 0 ? (
                      <Text style={styles.rewardsProgress}>{`${pointsGap} pts to go`}</Text>
                    ) : null}

                    {/* Subscription Plans Button */}
                    <TouchableOpacity
                      style={styles.subscriptionButton}
                      onPress={() => navigation.navigate('Subscription')}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="star-outline" size={20} color={themeColors.primary} />
                      <Text style={[styles.subscriptionButtonText, { color: themeColors.primary }]}>
                        View Subscription Plans
                      </Text>
                      <Ionicons name="chevron-forward" size={20} color={themeColors.textSecondary} />
                    </TouchableOpacity>
                  </>
                )}

                {/* Reset Subscription Button (Testing Only) - COMMENTED OUT FOR PRODUCTION */}
                {/* <TouchableOpacity
                  style={[styles.subscriptionButton, { backgroundColor: '#ff000010', marginTop: 12 }]}
                  onPress={handleResetSubscription}
                  activeOpacity={0.7}
                  disabled={resettingSubscription}
                >
                  {resettingSubscription ? (
                    <ActivityIndicator size="small" color="#ff0000" />
                  ) : (
                    <>
                      <Ionicons name="refresh-outline" size={20} color="#ff0000" />
                      <Text style={[styles.subscriptionButtonText, { color: '#ff0000', flex: 1 }]}>
                        Reset Subscription (Testing)
                      </Text>
                    </>
                  )}
                </TouchableOpacity> */}
              </View>
            </>
          ) : (
            <>
              <Text style={styles.sectionHint}>
                Sign in to stash your nickname and start with {SIGNUP_BONUS_POINTS} reward points.
              </Text>
              <View style={styles.emailCtaRow}>
                <TouchableOpacity
                  style={styles.emailPrimaryButton}
                  onPress={() => openEmailAuth('signIn')}
                  activeOpacity={0.85}
                >
                  <Ionicons name="mail-outline" size={20} color="#fff" style={styles.emailButtonIcon} />
                  <Text style={styles.emailPrimaryButtonText}>Sign in with Email</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.emailSecondaryButton}
                  onPress={() => openEmailAuth('signUp')}
                  activeOpacity={0.85}
                >
                  <Text style={styles.emailSecondaryButtonText}>Create an account</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
          {authError ? <Text style={styles.authErrorText}>{authError}</Text> : null}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Permissions</Text>
          <View style={styles.item}>
            <View>
              <Text style={styles.itemTitle}>Location access</Text>
              <Text style={styles.itemSubtitle}>
                Helps suggest nearby rooms and surface local chatter.
              </Text>
            </View>
            <Switch
              value={locationEnabled}
              onValueChange={handleToggleLocation}
              trackColor={{ true: accentSwitchColor, false: inactiveTrackColor }}
              thumbColor={locationEnabled ? activeThumbColor : inactiveThumbColor}
              ios_backgroundColor={inactiveTrackColor}
            />
          </View>
          <View style={styles.item}>
            <View>
              <Text style={styles.itemTitle}>Notifications</Text>
              <Text style={styles.itemSubtitle}>
                Get nudges when someone replies to your anonymous posts.
              </Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              trackColor={{ true: accentSwitchColor, false: inactiveTrackColor }}
              thumbColor={notificationsEnabled ? activeThumbColor : inactiveThumbColor}
              ios_backgroundColor={inactiveTrackColor}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick actions</Text>
          <View style={styles.item}>
            <View>
              <Text style={styles.itemTitle}>Show add post shortcut</Text>
              <Text style={styles.itemSubtitle}>
                Keep the floating action handy for rapid posting anywhere.
              </Text>
            </View>
            <Switch
              value={showAddShortcut}
              onValueChange={setShowAddShortcut}
              trackColor={{ true: accentSwitchColor, false: inactiveTrackColor }}
              thumbColor={showAddShortcut ? activeThumbColor : inactiveThumbColor}
              ios_backgroundColor={inactiveTrackColor}
            />
          </View>
          <TouchableOpacity
            style={styles.onboardingButton}
            onPress={handleViewOnboarding}
            activeOpacity={0.7}
          >
            <View style={[styles.onboardingIcon, { backgroundColor: `${themeColors.primary}20` }]}>
              <Ionicons name="book-outline" size={20} color={themeColors.primary} />
            </View>
            <View style={styles.onboardingTextBlock}>
              <Text style={styles.itemTitle}>View onboarding</Text>
              <Text style={styles.itemSubtitle}>
                Revisit the app tour and learn how to use LocalLoop.
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={themeColors.textSecondary} />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Neighborhood Discovery</Text>
          <Text style={styles.sectionHint}>
            Use device sensors to enhance your local exploration experience.
          </Text>
          <TouchableOpacity
            style={[
              styles.discoveryPresetCard,
              discoveryPresetActive && styles.discoveryPresetCardActive
            ]}
            activeOpacity={0.85}
            onPress={enableDiscoveryPreset}
            disabled={discoveryPresetActive || enablingDiscovery}
          >
            <View
              style={[
                styles.discoveryPresetIcon,
                discoveryPresetActive && styles.discoveryPresetIconActive
              ]}
            >
              <Ionicons
                name="flash-outline"
                size={20}
                color={discoveryPresetActive ? '#fff' : themeColors.primary}
              />
            </View>
            <View style={styles.discoveryPresetCopy}>
              <Text style={[
                styles.discoveryPresetTitle,
                discoveryPresetActive && styles.discoveryPresetTitleActive
              ]}>
                {discoveryPresetActive ? 'Discovery enabled on Explore' : 'Enable for Explore tab'}
              </Text>
              <Text
                style={[
                  styles.discoveryPresetSubtitle,
                  discoveryPresetActive && styles.discoveryPresetSubtitleActive
                ]}
              >
                Turn on core sensors so the Explore screen shows live neighborhood stats.
              </Text>
            </View>
            {enablingDiscovery ? (
              <ActivityIndicator
                size="small"
                color={discoveryPresetActive ? '#fff' : themeColors.textSecondary}
              />
            ) : (
              <Ionicons
                name={discoveryPresetActive ? 'checkmark-circle' : 'chevron-forward'}
                size={20}
                color={discoveryPresetActive ? themeColors.primary : themeColors.textSecondary}
              />
            )}
          </TouchableOpacity>
          <View style={styles.item}>
            <View>
              <Text style={styles.itemTitle}>Show on Explore tab</Text>
              <Text style={styles.itemSubtitle}>
                Keep the Neighborhood Explorer card visible on the Country screen.
              </Text>
            </View>
            <Switch
              value={showDiscoveryOnExplore}
              onValueChange={setShowDiscoveryOnExplore}
              trackColor={{ true: accentSwitchColor, false: inactiveTrackColor }}
              thumbColor={showDiscoveryOnExplore ? activeThumbColor : inactiveThumbColor}
              ios_backgroundColor={inactiveTrackColor}
            />
          </View>
          <View style={styles.item}>
            <View>
              <Text style={styles.itemTitle}>Show status bar</Text>
              <Text style={styles.itemSubtitle}>
                Display the time and battery at the top of your screen.
              </Text>
            </View>
            <Switch
              value={showHeaderBar}
              onValueChange={setShowHeaderBar}
              trackColor={{ true: accentSwitchColor, false: inactiveTrackColor }}
              thumbColor={showHeaderBar ? activeThumbColor : inactiveThumbColor}
              ios_backgroundColor={inactiveTrackColor}
            />
          </View>
          <View style={styles.item}>
            <View>
              <Text style={styles.itemTitle}>Step counter</Text>
              <Text style={styles.itemSubtitle}>
                Track daily steps and distance traveled in your neighborhood.
              </Text>
            </View>
            <Switch
              value={stepCounterEnabled}
              onValueChange={toggleStepCounter}
              trackColor={{ true: accentSwitchColor, false: inactiveTrackColor }}
              thumbColor={stepCounterEnabled ? activeThumbColor : inactiveThumbColor}
              ios_backgroundColor={inactiveTrackColor}
            />
          </View>
          <View style={styles.item}>
            <View>
              <Text style={styles.itemTitle}>Activity detection</Text>
              <Text style={styles.itemSubtitle}>
                Adjust discovery radius based on movement (walking, running, driving).
              </Text>
            </View>
            <Switch
              value={motionDetectionEnabled}
              onValueChange={toggleMotionDetection}
              trackColor={{ true: accentSwitchColor, false: inactiveTrackColor }}
              thumbColor={motionDetectionEnabled ? activeThumbColor : inactiveThumbColor}
              ios_backgroundColor={inactiveTrackColor}
            />
          </View>
          <View style={styles.item}>
            <View>
              <Text style={styles.itemTitle}>Shake to discover</Text>
              <Text style={styles.itemSubtitle}>
                Shake your phone to find random nearby posts.
              </Text>
            </View>
            <Switch
              value={shakeEnabled}
              onValueChange={toggleShake}
              trackColor={{ true: accentSwitchColor, false: inactiveTrackColor }}
              thumbColor={shakeEnabled ? activeThumbColor : inactiveThumbColor}
              ios_backgroundColor={inactiveTrackColor}
            />
          </View>
          <View style={styles.item}>
            <View>
              <Text style={styles.itemTitle}>Weather awareness</Text>
              <Text style={styles.itemSubtitle}>
                Detect atmospheric pressure for weather-based features.
              </Text>
            </View>
            <Switch
              value={barometerEnabled}
              onValueChange={toggleBarometer}
              trackColor={{ true: accentSwitchColor, false: inactiveTrackColor }}
              thumbColor={barometerEnabled ? activeThumbColor : inactiveThumbColor}
              ios_backgroundColor={inactiveTrackColor}
            />
          </View>
          <View style={styles.item}>
            <View>
              <Text style={styles.itemTitle}>Compass navigation</Text>
              <Text style={styles.itemSubtitle}>
                Show directional information for nearby posts.
              </Text>
            </View>
            <Switch
              value={compassEnabled}
              onValueChange={toggleCompass}
              trackColor={{ true: accentSwitchColor, false: inactiveTrackColor }}
              thumbColor={compassEnabled ? activeThumbColor : inactiveThumbColor}
              ios_backgroundColor={inactiveTrackColor}
            />
          </View>
          {Platform.OS === 'android' && (
            <View style={styles.itemLast}>
              <View>
                <Text style={styles.itemTitle}>Ambient light adaptation</Text>
                <Text style={styles.itemSubtitle}>
                  Auto-adjust UI brightness based on surroundings (Android only).
                </Text>
              </View>
              <Switch
                value={ambientLightEnabled}
                onValueChange={toggleAmbientLight}
                trackColor={{ true: accentSwitchColor, false: inactiveTrackColor }}
                thumbColor={ambientLightEnabled ? activeThumbColor : inactiveThumbColor}
                ios_backgroundColor={inactiveTrackColor}
              />
            </View>
          )}
          {Platform.OS !== 'android' && (
            <View style={styles.itemLast}>
              <View>
                <Text style={styles.itemTitle}>Compass navigation</Text>
                <Text style={styles.itemSubtitle}>
                  Show directional information for nearby posts.
                </Text>
              </View>
              <Switch
                value={compassEnabled}
                onValueChange={toggleCompass}
                trackColor={{ true: accentSwitchColor, false: inactiveTrackColor }}
                thumbColor={compassEnabled ? activeThumbColor : inactiveThumbColor}
                ios_backgroundColor={inactiveTrackColor}
              />
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Appearance</Text>
          <View style={styles.item}>
            <View>
              <Text style={styles.itemTitle}>Dark mode</Text>
              <Text style={styles.itemSubtitle}>
                Dim backgrounds and cards for late-night browsing.
              </Text>
            </View>
            <Switch
              value={isDarkMode}
              onValueChange={setIsDarkMode}
              trackColor={{ true: accentSwitchColor, false: inactiveTrackColor }}
              thumbColor={isDarkMode ? activeThumbColor : inactiveThumbColor}
              ios_backgroundColor={inactiveTrackColor}
            />
          </View>
          <View style={styles.item}>
            <View>
              <Text style={styles.itemTitle}>Dreamy scroll indicator</Text>
              <Text style={styles.itemSubtitle}>
                Adds a floating accent scroll thumb to long post descriptions.
              </Text>
            </View>
            <Switch
              value={dreamyScrollIndicatorEnabled}
              onValueChange={setDreamyScrollIndicatorEnabled}
              trackColor={{ true: accentSwitchColor, false: inactiveTrackColor }}
              thumbColor={dreamyScrollIndicatorEnabled ? activeThumbColor : inactiveThumbColor}
              ios_backgroundColor={inactiveTrackColor}
            />
          </View>
          <Text style={styles.sectionHint}>
            Pick the accent color used across the app.
          </Text>
          <View
            style={[styles.accentRow, premiumAccentEnabled && styles.accentRowDisabled]}
            pointerEvents={premiumAccentEnabled ? 'none' : 'auto'}
          >
            {accentOptions.map((option) => {
              const isActive = option.key === accentKey;

              return (
                <TouchableOpacity
                  key={option.key}
                  activeOpacity={0.85}
                  onPress={() => setAccentKey(option.key)}
                  style={[
                    styles.accentSwatch,
                    {
                      backgroundColor: isActive ? themeColors.card : themeColors.background,
                      borderColor: isActive
                        ? option.isDark ? '#ffffff' : themeColors.textPrimary
                        : 'rgba(0,0,0,0.08)'
                    },
                    isActive && styles.accentSwatchActive
                  ]}
                >
                  <View
                    style={[styles.accentDot, { backgroundColor: option.background }]}
                  />
                  <Text style={styles.accentLabel}>{option.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {premiumAccentEnabled ? (
            <Text style={styles.accentPremiumNotice}>
              Premium themes override the accent while enabled.
            </Text>
          ) : null}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Premium</Text>
          <Text style={styles.sectionHint}>
            Adjust post typography to suit your vibe. These tweaks only affect your device.
          </Text>
          <View style={styles.item}>
            <View>
              <Text style={styles.itemTitle}>Premium typography</Text>
              <Text style={styles.itemSubtitle}>
                Unlock custom font sizes for post titles and descriptions.
              </Text>
            </View>
            <Switch
              value={premiumTypographyEnabled}
              onValueChange={handleTogglePremiumTypography}
              trackColor={{ true: accentSwitchColor, false: inactiveTrackColor }}
              thumbColor={premiumTypographyEnabled ? activeThumbColor : inactiveThumbColor}
              ios_backgroundColor={inactiveTrackColor}
              disabled={!canUseTypography}
            />
          </View>
          <View
            style={[
              styles.item,
              styles.premiumControlRow,
              !premiumTypographyEnabled && styles.itemDisabledSimple
            ]}
          >
            <View>
              <Text style={styles.itemTitle}>Custom title size</Text>
              <Text style={styles.itemSubtitle}>
                {premiumTitleFontSizeEnabled
                  ? `Currently ${premiumTitleFontSize} pt.`
                  : `Use default ${DEFAULT_TITLE_FONT_SIZE} pt titles.`}
              </Text>
            </View>
            <Switch
              value={premiumTitleFontSizeEnabled}
              onValueChange={handleToggleTitleSizeOverride}
              trackColor={{ true: accentSwitchColor, false: inactiveTrackColor }}
              thumbColor={premiumTitleFontSizeEnabled ? activeThumbColor : inactiveThumbColor}
              ios_backgroundColor={inactiveTrackColor}
              disabled={!canUseTypography || !premiumTypographyEnabled}
            />
          </View>
          {premiumTypographyEnabled && premiumTitleFontSizeEnabled ? (
            <View style={styles.premiumInputBlock}>
              <View style={styles.premiumInputRow}>
                <Text style={styles.premiumInputLabel}>Title font size</Text>
                <TextInput
                  value={titleSizeDraft}
                  onChangeText={handleTitleSizeChange}
                  onBlur={handleTitleSizeBlur}
                  keyboardType="number-pad"
                  returnKeyType="done"
                  maxLength={2}
                  onSubmitEditing={handleTitleSizeBlur}
                  style={styles.premiumInput}
                />
              </View>
              <Text style={styles.premiumInputHint}>
                {`${PREMIUM_TITLE_FONT_SIZE_RANGE.min}-${PREMIUM_TITLE_FONT_SIZE_RANGE.max} pt range.`}
              </Text>
            </View>
          ) : null}
          <View style={styles.premiumDivider} />
          <View
            style={[
              styles.itemLast,
              styles.premiumControlRow,
              !premiumTypographyEnabled && styles.itemDisabledSimple
            ]}
          >
            <View>
              <Text style={styles.itemTitle}>Custom description size</Text>
              <Text style={styles.itemSubtitle}>
                {premiumDescriptionFontSizeEnabled
                  ? `Currently ${premiumDescriptionFontSize} pt.`
                  : `Use default ${DEFAULT_DESCRIPTION_FONT_SIZE} pt descriptions.`}
              </Text>
            </View>
            <Switch
              value={premiumDescriptionFontSizeEnabled}
              onValueChange={handleToggleDescriptionSizeOverride}
              trackColor={{ true: accentSwitchColor, false: inactiveTrackColor }}
              thumbColor={
                premiumDescriptionFontSizeEnabled ? activeThumbColor : inactiveThumbColor
              }
              ios_backgroundColor={inactiveTrackColor}
              disabled={!canUseTypography || !premiumTypographyEnabled}
            />
          </View>
          {premiumTypographyEnabled && premiumDescriptionFontSizeEnabled ? (
            <View style={[styles.premiumInputBlock, styles.premiumInputSpacing]}>
              <View style={styles.premiumInputRow}>
                <Text style={styles.premiumInputLabel}>Description font size</Text>
                <TextInput
                  value={descriptionSizeDraft}
                  onChangeText={handleDescriptionSizeChange}
                  onBlur={handleDescriptionSizeBlur}
                  keyboardType="number-pad"
                  returnKeyType="done"
                  maxLength={2}
                  onSubmitEditing={handleDescriptionSizeBlur}
                  style={styles.premiumInput}
                />
              </View>
              <Text style={styles.premiumInputHint}>
                {`${PREMIUM_DESCRIPTION_FONT_SIZE_RANGE.min}-${PREMIUM_DESCRIPTION_FONT_SIZE_RANGE.max} pt range.`}
              </Text>
            </View>
          ) : null}
          <View style={styles.premiumDivider} />
          <View style={styles.item}>
            <View>
              <Text style={styles.itemTitle}>AI description summaries</Text>
              <Text style={styles.itemSubtitle}>
                Let BART condense long descriptions while composing posts.
              </Text>
            </View>
            <Switch
              value={premiumSummariesEnabled}
              onValueChange={handleTogglePremiumSummaries}
              trackColor={{ true: accentSwitchColor, false: inactiveTrackColor }}
              thumbColor={premiumSummariesEnabled ? activeThumbColor : inactiveThumbColor}
              ios_backgroundColor={inactiveTrackColor}
              disabled={!hasAnyPaidPlan}
            />
          </View>
          {premiumSummariesEnabled ? (
            <>
              <Text style={[styles.sectionHint, styles.premiumHintSpacing]}>
                Summaries appear in the composer as a premium-only action.
              </Text>
              <View style={styles.summaryLengthBlock}>
                <Text style={styles.summaryLengthTitle}>Summary length</Text>
                <Text style={styles.summaryLengthSubtitle}>
                  Choose how much detail the AI keeps when condensing posts.
                </Text>
                <View style={styles.summaryLengthOptions}>
                  {summaryLengthOptions.map((option, index) => {
                    const isActive = option.key === premiumSummaryLength;
                    return (
                      <TouchableOpacity
                        key={option.key}
                        style={[
                          styles.summaryLengthOption,
                          index > 0 ? styles.summaryLengthOptionSpacing : null,
                          {
                            backgroundColor: isActive
                              ? accentSwitchColor
                              : themeColors.card,
                            borderColor: isActive
                              ? accentSwitchColor
                              : themeColors.divider
                          }
                        ]}
                        onPress={() => handleSelectSummaryLength(option.key)}
                        activeOpacity={0.85}
                      >
                        <Text
                          style={[
                            styles.summaryLengthOptionLabel,
                            {
                              color: isActive
                                ? activeThumbColor
                                : themeColors.textPrimary
                            }
                          ]}
                        >
                          {option.label}
                        </Text>
                        <Text
                          style={[
                            styles.summaryLengthOptionDescription,
                            {
                              color: isActive
                                ? activeThumbColor
                                : themeColors.textSecondary
                            }
                          ]}
                        >
                          {option.description}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </>
          ) : null}
          <View style={styles.premiumDivider} />
          <View style={styles.item}>
            <View>
              <Text style={styles.itemTitle}>Premium themes</Text>
              <Text style={styles.itemSubtitle}>
                Access exclusive palettes and brighten them to match your vibe.
              </Text>
            </View>
            <Switch
              value={premiumAccentEnabled}
              onValueChange={handleTogglePremiumAccent}
              trackColor={{ true: accentSwitchColor, false: inactiveTrackColor }}
              thumbColor={premiumAccentEnabled ? activeThumbColor : inactiveThumbColor}
              ios_backgroundColor={inactiveTrackColor}
              disabled={!canUsePremiumThemes}
            />
          </View>
          {premiumAccentEnabled ? (
            <>
              <Text style={styles.sectionHint}>Choose your premium accent.</Text>
              <View style={styles.premiumAccentGrid}>
                {premiumAccentOptions.map((option) => {
                  const isActive = option.key === premiumAccentKey;
                  return (
                    <TouchableOpacity
                      key={option.key}
                      activeOpacity={0.85}
                      onPress={() => handleSelectPremiumAccent(option.key)}
                      style={[
                        styles.premiumAccentSwatch,
                        {
                          backgroundColor: isActive ? option.background : themeColors.card,
                          borderColor: isActive
                            ? accentSwitchColor
                            : themeColors.divider
                        },
                        isActive && styles.premiumAccentSwatchActive
                      ]}
                    >
                      <View
                        style={[styles.accentDot, { backgroundColor: option.background }]}
                      />
                      <Text
                        style={[
                          styles.premiumAccentLabel,
                          isActive && option.onPrimary
                            ? { color: option.onPrimary }
                            : null
                        ]}
                      >
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <View style={styles.premiumBrightnessBlock}>
                <View style={styles.premiumBrightnessHeader}>
                  <Text style={styles.premiumBrightnessTitle}>Theme brightness</Text>
                  <Text style={styles.premiumBrightnessValue}>
                    {premiumAccentBrightness ? `+${Math.round(premiumAccentBrightness)}%` : 'Original'}
                  </Text>
                </View>
                <View style={styles.premiumSliderRow}>
                  <Slider
                    style={styles.premiumSlider}
                    minimumValue={PREMIUM_ACCENT_BRIGHTNESS_RANGE.min}
                    maximumValue={PREMIUM_ACCENT_BRIGHTNESS_RANGE.max}
                    step={0}
                    value={premiumAccentBrightness}
                    onValueChange={handleBrightnessSliderChange}
                    onSlidingComplete={handleBrightnessSlidingComplete}
                    minimumTrackTintColor={accentSwitchColor}
                    maximumTrackTintColor={sliderTrackColor}
                    thumbTintColor={accentSwitchColor}
                  />
                  <View style={[styles.sliderBadge, { backgroundColor: accentSwitchColor }]}>
                    <Text style={styles.sliderBadgeText}>
                      {premiumAccentBrightness ? `+${Math.round(premiumAccentBrightness)}%` : 'Original'}
                    </Text>
                  </View>
                </View>
                <Text style={styles.premiumInputHint}>
                  Dial up to {PREMIUM_ACCENT_BRIGHTNESS_RANGE.max}% for a softer glow.
                </Text>
              </View>
              <View style={styles.premiumShadeBlock}>
                <View style={styles.premiumBrightnessHeader}>
                  <Text style={styles.premiumBrightnessTitle}>Theme darkness</Text>
                  <Text style={styles.premiumBrightnessValue}>
                    {premiumAccentShade ? `+${Math.round(premiumAccentShade)}%` : 'Original'}
                  </Text>
                </View>
                <View style={styles.premiumSliderRow}>
                  <Slider
                    style={styles.premiumSlider}
                    minimumValue={PREMIUM_ACCENT_SHADE_RANGE.min}
                    maximumValue={PREMIUM_ACCENT_SHADE_RANGE.max}
                    step={0}
                    value={premiumAccentShade}
                    onValueChange={handleShadeSliderChange}
                    onSlidingComplete={handleShadeSlidingComplete}
                    minimumTrackTintColor={accentSwitchColor}
                    maximumTrackTintColor={sliderTrackColor}
                    thumbTintColor={accentSwitchColor}
                  />
                  <View style={[styles.sliderBadge, { backgroundColor: accentSwitchColor }]}>
                    <Text style={styles.sliderBadgeText}>
                      {premiumAccentShade ? `+${Math.round(premiumAccentShade)}%` : 'Original'}
                    </Text>
                  </View>
                </View>
                <Text style={styles.premiumInputHint}>
                  Add up to {PREMIUM_ACCENT_SHADE_RANGE.max}% depth for a bolder match with the add button.
                </Text>
              </View>
            </>
          ) : null}
        </View>

        {/* [AI-FEATURES] AI Features Settings Section */}
        <View style={styles.section}>
          <AIFeaturesSettings
            isPremium={premiumUnlocked}
            userPreferences={userProfile?.aiPreferences || {}}
            onToggleFeature={handleToggleAIFeature}
            themeColors={themeColors}
            accentColor={accentSwitchColor}
            inactiveTrackColor={inactiveTrackColor}
            activeThumbColor={activeThumbColor}
            inactiveThumbColor={inactiveThumbColor}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Profile</Text>
          <Text style={styles.sectionHint}>
            Set a playful nickname and your home base. This information never leaves your device—it simply helps personalize rooms.
          </Text>
          <View style={styles.profileField}>
            <Text style={styles.itemTitle}>Temporary nickname</Text>
            <TextInput
              value={nicknameDraft}
              onChangeText={handleNicknameChange}
              placeholder="Keep it playful"
              placeholderTextColor={themeColors.textSecondary}
              style={styles.profileInput}
              autoCapitalize="words"
              maxLength={32}
            />
          </View>
          <View style={styles.profileField}>
            <View style={styles.profileLocationHeader}>
              <Text style={styles.itemTitle}>Home location</Text>
              {userProfile.city ? (
                <TouchableOpacity onPress={handleClearLocation} activeOpacity={0.75}>
                  <Text style={styles.clearButtonText}>Clear</Text>
                </TouchableOpacity>
              ) : null}
            </View>
            <Text style={styles.profileSummary}>{locationSummary}</Text>
            <TouchableOpacity
              style={[styles.profileButton, { borderColor: accentSwitchColor }]}
              onPress={() => setLocationPickerVisible(true)}
              activeOpacity={0.85}
            >
              <Text style={[styles.profileButtonText, { color: accentSwitchColor }]}>
                {userProfile.city ? 'Change location' : 'Select location'}
              </Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.privacyNote}>
            We don&apos;t store or share this info—clearing the app resets it.
          </Text>
          <View style={styles.profileField}>
            <Text style={styles.itemTitle}>Avatar</Text>
            <Text style={styles.profileSummary}>Choose a badge that appears on your posts.</Text>
            <View style={styles.avatarPreviewWrapper}>
              <View style={[styles.avatarPreviewCircle, { backgroundColor: avatarConfig.backgroundColor }]}>
                {avatarConfig.icon ? (
                  <Ionicons
                    name={avatarConfig.icon.name}
                    size={28}
                    color={avatarConfig.icon.color ?? '#fff'}
                  />
                ) : (
                  <Text style={[styles.avatarPreviewEmoji, { color: avatarConfig.foregroundColor ?? '#fff' }]}>
                    {avatarConfig.emoji ?? '🙂'}
                  </Text>
                )}
              </View>
            </View>
            <View style={styles.avatarGrid}>
              {avatarOptions.map((option, index) => {
                const isActive = option.key === userProfile.avatarKey;
                const isLastInRow = (index + 1) % 3 === 0;
                return (
                  <TouchableOpacity
                    key={option.key}
                    style={[
                      styles.avatarOption,
                      { borderColor: isActive ? accentSwitchColor : 'transparent' },
                      !isLastInRow && styles.avatarOptionSpacing
                    ]}
                    activeOpacity={0.85}
                    onPress={() => updateUserProfile({ avatarKey: option.key })}
                  >
                    <View style={[styles.avatarOptionCircle, { backgroundColor: option.backgroundColor }]}>
                      {option.icon ? (
                        <Ionicons
                          name={option.icon.name}
                          size={20}
                          color={option.icon.color ?? '#fff'}
                        />
                      ) : (
                        <Text style={[styles.avatarOptionEmoji, { color: option.foregroundColor ?? '#fff' }]}>
                          {option.emoji ?? '🙂'}
                        </Text>
                      )}
                    </View>
                    <Text style={styles.avatarOptionLabel}>{option.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Cartoon Profile Generator */}
          <View style={styles.profileField}>
            <Text style={styles.itemTitle}>AI Cartoon Avatar</Text>
            <Text style={styles.profileSummary}>
              Transform your profile into a fun cartoon avatar using AI. {'\n'}
              {getUsageStatsText(
                userProfile?.subscriptionPlan || 'basic',
                cartoonUsageData?.monthlyUsage || 0,
                cartoonUsageData?.lifetimeUsage || 0
              )}
            </Text>

            {/* Gold Enhancement Indicator */}
            {userProfile?.subscriptionPlan === 'gold' && (
              <View style={[styles.goldFeatureInfo, {
                backgroundColor: themeColors.card,
                borderColor: isDarkMode ? 'rgba(255, 215, 0, 0.3)' : 'rgba(255, 215, 0, 0.4)'
              }]}>
                <Text style={styles.goldFeatureIcon}>✨</Text>
                <View style={styles.goldFeatureContent}>
                  <Text style={[styles.goldFeatureTitle, { color: themeColors.textPrimary }]}>
                    Gold Enhancement Active
                  </Text>
                  <Text style={[styles.goldFeatureDesc, { color: themeColors.textSecondary }]}>
                    Your cartoons will be personalized using GPT-4o Vision analysis + HD quality (1024x1024)
                  </Text>
                </View>
              </View>
            )}

            <View style={styles.cartoonButtonRow}>
              <TouchableOpacity
                style={[styles.cartoonButton, { borderColor: accentSwitchColor, flex: 1 }]}
                onPress={handleOpenCartoonGenerator}
                activeOpacity={0.85}
              >
                <Ionicons name="color-wand" size={18} color={accentSwitchColor} />
                <Text style={[styles.cartoonButtonText, { color: accentSwitchColor }]}>
                  Generate
                </Text>
              </TouchableOpacity>
              {cartoonPictureHistory.length > 0 && (
                <TouchableOpacity
                  style={[styles.cartoonButton, { borderColor: themeColors.textSecondary, marginLeft: 8 }]}
                  onPress={handleOpenCartoonHistory}
                  activeOpacity={0.85}
                >
                  <Ionicons name="images" size={18} color={themeColors.textSecondary} />
                  <Text style={[styles.cartoonButtonText, { color: themeColors.textSecondary }]}>
                    History ({cartoonPictureHistory.length})
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Privacy</Text>
          <View style={styles.itemLast}>
            <View>
              <Text style={styles.itemTitle}>Anonymous identity</Text>
              <Text style={styles.itemSubtitle}>
                You&apos;re currently posting as {ghostIdentifier}.
              </Text>
            </View>
          </View>
          <View style={[styles.itemLast, styles.itemDisabled]}>
            <View>
              <Text style={styles.itemTitle}>Coming soon</Text>
              <Text style={styles.itemSubtitle}>
                More privacy controls arrive when we connect to a backend.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
      <ShareLocationModal
        visible={locationPickerVisible}
        onClose={() => setLocationPickerVisible(false)}
        onSelectCity={handleSelectLocation}
        accentColor={accentSwitchColor}
        initialCountry={userProfile.country || undefined}
        initialProvince={userProfile.province || undefined}
      />

      <UpgradePromptModal
        visible={upgradeModalVisible}
        onClose={() => setUpgradeModalVisible(false)}
        onUpgrade={handleUpgradeNow}
        featureName={upgradeFeature.name}
        featureDescription={upgradeFeature.description}
        requiredPlan={upgradeFeature.requiredPlan}
        icon={upgradeFeature.icon}
      />

      <PremiumSuccessModal
        visible={premiumSuccessVisible}
        onClose={() => setPremiumSuccessVisible(false)}
      />

      <LoadingOverlay
        visible={authLoading}
        onComplete={() => setAuthLoading(false)}
        duration={2000}
      />

      <CartoonStyleModal
        visible={cartoonStyleModalVisible}
        onClose={() => setCartoonStyleModalVisible(false)}
        onStyleSelect={handleGenerateCartoon}
        userProfile={userProfile}
        usageData={cartoonUsageData}
        isGenerating={isGeneratingCartoon}
        isAdmin={isAdmin}
      />

      <CartoonHistoryModal
        visible={cartoonHistoryModalVisible}
        onClose={() => setCartoonHistoryModalVisible(false)}
        pictureHistory={cartoonPictureHistory}
        currentProfilePhoto={userProfile?.profilePhoto}
        onSetAsProfile={handleSetCartoonAsProfile}
        onDelete={handleDeleteCartoonPicture}
        onClearAll={handleClearCartoonHistory}
        isProcessing={isCartoonProcessing}
        subscriptionPlan={userProfile?.subscriptionPlan || 'basic'}
      />

      <CartoonSuccessModal
        visible={cartoonSuccessModalVisible}
        onClose={() => setCartoonSuccessModalVisible(false)}
        onViewCartoon={() => {
          setCartoonSuccessModalVisible(false);
          // Wait for modal to close, then open history
          setTimeout(() => {
            setCartoonHistoryModalVisible(true);
          }, 300);
        }}
      />

      <CartoonGenerationProgress
        visible={showGenerationProgress}
        onClose={() => {
          setShowGenerationProgress(false);
          setIsGeneratingCartoon(false);
        }}
        onComplete={() => {
          // Called when generation completes
          // Note: We handle completion in handleGenerateCartoon
        }}
        styleName={currentGenerationStyle}
        notifyWhenDone={currentGenerationNotify}
      />
    </ScreenLayout>
  );
}

const createStyles = (palette, { isDarkMode } = {}) =>
  StyleSheet.create({
    screenContent: {
      paddingTop: 0,
      paddingHorizontal: 0,
      backgroundColor: palette.background
    },
    scroll: {
      flex: 1
    },
    scrollContent: {
      paddingTop: 24,
      paddingBottom: 140,
      paddingHorizontal: 20
    },
    section: {
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
    sectionTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: palette.textPrimary,
      marginBottom: 16
    },
    sectionHint: {
      fontSize: 13,
      color: palette.textSecondary,
      marginBottom: 16
    },
    goldHero: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 26,
      padding: 20,
      marginBottom: 20,
      gap: 16,
      shadowColor: '#FACC15',
      shadowOpacity: 0.3,
      shadowRadius: 20,
      shadowOffset: { width: 0, height: 10 },
      elevation: 4
    },
    goldHeroCopy: {
      flex: 1,
      gap: 10
    },
    goldHeroBadgeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12
    },
    goldHeroTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: '#fff'
    },
    goldHeroSubtitle: {
      color: 'rgba(255,255,255,0.85)',
      fontSize: 13,
      lineHeight: 20
    },
    goldHeroPerks: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8
    },
    goldHeroChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 14,
      backgroundColor: 'rgba(0,0,0,0.25)'
    },
    goldHeroChipText: {
      color: '#fff',
      fontSize: 12,
      fontWeight: '600'
    },
    goldHeroButton: {
      alignSelf: 'flex-start',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 18,
      paddingVertical: 10,
      borderRadius: 999,
      backgroundColor: '#fff',
      marginTop: 4
    },
    goldHeroButtonText: {
      color: '#0d0f1c',
      fontSize: 13,
      fontWeight: '700'
    },
    goldHeroArt: {
      width: 130,
      height: 130,
      justifyContent: 'center',
      alignItems: 'center'
    },
    goldHeroAnimation: {
      width: '100%',
      height: '100%'
    },
    discoveryPresetCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: palette.background,
      borderRadius: 16,
      padding: 16,
      marginTop: -4,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: palette.divider,
      gap: 16
    },
    discoveryPresetCardActive: {
      backgroundColor: palette.primaryDark,
      borderColor: palette.primaryDark
    },
    discoveryPresetIcon: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(99,102,241,0.12)'
    },
    discoveryPresetIconActive: {
      backgroundColor: 'rgba(255,255,255,0.14)'
    },
    discoveryPresetCopy: {
      flex: 1
    },
    discoveryPresetTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: palette.textPrimary,
      marginBottom: 4
    },
    discoveryPresetTitleActive: {
      color: '#fff'
    },
    discoveryPresetSubtitle: {
      fontSize: 12,
      color: palette.textSecondary,
      lineHeight: 16
    },
    discoveryPresetSubtitleActive: {
      color: 'rgba(255,255,255,0.8)'
    },
    authButton: {
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderWidth: 1.5,
      borderColor: palette.primary,
      backgroundColor: 'transparent'
    },
    authButtonDisabled: {
      opacity: 0.6
    },
    authButtonText: {
      fontSize: 13,
      fontWeight: '600',
      color: palette.primary
    },
    signOutButton: {
      marginLeft: 12
    },
    googleButton: {
      marginTop: 16,
      borderRadius: 12,
      paddingVertical: 12,
      paddingHorizontal: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#4285F4'
    },
    googleButtonDisabled: {
      opacity: 0.6
    },
    googleIcon: {
      color: '#ffffff',
      marginRight: 12
    },
    googleButtonLabel: {
      color: '#ffffff',
      fontSize: 14,
      fontWeight: '600'
    },
    emailCtaRow: {
      flexDirection: 'column',
      marginTop: 16,
      gap: 12
    },
    emailCtaLink: {
      fontSize: 13,
      fontWeight: '600',
      color: palette.primary
    },
    emailPrimaryButton: {
      borderRadius: 12,
      paddingVertical: 14,
      paddingHorizontal: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: palette.primary,
      shadowColor: '#000',
      shadowOpacity: 0.1,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 4 },
      elevation: 3
    },
    emailButtonIcon: {
      marginRight: 10
    },
    emailPrimaryButtonText: {
      color: '#ffffff',
      fontSize: 15,
      fontWeight: '600'
    },
    emailSecondaryButton: {
      borderRadius: 12,
      paddingVertical: 14,
      paddingHorizontal: 16,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'transparent',
      borderWidth: 1.5,
      borderColor: palette.primary
    },
    emailSecondaryButtonText: {
      color: palette.primary,
      fontSize: 15,
      fontWeight: '600'
    },
    configNotice: {
      marginTop: 12,
      fontSize: 12,
      color: palette.textSecondary
    },
    authErrorText: {
      marginTop: 12,
      fontSize: 12,
      color: '#ef4444'
    },
    profileLinkRow: {
      marginTop: 12,
      paddingVertical: 14,
      paddingHorizontal: 16,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: palette.divider,
      backgroundColor: palette.background,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between'
    },
    profileLinkCopy: {
      flex: 1,
      marginRight: 12
    },
    profileLinkLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: palette.textPrimary
    },
    profileLinkHint: {
      marginTop: 4,
      fontSize: 12,
      color: palette.textSecondary
    },
    profileLinkIcon: {
      color: palette.primaryDark
    },
    emailModalBackdrop: {
      flex: 1,
      justifyContent: 'flex-end',
      backgroundColor: 'rgba(15, 23, 42, 0.45)'
    },
    emailModalOverlay: {
      flex: 1
    },
    emailModalCard: {
      backgroundColor: palette.card,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingHorizontal: 24,
      paddingTop: 24,
      paddingBottom: 32,
      borderColor: palette.divider,
      borderWidth: 1
    },
    emailModalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center'
    },
    emailModalTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: palette.textPrimary
    },
    emailCloseButton: {
      padding: 8,
      marginRight: -8
    },
    emailModalHint: {
      marginTop: 12,
      fontSize: 13,
      lineHeight: 20,
      color: palette.textSecondary
    },
    emailForm: {
      marginTop: 20,
      rowGap: 12
    },
    emailInput: {
      borderRadius: 12,
      borderWidth: 1,
      borderColor: isDarkMode ? 'rgba(255,255,255,0.18)' : 'rgba(15,23,42,0.12)',
      paddingVertical: 12,
      paddingHorizontal: 14,
      fontSize: 15,
      color: palette.textPrimary,
      backgroundColor: isDarkMode ? palette.background : '#ffffff'
    },
    emailErrorText: {
      marginTop: 12,
      fontSize: 12,
      color: '#ef4444'
    },
    emailStatusText: {
      marginTop: 12,
      fontSize: 12,
      color: palette.success ?? palette.primary
    },
    emailSubmitButton: {
      marginTop: 20,
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: palette.primary
    },
    emailSubmitButtonDisabled: {
      opacity: 0.7
    },
    emailSubmitLabel: {
      color: '#ffffff',
      fontSize: 15,
      fontWeight: '600'
    },
    emailFooterLinks: {
      marginTop: 16,
      rowGap: 8
    },
    emailFooterLink: {
      fontSize: 13,
      fontWeight: '600',
      color: palette.primary
    },
    item: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16
    },
    itemLast: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center'
    },
    rewardsCard: {
      backgroundColor: isDarkMode ? palette.background : '#eef0ff',
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: palette.divider,
      marginTop: 12
    },
    rewardsHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 8
    },
    rewardsLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: palette.textSecondary
    },
    rewardsPointsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    rewardsPoints: {
      fontSize: 18,
      fontWeight: '700',
      color: palette.primary
    },
    premiumBadge: {
      marginLeft: 4,
    },
    rewardsMeta: {
      fontSize: 12,
      color: palette.textSecondary,
      lineHeight: 18
    },
    rewardsProgress: {
      marginTop: 8,
      fontSize: 12,
      fontWeight: '600',
      color: palette.textSecondary
    },
    subscriptionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 14,
      paddingHorizontal: 16,
      marginTop: 12,
      borderRadius: 12,
      backgroundColor: palette.background,
      borderWidth: 1,
      borderColor: palette.divider,
    },
    subscriptionButtonText: {
      fontSize: 15,
      fontWeight: '600',
      flex: 1,
      marginLeft: 8,
    },
    redeemButton: {
      marginTop: 16,
      borderRadius: 12,
      paddingVertical: 12,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: palette.primary
    },
    redeemButtonDisabled: {
      backgroundColor: palette.divider
    },
    redeemButtonLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: '#ffffff'
    },
    redeemButtonLabelDisabled: {
      color: palette.textSecondary
    },
    itemDisabled: {
      opacity: 0.6,
      marginTop: 16
    },
    itemDisabledSimple: {
      opacity: 0.45
    },
    premiumControlRow: {
      alignItems: 'flex-start'
    },
    premiumInputBlock: {
      marginBottom: 20
    },
    premiumInputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between'
    },
    premiumInputLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: palette.textSecondary
    },
    premiumInput: {
      width: 72,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: isDarkMode ? 'rgba(255,255,255,0.16)' : 'rgba(15,23,42,0.14)',
      paddingVertical: 8,
      paddingHorizontal: 12,
      textAlign: 'center',
      fontSize: 16,
      fontWeight: '600',
      color: palette.textPrimary,
      backgroundColor: isDarkMode ? palette.background : '#ffffff'
    },
    premiumInputHint: {
      marginTop: 6,
      fontSize: 12,
      color: palette.textSecondary
    },
    premiumHintSpacing: {
      marginTop: -8,
      marginBottom: 12
    },
    summaryLengthBlock: {
      marginTop: 4
    },
    summaryLengthTitle: {
      fontSize: 15,
      fontWeight: '600',
      color: palette.textPrimary
    },
    summaryLengthSubtitle: {
      marginTop: 4,
      fontSize: 13,
      color: palette.textSecondary
    },
    summaryLengthOptions: {
      marginTop: 12
    },
    summaryLengthOption: {
      borderRadius: 14,
      borderWidth: 1,
      paddingVertical: 14,
      paddingHorizontal: 16
    },
    summaryLengthOptionSpacing: {
      marginTop: 10
    },
    summaryLengthOptionLabel: {
      fontSize: 15,
      fontWeight: '600'
    },
    summaryLengthOptionDescription: {
      marginTop: 6,
      fontSize: 13,
      lineHeight: 18
    },
    premiumDivider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: palette.divider,
      marginBottom: 20
    },
    premiumInputSpacing: {
      marginBottom: 0
    },
    itemTitle: {
      fontSize: 15,
      fontWeight: '600',
      color: palette.textPrimary,
      marginBottom: 6
    },
    itemSubtitle: {
      fontSize: 13,
      color: palette.textSecondary,
      maxWidth: 220
    },
    profileField: {
      marginBottom: 16
    },
    profileInput: {
      marginTop: 8,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: palette.divider,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 14,
      color: palette.textPrimary,
      backgroundColor: isDarkMode ? palette.card : palette.background
    },
    profileLocationHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center'
    },
    profileSummary: {
      fontSize: 13,
      color: palette.textSecondary,
      marginTop: 6
    },
    profileButton: {
      marginTop: 12,
      borderWidth: 1.5,
      borderRadius: 12,
      paddingVertical: 10,
      paddingHorizontal: 16,
      alignSelf: 'flex-start'
    },
    profileButtonText: {
      fontSize: 13,
      fontWeight: '600'
    },
    cartoonButtonRow: {
      flexDirection: 'row',
      marginTop: 12,
      gap: 8
    },
    cartoonButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      borderWidth: 1.5,
      borderRadius: 12,
      paddingVertical: 10,
      paddingHorizontal: 16
    },
    cartoonButtonText: {
      fontSize: 13,
      fontWeight: '600'
    },
    clearButtonText: {
      fontSize: 12,
      color: palette.textSecondary,
      fontWeight: '600'
    },
    privacyNote: {
      fontSize: 12,
      color: palette.textSecondary,
      marginTop: 8
    },
    avatarPreviewWrapper: {
      marginTop: 12,
      marginBottom: 12,
      alignItems: 'flex-start'
    },
    avatarPreviewCircle: {
      width: 56,
      height: 56,
      borderRadius: 28,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: palette.background
    },
    avatarPreviewEmoji: {
      fontSize: 28
    },
    avatarGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginTop: 4
    },
    avatarOption: {
      flexBasis: '30%',
      alignItems: 'center',
      marginBottom: 12,
      paddingVertical: 10,
      borderWidth: 2,
      borderRadius: 14,
      backgroundColor: palette.background
    },
    avatarOptionSpacing: {
      marginRight: '5%'
    },
    avatarOptionCircle: {
      width: 48,
      height: 48,
      borderRadius: 24,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 6
    },
    avatarOptionEmoji: {
      fontSize: 22
    },
    avatarOptionLabel: {
      fontSize: 11,
      fontWeight: '600',
      color: palette.textPrimary
    },
    accentRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between'
    },
    accentRowDisabled: {
      opacity: 0.4
    },
    accentPremiumNotice: {
      fontSize: 12,
      color: palette.textSecondary,
      marginTop: 4
    },
    accentSwatch: {
      borderRadius: 16,
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderWidth: 2,
      flexBasis: '48%',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      marginBottom: 12
    },
    accentSwatchActive: {
      shadowColor: '#000',
      shadowOpacity: isDarkMode ? 0.35 : 0.12,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 4 },
      elevation: 3
    },
    accentLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: palette.textPrimary
    },
    accentDot: {
      width: 20,
      height: 20,
      borderRadius: 10,
      marginRight: 12
    },
    premiumAccentGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      marginTop: 16
    },
    premiumAccentSwatch: {
      borderRadius: 16,
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderWidth: 2,
      borderColor: palette.divider,
      flexBasis: '48%',
      marginBottom: 12,
      flexDirection: 'row',
      alignItems: 'center'
    },
    premiumAccentSwatchActive: {
      shadowColor: '#000',
      shadowOpacity: isDarkMode ? 0.4 : 0.16,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 6 },
      elevation: 4
    },
    premiumAccentLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: palette.textPrimary
    },
    premiumBrightnessBlock: {
      marginTop: 8,
      paddingVertical: 8
    },
    premiumShadeBlock: {
      marginTop: 12,
      paddingVertical: 8
    },
    premiumBrightnessHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12
    },
    premiumBrightnessTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: palette.textPrimary
    },
    premiumBrightnessValue: {
      fontSize: 12,
      fontWeight: '600',
      color: palette.textSecondary
    },
    premiumSliderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: palette.card,
      borderRadius: 18,
      paddingVertical: 12,
      paddingHorizontal: 16,
      marginBottom: 8,
      shadowColor: '#000',
      shadowOpacity: isDarkMode ? 0.25 : 0.08,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 8 },
      elevation: isDarkMode ? 4 : 2
    },
    premiumSlider: {
      flex: 1,
      height: 40
    },
    sliderBadge: {
      minWidth: 72,
      marginLeft: 12,
      borderRadius: 16,
      paddingVertical: 6,
      paddingHorizontal: 12,
      backgroundColor: palette.textPrimary,
      alignItems: 'center'
    },
    sliderBadgeText: {
      fontSize: 12,
      fontWeight: '700',
      color: '#ffffff'
    },
    onboardingButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: palette.card,
      borderRadius: 16,
      padding: 16,
      marginTop: 16,
      borderWidth: 1,
      borderColor: palette.divider,
      shadowColor: '#000',
      shadowOpacity: isDarkMode ? 0.15 : 0.05,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 4 },
      elevation: 2
    },
    onboardingIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 14
    },
    onboardingTextBlock: {
      flex: 1
    },
    goldFeatureInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 12,
      borderWidth: StyleSheet.hairlineWidth,
      padding: 12,
      marginTop: 12,
      marginBottom: 8,
    },
    goldFeatureIcon: {
      fontSize: 20,
      marginRight: 10,
    },
    goldFeatureContent: {
      flex: 1,
    },
    goldFeatureTitle: {
      fontSize: 13,
      fontWeight: '700',
      marginBottom: 3,
    },
    goldFeatureDesc: {
      fontSize: 12,
      lineHeight: 16,
      opacity: 0.7,
    },
  });
