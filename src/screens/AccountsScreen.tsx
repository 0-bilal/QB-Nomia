import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useData } from '../state/DataContext'
import { formatMoney, formatSigned, formatDate } from '../lib/format'
import { ActivityIcon } from '../components/ActivityIcon'
import { activityEditPath } from '../lib/activityNav'
import { ACCOUNT_TYPE_LABELS, AccountTypeIcon } from '../components/AccountVisuals'
import type { Account } from '../types'

function EditIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 20h4L18.5 9.5a2.1 2.1 0 0 0-3-3L5 17v3Z" />
      <path d="M13.5 8 16 10.5" />
    </svg>
  )
}
function ChevronIcon() {
  return (
    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'transform 200ms ease' }}>
      <polyline points="6,9 12,15 18,9" />
    </svg>
  )
}

const CARD_BG: Record<Account['type'], string> = {
  cash: 'radial-gradient(130% 100% at 100% 0%, rgba(34,197,94,0.16) 0%, transparent 55%), linear-gradient(160deg, #16211a 0%, #0a0e0c 65%, #000 100%)',
  bank: 'radial-gradient(130% 100% at 100% 0%, rgba(124,108,255,0.18) 0%, transparent 55%), linear-gradient(160deg, #1a1830 0%, #0c0b14 65%, #000 100%)',
  savings: 'radial-gradient(130% 100% at 100% 0%, rgba(245,185,66,0.16) 0%, transparent 55%), linear-gradient(160deg, #26200f 0%, #100d07 65%, #000 100%)',
  wallet: 'radial-gradient(130% 100% at 100% 0%, rgba(255,255,255,0.12) 0%, transparent 55%), linear-gradient(160deg, #1c1c20 0%, #0a0a0c 65%, #000 100%)',
}
const ICON_COLOR: Record<Account['type'], string> = {
  cash: 'var(--color-income)',
  bank: 'var(--color-transfer)',
  savings: 'var(--color-subscription)',
  wallet: 'var(--color-accent)',
}
const LABELS = ACCOUNT_TYPE_LABELS

