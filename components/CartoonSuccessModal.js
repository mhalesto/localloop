/**
 * Cartoon Generation Success Modal
 * Shows Lottie animation with inspirational quote
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import LottieView from 'lottie-react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSettings } from '../contexts/SettingsContext';

const QUOTES = [
  { text: "Be yourself; everyone else is already taken.", author: "Oscar Wilde" },
  { text: "Life is what happens when you're busy making other plans.", author: "John Lennon" },
  { text: "The only impossible journey is the one you never begin.", author: "Tony Robbins" },
  { text: "In the middle of difficulty lies opportunity.", author: "Albert Einstein" },
  { text: "What lies behind us and what lies before us are tiny matters compared to what lies within us.", author: "Ralph Waldo Emerson" },
  { text: "Believe you can and you're halfway there.", author: "Theodore Roosevelt" },
  { text: "The best way to predict the future is to create it.", author: "Peter Drucker" },
  { text: "Do what you can, with what you have, where you are.", author: "Theodore Roosevelt" },
  { text: "Success is not final, failure is not fatal: it is the courage to continue that counts.", author: "Winston Churchill" },
  { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
  { text: "Your time is limited, don't waste it living someone else's life.", author: "Steve Jobs" },
  { text: "Dream big and dare to fail.", author: "Norman Vaughan" },
  { text: "It always seems impossible until it's done.", author: "Nelson Mandela" },
  { text: "The future belongs to those who believe in the beauty of their dreams.", author: "Eleanor Roosevelt" },
  { text: "Everything you've ever wanted is on the other side of fear.", author: "George Addair" },
];

export default function CartoonSuccessModal({ visible, onClose, onViewCartoon }) {
  const { themeColors, accentPreset } = useSettings();
  const primaryColor = accentPreset?.buttonBackground || themeColors.primary;
  const [quote, setQuote] = useState(QUOTES[0]);

  useEffect(() => {
    if (visible) {
      // Pick a random quote each time modal is shown
      const randomQuote = QUOTES[Math.floor(Math.random() * QUOTES.length)];
      setQuote(randomQuote);
    }
  }, [visible]);

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={localStyles.modalOverlay}>
        <View style={[localStyles.modalContent, { backgroundColor: themeColors.card }]}>
          {/* Success Animation */}
          <View style={localStyles.animationContainer}>
            <LottieView
              source={require('../assets/success-animation.json')}
              autoPlay
              loop={false}
              style={localStyles.lottie}
            />
          </View>

          {/* Success Message */}
          <Text style={[localStyles.successTitle, { color: primaryColor }]}>
            Your Cartoon is Ready!
          </Text>

          {/* Quote of the Day */}
          <View style={[localStyles.quoteContainer, { backgroundColor: themeColors.background }]}>
            <Ionicons name="chatbox-ellipses-outline" size={24} color={primaryColor} style={localStyles.quoteIcon} />
            <Text style={[localStyles.quoteText, { color: themeColors.textPrimary }]}>
              {quote.text}
            </Text>
            <Text style={[localStyles.quoteAuthor, { color: themeColors.textSecondary }]}>
              — {quote.author}
            </Text>
          </View>

          {/* Action Buttons */}
          <View style={localStyles.buttonContainer}>
            <TouchableOpacity
              style={[localStyles.primaryButton, { backgroundColor: primaryColor }]}
              onPress={onViewCartoon}
              activeOpacity={0.8}
            >
              <Ionicons name="images" size={20} color="#fff" />
              <Text style={localStyles.primaryButtonText}>View Cartoon</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[localStyles.secondaryButton, { borderColor: themeColors.divider }]}
              onPress={onClose}
              activeOpacity={0.8}
            >
              <Text style={[localStyles.secondaryButtonText, { color: themeColors.textPrimary }]}>
                Close
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const { width } = Dimensions.get('window');

const localStyles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: width - 40,
    maxWidth: 400,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
  },
  animationContainer: {
    width: 200,
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  lottie: {
    width: '100%',
    height: '100%',
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 20,
    textAlign: 'center',
  },
  quoteContainer: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    width: '100%',
  },
  quoteIcon: {
    marginBottom: 12,
    opacity: 0.6,
  },
  quoteText: {
    fontSize: 16,
    lineHeight: 24,
    fontStyle: 'italic',
    marginBottom: 12,
    textAlign: 'center',
  },
  quoteAuthor: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'right',
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    borderRadius: 12,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
  secondaryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
  },
  secondaryButtonText: {
    fontSize: 17,
    fontWeight: '600',
  },
});
