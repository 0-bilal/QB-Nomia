import { useNavigate } from 'react-router-dom'
import { useData } from '../../state/DataContext'
import { formatAmount, formatMoney, formatDate } from '../../lib/format'
import { EmptyState } from '../../components/ui'
import { softBg } from './debtTypes'
import { DebtHero, NUM_SHADOW, SectionHead } from './DebtVisuals'
import { useDebtHistory } from './useDebtHistory'
import { MONTHS_AR } from '../../lib/txFilters'

const color = 'var(--color-expense)'

function SalaryViolationIcon({ size = 20 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3.5 22 20.5H2Z" />
      <line x1="12" y1="9.5" x2="12" y2="14" />
      <circle cx="12" cy="17" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  )
}

/** محتوى تبويب "خصومات المخالفات" داخل شاشة الديون والسلف. */
export function SalaryViolationsPanel() {
  const { salaryViolations } = useData()
  const navigate = useNavigate()

  const year = String(new Date().getFullYear())
  const sorted = [...salaryViolations].sort((a, b) => b.date.localeCompare(a.date))
  const yearTotal = salaryViolations.filter((v) => v.date.startsWith(year)).reduce((sum, v) => sum + v.amount, 0)
  const h = useDebtHistory()
  /** مجموع السنة الآن، أو حتى الأسبوع المختار على السبارك. */
  const shownAt = (scrub: number | null) => (scrub === null ? yearTotal : h.violations[scrub])

  return (
    <>
      <DebtHero color={color} dates={h.dates} series={[{ color, values: h.violations }]} chartHeight={84}>
        {({ scrub, chart }) => (
          <>
            <div className="text-[12.5px] font-medium text-[var(--color-text-2)]">خصومات هذه السنة</div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="num text-[34px] font-bold" style={{ color: shownAt(scrub) > 0 ? color : 'var(--color-text-2)', textShadow: NUM_SHADOW }}>
                {formatAmount(shownAt(scrub))}
              </span>
              <span className="text-[13px] font-medium text-[var(--color-text-3)]">ر.س</span>
            </div>
            <div className="mt-0.5 text-[11.5px] text-[var(--color-text-3)]">
              {scrub !== null ? (
                'مجموع خصومات السنة حتى هذا الأسبوع'
              ) : sorted.length === 0 ? (
                'لا توجد خصومات مسجَّلة بعد'
              ) : (
                <>
                  {salaryViolations.length} خصومات · آخرها <span className="num">{formatDate(sorted[0].date)}</span>
                </>
              )}
            </div>
            {chart && (
              // السبارك بدل أعمدة الأشهر: مجموع السنة تراكميًا، الأقدم يسارًا واليوم يمينًا.
              <>
                <div className="mt-1">{chart}</div>
                <div dir="ltr" className="mt-1 flex justify-between text-[10px] text-[var(--color-text-3)]">
                  <span>{MONTHS_AR[Number(h.dates[0].slice(5, 7)) - 1]}</span>
                  <span>اليوم</span>
                </div>
              </>
            )}
          </>
        )
        }
      </DebtHero>

      <div className="mx-1 mt-3 flex items-center gap-2.5 rounded-[18px] border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-2.5 text-[11.5px] text-[var(--color-text-2)]">
        <span className="flex-shrink-0 text-[var(--color-text-3)]">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 11v6M12 7.5h.01" />
          </svg>
        </span>
        تُسجَّل الخصومات عند إضافة حركة راتب فيها خصم مخالفة
      </div>

      <SectionHead title="سجل الخصومات" hint={sorted.length ? 'اضغط للتعديل' : undefined} />
      {sorted.length === 0 ? (
        <EmptyState title="لا يوجد سجل بعد" />
      ) : (
        <div className="qb-card px-3.5 py-1">
          {sorted.map((v) => (
            <button
              key={v.id}
              onClick={() => navigate(`/debts/violations/${v.id}/edit`)}
              className="flex w-full items-center gap-3 border-t border-[var(--color-border)] py-2.5 text-right first:border-t-0"
            >
              <span className="flex flex-shrink-0 items-center justify-center" style={{ width: 40, height: 40, borderRadius: 14, background: softBg(color), color }}>
                <SalaryViolationIcon size={18} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-semibold">{v.note?.trim() || 'خصم مخالفة'}</div>
                <div className="mt-0.5 text-[10.5px] text-[var(--color-text-3)]">
                  <span className="num">{formatDate(v.date)}</span> · من راتب الشهر
                </div>
              </div>
              <span dir="ltr" className="num flex-shrink-0 text-[13.5px] font-bold" style={{ color }}>
                −{formatMoney(v.amount)}
              </span>
            </button>
          ))}
        </div>
      )}
    </>
  )
}
