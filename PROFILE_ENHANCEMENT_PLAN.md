# Profile Enhancement Plan - Professional Features

## Overview
Enhance user profiles with Instagram-like professional features including interests, pronouns, links, and better social information display.

## New Firestore User Fields

### Personal Information
```javascript
users/{userId}:
  // Existing fields...
  displayName: string
  username: string
  bio: string
  gender: string

  // NEW FIELDS:
  pronouns: string               // "he/him", "she/her", "they/them", "other"
  interests: array<string>       // ["Music", "Travel", "Photography", etc.]
  profession: string             // "Software Developer", "Artist", etc.
  company: string               // Company name
  education: string             // School/University
  relationshipStatus: string    // "Single", "In a relationship", etc.
  lookingFor: array<string>     // ["Friends", "Networking", "Events", etc.]

  // Links & Connections
  links: array<{
    type: string,              // "website", "instagram", "twitter", etc.
    url: string,
    label: string
  }>

  // Social Stats (computed)
  mutualFollowersCount: number   // Count of mutual followers
  localConnectionsCount: number  // Users in same city
```

## Interest Categories

Predefined categories for autocomplete/suggestions:

**Arts & Entertainment:**
- Music, Movies, Photography, Art, Theater, Dancing, Singing

**Sports & Fitness:**
- Gym, Running, Yoga, Swimming, Cycling, Hiking, Sports

**Food & Drink:**
- Cooking, Baking, Coffee, Wine, Restaurants, Food blogging

**Technology:**
- Coding, Gaming, Gadgets, AI/ML, Crypto, Web3

**Lifestyle:**
- Travel, Fashion, Beauty, Reading, Writing, Blogging

**Social:**
- Networking, Events, Volunteering, Community service

**Business:**
- Entrepreneurship, Investing, Marketing, Sales

## UI Components to Create

### 1. InterestsSelectorModal Component
```javascript
// New component: components/InterestsSelectorModal.js
- Modal with searchable interest tags
- Predefined categories + custom input
- Visual pills/chips for selected interests
- Max 10 interests
```

### 2. LinksManagerModal Component
```javascript
// New component: components/LinksManagerModal.js
- Add multiple links (website, social media, etc.)
- Link type selector (Instagram, Twitter, Website, etc.)
- URL validation
- Custom labels
```

### 3. Enhanced Profile Display
```javascript
// Updates to: screens/PublicProfileScreen.js

New sections:
1. Pronouns (next to display name)
2. Profession/Company (below bio)
3. Interests pills (scrollable horizontal)
4. Links (icons with labels)
5. "Followed by X and Y others" (mutual followers)
6. Local connections badge
```

### 4. Profile Editing Enhancements
```javascript
// Updates to: screens/SettingsScreen.js or new EditProfileScreen.js

New fields:
- Pronouns dropdown
- Interests selector (opens modal)
- Profession input
- Company input
- Links manager (opens modal)
- Looking for checkboxes
```

## Implementation Phases

### Phase 1: Schema & Basic Display (Day 1)
- [ ] Update Firestore schema documentation
- [ ] Add new fields to profile creation
- [ ] Display pronouns on PublicProfileScreen
- [ ] Display interests as pills on profile

### Phase 2: Editing UI (Day 2)
- [ ] Create InterestsSelectorModal
- [ ] Add pronouns picker to settings
- [ ] Add profession/company fields
- [ ] Update profile save logic

### Phase 3: Advanced Features (Day 3)
- [ ] Create LinksManagerModal
- [ ] Add links display to profile
- [ ] Implement mutual followers display
- [ ] Add local connections badge

### Phase 4: Suggestions & Discovery (Day 4)
- [ ] Interest-based user suggestions
- [ ] Filter users by interests
- [ ] Enhanced search by interests/profession
- [ ] "People like you" recommendations

## Sample UI Layout

```
┌────────────────────────────────────┐
│  [Photo]  Username                 │
│           Display Name • he/him    │  ← NEW: Pronouns
│           Software Developer       │  ← NEW: Profession
│           @ Tech Company           │  ← NEW: Company
│                                    │
│  Bio text here...                  │
│                                    │
│  🔗 Links:                         │  ← NEW: Links section
│  [🌐 Website] [📸 Instagram]      │
│                                    │
│  Interests:                        │  ← NEW: Interests
│  [Music] [Travel] [Photography]   │
│  [Coding] [Coffee]                │
│                                    │
│  Followed by user1, user2 and     │  ← NEW: Mutual followers
│  15 others you follow              │
│                                    │
│  📍 123 local connections          │  ← NEW: Local badge
└────────────────────────────────────┘
```

## Database Migration

Since Firestore is schemaless, no migration needed. New fields will:
- Default to empty/null for existing users
- Gradually populate as users update profiles
- Use sensible defaults in code (empty arrays, null strings)

## Privacy Settings

Add privacy controls for:
- [ ] Show/hide pronouns (public/private)
- [ ] Show/hide profession/company
- [ ] Show/hide interests
- [ ] Show/hide links
- [ ] Show/hide mutual followers

## Backend Updates Needed

### 1. User Suggestions Algorithm
```javascript
// services/userSuggestionService.js
- Weight by shared interests
- Weight by mutual followers
- Weight by location proximity
- Weight by similar profession
```

### 2. Search Enhancement
```javascript
// services/searchService.js
- Search by interests
- Search by profession
- Filter by "looking for" categories
```

## Cost Considerations

- **Storage:** Minimal (text fields, small arrays)
- **Reads:** Slightly increased (loading interests, links)
- **Optimization:** Cache interest categories, limit link count

## Testing Checklist

- [ ] Create profile with all new fields
- [ ] Update existing profile with new fields
- [ ] Test interests selector UI
- [ ] Test links manager UI
- [ ] Test pronouns display
- [ ] Test privacy settings for new fields
- [ ] Test search by interests
- [ ] Test user suggestions with interests
- [ ] Test profile display with missing/empty fields
- [ ] Test interest pills overflow handling

## Accessibility

- [ ] Screen reader labels for interest pills
- [ ] Proper ARIA labels for links
- [ ] Keyboard navigation in selectors
- [ ] Color contrast for new UI elements

## Analytics to Track

- Adoption rate of new fields
- Most popular interests
- Click-through rate on links
- Engagement with mutual followers display
- User discovery via interests

---

## Next Steps

1. Get user approval on field list
2. Create InterestsSelectorModal component
3. Update PublicProfileScreen to display new fields
4. Add editing UI to SettingsScreen
5. Implement user suggestions based on interests
