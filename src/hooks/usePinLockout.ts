import { useCallback, useEffect, useState } from 'react'
import { pinLockoutRemainingMs } from '../lib/auth'

/** مهلة الانتظار بعد المحاولات الخاطئة: الباقي بالملي ثانية (يتحدّث كل ثانية لين تنتهي) + `refresh` بعد كل محاولة. */
export function usePinLockout() {
  const [remainingMs, setRemainingMs] = useState(() => pinLockoutRemainingMs())
  useEffect(() => {
    if (remainingMs <= 0) return
    const id = window.setTimeout(() => setRemainingMs(pinLockoutRemainingMs()), Math.min(1000, remainingMs))
    return () => window.clearTimeout(id)
  }, [remainingMs])
  const refresh = useCallback(() => setRemainingMs(pinLockoutRemainingMs()), [])
  return { remainingMs, lockedOut: remainingMs > 0, refresh }
}
