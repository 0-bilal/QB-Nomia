import { useEffect, useState } from 'react'
import { disableBiometric, enableBiometric, isBiometricEnabled, isBiometricSupported } from '../lib/biometric'
import { ToggleRow } from './ToggleRow'

function FingerprintIcon() {
  return (
    <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3a7 7 0 0 1 7 7c0 2.5-.5 4-1 5" />
      <path d="M12 3a7 7 0 0 0-7 7c0 1.2.1 2.2.3 3" />
      <path d="M12 7a6 6 0 0 1 6 6c0 2-.4 3.5-1 4.7" />
      <path d="M12 7a6 6 0 0 0-6 6c0 2.8.7 4.5 1.5 5.7" />
      <path d="M12 11a2.5 2.5 0 0 1 2.5 2.5c0 2.3-.7 4-1.8 5.5" />
      <path d="M9.5 20c-.6-1-1-2.3-1-4a3.5 3.5 0 0 1 3.5-3.5" />
    </svg>
  )
}

/** يظهر فقط لو الجهاز/المتصفح يدعم WebAuthn Platform Authenticator فعليًا — يختفي تمامًا لو لا. */
export function BiometricToggleRow() {
  const [supported, setSupported] = useState<boolean | null>(null)
  const [enabled, setEnabled] = useState(isBiometricEnabled)
  const [busy, setBusy] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    isBiometricSupported().then(setSupported)
  }, [])

  if (supported !== true) return null

  async function handleToggle() {
    if (busy) return
    setErrorMsg('')
    if (enabled) {
      disableBiometric()
      setEnabled(false)
      return
    }
    setBusy(true)
    const ok = await enableBiometric()
    setBusy(false)
    if (ok) setEnabled(true)
    else setErrorMsg('تعذّر تفعيل البصمة — تأكد إن جهازك يدعمها وأعد المحاولة')
  }

  return (
    <ToggleRow
      icon={<FingerprintIcon />}
      label="فتح التطبيق ببصمة الإصبع"
      desc={busy ? 'جارٍ التفعيل...' : 'بديل سريع للرقم السري — يبقى متاحًا دائمًا كخيار احتياطي'}
      enabled={enabled}
      onToggle={handleToggle}
      busy={busy}
      errorMsg={errorMsg}
    />
  )
}
