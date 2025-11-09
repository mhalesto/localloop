/**
 * Profile Enhancement Constants
 * Predefined categories for interests, pronouns, link types, etc.
 */

// Interest Categories with predefined options
export const INTEREST_CATEGORIES = {
  'Arts & Entertainment': [
    { id: 'music', label: 'Music', icon: 'musical-notes' },
    { id: 'movies', label: 'Movies', icon: 'film' },
    { id: 'photography', label: 'Photography', icon: 'camera' },
    { id: 'art', label: 'Art', icon: 'color-palette' },
    { id: 'theater', label: 'Theater', icon: 'ticket' },
    { id: 'dancing', label: 'Dancing', icon: 'body' },
    { id: 'singing', label: 'Singing', icon: 'mic' },
    { id: 'reading', label: 'Reading', icon: 'book' },
    { id: 'writing', label: 'Writing', icon: 'create' },
  ],
  'Sports & Fitness': [
    { id: 'gym', label: 'Gym', icon: 'barbell' },
    { id: 'running', label: 'Running', icon: 'walk' },
    { id: 'yoga', label: 'Yoga', icon: 'leaf' },
    { id: 'swimming', label: 'Swimming', icon: 'water' },
    { id: 'cycling', label: 'Cycling', icon: 'bicycle' },
    { id: 'hiking', label: 'Hiking', icon: 'trail-sign' },
    { id: 'sports', label: 'Sports', icon: 'basketball' },
    { id: 'football', label: 'Football', icon: 'football' },
    { id: 'tennis', label: 'Tennis', icon: 'tennisball' },
  ],
  'Food & Drink': [
    { id: 'cooking', label: 'Cooking', icon: 'restaurant' },
    { id: 'baking', label: 'Baking', icon: 'pizza' },
    { id: 'coffee', label: 'Coffee', icon: 'cafe' },
    { id: 'wine', label: 'Wine', icon: 'wine' },
    { id: 'restaurants', label: 'Restaurants', icon: 'fast-food' },
    { id: 'foodie', label: 'Foodie', icon: 'nutrition' },
    { id: 'vegan', label: 'Vegan', icon: 'leaf' },
  ],
  'Technology': [
    { id: 'coding', label: 'Coding', icon: 'code-slash' },
    { id: 'gaming', label: 'Gaming', icon: 'game-controller' },
    { id: 'gadgets', label: 'Gadgets', icon: 'phone-portrait' },
    { id: 'ai', label: 'AI/ML', icon: 'bulb' },
    { id: 'crypto', label: 'Crypto', icon: 'logo-bitcoin' },
    { id: 'web3', label: 'Web3', icon: 'globe' },
  ],
  'Lifestyle': [
    { id: 'travel', label: 'Travel', icon: 'airplane' },
    { id: 'fashion', label: 'Fashion', icon: 'shirt' },
    { id: 'beauty', label: 'Beauty', icon: 'sparkles' },
    { id: 'pets', label: 'Pets', icon: 'paw' },
    { id: 'nature', label: 'Nature', icon: 'leaf' },
    { id: 'gardening', label: 'Gardening', icon: 'flower' },
  ],
  'Social & Community': [
    { id: 'networking', label: 'Networking', icon: 'people' },
    { id: 'events', label: 'Events', icon: 'calendar' },
    { id: 'volunteering', label: 'Volunteering', icon: 'heart' },
    { id: 'activism', label: 'Activism', icon: 'megaphone' },
    { id: 'meetups', label: 'Meetups', icon: 'chatbubbles' },
  ],
  'Business & Career': [
    { id: 'entrepreneurship', label: 'Entrepreneurship', icon: 'rocket' },
    { id: 'investing', label: 'Investing', icon: 'trending-up' },
    { id: 'marketing', label: 'Marketing', icon: 'megaphone' },
    { id: 'sales', label: 'Sales', icon: 'cash' },
    { id: 'finance', label: 'Finance', icon: 'calculator' },
  ],
};

// Flatten all interests for search
export const ALL_INTERESTS = Object.values(INTEREST_CATEGORIES)
  .flat()
  .sort((a, b) => a.label.localeCompare(b.label));

