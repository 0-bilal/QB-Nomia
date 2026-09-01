import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PinPad } from '../../components/PinPad'
import { useAuth } from '../../state/AuthContext'
import { useData } from '../../state/DataContext'
import { AppLogo } from '../../components/AppLogo'
import { configuredDigits } from '../../lib/auth'
import { runBackgroundPull } from '../../lib/autoSync'
import { isBiometricEnabled, verifyBiometric } from '../../lib/biometric'
import { APP_VERSION } from '../../lib/version'

type Stage = 'input' | 'success'

function FingerprintIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3a7 7 0 0 1 7 7c0 2.5-.5 4-1 5" />
      <path d="M12 3a7 7 0 0 0-7 7c0 1.2.1 2.2.3 3" />
      <path d="M12 7a6 6 0 0 1 6 6c0 2-.4 3.5-1 4.7" />
      <path d="M12 7a6 6 0 0 0-6 6c0 2.8.7 4.5 1.5 5.7" />
      <path d="M12 11a2.5 2.5 0 0 1 2.5 2.5c0 2.3-.7 4-1.8 5.5" />
      <path d="M9.5 20c-.6-1-1-2.3-1-4a3.5 3.5 0 0 1 3.5-3.5" />
    </svg>
  )
}

export function PinLoginScreen() {
  const auth = useAuth()
  const { importSnapshot } = useData()
  const navigate = useNavigate()
  const digits = configuredDigits()
  const [value, setValue] = useState('')
  const [error, setError] = useState(false)
  const [stage, setStage] = useState<Stage>('input')
  const [biometricAvailable] = useState(isBiometricEnabled)
  const [biometricBusy, setBiometricBusy] = useState(false)
  const [biometricError, setBiometricError] = useState(false)

  async function handleBiometric() {
    if (biometricBusy || stage !== 'input') return
    setBiometricBusy(true)
    setBiometricError(false)
    const ok = await verifyBiometric()
    setBiometricBusy(false)
    if (ok) {
      auth.unlockWithBiometric()
      setStage('success')
      setTimeout(() => {
        navigate('/', { replace: true })
        runBackgroundPull(importSnapshot)
      }, 500)
    } else {
      setBiometricError(true)
      setTimeout(() => setBiometricError(false), 2500)
    }
  }

  useEffect(() => {
    if (biometricAvailable) handleBiometric()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleDigit(d: string) {
    if (stage !== 'input' || error || value.length >= digits) return
    const next = value + d
    setValue(next)
    if (next.length === digits) {
      const ok = await auth.login(next)
      if (ok) {
        setStage('success')
        setTimeout(() => {
          navigate('/', { replace: true })
          // يسحب أحدث نسخة من جوجل شيت بالخلفية بدل ما يحجب الدخول للتطبيق —
          // حالة السحب تظهر كشريط عائم أعلى الشاشة (SyncStatusBar).
          runBackgroundPull(importSnapshot)
        }, 500)
      } else {
        setError(true)
        setTimeout(() => {
          setError(false)
          setValue('')
        }, 700)
      }
    }
  }

  function handleBackspace() {
    if (stage !== 'input' || error) return
    setValue((v) => v.slice(0, -1))
  }

  return (
    <div className="relative flex h-full w-full flex-col items-center overflow-hidden bg-[var(--color-bg)]">
      <div
        className="pointer-events-none absolute -top-32 left-1/2 h-85 w-85 -translate-x-1/2 rounded-full blur-[10px]"
        style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.2) 0%, transparent 70%)', width: 340, height: 340 }}
      />

      <div className="relative flex h-full flex-col items-center px-7 pt-19 pb-10">
        <AppLogo />
        <div className="mb-2 mt-14 text-base font-semibold">أدخل الرقم السري</div>
        <div className="mb-9 text-[12.5px] text-[var(--color-text-3)]">
          {error ? 'رقم غير صحيح، حاول مرة أخرى' : biometricError ? 'تعذّر التحقق بالبصمة — جرّب الرقم السري' : 'لفتح تطبيق QB-Nomia'}
        </div>

        <div className="mt-auto">
          <PinPad digits={digits} value={value} onDigit={handleDigit} onBackspace={handleBackspace} disabled={stage !== 'input' || error} />
        </div>

        {biometricAvailable && (
          <button
            type="button"
            onClick={handleBiometric}
            disabled={biometricBusy || stage !== 'input'}
            className="qb-press mt-6 flex items-center gap-2 text-[12.5px] font-semibold text-[var(--color-accent)] disabled:opacity-50"
          >
            <FingerprintIcon />
            {biometricBusy ? 'جارٍ التحقق...' : 'افتح ببصمة الإصبع'}
          </button>
        )}

        <button
          type="button"
          onClick={() => auth.forgetPin()}
          className="mt-6 text-[12.5px] text-[var(--color-text-3)]"
        >
          هل نسيت الرقم السري؟
        </button>

        <div className="num mt-6 text-[10.5px] text-[var(--color-text-3)]">الإصدار {APP_VERSION}</div>
      </div>

      {stage === 'success' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-[var(--color-bg)]">
          <div
            className="flex h-19 w-19 items-center justify-center rounded-full shadow-[0_0_0_10px_rgba(255,255,255,0.1)]"
            style={{ background: 'linear-gradient(150deg, var(--color-accent), var(--color-accent-b))', width: 76, height: 76 }}
          >
            <svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="#0A0A0C" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="5,13 10,18 19,6" />
            </svg>
          </div>
          <div className="text-base font-bold">تم التحقق بنجاح</div>
        </div>
      )}
    </div>
  )
}
