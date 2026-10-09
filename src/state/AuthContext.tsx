import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { hasPinConfigured, resetPin, setupPin, verifyPin } from '../lib/auth'
import { resumedFromUpdate } from '../lib/appUpdate'
import { shouldLockAfter } from '../lib/lockPrefs'
import { biometricPromptActive } from '../lib/biometric'

interface AuthContextValue {
  hasPin: boolean
  unlocked: boolean
  setup: (pin: string) => Promise<void>
  /** يستبدل الرقم السري الحالي بواحد جديد بدون مسح أي بيانات — الشاشة المستدعية مسؤولة عن التحقق من الرقم القديم أولًا (verifyPin). */
  changePin: (newPin: string) => Promise<void>
  login: (pin: string) => Promise<boolean>
  unlockWithBiometric: () => void
  lock: () => void
  forgetPin: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)


export function AuthProvider({ children }: { children: ReactNode }) {
  const [hasPin, setHasPin] = useState(hasPinConfigured)
  // بعد تحديث بدأه المستخدم من داخل التطبيق، إعادة التشغيل لا تطلب الرمز مرة ثانية (تصريح لمرة واحدة صالح لدقيقة).
  const [unlocked, setUnlocked] = useState(() => hasPinConfigured() && resumedFromUpdate())

  useEffect(() => {
    let hiddenAt: number | null = null
    // مهلة القفل (يختارها المستخدم من الأمان): الرجوع خلالها يفتح التطبيق مباشرة بدون تحقق.
    // نافذة البصمة الأصلية بالأندرويد تُخفي الصفحة لحظيًا — لا تُحسب مغادرة.
    function onVisibilityChange() {
      if (document.hidden) {
        hiddenAt = biometricPromptActive() ? null : Date.now()
        return
      }
      if (hiddenAt !== null) {
        const elapsed = Date.now() - hiddenAt
        hiddenAt = null
        if (shouldLockAfter(elapsed)) setUnlocked(false)
      }
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => document.removeEventListener('visibilitychange', onVisibilityChange)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      hasPin,
      unlocked,
      async setup(pin: string) {
        await setupPin(pin)
        setHasPin(true)
        setUnlocked(true)
      },
      async changePin(newPin: string) {
        await setupPin(newPin)
      },
      async login(pin: string) {
        const ok = await verifyPin(pin)
        if (ok) setUnlocked(true)
        return ok
      },
      unlockWithBiometric() {
        setUnlocked(true)
      },
      lock() {
        setUnlocked(false)
      },
      forgetPin() {
        resetPin()
        setHasPin(false)
        setUnlocked(false)
      },
    }),
    [hasPin, unlocked],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