export function AccountsScreen() {
  const { accounts, totalBalance, accountActivity } = useData()
  const navigate = useNavigate()
  const [openId, setOpenId] = useState<string | null>(null)

  return (
    <div dir="rtl" className="safe-top px-5 pb-4 pt-14">
      <div className="mb-5 flex items-center justify-between">
        <div className="text-xl font-bold">الحسابات</div>
        <button
          onClick={() => navigate('/accounts/new')}
          className="qb-press flex h-9.5 w-9.5 items-center justify-center rounded-full border"
          style={{ width: 38, height: 38, background: 'rgba(255,255,255,0.12)', borderColor: 'rgba(255,255,255,0.27)', color: 'var(--color-accent)' }}
          aria-label="إضافة حساب"
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
      </div>

      <div className="qb-card mb-3.5 flex items-center justify-between px-4.5 py-4">
        <div>
          <div className="qb-section-label mb-1">إجمالي الأرصدة</div>
          <div className="num text-[22px] font-bold">{formatMoney(totalBalance)}</div>
        </div>
        <div className="rounded-full border border-[var(--color-border)] px-3 py-1.5 text-[11px] font-semibold text-[var(--color-text-2)]">
          {accounts.length} حسابات نشطة
        </div>
      </div>

      <button
        onClick={() => navigate('/add/transaction?type=transfer')}
        className="qb-press mb-4.5 flex w-full items-center justify-center gap-2 rounded-2xl border py-3 text-[13px] font-bold"
        style={{ borderColor: 'rgba(124,108,255,0.35)', background: 'rgba(124,108,255,0.1)', color: 'var(--color-transfer)' }}
      >
        <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="17,3 21,7 17,11" />
          <path d="M3 7h18" />
          <polyline points="7,21 3,17 7,13" />
          <path d="M21 17H3" />
        </svg>
        تحويل بين الحسابات
      </button>

      {accounts.map((a) => {
        const open = openId === a.id
        const activity = open ? accountActivity(a.id, 3) : []
        return (
          <div
            key={a.id}
            className="qb-card-elevated mb-3.5 p-4.5"
            style={{ background: CARD_BG[a.type] }}
          >
            <div className="relative">
              <div className="mb-4 flex items-start justify-between">
                <div
                  className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-[14px] border border-white/10"
                  style={{ width: 44, height: 44, background: 'rgba(255,255,255,0.06)', color: ICON_COLOR[a.type] }}
                >
                  <AccountTypeIcon type={a.type} />
                </div>
                <button
                  onClick={() => navigate(`/accounts/${a.id}/edit`)}
                  aria-label="تعديل الحساب"
                  className="qb-press flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-[var(--color-text-3)]"
                  style={{ width: 32, height: 32, background: 'rgba(255,255,255,0.06)' }}
                >
                  <EditIcon />
                </button>
              </div>

              <button onClick={() => setOpenId(open ? null : a.id)} className="flex w-full items-end justify-between text-right">
                <div className="min-w-0">
                  <div className="mb-1 truncate text-[14.5px] font-bold">{a.name}</div>
                  <div className="text-[11px] text-[var(--color-text-3)]">
                    {a.goalLabel ? `هدف: ${a.goalLabel}` : LABELS[a.type]}
                  </div>
                </div>
                <div className="flex flex-shrink-0 items-center gap-1.5">
                  <div className="num text-[19px] font-bold">{formatMoney(a.balance)}</div>
                  <div className={`text-[var(--color-text-3)] ${open ? '-rotate-180' : ''}`} style={{ transition: 'transform 200ms ease' }}>
                    <ChevronIcon />
                  </div>
                </div>
              </button>

              {a.goalAmount ? (
                <>
                  <div className="mt-3.5 h-1.5 overflow-hidden rounded-full bg-white/8">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.min(100, (a.balance / a.goalAmount) * 100)}%`,
                        background: 'linear-gradient(90deg, #F5B942, #F59E0B)',
                      }}
                    />
                  </div>
                  <div className="mt-1.5 text-[11px] text-[var(--color-text-3)]">
                    وصلت لـ {Math.round((a.balance / a.goalAmount) * 100)}% من الهدف ({formatMoney(a.goalAmount)})
                  </div>
                </>
              ) : null}

              {a.type === 'wallet' && (
                <button
                  onClick={() => navigate(`/add/transaction?type=transfer&to=${a.id}`)}
                  className="qb-press mt-3.5 w-full rounded-xl py-2.25 text-[12px] font-semibold"
                  style={{ background: 'rgba(255,255,255,0.1)', color: 'var(--color-accent)' }}
                >
                  شحن المحفظة
                </button>
              )}

              {open && (
                <div className="mt-3.5 border-t border-white/8 pt-3">
                  {activity.length === 0 ? (
                    <div className="py-2 text-center text-[12px] text-[var(--color-text-3)]">لا توجد حركات على هذا الحساب بعد</div>
                  ) : (
                    activity.map((item) => (
                      <button key={item.id} onClick={() => navigate(activityEditPath(item))} className="flex w-full items-center gap-2.5 py-1.5 text-right">
                        <div
                          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-[10px]"
                          style={{ width: 32, height: 32, background: `${item.color}1f`, color: item.color }}
                        >
                          <ActivityIcon kind={item.kind} />
                        </div>
                        <div className="min-w-0 flex-1 truncate text-[12px] font-semibold">{item.title}</div>
                        <div className="flex-shrink-0 text-[10.5px] text-[var(--color-text-3)]">{formatDate(item.date)}</div>
                        <div className="num flex-shrink-0 text-[12px] font-bold" style={{ color: item.color }}>
                          {formatSigned(item.amount)}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
