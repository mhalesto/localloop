import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';

import ScreenLayout from '../components/ScreenLayout';
import { useSettings } from '../contexts/SettingsContext';
import { useStatuses } from '../contexts/StatusesContext';

export default function StatusComposerScreen({ navigation }) {
  const { themeColors, userProfile } = useSettings();
  const { createStatus } = useStatuses();

  const [message, setMessage] = useState('');
  const [imageUri, setImageUri] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const styles = useMemo(() => createStyles(themeColors), [themeColors]);

  const launchImagePicker = useCallback(async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError('Media library permission is required to attach an image.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: true,
    });

    if (!result.canceled && result.assets?.length) {
      setImageUri(result.assets[0].uri);
      setError('');
    }
  }, []);

  const handleSubmit = useCallback(async () => {
    const trimmed = message.trim();
    if (!trimmed) {
      setError('Write something to share.');
      return;
    }

    setSubmitting(true);
    try {
      await createStatus({ message: trimmed, imageUri });
      setMessage('');
      setImageUri(null);
      setError('');
      navigation.goBack();
    } catch (submitError) {
      setError(submitError?.message ?? 'Unable to share status right now.');
    } finally {
      setSubmitting(false);
    }
  }, [createStatus, imageUri, message, navigation]);

  const locationSummary = useMemo(() => {
    const parts = [userProfile?.city, userProfile?.province];
    return parts.filter(Boolean).join(', ') || 'Share your location in Settings to reach nearby people.';
  }, [userProfile?.city, userProfile?.province]);

  return (
    <ScreenLayout
      title="New status"
      subtitle="Share a quick update"
      navigation={navigation}
      onBack={() => navigation.goBack?.()}
      showFooter={false}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.card}>
            <Text style={styles.label}>What’s happening?</Text>
            <TextInput
              style={styles.input}
              multiline
              placeholder="Share something timely..."
              placeholderTextColor={themeColors.textSecondary}
              value={message}
              onChangeText={setMessage}
              maxLength={280}
            />
            <Text style={styles.counter}>{message.trim().length}/280</Text>

            {imageUri ? (
              <View style={styles.previewBlock}>
                <Image source={{ uri: imageUri }} style={styles.previewImage} />
                <TouchableOpacity
                  onPress={() => setImageUri(null)}
                  style={styles.removeImageButton}
                  activeOpacity={0.8}
                >
                  <Ionicons name="close" size={18} color="#fff" />
                </TouchableOpacity>
              </View>
            ) : null}

            <TouchableOpacity
              style={styles.attachButton}
              onPress={launchImagePicker}
              activeOpacity={0.85}
            >
              <Ionicons name="image-outline" size={18} color={themeColors.primaryDark} />
              <Text style={styles.attachLabel}>Add photo</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.card}>
            <Text style={styles.metaHeading}>Visible around</Text>
            <Text style={styles.metaBody}>{locationSummary}</Text>
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <TouchableOpacity
            style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
            activeOpacity={0.9}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitLabel}>Share status</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenLayout>
  );
}

const createStyles = (palette) =>
  StyleSheet.create({
    scroll: {
      flex: 1,
    },
    content: {
      padding: 20,
    },
    card: {
      backgroundColor: palette.card,
      borderRadius: 20,
      padding: 20,
      borderWidth: 1,
      borderColor: palette.divider,
      marginBottom: 20,
    },
    label: {
      fontSize: 16,
      fontWeight: '700',
      color: palette.textPrimary,
      marginBottom: 12,
    },
    input: {
      minHeight: 120,
      textAlignVertical: 'top',
      fontSize: 15,
      lineHeight: 22,
      color: palette.textPrimary,
      backgroundColor: palette.background,
      borderRadius: 16,
      padding: 16,
    },
    counter: {
      textAlign: 'right',
      marginTop: 8,
      fontSize: 12,
      color: palette.textSecondary,
    },
    attachButton: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 16,
    },
    attachLabel: {
      marginLeft: 8,
      fontSize: 14,
      fontWeight: '600',
      color: palette.primaryDark,
    },
    previewBlock: {
      marginTop: 16,
      borderRadius: 16,
      overflow: 'hidden',
      position: 'relative',
    },
    previewImage: {
      width: '100%',
      height: 220,
    },
    removeImageButton: {
      position: 'absolute',
      top: 10,
      right: 10,
      backgroundColor: 'rgba(15,23,42,0.6)',
      borderRadius: 14,
      padding: 6,
    },
    metaHeading: {
      fontSize: 14,
      fontWeight: '700',
      color: palette.textPrimary,
      marginBottom: 4,
    },
    metaBody: {
      fontSize: 13,
      color: palette.textSecondary,
      lineHeight: 20,
    },
    errorText: {
      color: '#ef4444',
      textAlign: 'center',
      fontSize: 13,
      marginBottom: 16,
    },
    submitButton: {
      backgroundColor: palette.primary,
      borderRadius: 16,
      paddingVertical: 14,
      alignItems: 'center',
    },
    submitButtonDisabled: {
      opacity: 0.7,
    },
    submitLabel: {
      color: '#fff',
      fontSize: 15,
      fontWeight: '700',
    },
  });
