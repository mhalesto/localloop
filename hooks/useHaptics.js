import { useCallback } from 'react';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/**
 * useHaptics - Provides haptic feedback helpers
 *
 * Available feedback types:
 * - light() - Subtle tap (button press, selection)
 * - medium() - Moderate tap (toggle, checkbox)
 * - heavy() - Strong tap (delete, important action)
 * - success() - Positive action (like, save, send)
 * - warning() - Cautionary action (undo)
 * - error() - Negative action (error, failed)
 * - selection() - Selection changed (scrolling through items)
 *
 * @param {boolean} enabled - Whether haptics are enabled (from settings)
 */
export default function useHaptics(enabled = true) {
  // Light tap - for subtle interactions
  const light = useCallback(() => {
    if (!enabled || Platform.OS === 'web') return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [enabled]);

  // Medium tap - for standard interactions
  const medium = useCallback(() => {
    if (!enabled || Platform.OS === 'web') return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, [enabled]);

  // Heavy tap - for important interactions
  const heavy = useCallback(() => {
    if (!enabled || Platform.OS === 'web') return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  }, [enabled]);

  // Success notification - positive feedback
  const success = useCallback(() => {
    if (!enabled || Platform.OS === 'web') return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [enabled]);

  // Warning notification - cautionary feedback
  const warning = useCallback(() => {
    if (!enabled || Platform.OS === 'web') return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  }, [enabled]);

  // Error notification - negative feedback
  const error = useCallback(() => {
    if (!enabled || Platform.OS === 'web') return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  }, [enabled]);

  // Selection changed - for scrolling/swiping
  const selection = useCallback(() => {
    if (!enabled || Platform.OS === 'web') return;
    Haptics.selectionAsync();
  }, [enabled]);

  return {
    light,
    medium,
    heavy,
    success,
    warning,
    error,
    selection,
  };
}
