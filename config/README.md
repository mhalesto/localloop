# AI Features Configuration Guide

This guide explains how to control AI features in your app.

## 📁 Files

- **`aiFeatures.js`** - Master configuration file (YOU EDIT THIS)
- **`/components/AIFeaturesSettings.js`** - UI component for user settings

## 🎛️ Master Control: `aiFeatures.js`

This is YOUR control panel. Edit this file to enable/disable features globally.

### How It Works:

```javascript
export const AI_FEATURES_CONFIG = {
  featureName: {
    enabled: true,           // Master switch - YOU control this
    requiresPremium: false,  // Does user need premium?
    userCanToggle: true,     // Can users toggle in settings?
    forceEnabled: false,     // Always on? (overrides user preference)
  }
}
```

### Control Hierarchy:

1. **`enabled: false`** in config → Feature OFF for everyone (you disabled it)
2. **`enabled: true`** + **`forceEnabled: true`** → Always ON (users cannot disable)
3. **`enabled: true`** + **`requiresPremium: true`** → Only premium users see it
4. **`enabled: true`** + **`userCanToggle: true`** → Users can toggle in settings
5. **User preference** → User's personal choice (if they can toggle)

### Examples:

#### Example 1: Disable a Feature Completely
```javascript
titleGeneration: {
  enabled: false,  // ❌ OFF - Nobody can use it
  requiresPremium: true,
  userCanToggle: true,
},
```
Result: Feature disappears from app entirely

#### Example 2: Force Enable (Cannot Be Disabled)
```javascript
moderation: {
  enabled: true,
  requiresPremium: false,
  forceEnabled: true,  // ✅ Always ON
},
```
Result: Always active, users cannot disable

#### Example 3: Premium Only
```javascript
commentSuggestions: {
  enabled: true,
  requiresPremium: true,  // 💎 Premium required
  userCanToggle: true,
},
```
Result: Only premium users see it in settings

#### Example 4: User Choice (Free Feature)
```javascript
autoTagging: {
  enabled: true,
  requiresPremium: false,
  userCanToggle: true,  // 🎛️ User decides
},
```
Result: All users can toggle on/off in settings

---

## 🔧 Quick Config Examples

### Scenario 1: "Disable all premium features temporarily"

```javascript
// In aiFeatures.js, set all premium features to:
enabled: false,
```

### Scenario 2: "Make all features free for testing"

```javascript
// Change all features to:
requiresPremium: false,
```

### Scenario 3: "Enable feature but don't let users disable it"

```javascript
sentimentAnalysis: {
  enabled: true,
  requiresPremium: false,
  userCanToggle: false,  // ❌ Users cannot disable
},
```

---

## 💻 How to Use in Code

### Check if feature is enabled:

```javascript
import { isFeatureEnabled } from '../config/aiFeatures';

// Check if user can use a feature
const canUseTranslation = isFeatureEnabled(
  'translation',
  isPremium,        // User's premium status
  userPreferences   // User's toggle preferences
);

if (canUseTranslation) {
  // Show translation button
}
```

### Get all available features:

```javascript
import { getAvailableFeatures } from '../config/aiFeatures';

const features = getAvailableFeatures(isPremium, userPreferences);

if (features.threadSummarization) {
  // Show thread summary button
}
```

### Get features user can toggle:

```javascript
import { getTogglableFeatures } from '../config/aiFeatures';

// Get list of features to show in settings
const settingsFeatures = getTogglableFeatures(isPremium);
```

---

## 🎨 Using the Settings UI Component

Add to your Settings screen:

```javascript
import AIFeaturesSettings from '../components/AIFeaturesSettings';
import { useSettings } from '../contexts/SettingsContext';

function SettingsScreen() {
  const { userProfile, updateUserProfile, themeColors } = useSettings();

  const handleToggleFeature = (featureName, value) => {
    updateUserProfile({
      aiPreferences: {
        ...userProfile.aiPreferences,
        [featureName]: value,
      },
    });
  };

  return (
    <ScrollView>
      {/* Other settings... */}

      <AIFeaturesSettings
        isPremium={userProfile.isPremium || false}
        userPreferences={userProfile.aiPreferences || {}}
        onToggleFeature={handleToggleFeature}
        themeColors={themeColors}
      />
    </ScrollView>
  );
}
```

---

## 📊 Current Feature Status

| Feature | Status | Cost | Premium? | User Toggle? |
|---------|--------|------|----------|--------------|
| Moderation | ✅ Active | FREE | No | No (forced) |
| Auto-Tagging | ✅ Active | $0.002 | No | Yes |
| Summarization | ✅ Active | $0.002 | No | Yes |
| Content Warnings | ✅ Active | FREE | No | No (safety) |
| Sentiment | ✅ Active | FREE | No | Yes |
| Thread Summary | ⏳ Ready | $0.0035 | Yes | Yes |
| Comment Suggest | ⏳ Ready | $0.002 | Yes | Yes |
| Title Gen | ⏳ Ready | $0.001 | Yes | Yes |
| Translation | ⏳ Ready | $0.003 | Yes | Yes |
| Duplicate Detect | ❌ Disabled | $0.00002 | No | Yes |
| Semantic Search | ❌ Disabled | $0.00002 | Yes | No |
| Quality Score | ❌ Disabled | $0.001 | Yes | No |

---

## 🚨 Important Notes

### Safety Features (Cannot Be Disabled):
- **Moderation** - Always active for user safety
- **Content Warnings** - Always shown (extracted from moderation)

### Free Features:
- Moderation (FREE OpenAI API)
- Content Warnings (FREE - from moderation data)
- Sentiment Analysis (FREE - from moderation data)

### Premium Features:
Features marked `requiresPremium: true` only show for premium users

---

## 🎯 Common Tasks

### Task: Disable title generation
```javascript
// In aiFeatures.js
titleGeneration: {
  enabled: false,  // ← Change this
  // ...
}
```

### Task: Make translation free for everyone
```javascript
// In aiFeatures.js
translation: {
  enabled: true,
  requiresPremium: false,  // ← Change this
  userCanToggle: true,
}
```

### Task: Enable semantic search
```javascript
// In aiFeatures.js
semanticSearch: {
  enabled: true,  // ← Change this
  requiresPremium: true,
  userCanToggle: false,
}
```

---

## 🔍 Debugging

Check feature status in console:

```javascript
import AI_FEATURES_CONFIG from '../config/aiFeatures';

// See all features
console.log('AI Features Config:', AI_FEATURES_CONFIG);

// Check specific feature
console.log('Translation enabled?', AI_FEATURES_CONFIG.translation.enabled);
```

---

## 📝 Summary

**You have complete control!**

1. **Master switch** - `enabled: true/false` in `aiFeatures.js`
2. **Premium gate** - `requiresPremium: true/false`
3. **User choice** - `userCanToggle: true/false`
4. **Force enable** - `forceEnabled: true` (cannot be disabled)

**Your config overrides everything.** If you set `enabled: false`, the feature is OFF for everyone, regardless of premium status or user preferences.
