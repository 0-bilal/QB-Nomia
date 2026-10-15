import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { SALARY_INCOME_SOURCE_ID, useData } from '../../state/DataContext'
import { salaryPeriods } from '../../lib/salaryTree'
import { getHideBalancesDefault } from '../../lib/privacy'
import { rise } from '../../lib/motion'
import { ScreenScroll } from '../../components/ScreenScroll'
import { ScreenHeader } from '../../components/ScreenHeader'
import { EyeToggleButton } from '../../components/EyeToggleButton'
import { EmptyState } from '../../components/ui'
import { TreeIcon, money, periodLabel, salaryTitle } from '../../components/SalaryTreeVisuals'

/** شجرة المصاريف: كل راتب بطاقة، وفيها كم صُرف منه خلال فترته وكم باقي. */
export function SalaryTreeScreen() {
  const navigate = useNavigate()
  const { transactions } = useData()
  const [hidden, setHidden] = useState(getHideBalancesDefault)
  const periods = useMemo(() => salaryPeriods(transactions, SALARY_INCOME_SOURCE_ID), [transactions])

  return (
    <ScreenScroll header={<ScreenHeader title="شجرة المصاريف" onBack={() => navigate(-1)} right={<EyeToggleButton hidden={hidden} onToggle={() => setHidden((h) => !h)} />} />}>
      <div className="-mt-2 mb-4 px-1 text-[12px] text-[var(--color-text-3)]">كل راتب ووين راحت مصاريفه</div>

      {periods.length === 0 ? (
        <EmptyState
          icon={<TreeIcon size={24} />}
          title="ما فيه رواتب مسجّلة"
          desc="سجّل راتبك كدخل بمصدر «راتب»، وبتظهر هنا شجرته ومصاريفه."
          actionLabel="إضافة راتب"
          onAction={() => navigate('/add/transaction?type=income')}
        />
      ) : (
        periods.map((p, i) => {
          const over = p.left < 0
          const spentPct = p.salary.amount > 0 ? Math.min(100, (p.spent / p.salary.amount) * 100) : 100
          return (
            <button key={p.salary.id} onClick={() => navigate(`/trail/${p.salary.id}`)} className="qb-card qb-press qb-rise mb-2 block w-full p-3.5 text-right" style={rise(i)}>
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-[14px]" style={{ background: 'color-mix(in srgb, var(--color-income) 15%, transparent)', color: 'var(--color-income)' }}>
                  <TreeIcon size={18} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13.5px] font-semibold">{salaryTitle(p.from)}</div>
                  <div className="truncate text-[11px] text-[var(--color-text-3)]">{periodLabel(p.from, p.to)}</div>
                </div>
                <span className="num flex-shrink-0 text-[15px] font-bold">
                  {money(p.salary.amount, hidden)}
                  <span className="ms-1 font-sans text-[11px] font-medium text-[var(--color-text-3)]">ر.س</span>
                </span>
              </div>
              <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-[var(--color-surface-high)]" style={{ gap: 2 }}>
                <span className="qb-trail-grow block h-full" style={{ width: `${spentPct}%`, background: 'var(--color-expense)' }} />
                {!over && p.left > 0 && <span className="qb-trail-grow block h-full" style={{ width: `${100 - spentPct}%`, background: 'var(--color-accent)', animationDelay: '90ms' }} />}
              </div>
              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-[var(--color-text-2)]">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-[7px] w-[7px] rounded-full bg-[var(--color-expense)]" />
                  صُرف <b className="num text-[var(--color-text)]">{money(p.spent, hidden)}</b>
                </span>
                {over ? (
                  <span style={{ color: 'var(--color-expense)' }}>
                    تجاوزت الراتب بـ <b className="num">{money(-p.left, hidden)}</b>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-[7px] w-[7px] rounded-full bg-[var(--color-accent)]" />
                    باقي <b className="num text-[var(--color-text)]">{money(p.left, hidden)}</b>
                  </span>
                )}
                <span className="text-[var(--color-text-3)]">
                  <span className="num">{p.expenses.length}</span> مصروف
                </span>
              </div>
            </button>
          )
        })
      )}
    </ScreenScroll>
  )
}
