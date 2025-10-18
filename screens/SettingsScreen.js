import React, { useEffect, useMemo, useState } from 'react';
import {
  ScrollView,
  Switch,
  Text,
  TouchableOpacity,
  View,
  StyleSheet,
  TextInput
} from 'react-native';
import ScreenLayout from '../components/ScreenLayout';
import { colors } from '../constants/colors';
import { useSettings } from '../contexts/SettingsContext';
import ShareLocationModal from '../components/ShareLocationModal';

export default function SettingsScreen({ navigation }) {
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const {
    showAddShortcut,
    setShowAddShortcut,
    accentOptions,
    accentKey,
    setAccentKey,
    accentPreset,
    userProfile,
    updateUserProfile
  } = useSettings();

  const [nicknameDraft, setNicknameDraft] = useState(userProfile.nickname ?? '');
  const [locationPickerVisible, setLocationPickerVisible] = useState(false);

  const ghostIdentifier = useMemo(() => {
    if (userProfile.nickname?.trim()) {
      return userProfile.nickname.trim();
    }
    return `Ghost #${Math.floor(Math.random() * 999)}`;
  }, [userProfile.nickname]);

  const accentSwitchColor = accentPreset.buttonBackground ?? colors.primaryDark;

  useEffect(() => {
    setNicknameDraft(userProfile.nickname ?? '');
  }, [userProfile.nickname]);

  const handleNicknameChange = (value) => {
    const trimmedValue = value.slice(0, 32);
    setNicknameDraft(trimmedValue);
    updateUserProfile({ nickname: trimmedValue });
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
              onValueChange={setLocationEnabled}
              trackColor={{ true: accentSwitchColor, false: '#d1d5db' }}
              thumbColor={locationEnabled ? accentSwitchColor : '#f4f3f4'}
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
              trackColor={{ true: accentSwitchColor, false: '#d1d5db' }}
              thumbColor={notificationsEnabled ? accentSwitchColor : '#f4f3f4'}
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
              trackColor={{ true: accentSwitchColor, false: '#d1d5db' }}
              thumbColor={showAddShortcut ? accentSwitchColor : '#f4f3f4'}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App theme</Text>
          <Text style={styles.sectionHint}>
            Pick the accent color used across the app.
          </Text>
          <View style={styles.accentRow}>
            {accentOptions.map((option, index) => {
              const isActive = option.key === accentKey;

              return (
                <TouchableOpacity
                  key={option.key}
                  activeOpacity={0.85}
                  onPress={() => setAccentKey(option.key)}
                  style={[
                    styles.accentSwatch,
                    {
                      backgroundColor: isActive ? '#fff' : colors.card,
                      borderColor: isActive
                        ? option.isDark ? '#ffffff' : colors.textPrimary
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
              placeholderTextColor={colors.textSecondary}
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

const styles = StyleSheet.create({
  screenContent: {
    paddingTop: 0,
    paddingHorizontal: 0
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
    backgroundColor: colors.card,
    borderRadius: 18,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 16
  },
  sectionHint: {
    fontSize: 13,
    color: colors.textSecondary,
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
  itemTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 6
  },
  itemSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    maxWidth: 220
  },
  profileField: {
    marginBottom: 16
  },
  profileInput: {
    marginTop: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.divider,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.textPrimary,
    backgroundColor: colors.background
  },
  profileLocationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  profileSummary: {
    fontSize: 13,
    color: colors.textSecondary,
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
    color: colors.textSecondary,
    fontWeight: '600'
  },
  privacyNote: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 8
  },
  accentRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between'
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
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3
  },
  accentLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary
  },
  accentDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginRight: 12
  }
});
