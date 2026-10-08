import { useSyncExternalStore } from 'react'
import { getProfile, subscribeProfile, type UserProfile } from '../lib/profile'

/** الملف الشخصي الحالي — يتحدّث تلقائيًا بأي شاشة عند حفظه. */
export function useProfile(): UserProfile | null {
  return useSyncExternalStore(subscribeProfile, getProfile, getProfile)
}
