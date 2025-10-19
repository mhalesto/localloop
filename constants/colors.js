export const lightColors = {
  primary: '#6C4DF4',
  primaryDark: '#5333E0',
  primaryLight: '#8D73FF',
  background: '#F5F1FF',
  card: '#FFFFFF',
  textPrimary: '#1F1845',
  textSecondary: '#7A76A9',
  divider: '#E4DFFF'
};

export const darkColors = {
  primary: '#6C4DF4',
  primaryDark: '#5333E0',
  primaryLight: '#8D73FF',
  background: '#0F0B26',
  card: '#1C1638',
  textPrimary: '#F5F1FF',
  textSecondary: '#B5B1E0',
  divider: '#2B2554'
};

// Backwards compatibility for modules that still import { colors } directly.
// These values represent the light theme defaults.
export const colors = lightColors;
