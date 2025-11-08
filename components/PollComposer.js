import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAlert } from '../contexts/AlertContext';

const MIN_OPTIONS = 2;
const MAX_OPTIONS = 6;
const HOUR_IN_MS = 60 * 60 * 1000;
const OPTION_ID_PREFIX = 'poll-option';

const generateOptionId = () => `${OPTION_ID_PREFIX}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const normalizeInitialPoll = (poll) => {
  if (!poll) {
    return null;
  }
  const now = Date.now();
  const options = (poll.options || []).map((option, index) => {
    const voters = Array.isArray(option.voters) ? option.voters : [];
    const votes = typeof option.votes === 'number' ? option.votes : voters.length;
    return {
      ...option,
      id: option.id || `${poll.id || OPTION_ID_PREFIX}-${index}-${Math.random().toString(36).slice(2, 6)}`,
      voters,
      votes,
    };
  });

  const totalVotes = typeof poll.totalVotes === 'number'
    ? poll.totalVotes
    : options.reduce((sum, option) => sum + (option.votes || 0), 0);

  return {
    ...poll,
    createdAt: poll.createdAt || now,
    options,
    totalVotes,
  };
};

const buildInitialOptionInputs = (poll) => {
  if (poll?.options?.length) {
    return poll.options.map((option) => ({
      id: option.id || generateOptionId(),
      text: option.text || '',
    }));
  }
  return [
    { id: generateOptionId(), text: '' },
    { id: generateOptionId(), text: '' },
  ];
};

const describeTimeRemaining = (timestamp) => {
  if (!timestamp) {
    return null;
  }
  const remaining = timestamp - Date.now();
  if (remaining <= 0) {
    return 'already ended';
  }
  const hours = Math.floor(remaining / HOUR_IN_MS);
  if (hours >= 48) {
    const days = Math.floor(hours / 24);
    return `ends in ${days}d`;
  }
  if (hours >= 1) {
    return `ends in ${hours}h`;
  }
  const minutes = Math.max(1, Math.floor(remaining / (60 * 1000)));
  return `ends in ${minutes}m`;
};

export default function PollComposer({ onPollCreate, themeColors, accentColor, initialPoll = null }) {
  const { showAlert } = useAlert();
  const normalizedInitialPoll = useMemo(() => normalizeInitialPoll(initialPoll), [initialPoll]);
  const [question, setQuestion] = useState(normalizedInitialPoll?.question || '');
  const [optionInputs, setOptionInputs] = useState(() => buildInitialOptionInputs(normalizedInitialPoll));
  const [durationHours, setDurationHours] = useState(() => {
    if (normalizedInitialPoll?.endsAt) {
      const remaining = normalizedInitialPoll.endsAt - Date.now();
      const hours = Math.max(1, Math.round(remaining / HOUR_IN_MS));
      return hours <= 72 ? hours : 24;
    }
    return 24;
  });
  const [extendExpiration, setExtendExpiration] = useState(false);

  const initialOptionMap = useMemo(() => {
    const map = new Map();
    normalizedInitialPoll?.options?.forEach((option) => {
      map.set(option.id || option.text, option);
    });
    return map;
  }, [normalizedInitialPoll]);

  // Update form when initialPoll changes
  useEffect(() => {
    if (normalizedInitialPoll) {
      setQuestion(normalizedInitialPoll.question || '');
      setOptionInputs(buildInitialOptionInputs(normalizedInitialPoll));
      if (normalizedInitialPoll.endsAt) {
        const remaining = normalizedInitialPoll.endsAt - Date.now();
        const hours = Math.max(1, Math.round(remaining / HOUR_IN_MS));
        setDurationHours(hours <= 72 ? hours : 24);
      }
      setExtendExpiration(false);
    } else {
      setQuestion('');
      setOptionInputs(buildInitialOptionInputs(null));
      setDurationHours(24);
      setExtendExpiration(false);
    }
  }, [normalizedInitialPoll]);

  const addOption = () => {
    if (optionInputs.length >= MAX_OPTIONS) {
      showAlert('Maximum options', 'You can add up to 6 poll options', 'warning');
      return;
    }
    setOptionInputs([...optionInputs, { id: generateOptionId(), text: '' }]);
  };

  const removeOption = (index) => {
    if (optionInputs.length <= MIN_OPTIONS) {
      showAlert('Minimum options', 'A poll must have at least 2 options', 'warning');
      return;
    }
    const newOptions = optionInputs.filter((_, i) => i !== index);
    setOptionInputs(newOptions);
  };

  const updateOption = (index, value) => {
    const newOptions = [...optionInputs];
    newOptions[index] = { ...newOptions[index], text: value };
    setOptionInputs(newOptions);
  };

  const createPoll = () => {
    const trimmedQuestion = question.trim();
    const trimmedOptions = optionInputs
      .map((option) => ({ ...option, text: option.text.trim() }))
      .filter((option) => option.text);

    if (!trimmedQuestion) {
      showAlert('Question required', 'Please enter a poll question', 'warning');
      return;
    }

    if (trimmedOptions.length < MIN_OPTIONS) {
      showAlert('Options required', 'Please enter at least 2 poll options', 'warning');
      return;
    }

    const now = Date.now();
    const optionsWithVotes = trimmedOptions.map((option) => {
      const preserved = initialOptionMap.get(option.id) || initialOptionMap.get(option.text);
      if (preserved) {
        const voters = Array.isArray(preserved.voters) ? preserved.voters : [];
        const votes = typeof preserved.votes === 'number' ? preserved.votes : voters.length;
        return {
          ...preserved,
          id: preserved.id || option.id || generateOptionId(),
          text: option.text,
          votes,
          voters,
        };
      }
      return {
        id: option.id || generateOptionId(),
        text: option.text,
        votes: 0,
        voters: [],
      };
    });

    const totalVotes = optionsWithVotes.reduce((sum, option) => sum + (option.votes || 0), 0);

    const basePoll = normalizedInitialPoll;
    const endsAt = !basePoll
      ? now + durationHours * HOUR_IN_MS
      : extendExpiration
        ? Math.max(basePoll.endsAt || now, now) + durationHours * HOUR_IN_MS
        : basePoll.endsAt ?? now + durationHours * HOUR_IN_MS;

    const pollData = {
      ...(basePoll ?? {}),
      question: trimmedQuestion,
      options: optionsWithVotes,
      totalVotes,
      endsAt,
      createdAt: basePoll?.createdAt ?? now,
      updatedAt: now,
    };

    onPollCreate(pollData);

    // Reset form
    setQuestion('');
    setOptionInputs(buildInitialOptionInputs(null));
    setDurationHours(24);
    setExtendExpiration(false);
  };

  const styles = createStyles(themeColors, accentColor);
  const isEditingExistingPoll = Boolean(normalizedInitialPoll);
  const timeRemainingLabel = isEditingExistingPoll ? describeTimeRemaining(normalizedInitialPoll?.endsAt) : null;
  const hasAnyVotes = (normalizedInitialPoll?.totalVotes ?? 0) > 0;
  const sortedPreviewOptions = useMemo(() => {
    if (!normalizedInitialPoll?.options?.length) {
      return [];
    }
    const options = [...normalizedInitialPoll.options];
    const total = normalizedInitialPoll.totalVotes || options.reduce((sum, option) => sum + (option.votes || 0), 0);
    return options
      .sort((a, b) => (b.votes || 0) - (a.votes || 0))
      .map((option) => {
        const votes = option.votes || 0;
        const percent = total ? Math.round((votes / total) * 100) : 0;
        return { ...option, votes, percent };
      });
  }, [normalizedInitialPoll]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="stats-chart" size={20} color={accentColor} />
        <Text style={styles.headerText}>{isEditingExistingPoll ? 'Edit Poll' : 'Create Poll'}</Text>
      </View>

      {isEditingExistingPoll ? (
        <View style={[styles.noticeCard, { borderColor: `${accentColor}30`, backgroundColor: `${accentColor}10` }]}>
          <Ionicons name="information-circle-outline" size={18} color={accentColor} style={styles.noticeIcon} />
          <View style={styles.noticeTextContainer}>
            <Text style={[styles.noticeTitle, { color: themeColors.text }]}>Updating existing poll</Text>
            <Text style={[styles.noticeText, { color: themeColors.textSecondary }]}>
              Votes stay attached to options you keep. Remove an option to clear its votes.
            </Text>
          </View>
        </View>
      ) : null}

      <TextInput
        style={styles.questionInput}
        placeholder="Ask a question..."
        placeholderTextColor={themeColors.textSecondary}
        value={question}
        onChangeText={setQuestion}
        maxLength={200}
      />

      <View style={styles.optionsContainer}>
        {optionInputs.map((option, index) => (
          <View key={option.id} style={styles.optionRow}>
            <TextInput
              style={styles.optionInput}
              placeholder={`Option ${index + 1}`}
              placeholderTextColor={themeColors.textSecondary}
              value={option.text}
              onChangeText={(text) => updateOption(index, text)}
              maxLength={100}
            />
            {optionInputs.length > MIN_OPTIONS && (
              <TouchableOpacity
                onPress={() => removeOption(index)}
                style={styles.removeButton}
              >
                <Ionicons name="close-circle" size={24} color={themeColors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
        ))}

        {optionInputs.length < MAX_OPTIONS && (
          <TouchableOpacity onPress={addOption} style={styles.addOptionButton}>
            <Ionicons name="add-circle-outline" size={20} color={accentColor} />
            <Text style={[styles.addOptionText, { color: accentColor }]}>
              Add option
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {isEditingExistingPoll ? (
        <View style={styles.durationSummary}>
          <View style={styles.durationSummaryText}>
            <Text style={[styles.durationLabel, { color: themeColors.textSecondary }]}>
              {timeRemainingLabel ? `This poll ${timeRemainingLabel}.` : 'Live poll'}
            </Text>
            {hasAnyVotes ? (
              <Text style={[styles.durationHint, { color: themeColors.textSecondary }]}>
                {normalizedInitialPoll.totalVotes} vote{normalizedInitialPoll.totalVotes === 1 ? '' : 's'} captured so far
              </Text>
            ) : null}
          </View>
          <TouchableOpacity
            onPress={() => setExtendExpiration((prev) => !prev)}
            style={[
              styles.extendToggle,
              extendExpiration && { backgroundColor: `${accentColor}15`, borderColor: accentColor }
            ]}
          >
            <Ionicons
              name={extendExpiration ? 'checkmark-circle' : 'time-outline'}
              size={18}
              color={extendExpiration ? accentColor : themeColors.textSecondary}
            />
            <Text
              style={[
                styles.extendToggleText,
                { color: extendExpiration ? accentColor : themeColors.textSecondary }
              ]}
            >
              {extendExpiration ? 'Extending poll' : 'Extend poll'}
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {(extendExpiration || !isEditingExistingPoll) && (
        <View style={styles.durationContainer}>
          <Text style={styles.durationLabel}>
            {isEditingExistingPoll ? 'Add more time:' : 'Poll duration:'}
          </Text>
          <View style={styles.durationButtons}>
            {[1, 6, 12, 24, 72].map((hours) => (
              <TouchableOpacity
                key={hours}
                onPress={() => setDurationHours(hours)}
                style={[
                  styles.durationButton,
                  { borderColor: accentColor },
                  durationHours === hours && { backgroundColor: accentColor }
                ]}
              >
                <Text
                  style={[
                    styles.durationButtonText,
                    { color: durationHours === hours ? '#fff' : themeColors.text }
                  ]}
                >
                  {hours}h
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {isEditingExistingPoll ? (
        <View style={[styles.resultsPreview, { borderColor: `${accentColor}20` }]}>
          <View style={styles.resultsHeader}>
            <Text style={[styles.resultsTitle, { color: themeColors.text }]}>Current results</Text>
            <Text style={[styles.resultsTotal, { color: themeColors.textSecondary }]}>
              {hasAnyVotes ? `${normalizedInitialPoll.totalVotes} vote${normalizedInitialPoll.totalVotes === 1 ? '' : 's'}` : 'No votes yet'}
            </Text>
          </View>
          {sortedPreviewOptions.length ? (
            sortedPreviewOptions.slice(0, 4).map((option) => (
              <View key={option.id} style={styles.resultRow}>
                <Text style={[styles.resultOption, { color: themeColors.text }]} numberOfLines={1}>
                  {option.text}
                </Text>
                <View style={styles.resultMeta}>
                  <Text style={[styles.resultVotes, { color: themeColors.textSecondary }]}>
                    {option.votes} vote{option.votes === 1 ? '' : 's'}
                  </Text>
                  <Text style={[styles.resultPercent, { color: accentColor }]}>
                    {option.percent}%
                  </Text>
                </View>
              </View>
            ))
          ) : (
            <Text style={[styles.resultEmpty, { color: themeColors.textSecondary }]}>
              Results will appear once people vote.
            </Text>
          )}
          <Text style={[styles.resultsHint, { color: themeColors.textSecondary }]}>
            Adjusting text keeps existing votes. Removing an option discards its votes.
          </Text>
        </View>
      ) : null}

      <TouchableOpacity
        onPress={createPoll}
        style={[styles.createButton, { backgroundColor: accentColor }]}
      >
        <Text style={styles.createButtonText}>{isEditingExistingPoll ? 'Update Poll' : 'Create Poll'}</Text>
      </TouchableOpacity>
    </View>
  );
}

function createStyles(themeColors, accentColor) {
  return StyleSheet.create({
    container: {
      padding: 16,
      backgroundColor: themeColors.surface,
      borderRadius: 12,
      marginBottom: 16,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
      gap: 8,
    },
    headerText: {
      fontSize: 16,
      fontWeight: '600',
      color: themeColors.text,
    },
    noticeCard: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      padding: 12,
      borderRadius: 10,
      borderWidth: 1,
      marginBottom: 12,
      gap: 10,
    },
    noticeIcon: {
      marginTop: 1,
    },
    noticeTextContainer: {
      flex: 1,
      gap: 2,
    },
    noticeTitle: {
      fontSize: 14,
      fontWeight: '600',
    },
    noticeText: {
      fontSize: 13,
      lineHeight: 18,
    },
    questionInput: {
      backgroundColor: themeColors.background,
      borderRadius: 8,
      padding: 12,
      fontSize: 15,
      color: themeColors.text,
      marginBottom: 12,
    },
    optionsContainer: {
      marginBottom: 12,
    },
    optionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
    },
    optionInput: {
      flex: 1,
      backgroundColor: themeColors.background,
      borderRadius: 8,
      padding: 10,
      fontSize: 14,
      color: themeColors.text,
    },
    removeButton: {
      marginLeft: 8,
    },
    addOptionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 8,
      gap: 6,
    },
    addOptionText: {
      fontSize: 14,
      fontWeight: '500',
    },
    durationSummary: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 6,
      gap: 12,
    },
    durationSummaryText: {
      flex: 1,
    },
    durationHint: {
      fontSize: 12,
      marginTop: 2,
    },
    extendToggle: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      borderRadius: 999,
      borderWidth: 1,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    extendToggleText: {
      fontSize: 13,
      fontWeight: '500',
    },
    durationContainer: {
      marginBottom: 16,
      marginTop: 12,
    },
    durationLabel: {
      fontSize: 14,
      color: themeColors.textSecondary,
      marginBottom: 8,
    },
    durationButtons: {
      flexDirection: 'row',
      gap: 8,
    },
    durationButton: {
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: 16,
      borderWidth: 1,
    },
    durationButtonText: {
      fontSize: 13,
      fontWeight: '500',
    },
    resultsPreview: {
      borderWidth: 1,
      borderRadius: 10,
      padding: 12,
      marginBottom: 16,
      marginTop: 4,
      gap: 8,
    },
    resultsHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    resultsTitle: {
      fontSize: 14,
      fontWeight: '600',
    },
    resultsTotal: {
      fontSize: 13,
    },
    resultRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 4,
      gap: 12,
    },
    resultOption: {
      flex: 1,
      fontSize: 14,
      fontWeight: '500',
    },
    resultMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    resultVotes: {
      fontSize: 12,
    },
    resultPercent: {
      fontSize: 14,
      fontWeight: '600',
    },
    resultEmpty: {
      fontSize: 13,
      textAlign: 'center',
      paddingVertical: 12,
    },
    resultsHint: {
      fontSize: 12,
    },
    createButton: {
      padding: 12,
      borderRadius: 8,
      alignItems: 'center',
    },
    createButtonText: {
      color: '#fff',
      fontSize: 15,
      fontWeight: '600',
    },
  });
}
