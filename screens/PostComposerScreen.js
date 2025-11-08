import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
  Platform,
  Modal,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSettings, accentPresets } from '../contexts/SettingsContext';
import { useAuth } from '../contexts/AuthContext';
import { useAlert } from '../contexts/AlertContext';
import { getAvatarConfig } from '../constants/avatars';
import ShareLocationModal from '../components/ShareLocationModal';
import PollComposer from '../components/PollComposer';
import SmartComposerModal from '../components/SmartComposerModal';
import useHaptics from '../hooks/useHaptics';
import {
  EMAIL_ADDRESS_REGEX,
  EMAIL_LABEL_PLACEHOLDER,
  EMAIL_PLACEHOLDER,
  MAILTO_PREFIX_LENGTH,
  MAILTO_PREFIX_STRING,
  hasRichFormatting
} from '../utils/textFormatting';

export default function PostComposerScreen({ navigation, route }) {
  const { initialLocation, initialAccentKey, onSubmit } = route.params || {};
  const { themeColors, isDarkMode, userProfile } = useSettings();
  const { user } = useAuth();
  const { showAlert } = useAlert();
  const haptics = useHaptics();
  const insets = useSafeAreaInsets();

  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [selectedColor, setSelectedColor] = useState(initialAccentKey ?? accentPresets[0].key);
  const [locationModalVisible, setLocationModalVisible] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(
    initialLocation?.city ? {
      city: initialLocation.city,
      province: initialLocation.province ?? '',
      country: initialLocation.country ?? ''
    } : null
  );
  const [advancedEnabled, setAdvancedEnabled] = useState(false);
  const [highlightDescription, setHighlightDescription] = useState(false);
  const [messageSelection, setMessageSelection] = useState({ start: 0, end: 0 });
  const [postingMode, setPostingMode] = useState(userProfile?.currentMode || 'anonymous');
  const [pollData, setPollData] = useState(null);
  const [pollModalVisible, setPollModalVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSmartComposer, setShowSmartComposer] = useState(false);

  const messageInputRef = useRef(null);

  const isGold = userProfile?.subscriptionPlan === 'gold';

  const selectedPreset = useMemo(
    () => accentPresets.find((preset) => preset.key === selectedColor) ?? accentPresets[0],
    [selectedColor]
  );

  const previewBackground = selectedPreset.background;
  const previewPrimary = selectedPreset.onPrimary ?? (selectedPreset.isDark ? '#fff' : themeColors.textPrimary);
  const previewMuted = selectedPreset.metaColor ?? (selectedPreset.isDark ? 'rgba(255,255,255,0.8)' : themeColors.textSecondary);
  const previewHighlightFill = selectedPreset.highlightFill ?? (selectedPreset.isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.08)');
  const summaryAccentColor = selectedPreset.buttonBackground ?? themeColors.primaryDark;
  const advancedTrackOn = themeColors.primaryLight ?? themeColors.primaryDark;
  const advancedThumbOn = '#ffffff';

  const previewAvatarConfig = useMemo(
    () => getAvatarConfig(userProfile?.avatarKey),
    [userProfile?.avatarKey]
  );

  const trimmedTitle = title.trim();
  const trimmedMessage = message.trim();
  const canSubmit = trimmedTitle && selectedLocation?.city && !isSubmitting;

  const handleClose = () => {
    if (trimmedTitle || trimmedMessage || pollData) {
      showAlert(
        'Discard post?',
        'You have unsaved changes. Are you sure you want to discard this post?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Discard', style: 'destructive', onPress: () => navigation.goBack() }
        ],
        { type: 'warning' }
      );
    } else {
      navigation.goBack();
    }
  };

  const handleToggleAdvanced = (value) => {
    setAdvancedEnabled(value);
    if (!value) {
      setHighlightDescription(false);
    }
  };

  const handleTogglePostingMode = (mode) => {
    if (!userProfile?.isPublicProfile && mode === 'public') {
      showAlert(
        'Public Profile Required',
        'You need to set up a public profile to post publicly.',
        [{ text: 'OK' }],
        { type: 'info' }
      );
      return;
    }
    haptics.light();
    setPostingMode(mode);
  };

  const handlePollCreate = (poll) => {
    setPollData(poll);
    setPollModalVisible(false);
  };

  const handleUseAIPost = (content, hashtags) => {
    // Populate post from AI composer
    setMessage(content);

    // Add hashtags to message if provided
    if (hashtags && hashtags.length > 0) {
      const hashtagText = hashtags.map(tag => `#${tag}`).join(' ');
      setMessage(prev => `${prev}\n\n${hashtagText}`);
    }

    setShowSmartComposer(false);
    showAlert('Success', 'Post populated with AI content!', [{ text: 'OK' }]);
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;

    setIsSubmitting(true);

    try {
      const result = await onSubmit({
        location: selectedLocation,
        colorKey: selectedColor,
        title: trimmedTitle,
        message: trimmedMessage,
        description: trimmedMessage,
        highlightDescription,
        postingMode,
        isPublic: postingMode === 'public',
        poll: pollData
      });

      if (result !== false) {
        // Navigate to MyPosts screen to show post status (published or in review)
        navigation.navigate('MyPosts');
      }
    } catch (error) {
      console.warn('[PostComposer] submit failed', error);
      showAlert('Unable to publish', error?.message ?? 'Please try again in a moment.', [], { type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateSelection = (nextSelection) => {
    if (typeof nextSelection?.start === 'number' && typeof nextSelection?.end === 'number') {
      setMessageSelection((prev) => (prev.start === nextSelection.start && prev.end === nextSelection.end ? prev : nextSelection));
    }
  };

  const focusDescriptionInput = () => {
    messageInputRef.current?.focus?.();
  };

  const wrapSelection = (wrap) => {
    focusDescriptionInput();
    const { start, end } = messageSelection;
    const safeStart = Math.max(0, start);
    const safeEnd = Math.max(0, end);
    const before = message.slice(0, safeStart);
    const selected = message.slice(safeStart, safeEnd);
    const after = message.slice(safeEnd);

    if (safeStart === safeEnd) {
      const newValue = before + wrap + wrap + after;
      setMessage(newValue);
      const newCursorPos = safeStart + wrap.length;
      setTimeout(() => {
        setMessageSelection({ start: newCursorPos, end: newCursorPos });
      }, 50);
    } else {
      const newValue = before + wrap + selected + wrap + after;
      setMessage(newValue);
      setTimeout(() => {
        setMessageSelection({ start: safeStart, end: safeEnd + 2 * wrap.length });
      }, 50);
    }
  };

  const applyBoldFormatting = () => wrapSelection('**');
  const applyBulletFormatting = () => {
    focusDescriptionInput();
    const { start } = messageSelection;
    const before = message.slice(0, start);
    const after = message.slice(start);
    const newValue = before + '\n• ' + after;
    setMessage(newValue);
    const newPos = start + 3;
    setTimeout(() => {
      setMessageSelection({ start: newPos, end: newPos });
    }, 50);
  };

  const applyEmailFormatting = () => {
    focusDescriptionInput();
    const { start, end } = messageSelection;
    const selected = message.slice(start, end).trim();
    const isEmail = EMAIL_ADDRESS_REGEX.test(selected);
    const before = message.slice(0, start);
    const after = message.slice(end);

    if (isEmail) {
      const newValue = before + `[${EMAIL_LABEL_PLACEHOLDER}](${MAILTO_PREFIX_STRING}${selected})` + after;
      setMessage(newValue);
      const labelStart = start + 1;
      const labelEnd = labelStart + EMAIL_LABEL_PLACEHOLDER.length;
      setTimeout(() => {
        setMessageSelection({ start: labelStart, end: labelEnd });
      }, 50);
    } else {
      const newValue = before + `[${EMAIL_LABEL_PLACEHOLDER}](${EMAIL_PLACEHOLDER})` + after;
      setMessage(newValue);
      const emailStart = start + EMAIL_LABEL_PLACEHOLDER.length + MAILTO_PREFIX_LENGTH + 3;
      const emailEnd = emailStart + EMAIL_PLACEHOLDER.length - MAILTO_PREFIX_LENGTH;
      setTimeout(() => {
        setMessageSelection({ start: emailStart, end: emailEnd });
      }, 50);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      <View style={[styles.container, { backgroundColor: themeColors.background }]}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 12, backgroundColor: themeColors.card }]}>
          <TouchableOpacity onPress={handleClose} style={styles.headerButton}>
            <Ionicons name="close" size={28} color={themeColors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: themeColors.textPrimary }]}>Create a post</Text>
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={!canSubmit}
            style={[
              styles.headerButton,
              styles.publishButton,
              { backgroundColor: canSubmit ? summaryAccentColor : themeColors.divider }
            ]}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={[styles.publishButtonText, { opacity: canSubmit ? 1 : 0.5 }]}>
                Publish
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
        {/* Posting Mode Toggle */}
        {userProfile?.isPublicProfile ? (
          <>
            <Text style={[styles.sectionLabel, { color: themeColors.textPrimary }]}>Posting as</Text>
            <View style={styles.modeToggleContainer}>
              <TouchableOpacity
                style={[
                  styles.modeToggleButton,
                  { borderColor: themeColors.divider, backgroundColor: themeColors.background },
                  postingMode === 'anonymous' && [styles.modeToggleButtonActive, { backgroundColor: summaryAccentColor }]
                ]}
                onPress={() => handleTogglePostingMode('anonymous')}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="eye-off-outline"
                  size={18}
                  color={postingMode === 'anonymous' ? '#fff' : themeColors.textSecondary}
                />
                <Text
                  style={[
                    styles.modeToggleText,
                    { color: postingMode === 'anonymous' ? '#fff' : themeColors.textSecondary }
                  ]}
                >
                  Anonymous
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modeToggleButton,
                  { borderColor: themeColors.divider, backgroundColor: themeColors.background },
                  postingMode === 'public' && [styles.modeToggleButtonActive, { backgroundColor: summaryAccentColor }]
                ]}
                onPress={() => handleTogglePostingMode('public')}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="person-outline"
                  size={18}
                  color={postingMode === 'public' ? '#fff' : themeColors.textSecondary}
                />
                <Text
                  style={[
                    styles.modeToggleText,
                    { color: postingMode === 'public' ? '#fff' : themeColors.textSecondary }
                  ]}
                >
                  @{userProfile.username || 'Public'}
                </Text>
              </TouchableOpacity>
            </View>
            <Text style={[styles.helperText, { color: themeColors.textSecondary }]}>
              {postingMode === 'anonymous'
                ? 'Post anonymously in this city. Others won\'t see your profile.'
                : 'Post from your public profile. Followers will see this in their feed.'}
            </Text>
          </>
        ) : null}

        {/* Advanced Options Toggle */}
        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.sectionLabel, { color: themeColors.textPrimary }]}>Advanced options</Text>
          <Switch
            value={advancedEnabled}
            onValueChange={handleToggleAdvanced}
            trackColor={{ false: themeColors.divider, true: advancedTrackOn }}
            thumbColor={advancedEnabled ? advancedThumbOn : '#f4f3f4'}
            ios_backgroundColor={themeColors.divider}
          />
        </View>

        {/* Location */}
        <Text style={[styles.sectionLabel, { color: themeColors.textPrimary }]}>Location</Text>
        <TouchableOpacity
          style={[styles.locationButton, { borderColor: themeColors.divider, backgroundColor: themeColors.card }]}
          onPress={() => setLocationModalVisible(true)}
          activeOpacity={0.85}
        >
          <Ionicons name="location-outline" size={18} color={themeColors.primaryDark} style={{ marginRight: 8 }} />
          <Text style={[styles.locationButtonText, { color: themeColors.textPrimary }]}>
            {selectedLocation?.city
              ? `${selectedLocation.city}${selectedLocation.province ? `, ${selectedLocation.province}` : ''}${selectedLocation.country ? `, ${selectedLocation.country}` : ''}`
              : 'Choose city'}
          </Text>
        </TouchableOpacity>
        {!selectedLocation?.city && (
          <Text style={[styles.helperText, { color: themeColors.textSecondary }]}>Select a city to post into.</Text>
        )}

        {/* AI Post Composer - Gold Feature */}
        {isGold && (
          <>
            <Text style={[styles.sectionLabel, { marginTop: 18, color: themeColors.textPrimary }]}>AI Assistant</Text>
            <TouchableOpacity
              style={[styles.aiComposerButton, { backgroundColor: themeColors.primaryDark }]}
              onPress={() => setShowSmartComposer(true)}
              activeOpacity={0.85}
            >
              <Text style={styles.aiComposerIcon}>✨</Text>
              <Text style={styles.aiComposerText}>AI Post Composer</Text>
              <View style={styles.goldBadge}>
                <Text style={styles.goldBadgeText}>GOLD</Text>
              </View>
            </TouchableOpacity>
            <Text style={[styles.helperText, { color: themeColors.textSecondary }]}>
              Let GPT-4o help you write engaging posts
            </Text>
          </>
        )}

        {/* Card Style */}
        <Text style={[styles.sectionLabel, { marginTop: 18, color: themeColors.textPrimary }]}>Card style</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.swatchScrollView}
          contentContainerStyle={styles.swatchRow}
        >
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
                {isActive ? <Ionicons name="checkmark" size={18} color="#fff" /> : null}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Advanced Formatting Toolbar */}
        {advancedEnabled ? (
          <View style={styles.formatToolbar}>
            <TouchableOpacity
              style={[
                styles.formatButton,
                highlightDescription && [styles.formatButtonActive, { backgroundColor: previewHighlightFill }]
              ]}
              onPress={() => setHighlightDescription((prev) => !prev)}
              activeOpacity={0.75}
            >
              <Ionicons
                name={highlightDescription ? 'color-wand' : 'color-wand-outline'}
                size={16}
                color={highlightDescription ? previewPrimary : themeColors.textSecondary}
              />
            </TouchableOpacity>
            <TouchableOpacity style={styles.formatButton} onPress={applyBoldFormatting} activeOpacity={0.75}>
              <MaterialCommunityIcons name="format-bold" size={18} color={themeColors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.formatButton} onPress={applyBulletFormatting} activeOpacity={0.75}>
              <MaterialCommunityIcons name="format-list-bulleted" size={18} color={themeColors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.formatButton} onPress={applyEmailFormatting} activeOpacity={0.75}>
              <MaterialCommunityIcons name="email-outline" size={18} color={themeColors.textSecondary} />
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Preview Card */}
        <Text style={[styles.sectionLabel, { marginTop: 18, color: themeColors.textPrimary }]}>Preview</Text>
        <View style={[styles.previewCard, { backgroundColor: previewBackground }]}>
          <View style={styles.previewHeaderRow}>
            <View
              style={[
                styles.previewAvatar,
                { backgroundColor: previewAvatarConfig.backgroundColor ?? previewPrimary }
              ]}
            >
              {previewAvatarConfig.icon ? (
                <Ionicons name={previewAvatarConfig.icon.name} size={18} color={previewAvatarConfig.icon.color ?? '#fff'} />
              ) : (
                <Text style={[styles.previewAvatarEmoji, { color: previewAvatarConfig.foregroundColor ?? '#fff' }]}>
                  {previewAvatarConfig.emoji ?? '🙂'}
                </Text>
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.previewTitle, { color: previewPrimary }]}>
                {userProfile?.nickname?.trim() || 'Anonymous'}
              </Text>
              <Text style={[styles.previewMeta, { color: previewMuted }]} numberOfLines={1} ellipsizeMode="tail">
                {selectedLocation?.city
                  ? `${selectedLocation.city}${selectedLocation.province ? `, ${selectedLocation.province}` : ''}${selectedLocation.country ? `, ${selectedLocation.country}` : ''}`
                  : 'Choose a location to preview'}
              </Text>
            </View>
          </View>

          <TextInput
            style={[styles.previewTitleInput, { color: previewPrimary }]}
            placeholder="Post title"
            placeholderTextColor={previewMuted}
            value={title}
            onChangeText={setTitle}
            autoCapitalize="sentences"
            returnKeyType="next"
          />
          <TextInput
            style={[
              styles.previewBodyInput,
              { color: previewPrimary },
              highlightDescription && [styles.previewBodyInputHighlighted, { backgroundColor: previewHighlightFill }]
            ]}
            placeholder="Description (optional)"
            placeholderTextColor={previewMuted}
            multiline
            value={message}
            onChangeText={setMessage}
            autoCapitalize="sentences"
            ref={messageInputRef}
            onSelectionChange={(e) => updateSelection(e?.nativeEvent?.selection)}
            selection={messageSelection}
          />
          {pollData && pollData.question && pollData.options && (
            <View style={[styles.pollPreview, { backgroundColor: previewHighlightFill }]}>
              <View style={styles.pollPreviewHeader}>
                <Ionicons name="stats-chart" size={16} color={previewPrimary} />
                <Text style={[styles.pollPreviewTitle, { color: previewPrimary }]}>
                  Poll: {pollData.question}
                </Text>
              </View>
              <Text style={[styles.pollPreviewOptions, { color: previewMuted }]}>
                {pollData.options.length} options
              </Text>
              <TouchableOpacity
                onPress={() => setPollData(null)}
                style={styles.removePollButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close-circle" size={20} color={previewMuted} />
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Add Poll Button */}
        <TouchableOpacity
          onPress={() => setPollModalVisible(true)}
          style={[
            styles.pollButton,
            {
              backgroundColor: pollData ? `${summaryAccentColor}20` : themeColors.card,
              borderColor: pollData ? summaryAccentColor : themeColors.divider
            }
          ]}
          activeOpacity={0.7}
        >
          <Ionicons
            name="stats-chart"
            size={20}
            color={pollData ? summaryAccentColor : themeColors.textSecondary}
          />
          <Text style={[styles.pollButtonText, {
            color: pollData ? summaryAccentColor : themeColors.textSecondary
          }]}>
            {pollData ? 'Edit Poll' : 'Add Poll'}
          </Text>
        </TouchableOpacity>

        <View style={{ height: insets.bottom + 200 }} />
      </ScrollView>

      {/* Location Modal */}
      <ShareLocationModal
        visible={locationModalVisible}
        onClose={() => setLocationModalVisible(false)}
        onSelectCity={(cityName, meta) => {
          setSelectedLocation({ city: cityName, province: meta.province ?? '', country: meta.country ?? '' });
          setLocationModalVisible(false);
        }}
        originCity={selectedLocation?.city}
        initialCountry={selectedLocation?.country || initialLocation?.country}
        initialProvince={selectedLocation?.province || initialLocation?.province}
        accentColor={selectedPreset.linkColor ?? themeColors.primaryDark}
        title="Choose a room"
      />

      {/* Poll Modal */}
      <Modal
        visible={pollModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setPollModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.overlay}>
            <TouchableWithoutFeedback onPress={() => setPollModalVisible(false)}>
              <View style={{ flex: 1 }} />
            </TouchableWithoutFeedback>
            <View style={[styles.modalCard, { backgroundColor: themeColors.card, maxHeight: '85%' }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: themeColors.textPrimary }]}>Create Poll</Text>
                <TouchableOpacity onPress={() => setPollModalVisible(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Ionicons name="close" size={24} color={themeColors.textSecondary} />
                </TouchableOpacity>
              </View>
              <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                <PollComposer
                  key={pollData ? JSON.stringify(pollData) : 'new-poll'}
                  onPollCreate={handlePollCreate}
                  themeColors={themeColors}
                  accentColor={selectedPreset.buttonBackground ?? themeColors.primaryDark}
                  initialPoll={pollData}
                />
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Smart Composer Modal - Gold Feature */}
      <SmartComposerModal
        visible={showSmartComposer}
        onClose={() => setShowSmartComposer(false)}
        onUsePost={handleUseAIPost}
      />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  headerButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  publishButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  publishButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    marginTop: 18,
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  locationButtonText: {
    fontSize: 14,
    flexShrink: 1,
  },
  helperText: {
    marginTop: 6,
    fontSize: 12,
  },
  swatchScrollView: {
    marginVertical: 8,
  },
  swatchRow: {
    flexDirection: 'row',
    gap: 10,
  },
  swatch: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatchActive: {
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  formatToolbar: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  formatButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  formatButtonActive: {
    borderColor: 'transparent',
  },
  previewCard: {
    borderRadius: 18,
    padding: 18,
    marginTop: 4,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  previewHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  previewAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  previewAvatarEmoji: {
    fontSize: 18,
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  previewMeta: {
    fontSize: 12,
    marginTop: 4,
  },
  previewTitleInput: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
    padding: 0,
  },
  previewBodyInput: {
    fontSize: 15,
    lineHeight: 22,
    minHeight: 80,
    padding: 0,
    textAlignVertical: 'top',
  },
  previewBodyInputHighlighted: {
    borderRadius: 8,
    padding: 10,
    marginHorizontal: -10,
  },
  modeToggleContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  modeToggleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  modeToggleButtonActive: {
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  modeToggleText: {
    fontSize: 14,
    fontWeight: '600',
  },
  pollButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 12,
  },
  pollButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  pollPreview: {
    marginTop: 12,
    padding: 12,
    borderRadius: 10,
    position: 'relative',
  },
  pollPreviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  pollPreviewTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  pollPreviewOptions: {
    fontSize: 12,
  },
  removePollButton: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  aiComposerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    marginBottom: 8,
  },
  aiComposerIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  aiComposerText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  goldBadge: {
    backgroundColor: '#ffd700',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  goldBadgeText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#000',
    letterSpacing: 0.5,
  },
});
