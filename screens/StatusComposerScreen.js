import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Linking,
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
import CameraCapture from '../components/CameraCapture';
import UpgradePromptModal from '../components/UpgradePromptModal';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import { useStatuses } from '../contexts/StatusesContext';
import { analyzePostContent } from '../services/openai/moderationService';
import { canCreateStatus, recordStatusCreated } from '../utils/subscriptionUtils';

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

export default function StatusComposerScreen({ navigation }) {
  const { isAdmin } = useAuth();
  const { themeColors, userProfile } = useSettings();
  const { createStatus } = useStatuses();

  const [message, setMessage] = useState('');
  const [imageUri, setImageUri] = useState(null);
  const [imageMimeType, setImageMimeType] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploadPct, setUploadPct] = useState(0);
  const [error, setError] = useState('');
  const [showCamera, setShowCamera] = useState(false);
  const [upgradeModalVisible, setUpgradeModalVisible] = useState(false);
  const [statusLimitInfo, setStatusLimitInfo] = useState({ count: 0, limit: 5, remaining: 5 });

  const userPlan = userProfile?.subscriptionPlan || 'basic';

  const styles = useMemo(() => createStyles(themeColors), [themeColors]);

  const ensureUnderLimit = useCallback(async (uri) => {
    const blob = await (await fetch(uri)).blob();
    console.log('[composer] picked blob size(bytes):', blob.size, 'type:', blob.type);
    if (blob.size > MAX_UPLOAD_BYTES) {
      throw new Error('Image is too large; please pick a smaller one (<5MB).');
    }
    return { uri, mimeType: blob.type || 'image/jpeg' };
  }, []);

  const handleUpgradeNow = useCallback(() => {
    setUpgradeModalVisible(false);
    navigation.navigate('Subscription');
  }, [navigation]);

  const launchImagePicker = useCallback(async () => {
    let perm = await ImagePicker.getMediaLibraryPermissionsAsync();
    if (!perm.granted) perm = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!perm.granted) {
      if (!perm.canAskAgain) {
        setError('Photos permission is off. Enable it in Settings to attach an image.');
        try { await Linking.openSettings(); } catch { }
      } else {
        setError('Media library permission is required to attach an image.');
      }
      return;
    }

    const mediaTypes =
      (ImagePicker?.MediaType && (ImagePicker.MediaType.image || ImagePicker.MediaType.images)) ||
      (ImagePicker?.MediaTypeOptions && ImagePicker.MediaTypeOptions.Images) ||
      undefined;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes,
      allowsEditing: false,
      quality: 1,
      selectionLimit: 1,
    });

    console.log('[composer] picker result:', { canceled: result.canceled, count: result.assets?.length });

    if (!result.canceled && result.assets?.length) {
      try {
        const asset = result.assets[0];
        console.log('[composer] selected asset:', { uri: asset.uri, type: asset.mimeType });
        const safe = await ensureUnderLimit(asset.uri);
        setImageUri(safe.uri);
        setImageMimeType(safe.mimeType);
        setError('');
      } catch (e) {
        setImageUri(null);
        setImageMimeType(null);
        setError(e.message || 'Selected image is too large.');
      }
    }
  }, [ensureUnderLimit]);

  const handleCameraCapture = useCallback(async (photo) => {
    try {
      const safe = await ensureUnderLimit(photo.uri);
      setImageUri(safe.uri);
      setImageMimeType(safe.mimeType);
      setError('');
    } catch (e) {
      setImageUri(null);
      setImageMimeType(null);
      setError(e.message || 'Captured photo is too large.');
    }
  }, [ensureUnderLimit]);

  const handleSubmit = useCallback(async () => {
    const trimmed = message.trim();
    if (!trimmed) { setError('Write something to share.'); return; }

    // Check status limit (admins bypass limits)
    const limitCheck = await canCreateStatus(userPlan, isAdmin);
    if (!limitCheck.allowed) {
      setStatusLimitInfo(limitCheck);
      setUpgradeModalVisible(true);
      return;
    }

    setSubmitting(true);
    setUploadPct(0);
    try {
      // Moderation check
      console.log('[StatusComposer] Running moderation...');
      const moderation = await analyzePostContent({ message: trimmed });
      console.log('[StatusComposer] Moderation result:', moderation.action);

      if (moderation.action === 'block') {
        setError('Your status contains inappropriate content and cannot be posted. Please revise and try again.');
        setSubmitting(false);
        setUploadPct(0);
        return;
      }

      const image = imageUri ? { uri: imageUri, mimeType: imageMimeType } : null;
      console.log('[composer] submit with image?', Boolean(image));
      await createStatus({
        message: trimmed,
        image,
        onUploadProgress: (pct) => setUploadPct(pct),
        moderation,
      });

      // Record status creation for limit tracking
      await recordStatusCreated();

      setMessage('');
      setImageUri(null);
      setImageMimeType(null);
      setError('');
      navigation.goBack();
    } catch (submitError) {
      console.error('[composer] submit error:', submitError);
      setError(submitError?.message ?? 'Unable to share status right now.');
    } finally {
      setSubmitting(false);
      setUploadPct(0);
    }
  }, [createStatus, imageUri, imageMimeType, message, navigation, userPlan]);

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
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
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
                <Image source={{ uri: imageUri }} style={styles.previewImage} resizeMode="contain" />
                <TouchableOpacity
                  onPress={() => { setImageUri(null); setImageMimeType(null); }}
                  style={styles.removeImageButton}
                  activeOpacity={0.8}
                >
                  <Ionicons name="close" size={18} color="#fff" />
                </TouchableOpacity>
              </View>
            ) : null}

            <View style={styles.attachButtons}>
              <TouchableOpacity style={styles.attachButton} onPress={() => setShowCamera(true)} activeOpacity={0.85}>
                <Ionicons name="camera-outline" size={18} color={themeColors.primaryDark} />
                <Text style={styles.attachLabel}>Take photo</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.attachButton} onPress={launchImagePicker} activeOpacity={0.85}>
                <Ionicons name="image-outline" size={18} color={themeColors.primaryDark} />
                <Text style={styles.attachLabel}>Add photo</Text>
              </TouchableOpacity>
            </View>
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
              <Text style={styles.submitLabel}>
                {uploadPct > 0 ? `Uploading ${uploadPct}%…` : 'Sharing…'}
              </Text>
            ) : (
              <Text style={styles.submitLabel}>Share status</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      <CameraCapture
        visible={showCamera}
        onClose={() => setShowCamera(false)}
        onCapture={handleCameraCapture}
        mode="photo"
      />

      <UpgradePromptModal
        visible={upgradeModalVisible}
        onClose={() => setUpgradeModalVisible(false)}
        onUpgrade={handleUpgradeNow}
        featureName={`Status Limit Reached (${statusLimitInfo.count}/${statusLimitInfo.limit})`}
        featureDescription={`You've reached your daily limit of ${statusLimitInfo.limit} statuses. Upgrade to Premium for unlimited statuses!`}
        requiredPlan="premium"
        icon="chatbubble-ellipses"
      />
    </ScreenLayout>
  );
}

