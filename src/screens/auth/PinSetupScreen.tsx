import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PinPad } from '../../components/PinPad'
import { useAuth } from '../../state/AuthContext'
import { useData } from '../../state/DataContext'
import { AppLogo } from '../../components/AppLogo'
import { isSheetsSyncConfigured, pullFromSheets } from '../../lib/sheetsSync'

const DIGITS = 4

export function PinSetupScreen() {
  const auth = useAuth()
  const { importSnapshot } = useData()
  const navigate = useNavigate()
  const [stage, setStage] = useState<'enter' | 'confirm' | 'loading-data'>('enter')
  const [firstPin, setFirstPin] = useState('')
  const [value, setValue] = useState('')
  const [error, setError] = useState(false)

  function handleDigit(d: string) {
    if (error || stage === 'loading-data') return
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
          auth.setup(next).then(async () => {
            if (isSheetsSyncConfigured()) {
              setStage('loading-data')
              try {
                const snapshot = await pullFromSheets()
                importSnapshot(snapshot)
              } catch {
                // تعذّر السحب — نكمل بحساب جديد فارغ بدل ما نعلّق المستخدم
              }
            }
            navigate('/', { replace: true })
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
    if (error || stage === 'loading-data') return
    setValue((v) => v.slice(0, -1))
  }

  if (stage === 'loading-data') {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-4 bg-[var(--color-bg)]">
        <div
          className="h-10 w-10 animate-spin rounded-full border-[3px]"
          style={{ borderColor: 'rgba(255,255,255,0.12)', borderTopColor: 'var(--color-accent)' }}
        />
        <div className="text-[13.5px] font-semibold text-[var(--color-text-2)]">جاري تحميل بياناتك...</div>
      </div>
    )
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
