import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PinPad } from '../../components/PinPad'
import { useAuth } from '../../state/AuthContext'
import { AppLogo } from '../../components/AppLogo'

const DIGITS = 6

export function PinSetupScreen() {
  const auth = useAuth()
  const navigate = useNavigate()
  const [stage, setStage] = useState<'enter' | 'confirm'>('enter')
  const [firstPin, setFirstPin] = useState('')
  const [value, setValue] = useState('')
  const [error, setError] = useState(false)

  function handleDigit(d: string) {
    if (error || value.length >= DIGITS) return
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

  return (
    <div className="flex h-full w-full flex-col items-center bg-[var(--color-bg)] px-7 pt-20 pb-10">
      <AppLogo />
      <div className="mb-1 mt-10 text-base font-semibold">
        {stage === 'enter' ? 'أنشئ رقمًا سريًا' : 'أكّد الرقم السري'}
      </div>
      <div className="mb-9 text-[12.5px] text-[var(--color-text-2)]">
        {error ? 'الرقمان غير متطابقين، حاول مرة أخرى' : `اختر ${DIGITS} أرقام لحماية QB-Nomia`}
      </div>

      <div className="mt-auto">
        <PinPad digits={DIGITS} value={value} onDigit={handleDigit} onBackspace={handleBackspace} disabled={error} />
      </div>
    </div>
  )
}
