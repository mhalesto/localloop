/**
 * Gold Feature Integration Examples
 *
 * This file shows how to integrate Gold features into existing screens.
 * Copy and adapt these examples for your screens.
 */

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import SmartComposerModal from '../components/SmartComposerModal';
import { generateCommentSuggestions } from '../services/openai/gpt4Service';
import { summarizePostDescription } from '../services/summarizationService';

// ============================================================================
// EXAMPLE 1: Post Composer Screen Integration
// ============================================================================

/**
 * Add Smart Composer button to your post creation screen
 * Shows button only for Gold users
 */
export function PostComposerExample() {
  const { userProfile } = useAuth();
  const [showSmartComposer, setShowSmartComposer] = useState(false);
  const [postContent, setPostContent] = useState('');
  const [hashtags, setHashtags] = useState([]);

  const isGold = userProfile?.subscriptionPlan === 'gold';

  const handleUseAIPost = (content, generatedHashtags) => {
    setPostContent(content);
    setHashtags(generatedHashtags || []);
  };

  return (
    <View style={styles.container}>
      {/* Your existing post composer UI */}

      {/* Gold: Smart Composer Button */}
      {isGold && (
        <TouchableOpacity
          style={styles.aiButton}
          onPress={() => setShowSmartComposer(true)}
        >
          <Text style={styles.aiButtonIcon}>✨</Text>
          <Text style={styles.aiButtonText}>AI Composer</Text>
          <View style={styles.goldBadge}>
            <Text style={styles.goldBadgeText}>GOLD</Text>
          </View>
        </TouchableOpacity>
      )}

      {/* Smart Composer Modal */}
      <SmartComposerModal
        visible={showSmartComposer}
        onClose={() => setShowSmartComposer(false)}
        onUsePost={handleUseAIPost}
      />
    </View>
  );
}

// ============================================================================
// EXAMPLE 2: Summarization with Style Picker (Gold Users)
// ============================================================================

/**
 * Add summarization with style options for Gold users
 * Basic/Premium users get standard summarization
 */
