import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';

export default function VoiceNotePlayer({ uri, duration, themeColors, accentColor, isSent = false }) {
  const [sound, setSound] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackPosition, setPlaybackPosition] = useState(0);
  const [playbackDuration, setPlaybackDuration] = useState(duration || 0);

  useEffect(() => {
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [sound]);

  const playSound = async () => {
    try {
      if (sound) {
        const status = await sound.getStatusAsync();
        if (status.isLoaded) {
          if (status.positionMillis >= status.durationMillis) {
            // Restart from beginning
            await sound.setPositionAsync(0);
          }
          // Set status update callback for existing sound
          sound.setOnPlaybackStatusUpdate(onPlaybackStatusUpdate);
          await sound.playAsync();
          setIsPlaying(true);
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
      } else {
        // Load and play
        const { sound: newSound } = await Audio.Sound.createAsync(
          { uri },
          { shouldPlay: true },
          onPlaybackStatusUpdate
        );
        setSound(newSound);
        setIsPlaying(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch (error) {
      console.error('[VoiceNotePlayer] Error playing sound:', error);
    }
  };

  const pauseSound = async () => {
    if (sound) {
      await sound.pauseAsync();
      setIsPlaying(false);
    }
  };

  const onPlaybackStatusUpdate = (status) => {
    if (!status.isLoaded) return;

    // Update playback position and duration in real-time
    setPlaybackPosition(status.positionMillis || 0);
    if (status.durationMillis) {
      setPlaybackDuration(status.durationMillis);
    }

    // Update playing state
    setIsPlaying(status.isPlaying || false);

    if (status.didJustFinish) {
      setIsPlaying(false);
      setPlaybackPosition(0);
    }
  };

  const formatTime = (ms) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const progress = playbackDuration > 0 ? (playbackPosition / playbackDuration) * 100 : 0;

  const styles = createStyles(themeColors, accentColor, isSent);

  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={isPlaying ? pauseSound : playSound}
        style={styles.playButton}
      >
        <Ionicons
          name={isPlaying ? 'pause' : 'play'}
          size={20}
          color={isSent ? '#fff' : accentColor}
        />
      </TouchableOpacity>

      <View style={styles.waveformContainer}>
        <View style={styles.waveform}>
          {[...Array(20)].map((_, i) => {
            const barProgress = (i / 20) * 100;
            const isActive = barProgress <= progress;
            return (
              <View
                key={i}
                style={[
                  styles.waveformBar,
                  {
                    height: 10 + (i % 3) * 8,
                    backgroundColor: isActive
                      ? (isSent ? '#fff' : accentColor)
                      : (isSent ? 'rgba(255,255,255,0.3)' : themeColors.border),
                  }
                ]}
              />
            );
          })}
        </View>
        <Text style={styles.duration}>
          {formatTime(isPlaying ? playbackPosition : playbackDuration)}
        </Text>
      </View>
    </View>
  );
}

function createStyles(themeColors, accentColor, isSent) {
  return StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 8,
      gap: 10,
      minWidth: 200,
    },
    playButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: isSent ? 'rgba(255,255,255,0.2)' : themeColors.surface,
      justifyContent: 'center',
      alignItems: 'center',
    },
    waveformContainer: {
      flex: 1,
    },
    waveform: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      height: 30,
      marginBottom: 4,
    },
    waveformBar: {
      width: 2.5,
      borderRadius: 1.25,
    },
    duration: {
      fontSize: 11,
      color: isSent ? 'rgba(255,255,255,0.8)' : themeColors.textSecondary,
    },
  });
}
