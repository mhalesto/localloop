# Gold Features UI Integration Guide

This guide shows exactly how to integrate Gold features into your existing screens.

## 1. Post Composer Screen

**File:** `screens/PostComposerScreen.js`

### Add Imports

```javascript
// Add to imports (around line 20)
import SmartComposerModal from '../components/SmartComposerModal';
import { isGoldUser } from '../services/openai/gpt4Service';
```

### Add State

```javascript
// Add to useState declarations (around line 40)
const [showSmartComposer, setShowSmartComposer] = useState(false);
const isGold = userProfile?.subscriptionPlan === 'gold';
```

### Add Handler

```javascript
// Add before handleClose function (around line 84)
const handleUseAIPost = (content, hashtags) => {
  // Populate post from AI composer
  setMessage(content);

  // Add hashtags to title or message
  if (hashtags && hashtags.length > 0) {
    const hashtagText = hashtags.map(tag => `#${tag}`).join(' ');
    setMessage(prev => `${prev}\n\n${hashtagText}`);
  }

  setShowSmartComposer(false);
  showAlert('Success', 'Post populated with AI content!', [{ text: 'OK' }]);
};
```

### Add UI Button

Find the location where other action buttons are (around line 200-300), and add:

```javascript
{/* Smart Composer Button - Gold Only */}
{isGold && (
  <TouchableOpacity
    style={[styles.aiComposerButton, {
      backgroundColor: themeColors.primaryDark,
    }]}
    onPress={() => setShowSmartComposer(true)}
  >
    <Text style={styles.aiComposerIcon}>✨</Text>
    <Text style={styles.aiComposerText}>AI Composer</Text>
    <View style={styles.goldBadge}>
      <Text style={styles.goldBadgeText}>GOLD</Text>
    </View>
  </TouchableOpacity>
)}
```

### Add Modal

Before the final `</View>` or `</ScrollView>`, add:

```javascript
{/* Smart Composer Modal */}
<SmartComposerModal
  visible={showSmartComposer}
  onClose={() => setShowSmartComposer(false)}
  onUsePost={handleUseAIPost}
