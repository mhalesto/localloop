import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Switch
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { accentPresets, useSettings } from '../contexts/SettingsContext';
import ShareLocationModal from './ShareLocationModal';
import { getAvatarConfig } from '../constants/avatars';
import {
  EMAIL_ADDRESS_REGEX,
  EMAIL_LABEL_PLACEHOLDER,
  EMAIL_PLACEHOLDER,
  MAILTO_PREFIX_LENGTH,
  MAILTO_PREFIX_STRING,
  hasRichFormatting
} from '../utils/textFormatting';

export default function CreatePostModal({
  visible,
  onClose,
  initialLocation,
  initialAccentKey,
  onSubmitPost,
  onSubmit,
  authorProfile = {},
  initialMessage = '',
  initialTitle = '',
  initialHighlightDescription = false,
  mode = 'create',
  titleText,
  submitLabel,
  allowLocationChange,
}) {
  const { themeColors, isDarkMode } = useSettings();
  const styles = useMemo(() => createStyles(themeColors, { isDarkMode }), [themeColors, isDarkMode]);
  const [title, setTitle] = useState('');
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
  const [advancedEnabled, setAdvancedEnabled] = useState(false);
  const [highlightDescription, setHighlightDescription] = useState(false);
  const [messageSelection, setMessageSelection] = useState({ start: 0, end: 0 });
  const messageInputRef = useRef(null);

  useEffect(() => {
    if (visible) {
      const nextTitle = initialTitle ?? '';
      const nextMessage = initialMessage ?? '';
      setTitle(nextTitle);
      setMessage(nextMessage);
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
      const shouldEnableAdvanced =
        Boolean(initialHighlightDescription) || hasRichFormatting(nextMessage);
      setAdvancedEnabled(shouldEnableAdvanced);
      setHighlightDescription(initialHighlightDescription ?? false);
      const caret = nextMessage.length;
      setMessageSelection({ start: caret, end: caret });
    } else {
      setLocationModalVisible(false);
      setAdvancedEnabled(false);
      setHighlightDescription(false);
      setMessageSelection({ start: 0, end: 0 });
    }
  }, [
    visible,
    initialAccentKey,
    initialLocation,
    initialMessage,
    initialTitle,
    initialHighlightDescription
  ]);

  const computedTitle = titleText ?? (mode === 'edit' ? 'Edit post' : 'Create a post');
  const computedSubmitLabel = submitLabel ?? (mode === 'edit' ? 'Save changes' : 'Publish');
  const submitHandler = onSubmit ?? onSubmitPost;
  const canChangeLocation = allowLocationChange ?? mode !== 'edit';
  const trimmedTitle = title.trim();
  const trimmedMessage = message.trim();
  const submitDisabled = !submitHandler || !trimmedTitle || !selectedLocation?.city;

  const selectedPreset = useMemo(
    () => accentPresets.find((preset) => preset.key === selectedColor) ?? accentPresets[0],
    [selectedColor]
  );
  const previewBackground = selectedPreset.background;
  const previewPrimary = selectedPreset.onPrimary ?? (selectedPreset.isDark ? '#fff' : themeColors.textPrimary);
  const previewMuted =
    selectedPreset.metaColor ??
    (selectedPreset.isDark ? 'rgba(255,255,255,0.8)' : themeColors.textSecondary);
  const previewHighlightFill =
    selectedPreset.highlightFill ??
    (selectedPreset.isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.08)');
  const advancedTrackOn = themeColors.primaryLight ?? themeColors.primaryDark;
  const advancedThumbOn = '#ffffff';
  const previewAvatarConfig = useMemo(
    () => authorProfile.avatarConfig ?? getAvatarConfig(authorProfile.avatarKey),
    [authorProfile.avatarConfig, authorProfile.avatarKey]
  );

  const handleClose = () => {
    setTitle('');
    setMessage('');
    setLocationModalVisible(false);
    setAdvancedEnabled(false);
    setHighlightDescription(false);
    setMessageSelection({ start: 0, end: 0 });
    onClose?.();
  };

  const focusDescriptionInput = () => {
    messageInputRef.current?.focus?.();
  };

  const updateSelection = (nextSelection) => {
    if (
      typeof nextSelection?.start === 'number' &&
      typeof nextSelection?.end === 'number'
    ) {
      setMessageSelection((prev) => {
        if (prev.start === nextSelection.start && prev.end === nextSelection.end) {
          return prev;
        }
        return nextSelection;
      });
    }
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
      const insertion = `${wrap}${wrap}`;
      const nextMessage = `${before}${insertion}${after}`;
      const caret = safeStart + wrap.length;
      setMessage(nextMessage);
      updateSelection({ start: caret, end: caret });
      return;
    }

    const nextMessage = `${before}${wrap}${selected}${wrap}${after}`;
    setMessage(nextMessage);
    updateSelection({ start: safeStart + wrap.length, end: safeEnd + wrap.length });
  };

  const applyBoldFormatting = () => {
    wrapSelection('**');
  };

  const applyBulletFormatting = () => {
    focusDescriptionInput();
    const { start, end } = messageSelection;
    const safeStart = Math.max(0, start);
    const safeEnd = Math.max(0, end);
    const text = message;

    const lineStart = text.lastIndexOf('\n', safeStart - 1) + 1;
    const nextLineBreak = text.indexOf('\n', safeEnd);
    const lineEnd = nextLineBreak === -1 ? text.length : nextLineBreak;
    const segment = text.slice(lineStart, lineEnd);
    const lines = segment.split('\n');
    const bulletised = lines
      .map((line) => {
        const cleaned = line.replace(/^\s*[-*•]\s+/, '');
        return cleaned ? `- ${cleaned}` : '- ';
      })
      .join('\n');

    const nextMessage = `${text.slice(0, lineStart)}${bulletised}${text.slice(lineEnd)}`;
    setMessage(nextMessage);
    updateSelection({ start: lineStart, end: lineStart + bulletised.length });
  };

  const applyEmailFormatting = () => {
    focusDescriptionInput();
    const { start, end } = messageSelection;
    const safeStart = Math.max(0, start);
    const safeEnd = Math.max(0, end);
    const before = message.slice(0, safeStart);
    const selected = message.slice(safeStart, safeEnd);
    const after = message.slice(safeEnd);
    const leadingWhitespace = selected.match(/^\s*/)?.[0] ?? '';
    const trailingWhitespace = selected.match(/\s*$/)?.[0] ?? '';
    const trimmed = selected.slice(leadingWhitespace.length, selected.length - trailingWhitespace.length);
    let label = trimmed || EMAIL_LABEL_PLACEHOLDER;
    let address = trimmed;

    if (!EMAIL_ADDRESS_REGEX.test(trimmed)) {
      address = EMAIL_PLACEHOLDER;
    }

    const inserted = `[${label}](${MAILTO_PREFIX_STRING}${address})`;
    const nextMessage = `${before}${leadingWhitespace}${inserted}${trailingWhitespace}${after}`;
    setMessage(nextMessage);

    const insertedStart = safeStart + leadingWhitespace.length;
    const labelStart = insertedStart + 1;
    const labelEnd = labelStart + label.length;
    const addressStart = labelEnd + 2 + MAILTO_PREFIX_LENGTH;
    const addressEnd = addressStart + address.length;

    if (!trimmed) {
      updateSelection({ start: labelStart, end: labelEnd });
    } else if (!EMAIL_ADDRESS_REGEX.test(trimmed)) {
      updateSelection({ start: addressStart, end: addressEnd });
    } else {
      updateSelection({ start: addressEnd, end: addressEnd });
    }
  };

  const handleToggleAdvanced = (value) => {
    setAdvancedEnabled(value);
    if (!value) {
      setHighlightDescription(false);
    }
  };

  const handleSubmit = () => {
    if (submitDisabled) {
      return;
    }
    submitHandler({
      location: selectedLocation,
      colorKey: selectedColor,
      title: trimmedTitle,
      message: trimmedMessage,
      description: trimmedMessage,
      highlightDescription
    });
    if (mode === 'create') {
      setTitle('');
      setMessage('');
      setMessageSelection({ start: 0, end: 0 });
    }
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
            <Text style={styles.title}>{computedTitle}</Text>
            <TouchableOpacity onPress={handleClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={22} color={themeColors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionLabel}>Advanced options</Text>
              <Switch
                value={advancedEnabled}
                onValueChange={handleToggleAdvanced}
                trackColor={{ false: themeColors.divider, true: advancedTrackOn }}
                thumbColor={advancedEnabled ? advancedThumbOn : '#f4f3f4'}
                ios_backgroundColor={themeColors.divider}
              />
            </View>

            <Text style={styles.sectionLabel}>Location</Text>
            <TouchableOpacity
              style={[
                styles.locationButton,
                !canChangeLocation && styles.locationButtonDisabled
              ]}
              activeOpacity={canChangeLocation ? 0.85 : 1}
              onPress={() => {
                if (canChangeLocation) {
                  setLocationModalVisible(true);
                }
              }}
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
            {!selectedLocation?.city && canChangeLocation ? (
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

            {advancedEnabled ? (
              <View style={styles.formatToolbar}>
                <TouchableOpacity
                  style={[
                    styles.formatButton,
                    highlightDescription && [
                      styles.formatButtonActive,
                      { backgroundColor: previewHighlightFill }
                    ]
                  ]}
                  onPress={() => setHighlightDescription((prev) => !prev)}
                  activeOpacity={0.75}
                  accessibilityRole="button"
                  accessibilityLabel={
                    highlightDescription
                      ? 'Disable highlighted description'
                      : 'Highlight description text'
                  }
                >
                  <Ionicons
                    name={highlightDescription ? 'color-wand' : 'color-wand-outline'}
                    size={16}
                    color={highlightDescription ? previewPrimary : themeColors.textSecondary}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.formatButton}
                  onPress={applyBoldFormatting}
                  activeOpacity={0.75}
                  accessibilityRole="button"
                  accessibilityLabel="Bold selected text"
                >
                  <MaterialCommunityIcons
                    name="format-bold"
                    size={18}
                    color={themeColors.textSecondary}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.formatButton}
                  onPress={applyBulletFormatting}
                  activeOpacity={0.75}
                  accessibilityRole="button"
                  accessibilityLabel="Convert to bullet list"
                >
                  <MaterialCommunityIcons
                    name="format-list-bulleted"
                    size={18}
                    color={themeColors.textSecondary}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.formatButton}
                  onPress={applyEmailFormatting}
                  activeOpacity={0.75}
                  accessibilityRole="button"
                  accessibilityLabel="Insert email link"
                >
                  <MaterialCommunityIcons
                    name="email-outline"
                    size={18}
                    color={themeColors.textSecondary}
                  />
                </TouchableOpacity>
              </View>
            ) : null}

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
                  highlightDescription && [
                    styles.previewBodyInputHighlighted,
                    { backgroundColor: previewHighlightFill }
                  ]
                ]}
                placeholder="Description (optional)"
                placeholderTextColor={previewMuted}
                multiline
                value={message}
                onChangeText={setMessage}
                autoCapitalize="sentences"
                ref={messageInputRef}
                onSelectionChange={(event) => updateSelection(event?.nativeEvent?.selection)}
                selection={messageSelection}
              />
            </View>
          </ScrollView>

          <TouchableOpacity
            style={[
              styles.submitButton,
              {
                backgroundColor: selectedPreset.buttonBackground ?? themeColors.primaryDark,
                opacity: submitDisabled ? 0.6 : 1
              }
            ]}
            onPress={handleSubmit}
            activeOpacity={0.85}
            disabled={submitDisabled}
          >
            <Text
              style={[
                styles.submitButtonText,
                { color: selectedPreset.buttonForeground ?? '#fff' }
              ]}
            >
              {computedSubmitLabel}
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
    sectionHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
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
    locationButtonDisabled: {
      opacity: 0.6
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
    previewTitleInput: {
      fontSize: 18,
      fontWeight: '700',
      marginBottom: 10,
    },
    previewBodyInput: {
      minHeight: 80,
      fontSize: 16,
      fontWeight: '500',
      textAlignVertical: 'top'
    },
    previewBodyInputHighlighted: {
      borderRadius: 12,
      paddingHorizontal: 10,
      paddingVertical: 8
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
    },
    formatToolbar: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 8,
      marginBottom: 12
    },
    formatButton: {
      width: 36,
      height: 36,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: palette.divider,
      backgroundColor: palette.background,
      marginRight: 10
    },
    formatButtonActive: {
      borderColor: 'transparent'
    }
  });
