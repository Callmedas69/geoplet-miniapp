/**
 * Mobile Haptic Feedback Utility
 * Provides tactile feedback for user interactions
 */

type HapticType = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error';

export const triggerHaptic = (type: HapticType = 'light') => {
  // Check if Vibration API is supported
  if (typeof window !== 'undefined' && 'vibrate' in navigator) {
    const patterns: Record<HapticType, number | number[]> = {
      light: 10,
      medium: 20,
      heavy: 30,
      success: [10, 50, 10],
      warning: [20, 100, 20],
      error: [50, 100, 50],
    };

    try {
      navigator.vibrate(patterns[type]);
    } catch (error) {
      // Silently fail if vibration not supported
      console.debug('Haptic feedback not supported:', error);
    }
  }
};

/**
 * Wrapper for common haptic actions
 */
export const haptics = {
  tap: () => triggerHaptic('light'),
  success: () => triggerHaptic('success'),
  error: () => triggerHaptic('error'),
  warning: () => triggerHaptic('warning'),
  press: () => triggerHaptic('medium'),
  longPress: () => triggerHaptic('heavy'),
};
