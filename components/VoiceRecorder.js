import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import { useAlert } from '../contexts/AlertContext';

const MAX_DURATION_MS = 30000; // 30 seconds

export default function VoiceRecorder({ onRecordingComplete, onCancel, themeColors, accentColor }) {
  const { showAlert } = useAlert();
  const [recording, setRecording] = useState(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef(null);
  const recordingStartTime = useRef(null);

  useEffect(() => {
    // Request permissions when component mounts
    (async () => {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        showAlert('Permission required', 'Microphone permission is required to record voice notes', [], { type: 'warning' });
        onCancel?.();
      }
    })();

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [onCancel, showAlert]);

  const startRecording = async () => {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      setRecording(newRecording);
      setIsRecording(true);
      recordingStartTime.current = Date.now();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      // Start timer
      timerRef.current = setInterval(() => {
        const elapsed = Date.now() - recordingStartTime.current;
        setRecordingDuration(elapsed);

        // Auto-stop at 30 seconds
        if (elapsed >= MAX_DURATION_MS) {
          stopRecording(newRecording);
        }
      }, 100);

    } catch (err) {
      console.error('[VoiceRecorder] Failed to start recording:', err);
      showAlert('Error', 'Failed to start recording', [], { type: 'error' });
    }
  };

  const stopRecording = async (recordingInstance = recording) => {
    if (!recordingInstance) return;

    try {
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }

      await recordingInstance.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      });

      const uri = recordingInstance.getURI();
      const duration = recordingDuration;

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      if (duration < 500) {
        showAlert('Recording too short', 'Please record at least 1 second', [], { type: 'warning' });
        onCancel?.();
        return;
      }

      onRecordingComplete?.({ uri, duration });

    } catch (err) {
      console.error('[VoiceRecorder] Failed to stop recording:', err);
      showAlert('Error', 'Failed to save recording', [], { type: 'error' });
    }
  };

  const cancelRecording = async () => {
    if (recording) {
      try {
        setIsRecording(false);
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
        await recording.stopAndUnloadAsync();
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
        });
      } catch (err) {
        console.error('[VoiceRecorder] Failed to cancel recording:', err);
      }
    }
    onCancel?.();
  };

  const formatDuration = (ms) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const progress = (recordingDuration / MAX_DURATION_MS) * 100;

  const styles = createStyles(themeColors, accentColor);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="mic" size={24} color={accentColor} />
        <Text style={styles.title}>Voice Note</Text>
        <TouchableOpacity onPress={cancelRecording}>
          <Ionicons name="close" size={24} color={themeColors.textSecondary} />
        </TouchableOpacity>
      </View>

      <View style={styles.visualizer}>
        <View style={styles.progressBarBackground}>
          <View style={[styles.progressBar, { width: `${progress}%`, backgroundColor: accentColor }]} />
        </View>
        <Text style={styles.duration}>
          {formatDuration(recordingDuration)} / {formatDuration(MAX_DURATION_MS)}
        </Text>
      </View>

      <View style={styles.waveform}>
        {[...Array(30)].map((_, i) => (
          <View
            key={i}
            style={[
              styles.waveformBar,
              {
                height: isRecording ? Math.random() * 40 + 10 : 10,
                backgroundColor: i / 30 < progress / 100 ? accentColor : themeColors.border,
              }
            ]}
          />
        ))}
      </View>

      <View style={styles.controls}>
        {!isRecording ? (
          <TouchableOpacity
            onPress={startRecording}
            style={[styles.recordButton, { backgroundColor: accentColor }]}
          >
            <Ionicons name="mic" size={32} color="#fff" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={() => stopRecording()}
            style={[styles.stopButton, { borderColor: accentColor }]}
          >
            <View style={[styles.stopIcon, { backgroundColor: accentColor }]} />
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.hint}>
        {!isRecording ? 'Tap to start recording' : 'Tap to stop and send'}
      </Text>
    </View>
  );
}

function createStyles(themeColors, accentColor) {
  return StyleSheet.create({
    container: {
      padding: 20,
      backgroundColor: themeColors.surface,
      borderRadius: 16,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 20,
    },
    title: {
      fontSize: 18,
      fontWeight: '600',
      color: themeColors.text,
    },
    visualizer: {
      marginBottom: 20,
    },
    progressBarBackground: {
      height: 4,
      backgroundColor: themeColors.border,
      borderRadius: 2,
      overflow: 'hidden',
      marginBottom: 8,
    },
    progressBar: {
      height: '100%',
      borderRadius: 2,
    },
    duration: {
      fontSize: 14,
      color: themeColors.textSecondary,
      textAlign: 'center',
    },
    waveform: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      height: 60,
      marginBottom: 24,
    },
    waveformBar: {
      width: 3,
      borderRadius: 1.5,
    },
    controls: {
      alignItems: 'center',
      marginBottom: 12,
    },
    recordButton: {
      width: 72,
      height: 72,
      borderRadius: 36,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 4,
    },
    stopButton: {
      width: 72,
      height: 72,
      borderRadius: 36,
      borderWidth: 4,
      justifyContent: 'center',
      alignItems: 'center',
    },
    stopIcon: {
      width: 24,
      height: 24,
      borderRadius: 4,
    },
    hint: {
      fontSize: 13,
      color: themeColors.textSecondary,
      textAlign: 'center',
    },
  });
}
