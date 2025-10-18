import { colors } from './colors';

export const avatarOptions = [
  {
    key: 'default',
    label: 'Classic',
    backgroundColor: colors.primaryDark,
    icon: { type: 'ion', name: 'person', color: '#ffffff' }
  },
  {
    key: 'sunrise',
    label: 'Sunrise',
    backgroundColor: '#FF9A9E',
    foregroundColor: '#ffffff',
    emoji: '🌅'
  },
  {
    key: 'lagoon',
    label: 'Lagoon',
    backgroundColor: '#48BCD6',
    foregroundColor: '#ffffff',
    emoji: '🐬'
  },
  {
    key: 'forest',
    label: 'Forest',
    backgroundColor: '#4CAF50',
    foregroundColor: '#ffffff',
    emoji: '🌿'
  },
  {
    key: 'midnight',
    label: 'Midnight',
    backgroundColor: '#283593',
    foregroundColor: '#ffffff',
    emoji: '🌙'
  },
  {
    key: 'flame',
    label: 'Flame',
    backgroundColor: '#FF7043',
    foregroundColor: '#ffffff',
    emoji: '🔥'
  },
  {
    key: 'bubblegum',
    label: 'Bubblegum',
    backgroundColor: '#F48FB1',
    foregroundColor: '#ffffff',
    emoji: '🍬'
  }
];

export function getAvatarConfig(key) {
  if (!key) {
    return avatarOptions[0];
  }
  return avatarOptions.find((option) => option.key === key) ?? avatarOptions[0];
}
