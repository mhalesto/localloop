# Codex Development Notes

## Recent Features

### Gold Tier GPT-4o Features (November 2025)

#### Overview
Gold subscribers now get access to premium GPT-4o powered AI features that provide significantly better quality than Basic/Premium plans. All Gold features use GPT-4o for personalized, context-aware assistance.

#### Documentation
**📚 See `docs/GOLD_FEATURES.md` for complete documentation**

#### Files Added
- `services/openai/gpt4Service.js` - GPT-4o service with all Gold features
- `components/SmartComposerModal.js` - AI post writing assistant UI
- `docs/GOLD_FEATURES.md` - Complete Gold features documentation

#### Files Modified
- `config/aiFeatures.js` - Added Gold tier enhancements and new features
- `services/summarizationService.js` - Added GPT-4o summarization for Gold users
- `services/openai/profileCartoonService.js` - Added Vision analysis for Gold users

#### Gold Features Summary

1. **GPT-4o Enhanced Summarization**
   - Gold: GPT-4o with 4 style options (Professional, Casual, Emoji, Formal)
   - Basic/Premium: Hugging Face BART
   - Cost: ~$0.002 per summary

2. **Vision-Personalized Cartoon Avatars**
   - Gold: GPT-4o Vision analyzes photo + HD DALL-E 3
   - Basic/Premium: Generic DALL-E 3
   - Cost: ~$0.085 per generation (Vision $0.005 + DALL-E HD $0.08)

3. **Smart Post Composer** (Gold Only)
   - AI writing assistant with tone/length control
   - Auto-generates posts from user ideas
   - Smart hashtag suggestions
   - Cost: ~$0.01 per composition

4. **Enhanced Comment Suggestions** (Gold Upgrade)
   - Gold: GPT-4o personalized suggestions
   - Basic/Premium: Template-based
   - Cost: ~$0.003 per suggestion set

5. **Cultural-Context Translation** (Gold Upgrade)
   - Gold: GPT-4o with South African cultural awareness
   - Basic/Premium: Basic translation API
   - Cost: ~$0.005 per translation

#### Cost Analysis
Active Gold user monthly costs:
- 20 cartoons: $1.70
- 50 summaries: $0.10
- 20 post compositions: $0.20
- 100 comment suggestions: $0.30
- 30 translations: $0.15
- **Total: ~$2.45/month**

**Recommended Gold price: $10-15/month (75-83% profit margin)**

#### Technical Implementation
- All Gold features proxy through `services/openai/gpt4Service.js`
- Security: API key server-side only via Firebase Function proxy
- Detection: `subscriptionPlan === 'gold'` checks throughout codebase
- Fallback: If GPT-4o fails, falls back to Hugging Face/basic services

---

### AI Cartoon Profile Generator (November 2025)

#### Overview
Transforms user profile photos into various cartoon/artistic styles using OpenAI's DALL-E 3 API. Users can generate, save, and manage cartoon avatars with usage limits based on their subscription plan.

#### Files Added
- `components/CartoonStyleModal.js` - Style selection UI
- `components/CartoonHistoryModal.js` - History management UI
- `services/cartoonProfileService.js` - Firebase Storage & usage tracking
- `services/openai/profileCartoonService.js` - DALL-E 3 integration

#### Files Modified
- `screens/SettingsScreen.js` - Added cartoon UI and handlers (lines 43-54, 164-169, 813-924, 1981-2015, 2068-2086)
- `config/aiFeatures.js` - Added profileCartoon feature config (lines 152-161, 317-322)

#### Features
1. **8 Cartoon Styles**
   - Pixar, Anime, Comic Book, Watercolor
   - Disney Classic, Classic Cartoon, Studio Ghibli, Simple Cartoon

2. **Gold Exclusive: Custom Prompts**
   - Gold users can describe their own custom cartoon style
   - Text input field (300 characters max)
   - Examples: "superhero in cyberpunk city", "watercolor princess in fantasy setting"
   - Powered by DALL-E 3 with full creative control

2a. **Gold Exclusive: Custom Image Upload**
   - Upload any image temporarily for AI generation
   - Image auto-deleted after cartoon is created
   - Optional: Use custom image instead of profile picture

2b. **Gold Exclusive: Generate Without Profile Picture**
   - Toggle to enable text-only or text + custom image generation
   - Complete creative freedom - generate anything imaginable
   - Not limited to profile picture transformations
   - Examples: landscapes, objects, characters, scenes, etc.

