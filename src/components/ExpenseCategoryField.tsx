import { CategoryIconBox } from './CategoryVisual'
import { formatAmount, formatMoney } from '../lib/format'
import { BUDGET_STATE_COLOR, budgetState, categoryColor } from '../lib/categoryStats'
import type { Category } from '../types'

interface ExpenseCategoryFieldProps {
  categories: Category[]
  mostUsed: Category[]
  selectedId: string
  spentOf: (categoryId: string) => number
  /** مبلغ المصروف الحالي — لحساب "بعد هذا المصروف". */
  amount: number
  onSelect: (id: string) => void
  onOpenAll: () => void
}

const QUICK_COUNT = 6

/**
 * اختيار فئة المصروف بشاشة الإضافة: صف سريع (المختارة أولًا ثم الأكثر استخدامًا) + "المزيد" لورقة كل الفئات،
 * وتحتها أثر هذا المصروف على ميزانية الفئة.
 */
export function ExpenseCategoryField({ categories, mostUsed, selectedId, spentOf, amount, onSelect, onOpenAll }: ExpenseCategoryFieldProps) {
  const selected = categories.find((c) => c.id === selectedId)
  const quick = [...(selected ? [selected] : []), ...mostUsed.filter((c) => c.id !== selectedId)].slice(0, QUICK_COUNT)

  const spentAfter = selected ? spentOf(selected.id) + amount : 0
  const state = selected ? budgetState(spentAfter, selected.budgetLimit) : 'none'
  const pct = selected?.budgetLimit ? Math.min(100, (spentAfter / selected.budgetLimit) * 100) : 0

  return (
    <div className="mb-5">
      <div className="mx-1.5 mb-2 flex items-center justify-between">
        <span className="text-[12px] font-semibold text-[var(--color-text-2)]">الفئة</span>
        {categories.length > 0 && (
          <button onClick={onOpenAll} className="flex items-center gap-1 text-[11.5px] font-semibold text-[var(--color-text-2)]">
            كل الفئات
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 6-6 6 6 6" />
            </svg>
          </button>
        )}
      </div>

      {categories.length === 0 ? (
        <button onClick={onOpenAll} className="qb-card qb-press flex w-full items-center justify-center gap-2 py-4 text-[13px] font-semibold text-[var(--color-text-2)]">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          أضف فئة مصاريف أولًا
        </button>
      ) : (
        <div data-own-gesture className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 pt-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {quick.map((c) => {
            const isSel = c.id === selectedId
            return (
              <button
                key={c.id}
                onClick={() => onSelect(c.id)}
                aria-pressed={isSel}
                className="qb-press flex w-[72px] flex-shrink-0 flex-col items-center gap-1.5 rounded-[20px] border px-1 py-2.5"
                style={{
                  background: isSel ? 'var(--color-surface-high)' : 'var(--color-surface)',
                  borderColor: isSel ? categoryColor(c) : 'var(--color-border)',
                  transition: 'background 200ms ease, border-color 200ms ease',
                }}
              >
                <CategoryIconBox category={c} size={40} radius={14} />
                <span className="max-w-[64px] truncate text-[10.5px] font-semibold" style={{ color: isSel ? 'var(--color-text)' : 'var(--color-text-2)' }}>
                  {c.name}
                </span>
              </button>
            )
          })}
          <button
            onClick={onOpenAll}
            className="qb-press flex w-[72px] flex-shrink-0 flex-col items-center gap-1.5 rounded-[20px] border border-[var(--color-border)] bg-[var(--color-surface)] px-1 py-2.5"
          >
            <span className="flex items-center justify-center bg-[var(--color-surface-high)] text-[var(--color-text-2)]" style={{ width: 40, height: 40, borderRadius: 14 }}>
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                <circle cx="5" cy="12" r="1.8" />
                <circle cx="12" cy="12" r="1.8" />
                <circle cx="19" cy="12" r="1.8" />
              </svg>
            </span>
            <span className="text-[10.5px] font-semibold text-[var(--color-text-2)]">المزيد</span>
          </button>
        </div>
      )}

      {selected && (
        <div className="mt-3 flex items-center gap-2.5 rounded-[18px] border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-2.5 text-[12px] text-[var(--color-text-2)]">
          <CategoryIconBox category={selected} size={28} radius={9} />
          {selected.budgetLimit ? (
            <div className="min-w-0 flex-1">
              <div className="mb-1.5 flex justify-between gap-2">
                <span>بعد هذا المصروف</span>
                <span className="num font-bold" style={{ color: BUDGET_STATE_COLOR[state] }}>
                  {formatAmount(spentAfter)} / {formatMoney(selected.budgetLimit)}
                </span>
              </div>
              <div className="overflow-hidden rounded-full bg-white/[0.07]" style={{ height: 5 }}>
                <div className="h-full rounded-full" style={{ width: `${pct}%`, background: BUDGET_STATE_COLOR[state], transition: 'width 300ms ease' }} />
              </div>
            </div>
          ) : (
            <span>
              فئة <b className="font-semibold text-[var(--color-text)]">{selected.name}</b> بدون ميزانية شهرية
            </span>
          )}
        </div>
      )}
    </div>
  )
}