export function SummarizationExample() {
  const { userProfile } = useAuth();
  const [description, setDescription] = useState('');
  const [summaryStyle, setSummaryStyle] = useState('professional');
  const [loading, setLoading] = useState(false);

  const isGold = userProfile?.subscriptionPlan === 'gold';
  const subscriptionPlan = userProfile?.subscriptionPlan || 'basic';

  const SUMMARY_STYLES = [
    { id: 'professional', label: 'Professional', icon: '💼' },
    { id: 'casual', label: 'Casual', icon: '😊' },
    { id: 'emoji', label: 'Emoji', icon: '🎉' },
    { id: 'formal', label: 'Formal', icon: '📝' },
  ];

  const handleSummarize = async () => {
    if (!description.trim()) {
      Alert.alert('Error', 'Please enter some text to summarize');
      return;
    }

    setLoading(true);
    try {
      const result = await summarizePostDescription(description, {
        subscriptionPlan,
        lengthPreference: 'balanced',
        style: isGold ? summaryStyle : undefined, // Only Gold gets style options
      });

      Alert.alert(
        'Summary',
        result.summary,
        [
          {
            text: 'Use This',
            onPress: () => setDescription(result.summary),
          },
          { text: 'Cancel', style: 'cancel' },
        ]
      );

      // Show Gold indicator if GPT-4o was used
      if (result.goldFeature) {
        console.log('✨ Powered by GPT-4o');
      }
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Gold users get style picker */}
      {isGold && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Summary Style</Text>
            <View style={styles.goldBadge}>
              <Text style={styles.goldBadgeText}>GOLD</Text>
            </View>
          </View>

          <View style={styles.styleGrid}>
            {SUMMARY_STYLES.map((style) => (
              <TouchableOpacity
                key={style.id}
                style={[
                  styles.styleCard,
                  summaryStyle === style.id && styles.styleCardSelected,
                ]}
                onPress={() => setSummaryStyle(style.id)}
              >
                <Text style={styles.styleIcon}>{style.icon}</Text>
                <Text style={styles.styleLabel}>{style.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      <TouchableOpacity
        style={styles.summarizeButton}
        onPress={handleSummarize}
        disabled={loading}
      >
        <Text style={styles.summarizeButtonText}>
          {loading ? 'Summarizing...' : '✨ Summarize'}
        </Text>
        {isGold && (
          <Text style={styles.poweredBy}>Powered by GPT-4o</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

// ============================================================================
// EXAMPLE 3: Enhanced Comment Suggestions (Gold Users)
// ============================================================================

/**
 * Add smart comment suggestions to post detail screen
 * Shows different UI for Gold vs Basic/Premium
 */
export function CommentSuggestionsExample({ postContent }) {
  const { userProfile } = useAuth();
  const [suggestions, setSuggestions] = useState([]);
  const [selectedTone, setSelectedTone] = useState('supportive');
  const [loading, setLoading] = useState(false);

  const isGold = userProfile?.subscriptionPlan === 'gold';

  const COMMENT_TONES = [
    { id: 'supportive', label: 'Supportive', icon: '💪' },
    { id: 'curious', label: 'Curious', icon: '🤔' },
    { id: 'appreciative', label: 'Appreciative', icon: '🙏' },
    { id: 'conversational', label: 'Friendly', icon: '😊' },
  ];

  const handleGetSuggestions = async () => {
    if (!isGold) {
      // Basic/Premium: Show upgrade prompt
      Alert.alert(
        'Upgrade to Gold',
        'Get AI-powered comment suggestions with Gold membership!',
        [
          { text: 'Learn More', onPress: () => navigateToSubscription() },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
      return;
    }

    setLoading(true);
    try {
      const result = await generateCommentSuggestions(postContent, {
        tone: selectedTone,
        count: 3,
      });

      setSuggestions(result);
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUseSuggestion = (suggestion) => {
    // Set comment text to the selected suggestion
    console.log('Using suggestion:', suggestion);
  };

  return (
    <View style={styles.container}>
      {/* Gold: Tone selector */}
      {isGold && suggestions.length === 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Comment Tone</Text>
          <View style={styles.toneGrid}>
            {COMMENT_TONES.map((tone) => (
              <TouchableOpacity
                key={tone.id}
                style={[
                  styles.toneButton,
                  selectedTone === tone.id && styles.toneButtonSelected,
                ]}
                onPress={() => setSelectedTone(tone.id)}
              >
                <Text style={styles.toneIcon}>{tone.icon}</Text>
                <Text style={styles.toneLabel}>{tone.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Suggestion button */}
      <TouchableOpacity
        style={[styles.suggestionButton, isGold && styles.suggestionButtonGold]}
        onPress={handleGetSuggestions}
        disabled={loading}
      >
        <Text style={styles.suggestionButtonText}>
          {loading ? 'Generating...' : '💡 Get AI Suggestions'}
        </Text>
        {isGold && (
          <View style={styles.goldBadge}>
            <Text style={styles.goldBadgeText}>GOLD</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Display suggestions */}
      {suggestions.length > 0 && (
        <View style={styles.suggestionsContainer}>
          <Text style={styles.suggestionsTitle}>AI Suggestions</Text>
          {suggestions.map((suggestion, index) => (
            <TouchableOpacity
              key={index}
              style={styles.suggestionCard}
              onPress={() => handleUseSuggestion(suggestion)}
            >
              <Text style={styles.suggestionText}>{suggestion}</Text>
              <Text style={styles.suggestionAction}>Tap to use →</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

// ============================================================================
// EXAMPLE 4: Cartoon Generation with Gold Enhancement Indicator
// ============================================================================

/**
 * Show when Gold users are getting enhanced features
 */
export function CartoonGenerationExample() {
  const { userProfile } = useAuth();
  const [generating, setGenerating] = useState(false);

  const isGold = userProfile?.subscriptionPlan === 'gold';
  const subscriptionPlan = userProfile?.subscriptionPlan || 'basic';

  const handleGenerate = async (styleId) => {
    setGenerating(true);
    try {
      const result = await generateCartoonProfile(
        userProfile.profilePictureUrl,
        styleId,
        'neutral',
        null,
        subscriptionPlan
      );

      // Show Gold enhancement indicator
      if (result.enhanced) {
        Alert.alert(
          '✨ Gold Enhancement',
          'Your cartoon was personalized using GPT-4o Vision analysis!',
          [{ text: 'Awesome!', style: 'default' }]
        );
      }

      console.log('Quality:', result.quality); // 'hd' for Gold, 'standard' for others
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Show what Gold users get */}
      {isGold && (
        <View style={styles.goldFeatureInfo}>
          <Text style={styles.goldFeatureIcon}>✨</Text>
          <View style={styles.goldFeatureTextContainer}>
            <Text style={styles.goldFeatureTitle}>Gold Enhancement Active</Text>
            <Text style={styles.goldFeatureDescription}>
              Your cartoons are personalized with GPT-4o Vision analysis + HD quality
            </Text>
          </View>
        </View>
      )}

      {/* Generate button */}
      <TouchableOpacity
        style={styles.generateButton}
        onPress={() => handleGenerate('pixar')}
        disabled={generating}
      >
        <Text style={styles.generateButtonText}>
          {generating ? 'Generating...' : '🎨 Generate Cartoon'}
        </Text>
      </TouchableOpacity>

      {/* Upgrade prompt for non-Gold users */}
      {!isGold && (
        <View style={styles.upgradePrompt}>
          <Text style={styles.upgradePromptText}>
            💎 Upgrade to Gold for personalized cartoons with Vision AI + HD quality
          </Text>
        </View>
      )}
    </View>
  );
}

// ============================================================================
// EXAMPLE 5: Feature Gate Component (Reusable)
// ============================================================================

/**
 * Reusable component to gate features behind Gold subscription
 */
export function GoldFeatureGate({
  children,
  featureName = 'this feature',
  showUpgradeButton = true
}) {
  const { userProfile, navigation } = useAuth();
  const isGold = userProfile?.subscriptionPlan === 'gold';

  if (isGold) {
    return children;
  }

  return (
    <View style={styles.featureGate}>
      <Text style={styles.featureGateIcon}>🔒</Text>
      <Text style={styles.featureGateTitle}>Gold Feature</Text>
      <Text style={styles.featureGateDescription}>
        Upgrade to Gold to unlock {featureName}
      </Text>
      {showUpgradeButton && (
        <TouchableOpacity
          style={styles.upgradeButton}
          onPress={() => navigation.navigate('Subscription')}
        >
          <Text style={styles.upgradeButtonText}>Upgrade to Gold</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// Usage example:
export function GoldFeatureGateExample() {
  return (
    <GoldFeatureGate featureName="AI Post Composer">
      <SmartComposerModal />
    </GoldFeatureGate>
  );
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check if user has Gold subscription
 */
export function useIsGold() {
  const { userProfile } = useAuth();
  return userProfile?.subscriptionPlan === 'gold';
}

/**
 * Navigate to subscription screen
 */
function navigateToSubscription() {
  // Implement navigation to subscription screen
  console.log('Navigate to subscription screen');
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
  },
  goldBadge: {
    backgroundColor: '#ffd700',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  goldBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#000',
  },
  aiButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6C4DF4',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
  },
  aiButtonIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  aiButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  styleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  styleCard: {
    width: '23%',
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#dee2e6',
    borderRadius: 8,
    padding: 8,
    margin: '1%',
    alignItems: 'center',
  },
  styleCardSelected: {
    borderColor: '#6C4DF4',
    backgroundColor: '#f0edff',
  },
  styleIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  styleLabel: {
    fontSize: 12,
    color: '#212529',
    textAlign: 'center',
  },
  summarizeButton: {
    backgroundColor: '#6C4DF4',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  summarizeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  poweredBy: {
    color: '#fff',
    fontSize: 12,
    marginTop: 4,
    opacity: 0.8,
  },
  toneGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  toneButton: {
    flex: 1,
    minWidth: '22%',
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#dee2e6',
    borderRadius: 8,
    padding: 8,
    alignItems: 'center',
  },
  toneButtonSelected: {
    borderColor: '#6C4DF4',
    backgroundColor: '#f0edff',
  },
  toneIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  toneLabel: {
    fontSize: 12,
    color: '#212529',
  },
  suggestionButton: {
    backgroundColor: '#e9ecef',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  suggestionButtonGold: {
    backgroundColor: '#6C4DF4',
  },
  suggestionButtonText: {
    color: '#212529',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  suggestionsContainer: {
    marginTop: 16,
  },
  suggestionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 12,
  },
  suggestionCard: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  suggestionText: {
    fontSize: 14,
    color: '#212529',
    marginBottom: 4,
  },
  suggestionAction: {
    fontSize: 12,
    color: '#6C4DF4',
    fontWeight: '500',
  },
  goldFeatureInfo: {
    flexDirection: 'row',
    backgroundColor: '#fff9e6',
    borderWidth: 1,
    borderColor: '#ffd700',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  goldFeatureIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  goldFeatureTextContainer: {
    flex: 1,
  },
  goldFeatureTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 4,
  },
  goldFeatureDescription: {
    fontSize: 12,
    color: '#6c757d',
  },
  generateButton: {
    backgroundColor: '#6C4DF4',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  generateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  upgradePrompt: {
    backgroundColor: '#f0edff',
    borderWidth: 1,
    borderColor: '#6C4DF4',
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
  },
  upgradePromptText: {
    fontSize: 14,
    color: '#6C4DF4',
    textAlign: 'center',
  },
  featureGate: {
    backgroundColor: '#f8f9fa',
    borderWidth: 2,
    borderColor: '#dee2e6',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
  },
  featureGateIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  featureGateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 8,
  },
  featureGateDescription: {
    fontSize: 14,
    color: '#6c757d',
    textAlign: 'center',
    marginBottom: 16,
  },
  upgradeButton: {
    backgroundColor: '#ffd700',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  upgradeButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
