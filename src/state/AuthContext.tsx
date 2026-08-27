import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { hasPinConfigured, resetPin, setupPin, verifyPin } from '../lib/auth'

interface AuthContextValue {
  hasPin: boolean
  unlocked: boolean
  setup: (pin: string) => Promise<void>
  login: (pin: string) => Promise<boolean>
  unlockWithBiometric: () => void
  lock: () => void
  forgetPin: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

// مهلة سماح قبل القفل التلقائي عند مغادرة التطبيق: خروج/تبديل تطبيقات سريع
// (لحظات) ما يطلب الرقم السري من جديد، بعكس غياب أطول فعليًا عن التطبيق.
const LOCK_AFTER_HIDDEN_MS = 5 * 60 * 1000

export function AuthProvider({ children }: { children: ReactNode }) {
  const [hasPin, setHasPin] = useState(hasPinConfigured)
  const [unlocked, setUnlocked] = useState(false)

  useEffect(() => {
    let hiddenAt: number | null = null
    function onVisibilityChange() {
      if (document.hidden) {
        hiddenAt = Date.now()
        return
      }
      if (hiddenAt !== null) {
        const elapsed = Date.now() - hiddenAt
        hiddenAt = null
        if (elapsed >= LOCK_AFTER_HIDDEN_MS) setUnlocked(false)
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