3. **Usage Limits**
   - Basic Plan: 5 lifetime generations
   - Premium: 10 generations per month
   - Gold: 20 generations per month + custom prompts
   - Automatic monthly reset for premium users

4. **History Management**
   - Saves last 3 generated cartoons
   - View, delete, or set as profile picture
   - Download cartoons to device photo library
   - iOS: Auto-creates "LocalLoop Cartoons" album
   - Automatic cleanup of old images

5. **User Flow**
   - Settings � Profile � "AI Cartoon Avatar"
   - Tap "Generate" � Choose style/custom prompt
   - Gold: Optionally upload custom image or toggle "Generate without profile picture"
   - Gold: Select AI model (GPT-3.5 or GPT-4)
   - Optional: Enable notification when done
   - AI generates cartoon (10-20 seconds)
   - View "History" to manage saved cartoons
   - Set any cartoon as profile picture or download to device

#### Technical Details

**Cost:**
- DALL-E 3 (Standard quality): $0.04 per generation
- GPT-4o mini Vision analysis: ~$0.003 per analysis (all users for accurate likeness)
- Total per generation: ~$0.043 (all users)
- 10,000 generations = $430

**Storage:**
- Generated cartoons saved to Firebase Storage at `cartoon-profiles/{userId}/{style}-{timestamp}.jpg`
- Temporary custom images saved to `temp-custom-images/{userId}/temp-{timestamp}.jpg`
- Temporary images auto-deleted after generation completes
- Automatic cleanup when history exceeds 3 items

**API:**
- OpenAI DALL-E 3 API for cartoon generation
- Text-to-image generation based on style prompts or custom descriptions
- Supports three generation modes:
  1. Profile photo transformation (Basic/Premium/Gold)
  2. Custom image transformation (Gold only)
  3. Text-only generation - unlimited creativity (Gold only)
- Image size: 1024x1024
- Quality: Standard (Basic/Premium), HD (Gold)
- Style: Vivid (more dramatic colors)
- **ALL users**: GPT-4o mini Vision analysis for accurate likeness and personalization
- **Gold users**: Optional GPT-4o (full) Vision for even higher quality analysis

**Database Schema (Firestore):**
```
users/{userId}:
  cartoonMonthlyUsage: number
  cartoonLifetimeUsage: number
  cartoonLastResetMonth: number
  cartoonLastResetYear: number
  cartoonLastGeneratedAt: timestamp
  cartoonPictureHistory: [
    {
      id: string
      url: string
      style: string
      createdAt: number
    }
  ]
```

#### Security Considerations
- OpenAI API key must be server-side only (verify `services/openai/config.js`)
- Firebase Storage rules must permit write to `cartoon-profiles/{userId}/`
- Rate limiting handled by usage tracking in Firestore

#### Future Improvements
1. Image optimization - resize 1024x1024 images for profile use
2. Cost monitoring dashboard
3. More style options
4. Custom style descriptions
5. Gender detection improvement
6. Batch generation for testing

#### Testing Checklist
- [ ] Test generation flow with valid profile photo
- [ ] Verify usage limits for Basic plan (1 lifetime)
- [ ] Verify usage limits for Premium (2/month)
- [ ] Test monthly reset functionality
- [ ] Verify Firebase Storage permissions
- [ ] Test history management (view, delete, set as profile)
- [ ] Test error handling (no profile photo, API errors)
- [ ] Verify cost tracking and analytics
- [ ] Check image quality and size
- [ ] Test on both iOS and Android

#### Dependencies
- OpenAI API (DALL-E 3)
- Firebase Storage
- Firebase Firestore
- React Native modals and ActivityIndicator

#### Error Handling
- No profile photo: Alert user to set photo first
- API errors: User-friendly error message with retry option
- Storage errors: Logged and reported to user
- Usage limit exceeded: Clear message with upgrade prompt

#### Documentation
- Feature info in `config/aiFeatures.js` (lines 152-161, 317-322)
- Service documentation in file headers
- Usage stats helper functions in `profileCartoonService.js`

---

## Development Guidelines

### Code Style
- Use functional components with hooks
- Proper error handling with try-catch
- User feedback via AlertContext
- Loading states for async operations

### Testing
- Run `npm test` before committing
- Test on both iOS and Android
- Verify Firebase operations in console

### Deployment
- Update build numbers for TestFlight
- Test all Firebase functions
- Monitor costs and usage in dashboards
