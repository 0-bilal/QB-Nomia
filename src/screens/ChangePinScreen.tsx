import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PinPad } from '../components/PinPad'
import { ScreenHeader } from '../components/ScreenHeader'
import { useAuth } from '../state/AuthContext'
import { configuredDigits, verifyPin } from '../lib/auth'

type Stage = 'verify' | 'enter' | 'confirm'

const TITLES: Record<Stage, string> = {
  verify: 'أدخل رقمك السري الحالي',
  enter: 'أنشئ رقمًا سريًا جديدًا',
  confirm: 'أكّد الرقم السري الجديد',
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="4,12 9,17 20,6" />
    </svg>
  )
}

/** تغيير الرقم السري: تحقّق من الرقم الحالي أولًا، ثم إدخال وتأكيد رقم جديد — بدون مسح أي بيانات (بعكس "نسيت الرقم السري"). */
export function ChangePinScreen() {
  const auth = useAuth()
  const navigate = useNavigate()
  const digits = configuredDigits()
  const [stage, setStage] = useState<Stage>('verify')
  const [firstPin, setFirstPin] = useState('')
  const [value, setValue] = useState('')
  const [error, setError] = useState(false)
  const [done, setDone] = useState(false)

  function resetToStage(next: Stage, clearFirst = false) {
    setValue('')
    if (clearFirst) setFirstPin('')
    setStage(next)
  }

  function showError() {
    setError(true)
    setTimeout(() => {
      setError(false)
      setValue('')
    }, 900)
  }

  function handleDigit(d: string) {
    if (error || done) return
    if (value.length >= digits) return
    const next = value + d
    setValue(next)
    if (next.length !== digits) return

    if (stage === 'verify') {
      verifyPin(next).then((ok) => {
        if (ok) setTimeout(() => resetToStage('enter'), 150)
        else showError()
      })
      return
    }

    if (stage === 'enter') {
      setFirstPin(next)
      setTimeout(() => resetToStage('confirm'), 200)
      return
    }

    // confirm
    if (next === firstPin) {
      auth.changePin(next).then(() => {
        setDone(true)
        setTimeout(() => navigate(-1), 1100)
      })
    } else {
      setError(true)
      setTimeout(() => {
        setError(false)
        resetToStage('enter', true)
      }, 900)
    }
  }

  function handleBackspace() {
    if (error || done) return
    setValue((v) => v.slice(0, -1))
  }

  return (
    <div dir="rtl" className="flex h-full w-full flex-col overflow-hidden bg-[var(--color-bg)]">
      <ScreenHeader title="تغيير الرقم السري" onBack={() => navigate(-1)} className="pt-8 pb-5" />
      <div className="flex flex-1 flex-col items-center px-7 pb-10">
        {done ? (
          <div className="mt-28 flex flex-col items-center gap-3">
            <div
              className="flex h-16 w-16 items-center justify-center rounded-full"
              style={{ background: 'rgba(34,197,94,0.14)', color: 'var(--color-income)' }}
            >
              <CheckIcon />
            </div>
            <div className="text-[14px] font-bold">تم تغيير الرقم السري</div>
          </div>
        ) : (
          <>
            <div className="mb-1 mt-10 text-base font-semibold">{TITLES[stage]}</div>
            <div className="mb-9 text-[12.5px] text-[var(--color-text-2)]">
              {error
                ? stage === 'verify'
                  ? 'رقم غير صحيح، حاول مرة أخرى'
                  : 'الرقمان غير متطابقين، حاول مرة أخرى'
                : stage === 'verify'
                  ? 'للتحقق من هويتك قبل التغيير'
                  : stage === 'enter'
                    ? `اختر ${digits} أرقام جديدة`
                    : 'أدخل نفس الرقم الجديد مرة أخرى'}
            </div>
            <div className="mt-auto">
              <PinPad digits={digits} value={value} onDigit={handleDigit} onBackspace={handleBackspace} disabled={error} />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
