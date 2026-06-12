/** Lightweight haptic feedback (no-op where unsupported). */
export function useHaptic() {
  const fire = (pattern = 8) => {
    try {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(pattern)
      }
    } catch {
      /* ignore */
    }
  }
  return {
    light: () => fire(8),
    medium: () => fire(16),
    success: () => fire([10, 30, 14]),
    warn: () => fire([20, 40, 20]),
  }
}
