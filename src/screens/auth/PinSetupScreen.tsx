import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PinPad } from '../../components/PinPad'
import { useAuth } from '../../state/AuthContext'
import { useData } from '../../state/DataContext'
import { AppLogo } from '../../components/AppLogo'
import { runBackgroundPull } from '../../lib/autoSync'
import { isProfileOnboarded } from '../../lib/profile'

const DIGITS = 4

export function PinSetupScreen() {
  const auth = useAuth()
  const { importSnapshot } = useData()
  const navigate = useNavigate()
  const [stage, setStage] = useState<'enter' | 'confirm'>('enter')
  const [firstPin, setFirstPin] = useState('')
  const [value, setValue] = useState('')
  const [error, setError] = useState(false)

  function handleDigit(d: string) {
    if (error) return
    if (value.length >= DIGITS) return
    const next = value + d
    setValue(next)
    if (next.length === DIGITS) {
      if (stage === 'enter') {
        setFirstPin(next)
        setTimeout(() => {
          setValue('')
          setStage('confirm')
        }, 200)
      } else {
        if (next === firstPin) {
          auth.setup(next).then(() => {
            // أول تشغيل: "عرّفنا بنفسك" (مرة واحدة، قابلة للتخطي) قبل الرئيسية.
            navigate(isProfileOnboarded() ? '/' : '/welcome', { replace: true })
            // يسحب أحدث نسخة من جوجل شيت بالخلفية بدل ما يحجب الدخول للتطبيق —
            // حالة السحب تظهر كشريط عائم أعلى الشاشة (IslandHost).
            runBackgroundPull(importSnapshot)
          })
        } else {
          setError(true)
          setTimeout(() => {
            setError(false)
            setValue('')
            setFirstPin('')
            setStage('enter')
          }, 900)
        }
      }
    }
  }

  function handleBackspace() {
    if (error) return
    setValue((v) => v.slice(0, -1))
  }

  return (
    <div className="relative isolate flex h-full w-full flex-col items-center overflow-hidden bg-[var(--color-bg)] px-7 pb-10 pt-20">
      <div className="qb-aurora" aria-hidden="true" />
      <div className="qb-rise relative z-10 flex flex-col items-center">
        <AppLogo />
        <div className="mt-10 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1 text-[11.5px] font-medium text-[var(--color-text-2)]">
          الخطوة {stage === 'enter' ? '1' : '2'} من 2
        </div>
        <div className="mb-1 mt-4 text-[19px] font-semibold">{stage === 'enter' ? 'أنشئ رقمًا سريًا' : 'أكّد الرقم السري'}</div>
        <div className="text-[13px]" style={{ color: error ? 'var(--color-expense)' : 'var(--color-text-2)' }}>
          {error ? 'الرقمان غير متطابقين، حاول مرة أخرى' : `اختر ${DIGITS} أرقام لحماية QB-Nomia`}
        </div>
      </div>

      <div className="relative z-10 mt-auto">
        <PinPad digits={DIGITS} value={value} onDigit={handleDigit} onBackspace={handleBackspace} disabled={error} error={error} />
      </div>
    </div>
  )
}
