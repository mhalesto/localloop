export const buildDreamyAccent = (accentPreset, palette = {}) => {
  const primary = accentPreset?.buttonBackground ?? palette.primary ?? '#7E5AFF';
  const secondary = accentPreset?.linkColor ?? palette.primaryDark ?? '#FF7ED4';
  const glow = accentPreset?.buttonShadow ?? 'rgba(255,255,255,0.3)';

  return {
    primary,
    secondary,
    glow,
    gradient: [primary, secondary],
    softGradient: [secondary, primary],
    bubble: 'rgba(255,255,255,0.08)',
    outline: 'rgba(255,255,255,0.2)',
  };
};
