import { useNavigate } from 'react-router-dom'
import { useData } from '../state/DataContext'
import { formatMoney } from '../lib/format'
import { ScreenScroll } from '../components/ScreenScroll'

export function CategoriesScreen() {
  const { categories, categorySpentThisMonth } = useData()
  const navigate = useNavigate()
  const expenseCategories = categories.filter((c) => c.kind === 'expense')

  return (
    <ScreenScroll
      header={
        <div className="safe-top flex items-center justify-between px-5 pt-8 pb-5">
          <button onClick={() => navigate(-1)} className="text-[13px] text-[var(--color-text-2)]">
            → رجوع
          </button>
          <div className="text-base font-bold">فئات المصاريف</div>
          <button
            onClick={() => navigate('/categories/new')}
            className="flex h-9.5 w-9.5 items-center justify-center rounded-xl border"
            style={{ width: 38, height: 38, background: 'rgba(0,226,138,0.12)', borderColor: 'rgba(0,226,138,0.27)', color: 'var(--color-accent)' }}
            aria-label="إضافة فئة"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
        </div>
      }
    >
      {expenseCategories.length === 0 ? (
        <div className="py-10 text-center text-[13px] text-[var(--color-text-3)]">لا توجد فئات بعد</div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {expenseCategories.map((c) => {
            const spent = categorySpentThisMonth(c.id)
            const rawPct = c.budgetLimit ? (spent / c.budgetLimit) * 100 : null
            const pct = rawPct !== null ? Math.min(100, rawPct) : null
            return (
              <button
                key={c.id}
                onClick={() => navigate(`/categories/${c.id}/edit`)}
                className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-right"
              >
                <div className="flex items-center justify-between">
                  <div className="text-[13.5px] font-bold">{c.name}</div>
                  <div className="num text-[13px] font-semibold text-[var(--color-text-2)]">
                    {formatMoney(spent)}
                    {c.budgetLimit ? ` / ${formatMoney(c.budgetLimit)}` : ''}
                  </div>
                </div>
                {pct !== null && (
                  <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-white/6">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${pct}%`, background: pct >= 100 ? 'var(--color-expense)' : pct >= 80 ? 'var(--color-subscription)' : 'var(--color-accent)' }}
                    />
                  </div>
                )}
                {rawPct !== null && rawPct >= 100 && (
                  <div className="mt-1.5 text-[11px] font-semibold" style={{ color: 'var(--color-expense)' }}>
                    تجاوزت الميزانية بـ {formatMoney(spent - (c.budgetLimit ?? 0))}
                  </div>
                )}
                {rawPct !== null && rawPct >= 80 && rawPct < 100 && (
                  <div className="mt-1.5 text-[11px] font-semibold" style={{ color: 'var(--color-subscription)' }}>
                    قاربت على تجاوز الميزانية ({Math.round(rawPct)}%)
                  </div>
                )}
              </button>
            )
          })}
        </div>
      )}
    </ScreenScroll>
  )
}
