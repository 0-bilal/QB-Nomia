import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PinPad } from '../../components/PinPad'
import { useAuth } from '../../state/AuthContext'
import { useData } from '../../state/DataContext'
import { AppLogo } from '../../components/AppLogo'
import { configuredDigits } from '../../lib/auth'
import { isSheetsSyncConfigured, pullFromSheets } from '../../lib/sheetsSync'

type Stage = 'input' | 'success' | 'loading-data'

export function PinLoginScreen() {
  const auth = useAuth()
  const { importSnapshot } = useData()
  const navigate = useNavigate()
  const digits = configuredDigits()
  const [value, setValue] = useState('')
  const [error, setError] = useState(false)
  const [stage, setStage] = useState<Stage>('input')

  async function handleDigit(d: string) {
    if (stage !== 'input' || error || value.length >= digits) return
    const next = value + d
    setValue(next)
    if (next.length === digits) {
      const ok = await auth.login(next)
      if (ok) {
        setStage('success')
        setTimeout(async () => {
          if (isSheetsSyncConfigured()) {
            setStage('loading-data')
            try {
              const snapshot = await pullFromSheets()
              importSnapshot(snapshot)
            } catch {
              // تعذّر السحب — نكمل بالبيانات المحلية الموجودة بدل ما نعلّق المستخدم
            }
          }
          navigate('/', { replace: true })
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
        style={{ background: 'radial-gradient(circle, rgba(0,226,138,0.2) 0%, transparent 70%)', width: 340, height: 340 }}
      />

      <div className="relative flex h-full flex-col items-center px-7 pt-19 pb-10">
        <AppLogo />
        <div className="mb-2 mt-14 text-base font-semibold">أدخل الرقم السري</div>
        <div className="mb-9 text-[12.5px] text-[var(--color-text-3)]">
          {error ? 'رقم غير صحيح، حاول مرة أخرى' : 'لفتح تطبيق QB-Nomia'}
        </div>

        <div className="mt-auto">
          <PinPad digits={digits} value={value} onDigit={handleDigit} onBackspace={handleBackspace} disabled={stage !== 'input' || error} />
        </div>

        <button
          type="button"
          onClick={() => auth.forgetPin()}
          className="mt-6 text-[12.5px] text-[var(--color-text-3)]"
        >
          هل نسيت الرقم السري؟
        </button>
      </div>

      {stage === 'success' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-[var(--color-bg)]">
          <div
            className="flex h-19 w-19 items-center justify-center rounded-full shadow-[0_0_0_10px_rgba(0,226,138,0.1)]"
            style={{ background: 'linear-gradient(150deg, var(--color-accent), var(--color-accent-b))', width: 76, height: 76 }}
          >
            <svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="#04140D" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="5,13 10,18 19,6" />
            </svg>
          </div>
          <div className="text-base font-bold">تم التحقق بنجاح</div>
        </div>
      )}

      {stage === 'loading-data' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-[var(--color-bg)]">
          <div
            className="h-10 w-10 animate-spin rounded-full border-[3px]"
            style={{ borderColor: 'rgba(255,255,255,0.12)', borderTopColor: 'var(--color-accent)' }}
          />
          <div className="text-[13.5px] font-semibold text-[var(--color-text-2)]">جاري تحميل بياناتك...</div>
        </div>
      )}
    </div>
  )
}
