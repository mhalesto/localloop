import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from 'react';
import { darkColors, lightColors } from '../constants/colors';
import { useAuth } from './AuthContext';

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
export const PREMIUM_ACCENT_BRIGHTNESS_RANGE = Object.freeze({ min: 0, max: 50 });
export const PREMIUM_ACCENT_SHADE_RANGE = Object.freeze({ min: 0, max: 100 });
export const PREMIUM_SUMMARY_LENGTH_OPTIONS = Object.freeze([
  {
    key: 'concise',
    label: 'Shorter',
    description: 'Keep things tight with highlight-level summaries.'
  },
  {
    key: 'balanced',
    label: 'Balanced',
    description: 'Blend brevity and context for everyday posts.'
  },
  {
    key: 'detailed',
    label: 'Longer',
    description: 'Preserve more nuance for multi-paragraph stories.'
  }
]);
const PREMIUM_SUMMARY_LENGTH_DEFAULT = 'balanced';

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

const clampChannel = (value) => Math.max(0, Math.min(255, Math.round(value)));

const lightenHex = (color, percent) => {
  const normalized = normalizeHex(color);
  if (!normalized) {
    return color;
  }
  const factor = percent / 100;
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  const mix = (channel) => clampChannel(channel + (255 - channel) * factor);
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
  const mix = (channel) => clampChannel(channel + (255 - channel) * factor);
  return `rgba(${mix(r)},${mix(g)},${mix(b)},${a})`;
};

const parseHexColor = (color) => {
  const normalized = normalizeHex(color);
  if (!normalized) {
    return null;
  }
  return {
    r: parseInt(normalized.slice(0, 2), 16),
    g: parseInt(normalized.slice(2, 4), 16),
    b: parseInt(normalized.slice(4, 6), 16)
  };
};

const parseRgbaColor = (color) => {
  if (typeof color !== 'string' || !color.startsWith('rgba')) {
    return null;
  }
  const match = color.match(/rgba\((\d+),(\d+),(\d+),(.*)\)/);
  if (!match) {
    return null;
  }
  const [, rRaw, gRaw, bRaw, aRaw] = match;
  return {
    r: Number(rRaw),
    g: Number(gRaw),
    b: Number(bRaw),
    a: Number(aRaw)
  };
};

const rgbToHex = ({ r, g, b }) =>
  `#${[r, g, b]
    .map((channel) => clampChannel(channel).toString(16).padStart(2, '0').toUpperCase())
    .join('')}`;

const toRgbaString = ({ r, g, b, a }) =>
  `rgba(${clampChannel(r)},${clampChannel(g)},${clampChannel(b)},${typeof a === 'number' ? a : 1})`;

const mixRgbTowards = (source, target, percent) => {
  const factor = percent / 100;
  return {
    r: clampChannel(source.r + (target.r - source.r) * factor),
    g: clampChannel(source.g + (target.g - source.g) * factor),
    b: clampChannel(source.b + (target.b - source.b) * factor),
    a: typeof source.a === 'number' ? source.a : undefined
  };
};

const mixHexTowards = (color, targetColor, percent) => {
  const source = parseHexColor(color);
  const target = parseHexColor(targetColor);
  if (!source || !target) {
    return color;
  }
  return rgbToHex(mixRgbTowards(source, target, percent));
};