/>
```

### Add Styles

Add to StyleSheet at bottom of file:

```javascript
aiComposerButton: {
  flexDirection: 'row',
  alignItems: 'center',
  borderRadius: 8,
  padding: 12,
  marginTop: 16,
  marginBottom: 8,
},
aiComposerIcon: {
  fontSize: 20,
  marginRight: 8,
},
aiComposerText: {
  color: '#fff',
  fontSize: 16,
  fontWeight: '600',
  flex: 1,
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
```

---

## 2. Settings Screen - Summarization

**File:** `screens/SettingsScreen.js` (or wherever summarization is)

### Add Imports

```javascript
import { summarizePostDescription } from '../services/summarizationService';
```

### Add Style Picker for Gold Users

```javascript
// Add before the "Summarize" button
{userProfile?.subscriptionPlan === 'gold' && (
  <View style={styles.summaryStyleSection}>
    <Text style={styles.sectionLabel}>Summary Style (Gold)</Text>
    <View style={styles.styleGrid}>
      {['professional', 'casual', 'emoji', 'formal'].map(style => (
        <TouchableOpacity
          key={style}
          style={[
            styles.styleButton,
            selectedSummaryStyle === style && styles.styleButtonSelected,
          ]}
          onPress={() => setSelectedSummaryStyle(style)}
        >
          <Text style={styles.styleButtonText}>
            {style.charAt(0).toUpperCase() + style.slice(1)}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  </View>
)}
```

### Update Summarize Handler

```javascript
const handleSummarize = async () => {
  setLoading(true);
  try {
    const result = await summarizePostDescription(description, {
      subscriptionPlan: userProfile?.subscriptionPlan || 'basic',
      lengthPreference: 'balanced',
      style: selectedSummaryStyle || 'professional', // Gold users can choose
    });

    // Show result with Gold indicator
    const message = result.goldFeature
      ? `✨ GPT-4o Summary:\n\n${result.summary}`
      : `Summary:\n\n${result.summary}`;

    showAlert('Summary', message, [
      { text: 'Use', onPress: () => setDescription(result.summary) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  } catch (error) {
    showAlert('Error', error.message);
  } finally {
    setLoading(false);
  }
};
```

---

## 3. Cartoon Generation Screen

**File:** `screens/SettingsScreen.js` (cartoon section)

### Show Gold Enhancement

```javascript
// Add before cartoon generation
{userProfile?.subscriptionPlan === 'gold' && (
  <View style={styles.goldFeatureInfo}>
    <Text style={styles.goldFeatureIcon}>✨</Text>
    <View style={styles.goldFeatureContent}>
      <Text style={styles.goldFeatureTitle}>Gold Enhancement Active</Text>
      <Text style={styles.goldFeatureDesc}>
        Your cartoons will be personalized using GPT-4o Vision analysis + HD quality
      </Text>
    </View>
  </View>
)}
```

### Update Generation Handler

```javascript
const handleGenerateCartoon = async (styleId) => {
  setGenerating(true);
  try {
    const result = await generateCartoonProfile(
      userProfile.profilePictureUrl,
      styleId,
      'neutral',
      null,
      userProfile?.subscriptionPlan || 'basic' // Pass subscription plan
    );

    // Show Gold enhancement indicator
    if (result.enhanced) {
      showAlert(
        '✨ Gold Enhancement',
        'Your cartoon was personalized using GPT-4o Vision analysis!',
        [{ text: 'Awesome!' }]
      );
    }

    // Save cartoon...
  } catch (error) {
    showAlert('Error', error.message);
  } finally {
    setGenerating(false);
  }
};
```

---

## 4. Post Detail Screen - Comment Suggestions

**File:** `screens/PostThreadScreen.js` (or PostDetailScreen)

### Add Imports

```javascript
import { generateCommentSuggestions } from '../services/openai/gpt4Service';
```

### Add State

```javascript
const [showCommentSuggestions, setShowCommentSuggestions] = useState(false);
const [suggestions, setSuggestions] = useState([]);
const [selectedTone, setSelectedTone] = useState('supportive');
const isGold = userProfile?.subscriptionPlan === 'gold';
```

### Add Suggestions Button

```javascript
{/* Comment Suggestions - Gold Feature */}
<TouchableOpacity
  style={[styles.suggestionsButton, isGold && styles.suggestionsButtonGold]}
  onPress={handleGetSuggestions}
>
  <Text style={styles.suggestionsButtonText}>
    💡 {isGold ? 'Get AI Suggestions' : 'Upgrade for AI Suggestions'}
  </Text>
  {isGold && (
    <View style={styles.goldBadge}>
      <Text style={styles.goldBadgeText}>GOLD</Text>
    </View>
  )}
</TouchableOpacity>
```

### Add Handler

```javascript
const handleGetSuggestions = async () => {
  if (!isGold) {
    showAlert(
      'Upgrade to Gold',
      'Get AI-powered comment suggestions with Gold membership!',
      [
        { text: 'Learn More', onPress: () => navigation.navigate('GoldFeatures') },
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
    setShowCommentSuggestions(true);
  } catch (error) {
    showAlert('Error', error.message);
  } finally {
    setLoading(false);
  }
};

const handleUseSuggestion = (suggestion) => {
  setCommentText(suggestion);
  setShowCommentSuggestions(false);
};
```

---

## 5. Navigation - Add Gold Features Screen

**File:** `navigation/AppNavigator.js` (or your main navigator)

### Add Screen

```javascript
import GoldFeaturesScreen from '../screens/GoldFeaturesScreen';

// In your Stack.Navigator
<Stack.Screen
  name="GoldFeatures"
  component={GoldFeaturesScreen}
  options={{ title: 'Gold Features' }}
/>
```

### Add Navigation from Settings

In SettingsScreen.js:

```javascript
<TouchableOpacity
  style={styles.goldUpgradeCard}
  onPress={() => navigation.navigate('GoldFeatures')}
>
  <Text style={styles.goldIcon}>✨</Text>
  <View style={styles.goldContent}>
    <Text style={styles.goldTitle}>Upgrade to Gold</Text>
    <Text style={styles.goldSubtitle}>
      Unlock GPT-4o powered AI features
    </Text>
  </View>
  <Ionicons name="chevron-forward" size={24} color="#ffd700" />
</TouchableOpacity>
```

---

## 6. Feature Gates

### Reusable Component

Create `components/GoldFeatureGate.js`:

```javascript
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation } from '@react-navigation/native';

export default function GoldFeatureGate({ children, featureName = 'this feature' }) {
  const { userProfile } = useAuth();
  const navigation = useNavigation();
  const isGold = userProfile?.subscriptionPlan === 'gold';

  if (isGold) {
    return children;
  }

  return (
    <View style={styles.gate}>
      <Text style={styles.icon}>🔒</Text>
      <Text style={styles.title}>Gold Feature</Text>
      <Text style={styles.description}>
        Upgrade to Gold to unlock {featureName}
      </Text>
      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.navigate('GoldFeatures')}
      >
        <Text style={styles.buttonText}>Upgrade to Gold</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  gate: {
    backgroundColor: '#f8f9fa',
    borderWidth: 2,
    borderColor: '#dee2e6',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
  },
  icon: {
    fontSize: 48,
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#6c757d',
    textAlign: 'center',
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#ffd700',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
```

### Usage

```javascript
import GoldFeatureGate from '../components/GoldFeatureGate';

// Wrap any Gold feature
<GoldFeatureGate featureName="AI Post Composer">
  <SmartComposerModal />
</GoldFeatureGate>
```

---

## 7. Gold Badges Throughout App

### Helper Component

Create `components/GoldBadge.js`:

```javascript
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function GoldBadge({ size = 'small' }) {
  return (
    <View style={[styles.badge, size === 'large' && styles.badgeLarge]}>
      <Text style={[styles.text, size === 'large' && styles.textLarge]}>
        GOLD
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    backgroundColor: '#ffd700',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  badgeLarge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  text: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#000',
  },
  textLarge: {
    fontSize: 12,
  },
});
```

### Usage

```javascript
import GoldBadge from '../components/GoldBadge';

// Show on feature labels
<View style={{ flexDirection: 'row', alignItems: 'center' }}>
  <Text>AI Composer</Text>
  <GoldBadge />
</View>
```

---

## 8. Settings Menu - Gold Section

Add prominent Gold section in Settings:

```javascript
{/* Gold Features Section */}
<View style={styles.section}>
  <Text style={styles.sectionTitle}>
    {userProfile?.subscriptionPlan === 'gold' ? '✨ Gold Features' : '💎 Upgrade to Gold'}
  </Text>

  {userProfile?.subscriptionPlan === 'gold' ? (
    // Show Gold features status
    <View style={styles.goldStatus}>
      <Text style={styles.goldStatusText}>Active</Text>
      <TouchableOpacity onPress={() => navigation.navigate('GoldFeatures')}>
        <Text style={styles.link}>View Features</Text>
      </TouchableOpacity>
    </View>
  ) : (
    // Show upgrade prompt
    <TouchableOpacity
      style={styles.upgradeCard}
      onPress={() => navigation.navigate('GoldFeatures')}
    >
      <View style={styles.upgradeContent}>
        <Text style={styles.upgradeTitle}>Unlock GPT-4o</Text>
        <Text style={styles.upgradeDescription}>
          AI Post Composer, Vision Cartoons, Smart Suggestions & more
        </Text>
      </View>
      <Text style={styles.upgradePrice}>R150/mo</Text>
    </TouchableOpacity>
  )}
</View>
```

---

## Testing Checklist

After integration:

- [ ] Smart Composer button shows for Gold users
- [ ] Style picker appears for Gold summarization
- [ ] Vision enhancement message shows for Gold cartoons
- [ ] Comment suggestions work for Gold users
- [ ] Non-Gold users see upgrade prompts
- [ ] Gold badges display correctly
- [ ] Navigation to GoldFeaturesScreen works
- [ ] Feature gates block non-Gold users
- [ ] All Gold features are discoverable

---

## Rollout Strategy

### Phase 1: Soft Launch (Week 1)
- Enable features for existing Premium users (free upgrade)
- Monitor usage and costs
- Gather feedback

### Phase 2: Limited Release (Week 2)
- Open Gold tier to new subscribers
- A/B test pricing (R150 vs R200)
- Monitor conversion rates

### Phase 3: Full Launch (Week 3+)
- Public announcement
- Social media campaign
- Email all users
- Monitor at scale

---

## Support Resources

- **Documentation**: `docs/GOLD_FEATURES.md`
- **Examples**: `examples/GoldFeatureIntegration.js`
- **Tests**: `__tests__/goldFeatures.test.js`
- **Firebase Setup**: `docs/FIREBASE_FUNCTIONS_SETUP.md`

