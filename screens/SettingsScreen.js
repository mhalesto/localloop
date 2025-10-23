import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  ScrollView,
  Switch,
  Text,
  TouchableOpacity,
  View,
  StyleSheet,
  TextInput
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

export default function SettingsScreen({ navigation }) {
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
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
    setPremiumSummariesEnabled
  } = useSettings();

  const [nicknameDraft, setNicknameDraft] = useState(userProfile.nickname ?? '');
  const [locationPickerVisible, setLocationPickerVisible] = useState(false);
  const avatarConfig = getAvatarConfig(userProfile.avatarKey);
  const locationEnabled = locationPermissionStatus === 'granted';
  const [titleSizeDraft, setTitleSizeDraft] = useState(String(premiumTitleFontSize));
  const [descriptionSizeDraft, setDescriptionSizeDraft] = useState(
    String(premiumDescriptionFontSize)
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

  useEffect(() => {
    setNicknameDraft(userProfile.nickname ?? '');
  }, [userProfile.nickname]);

  useEffect(() => {
    setTitleSizeDraft(String(premiumTitleFontSize));
  }, [premiumTitleFontSize]);

  useEffect(() => {
    setDescriptionSizeDraft(String(premiumDescriptionFontSize));
  }, [premiumDescriptionFontSize]);

  const handleTogglePremiumAccent = (value) => {
    setPremiumAccentEnabled(value);
  };

  const handleSelectPremiumAccent = (key) => {
    setPremiumAccentKey(key);
  };

  const handleSelectBrightness = (value) => {
    setPremiumAccentBrightness(value);
  };

  const handleTogglePremiumTypography = (value) => {
    setPremiumTypographyEnabled(value);
  };

  const handleToggleTitleSizeOverride = (value) => {
    setPremiumTitleFontSizeEnabled(value);
  };

  const handleToggleDescriptionSizeOverride = (value) => {
    setPremiumDescriptionFontSizeEnabled(value);
  };

  const handleTogglePremiumSummaries = (value) => {
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
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
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
              disabled={!premiumTypographyEnabled}
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
              disabled={!premiumTypographyEnabled}
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
            />
          </View>
          {premiumSummariesEnabled ? (
            <Text style={[styles.sectionHint, styles.premiumHintSpacing]}>
              Summaries appear in the composer as a premium-only action.
            </Text>
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
