import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';

const { width } = Dimensions.get('window');

export default function CustomAlert({
  visible,
  title,
  message,
  buttons = [],
  icon = null,
  iconColor = null,
  themeColors,
  accentColor,
}) {
  // Default to single OK button if no buttons provided
  const alertButtons = buttons.length > 0 ? buttons : [{ text: 'OK', onPress: () => {} }];

  const getIconForStyle = (style) => {
    if (icon) return icon;
    switch (style) {
      case 'destructive':
        return 'alert-circle';
      case 'cancel':
        return 'close-circle';
      default:
        return 'information-circle';
    }
  };

  const getColorForStyle = (style) => {
    if (iconColor) return iconColor;
    switch (style) {
      case 'destructive':
        return '#FF3B30';
      case 'cancel':
        return themeColors.textSecondary;
      default:
        return accentColor || themeColors.primary;
    }
  };

  const primaryButton = alertButtons.find((btn) => btn.style !== 'cancel' && btn.style !== 'destructive');
  const cancelButton = alertButtons.find((btn) => btn.style === 'cancel');
  const destructiveButton = alertButtons.find((btn) => btn.style === 'destructive');

  // Determine which icon to show (use primary button's style or destructive if exists)
  const iconToShow = destructiveButton ? 'alert-circle' : getIconForStyle(primaryButton?.style);
  const iconColorToShow = destructiveButton ? '#FF3B30' : getColorForStyle(primaryButton?.style);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={() => {
        if (cancelButton) {
          cancelButton.onPress?.();
        }
      }}
    >
      <View style={styles.overlay}>
        {Platform.OS === 'ios' ? (
          <BlurView intensity={20} style={StyleSheet.absoluteFill} tint="dark" />
        ) : (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.6)' }]} />
        )}

        <View style={[styles.alertContainer, { backgroundColor: themeColors.card }]}>
          {/* Icon */}
          {iconToShow && (
            <View style={[styles.iconContainer, { backgroundColor: `${iconColorToShow}15` }]}>
              <Ionicons name={iconToShow} size={40} color={iconColorToShow} />
            </View>
          )}

          {/* Title */}
          {title && (
            <Text style={[styles.title, { color: themeColors.textPrimary }]}>
              {title}
            </Text>
          )}

          {/* Message */}
          {message && (
            <Text style={[styles.message, { color: themeColors.textSecondary }]}>
              {message}
            </Text>
          )}

          {/* Buttons */}
          <View style={styles.buttonsContainer}>
            {alertButtons.map((button, index) => {
              const isDestructive = button.style === 'destructive';
              const isCancel = button.style === 'cancel';
              const isPrimary = !isDestructive && !isCancel;

              let buttonStyle = styles.button;
              let buttonColor = themeColors.textSecondary;
              let textColor = themeColors.textPrimary;

              if (isPrimary) {
                buttonStyle = [styles.button, styles.primaryButton, { backgroundColor: accentColor || themeColors.primary }];
                textColor = '#ffffff';
              } else if (isDestructive) {
                buttonStyle = [styles.button, styles.destructiveButton];
                textColor = '#FF3B30';
              } else {
                buttonStyle = [styles.button, styles.cancelButton];
                textColor = themeColors.textSecondary;
              }

              return (
                <TouchableOpacity
                  key={index}
                  style={buttonStyle}
                  onPress={button.onPress}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.buttonText, { color: textColor }]}>
                    {button.text}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  alertContainer: {
    width: Math.min(width - 80, 340),
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 24,
  },
  buttonsContainer: {
    gap: 12,
  },
  button: {
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  primaryButton: {
    borderWidth: 0,
  },
  destructiveButton: {
    backgroundColor: '#FF3B3010',
    borderColor: '#FF3B3030',
  },
  cancelButton: {
    backgroundColor: 'transparent',
    borderColor: 'rgba(128, 128, 128, 0.3)',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
