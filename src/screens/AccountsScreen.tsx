import { useNavigate } from 'react-router-dom'
import { useData } from '../state/DataContext'
import { formatMoney } from '../lib/format'
import type { Account } from '../types'

const ICON_BG: Record<Account['type'], string> = {
  cash: 'rgba(34,197,94,0.12)',
  bank: 'rgba(124,108,255,0.12)',
  savings: 'rgba(245,185,66,0.12)',
  wallet: 'rgba(0,226,138,0.12)',
}
const ICON_COLOR: Record<Account['type'], string> = {
  cash: 'var(--color-income)',
  bank: 'var(--color-transfer)',
  savings: 'var(--color-subscription)',
  wallet: 'var(--color-accent)',
}
const LABELS: Record<Account['type'], string> = { cash: 'نقدي', bank: 'بنكي', savings: 'ادخار', wallet: 'محفظة رقمية' }

function AccountIcon({ type }: { type: Account['type'] }) {
  if (type === 'cash') {
    return (
      <svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2.5" y="6" width="19" height="12" rx="2.5" />
        <circle cx="12" cy="12" r="2.8" />
      </svg>
    )
  }
  if (type === 'bank') {
    return (
      <svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 10 L12 4 L21 10" />
        <path d="M5 10v9M19 10v9M9 10v9M15 10v9" />
        <path d="M3 19h18" />
      </svg>
    )
  }
  if (type === 'wallet') {
    return (
      <svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 7a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v1H4Z" />
        <path d="M4 8h15a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8Z" />
        <circle cx="16.5" cy="13.5" r="1.4" fill="currentColor" stroke="none" />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 12a8 8 0 1 1 8 8" />
      <path d="M4 12v5h5" />
      <path d="M12 8v4l3 2" />
    </svg>
  )
}

export function AccountsScreen() {
  const { accounts, totalBalance } = useData()
  const navigate = useNavigate()

  return (
    <div dir="rtl" className="safe-top px-5 pb-4 pt-15">
      <div className="mb-5 flex items-center justify-between">
        <div className="text-xl font-bold">الحسابات</div>
        <button
          onClick={() => navigate('/accounts/new')}
          className="flex h-9.5 w-9.5 items-center justify-center rounded-xl border"
          style={{ width: 38, height: 38, background: 'rgba(0,226,138,0.12)', borderColor: 'rgba(0,226,138,0.27)', color: 'var(--color-accent)' }}
          aria-label="إضافة حساب"
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
      </div>

      <div
        className="mb-4.5 flex items-center justify-between rounded-3xl border border-[var(--color-border)] px-4.5 py-4"
        style={{ background: 'linear-gradient(160deg, #141417 0%, #0E0E10 100%)' }}
      >
        <div>
          <div className="mb-1 text-xs text-[var(--color-text-2)]">إجمالي الأرصدة</div>
          <div className="num text-[22px] font-bold">{formatMoney(totalBalance)}</div>
        </div>
        <div className="text-[11.5px] text-[var(--color-text-3)]">{accounts.length} حسابات نشطة</div>
      </div>

      {accounts.map((a) => (
        <div key={a.id} className="mb-3.5 rounded-[20px] border border-[var(--color-border)] bg-[var(--color-surface)] p-4.5">
          <div className="flex items-center gap-3">
            <div
              className="flex h-11.5 w-11.5 flex-shrink-0 items-center justify-center rounded-[14px]"
              style={{ width: 46, height: 46, background: ICON_BG[a.type], color: ICON_COLOR[a.type] }}
            >
              <AccountIcon type={a.type} />
            </div>
            <div className="flex-1">
              <div className="text-[14.5px] font-bold">{a.name}</div>
              <div className="text-[11.5px] text-[var(--color-text-3)]">
                {a.goalLabel ? `هدف: ${a.goalLabel} — ${formatMoney(a.goalAmount ?? 0)}` : LABELS[a.type]}
              </div>
            </div>
            <div className="num text-base font-bold">{formatMoney(a.balance)}</div>
          </div>

          {a.goalAmount ? (
            <>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/6">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.min(100, (a.balance / a.goalAmount) * 100)}%`,
                    background: 'linear-gradient(90deg, #F5B942, #F59E0B)',
                  }}
                />
              </div>
              <div className="mt-1.5 text-[11px] text-[var(--color-text-3)]">
                وصلت لـ {Math.round((a.balance / a.goalAmount) * 100)}% من الهدف
              </div>
            </>
          ) : null}
        </div>
      ))}
    </div>
  )
}
