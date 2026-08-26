import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { hasPinConfigured, resetPin, setupPin, verifyPin } from '../lib/auth'

interface AuthContextValue {
  hasPin: boolean
  unlocked: boolean
  setup: (pin: string) => Promise<void>
  login: (pin: string) => Promise<boolean>
  lock: () => void
  forgetPin: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [hasPin, setHasPin] = useState(hasPinConfigured)
  const [unlocked, setUnlocked] = useState(false)

  useEffect(() => {
    function onVisibilityChange() {
      if (document.hidden) setUnlocked(false)
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