// Pronouns options
export const PRONOUNS_OPTIONS = [
  { value: '', label: 'Prefer not to say' },
  { value: 'he/him', label: 'he/him' },
  { value: 'she/her', label: 'she/her' },
  { value: 'they/them', label: 'they/them' },
  { value: 'he/they', label: 'he/they' },
  { value: 'she/they', label: 'she/they' },
  { value: 'other', label: 'Other' },
];

// Link types with icons and colors
export const LINK_TYPES = [
  { id: 'website', label: 'Website', icon: 'globe', color: '#666' },
  { id: 'instagram', label: 'Instagram', icon: 'logo-instagram', color: '#E4405F' },
  { id: 'twitter', label: 'Twitter', icon: 'logo-twitter', color: '#1DA1F2' },
  { id: 'facebook', label: 'Facebook', icon: 'logo-facebook', color: '#4267B2' },
  { id: 'linkedin', label: 'LinkedIn', icon: 'logo-linkedin', color: '#0077B5' },
  { id: 'youtube', label: 'YouTube', icon: 'logo-youtube', color: '#FF0000' },
  { id: 'tiktok', label: 'TikTok', icon: 'logo-tiktok', color: '#000000' },
  { id: 'github', label: 'GitHub', icon: 'logo-github', color: '#333' },
  { id: 'discord', label: 'Discord', icon: 'logo-discord', color: '#5865F2' },
  { id: 'twitch', label: 'Twitch', icon: 'logo-twitch', color: '#9146FF' },
  { id: 'reddit', label: 'Reddit', icon: 'logo-reddit', color: '#FF4500' },
  { id: 'snapchat', label: 'Snapchat', icon: 'logo-snapchat', color: '#FFFC00' },
  { id: 'other', label: 'Other', icon: 'link', color: '#666' },
];

// Looking for options
export const LOOKING_FOR_OPTIONS = [
  { id: 'friends', label: 'Friends', icon: 'people' },
  { id: 'networking', label: 'Networking', icon: 'briefcase' },
  { id: 'events', label: 'Events', icon: 'calendar' },
  { id: 'dating', label: 'Dating', icon: 'heart' },
  { id: 'business', label: 'Business', icon: 'rocket' },
  { id: 'collaboration', label: 'Collaboration', icon: 'people-circle' },
];

// Relationship status options
export const RELATIONSHIP_STATUS_OPTIONS = [
  { value: '', label: 'Prefer not to say' },
  { value: 'single', label: 'Single' },
  { value: 'in_relationship', label: 'In a relationship' },
  { value: 'engaged', label: 'Engaged' },
  { value: 'married', label: 'Married' },
  { value: 'complicated', label: 'It\'s complicated' },
];

// Max limits
export const PROFILE_LIMITS = {
  MAX_INTERESTS: 10,
  MAX_LINKS: 5,
  MAX_LOOKING_FOR: 3,
  BIO_MAX_LENGTH: 150,
  PROFESSION_MAX_LENGTH: 50,
  COMPANY_MAX_LENGTH: 50,
  EDUCATION_MAX_LENGTH: 100,
  CATEGORY_MAX_LENGTH: 30,
  CONTACT_EMAIL_MAX_LENGTH: 100,
  CHANNEL_NAME_MAX_LENGTH: 50,
};

// Privacy settings for profile fields
export const PRIVACY_SETTINGS = {
  PRONOUNS: 'showPronouns',
  PROFESSION: 'showProfession',
  COMPANY: 'showCompany',
  INTERESTS: 'showInterests',
  LINKS: 'showLinks',
  CATEGORY: 'showCategory',
  CONTACT_EMAIL: 'showContactEmail',
  CHANNEL: 'showChannel',
};

// Default privacy settings (all public by default)
export const DEFAULT_PRIVACY_SETTINGS = {
  showPronouns: true,
  showProfession: true,
  showCompany: true,
  showInterests: true,
  showLinks: true,
  showCategory: true,
  showContactEmail: true,
  showChannel: true,
};
