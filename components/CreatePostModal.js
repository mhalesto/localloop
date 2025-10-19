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
import { colors } from '../constants/colors';
import { accentPresets } from '../contexts/SettingsContext';
import ShareLocationModal from './ShareLocationModal';

export default function CreatePostModal({
  visible,
  onClose,
  initialLocation,
  initialAccentKey,
  onSubmitPost
}) {
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
    }
  }, [visible, initialAccentKey, initialLocation]);

  const selectedPreset = useMemo(
    () => accentPresets.find((preset) => preset.key === selectedColor) ?? accentPresets[0],
    [selectedColor]
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
              <Ionicons name="close" size={22} color={colors.textSecondary} />
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
                color={colors.primaryDark}
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

            <Text style={[styles.sectionLabel, { marginTop: 18 }]}>Message</Text>
            <TextInput
              style={styles.input}
              placeholder="What's happening?"
              placeholderTextColor={colors.textSecondary}
              multiline
              value={message}
              onChangeText={setMessage}
              autoCapitalize="sentences"
            />
          </ScrollView>

          <TouchableOpacity
            style={[
              styles.submitButton,
              {
                backgroundColor: selectedPreset.buttonBackground ?? colors.primaryDark,
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
        accentColor={selectedPreset.linkColor ?? colors.primaryDark}
        title="Choose a room"
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end'
  },
  card: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '85%'
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
    color: colors.textPrimary
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 8
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.divider,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14
  },
  locationButtonText: {
    fontSize: 14,
    color: colors.textPrimary,
    flexShrink: 1
  },
  helperText: {
    marginTop: 6,
    fontSize: 12,
    color: colors.textSecondary
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
  input: {
    minHeight: 100,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.divider,
    padding: 14,
    textAlignVertical: 'top',
    fontSize: 15,
    color: colors.textPrimary,
    backgroundColor: colors.background
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
