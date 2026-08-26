import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PinPad } from '../../components/PinPad'
import { useAuth } from '../../state/AuthContext'
import { AppLogo } from '../../components/AppLogo'

export function PinSetupScreen() {
  const auth = useAuth()
  const navigate = useNavigate()
  const [digits, setDigits] = useState<4 | 6>(6)
  const [stage, setStage] = useState<'enter' | 'confirm'>('enter')
  const [firstPin, setFirstPin] = useState('')
  const [value, setValue] = useState('')
  const [error, setError] = useState(false)

  function handleDigit(d: string) {
    if (error || value.length >= digits) return
    const next = value + d
    setValue(next)
    if (next.length === digits) {
      if (stage === 'enter') {
        setFirstPin(next)
        setTimeout(() => {
          setValue('')
          setStage('confirm')
        }, 200)
      } else {
        if (next === firstPin) {
          auth.setup(next).then(() => navigate('/', { replace: true }))
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

  const canChangeLength = stage === 'enter' && value.length === 0

  return (
    <div className="flex h-full w-full flex-col items-center bg-[var(--color-bg)] px-7 pt-20 pb-10">
      <AppLogo />
      <div className="mb-1 mt-10 text-base font-semibold">
        {stage === 'enter' ? 'أنشئ رقمًا سريًا' : 'أكّد الرقم السري'}
      </div>
      <div className="mb-5 text-[12.5px] text-[var(--color-text-2)]">
        {error ? 'الرقمان غير متطابقين، حاول مرة أخرى' : `اختر ${digits} أرقام لحماية QB-Nomia`}
      </div>

      {canChangeLength && (
        <div className="mb-6 flex gap-2 rounded-2xl border border-[var(--color-border)] bg-[var(--color-void)] p-1.25">
          {([4, 6] as const).map((n) => (
            <button
              key={n}
              onClick={() => setDigits(n)}
              className="rounded-[14px] px-6 py-2 text-[13px] font-bold"
              style={digits === n ? { background: 'rgba(0,226,138,0.2)', color: 'var(--color-accent)' } : { color: 'var(--color-text-2)' }}
            >
              {n} أرقام
            </button>
          ))}
        </div>
      )}

      <div className="mt-auto">
        <PinPad digits={digits} value={value} onDigit={handleDigit} onBackspace={handleBackspace} disabled={error} />
      </div>
    </div>
  )
}
