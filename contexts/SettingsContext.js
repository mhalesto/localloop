import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState
} from 'react';
import { darkColors, lightColors } from '../constants/colors';

const clampNumber = (value, min, max) => {
  if (Number.isNaN(Number(value))) {
    return min;
  }
  return Math.min(max, Math.max(min, Math.round(Number(value))));
};

export const DEFAULT_TITLE_FONT_SIZE = 22;
export const DEFAULT_DESCRIPTION_FONT_SIZE = 18;
export const PREMIUM_TITLE_FONT_SIZE_RANGE = Object.freeze({ min: 18, max: 28 });
export const PREMIUM_DESCRIPTION_FONT_SIZE_RANGE = Object.freeze({ min: 16, max: 24 });
export const PREMIUM_ACCENT_BRIGHTNESS_RANGE = Object.freeze({ min: 0, max: 40 });

const clampWithinRange = (value, range) => {
  if (value === undefined || value === null || Number.isNaN(Number(value))) {
    return range.min;
  }
  return Math.min(range.max, Math.max(range.min, Math.round(Number(value))));
};

const normalizeHex = (hex) => {
  if (typeof hex !== 'string' || !hex.startsWith('#')) {
    return null;
  }
  const raw = hex.slice(1);
  if (raw.length === 3) {
    const r = raw[0];
    const g = raw[1];
    const b = raw[2];
    return `${r}${r}${g}${g}${b}${b}`.toUpperCase();
  }
  if (raw.length === 6) {
    return raw.toUpperCase();
  }
  return null;
};

const lightenHex = (color, percent) => {
  const normalized = normalizeHex(color);
  if (!normalized) {
    return color;
  }
  const factor = percent / 100;
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  const mix = (channel) => Math.round(channel + (255 - channel) * factor);
  const next = [mix(r), mix(g), mix(b)]
    .map((channel) => channel.toString(16).padStart(2, '0').toUpperCase())
    .join('');
  return `#${next}`;
};

const lightenRgba = (color, percent) => {
  if (typeof color !== 'string' || !color.startsWith('rgba')) {
    return color;
  }
  const match = color.match(/rgba\((\d+),(\d+),(\d+),(.*)\)/);
  if (!match) {
    return color;
  }
  const [, rRaw, gRaw, bRaw, aRaw] = match;
  const r = Number(rRaw);
  const g = Number(gRaw);
  const b = Number(bRaw);
  const a = aRaw.trim();
  const factor = percent / 100;
  const mix = (channel) => Math.round(channel + (255 - channel) * factor);
  return `rgba(${mix(r)},${mix(g)},${mix(b)},${a})`;
};

const applyBrightnessToPreset = (preset, brightness) => {
  if (!brightness) {
    return preset;
  }
  const fieldsToLighten = [
    'background',
    'buttonBackground',
    'badgeBackground',
    'fabBackground',
    'statCardBackground',
    'iconBackground',
    'iconBorder'
  ];
  const next = { ...preset };
  fieldsToLighten.forEach((field) => {
    const value = next[field];
    if (typeof value !== 'string') {
      return;
    }
    if (value.startsWith('#')) {
      next[field] = lightenHex(value, brightness);
    } else if (value.startsWith('rgba')) {
      next[field] = lightenRgba(value, brightness);
    }
  });
  return next;
};

