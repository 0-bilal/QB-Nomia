import { useState } from 'react'
import { useData } from '../state/DataContext'
import { formatMoney, formatSigned, formatDate } from '../lib/format'

function EyeIcon({ hidden }: { hidden: boolean }) {
  if (hidden) {
    return (
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 3l18 18" />
        <path d="M10.6 5.2A10.4 10.4 0 0 1 12 5c5 0 9 4 10 7-0.4 1.2-1.2 2.6-2.4 3.9M6.5 6.6C4.4 8 2.9 10 2 12c1 3 5 7 10 7 1.4 0 2.7-.3 3.9-.8" />
        <path d="M9.5 10a3 3 0 0 0 4.2 4.2" />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12c1-3 5-7 10-7s9 4 10 7c-1 3-5 7-10 7s-9-4-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

export function HomeScreen() {
  const { accounts, totalBalance, loanTransactions, people } = useData()
  const [hidden, setHidden] = useState(false)
  const mask = (s: string) => (hidden ? '•••••' : s)

  const cash = accounts.find((a) => a.type === 'cash')?.balance ?? 0
  const bank = accounts.find((a) => a.type === 'bank')?.balance ?? 0
  const savings = accounts.find((a) => a.type === 'savings')?.balance ?? 0

  const recent = [...loanTransactions]
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, 5)

  const personName = (id: string) => people.find((p) => p.id === id)?.name ?? '—'

  return (
    <div dir="rtl" className="safe-top px-5 pb-4 pt-15">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <div className="mb-0.5 text-[13px] text-[var(--color-text-2)]">مرحبًا بك في QB-Nomia</div>
          <div className="text-xs text-[var(--color-text-3)]">
            {new Date().toLocaleDateString('ar-SA', { weekday: 'long', day: 'numeric', month: 'long' })}
          </div>
        </div>
        <button
          onClick={() => setHidden((h) => !h)}
          className="flex h-9.5 w-9.5 items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-2)]"
          style={{ width: 38, height: 38 }}
          aria-label="إخفاء الأرقام"
        >
          <EyeIcon hidden={hidden} />
        </button>
      </div>

      <div
        className="mb-4 rounded-3xl border border-[var(--color-border)] p-5.5"
        style={{ background: 'linear-gradient(160deg, #141417 0%, #0E0E10 100%)', boxShadow: '0 0 40px -14px rgba(0,226,138,0.18)' }}
      >
        <div className="mb-1.5 text-[12.5px] text-[var(--color-text-2)]">الرصيد الإجمالي</div>
        <div className="num mb-4 text-[34px] font-bold tracking-tight">{mask(formatMoney(totalBalance))}</div>
        <div className="flex gap-2.5">
          {[
            ['كاش', cash],
            ['بنكي', bank],
            ['ادخار', savings],
          ].map(([label, val]) => (
            <div key={label as string} className="flex-1 rounded-2xl bg-white/4 px-3 py-2.5">
              <div className="mb-1 text-[11px] text-[var(--color-text-2)]">{label}</div>
              <div className="num text-[13.5px] font-semibold">{mask(formatMoney(val as number))}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="mb-1.5 flex items-center justify-between">
        <div className="text-[14.5px] font-bold">آخر حركات السلف</div>
      </div>

      {recent.length === 0 ? (
        <div className="py-8 text-center text-[13px] text-[var(--color-text-3)]">لا توجد حركات بعد</div>
      ) : (
        <div className="border-t border-white/6">
          {recent.map((t) => (
            <div key={t.id} className="flex items-center gap-3 border-b border-white/6 py-2.75">
              <div
                className="flex h-10.5 w-10.5 flex-shrink-0 items-center justify-center rounded-[13px]"
                style={{
                  width: 42,
                  height: 42,
                  background: t.direction === 'given' ? 'rgba(251,146,60,0.12)' : 'rgba(45,212,191,0.12)',
                  color: t.direction === 'given' ? 'var(--color-owed-by)' : 'var(--color-owed-to)',
                }}
              >
                <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="8" r="3.5" />
                  <path d="M5 20c0-3.9 3.1-6 7-6s7 2.1 7 6" />
                </svg>
              </div>
              <div className="flex-1">
                <div className="text-[13.5px] font-semibold">{personName(t.personId)}</div>
                <div className="text-[11.5px] text-[var(--color-text-3)]">
                  {t.direction === 'given' ? 'أعطيته' : 'استلمت منه'} · {formatDate(t.date)}
                </div>
              </div>
              <div
                className="num text-[13.5px] font-bold"
                style={{ color: t.direction === 'given' ? 'var(--color-owed-by)' : 'var(--color-owed-to)' }}
              >
                {mask(formatSigned(t.direction === 'given' ? -t.amount : t.amount))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
