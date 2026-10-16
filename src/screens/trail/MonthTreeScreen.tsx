import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useData } from '../../state/DataContext'
import { ledgerMonths, monthLedger } from '../../lib/monthLedger'
import { localIso } from '../../lib/homeFeed'
import { getHideBalancesDefault } from '../../lib/privacy'
import { rise } from '../../lib/motion'
import { ScreenScroll } from '../../components/ScreenScroll'
import { ScreenHeader } from '../../components/ScreenHeader'
import { EyeToggleButton } from '../../components/EyeToggleButton'
import { money, monthTitle } from '../../components/MonthTreeVisuals'

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="16" rx="3" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </svg>
  )
}

function Dot({ color }: { color: string }) {
  return <span className="h-[7px] w-[7px] rounded-full" style={{ background: color }} />
}

/** شجرة المصاريف: بطاقة لكل شهر تقويمي — دخل الشهر، ووين راح (صرفت · ادّخرت · عند الناس · باقي/ترحّل). */
export function MonthTreeScreen() {
  const navigate = useNavigate()
  const { accounts, transactions, loanTransactions, reconciliations } = useData()
  const [hidden, setHidden] = useState(getHideBalancesDefault)
  const today = localIso(new Date())
  const ledgers = useMemo(() => {
    const input = { accounts, transactions, loanTransactions, reconciliations }
    return ledgerMonths(input, today).map((m) => monthLedger(input, m))
  }, [accounts, transactions, loanTransactions, reconciliations, today])
  const current = today.slice(0, 7)

  return (
    <ScreenScroll header={<ScreenHeader title="شجرة المصاريف" onBack={() => navigate(-1)} right={<EyeToggleButton hidden={hidden} onToggle={() => setHidden((h) => !h)} />} />}>
      <div className="-mt-2 mb-4 px-1 text-[12px] text-[var(--color-text-3)]">كل شهر: اللي دخل ووين راح</div>

      {ledgers.map((l, i) => {
        const isCurrent = l.month === current
        const withPeople = l.withPeople.reduce((s, p) => s + p.amount, 0)
        const parts = [
          { key: 'spent', amount: l.spent, color: 'var(--color-expense)' },
          { key: 'saved', amount: l.saved, color: 'var(--color-transfer)' },
          { key: 'people', amount: withPeople, color: 'var(--color-owed-to)' },
          { key: 'left', amount: Math.max(0, l.left), color: 'var(--color-accent)' },
        ].filter((p) => p.amount > 0)
        const base = parts.reduce((s, p) => s + p.amount, 0) || 1
        return (
          <button key={l.month} onClick={() => navigate(`/trail/${l.month}`)} className="qb-card qb-press qb-rise mb-2 block w-full p-3.5 text-right" style={rise(i)}>
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-[14px] bg-white/[0.06] text-[var(--color-text)]">
                <CalendarIcon />
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[14px] font-semibold">{monthTitle(l.month)}</div>
                <div className="truncate text-[11px] text-[var(--color-text-3)]">{isCurrent ? 'حتى اليوم' : 'شهر مكتمل'}</div>
              </div>
              <div className="flex-shrink-0 text-left">
                <div className="text-[11px] text-[var(--color-text-3)]">دخل الشهر</div>
                <div className="num text-[15px] font-bold" style={{ color: 'var(--color-income)' }}>
                  {money(l.incomeTotal, hidden)}
                </div>
              </div>
            </div>
            {parts.length > 0 && (
              <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-[var(--color-surface-high)]" style={{ gap: 2 }}>
                {parts.map((p, j) => (
                  <span key={p.key} className="qb-trail-grow block h-full" style={{ width: `${(p.amount / base) * 100}%`, background: p.color, animationDelay: `${j * 50}ms` }} />
                ))}
              </div>
            )}
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-[var(--color-text-2)]">
              <span className="inline-flex items-center gap-1.5">
                <Dot color="var(--color-expense)" />
                صرفت <b className="num text-[var(--color-text)]">{money(l.spent, hidden)}</b>
              </span>
              {l.saved > 0 && (
                <span className="inline-flex items-center gap-1.5">
                  <Dot color="var(--color-transfer)" />
                  ادّخرت <b className="num text-[var(--color-text)]">{money(l.saved, hidden)}</b>
                </span>
              )}
              {withPeople > 0 && (
                <span className="inline-flex items-center gap-1.5">
                  <Dot color="var(--color-owed-to)" />
                  عند الناس <b className="num text-[var(--color-text)]">{money(withPeople, hidden)}</b>
                </span>
              )}
              {l.left >= 0 ? (
                <span className="inline-flex items-center gap-1.5">
                  <Dot color="var(--color-accent)" />
                  {isCurrent ? 'باقي' : 'ترحّل'} <b className="num text-[var(--color-text)]">{money(l.left, hidden)}</b>
                </span>
              ) : (
                <span style={{ color: 'var(--color-expense)' }}>
                  عجز <b className="num">{money(-l.left, hidden)}</b>
                </span>
              )}
            </div>
          </button>
        )
      })}

      <div className="mt-3 flex gap-2.5 rounded-[18px] border border-[var(--color-border)] bg-white/[0.04] px-3.5 py-3 text-[11.5px] leading-relaxed text-[var(--color-text-2)]">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="mt-0.5 flex-shrink-0 text-[var(--color-text-3)]">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 11v6M12 7.5h.01" />
        </svg>
        <div>الأشهر تقويمية، ومصادر الدخل (راتب، عمل حر، هدايا…) تظهر داخل الشهر كتصنيف. الشجرة على حساباتك اليومية، وحسابات الادخار والطوارئ في بطاقة «مدخراتك».</div>
      </div>
    </ScreenScroll>
  )
}