export const baseAccentPresets = [
  {
    key: 'royal',
    label: 'Royal Purple',
    tier: 'base',
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
    tier: 'base',
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
    tier: 'base',
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
    tier: 'base',
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

export const premiumAccentPresets = [
  {
    key: 'sunrise',
    label: 'Sunrise Glow',
    tier: 'premium',
    background: '#FFD5A5',
    isDark: false,
    onPrimary: lightColors.textPrimary,
    subtitleColor: '#A65E2E',
    metaColor: '#8F7054',
    iconTint: '#FF7B2F',
    iconBorder: 'rgba(255,123,47,0.35)',
    iconBackground: '#ffffff',
    statCardBackground: 'rgba(255,123,47,0.12)',
    statValue: '#C25A1A',
    statLabel: lightColors.textSecondary,
    buttonBackground: '#FF7B2F',
    buttonForeground: '#ffffff',
    badgeBackground: '#FFD5A5',
    badgeTextColor: '#C25A1A',
    linkColor: '#FF7B2F',
    fabBackground: '#FF7B2F',
    fabForeground: '#ffffff'
  },
  {
    key: 'lagoon',
    label: 'Lagoon Drift',
    tier: 'premium',
    background: '#C1F1F4',
    isDark: false,
    onPrimary: lightColors.textPrimary,
    subtitleColor: '#0A6F75',
    metaColor: '#3D7F83',
    iconTint: '#0FA3AD',
    iconBorder: 'rgba(15,163,173,0.3)',
    iconBackground: '#ffffff',
    statCardBackground: 'rgba(15,163,173,0.12)',
    statValue: '#0B7F86',
    statLabel: lightColors.textSecondary,
    buttonBackground: '#0FA3AD',
    buttonForeground: '#ffffff',
    badgeBackground: '#C1F1F4',
    badgeTextColor: '#0B7F86',
    linkColor: '#0FA3AD',
    fabBackground: '#0FA3AD',
    fabForeground: '#ffffff'
  },
  {
    key: 'midnight',
    label: 'Midnight Velvet',
    tier: 'premium',
    background: '#1A1F3D',
    isDark: true,
    onPrimary: '#ffffff',
    subtitleColor: 'rgba(255,255,255,0.82)',
    metaColor: 'rgba(255,255,255,0.72)',
    iconTint: '#8EA9FF',
    iconBorder: 'rgba(142,169,255,0.32)',
    iconBackground: 'rgba(255,255,255,0.06)',
    statCardBackground: 'rgba(142,169,255,0.18)',
    statValue: '#ffffff',
    statLabel: 'rgba(255,255,255,0.8)',
    buttonBackground: '#8EA9FF',
    buttonForeground: '#1A1F3D',
    badgeBackground: '#8EA9FF',
    badgeTextColor: '#1A1F3D',
    linkColor: '#8EA9FF',
    fabBackground: '#8EA9FF',
    fabForeground: '#1A1F3D'
  },
  {
    key: 'ember',
    label: 'Ember Bloom',
    tier: 'premium',
    background: '#FFD0D0',
    isDark: false,
    onPrimary: lightColors.textPrimary,
    subtitleColor: '#B5423C',
    metaColor: '#995552',
    iconTint: '#E0493F',
    iconBorder: 'rgba(224,73,63,0.32)',
    iconBackground: '#ffffff',
    statCardBackground: 'rgba(224,73,63,0.12)',
    statValue: '#C53730',
    statLabel: lightColors.textSecondary,
    buttonBackground: '#E0493F',
    buttonForeground: '#ffffff',
    badgeBackground: '#FFD0D0',
    badgeTextColor: '#C53730',
    linkColor: '#E0493F',
    fabBackground: '#E0493F',
    fabForeground: '#ffffff'
  },
  {
    key: 'grove',
    label: 'Evergreen Grove',
    tier: 'premium',
    background: '#CFEFD5',
    isDark: false,
    onPrimary: lightColors.textPrimary,
    subtitleColor: '#256F43',
    metaColor: '#4A7B5A',
    iconTint: '#3AA365',
    iconBorder: 'rgba(58,163,101,0.28)',
    iconBackground: '#ffffff',
    statCardBackground: 'rgba(58,163,101,0.13)',
    statValue: '#2C7F4F',
    statLabel: lightColors.textSecondary,
    buttonBackground: '#3AA365',
    buttonForeground: '#ffffff',
    badgeBackground: '#CFEFD5',
    badgeTextColor: '#2C7F4F',
    linkColor: '#3AA365',
    fabBackground: '#3AA365',
    fabForeground: '#ffffff'
  },
  {
    key: 'sapphire',
    label: 'Soft Sapphire',
    tier: 'premium',
    background: '#C9D6FF',
    isDark: false,
    onPrimary: lightColors.textPrimary,
    subtitleColor: '#2F4D9A',
    metaColor: '#5667A6',
    iconTint: '#4562C7',
    iconBorder: 'rgba(69,98,199,0.28)',
    iconBackground: '#ffffff',
    statCardBackground: 'rgba(69,98,199,0.14)',
    statValue: '#2F4D9A',
    statLabel: lightColors.textSecondary,
    buttonBackground: '#4562C7',
    buttonForeground: '#ffffff',
    badgeBackground: '#C9D6FF',
    badgeTextColor: '#2F4D9A',
    linkColor: '#4562C7',
    fabBackground: '#4562C7',
    fabForeground: '#ffffff'
  }
];

export const accentPresets = [...baseAccentPresets, ...premiumAccentPresets];

const SettingsContext = createContext(null);

export function SettingsProvider({ children }) {
  const [showAddShortcut, setShowAddShortcut] = useState(true);
  const [accentKey, setAccentKey] = useState(baseAccentPresets[0].key);
  const [baseAccentKey, setBaseAccentKey] = useState(baseAccentPresets[0].key);
  const [premiumAccentEnabled, setPremiumAccentEnabled] = useState(false);
  const [premiumAccentKey, setPremiumAccentKey] = useState(
    premiumAccentPresets[0]?.key ?? baseAccentPresets[0].key
  );
  const [premiumAccentBrightness, setPremiumAccentBrightness] = useState(
    PREMIUM_ACCENT_BRIGHTNESS_RANGE.min
  );
  const [locationPermissionStatus, setLocationPermissionStatus] = useState('undetermined');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [dreamyScrollIndicatorEnabled, setDreamyScrollIndicatorEnabled] = useState(false);
  const [premiumTypographyEnabled, setPremiumTypographyEnabled] = useState(false);
  const [premiumTitleFontSizeEnabled, setPremiumTitleFontSizeEnabled] = useState(false);
  const [premiumDescriptionFontSizeEnabled, setPremiumDescriptionFontSizeEnabled] = useState(false);
  const [premiumTitleFontSize, setPremiumTitleFontSize] = useState(DEFAULT_TITLE_FONT_SIZE);
  const [premiumDescriptionFontSize, setPremiumDescriptionFontSize] = useState(
    DEFAULT_DESCRIPTION_FONT_SIZE
  );
  const [premiumSummariesEnabled, setPremiumSummariesEnabled] = useState(false);
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
  const updateAccentKey = useCallback(
    (key) => {
      setBaseAccentKey(key);
      setAccentKey(key);
      setPremiumAccentEnabled(false);
    },
    []
  );
  const updatePremiumAccentEnabled = useCallback(
    (enabled) => {
      const nextEnabled = Boolean(enabled);
      setPremiumAccentEnabled(nextEnabled);
      setAccentKey(nextEnabled ? premiumAccentKey : baseAccentKey);
    },
    [baseAccentKey, premiumAccentKey]
  );
  const updatePremiumAccentKey = useCallback(
    (key) => {
      setPremiumAccentKey(key);
      if (premiumAccentEnabled) {
        setAccentKey(key);
      }
    },
    [premiumAccentEnabled]
  );
  const updatePremiumAccentBrightness = useCallback((value) => {
    setPremiumAccentBrightness((prev) => {
      if (value === undefined || value === null) {
        return prev;
      }
      return clampWithinRange(value, PREMIUM_ACCENT_BRIGHTNESS_RANGE);
    });
  }, []);
  const updateIsDarkMode = useCallback((enabled) => setIsDarkMode(Boolean(enabled)), []);
  const updateDreamyScrollIndicatorEnabled = useCallback(
    (enabled) => setDreamyScrollIndicatorEnabled(Boolean(enabled)),
    []
  );
  const updatePremiumTypographyEnabled = useCallback(
    (enabled) => setPremiumTypographyEnabled(Boolean(enabled)),
    []
  );
  const updatePremiumTitleFontSizeEnabled = useCallback(
    (enabled) => setPremiumTitleFontSizeEnabled(Boolean(enabled)),
    []
  );
  const updatePremiumDescriptionFontSizeEnabled = useCallback(
    (enabled) => setPremiumDescriptionFontSizeEnabled(Boolean(enabled)),
    []
  );
  const updatePremiumSummariesEnabled = useCallback(
    (enabled) => setPremiumSummariesEnabled(Boolean(enabled)),
    []
  );
  const updatePremiumTitleFontSize = useCallback((size) => {
    setPremiumTitleFontSize((prev) => {
      if (size === undefined || size === null || Number.isNaN(Number(size))) {
        return prev;
      }
      return clampNumber(size, PREMIUM_TITLE_FONT_SIZE_RANGE.min, PREMIUM_TITLE_FONT_SIZE_RANGE.max);
    });
  }, []);
  const updatePremiumDescriptionFontSize = useCallback((size) => {
    setPremiumDescriptionFontSize((prev) => {
      if (size === undefined || size === null || Number.isNaN(Number(size))) {
        return prev;
      }
      return clampNumber(
        size,
        PREMIUM_DESCRIPTION_FONT_SIZE_RANGE.min,
        PREMIUM_DESCRIPTION_FONT_SIZE_RANGE.max
      );
    });
  }, []);
  const updateUserProfile = useCallback(
    (patch) =>
      setUserProfile((prev) => ({
        ...prev,
        ...patch
      })),
    []
  );

  const accentPreset = useMemo(() => {
    const basePreset = accentPresets.find((preset) => preset.key === accentKey) ?? accentPresets[0];
    const isPremiumPreset = premiumAccentPresets.some((preset) => preset.key === basePreset.key);
    if (premiumAccentEnabled && isPremiumPreset) {
      return applyBrightnessToPreset(basePreset, premiumAccentBrightness);
    }
    return basePreset;
  }, [accentKey, premiumAccentBrightness, premiumAccentEnabled]);
  const themeColors = isDarkMode ? darkColors : lightColors;

  const value = useMemo(
    () => ({
      showAddShortcut,
      setShowAddShortcut: updateShowAddShortcut,
      accentKey,
      setAccentKey: updateAccentKey,
      accentPreset,
      accentOptions: baseAccentPresets,
      premiumAccentOptions: premiumAccentPresets,
      premiumAccentEnabled,
      setPremiumAccentEnabled: updatePremiumAccentEnabled,
      premiumAccentKey,
      setPremiumAccentKey: updatePremiumAccentKey,
      premiumAccentBrightness,
      setPremiumAccentBrightness: updatePremiumAccentBrightness,
      userProfile,
      updateUserProfile,
      locationPermissionStatus,
      setLocationPermissionStatus,
      isDarkMode,
      setIsDarkMode: updateIsDarkMode,
      dreamyScrollIndicatorEnabled,
      setDreamyScrollIndicatorEnabled: updateDreamyScrollIndicatorEnabled,
      premiumTypographyEnabled,
      setPremiumTypographyEnabled: updatePremiumTypographyEnabled,
      premiumTitleFontSizeEnabled,
      setPremiumTitleFontSizeEnabled: updatePremiumTitleFontSizeEnabled,
      premiumDescriptionFontSizeEnabled,
      setPremiumDescriptionFontSizeEnabled: updatePremiumDescriptionFontSizeEnabled,
      premiumTitleFontSize,
      setPremiumTitleFontSize: updatePremiumTitleFontSize,
      premiumDescriptionFontSize,
      setPremiumDescriptionFontSize: updatePremiumDescriptionFontSize,
      premiumSummariesEnabled,
      setPremiumSummariesEnabled: updatePremiumSummariesEnabled,
      themeColors
    }),
    [
      showAddShortcut,
      updateShowAddShortcut,
      accentKey,
      updateAccentKey,
      accentPreset,
      premiumAccentEnabled,
      updatePremiumAccentEnabled,
      premiumAccentKey,
      updatePremiumAccentKey,
      premiumAccentBrightness,
      updatePremiumAccentBrightness,
      userProfile,
      updateUserProfile,
      locationPermissionStatus,
      setLocationPermissionStatus,
      isDarkMode,
      updateIsDarkMode,
      dreamyScrollIndicatorEnabled,
      updateDreamyScrollIndicatorEnabled,
      premiumTypographyEnabled,
      updatePremiumTypographyEnabled,
      premiumTitleFontSizeEnabled,
      updatePremiumTitleFontSizeEnabled,
      premiumDescriptionFontSizeEnabled,
      updatePremiumDescriptionFontSizeEnabled,
      premiumTitleFontSize,
      updatePremiumTitleFontSize,
      premiumDescriptionFontSize,
      updatePremiumDescriptionFontSize,
      premiumSummariesEnabled,
      updatePremiumSummariesEnabled,
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
