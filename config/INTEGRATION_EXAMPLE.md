# How to Add AI Features Settings to Your Settings Screen

## Quick Integration

Add this to your existing Settings screen:

```javascript
import AIFeaturesSettings from '../components/AIFeaturesSettings';

// In your SettingsScreen component:
function SettingsScreen() {
  const { userProfile, updateUserProfile, themeColors } = useSettings();

  const handleToggleFeature = (featureName, value) => {
    // Save user's AI feature preference
    updateUserProfile({
      aiPreferences: {
        ...(userProfile.aiPreferences || {}),
        [featureName]: value,
      },
    });
  };

  return (
    <ScreenLayout title="Settings">
      <ScrollView>
        {/* Your existing settings sections... */}

        {/* AI Features Section */}
        <View style={{ marginTop: 20 }}>
          <AIFeaturesSettings
            isPremium={userProfile?.isPremium || false}
            userPreferences={userProfile?.aiPreferences || {}}
            onToggleFeature={handleToggleFeature}
            themeColors={themeColors}
          />
        </View>
      </ScrollView>
    </ScreenLayout>
  );
}
```

## That's It!

The component will:
- ✅ Show only toggleable features
- ✅ Hide premium features from free users
- ✅ Respect master config in `aiFeatures.js`
- ✅ Save preferences to user profile
- ✅ Show premium upsell if not premium

## Testing

1. **As free user**: Premium features hidden
2. **As premium user**: All enabled features shown
3. **Edit `aiFeatures.js`**: Set `enabled: false` to hide feature completely

## Example Scenarios

### Scenario 1: Test with premium access
```javascript
// Temporarily give yourself premium:
updateUserProfile({ isPremium: true });
```

### Scenario 2: Disable a feature globally
```javascript
// In aiFeatures.js:
translation: {
  enabled: false,  // ← Nobody can use it
  // ...
}
```

### Scenario 3: Check if feature is enabled in your code
```javascript
import { isFeatureEnabled } from '../config/aiFeatures';

// Before showing translate button:
if (isFeatureEnabled('translation', isPremium, userPreferences)) {
  // Show translate button
}
```

That's all you need!
