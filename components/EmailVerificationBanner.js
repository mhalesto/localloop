import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';

export default function EmailVerificationBanner() {
  const { user, emailVerified, resendVerificationEmail } = useAuth();
  const { themeColors } = useSettings();
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState('');

  // Only show for email/password users who haven't verified
  // Google users are pre-verified by Google, so don't show banner
  const isGoogleUser = user?.providerData?.some(provider => provider.providerId === 'google.com');

  if (!user?.email || emailVerified || isGoogleUser) {
    return null;
  }

  const handleResendEmail = async () => {
    setSending(true);
    setMessage('');

    try {
      const result = await resendVerificationEmail();

      if (result.ok) {
        setMessage('✓ Verification email sent!');
      } else if (result.error === 'already_verified') {
        setMessage('✓ Already verified!');
      } else {
        console.error('Failed to send verification email:', result);
        setMessage(`✗ Failed: ${result.details || result.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error resending verification email:', error);
      setMessage('✗ Something went wrong');
    } finally {
      setSending(false);

      // Clear message after 5 seconds (increased from 3 for errors)
      setTimeout(() => setMessage(''), 5000);
    }
  };

  return (
    <View style={[styles.banner, { backgroundColor: '#FFA500' }]}>
      <View style={styles.content}>
        <Ionicons name="mail-outline" size={20} color="#fff" />
        <View style={styles.textContainer}>
          <Text style={styles.title}>Verify your email</Text>
          <Text style={styles.subtitle}>
            {message || `Check your inbox (and spam folder) for the verification link`}
          </Text>
        </View>
      </View>
      <TouchableOpacity
        style={styles.button}
        onPress={handleResendEmail}
        disabled={sending}
      >
        {sending ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Resend</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    padding: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  textContainer: {
    marginLeft: 12,
    flex: 1,
  },
  title: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  subtitle: {
    color: '#fff',
    fontSize: 12,
    opacity: 0.9,
  },
  button: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 6,
    minWidth: 70,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
});
