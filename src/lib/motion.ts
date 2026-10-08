import type { CSSProperties } from 'react'

/** ترتيب ظهور متتابع (stagger) لعنصر يحمل الفئة qb-rise. */
export function rise(i: number): CSSProperties {
  return { '--i': Math.min(i, 10) } as CSSProperties
}

/** لون حالة الميزانية الموحّد: أخضر/Volt طبيعي، ذهبي ≥80٪، أحمر ≥100٪. */
export function budgetColor(pct: number): string {
  return pct >= 100 ? 'var(--color-expense)' : pct >= 80 ? 'var(--color-subscription)' : 'var(--color-accent)'
}
