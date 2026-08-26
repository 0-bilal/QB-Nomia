import { useNavigate } from 'react-router-dom'
import { useData } from '../state/DataContext'
import { ScreenScroll } from '../components/ScreenScroll'
import { formatMoney } from '../lib/format'

function healthLabel(score: number): { text: string; color: string } {
  if (score >= 80) return { text: 'ممتازة', color: 'var(--color-income)' }
  if (score >= 50) return { text: 'جيدة', color: 'var(--color-subscription)' }
  return { text: 'تحتاج تحسين', color: 'var(--color-expense)' }
}

export function ReportsScreen() {
  const navigate = useNavigate()
  const { categories, categorySpentThisMonth, monthTotals, monthlyTrend, financialHealthScore } = useData()

  const { income, expense } = monthTotals()
  const net = income - expense
  const savingsRate = income > 0 ? Math.round((net / income) * 100) : null
  const score = financialHealthScore()

  const trend = monthlyTrend(6)
  const maxTrendValue = Math.max(1, ...trend.flatMap((m) => [m.income, m.expense]))

  const categoryBreakdown = categories
    .filter((c) => c.kind === 'expense')
    .map((c) => ({ ...c, spent: categorySpentThisMonth(c.id) }))
    .filter((c) => c.spent > 0)
    .sort((a, b) => b.spent - a.spent)
  const totalCategorySpend = categoryBreakdown.reduce((s, c) => s + c.spent, 0)

  return (
    <ScreenScroll
      header={
        <div className="safe-top flex items-center justify-between px-5 pt-8 pb-6">
          <button onClick={() => navigate(-1)} className="text-[13px] text-[var(--color-text-2)]">
            → رجوع
          </button>
          <div className="text-base font-bold">التقارير</div>
          <div className="w-10" />
        </div>
      }
    >
      <div
        className="mb-4 rounded-3xl border border-[var(--color-border)] p-5"
        style={{ background: 'linear-gradient(160deg, #141417 0%, #0E0E10 100%)' }}
      >
        <div className="mb-1.5 text-[12.5px] text-[var(--color-text-2)]">مؤشر الصحة المالية هذا الشهر</div>
        {score === null ? (
          <div className="text-[13px] text-[var(--color-text-3)]">سجّل دخلك هذا الشهر لعرض المؤشر</div>
        ) : (
          <>
            <div className="flex items-end gap-2">
              <div className="num text-[40px] font-bold leading-none" style={{ color: healthLabel(score).color }}>
                {score}
              </div>
              <div className="mb-1 text-[13px] text-[var(--color-text-3)]">/ 100</div>
            </div>
            <div className="mt-1 text-[13px] font-semibold" style={{ color: healthLabel(score).color }}>
              {healthLabel(score).text}
            </div>
            <div className="mt-2 text-[11px] leading-relaxed text-[var(--color-text-3)]">
              يعتمد على نسبة ادخارك من دخلك هذا الشهر (70%) وخفّة عبء اشتراكاتك الشهرية من دخلك (30%)
            </div>
          </>
        )}
      </div>

      <div className="mb-4 grid grid-cols-2 gap-2.5">
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3.5">
          <div className="mb-1.5 text-[11.5px] text-[var(--color-text-2)]">دخل الشهر</div>
          <div className="num text-[16px] font-bold" style={{ color: 'var(--color-income)' }}>
            {formatMoney(income)}
          </div>
        </div>
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3.5">
          <div className="mb-1.5 text-[11.5px] text-[var(--color-text-2)]">مصروف الشهر</div>
          <div className="num text-[16px] font-bold" style={{ color: 'var(--color-expense)' }}>
            {formatMoney(expense)}
          </div>
        </div>
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3.5">
          <div className="mb-1.5 text-[11.5px] text-[var(--color-text-2)]">صافي التوفير</div>
          <div className="num text-[16px] font-bold" style={{ color: net >= 0 ? 'var(--color-accent)' : 'var(--color-expense)' }}>
            {formatMoney(net)}
          </div>
        </div>
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3.5">
          <div className="mb-1.5 text-[11.5px] text-[var(--color-text-2)]">نسبة الادخار</div>
          <div className="num text-[16px] font-bold" style={{ color: 'var(--color-accent)' }}>
            {savingsRate === null ? '—' : `${savingsRate}%`}
          </div>
        </div>
      </div>

      <div className="mb-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        <div className="mb-3 text-[13px] font-bold text-[var(--color-text-2)]">الدخل والمصروف — آخر 6 أشهر</div>
        <div dir="ltr" className="flex items-end justify-between gap-2" style={{ height: 90 }}>
          {trend.map((m, i) => (
            <div key={i} className="flex flex-1 flex-col items-center gap-1">
              <div className="flex items-end gap-1" style={{ height: 72 }}>
                <div
                  className="w-2.5 rounded-t-full"
                  style={{ height: `${(m.income / maxTrendValue) * 72}px`, background: 'var(--color-income)' }}
                />
                <div
                  className="w-2.5 rounded-t-full"
                  style={{ height: `${(m.expense / maxTrendValue) * 72}px`, background: 'var(--color-expense)' }}
                />
              </div>
              <div className="text-[10px] text-[var(--color-text-3)]">{m.label}</div>
            </div>
          ))}
        </div>
        <div className="mt-3 flex justify-center gap-4 text-[11px] text-[var(--color-text-2)]">
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full" style={{ background: 'var(--color-income)' }} />
            دخل
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full" style={{ background: 'var(--color-expense)' }} />
            مصروف
          </div>
        </div>
      </div>

      <div className="mb-2 text-[13px] font-bold text-[var(--color-text-2)]">توزيع المصاريف حسب الفئة — هذا الشهر</div>
      {categoryBreakdown.length === 0 ? (
        <div className="py-8 text-center text-[13px] text-[var(--color-text-3)]">لا توجد مصاريف مسجّلة هذا الشهر بعد</div>
      ) : (
        <div className="flex flex-col gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          {categoryBreakdown.map((c) => {
            const pct = totalCategorySpend ? Math.round((c.spent / totalCategorySpend) * 100) : 0
            return (
              <div key={c.id}>
                <div className="mb-1 flex items-center justify-between text-[12.5px]">
                  <div className="font-semibold">{c.name}</div>
                  <div className="num text-[var(--color-text-2)]">
                    {formatMoney(c.spent)} <span className="text-[var(--color-text-3)]">· {pct}%</span>
                  </div>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-white/6">
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, background: 'var(--color-expense)' }} />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </ScreenScroll>
  )
}
