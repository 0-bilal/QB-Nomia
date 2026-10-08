import { useState } from 'react'
import { SheetHandle } from './SheetHandle'
import { CategoryIconBox } from './CategoryVisual'
import { formatAmount } from '../lib/format'
import { BUDGET_STATE_COLOR, budgetState, categoryColor } from '../lib/categoryStats'
import type { Category } from '../types'

interface CategoryPickerSheetProps {
  open: boolean
  categories: Category[]
  /** نفس الفئات مرتّبة بالأكثر استخدامًا. */
  mostUsed: Category[]
  selectedId?: string
  spentOf: (categoryId: string) => number
  onSelect: (id: string) => void
  onAddNew: () => void
  onClose: () => void
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12.5 10 17l9-10" />
    </svg>
  )
}

function leftLabel(spent: number, limit?: number): string {
  const state = budgetState(spent, limit)
  if (state === 'none' || !limit) return '—'
  if (state === 'over') return 'تجاوز'
  if (state === 'reached') return 'وصلت للحد'
  return `متبقي ${formatAmount(limit - spent)}`
}

/** ورقة اختيار فئة المصروف: بحث، الأكثر استخدامًا، وشبكة أيقونات بترتيب المستخدم مع المتبقي من ميزانية كل فئة. */
export function CategoryPickerSheet({ open, categories, mostUsed, selectedId, spentOf, onSelect, onAddNew, onClose }: CategoryPickerSheetProps) {
  const [query, setQuery] = useState('')
  if (!open) return null

  const q = query.trim()
  const list = q ? categories.filter((c) => c.name.includes(q)) : categories
  const recent = mostUsed.slice(0, 4)

  function pick(id: string) {
    onSelect(id)
    setQuery('')
  }

  return (
    <div dir="rtl" className="fixed inset-0 z-[60] flex items-end justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-[6px]" style={{ animation: 'fade-in 180ms ease-out both' }} onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-label="اختر الفئة"
        className="relative flex max-h-[85vh] w-full max-w-[480px] flex-col rounded-t-[32px] border-x border-t border-[var(--color-border-strong)] bg-[var(--color-surface-elevated)] shadow-[0_-24px_60px_-20px_rgba(0,0,0,0.85)]"
        style={{ animation: 'sheet-in 420ms var(--ease-out-expo) both' }}
      >
        <SheetHandle onDismiss={onClose} />
        <div className="flex flex-shrink-0 items-center justify-between px-5 pb-3 pt-2">
          <div className="text-[17px] font-semibold">اختر الفئة</div>
          <button
            onClick={onClose}
            aria-label="إغلاق"
            className="qb-press flex h-9 w-9 items-center justify-center rounded-full text-[var(--color-text-2)]"
            style={{ background: 'rgba(255,255,255,0.08)' }}
          >
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4" style={{ paddingBottom: 'calc(22px + env(safe-area-inset-bottom))' }}>
          <label className="mb-3.5 flex h-11 items-center gap-2 rounded-2xl border border-[var(--color-border)] bg-[var(--color-void)] px-3.5 text-[var(--color-text-3)]">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ابحث عن فئة..."
              className="min-w-0 flex-1 bg-transparent text-[13px] text-[var(--color-text)] outline-none placeholder:text-[var(--color-text-3)]"
            />
          </label>

          {!q && recent.length > 1 && (
            <>
              <div className="mx-1 mb-2.5 text-[11.5px] font-semibold text-[var(--color-text-3)]">الأكثر استخدامًا</div>
              <div data-own-gesture className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {recent.map((c) => {
                  const selected = c.id === selectedId
                  return (
                    <button
                      key={c.id}
                      onClick={() => pick(c.id)}
                      className="qb-press flex flex-shrink-0 items-center gap-2 rounded-full border py-1.5 pe-3 ps-1.5 text-[12px] font-semibold"
                      style={
                        selected
                          ? { background: 'var(--color-accent)', color: 'var(--color-on-accent)', borderColor: 'transparent' }
                          : { background: 'var(--color-surface)', borderColor: 'var(--color-border)' }
                      }
                    >
                      <CategoryIconBox category={c} size={30} radius={15} />
                      {c.name}
                    </button>
                  )
                })}
              </div>
              <div className="mx-1 mb-2.5 text-[11.5px] font-semibold text-[var(--color-text-3)]">كل الفئات · بترتيبك</div>
            </>
          )}

          <div className="grid grid-cols-4 gap-x-1.5 gap-y-3">
            {list.map((c) => {
              const selected = c.id === selectedId
              const spent = spentOf(c.id)
              const state = budgetState(spent, c.budgetLimit)
              const color = categoryColor(c)
              return (
                <button key={c.id} onClick={() => pick(c.id)} className="qb-press relative flex flex-col items-center gap-1.5" aria-pressed={selected}>
                  {selected && (
                    <span
                      className="absolute z-[1] flex items-center justify-center rounded-full border-2 border-[var(--color-surface-elevated)]"
                      style={{ top: -6, left: 'calc(50% - 36px)', width: 20, height: 20, background: 'var(--color-accent)', color: 'var(--color-on-accent)' }}
                    >
                      <CheckIcon />
                    </span>
                  )}
                  <CategoryIconBox
                    category={c}
                    size={56}
                    radius={19}
                    iconSize={22}
                    style={{
                      boxShadow: selected ? `0 0 0 2.5px var(--color-surface-elevated), 0 0 0 4.5px ${color}` : undefined,
                      transform: selected ? 'scale(1.04)' : undefined,
                      transition: 'box-shadow 200ms ease, transform 200ms ease',
                    }}
                  />
                  <span className="max-w-[76px] truncate text-[11px] font-semibold" style={{ color: selected ? 'var(--color-text)' : 'var(--color-text-2)' }}>
                    {c.name}
                  </span>
                  <span className="num -mt-1 text-[9.5px]" style={{ color: state === 'near' || state === 'reached' || state === 'over' ? BUDGET_STATE_COLOR[state] : 'var(--color-text-3)' }}>
                    {leftLabel(spent, c.budgetLimit)}
                  </span>
                </button>
              )
            })}
            {!q && (
              <button onClick={onAddNew} className="qb-press flex flex-col items-center gap-1.5">
                <span
                  className="flex items-center justify-center border-[1.5px] border-dashed border-[var(--color-border-strong)] text-[var(--color-text-2)]"
                  style={{ width: 56, height: 56, borderRadius: 19 }}
                >
                  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                </span>
                <span className="text-[11px] font-semibold text-[var(--color-text-2)]">فئة جديدة</span>
              </button>
            )}
          </div>
          {list.length === 0 && <div className="py-6 text-center text-[12.5px] text-[var(--color-text-3)]">لا توجد فئة بهذا الاسم</div>}
        </div>
      </div>
    </div>
  )
}
