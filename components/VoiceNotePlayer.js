import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, PanResponder } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';

export default function VoiceNotePlayer({ uri, duration, themeColors, accentColor, isSent = false }) {
  const [sound, setSound] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackPosition, setPlaybackPosition] = useState(0);
  const [playbackDuration, setPlaybackDuration] = useState(duration || 0);
  const [isSeeking, setIsSeeking] = useState(false);
  const [seekPosition, setSeekPosition] = useState(0);
  const waveformRef = useRef(null);
  const waveformWidth = useRef(0);
  const seekTimeout = useRef(null);
  const wasPlayingBeforeSeek = useRef(false);

  useEffect(() => {
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
      if (seekTimeout.current) {
        clearTimeout(seekTimeout.current);
      }
    };
  }, [sound]);

  const performSeek = async (position) => {
    if (!sound || playbackDuration === 0) {
      console.log('[VoiceNotePlayer] Cannot seek - no sound or duration:', { hasSound: !!sound, playbackDuration });
      return sound;
    }

    try {
      // Check if sound is loaded
      const checkStatus = await sound.getStatusAsync();
      if (!checkStatus.isLoaded) {
        console.log('[VoiceNotePlayer] Sound not loaded, skipping seek');
        return sound;
      }

      const newPosition = Math.max(0, Math.min(position, playbackDuration));
      console.log('[VoiceNotePlayer] Seeking to position:', newPosition, 'ms');

      await sound.setPositionAsync(newPosition);

      const verifyStatus = await sound.getStatusAsync();
      console.log('[VoiceNotePlayer] Seek complete. New position:', verifyStatus.positionMillis, 'ms');

      return sound;
    } catch (error) {
      console.error('[VoiceNotePlayer] Error seeking:', error);
      return sound;
    }
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !!sound, // Only allow seeking if sound is loaded
      onMoveShouldSetPanResponder: () => !!sound,
      onPanResponderGrant: async (evt) => {
        if (!sound) return;

        setIsSeeking(true);
        wasPlayingBeforeSeek.current = isPlaying;

        // Pause if playing
        if (isPlaying) {
          await sound.pauseAsync();
        }

        const touchX = Math.max(0, evt.nativeEvent.locationX);
        const seekRatio = touchX / waveformWidth.current;
        const newSeekPosition = seekRatio * playbackDuration;
        setSeekPosition(newSeekPosition);
        setPlaybackPosition(newSeekPosition);

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      },
      onPanResponderMove: (evt) => {
        if (!sound) return;

        const touchX = Math.max(0, evt.nativeEvent.locationX);
        const seekRatio = Math.max(0, Math.min(1, touchX / waveformWidth.current));
        const newSeekPosition = seekRatio * playbackDuration;
        setSeekPosition(newSeekPosition);
        setPlaybackPosition(newSeekPosition);
      },
      onPanResponderRelease: async () => {
        if (!sound) {
          setIsSeeking(false);
          return;
        }

        try {
          // Perform the actual seek
          await performSeek(seekPosition);

          // Update position after seek
          const status = await sound.getStatusAsync();
          if (status.isLoaded) {
            setPlaybackPosition(status.positionMillis || seekPosition);
          }

          setIsSeeking(false);

          // Resume playing if it was playing before
          if (wasPlayingBeforeSeek.current) {
            await sound.playAsync();
          }

          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        } catch (error) {
          console.error('[VoiceNotePlayer] Error in release:', error);
          setIsSeeking(false);
        }
      },
    })
  ).current;

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

    // Don't update position while seeking to prevent jumpy behavior
    if (!isSeeking) {
      setPlaybackPosition(status.positionMillis || 0);
    }

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
        <View
          ref={waveformRef}
          style={styles.waveform}
          onLayout={(event) => {
            waveformWidth.current = event.nativeEvent.layout.width;
          }}
          {...panResponder.panHandlers}
        >
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
