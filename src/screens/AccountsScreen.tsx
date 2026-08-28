import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useData } from '../state/DataContext'
import { formatMoney, formatSigned, formatDate } from '../lib/format'
import { ActivityIcon } from '../components/ActivityIcon'
import { activityEditPath } from '../lib/activityNav'
import { BankCardFace } from '../components/BankCardFace'
import { ACCOUNT_CARD_TEXT_FAINT } from '../components/AccountVisuals'
import { EyeToggleButton } from '../components/EyeToggleButton'
import { getHideBalancesDefault } from '../lib/privacy'

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

export function AccountsScreen() {
  const { accounts, totalBalance, accountActivity } = useData()
  const navigate = useNavigate()
  const [openId, setOpenId] = useState<string | null>(null)
  const [hidden, setHidden] = useState(getHideBalancesDefault)
  const mask = (s: string) => (hidden ? '•••••' : s)

  return (
    <div dir="rtl" className="px-5 pb-4">
      <div className="safe-top qb-glass-bar-top -mx-5 mb-5 flex items-center justify-between px-5 pt-14 pb-3">
        <div className="text-xl font-bold">الحسابات</div>
        <div className="flex items-center gap-2.5">
          <EyeToggleButton hidden={hidden} onToggle={() => setHidden((h) => !h)} />
          <button
            onClick={() => navigate('/accounts/new')}
            className="qb-glass-circle qb-press flex h-9.5 w-9.5 items-center justify-center rounded-full border"
            style={{ width: 38, height: 38, color: 'var(--color-accent)' }}
            aria-label="إضافة حساب"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
        </div>
      </div>

      <div className="qb-card mb-3.5 flex items-center justify-between px-4.5 py-4">
        <div>
          <div className="qb-section-label mb-1">إجمالي الأرصدة</div>
          <div className="num text-[22px] font-bold">{mask(formatMoney(totalBalance))}</div>
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
        const textFaint = ACCOUNT_CARD_TEXT_FAINT[a.type]
        return (
          <BankCardFace
            key={a.id}
            account={a}
            hidden={hidden}
            className="mb-3.5"
            onClick={() => setOpenId(open ? null : a.id)}
            topRight={
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  navigate(`/accounts/${a.id}/edit`)
                }}
                aria-label="تعديل الحساب"
                className="qb-press flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-[var(--color-text-2)]"
                style={{ width: 28, height: 28, background: 'rgba(255,255,255,0.1)' }}
              >
                <EditIcon />
              </button>
            }
          >
            <div className="mt-3.5 flex justify-center">
              <div className={open ? '-rotate-180' : ''} style={{ color: textFaint, transition: 'transform 200ms ease' }}>
                <ChevronIcon />
              </div>
            </div>

            {a.goalAmount ? (
              <>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-black/20">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.min(100, (a.balance / a.goalAmount) * 100)}%`,
                      background: 'linear-gradient(90deg, #F5B942, #F59E0B)',
                    }}
                  />
                </div>
                <div className="mt-1.5 text-[11px] font-semibold" style={{ color: textFaint }}>
                  وصلت لـ {Math.round((a.balance / a.goalAmount) * 100)}% من الهدف ({formatMoney(a.goalAmount)})
                </div>
              </>
            ) : null}

            {a.type === 'wallet' && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  navigate(`/add/transaction?type=transfer&to=${a.id}`)
                }}
                className="qb-press mt-3.5 w-full rounded-xl py-2.25 text-[12px] font-semibold"
                style={{ background: 'rgba(255,255,255,0.1)', color: 'var(--color-accent)' }}
              >
                شحن المحفظة
              </button>
            )}

            {open && (
              <div className="mt-3.5 border-t border-white/8 pt-3">
                {activity.length === 0 ? (
                  <div className="py-2 text-center text-[12px] font-semibold" style={{ color: textFaint }}>
                    لا توجد حركات على هذا الحساب بعد
                  </div>
                ) : (
                  activity.map((item) => (
                    <button
                      key={item.id}
                      onClick={(e) => {
                        e.stopPropagation()
                        navigate(activityEditPath(item))
                      }}
                      className="flex w-full items-center gap-2.5 py-1.5 text-right"
                    >
                      <div
                        className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-[10px]"
                        style={{ width: 32, height: 32, background: `${item.color}1f`, color: item.color }}
                      >
                        <ActivityIcon kind={item.kind} />
                      </div>
                      <div className="min-w-0 flex-1 truncate text-[12px] font-semibold">{item.title}</div>
                      <div className="flex-shrink-0 text-[10.5px] font-semibold" style={{ color: textFaint }}>
                        {formatDate(item.date)}
                      </div>
                      <div className="num flex-shrink-0 text-[12px] font-bold" style={{ color: item.color }}>
                        {formatSigned(item.amount)}
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </BankCardFace>
        )
      })}
    </div>
  )
}
