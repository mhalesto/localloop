import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
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
import ScreenLayout from '../components/ScreenLayout';
import {
  useSettings,
  DEFAULT_TITLE_FONT_SIZE,
  DEFAULT_DESCRIPTION_FONT_SIZE,
  PREMIUM_TITLE_FONT_SIZE_RANGE,
  PREMIUM_DESCRIPTION_FONT_SIZE_RANGE,
  PREMIUM_ACCENT_BRIGHTNESS_RANGE
} from '../contexts/SettingsContext';
import ShareLocationModal from '../components/ShareLocationModal';
import { avatarOptions, getAvatarConfig } from '../constants/avatars';
import { SIGNUP_BONUS_POINTS } from '../constants/authConfig';
import { useAuth } from '../contexts/AuthContext';

export default function SettingsScreen({ navigation }) {
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const {
    user,
    profile: authProfile,
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
    clearAuthError
  } = useAuth();
  const {
    showAddShortcut,
    setShowAddShortcut,
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
    userProfile,
    updateUserProfile,
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

  const isEmailBusy = isSigningIn || isResettingPassword;

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

  const ghostIdentifier = useMemo(() => {
    if (userProfile.nickname?.trim()) {
      return userProfile.nickname.trim();
    }
    return `Ghost #${Math.floor(Math.random() * 999)}`;
  }, [userProfile.nickname]);

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const accentSwitchColor = accentPreset.buttonBackground ?? themeColors.primaryDark;
  const inactiveTrackColor = isDarkMode ? '#3D3561' : '#d1d5db';
  const inactiveThumbColor = isDarkMode ? '#252047' : '#f4f3f4';
  const activeThumbColor = '#ffffff';
  const styles = useMemo(
    () => createStyles(themeColors, { isDarkMode }),
    [themeColors, isDarkMode]
  );
  const brightnessSteps = useMemo(() => {
    const steps = [0, 10, 20, 30, 40];
    return steps.filter(
      (step) =>
        step >= PREMIUM_ACCENT_BRIGHTNESS_RANGE.min &&
        step <= PREMIUM_ACCENT_BRIGHTNESS_RANGE.max
    );
  }, []);
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
  const hoursOfPremium = useMemo(
    () => Math.max(Math.round(premiumAccessDurationMs / (60 * 60 * 1000)), 1),
    [premiumAccessDurationMs]
  );
  const pointsGap = Math.max(pointsToNextPremium, 0);

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
      Alert.alert(
        'Premium required',
        'Redeem a premium day from the Account section to unlock this feature.'
      ),
    []
  );

  const handleGoogleSignInPress = useCallback(async () => {
    await startGoogleSignIn();
  }, [startGoogleSignIn]);

  const handleEmailAuthSubmit = useCallback(async () => {
    const trimmedEmail = emailInput.trim();
    setEmailLocalError('');
    setEmailStatusMessage('');
    clearAuthError();

    const emailPattern = /.+@.+\..+/;
    if (!trimmedEmail || !emailPattern.test(trimmedEmail)) {
      setEmailLocalError('Enter a valid email address.');
      return;
    }

    if (emailAuthMode === 'signIn') {
      if (!passwordInput) {
        setEmailLocalError('Enter your password to continue.');
        return;
      }
      const result = await signInWithEmail({ email: trimmedEmail, password: passwordInput });
      if (result?.ok) {
        resetEmailForm();
        setEmailStatusMessage('Signed in successfully.');
      }
      return;
    }

    if (emailAuthMode === 'signUp') {
      if (!displayNameInput.trim()) {
        setEmailLocalError('Add a display name so friends recognize you.');
        return;
      }
      if (passwordInput.length < 6) {
        setEmailLocalError('Passwords must be at least 6 characters.');
        return;
      }
      if (passwordInput !== confirmPasswordInput) {
        setEmailLocalError('Passwords do not match.');
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
      return;
    }

    // reset password flow
    const result = await sendPasswordReset(trimmedEmail);
    if (result?.ok) {
      setEmailStatusMessage('Password reset email sent. Check your inbox.');
    }
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
      await signOutAccount();
    } finally {
      setSigningOut(false);
    }
  }, [signOutAccount]);

  const handleRedeemPremium = useCallback(async () => {
    const result = await redeemPremiumDay();
    if (result?.ok) {
      Alert.alert(
        'Premium activated',
        `Enjoy premium features for the next ${hoursOfPremium} hours.`
      );
    }
  }, [redeemPremiumDay, hoursOfPremium]);

  const handleTogglePremiumAccent = (value) => {
    if (value && !premiumUnlocked) {
      showPremiumRequiredAlert();
      return;
    }
    setPremiumAccentEnabled(value);
  };

  const handleSelectPremiumAccent = (key) => {
    if (!premiumUnlocked) {
      showPremiumRequiredAlert();
      return;
    }
    setPremiumAccentKey(key);
  };

  const handleSelectBrightness = (value) => {
    if (!premiumUnlocked) {
      showPremiumRequiredAlert();
      return;
    }
    setPremiumAccentBrightness(value);
  };

  const handleSelectSummaryLength = (value) => {
    if (!premiumUnlocked) {
      showPremiumRequiredAlert();
      return;
    }
    setPremiumSummaryLength(value);
  };

  const summaryLengthOptions = premiumSummaryLengthOptions ?? [];

  const handleTogglePremiumTypography = (value) => {
    if (value && !premiumUnlocked) {
      showPremiumRequiredAlert();
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
    if (value && !premiumUnlocked) {
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
          Alert.alert(
            'Permission needed',
            'We need location permission to suggest nearby rooms.'
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
        Alert.alert('Location error', 'Unable to access location right now.');
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
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          {user ? (
            <>
              <Text style={styles.sectionHint}>
                Signed in with Google. Your rewards travel with you.
              </Text>
              <View style={styles.item}>
                <View>
                  <Text style={styles.itemTitle}>
                    {authProfile?.displayName || user.displayName || 'Mystery guest'}
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
              <TouchableOpacity
                style={styles.profileLinkRow}
                onPress={() => navigation.navigate('Profile')}
                activeOpacity={0.85}
              >
                <View style={styles.profileLinkCopy}>
                  <Text style={styles.profileLinkLabel}>View full profile</Text>
                  <Text style={styles.profileLinkHint}>See rewards and premium status</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} style={styles.profileLinkIcon} />
              </TouchableOpacity>
              <View style={styles.rewardsCard}>
                <View style={styles.rewardsHeader}>
                  <Text style={styles.rewardsLabel}>Point balance</Text>
                  <Text style={styles.rewardsPoints}>{pointsBalance} pts</Text>
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
              </View>
            </>
          ) : (
            <>
              <Text style={styles.sectionHint}>
                Sign in to stash your nickname and start with {SIGNUP_BONUS_POINTS} reward points.
              </Text>
              <TouchableOpacity
                style={[
                  styles.googleButton,
                  googleButtonDisabled && styles.googleButtonDisabled
                ]}
                onPress={handleGoogleSignInPress}
                activeOpacity={0.85}
                disabled={googleButtonDisabled}
              >
                <Ionicons name="logo-google" size={20} style={styles.googleIcon} />
                <Text style={styles.googleButtonLabel}>
                  {isSigningIn ? 'Connecting...' : 'Continue with Google'}
                </Text>
              </TouchableOpacity>
              <View style={styles.emailCtaRow}>
                <TouchableOpacity
                  onPress={() => openEmailAuth('signIn')}
                  activeOpacity={0.8}
                >
                  <Text style={styles.emailCtaLink}>Use email instead</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => openEmailAuth('signUp')}
                  activeOpacity={0.8}
                >
                  <Text style={styles.emailCtaLink}>Create an account</Text>
                </TouchableOpacity>
              </View>
              {!canUseGoogleSignIn ? (
                <Text style={styles.configNotice}>
                  Add your Google OAuth client IDs in constants/authConfig.js.
                </Text>
              ) : null}
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
          <View style={styles.itemLast}>
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
              disabled={!premiumUnlocked}
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
              disabled={!premiumUnlocked || !premiumTypographyEnabled}
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
              disabled={!premiumUnlocked || !premiumTypographyEnabled}
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
              disabled={!premiumUnlocked}
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
              disabled={!premiumUnlocked}
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
                    {premiumAccentBrightness ? `+${premiumAccentBrightness}%` : 'Original'}
                  </Text>
                </View>
                <View style={styles.premiumBrightnessOptions}>
                  {brightnessSteps.map((step) => {
                    const isActive = step === premiumAccentBrightness;
                    return (
                      <TouchableOpacity
                        key={step}
                        onPress={() => handleSelectBrightness(step)}
                        style={[
                          styles.brightnessChip,
                          {
                            backgroundColor: isActive ? accentSwitchColor : themeColors.card,
                            borderColor: isActive ? accentSwitchColor : themeColors.divider
                          }
                        ]}
                        activeOpacity={0.85}
                      >
                        <Text
                          style={[
                            styles.brightnessChipText,
                            { color: isActive ? activeThumbColor : themeColors.textPrimary }
                          ]}
                        >
                          {step ? `+${step}%` : 'Original'}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                <Text style={styles.premiumInputHint}>
                  Dial up to {PREMIUM_ACCENT_BRIGHTNESS_RANGE.max}% for a softer glow.
                </Text>
              </View>
            </>
          ) : null}
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
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 16,
      flexWrap: 'wrap',
      rowGap: 12,
      columnGap: 12
    },
    emailCtaLink: {
      fontSize: 13,
      fontWeight: '600',
      color: palette.primary
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
    rewardsPoints: {
      fontSize: 18,
      fontWeight: '700',
      color: palette.primary
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
    premiumBrightnessOptions: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginBottom: 8
    },
    brightnessChip: {
      paddingVertical: 8,
      paddingHorizontal: 14,
      borderRadius: 14,
      borderWidth: 1.5,
      borderColor: palette.divider,
      backgroundColor: palette.card,
      marginRight: 8,
      marginBottom: 8
    },
    brightnessChipText: {
      fontSize: 13,
      fontWeight: '600'
    }
  });