const mixRgbaTowards = (color, targetColor, percent) => {
  const source = parseRgbaColor(color);
  if (!source) {
    return color;
  }
  const targetHex = parseHexColor(targetColor);
  const targetRgba = targetHex || parseRgbaColor(targetColor);
  if (!targetRgba) {
    return color;
  }
  const target = {
    r: targetRgba.r,
    g: targetRgba.g,
    b: targetRgba.b
  };
  const mixed = mixRgbTowards(source, target, percent);
  return toRgbaString({ ...mixed, a: source.a });
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

const applyShadeToPreset = (preset, shade) => {
  if (!shade) {
    return preset;
  }
  const targetColor = preset.buttonBackground ?? preset.background;
  if (typeof targetColor !== 'string') {
    return preset;
  }
  const fieldsToTint = ['background', 'badgeBackground', 'statCardBackground', 'iconBackground', 'iconBorder'];
  const next = { ...preset };
  fieldsToTint.forEach((field) => {
    const value = next[field];
    if (typeof value !== 'string') {
      return;
    }
    if (value.startsWith('#')) {
      next[field] = mixHexTowards(value, targetColor, shade);
    } else if (value.startsWith('rgba')) {
      next[field] = mixRgbaTowards(value, targetColor, shade);
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
  },
  {
    key: 'dreamyClouds',
    label: 'Dreamy Clouds',
    tier: 'premium',
    background: '#F9E6FF',
    isDark: false,
    onPrimary: '#4A225F',
    subtitleColor: '#7A4B89',
    metaColor: '#945F9D',
    iconTint: '#E36FB8',
    iconBorder: 'rgba(227,111,184,0.28)',
    iconBackground: 'rgba(255,255,255,0.25)',
    statCardBackground: 'rgba(227,111,184,0.16)',
    statValue: '#5C2F74',
    statLabel: 'rgba(74,34,95,0.72)',
    buttonBackground: '#E36FB8',
    buttonForeground: '#ffffff',
    badgeBackground: '#F9E6FF',
    badgeTextColor: '#5C2F74',
    linkColor: '#E36FB8',
    fabBackground: '#E36FB8',
    fabForeground: '#ffffff',
    backgroundStyle: {
      type: 'dreamyClouds',
      options: {
        baseColor: '#F9E6FF',
        cloudColors: ['rgba(255,255,255,0.75)', 'rgba(250,220,255,0.55)', 'rgba(255,255,255,0.35)'],
        animationDuration: 16000
      }
    }
  },
  {
    key: 'playfulShapes',
    label: 'Playful Shapes',
    tier: 'premium',
    background: '#ECE9FF',
    isDark: false,
    onPrimary: '#24184F',
    subtitleColor: '#4E3EA0',
    metaColor: '#6B5FB4',
    iconTint: '#7C6CDE',
    iconBorder: 'rgba(124,108,222,0.22)',
    iconBackground: 'rgba(255,255,255,0.22)',
    statCardBackground: 'rgba(124,108,222,0.15)',
    statValue: '#2A1C58',
    statLabel: 'rgba(36,24,79,0.7)',
    buttonBackground: '#7C6CDE',
    buttonForeground: '#ffffff',
    badgeBackground: '#ECE9FF',
    badgeTextColor: '#2A1C58',
    linkColor: '#7C6CDE',
    fabBackground: '#7C6CDE',
    fabForeground: '#ffffff',
    backgroundStyle: {
      type: 'playfulShapes',
      options: {
        baseColor: '#ECE9FF',
        palette: {
          backgroundAccent: 'rgba(255,255,255,0.65)',
          primary: '#ECB2DE',
          secondary: '#F6D5A5',
          tertiary: '#9DD4FF',
          quaternary: '#7BD8C6'
        }
      }
    }
  },
  {
    key: 'neonCitrus',
    label: 'Neon Citrus',
    tier: 'premium',
    background: '#F0FFD4',
    isDark: false,
    onPrimary: '#3A4408',
    subtitleColor: '#5E6D1A',
    metaColor: '#7A8636',
    iconTint: '#A7C410',
    iconBorder: 'rgba(167,196,16,0.30)',
    iconBackground: 'rgba(255,255,255,0.35)',
    statCardBackground: 'rgba(167,196,16,0.18)',
    statValue: '#6D8C0E',
    statLabel: 'rgba(58,68,8,0.68)',
    buttonBackground: '#A7C410',
    buttonForeground: '#2A3305',
    badgeBackground: '#F0FFD4',
    badgeTextColor: '#5E6D1A',
    linkColor: '#A7C410',
    fabBackground: '#A7C410',
    fabForeground: '#2A3305'
  },
  {
    key: 'auroraNight',
    label: 'Aurora Night',
    tier: 'premium',
    background: '#1E1547',
    isDark: true,
    onPrimary: '#ffffff',
    subtitleColor: 'rgba(255,255,255,0.85)',
    metaColor: 'rgba(255,255,255,0.75)',
    iconTint: '#A78EFF',
    iconBorder: 'rgba(167,142,255,0.35)',
    iconBackground: 'rgba(109,247,255,0.12)',
    statCardBackground: 'rgba(109,247,255,0.22)',
    statValue: '#6DF7FF',
    statLabel: 'rgba(255,255,255,0.82)',
    buttonBackground: '#6DF7FF',
    buttonForeground: '#0F0A2D',
    badgeBackground: '#6DF7FF',
    badgeTextColor: '#0F0A2D',
    linkColor: '#6DF7FF',
    fabBackground: '#6DF7FF',
    fabForeground: '#0F0A2D'
  },
  {
    key: 'liquidGeometry',
    label: 'Liquid Geometry',
    tier: 'premium',
    background: '#FFE8F5',
    isDark: false,
    onPrimary: '#4A1538',
    subtitleColor: '#7D2D5C',
    metaColor: '#9C4973',
    iconTint: '#E84FA8',
    iconBorder: 'rgba(232,79,168,0.28)',
    iconBackground: 'rgba(255,255,255,0.30)',
    statCardBackground: 'rgba(232,79,168,0.16)',
    statValue: '#B53782',
    statLabel: 'rgba(74,21,56,0.70)',
    buttonBackground: '#E84FA8',
    buttonForeground: '#ffffff',
    badgeBackground: '#FFE8F5',
    badgeTextColor: '#B53782',
    linkColor: '#E84FA8',
    fabBackground: '#E84FA8',
    fabForeground: '#ffffff',
    backgroundStyle: {
      type: 'liquidGeometry',
      options: {
        baseColor: '#FFE8F5',
        shapes: [
          {
            type: 'blob',
            color: 'rgba(255,182,229,0.55)',
            size: 180,
            wobbleIntensity: 12,
            animationDuration: 6000,
            shadow: 'rgba(232,79,168,0.25)'
          },
          {
            type: 'blob',
            color: 'rgba(232,79,168,0.42)',
            size: 140,
            wobbleIntensity: 15,
            animationDuration: 7500,
            shadow: 'rgba(181,55,130,0.22)'
          },
          {
            type: 'blob',
            color: 'rgba(255,255,255,0.65)',
            size: 120,
            wobbleIntensity: 10,
            animationDuration: 5500,
            shadow: 'rgba(0,0,0,0.08)'
          }
        ],
        enableGloss: true,
        enable3D: true
      }
    }
  },
  {
    key: 'floatingSpheres',
    label: 'Floating Spheres',
    tier: 'premium',
    background: '#E8F4FF',
    isDark: false,
    onPrimary: '#0A2E4D',
    subtitleColor: '#1E5280',
    metaColor: '#3D6B9A',
    iconTint: '#2B7FD9',
    iconBorder: 'rgba(43,127,217,0.32)',
    iconBackground: 'rgba(255,255,255,0.45)',
    statCardBackground: 'rgba(43,127,217,0.15)',
    statValue: '#1A5999',
    statLabel: 'rgba(10,46,77,0.72)',
    buttonBackground: '#2B7FD9',
    buttonForeground: '#ffffff',
    badgeBackground: '#E8F4FF',
    badgeTextColor: '#1A5999',
    linkColor: '#2B7FD9',
    fabBackground: '#2B7FD9',
    fabForeground: '#ffffff',
    backgroundStyle: {
      type: 'floatingSpheres',
      options: {
        baseColor: '#E8F4FF',
        spheres: [
          {
            type: 'sphere',
            gradient: ['#FFB84D', '#FF8C42'],
            size: 95,
            floatRange: 40,
            animationDuration: 8000,
            shadow: {
              color: 'rgba(255,140,66,0.35)',
              blur: 20,
              offsetY: 12
            }
          },
          {
            type: 'sphere',
            gradient: ['#6EC1E4', '#4A9FD8'],
            size: 75,
            floatRange: 55,
            animationDuration: 10000,
            shadow: {
              color: 'rgba(74,159,216,0.32)',
              blur: 18,
              offsetY: 10
            }
          },
          {
            type: 'sphere',
            gradient: ['#B57FE8', '#9B5FD8'],
            size: 110,
            floatRange: 35,
            animationDuration: 9000,
            shadow: {
              color: 'rgba(155,95,216,0.38)',
              blur: 22,
              offsetY: 14
            }
          },
          {
            type: 'sphere',
            gradient: ['#FF7B9C', '#FF5577'],
            size: 65,
            floatRange: 48,
            animationDuration: 7500,
            shadow: {
              color: 'rgba(255,85,119,0.30)',
              blur: 16,
              offsetY: 8
            }
          }
        ],
        enable3D: true,
        enableReflections: true,
        parallaxIntensity: 0.3
      }
    }
  }
];

export const accentPresets = [...baseAccentPresets, ...premiumAccentPresets];

const SettingsContext = createContext(null);

export function SettingsProvider({ children }) {
  const isDevBuild = __DEV__ === true;
  const defaultPremiumAccentKey = premiumAccentPresets[0]?.key ?? baseAccentPresets[0].key;
  const [showAddShortcut, setShowAddShortcut] = useState(true);
  const [accentKey, setAccentKey] = useState(
    isDevBuild ? defaultPremiumAccentKey : baseAccentPresets[0].key
  );
  const [baseAccentKey, setBaseAccentKey] = useState(baseAccentPresets[0].key);
  const [premiumAccentEnabled, setPremiumAccentEnabled] = useState(isDevBuild);
  const [premiumAccentKey, setPremiumAccentKey] = useState(defaultPremiumAccentKey);
  const [premiumAccentBrightness, setPremiumAccentBrightness] = useState(
    PREMIUM_ACCENT_BRIGHTNESS_RANGE.min
  );
  const [premiumAccentShade, setPremiumAccentShade] = useState(0);
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
  const [premiumSummaryLength, setPremiumSummaryLength] = useState(
    PREMIUM_SUMMARY_LENGTH_DEFAULT
  );
  const [userProfile, setUserProfile] = useState({
    nickname: '',
    country: '',
    province: '',
    city: '',
    avatarKey: 'default'
  });
  const { hasActivePremium } = useAuth();

  useEffect(() => {
    if (hasActivePremium || isDevBuild) {
      return;
    }
    setPremiumAccentEnabled(false);
    setAccentKey(baseAccentKey);
    setPremiumTypographyEnabled(false);
    setPremiumTitleFontSizeEnabled(false);
    setPremiumDescriptionFontSizeEnabled(false);
    setPremiumSummariesEnabled(false);
    setPremiumAccentShade(0);
  }, [hasActivePremium, baseAccentKey, isDevBuild]);

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
      if (!hasActivePremium && !isDevBuild && nextEnabled) {
        return;
      }
      setPremiumAccentEnabled(nextEnabled);
      setAccentKey(nextEnabled ? premiumAccentKey : baseAccentKey);
    },
    [hasActivePremium, baseAccentKey, premiumAccentKey, isDevBuild]
  );
  const updatePremiumAccentKey = useCallback(
    (key) => {
      setPremiumAccentKey(key);
      if (premiumAccentEnabled && (hasActivePremium || isDevBuild)) {
        setAccentKey(key);
      }
    },
    [premiumAccentEnabled, hasActivePremium, isDevBuild]
  );
  const updatePremiumAccentBrightness = useCallback(
    (value) => {
      if (!hasActivePremium && !isDevBuild) {
        return;
      }
      setPremiumAccentBrightness((prev) => {
        if (value === undefined || value === null) {
          return prev;
        }
        return clampWithinRange(value, PREMIUM_ACCENT_BRIGHTNESS_RANGE);
      });
    },
    [hasActivePremium, isDevBuild]
  );
  const updatePremiumAccentShade = useCallback(
    (value) => {
      if (!hasActivePremium && !isDevBuild) {
        return;
      }
      setPremiumAccentShade((prev) => {
        if (value === undefined || value === null) {
          return prev;
        }
        return clampWithinRange(value, PREMIUM_ACCENT_BRIGHTNESS_RANGE);
      });
    },
    [hasActivePremium, isDevBuild]
  );
  const updateIsDarkMode = useCallback((enabled) => setIsDarkMode(Boolean(enabled)), []);
  const updateDreamyScrollIndicatorEnabled = useCallback(
    (enabled) => setDreamyScrollIndicatorEnabled(Boolean(enabled)),
    []
  );
  const updatePremiumTypographyEnabled = useCallback(
    (enabled) => {
      const nextEnabled = Boolean(enabled);
      if (nextEnabled && !hasActivePremium) {
        return;
      }
      setPremiumTypographyEnabled(nextEnabled);
    },
    [hasActivePremium]
  );
  const updatePremiumTitleFontSizeEnabled = useCallback(
    (enabled) => {
      const nextEnabled = Boolean(enabled);
      if (nextEnabled && !hasActivePremium) {
        return;
      }
      setPremiumTitleFontSizeEnabled(nextEnabled);
    },
    [hasActivePremium]
  );
  const updatePremiumDescriptionFontSizeEnabled = useCallback(
    (enabled) => {
      const nextEnabled = Boolean(enabled);
      if (nextEnabled && !hasActivePremium) {
        return;
      }
      setPremiumDescriptionFontSizeEnabled(nextEnabled);
    },
    [hasActivePremium]
  );
  const updatePremiumSummariesEnabled = useCallback(
    (enabled) => {
      const nextEnabled = Boolean(enabled);
      if (nextEnabled && !hasActivePremium) {
        return;
      }
      setPremiumSummariesEnabled(nextEnabled);
    },
    [hasActivePremium]
  );
  const updatePremiumSummaryLength = useCallback((value) => {
    setPremiumSummaryLength(() => {
      const key = typeof value === 'string' ? value.toLowerCase() : '';
      const match = PREMIUM_SUMMARY_LENGTH_OPTIONS.find(
        (option) => option.key === key
      );
      if (match) {
        return match.key;
      }
      return PREMIUM_SUMMARY_LENGTH_DEFAULT;
    });
  }, []);
  const updatePremiumTitleFontSize = useCallback(
    (size) => {
      if (!hasActivePremium) {
        return;
      }
      setPremiumTitleFontSize((prev) => {
        if (size === undefined || size === null || Number.isNaN(Number(size))) {
          return prev;
        }
        return clampNumber(
          size,
          PREMIUM_TITLE_FONT_SIZE_RANGE.min,
          PREMIUM_TITLE_FONT_SIZE_RANGE.max
        );
      });
    },
    [hasActivePremium]
  );
  const updatePremiumDescriptionFontSize = useCallback(
    (size) => {
      if (!hasActivePremium) {
        return;
      }
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
    },
    [hasActivePremium]
  );
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
      const brightened = applyBrightnessToPreset(basePreset, premiumAccentBrightness);
      return applyShadeToPreset(brightened, premiumAccentShade);
    }
    return basePreset;
  }, [accentKey, premiumAccentBrightness, premiumAccentEnabled, premiumAccentShade]);
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
      premiumAccentShade,
      setPremiumAccentShade: updatePremiumAccentShade,
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
      premiumSummaryLength,
      setPremiumSummaryLength: updatePremiumSummaryLength,
      premiumSummaryLengthOptions: PREMIUM_SUMMARY_LENGTH_OPTIONS,
      themeColors,
      hasActivePremium
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
      premiumAccentShade,
      updatePremiumAccentShade,
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
      premiumSummaryLength,
      updatePremiumSummaryLength,
      themeColors,
      hasActivePremium
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
