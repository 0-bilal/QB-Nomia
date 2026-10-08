/**
 * اهتزاز لمسي خفيف (Vibration API) لتأكيد الإيماءات — سحب يتجاوز العتبة، اختيار
 * اختصار، نجاح عملية. يتجاهل بصمت أي متصفح ما يدعمه (iOS Safari مثلًا).
 */
export type HapticKind = 'tick' | 'select' | 'success' | 'warning'

const PATTERNS: Record<HapticKind, number | number[]> = {
  tick: 6,
  select: 12,
  success: [10, 40, 18],
  warning: [20, 50, 20],
}

export function haptic(kind: HapticKind = 'tick'): void {
  try {
    navigator.vibrate?.(PATTERNS[kind])
  } catch {
    // بعض المتصفحات ترمي استثناء بدل ما تتجاهل — ما يهم.
  }
}
