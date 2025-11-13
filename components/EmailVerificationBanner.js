import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';

export default function EmailVerificationBanner() {
  const { user, emailVerified, resendVerificationEmail, checkEmailVerification } = useAuth();
  const { themeColors } = useSettings();
  const [sending, setSending] = useState(false);
  const [checking, setChecking] = useState(false);
  const [message, setMessage] = useState('');
  const [autoCheckCount, setAutoCheckCount] = useState(0);

  // Only show for email/password users who haven't verified
  // Google users are pre-verified by Google, so don't show banner
  const isGoogleUser = user?.providerData?.some(provider => provider.providerId === 'google.com');

  if (!user?.email || emailVerified || isGoogleUser) {
    return null;
  }

  // Auto-check indicator effect
  useEffect(() => {
    if (!emailVerified && !isGoogleUser) {
      const interval = setInterval(() => {
        setAutoCheckCount(prev => prev + 1);
      }, 5000); // Update counter every 5 seconds when auto-checking

      return () => clearInterval(interval);
    }
  }, [emailVerified, isGoogleUser]);

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

  const handleCheckStatus = async () => {
    setChecking(true);
    setMessage('');

    try {
      const result = await checkEmailVerification();

      if (result.ok) {
        if (result.verified) {
          setMessage('✓ Email verified! Refreshing...');
          // The auth context will automatically update
        } else {
          setMessage('⏳ Not verified yet, keep checking...');
        }
      } else {
        setMessage('✗ Failed to check status');
      }
    } catch (error) {
      console.error('Error checking verification:', error);
      setMessage('✗ Something went wrong');
    } finally {
      setChecking(false);

      // Clear message after 3 seconds
      setTimeout(() => setMessage(''), 3000);
    }
  };

  return (
    <View style={[styles.banner, { backgroundColor: '#FFA500' }]}>
      <View style={styles.content}>
        <Ionicons name="mail-outline" size={20} color="#fff" />
        <View style={styles.textContainer}>
          <Text style={styles.title}>
            Verify your email {autoCheckCount > 0 && '(auto-checking...)'}
          </Text>
          <Text style={styles.subtitle}>
            {message || `Check your inbox (and spam folder) for the verification link`}
          </Text>
        </View>
      </View>
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, { marginRight: 8 }]}
          onPress={handleCheckStatus}
          disabled={checking || sending}
        >
          {checking ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Check</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.button}
          onPress={handleResendEmail}
          disabled={sending || checking}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Resend</Text>
          )}
        </TouchableOpacity>
      </View>
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
  buttonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  button: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 6,
    minWidth: 60,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
});
