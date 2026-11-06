import { useMemo, useSyncExternalStore } from 'react'
import { getConflictRaw, parseConflict, subscribeConflict, type SyncConflict } from '../lib/syncConflict'

/**
 * حالة تعارض المزامنة الحالية — تتحدّث لحظة اكتشافه أو حله. useSyncExternalStore يعيد قراءة
 * القيمة لحظة الاشتراك، فما يفوت تعارض انكشف بين أول رسم وتسجيل الاشتراك (يصير مع الرفع بعد الدخول مباشرة).
 */
export function useSyncConflict(): SyncConflict | null {
  const raw = useSyncExternalStore(subscribeConflict, getConflictRaw)
  return useMemo(() => parseConflict(raw), [raw])
}
