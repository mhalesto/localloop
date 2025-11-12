/**
 * Smart Post Composer Modal - Gold Exclusive Feature
 * AI-powered post writing assistant using GPT-4o
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Modal,
} from 'react-native';
import { composePost } from '../services/openai/gpt4Service';
import { useAuth } from '../contexts/AuthContext';
import { useAlert } from '../contexts/AlertContext';

const TONE_OPTIONS = [
  { id: 'friendly', label: 'Friendly', icon: '😊', description: 'Warm and approachable' },
  { id: 'professional', label: 'Professional', icon: '💼', description: 'Polished and formal' },
  { id: 'excited', label: 'Excited', icon: '🎉', description: 'Enthusiastic and energetic' },
  { id: 'thoughtful', label: 'Thoughtful', icon: '🤔', description: 'Reflective and inviting' },
];

const LENGTH_OPTIONS = [
  { id: 'short', label: 'Short', description: '1-2 paragraphs' },
  { id: 'medium', label: 'Medium', description: '2-3 paragraphs' },
  { id: 'long', label: 'Long', description: '3-4 paragraphs' },
];

export default function SmartComposerModal({ visible, onClose, onUsePost }) {
  const { user, emailVerified } = useAuth();
  const { showAlert } = useAlert();

  const [idea, setIdea] = useState('');
  const [selectedTone, setSelectedTone] = useState('friendly');
  const [selectedLength, setSelectedLength] = useState('medium');
  const [includeEmojis, setIncludeEmojis] = useState(false);
  const [includeHashtags, setIncludeHashtags] = useState(true);
  const [loading, setLoading] = useState(false);
  const [generatedContent, setGeneratedContent] = useState(null);
  const [error, setError] = useState(null);

  const handleGenerate = async () => {
    // Check email verification first (required for all AI features)
    // Google users are automatically verified by Google
    const isGoogleUser = user?.providerData?.some(provider => provider.providerId === 'google.com');

    if (!emailVerified && !isGoogleUser) {
      setError('Email verification required');
      showAlert(
        'Email Verification Required',
        'Please verify your email address before using AI features. Check your inbox for the verification link.',
        [],
        { type: 'warning' }
      );
      return;
    }

    if (!idea.trim()) {
      setError('Please enter your post idea');
      return;
    }

    setLoading(true);
    setError(null);
    setGeneratedContent(null);

    try {
      const result = await composePost(idea, {
        tone: selectedTone,
        length: selectedLength,
        includeEmojis,
        includeHashtags,
      });

      setGeneratedContent(result);
    } catch (err) {
      console.error('[SmartComposer] Error:', err);
      setError(err.message || 'Failed to generate post. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleUsePost = () => {
    if (generatedContent) {
      onUsePost(generatedContent.content, generatedContent.hashtags);
      handleReset();
      onClose();
    }
  };

  const handleReset = () => {
    setIdea('');
    setGeneratedContent(null);
    setError(null);
    setSelectedTone('friendly');
    setSelectedLength('medium');
    setIncludeEmojis(false);
    setIncludeHashtags(true);
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>✨ AI Post Composer</Text>
          <Text style={styles.goldBadge}>GOLD</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Input Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>What's your post about?</Text>
            <TextInput
              style={styles.ideaInput}
              placeholder="E.g., 'Looking for recommendations for a good plumber in the area' or 'Organizing a neighborhood cleanup event'"
              placeholderTextColor="#999"
              value={idea}
              onChangeText={setIdea}
              multiline
              numberOfLines={4}
              maxLength={500}
            />
            <Text style={styles.charCount}>{idea.length}/500</Text>
          </View>

          {/* Tone Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Choose a tone</Text>
            <View style={styles.optionsGrid}>
              {TONE_OPTIONS.map((tone) => (
                <TouchableOpacity
                  key={tone.id}
                  style={[
                    styles.optionCard,
                    selectedTone === tone.id && styles.optionCardSelected,
                  ]}
                  onPress={() => setSelectedTone(tone.id)}
                >
                  <Text style={styles.optionIcon}>{tone.icon}</Text>
                  <Text style={styles.optionLabel}>{tone.label}</Text>
                  <Text style={styles.optionDescription}>{tone.description}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Length Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Post length</Text>
            <View style={styles.lengthOptions}>
              {LENGTH_OPTIONS.map((length) => (
                <TouchableOpacity
                  key={length.id}
                  style={[
                    styles.lengthButton,
                    selectedLength === length.id && styles.lengthButtonSelected,
                  ]}
                  onPress={() => setSelectedLength(length.id)}
                >
                  <Text
                    style={[
                      styles.lengthLabel,
                      selectedLength === length.id && styles.lengthLabelSelected,
                    ]}
                  >
                    {length.label}
                  </Text>
                  <Text style={styles.lengthDescription}>{length.description}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Options */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Options</Text>
            <TouchableOpacity
              style={styles.checkbox}
              onPress={() => setIncludeEmojis(!includeEmojis)}
            >
              <View style={[styles.checkboxBox, includeEmojis && styles.checkboxBoxChecked]}>
                {includeEmojis && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text style={styles.checkboxLabel}>Include emojis</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.checkbox}
              onPress={() => setIncludeHashtags(!includeHashtags)}
            >
              <View style={[styles.checkboxBox, includeHashtags && styles.checkboxBoxChecked]}>
                {includeHashtags && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text style={styles.checkboxLabel}>Suggest hashtags</Text>
            </TouchableOpacity>
          </View>

          {/* Error Display */}
          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Generated Content */}
          {generatedContent && (
            <View style={styles.resultSection}>
              <Text style={styles.sectionTitle}>Generated Post</Text>
              <View style={styles.generatedContent}>
                <Text style={styles.generatedText}>{generatedContent.content}</Text>
                {generatedContent.hashtags && generatedContent.hashtags.length > 0 && (
                  <View style={styles.hashtagsContainer}>
                    {generatedContent.hashtags.map((tag, index) => (
                      <View key={index} style={styles.hashtagPill}>
                        <Text style={styles.hashtagText}>#{tag}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>

              <TouchableOpacity style={styles.useButton} onPress={handleUsePost}>
                <Text style={styles.useButtonText}>Use This Post</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.regenerateButton} onPress={handleGenerate}>
                <Text style={styles.regenerateButtonText}>🔄 Regenerate</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>

        {/* Generate Button */}
        {!generatedContent && (
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.generateButton, loading && styles.generateButtonDisabled]}
              onPress={handleGenerate}
              disabled={loading || !idea.trim()}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.generateButtonText}>✨ Generate Post</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#212529',
  },
  goldBadge: {
    backgroundColor: '#ffd700',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    fontSize: 12,
    fontWeight: 'bold',
    color: '#000',
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    fontSize: 24,
    color: '#6c757d',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 12,
  },
  ideaInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#212529',
    minHeight: 100,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 12,
    color: '#6c757d',
    textAlign: 'right',
    marginTop: 4,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  optionCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#dee2e6',
    borderRadius: 8,
    padding: 12,
    margin: '1%',
    alignItems: 'center',
  },
  optionCardSelected: {
    borderColor: '#6C4DF4',
    backgroundColor: '#f0edff',
  },
  optionIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  optionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 12,
    color: '#6c757d',
    textAlign: 'center',
  },
  lengthOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  lengthButton: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#dee2e6',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  lengthButtonSelected: {
    borderColor: '#6C4DF4',
    backgroundColor: '#f0edff',
  },
  lengthLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 4,
  },
  lengthLabelSelected: {
    color: '#6C4DF4',
  },
  lengthDescription: {
    fontSize: 12,
    color: '#6c757d',
  },
  checkbox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  checkboxBox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#dee2e6',
    borderRadius: 4,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxBoxChecked: {
    backgroundColor: '#6C4DF4',
    borderColor: '#6C4DF4',
  },
  checkmark: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  checkboxLabel: {
    fontSize: 16,
    color: '#212529',
  },
  errorContainer: {
    backgroundColor: '#f8d7da',
    borderWidth: 1,
    borderColor: '#f5c2c7',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#842029',
    fontSize: 14,
  },
  resultSection: {
    marginTop: 16,
  },
  generatedContent: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  generatedText: {
    fontSize: 16,
    color: '#212529',
    lineHeight: 24,
  },
  hashtagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
    gap: 8,
  },
  hashtagPill: {
    backgroundColor: '#e7f3ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  hashtagText: {
    color: '#0066cc',
    fontSize: 14,
    fontWeight: '500',
  },
  useButton: {
    backgroundColor: '#6C4DF4',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 8,
  },
  useButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  regenerateButton: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#6C4DF4',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  regenerateButtonText: {
    color: '#6C4DF4',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  generateButton: {
    backgroundColor: '#6C4DF4',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  generateButtonDisabled: {
    opacity: 0.6,
  },
  generateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
