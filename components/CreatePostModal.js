import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { accentPresets, useSettings } from '../contexts/SettingsContext';
import ShareLocationModal from './ShareLocationModal';
import { getAvatarConfig } from '../constants/avatars';

export default function CreatePostModal({
  visible,
  onClose,
  initialLocation,
  initialAccentKey,
  onSubmitPost,
  authorProfile = {}
}) {
  const { themeColors, isDarkMode } = useSettings();
  const styles = useMemo(() => createStyles(themeColors, { isDarkMode }), [themeColors, isDarkMode]);
  const [message, setMessage] = useState('');
  const [selectedColor, setSelectedColor] = useState(
    initialAccentKey ?? accentPresets[0].key
  );
  const [locationModalVisible, setLocationModalVisible] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(
    initialLocation?.city
      ? {
          city: initialLocation.city,
          province: initialLocation.province ?? '',
          country: initialLocation.country ?? ''
        }
      : null
  );

  useEffect(() => {
    if (visible) {
      setMessage('');
      setSelectedColor(initialAccentKey ?? accentPresets[0].key);
      setSelectedLocation(
        initialLocation?.city
          ? {
              city: initialLocation.city,
              province: initialLocation.province ?? '',
              country: initialLocation.country ?? ''
            }
          : null
      );
    } else {
      setLocationModalVisible(false);
    }
  }, [visible, initialAccentKey, initialLocation]);

  const selectedPreset = useMemo(
    () => accentPresets.find((preset) => preset.key === selectedColor) ?? accentPresets[0],
    [selectedColor]
  );
  const previewBackground = selectedPreset.background;
  const previewPrimary = selectedPreset.onPrimary ?? (selectedPreset.isDark ? '#fff' : themeColors.textPrimary);
  const previewMuted =
    selectedPreset.metaColor ??
    (selectedPreset.isDark ? 'rgba(255,255,255,0.8)' : themeColors.textSecondary);
  const previewAvatarConfig = useMemo(
    () => authorProfile.avatarConfig ?? getAvatarConfig(authorProfile.avatarKey),
    [authorProfile.avatarConfig, authorProfile.avatarKey]
  );

  const handleClose = () => {
    setMessage('');
    setLocationModalVisible(false);
    onClose?.();
  };

  const handleSubmit = () => {
    if (!selectedLocation?.city || !message.trim()) {
      return;
    }
    onSubmitPost?.({
      location: selectedLocation,
      colorKey: selectedColor,
      message: message.trim()
    });
    setMessage('');
    setLocationModalVisible(false);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title}>Create a post</Text>
            <TouchableOpacity onPress={handleClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={22} color={themeColors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.sectionLabel}>Location</Text>
            <TouchableOpacity
              style={styles.locationButton}
              activeOpacity={0.85}
              onPress={() => setLocationModalVisible(true)}
            >
              <Ionicons
                name="location-outline"
                size={18}
                color={themeColors.primaryDark}
                style={{ marginRight: 8 }}
              />
              <Text style={styles.locationButtonText}>
                {selectedLocation?.city
                  ? `${selectedLocation.city}${selectedLocation.province ? `, ${selectedLocation.province}` : ''}${selectedLocation.country ? `, ${selectedLocation.country}` : ''}`
                  : 'Choose city'}
              </Text>
            </TouchableOpacity>
            {!selectedLocation?.city ? (
              <Text style={styles.helperText}>Select a city to post into.</Text>
            ) : null}

            <Text style={[styles.sectionLabel, { marginTop: 18 }]}>Card style</Text>
            <View style={styles.swatchRow}>
              {accentPresets.map((preset) => {
                const isActive = preset.key === selectedColor;
                return (
                  <TouchableOpacity
                    key={preset.key}
                    style={[
                      styles.swatch,
                      { backgroundColor: preset.background },
                      isActive && styles.swatchActive
                    ]}
                    activeOpacity={0.85}
                    onPress={() => setSelectedColor(preset.key)}
                  >
                    {isActive ? (
                      <Ionicons name="checkmark" size={18} color="#fff" />
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={[styles.sectionLabel, { marginTop: 18 }]}>Preview</Text>
            <View style={[styles.previewCard, { backgroundColor: previewBackground }]}>
              <View style={styles.previewHeaderRow}>
                <View
                  style={[
                    styles.previewAvatar,
                    { backgroundColor: previewAvatarConfig.backgroundColor ?? previewPrimary }
                  ]}
                >
                  {previewAvatarConfig.icon ? (
                    <Ionicons
                      name={previewAvatarConfig.icon.name}
                      size={18}
                      color={previewAvatarConfig.icon.color ?? '#fff'}
                    />
                  ) : (
                    <Text style={[styles.previewAvatarEmoji, { color: previewAvatarConfig.foregroundColor ?? '#fff' }]}>
                      {previewAvatarConfig.emoji ?? '🙂'}
                    </Text>
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.previewTitle, { color: previewPrimary }]}>
                    {authorProfile?.nickname?.trim() || 'Anonymous'}
                  </Text>
                  <Text
                    style={[styles.previewMeta, { color: previewMuted }]}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {selectedLocation?.city
                      ? `${selectedLocation.city}${selectedLocation.province ? `, ${selectedLocation.province}` : ''}${selectedLocation.country ? `, ${selectedLocation.country}` : ''}`
                      : 'Choose a location to preview'}
                  </Text>
                </View>
              </View>
              <TextInput
                style={[styles.previewInput, { color: previewPrimary }]}
                placeholder="What's happening?"
                placeholderTextColor={previewMuted}
                multiline
                value={message}
                onChangeText={setMessage}
                autoCapitalize="sentences"
              />
            </View>
          </ScrollView>

          <TouchableOpacity
            style={[
              styles.submitButton,
              {
                backgroundColor: selectedPreset.buttonBackground ?? themeColors.primaryDark,
                opacity: message.trim() && selectedLocation?.city ? 1 : 0.6
              }
            ]}
            onPress={handleSubmit}
            activeOpacity={0.85}
            disabled={!message.trim() || !selectedLocation?.city}
          >
            <Text
              style={[
                styles.submitButtonText,
                { color: selectedPreset.buttonForeground ?? '#fff' }
              ]}
            >
              Publish
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      <ShareLocationModal
        visible={locationModalVisible}
        onClose={() => setLocationModalVisible(false)}
        onSelectCity={(cityName, meta) => {
          setSelectedLocation({
            city: cityName,
            province: meta.province ?? '',
            country: meta.country ?? ''
          });
          setLocationModalVisible(false);
        }}
        originCity={selectedLocation?.city}
        initialCountry={selectedLocation?.country || initialLocation?.country}
        initialProvince={selectedLocation?.province || initialLocation?.province}
        accentColor={selectedPreset.linkColor ?? themeColors.primaryDark}
        title="Choose a room"
      />
    </Modal>
  );
}

const createStyles = (palette, { isDarkMode } = {}) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.35)',
      justifyContent: 'flex-end'
    },
    card: {
      backgroundColor: palette.card,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      padding: 20,
      maxHeight: '85%',
      shadowColor: '#000',
      shadowOpacity: isDarkMode ? 0.35 : 0.12,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
      elevation: 10
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12
    },
    title: {
      fontSize: 18,
      fontWeight: '700',
      color: palette.textPrimary
    },
    sectionLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: palette.textPrimary,
      marginBottom: 8
    },
    locationButton: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: palette.divider,
      borderRadius: 12,
      paddingVertical: 12,
      paddingHorizontal: 14,
      backgroundColor: isDarkMode ? palette.background : '#ffffff'
    },
    locationButtonText: {
      fontSize: 14,
      color: palette.textPrimary,
      flexShrink: 1
    },
    helperText: {
      marginTop: 6,
      fontSize: 12,
      color: palette.textSecondary
    },
    previewCard: {
      borderRadius: 18,
      padding: 18,
      marginTop: 4,
      shadowColor: '#000',
      shadowOpacity: isDarkMode ? 0.35 : 0.06,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 4 },
      elevation: 3
    },
    previewHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12
    },
    previewAvatar: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 10
    },
    previewAvatarEmoji: {
      fontSize: 18
    },
    previewTitle: {
      fontSize: 16,
      fontWeight: '700'
    },
    previewMeta: {
      fontSize: 12,
      marginTop: 4
    },
    swatchRow: {
      flexDirection: 'row',
      flexWrap: 'wrap'
    },
    swatch: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
      marginBottom: 12,
      borderWidth: 2,
      borderColor: 'transparent'
    },
    swatchActive: {
      borderColor: '#fff',
      shadowColor: '#000',
      shadowOpacity: 0.18,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 3 },
      elevation: 3
    },
    submitButton: {
      marginTop: 16,
      borderRadius: 14,
      paddingVertical: 14,
      alignItems: 'center'
    },
    submitButtonText: {
      fontSize: 16,
      fontWeight: '600'
    }
  });