const createStyles = (palette) =>
  StyleSheet.create({
    scroll: { flex: 1 },
    content: { padding: 20 },
    card: {
      backgroundColor: palette.card,
      borderRadius: 20,
      padding: 20,
      borderWidth: 1,
      borderColor: palette.divider,
      marginBottom: 20,
    },
    label: { fontSize: 16, fontWeight: '700', color: palette.textPrimary, marginBottom: 12 },
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
    counter: { textAlign: 'right', marginTop: 8, fontSize: 12, color: palette.textSecondary },
    attachButtons: { flexDirection: 'row', gap: 16, marginTop: 16 },
    attachButton: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    attachLabel: { marginLeft: 8, fontSize: 14, fontWeight: '600', color: palette.primaryDark },
    previewBlock: { marginTop: 16, borderRadius: 16, overflow: 'hidden', position: 'relative' },
    previewImage: { width: '100%', height: 220 },
    removeImageButton: { position: 'absolute', top: 10, right: 10, backgroundColor: 'rgba(15,23,42,0.6)', borderRadius: 14, padding: 6 },
    metaHeading: { fontSize: 14, fontWeight: '700', color: palette.textPrimary, marginBottom: 4 },
    metaBody: { fontSize: 13, color: palette.textSecondary, lineHeight: 20 },
    errorText: { color: '#ef4444', textAlign: 'center', fontSize: 13, marginBottom: 16 },
    submitButton: { backgroundColor: palette.primary, borderRadius: 16, paddingVertical: 14, alignItems: 'center' },
    submitButtonDisabled: { opacity: 0.7 },
    submitLabel: { color: '#fff', fontSize: 15, fontWeight: '700' },
  });
