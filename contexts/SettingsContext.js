import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState
} from 'react';
import { darkColors, lightColors } from '../constants/colors';

export const accentPresets = [
  {
    key: 'royal',
    label: 'Royal Purple',
    background: lightColors.primary,
    isDark: true,
    onPrimary: '#ffffff',
    subtitleColor: 'rgba(255,255,255,0.8)',
    metaColor: 'rgba(255,255,255,0.75)',
    iconTint: '#ffffff',
    iconBorder: 'rgba(255,255,255,0.25)',
    iconBackground: 'rgba(255,255,255,0.1)',
    statCardBackground: 'rgba(255,255,255,0.18)',
    statValue: '#ffffff',
    statLabel: 'rgba(255,255,255,0.8)',
    buttonBackground: lightColors.primaryDark,
    buttonForeground: '#ffffff',
    badgeBackground: lightColors.primaryLight,
    badgeTextColor: '#ffffff',
    linkColor: lightColors.primaryDark,
    fabBackground: lightColors.primary,
    fabForeground: '#ffffff'
  },
  {
    key: 'lavender',
    label: 'Lavender Drift',
    background: '#D8CEFF',
    isDark: false,
    onPrimary: lightColors.textPrimary,
    subtitleColor: '#5A4EA5',
    metaColor: '#7A76A9',
    iconTint: lightColors.primaryDark,
    iconBorder: 'rgba(108,77,244,0.35)',
    iconBackground: '#ffffff',
    statCardBackground: 'rgba(108,77,244,0.12)',
    statValue: lightColors.primaryDark,
    statLabel: lightColors.textSecondary,
    buttonBackground: '#6C4DF4',
    buttonForeground: '#ffffff',
    badgeBackground: '#D8CEFF',
    badgeTextColor: lightColors.primaryDark,
    linkColor: '#6C4DF4',
    fabBackground: '#6C4DF4',
    fabForeground: '#ffffff'
  },
  {
    key: 'sky',
    label: 'Clear Sky',
    background: '#CFE1FF',
    isDark: false,
    onPrimary: lightColors.textPrimary,
    subtitleColor: '#3C5AB8',
    metaColor: '#6E7FA6',
    iconTint: lightColors.primaryDark,
    iconBorder: 'rgba(108,77,244,0.25)',
    iconBackground: '#ffffff',
    statCardBackground: 'rgba(76,137,255,0.14)',
    statValue: '#3C5AB8',
    statLabel: lightColors.textSecondary,
    buttonBackground: '#3C5AB8',
    buttonForeground: '#ffffff',
    badgeBackground: '#CFE1FF',
    badgeTextColor: lightColors.primaryDark,
    linkColor: '#3C5AB8',
    fabBackground: '#3C5AB8',
    fabForeground: '#ffffff'
  },
  {
    key: 'blush',
    label: 'Blush Rose',
    background: '#EBD0FF',
    isDark: false,
    onPrimary: lightColors.textPrimary,
    subtitleColor: '#9A54B6',
    metaColor: '#836D9C',
    iconTint: lightColors.primaryDark,
    iconBorder: 'rgba(154,84,182,0.25)',
    iconBackground: '#ffffff',
    statCardBackground: 'rgba(154,84,182,0.15)',
    statValue: '#7A46A1',
    statLabel: lightColors.textSecondary,
    buttonBackground: '#9A54B6',
    buttonForeground: '#ffffff',
    badgeBackground: '#EBD0FF',
    badgeTextColor: lightColors.primaryDark,
    linkColor: '#9A54B6',
    fabBackground: '#9A54B6',
    fabForeground: '#ffffff'
  }
];

const SettingsContext = createContext(null);

export function SettingsProvider({ children }) {
  const [showAddShortcut, setShowAddShortcut] = useState(true);
  const [accentKey, setAccentKey] = useState(accentPresets[0].key);
  const [locationPermissionStatus, setLocationPermissionStatus] = useState('undetermined');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [dreamyScrollIndicatorEnabled, setDreamyScrollIndicatorEnabled] = useState(false);
  const [userProfile, setUserProfile] = useState({
    nickname: '',
    country: '',
    province: '',
    city: '',
    avatarKey: 'default'
  });

  const updateShowAddShortcut = useCallback(
    (enabled) => setShowAddShortcut(enabled),
    []
  );
  const updateAccentKey = useCallback((key) => setAccentKey(key), []);
  const updateIsDarkMode = useCallback((enabled) => setIsDarkMode(Boolean(enabled)), []);
  const updateDreamyScrollIndicatorEnabled = useCallback(
    (enabled) => setDreamyScrollIndicatorEnabled(Boolean(enabled)),
    []
  );
  const updateUserProfile = useCallback(
    (patch) =>
      setUserProfile((prev) => ({
        ...prev,
        ...patch
      })),
    []
  );

  const accentPreset = useMemo(
    () => accentPresets.find((preset) => preset.key === accentKey) ?? accentPresets[0],
    [accentKey]
  );
  const themeColors = isDarkMode ? darkColors : lightColors;

  const value = useMemo(
    () => ({
      showAddShortcut,
      setShowAddShortcut: updateShowAddShortcut,
      accentKey,
      setAccentKey: updateAccentKey,
      accentPreset,
      accentOptions: accentPresets,
      userProfile,
      updateUserProfile,
      locationPermissionStatus,
      setLocationPermissionStatus,
      isDarkMode,
      setIsDarkMode: updateIsDarkMode,
      dreamyScrollIndicatorEnabled,
      setDreamyScrollIndicatorEnabled: updateDreamyScrollIndicatorEnabled,
      themeColors
    }),
    [
      showAddShortcut,
      updateShowAddShortcut,
      accentKey,
      updateAccentKey,
      accentPreset,
      userProfile,
      updateUserProfile,
      locationPermissionStatus,
      setLocationPermissionStatus,
      isDarkMode,
      updateIsDarkMode,
      dreamyScrollIndicatorEnabled,
      updateDreamyScrollIndicatorEnabled,
      themeColors
    ]
  );

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
