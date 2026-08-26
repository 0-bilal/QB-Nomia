import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useData } from '../state/DataContext'
import { ScreenScroll } from '../components/ScreenScroll'
import type { AccountType } from '../types'

const TYPE_OPTIONS: [AccountType, string][] = [
  ['cash', 'كاش'],
  ['bank', 'بنكي'],
  ['savings', 'ادخار'],
  ['wallet', 'محفظة رقمية'],
]

export function AddAccountScreen() {
  const { addAccount } = useData()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const initialType = (searchParams.get('type') as AccountType) || 'wallet'

  const [name, setName] = useState('')
  const [type, setType] = useState<AccountType>(initialType)
  const [balance, setBalance] = useState('')
  const [goalAmount, setGoalAmount] = useState('')
  const [goalLabel, setGoalLabel] = useState('')

  const canSave = name.trim().length > 0

  function handleSave() {
    if (!canSave) return
    addAccount({
      name,
      type,
      balance: balance ? Number(balance) : 0,
      goalAmount: type === 'savings' && goalAmount ? Number(goalAmount) : undefined,
      goalLabel: type === 'savings' && goalLabel ? goalLabel : undefined,
    })
    navigate('/accounts', { replace: true })
  }

  return (
    <ScreenScroll
      header={
        <div className="safe-top flex items-center justify-between px-5 pt-8 pb-6">
          <button onClick={() => navigate(-1)} className="text-[13px] text-[var(--color-text-2)]">
            إلغاء
          </button>
          <div className="text-base font-bold">إضافة حساب</div>
          <div className="w-10" />
        </div>
      }
      footer={
        <div className="px-5 pb-6 pt-3">
          <button
            onClick={handleSave}
            disabled={!canSave}
            className="w-full rounded-2xl py-3.5 text-center text-[14.5px] font-bold text-[#04140D] disabled:opacity-40"
            style={{ background: 'var(--color-accent)' }}
          >
            حفظ الحساب
          </button>
        </div>
      }
    >
      <label className="mb-1.5 block text-[12.5px] font-semibold text-[var(--color-text-2)]">اسم الحساب</label>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="مثال: محفظة Google Play"
        className="mb-5 w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-[14px] outline-none placeholder:text-[var(--color-text-3)]"
      />

      <label className="mb-1.5 block text-[12.5px] font-semibold text-[var(--color-text-2)]">نوع الحساب</label>
      <div className="mb-5 flex flex-wrap gap-2">
        {TYPE_OPTIONS.map(([t, label]) => (
          <button
            key={t}
            onClick={() => setType(t)}
            className="rounded-full px-4 py-2 text-[12.5px] font-semibold"
            style={
              type === t
                ? { background: 'rgba(0,226,138,0.18)', color: 'var(--color-accent)' }
                : { background: 'var(--color-surface)', color: 'var(--color-text-2)', border: '1px solid var(--color-border)' }
            }
          >
            {label}
          </button>
        ))}
      </div>

      <label className="mb-1.5 block text-[12.5px] font-semibold text-[var(--color-text-2)]">الرصيد الحالي (اختياري)</label>
      <input
        dir="ltr"
        inputMode="decimal"
        value={balance}
        onChange={(e) => setBalance(e.target.value.replace(/[^0-9.]/g, ''))}
        placeholder="0"
        className="num mb-5 w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-[14px] outline-none placeholder:text-[var(--color-text-3)]"
      />

      {type === 'savings' && (
        <>
          <label className="mb-1.5 block text-[12.5px] font-semibold text-[var(--color-text-2)]">اسم الهدف (اختياري)</label>
          <input
            value={goalLabel}
            onChange={(e) => setGoalLabel(e.target.value)}
            placeholder="مثال: رحلة عمرة"
            className="mb-5 w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-[14px] outline-none placeholder:text-[var(--color-text-3)]"
          />
          <label className="mb-1.5 block text-[12.5px] font-semibold text-[var(--color-text-2)]">مبلغ الهدف (اختياري)</label>
          <input
            dir="ltr"
            inputMode="decimal"
            value={goalAmount}
            onChange={(e) => setGoalAmount(e.target.value.replace(/[^0-9.]/g, ''))}
            placeholder="0"
            className="num mb-5 w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-[14px] outline-none placeholder:text-[var(--color-text-3)]"
          />
        </>
      )}

      {type === 'wallet' && (
        <div className="mb-5 rounded-2xl border border-dashed p-3.5 text-[12px] leading-relaxed" style={{ borderColor: 'rgba(0,226,138,0.35)', color: 'var(--color-text-2)' }}>
          محفظة رقمية زي "Google Play" — عبّيها بتحويل من الكاش أو البنكي، واربط اشتراكاتك فيها عشان تعرف الرصيد المتبقي بها في أي وقت.
        </div>
      )}
    </ScreenScroll>
  )
}
