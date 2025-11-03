import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function PollComposer({ onPollCreate, themeColors, accentColor, initialPoll = null }) {
  const [question, setQuestion] = useState(initialPoll?.question || '');
  const [options, setOptions] = useState(
    initialPoll?.options?.map(opt => typeof opt === 'string' ? opt : opt.text) || ['', '']
  );
  const [durationHours, setDurationHours] = useState(() => {
    if (initialPoll?.endsAt) {
      const remaining = initialPoll.endsAt - Date.now();
      const hours = Math.max(1, Math.round(remaining / (60 * 60 * 1000)));
      return hours <= 72 ? hours : 24;
    }
    return 24;
  });

  // Update form when initialPoll changes
  useEffect(() => {
    if (initialPoll) {
      setQuestion(initialPoll.question || '');
      setOptions(initialPoll.options?.map(opt => typeof opt === 'string' ? opt : opt.text) || ['', '']);
      if (initialPoll.endsAt) {
        const remaining = initialPoll.endsAt - Date.now();
        const hours = Math.max(1, Math.round(remaining / (60 * 60 * 1000)));
        setDurationHours(hours <= 72 ? hours : 24);
      }
    } else {
      setQuestion('');
      setOptions(['', '']);
      setDurationHours(24);
    }
  }, [initialPoll]);

  const addOption = () => {
    if (options.length >= 6) {
      Alert.alert('Maximum options', 'You can add up to 6 poll options');
      return;
    }
    setOptions([...options, '']);
  };

  const removeOption = (index) => {
    if (options.length <= 2) {
      Alert.alert('Minimum options', 'A poll must have at least 2 options');
      return;
    }
    const newOptions = options.filter((_, i) => i !== index);
    setOptions(newOptions);
  };

  const updateOption = (index, value) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const createPoll = () => {
    const trimmedQuestion = question.trim();
    const trimmedOptions = options.map(o => o.trim()).filter(o => o);

    if (!trimmedQuestion) {
      Alert.alert('Question required', 'Please enter a poll question');
      return;
    }

    if (trimmedOptions.length < 2) {
      Alert.alert('Options required', 'Please enter at least 2 poll options');
      return;
    }

    const pollData = {
      question: trimmedQuestion,
      options: trimmedOptions.map(text => ({
        text,
        votes: 0,
        voters: []
      })),
      totalVotes: 0,
      endsAt: Date.now() + (durationHours * 60 * 60 * 1000),
      createdAt: Date.now()
    };

    onPollCreate(pollData);

    // Reset form
    setQuestion('');
    setOptions(['', '']);
    setDurationHours(24);
  };

  const styles = createStyles(themeColors, accentColor);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="stats-chart" size={20} color={accentColor} />
        <Text style={styles.headerText}>Create Poll</Text>
      </View>

      <TextInput
        style={styles.questionInput}
        placeholder="Ask a question..."
        placeholderTextColor={themeColors.textSecondary}
        value={question}
        onChangeText={setQuestion}
        maxLength={200}
      />

      <View style={styles.optionsContainer}>
        {options.map((option, index) => (
          <View key={index} style={styles.optionRow}>
            <TextInput
              style={styles.optionInput}
              placeholder={`Option ${index + 1}`}
              placeholderTextColor={themeColors.textSecondary}
              value={option}
              onChangeText={(text) => updateOption(index, text)}
              maxLength={100}
            />
            {options.length > 2 && (
              <TouchableOpacity
                onPress={() => removeOption(index)}
                style={styles.removeButton}
              >
                <Ionicons name="close-circle" size={24} color={themeColors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
        ))}

        {options.length < 6 && (
          <TouchableOpacity onPress={addOption} style={styles.addOptionButton}>
            <Ionicons name="add-circle-outline" size={20} color={accentColor} />
            <Text style={[styles.addOptionText, { color: accentColor }]}>
              Add option
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.durationContainer}>
        <Text style={styles.durationLabel}>Poll duration:</Text>
        <View style={styles.durationButtons}>
          {[1, 6, 12, 24, 72].map(hours => (
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

      <TouchableOpacity
        onPress={createPoll}
        style={[styles.createButton, { backgroundColor: accentColor }]}
      >
        <Text style={styles.createButtonText}>Create Poll</Text>
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
    durationContainer: {
      marginBottom: 16,
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
