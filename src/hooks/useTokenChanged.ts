import { useSyncExternalStore } from 'react'
import { getTokenChangedRaw, subscribeTokenChanged } from '../lib/syncAuth'

/** هل السكربت رفض رمز هذا الجهاز (تحدّثت الحماية من جهاز ثاني)؟ */
export function useTokenChanged(): boolean {
  return useSyncExternalStore(subscribeTokenChanged, getTokenChangedRaw) === '1'
}
