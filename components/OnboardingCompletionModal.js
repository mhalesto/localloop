import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Image,
} from 'react-native';

/**
 * OnboardingCompletionModal - Congratulations screen after completing tutorial
 */
export default function OnboardingCompletionModal({
  visible,
  onContinue,
  onMaybeLater,
  accentColor = '#6C4DF4',
  isDarkMode = false,
}) {
  const styles = createStyles(isDarkMode, accentColor);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onContinue}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* Celebration emoji */}
          <Text style={styles.emoji}>👏</Text>

          {/* Title */}
          <Text style={styles.title}>Wow! You're a natural at this!</Text>

          {/* Description */}
          <Text style={styles.description}>
            Now that you've successfully created your first post, it's time to explore more features.
            Want to see what else you can do with LocalLoop?
          </Text>

          {/* Actions */}
          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: accentColor }]}
            onPress={onContinue}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryButtonText}>Show me</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={onMaybeLater}
            activeOpacity={0.7}
          >
            <Text style={styles.secondaryButtonText}>Maybe later</Text>
          </TouchableOpacity>

          {/* Footer hint */}
          <Text style={styles.footerHint}>
            * You can always resume onboarding in Settings
          </Text>
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (isDarkMode, accentColor) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
    },
    card: {
      backgroundColor: isDarkMode ? '#1E1E1E' : '#ffffff',
      borderRadius: 20,
      padding: 32,
      width: '100%',
      maxWidth: 400,
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.3,
      shadowRadius: 12,
      elevation: 12,
    },
    emoji: {
      fontSize: 80,
      marginBottom: 24,
    },
    title: {
      fontSize: 24,
      fontWeight: '700',
      color: isDarkMode ? '#FFFFFF' : '#000000',
      marginBottom: 16,
      textAlign: 'center',
    },
    description: {
      fontSize: 15,
      color: isDarkMode ? '#CCCCCC' : '#666666',
      lineHeight: 22,
      textAlign: 'center',
      marginBottom: 32,
    },
    primaryButton: {
      width: '100%',
      paddingVertical: 16,
      borderRadius: 12,
      alignItems: 'center',
      marginBottom: 12,
    },
    primaryButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: '#ffffff',
    },
    secondaryButton: {
      width: '100%',
      paddingVertical: 16,
      borderRadius: 12,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: isDarkMode ? '#333333' : '#DDDDDD',
      marginBottom: 16,
    },
    secondaryButtonText: {
      fontSize: 16,
      fontWeight: '500',
      color: isDarkMode ? '#CCCCCC' : '#666666',
    },
    footerHint: {
      fontSize: 12,
      color: '#999999',
      textAlign: 'center',
      fontStyle: 'italic',
    },
  });
