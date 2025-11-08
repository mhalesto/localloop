import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Switch,
  TouchableWithoutFeedback
} from 'react-native';
import * as Clipboard from 'expo-clipboard'; // [AI-SUMMARY]
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { accentPresets, useSettings } from '../contexts/SettingsContext';
import { useAlert } from '../contexts/AlertContext';
import ShareLocationModal from './ShareLocationModal';
import { getAvatarConfig } from '../constants/avatars';
import LoadingOverlay from './LoadingOverlay';
import PollComposer from './PollComposer';
import {
  EMAIL_ADDRESS_REGEX,
  EMAIL_LABEL_PLACEHOLDER,
  EMAIL_PLACEHOLDER,
  MAILTO_PREFIX_LENGTH,
  MAILTO_PREFIX_STRING,
  hasRichFormatting
} from '../utils/textFormatting';
import { smartSummarize } from '../services/openai/summarizationService';
import { generateTitle, TITLE_STYLES, generateFallbackTitle } from '../services/openai/titleGenerationService';
import { checkDuplicate } from '../services/openai/embeddingsService';
import { isFeatureEnabled } from '../config/aiFeatures';
import MentionTextInput from './MentionTextInput';
import MentionText from './MentionText';

const LENGTH_STEPS = ['concise', 'balanced', 'detailed']; // [AI-SUMMARY]
const SUMMARY_CACHE_DEFAULT = Object.freeze({
  text: '',
  length: '',
  quality: '',
  summary: '',
  meta: null
});
const toLengthLabel = (value) => (value ? `${value.charAt(0).toUpperCase()}${value.slice(1)}` : '');
const describePollPreviewMeta = (poll) => {
  if (!poll) {
    return '';
  }
  const totalVotes = poll.totalVotes || 0;
  if (totalVotes > 0) {
    return `${totalVotes} vote${totalVotes === 1 ? '' : 's'} recorded`;
  }
  if (poll.endsAt) {
    const remaining = poll.endsAt - Date.now();
    if (remaining <= 0) {
      return 'Poll ended';
    }
    const hours = Math.floor(remaining / (60 * 60 * 1000));
    if (hours >= 24) {
      const days = Math.ceil(hours / 24);
      return `Ends in ${days} day${days === 1 ? '' : 's'}`;
    }
    if (hours >= 1) {
      return `Ends in ${hours} hour${hours === 1 ? '' : 's'}`;
    }
    const minutes = Math.max(1, Math.floor(remaining / (60 * 1000)));
    return `Ends in ${minutes} min`;
  }
  return 'Poll active';
};

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
  initialPoll = null,
  mode = 'create',
  titleText,
  submitLabel,
  allowLocationChange,
}) {
  const {
    themeColors,
    isDarkMode,
    premiumSummariesEnabled,
    premiumSummaryLength,
    userProfile,
    updateUserProfile
  } = useSettings();
  const { showAlert } = useAlert();
  const styles = useMemo(() => createStyles(themeColors, { isDarkMode }), [themeColors, isDarkMode]);

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
  const messageInputRef = useRef(null);

  // [AI-SUMMARY] summarizer workflow state
  const summarizationControllerRef = useRef(null);
  const summaryCacheRef = useRef({ ...SUMMARY_CACHE_DEFAULT });
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [summaryError, setSummaryError] = useState('');
  const [summaryText, setSummaryText] = useState('');               // preview text
  const [summaryVisible, setSummaryVisible] = useState(false);      // show preview card
  const [summaryMeta, setSummaryMeta] = useState(null);
  const [summaryLength, setSummaryLength] = useState(premiumSummaryLength || 'balanced');
  const [summaryQuality, setSummaryQuality] = useState('best');     // 'fast' | 'best'
  const scrollRef = useRef(null);                                   // for auto-scroll
  const [summaryCardY, setSummaryCardY] = useState(0);              // y-pos to scroll to
  const [isSubmitting, setIsSubmitting] = useState(false);

  // [AI-TITLE] Title generation state
  const [isGeneratingTitle, setIsGeneratingTitle] = useState(false);
  const [titleError, setTitleError] = useState('');

  // [PUBLIC-MODE] Posting mode state
  const [postingMode, setPostingMode] = useState(userProfile?.currentMode || 'anonymous');

  // Poll state
  const [pollData, setPollData] = useState(null);
  const [pollModalVisible, setPollModalVisible] = useState(false);
  const pollPreviewMeta = useMemo(() => describePollPreviewMeta(pollData), [pollData]);

  useEffect(() => {
    if (visible) {
      const nextTitle = initialTitle ?? '';
      const nextMessage = initialMessage ?? '';
      setTitle(nextTitle);
      setMessage(nextMessage);
      setSelectedColor(initialAccentKey ?? accentPresets[0].key);
      setSelectedLocation(initialLocation?.city ? {
        city: initialLocation.city,
        province: initialLocation.province ?? '',
        country: initialLocation.country ?? ''
      } : null);
      const shouldEnableAdvanced = Boolean(initialHighlightDescription) || hasRichFormatting(nextMessage);
      setAdvancedEnabled(shouldEnableAdvanced);
      setHighlightDescription(initialHighlightDescription ?? false);
      const caret = nextMessage.length;
      setMessageSelection({ start: caret, end: caret });

      // [PUBLIC-MODE] Reset to user's preferred mode
      setPostingMode(userProfile?.currentMode || 'anonymous');

      // Set poll data from initial value
      setPollData(initialPoll);
      setPollModalVisible(false);

      // [AI-SUMMARY] reset summary UI each open
      setSummaryError('');
      setIsSummarizing(false);
      setSummaryText('');
      setSummaryVisible(false);
      setSummaryMeta(null);
      setSummaryLength(premiumSummaryLength || 'balanced');
      setSummaryQuality('best');        // default to best quality for HF API
      summaryCacheRef.current = { ...SUMMARY_CACHE_DEFAULT };
      if (summarizationControllerRef.current) {
        summarizationControllerRef.current.abort?.();
        summarizationControllerRef.current = null;
      }
    } else {
      setLocationModalVisible(false);
      setAdvancedEnabled(false);
      setHighlightDescription(false);
      setMessageSelection({ start: 0, end: 0 });

      // [AI-SUMMARY] cleanup
      setSummaryError('');
      setIsSummarizing(false);
      setSummaryText('');
      setSummaryVisible(false);
      setSummaryMeta(null);
      summaryCacheRef.current = { ...SUMMARY_CACHE_DEFAULT };
      if (summarizationControllerRef.current) {
        summarizationControllerRef.current.abort?.();
        summarizationControllerRef.current = null;
      }
    }
  }, [
    visible,
    initialAccentKey,
    initialLocation,
    initialMessage,
    initialTitle,
    initialHighlightDescription,
    initialPoll,
    premiumSummaryLength
  ]);

  useEffect(() => () => {
    if (summarizationControllerRef.current) {
      summarizationControllerRef.current.abort?.();
      summarizationControllerRef.current = null;
    }
  }, []);

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
  const summaryAccentColor = selectedPreset.buttonBackground ?? themeColors.primaryDark;
  const summaryButtonBackground =
    selectedPreset.highlightFill ??
    (selectedPreset.isDark ? 'rgba(255,255,255,0.16)' : 'rgba(108,77,244,0.1)');
  const advancedTrackOn = themeColors.primaryLight ?? themeColors.primaryDark;
  const advancedThumbOn = '#ffffff';
  const previewAvatarConfig = useMemo(
    () => authorProfile.avatarConfig ?? getAvatarConfig(authorProfile.avatarKey),
    [authorProfile.avatarConfig, authorProfile.avatarKey]
  );

  const handleClose = () => {
    setTitle('');
    updateMessageValue('');
    setLocationModalVisible(false);
    setAdvancedEnabled(false);
    setHighlightDescription(false);
    setMessageSelection({ start: 0, end: 0 });

    // Reset poll data
    setPollData(null);
    setPollModalVisible(false);

    // [AI-SUMMARY]
    setIsSummarizing(false);
    setSummaryError('');
    setSummaryText('');
    setSummaryVisible(false);

    if (summarizationControllerRef.current) {
      summarizationControllerRef.current.abort?.();
      summarizationControllerRef.current = null;
    }
    onClose?.();
  };

  const focusDescriptionInput = () => {
    messageInputRef.current?.focus?.();
  };

  const handleMessageChange = (value) => {
    updateMessageValue(value);
  };

  const clearSummaryState = (clearCache = true) => {
    setSummaryVisible(false);
    setSummaryText('');
    setSummaryMeta(null);
    if (clearCache) {
      summaryCacheRef.current = { ...SUMMARY_CACHE_DEFAULT };
    }
  };

  const updateSelection = (nextSelection) => {
    if (typeof nextSelection?.start === 'number' && typeof nextSelection?.end === 'number') {
      setMessageSelection((prev) => (prev.start === nextSelection.start && prev.end === nextSelection.end ? prev : nextSelection));
    }
  };

  const updateMessageValue = (nextValue) => {
    setSummaryError('');
    clearSummaryState();
    if (typeof nextValue === 'function') setMessage((prev) => nextValue(prev));
    else setMessage(nextValue);
  };

  // ----- simple formatting toolbar -----
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
      updateMessageValue(nextMessage);
      updateSelection({ start: caret, end: caret });
      return;
    }

    const nextMessage = `${before}${wrap}${selected}${wrap}${after}`;
    updateMessageValue(nextMessage);
    updateSelection({ start: safeStart + wrap.length, end: safeEnd + wrap.length });
  };

  const applyBoldFormatting = () => wrapSelection('**');

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
    updateMessageValue(nextMessage);
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
    if (!EMAIL_ADDRESS_REGEX.test(trimmed)) address = EMAIL_PLACEHOLDER;

    const inserted = `[${label}](${MAILTO_PREFIX_STRING}${address})`;
    const nextMessage = `${before}${leadingWhitespace}${inserted}${trailingWhitespace}${after}`;
    updateMessageValue(nextMessage);

    const insertedStart = safeStart + leadingWhitespace.length;
    const labelStart = insertedStart + 1;
    const labelEnd = labelStart + label.length;
    const addressStart = labelEnd + 2 + MAILTO_PREFIX_LENGTH;
    const addressEnd = addressStart + address.length;

    if (!trimmed) updateSelection({ start: labelStart, end: labelEnd });
    else if (!EMAIL_ADDRESS_REGEX.test(trimmed)) updateSelection({ start: addressStart, end: addressEnd });
    else updateSelection({ start: addressEnd, end: addressEnd });
  };

  const handleToggleAdvanced = (value) => {
    setAdvancedEnabled(value);
    if (!value) setHighlightDescription(false);
  };

  // [PUBLIC-MODE] Toggle posting mode
  const handleTogglePostingMode = async (mode) => {
    setPostingMode(mode);
    // Save user's current mode preference
    try {
      await updateUserProfile({ currentMode: mode });
    } catch (error) {
      console.warn('[CreatePostModal] Failed to save mode preference:', error);
    }
  };

  const sanitizeDescriptionForSummary = (value) =>
    String(value ?? '')
      .replace(/\r\n/g, '\n')
      .replace(/\uFFFD/g, '')
      .replace(/[“”]/g, '"')
      .replace(/[‘’]/g, "'")
      .replace(/\t+/g, ' ')
      .replace(/ {2,}/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

  const scrollSummaryIntoView = () => {
    // Wait for layout to complete before scrolling
    requestAnimationFrame(() => {
      setTimeout(() => {
        if (scrollRef.current?.scrollTo && summaryCardY > 0) {
          // Scroll to position the summary card near the top with some padding
          scrollRef.current.scrollTo({ y: Math.max(summaryCardY - 80, 0), animated: true });
        }
      }, 200); // Increased delay to ensure layout is complete
    });
  };

  // Auto-scroll when summary becomes visible
  useEffect(() => {
    if (summaryVisible && summaryCardY > 0) {
      scrollSummaryIntoView();
    }
  }, [summaryVisible, summaryCardY]);

  // --------- Summarize + Expand ----------
  const runSummarize = async (lengthPref, quality) => {
    if (isSummarizing) return;
    const sanitized = sanitizeDescriptionForSummary(message);
    if (!sanitized) {
      setSummaryError('Add a description before requesting a summary.');
      return;
    }

    const cached = summaryCacheRef.current;
    if (
      cached.text === sanitized &&
      cached.length === lengthPref &&
      cached.quality === quality &&
      cached.summary
    ) {
      setSummaryError('');
      setSummaryText(cached.summary);
      setSummaryMeta(cached.meta);
      setSummaryVisible(true);
      scrollSummaryIntoView();
      return;
    }

    if (summarizationControllerRef.current) {
      summarizationControllerRef.current.abort?.();
      summarizationControllerRef.current = null;
    }

    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    summarizationControllerRef.current = controller;

    setSummaryError('');
    setIsSummarizing(true);

    try {
      // OpenAI uses quality levels: 'fast', 'balanced', 'best'
      const qualityLevel = quality || 'best';

      const result = await smartSummarize(sanitized, {
        quality: qualityLevel,
        timeout: 15000
      });

      const nextSummary = (result.summary ?? '').trim();
      const nextMeta = {
        model: result.model || result.method || 'openai',
        fallback: result.method !== 'openai',
        quality: result.quality || qualityLevel
      };

      setSummaryText(nextSummary);
      setSummaryVisible(true);
      setSummaryMeta(nextMeta);
      summaryCacheRef.current = {
        text: sanitized,
        length: lengthPref,
        quality: nextMeta.quality,
        summary: nextSummary,
        meta: nextMeta
      };

      scrollSummaryIntoView();
    } catch (error) {
      if (error?.name === 'AbortError') return;
      console.warn('[CreatePostModal] Summarization failed', error);
      setSummaryError(error instanceof Error ? error.message : 'Unable to generate a summary right now.');
    } finally {
      if (summarizationControllerRef.current === controller) {
        summarizationControllerRef.current = null;
      }
      setIsSummarizing(false);
    }
  };

  const handleSummarizeDescription = () => runSummarize(summaryLength, summaryQuality);

  const expandOnce = () => {
    const idx = LENGTH_STEPS.indexOf(summaryLength);
    if (idx >= 0 && idx < LENGTH_STEPS.length - 1) {
      const next = LENGTH_STEPS[idx + 1];
      setSummaryLength(next);
      runSummarize(next, summaryQuality);
    }
  };

  const useSummaryAsDescription = () => {
    if (!summaryText) return;
    updateMessageValue(summaryText);
    const caret = summaryText.length;
    focusDescriptionInput();
    setMessageSelection({ start: caret, end: caret });
  };

  const copySummary = async () => {
    if (!summaryText) return;
    try { await Clipboard.setStringAsync(summaryText); } catch { }
  };

  // [AI-TITLE] Title generation
  const handleGenerateTitle = async () => {
    if (!message || message.length < 20) {
      setTitleError('Write some content first (at least 20 characters)');
      return;
    }

    setIsGeneratingTitle(true);
    setTitleError('');

    try {
      const result = await generateTitle(message, TITLE_STYLES.CATCHY);
      setTitle(result.title);
    } catch (error) {
      console.warn('[CreatePostModal] Title generation failed', error);

      // Fallback to simple title extraction
      try {
        const fallbackTitle = generateFallbackTitle(message);
        setTitle(fallbackTitle);
        console.log('[CreatePostModal] Using fallback title:', fallbackTitle);
      } catch (fallbackError) {
        console.error('[CreatePostModal] Fallback title generation failed', fallbackError);
        setTitleError('Unable to generate title. Please write one manually.');
      }
    } finally {
      setIsGeneratingTitle(false);
    }
  };

  const handlePollCreate = (poll) => {
    setPollData(poll);
    setPollModalVisible(false);
  };

  const handleSubmit = async () => {
    if (submitDisabled) return;

    // [AI-DUPLICATE] Check for duplicates if feature enabled
    const isPremium = userProfile?.isPremium || false;
    const aiPreferences = userProfile?.aiPreferences || {};

    if (isFeatureEnabled('duplicateDetection', isPremium, aiPreferences)) {
      try {
        // Note: In a real implementation, we'd get recent posts from the same city
        // For now, we'll skip this check as it requires access to the posts context
        // which isn't available in this modal. This should be handled in ScreenLayout
        // during the submit process instead.
        console.log('[CreatePostModal] Duplicate detection enabled (will check in ScreenLayout)');
      } catch (error) {
        console.warn('[CreatePostModal] Duplicate check failed:', error);
        // Continue anyway
      }
    }

    setIsSubmitting(true);

    const trimmedMessage = message.trim();
    let result = true;
    try {
      result = await submitHandler({
        location: selectedLocation,
        colorKey: selectedColor,
        title: trimmedTitle,
        message: trimmedMessage,
        description: trimmedMessage,
        highlightDescription,
        postingMode, // [PUBLIC-MODE] Include posting mode
        isPublic: postingMode === 'public', // Helper flag
        poll: pollData // Include poll data
      });
    } catch (error) {
      console.warn('[CreatePostModal] submit failed', error);
      result = false;
      showAlert('Unable to publish', error?.message ?? 'Please try again in a moment.', 'error');
    }

    setIsSubmitting(false);

    if (result === false) {
      return;
    }

    // Clear form for next use (only in create mode)
    if (mode === 'create') {
      setTitle('');
      updateMessageValue('');
      setMessageSelection({ start: 0, end: 0 });
      setSummaryVisible(false);
      setSummaryText('');
      setPollData(null);
    }
    setLocationModalVisible(false);

    // Parent component (ScreenLayout) will close the modal via onClose and handle navigation
  };

  // ---------- UI ----------
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title}>{computedTitle}</Text>
            <TouchableOpacity onPress={handleClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={22} color={themeColors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView
            ref={scrollRef} // [AI-SUMMARY]
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* [PUBLIC-MODE] Mode toggle */}
            {userProfile?.isPublicProfile ? (
              <>
                <Text style={styles.sectionLabel}>Posting as</Text>
                <View style={styles.modeToggleContainer}>
                  <TouchableOpacity
                    style={[
                      styles.modeToggleButton,
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
                <Text style={styles.helperText}>
                  {postingMode === 'anonymous'
                    ? 'Post anonymously in this city. Others won\'t see your profile.'
                    : 'Post from your public profile. Followers will see this in their feed.'}
                </Text>
              </>
            ) : null}

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
              style={[styles.locationButton, !canChangeLocation && styles.locationButtonDisabled]}
              activeOpacity={canChangeLocation ? 0.85 : 1}
              onPress={() => { if (canChangeLocation) setLocationModalVisible(true); }}
            >
              <Ionicons name="location-outline" size={18} color={themeColors.primaryDark} style={{ marginRight: 8 }} />
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

            {advancedEnabled ? (
              <View style={styles.formatToolbar}>
                <TouchableOpacity
                  style={[
                    styles.formatButton,
                    highlightDescription && [styles.formatButtonActive, { backgroundColor: previewHighlightFill }]
                  ]}
                  onPress={() => setHighlightDescription((prev) => !prev)}
                  activeOpacity={0.75}
                  accessibilityRole="button"
                  accessibilityLabel={highlightDescription ? 'Disable highlighted description' : 'Highlight description text'}
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
                    <Ionicons name={previewAvatarConfig.icon.name} size={18} color={previewAvatarConfig.icon.color ?? '#fff'} />
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
                  <Text style={[styles.previewMeta, { color: previewMuted }]} numberOfLines={1} ellipsizeMode="tail">
                    {selectedLocation?.city
                      ? `${selectedLocation.city}${selectedLocation.province ? `, ${selectedLocation.province}` : ''}${selectedLocation.country ? `, ${selectedLocation.country}` : ''}`
                      : 'Choose a location to preview'}
                  </Text>
                </View>
              </View>

              <View style={{ marginBottom: 10 }}>
                <TextInput
                  style={[styles.previewTitleInput, { color: previewPrimary, marginBottom: 0 }]}
                  placeholder="Post title"
                  placeholderTextColor={previewMuted}
                  value={title}
                  onChangeText={setTitle}
                  autoCapitalize="sentences"
                  returnKeyType="next"
                  multiline={true}
                  numberOfLines={2}
                  maxLength={100}
                />
                {isFeatureEnabled('titleGeneration', userProfile?.isPremium || false, userProfile?.aiPreferences || {}) && message.length >= 20 && (
                  <TouchableOpacity
                    style={[styles.generateTitleButton, { backgroundColor: summaryButtonBackground }]}
                    onPress={handleGenerateTitle}
                    disabled={isGeneratingTitle}
                    activeOpacity={0.85}
                  >
                    {isGeneratingTitle ? (
                      <ActivityIndicator size="small" color={summaryAccentColor} />
                    ) : (
                      <Ionicons name="sparkles" size={14} color={summaryAccentColor} />
                    )}
                    <Text style={[styles.generateTitleText, { color: summaryAccentColor }]}>
                      {isGeneratingTitle ? 'Generating...' : 'Generate Title'}
                    </Text>
                  </TouchableOpacity>
                )}
                {titleError ? <Text style={styles.titleErrorText}>{titleError}</Text> : null}
              </View>
              <MentionTextInput
                ref={messageInputRef}
                style={[
                  styles.previewBodyInput,
                  highlightDescription && [styles.previewBodyInputHighlighted, { backgroundColor: previewHighlightFill }]
                ]}
                placeholder="Description (optional) - @username to mention"
                placeholderColor={previewMuted}
                textColor={previewPrimary}
                accentColor={selectedPreset.linkColor ?? themeColors.primaryDark}
                backgroundColor={highlightDescription ? previewHighlightFill : previewBackground}
                multiline
                value={message}
                onChangeText={handleMessageChange}
                autoCapitalize="sentences"
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
                  {pollPreviewMeta ? (
                    <Text style={[styles.pollPreviewMeta, { color: previewMuted }]}>
                      {pollPreviewMeta}
                    </Text>
                  ) : null}
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

            <TouchableOpacity
              onPress={() => setPollModalVisible(true)}
              style={[
                styles.pollButton,
                { backgroundColor: pollData ? `${summaryAccentColor}20` : themeColors.surface },
                { borderColor: pollData ? summaryAccentColor : themeColors.divider }
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

            {premiumSummariesEnabled ? (
              <>
                {/* [AI-SUMMARY] Controls row: Length + Quality */}
                <View style={styles.summaryControlsRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={[styles.sectionLabel, { marginBottom: 0, marginRight: 10 }]}>Length</Text>
                    <View style={styles.segmentRow}>
                      {LENGTH_STEPS.map((k) => (
                        <TouchableOpacity
                          key={k}
                          onPress={() => setSummaryLength(k)}
                          style={[
                            styles.segmentItem,
                            summaryLength === k && [styles.segmentItemActive, { borderColor: summaryAccentColor }]
                          ]}
                        >
                          <Text
                            style={[
                              styles.segmentText,
                              { color: summaryLength === k ? summaryAccentColor : themeColors.textSecondary }
                            ]}
                          >
                            {toLengthLabel(k)}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
                    <Text style={[styles.sectionLabel, { marginBottom: 0, marginRight: 10 }]}>Quality</Text>
                    <View style={styles.segmentRow}>
                      {['fast', 'best'].map((q) => (
                        <TouchableOpacity
                          key={q}
                          onPress={() => setSummaryQuality(q)}
                          style={[
                            styles.segmentItemSmall,
                            summaryQuality === q && [styles.segmentItemActive, { borderColor: summaryAccentColor }]
                          ]}
                        >
                          <Text
                            style={[
                              styles.segmentText,
                              { color: summaryQuality === q ? summaryAccentColor : themeColors.textSecondary }
                            ]}
                          >
                            {q === 'fast' ? 'Fast' : 'Best'}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                </View>

                {/* Summarize button */}
                <View style={styles.summarizeBlock}>
                  <TouchableOpacity
                    style={[
                      styles.summarizeButton,
                      { backgroundColor: summaryButtonBackground },
                      (isSummarizing || !trimmedMessage) && styles.summarizeButtonDisabled
                    ]}
                    onPress={handleSummarizeDescription}
                    disabled={isSummarizing || !trimmedMessage}
                    activeOpacity={0.85}
                    accessibilityRole="button"
                    accessibilityLabel="Summarize description"
                  >
                    {isSummarizing ? (
                      <ActivityIndicator size="small" color={summaryAccentColor} />
                    ) : (
                      <Ionicons name="sparkles-outline" size={18} color={summaryAccentColor} />
                    )}
                    <View style={styles.summarizeTextBlock}>
                      <Text style={[styles.summarizeTitle, { color: summaryAccentColor }]}>Summarize description</Text>
                      <Text style={styles.summarizeSubtitle}>
                        Premium · {summaryQuality === 'best' ? 'Best quality' : 'Fast mode'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                  {summaryError ? <Text style={styles.summarizeErrorText}>{summaryError}</Text> : null}
                </View>

                {/* Summary preview card */}
                {summaryVisible ? (
                  <View
                    onLayout={(e) => setSummaryCardY(e.nativeEvent.layout.y)}
                    style={styles.aiSummaryCard}
                  >
                    <Text style={styles.aiSummaryTitle}>AI Summary</Text>
                    {summaryMeta ? (
                      <View style={styles.aiSummaryMetaRow}>
                        <Text
                          style={[
                            styles.aiSummaryBadge,
                            summaryMeta.fallback ? styles.aiSummaryBadgeFallback : styles.aiSummaryBadgePrimary
                          ]}
                        >
                          {summaryMeta.fallback ? 'Extractive fallback' : 'Transformer'}
                        </Text>
                        {summaryMeta.model ? (
                          <Text style={styles.aiSummaryMetaText}>
                            {summaryMeta.model.replace(/^Xenova\//, '')}
                          </Text>
                        ) : null}
                        {summaryMeta.quality ? (
                          <Text style={styles.aiSummaryMetaText}>
                            {summaryMeta.quality === 'best' ? 'Best quality' : 'Fast mode'}
                          </Text>
                        ) : null}
                      </View>
                    ) : null}
                    {summaryMeta?.fallback ? (
                      <Text style={styles.aiSummaryHelper}>
                        Neural summarizer unavailable; showing extractive fallback.
                      </Text>
                    ) : null}
                    <Text style={styles.aiSummaryText}>{summaryText}</Text>

                    <View style={styles.aiSummaryButtonsRow}>
                      <TouchableOpacity style={[styles.aiButton, { backgroundColor: summaryAccentColor }]} onPress={useSummaryAsDescription}>
                        <Text style={[styles.aiButtonText, { color: '#fff' }]}>Use as description</Text>
                      </TouchableOpacity>

                      <TouchableOpacity style={styles.aiButtonGhost} onPress={copySummary}>
                        <Text style={[styles.aiButtonText, { color: themeColors.textPrimary }]}>Copy</Text>
                      </TouchableOpacity>

                      <TouchableOpacity style={styles.aiButtonGhost} onPress={() => setSummaryVisible(false)}>
                        <Text style={[styles.aiButtonText, { color: themeColors.textPrimary }]}>Dismiss</Text>
                      </TouchableOpacity>
                    </View>

                    {/* Expand to next length */}
                    {summaryLength !== 'detailed' ? (
                      <TouchableOpacity
                        style={styles.expandButton}
                        onPress={expandOnce}
                        disabled={isSummarizing}
                        activeOpacity={0.85}
                      >
                        <Text style={[styles.expandButtonText, { color: summaryAccentColor }]}>
                          Expand to {toLengthLabel(LENGTH_STEPS[LENGTH_STEPS.indexOf(summaryLength) + 1])}
                        </Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                ) : null}
              </>
            ) : null}
          </ScrollView>

          <TouchableOpacity
            style={[
              styles.submitButton,
              { backgroundColor: selectedPreset.buttonBackground ?? themeColors.primaryDark, opacity: (submitDisabled || isSubmitting) ? 0.6 : 1 }
            ]}
            onPress={handleSubmit}
            activeOpacity={0.85}
            disabled={submitDisabled || isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color={selectedPreset.buttonForeground ?? '#fff'} />
            ) : (
              <Text style={[styles.submitButtonText, { color: selectedPreset.buttonForeground ?? '#fff' }]}>
                {computedSubmitLabel}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

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
            <View style={[styles.card, { maxHeight: '85%' }]}>
              <View style={styles.header}>
                <Text style={styles.title}>Create Poll</Text>
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

    </Modal>
  );
}

const createStyles = (palette, { isDarkMode } = {}) =>
  StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
    card: {
      backgroundColor: palette.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '85%',
      shadowColor: '#000', shadowOpacity: isDarkMode ? 0.35 : 0.12, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 10
    },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    title: { fontSize: 18, fontWeight: '700', color: palette.textPrimary },
    sectionLabel: { fontSize: 13, fontWeight: '600', color: palette.textPrimary, marginBottom: 8 },
    sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
    locationButton: {
      flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: palette.divider, borderRadius: 12,
      paddingVertical: 12, paddingHorizontal: 14, backgroundColor: isDarkMode ? palette.background : '#ffffff'
    },
    locationButtonDisabled: { opacity: 0.6 },
    locationButtonText: { fontSize: 14, color: palette.textPrimary, flexShrink: 1 },
    helperText: { marginTop: 6, fontSize: 12, color: palette.textSecondary },
    previewCard: {
      borderRadius: 18, padding: 18, marginTop: 4,
      shadowColor: '#000', shadowOpacity: isDarkMode ? 0.35 : 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 4 }, elevation: 3
    },
    previewHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    previewAvatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
    previewAvatarEmoji: { fontSize: 18 },
    previewTitle: { fontSize: 16, fontWeight: '700' },
    previewMeta: { fontSize: 12, marginTop: 4 },
    previewTitleInput: { fontSize: 18, fontWeight: '700', marginBottom: 10, lineHeight: 26, maxHeight: 54 },
    previewBodyInput: { minHeight: 80, fontSize: 16, fontWeight: '500', textAlignVertical: 'top' },
    previewBodyInputHighlighted: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 8 },

    summarizeBlock: { marginTop: 16 },
    summarizeButton: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, paddingVertical: 12, paddingHorizontal: 14, alignSelf: 'flex-start' },
    summarizeButtonDisabled: { opacity: 0.6 },
    summarizeTextBlock: { marginLeft: 12, maxWidth: 220 },
    summarizeTitle: { fontSize: 14, fontWeight: '700' },
    summarizeSubtitle: { fontSize: 12, color: palette.textSecondary, marginTop: 2 },
    summarizeErrorText: { marginTop: 8, fontSize: 12, color: '#D64545' },

    swatchScrollView: {
      marginVertical: 4,
    },
    swatchRow: {
      flexDirection: 'row',
      paddingVertical: 8,
      paddingRight: 12,
    },
    swatch: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
      borderWidth: 2,
      borderColor: 'transparent'
    },
    swatchActive: {
      borderColor: '#fff',
      shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 3
    },

    submitButton: { marginTop: 16, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
    submitButtonText: { fontSize: 16, fontWeight: '600' },

    formatToolbar: { flexDirection: 'row', alignItems: 'center', marginTop: 8, marginBottom: 12 },
    formatButton: {
      width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
      borderWidth: 1, borderColor: palette.divider, backgroundColor: palette.background, marginRight: 10
    },
    formatButtonActive: { borderColor: 'transparent' },

    // [AI-SUMMARY] New controls & card
    summaryControlsRow: { marginTop: 16 },
    segmentRow: { flexDirection: 'row', alignItems: 'center' },
    segmentItem: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 10, borderWidth: 1, borderColor: palette.divider, marginRight: 8 },
    segmentItemSmall: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 10, borderWidth: 1, borderColor: palette.divider, marginRight: 8 },
    segmentItemActive: { backgroundColor: 'transparent' },
    segmentText: { fontSize: 12, fontWeight: '600' },

    aiSummaryCard: {
      marginTop: 12,
      padding: 16,
      borderRadius: 14,
      backgroundColor: isDarkMode ? palette.background : '#fff',
      borderWidth: 1,
      borderColor: palette.divider
    },
    aiSummaryTitle: { fontSize: 16, fontWeight: '700', color: palette.textPrimary, marginBottom: 8 },
    aiSummaryMetaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', marginBottom: 8 },
    aiSummaryBadge: {
      fontSize: 12,
      fontWeight: '700',
      paddingVertical: 4,
      paddingHorizontal: 8,
      borderRadius: 8,
      marginRight: 8,
      marginBottom: 6,
      color: '#fff'
    },
    aiSummaryBadgePrimary: { backgroundColor: palette.primaryDark ?? '#6C4DF4' },
    aiSummaryBadgeFallback: { backgroundColor: '#D64545' },
    aiSummaryMetaText: { fontSize: 12, color: palette.textSecondary, marginRight: 12, marginBottom: 6 },
    aiSummaryHelper: { fontSize: 12, color: palette.textSecondary, marginBottom: 8 },
    aiSummaryText: { fontSize: 14, color: palette.textPrimary, lineHeight: 20 },
    aiSummaryButtonsRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
    aiButton: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 12, marginRight: 10 },
    aiButtonGhost: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 12, backgroundColor: palette.card, borderWidth: 1, borderColor: palette.divider, marginRight: 10 },
    aiButtonText: { fontSize: 14, fontWeight: '700' },
    expandButton: { marginTop: 6, alignSelf: 'flex-start' },
    expandButtonText: { fontSize: 13, fontWeight: '700' },

    // [AI-TITLE] Title generation button
    generateTitleButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 10,
      marginTop: 8,
      alignSelf: 'flex-start',
    },
    generateTitleText: {
      fontSize: 13,
      fontWeight: '600',
      marginLeft: 6,
    },
    titleErrorText: {
      marginTop: 4,
      fontSize: 12,
      color: '#D64545',
    },

    // [PUBLIC-MODE] Mode toggle styles
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
      borderColor: palette.divider,
      backgroundColor: palette.background,
      gap: 8,
    },
    modeToggleButtonActive: {
      borderColor: 'transparent',
      shadowColor: '#000',
      shadowOpacity: isDarkMode ? 0.2 : 0.12,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 2 },
      elevation: 3,
    },
    modeToggleText: {
      fontSize: 14,
      fontWeight: '600',
    },

    // Poll styles
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
      marginTop: 4,
    },
    pollPreviewMeta: {
      fontSize: 12,
      marginTop: 2,
    },
    removePollButton: {
      position: 'absolute',
      top: 8,
      right: 8,
    },
  });
