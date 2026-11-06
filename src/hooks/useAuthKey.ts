import { useEffect, useState } from 'react'
import { deriveAuthKey } from '../lib/cryptoUtil'

/** مفتاح الدخول المشتق من الرمز (يُحسب async بـ HKDF) — null لين يجهز. */
export function useAuthKey(token: string): string | null {
  const [state, setState] = useState<{ token: string; key: string } | null>(null)
  useEffect(() => {
    let alive = true
    deriveAuthKey(token).then((key) => alive && setState({ token, key }))
    return () => {
      alive = false
    }
  }, [token])
  return state?.token === token ? state.key : null
}
