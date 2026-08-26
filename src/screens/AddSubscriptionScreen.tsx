import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useData } from '../state/DataContext'
import { ScreenScroll } from '../components/ScreenScroll'
import type { BillingCycle } from '../types'

function defaultRenewalDate(): string {
  const d = new Date()
  d.setDate(d.getDate() + 30)
  return d.toISOString().slice(0, 10)
}

export function AddSubscriptionScreen() {
  const { accounts, addSubscription } = useData()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [provider, setProvider] = useState('')
  const [cost, setCost] = useState('')
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly')
  const [accountId, setAccountId] = useState(accounts.find((a) => a.type === 'wallet')?.id ?? accounts[0]?.id ?? '')
  const [nextRenewalDate, setNextRenewalDate] = useState(defaultRenewalDate())

  const numericCost = Number(cost)
  const canSave = name.trim() && numericCost > 0 && accountId && nextRenewalDate

  function handleSave() {
    if (!canSave) return
    addSubscription({ name, provider, cost: numericCost, billingCycle, nextRenewalDate, accountId })
    navigate('/subscriptions', { replace: true })
  }

  return (
    <ScreenScroll
      header={
        <div className="safe-top flex items-center justify-between px-5 pt-8 pb-6">
          <button onClick={() => navigate(-1)} className="text-[13px] text-[var(--color-text-2)]">
            إلغاء
          </button>
          <div className="text-base font-bold">إضافة اشتراك</div>
          <div className="w-10" />
        </div>
      }
      footer={
        <div className="px-5 pb-6 pt-3">
          <button
            onClick={handleSave}
            disabled={!canSave}
            className="w-full rounded-2xl py-3.5 text-center text-[14.5px] font-bold text-[#04140D] disabled:opacity-40"
            style={{ background: 'var(--color-subscription)' }}
          >
            حفظ الاشتراك
          </button>
        </div>
      }
    >
      <label className="mb-1.5 block text-[12.5px] font-semibold text-[var(--color-text-2)]">اسم الاشتراك</label>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="مثال: يوتيوب بريميوم"
        className="mb-5 w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-[14px] outline-none placeholder:text-[var(--color-text-3)]"
      />

      <label className="mb-1.5 block text-[12.5px] font-semibold text-[var(--color-text-2)]">المزود (اختياري)</label>
      <input
        value={provider}
        onChange={(e) => setProvider(e.target.value)}
        placeholder="مثال: Google Play"
        className="mb-5 w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-[14px] outline-none placeholder:text-[var(--color-text-3)]"
      />

      <label className="mb-1.5 block text-[12.5px] font-semibold text-[var(--color-text-2)]">التكلفة</label>
      <input
        dir="ltr"
        inputMode="decimal"
        value={cost}
        onChange={(e) => setCost(e.target.value.replace(/[^0-9.]/g, ''))}
        placeholder="0"
        className="num mb-5 w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-[14px] outline-none placeholder:text-[var(--color-text-3)]"
      />

      <label className="mb-1.5 block text-[12.5px] font-semibold text-[var(--color-text-2)]">دورة الفوترة</label>
      <div className="mb-5 flex gap-2">
        {(
          [
            ['monthly', 'شهري'],
            ['yearly', 'سنوي'],
          ] as [BillingCycle, string][]
        ).map(([cycle, label]) => (
          <button
            key={cycle}
            onClick={() => setBillingCycle(cycle)}
            className="flex-1 rounded-2xl py-2.5 text-[13px] font-semibold"
            style={
              billingCycle === cycle
                ? { background: 'rgba(245,185,66,0.18)', color: 'var(--color-subscription)' }
                : { background: 'var(--color-surface)', color: 'var(--color-text-2)', border: '1px solid var(--color-border)' }
            }
          >
            {label}
          </button>
        ))}
      </div>

      <label className="mb-1.5 block text-[12.5px] font-semibold text-[var(--color-text-2)]">الحساب المرتبط</label>
      <div className="mb-5 flex flex-wrap gap-2">
        {accounts.length === 0 ? (
          <button
            type="button"
            onClick={() => navigate('/accounts/new')}
            className="text-[12.5px] font-semibold underline"
            style={{ color: 'var(--color-subscription)' }}
          >
            لا توجد حسابات — أضف حسابًا أولًا
          </button>
        ) : (
          accounts.map((a) => (
            <button
              key={a.id}
              onClick={() => setAccountId(a.id)}
              className="rounded-full px-4 py-2 text-[12.5px] font-semibold"
              style={
                accountId === a.id
                  ? { background: 'rgba(245,185,66,0.18)', color: 'var(--color-subscription)' }
                  : { background: 'var(--color-surface)', color: 'var(--color-text-2)', border: '1px solid var(--color-border)' }
              }
            >
              {a.name}
            </button>
          ))
        )}
      </div>

      <label className="mb-1.5 block text-[12.5px] font-semibold text-[var(--color-text-2)]">تاريخ التجديد القادم</label>
      <input
        type="date"
        dir="ltr"
        value={nextRenewalDate}
        onChange={(e) => setNextRenewalDate(e.target.value)}
        className="num mb-4 w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-[13.5px] outline-none"
      />
    </ScreenScroll>
  )
}
