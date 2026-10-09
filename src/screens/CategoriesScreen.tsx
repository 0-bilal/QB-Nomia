import { useMemo, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useData } from '../state/DataContext'
import { formatAmount, formatDate, formatMoney } from '../lib/format'
import { ScreenScroll } from '../components/ScreenScroll'
import { ScreenHeader } from '../components/ScreenHeader'
import { SheetHandle } from '../components/SheetHandle'
import { CategoryIconBox } from '../components/CategoryVisual'
import { EmptyState, HeaderAddButton } from '../components/ui'
import { BUDGET_STATE_COLOR, budgetLeftLabel, budgetState, categoryColor, monthProgress, type BudgetState } from '../lib/categoryStats'
import type { Category } from '../types'
import { haptic } from '../lib/haptics'
import { CATEGORY_PERIOD_LABEL, allTimeStats, changePct, inComparison, inPeriod, periodMonthNumber, spentByCategory, type CategoryPeriod } from '../lib/categoryPeriod'

type Filter = 'all' | 'over' | 'near' | 'none'

const FILTERS: [Filter, string][] = [
  ['all', 'الكل'],
  ['over', 'تجاوزت'],
  ['near', 'قاربت'],
  ['none', 'بدون ميزانية'],
]

function matchesFilter(state: BudgetState, filter: Filter): boolean {
  if (filter === 'all') return true
  if (filter === 'over') return state === 'over' || state === 'reached'
  if (filter === 'near') return state === 'near'
  return state === 'none'
}

function Svg({ size = 18, strokeWidth = 1.9, children }: { size?: number; strokeWidth?: number; children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  )
}
const EditGlyph = ({ size = 18 }: { size?: number }) => (
  <Svg size={size}>
    <path d="M4 20h4L18.5 9.5a2.1 2.1 0 0 0-3-3L5 17v3Z" />
    <path d="M13.5 8 16 10.5" />
  </Svg>
)

/**
 * متنقّل الفترة داخل البطاقة: سهمان بين الشهر الماضي والشهر الحالي، والاسم مع رقم الشهر تحته،
 * وزر «الكل» بجانبه.
 */
function PeriodStepper({ period, onChange }: { period: CategoryPeriod; onChange: (p: CategoryPeriod) => void }) {
  const set = (p: CategoryPeriod) => {
    if (p === period) return
    haptic('tick')
    onChange(p)
  }
  const num = periodMonthNumber(period, new Date())
  const arrow = 'qb-press flex h-[30px] w-[30px] items-center justify-center rounded-full bg-white/[0.07] text-[var(--color-text-2)] disabled:opacity-30'
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-1.5">
        <button onClick={() => set('last')} disabled={period === 'last'} aria-label="الشهر الماضي" className={arrow}>
          <Svg size={14} strokeWidth={2.4}>
            <path d="m9 6 6 6-6 6" />
          </Svg>
        </button>
        <div key={period} className="min-w-[88px] text-center" style={{ animation: 'qb-pop 360ms var(--ease-spring) both' }}>
          <div className="text-[12.5px] font-semibold leading-tight">{CATEGORY_PERIOD_LABEL[period]}</div>
          {num && <div className="num text-[10.5px] text-[var(--color-text-3)]">{num}</div>}
        </div>
        <button onClick={() => set('cur')} disabled={period === 'cur'} aria-label="الشهر الحالي" className={arrow}>
          <Svg size={14} strokeWidth={2.4}>
            <path d="m15 6-6 6 6 6" />
          </Svg>
        </button>
      </div>
      <button
        onClick={() => set(period === 'all' ? 'cur' : 'all')}
        aria-pressed={period === 'all'}
        className="qb-press rounded-full px-3 py-1 text-[11.5px] font-semibold"
        style={period === 'all' ? { background: 'var(--color-accent)', color: 'var(--color-on-accent)' } : { background: 'rgba(255,255,255,0.07)', color: 'var(--color-text-2)' }}
      >
        الكل
      </button>
    </div>
  )
}

/** شارة التغيّر عن فترة المقارنة: المصروف الأعلى أحمر، والأقل أخضر. */
function ChangeBadge({ pct, small = false }: { pct: number | null; small?: boolean }) {
  if (pct === null) return null
  const color = pct > 0 ? 'var(--color-expense)' : pct < 0 ? 'var(--color-income)' : 'var(--color-text-3)'
  return (
    <span
      dir="ltr"
      className={`num inline-flex flex-shrink-0 items-center gap-0.5 rounded-full font-semibold ${small ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-[11px]'}`}
      style={{ background: `color-mix(in srgb, ${color} 13%, transparent)`, color }}
    >
      {pct !== 0 && (
        <Svg size={small ? 9 : 10} strokeWidth={2.8}>
          <path d={pct > 0 ? 'M12 19V5M6 11l6-6 6 6' : 'M12 5v14M6 13l6 6 6-6'} />
        </Svg>
      )}
      {Math.abs(pct)}%
    </span>
  )
}

function BudgetDialog({
  open,
  title,
  desc,
  clearLabel,
  initialValue,
  onSave,
  onClear,
  onCancel,
}: {
  open: boolean
  title: string
  desc: string
  clearLabel: string
  initialValue: number | null
  onSave: (value: number) => void
  onClear: () => void
  onCancel: () => void
}) {
  const [value, setValue] = useState(initialValue ? String(initialValue) : '')

  if (!open) return null

  const numeric = Number(value)
  const canSave = value.trim() !== '' && numeric > 0

  return (
    <div dir="rtl" className="fixed inset-0 z-[70] flex items-center justify-center px-6">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-[6px]" style={{ animation: 'fade-in 180ms ease-out both' }} onClick={onCancel} aria-hidden="true" />
      <div
        className="relative w-full max-w-[330px] rounded-[32px] border border-[var(--color-border-strong)] bg-[var(--color-surface-elevated)] p-6 text-center shadow-[0_30px_70px_-20px_rgba(0,0,0,0.9)]"
        style={{ animation: 'qb-pop 340ms var(--ease-spring) both' }}
      >
        <div className="mb-2 text-[17px] font-semibold">{title}</div>
        <div className="mb-4 text-[12.5px] leading-relaxed text-[var(--color-text-2)]">{desc}</div>
        <input
          autoFocus
          dir="ltr"
          inputMode="decimal"
          value={value}
          onChange={(e) => setValue(e.target.value.replace(/[^0-9.]/g, ''))}
          placeholder="0"
          className="num mb-5 w-full rounded-[20px] border border-[var(--color-border)] bg-[var(--color-void)] px-4 py-4 text-center text-[28px] font-bold outline-none placeholder:text-[var(--color-text-3)]"
        />
        <div className="flex gap-2.5">
          <button onClick={onCancel} className="qb-press flex-1 rounded-full bg-white/[0.06] py-3 text-[13.5px] font-medium text-[var(--color-text)]">
            إلغاء
          </button>
          <button
            onClick={() => canSave && onSave(numeric)}
            disabled={!canSave}
            className="qb-press flex-1 rounded-full py-3 text-[13.5px] font-semibold text-[#0A0A0C] disabled:opacity-35"
            style={{ background: 'var(--color-accent)' }}
          >
            حفظ
          </button>
        </div>
        {initialValue !== null && (
          <button onClick={onClear} className="mt-3 text-[12px] font-semibold" style={{ color: 'var(--color-expense)' }}>
            {clearLabel}
          </button>
        )}
      </div>
    </div>
  )
}

function Meter({ pct, color, height = 10, marker }: { pct: number; color: string; height?: number; marker?: number }) {
  return (
    <div className="relative overflow-hidden rounded-full bg-white/[0.07]" style={{ height }}>
      <div className="h-full rounded-full" style={{ width: `${Math.max(0, Math.min(100, pct))}%`, background: color, transition: 'width 400ms ease' }} />
      {marker !== undefined && (
        <span className="absolute rounded-sm bg-white/50" style={{ top: -2, bottom: -2, width: 2, right: `${Math.min(100, marker)}%` }} title="المتوقع حتى اليوم" />
      )}
    </div>
  )
}

function StatRow({ items }: { items: { v: string; k: string; color?: string }[] }) {
  return (
    <div className="mt-3.5 grid grid-cols-3 gap-2">
      {items.map((s) => (
        <div key={s.k} className="rounded-2xl bg-white/[0.04] px-2 py-2.5 text-center">
          <div className="num text-[14.5px] font-bold" style={{ color: s.color }}>
            {s.v}
          </div>
          <div className="mt-0.5 text-[10.5px] text-[var(--color-text-3)]">{s.k}</div>
        </div>
      ))}
    </div>
  )
}

function CategoryTile({
  category,
  spent,
  change,
  monthlyAverage,
  onClick,
}: {
  category: Category
  spent: number
  /** التغيّر عن فترة المقارنة (الشهر فقط). */
  change: number | null
  /** في «الكل»: المتوسط الشهري بدل الميزانية. */
  monthlyAverage: number | null
  onClick: () => void
}) {
  const color = categoryColor(category)
  const state = budgetState(spent, category.budgetLimit)
  const pct = category.budgetLimit ? (spent / category.budgetLimit) * 100 : 0
  return (
    <button
      onClick={onClick}
      className="qb-press relative flex min-h-[132px] flex-col overflow-hidden rounded-[22px] border border-[var(--color-border)] bg-[var(--color-surface)] p-3.5 text-right"
    >
      <span className="pointer-events-none absolute rounded-full" style={{ left: -30, bottom: -40, width: 110, height: 110, background: color, filter: 'blur(30px)', opacity: 0.16 }} />
      <div className="relative flex items-start justify-between">
        <CategoryIconBox category={category} size={40} radius={14} />
        <ChangeBadge pct={change} small />
      </div>
      <div className="relative mt-2.5 truncate text-[13.5px] font-semibold">{category.name}</div>
      <div className="num relative mt-px text-[16px] font-bold" style={{ color: spent > 0 ? undefined : 'var(--color-text-3)' }}>
        {formatAmount(spent)} <span className="font-sans text-[10.5px] font-medium text-[var(--color-text-3)]">ر.س</span>
      </div>
      {monthlyAverage !== null ? (
        <div className="relative mt-auto flex justify-between gap-1 pt-2.5 text-[10.5px] text-[var(--color-text-3)]">
          <span>متوسط شهري</span>
          <span className="num text-[var(--color-text-2)]">{formatAmount(Math.round(monthlyAverage))}</span>
        </div>
      ) : category.budgetLimit ? (
        <div className="relative mt-auto pt-2.5">
          <Meter pct={pct} color={BUDGET_STATE_COLOR[state]} height={5} />
          <div className="mt-1.5 flex justify-between gap-1 text-[10.5px] text-[var(--color-text-3)]">
            <span className="truncate" style={{ color: state === 'ok' ? undefined : BUDGET_STATE_COLOR[state] }}>
              {budgetLeftLabel(spent, category.budgetLimit, formatAmount)}
            </span>
            <span className="num flex-shrink-0">{formatAmount(category.budgetLimit)}</span>
          </div>
        </div>
      ) : (
        <div className="relative mt-auto pt-2 text-[10.5px] text-[var(--color-text-3)]">بدون ميزانية</div>
      )}
    </button>
  )
}

function CategoryDetailSheet({
  category,
  period,
  onPeriodChange,
  onClose,
  onEditBudget,
}: {
  category: Category
  period: CategoryPeriod
  onPeriodChange: (p: CategoryPeriod) => void
  onClose: () => void
  onEditBudget: () => void
}) {
  const { transactions } = useData()
  const navigate = useNavigate()
  const now = new Date()
  const allTx = transactions.filter((t) => t.type === 'expense' && t.categoryId === category.id)
  const categoryTx = allTx
    .filter((t) => inPeriod(t.date, period, now))
    .sort((a, b) => b.date.localeCompare(a.date) || (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))
  const spent = categoryTx.reduce((sum, t) => sum + t.amount, 0)
  const prev = allTx.filter((t) => inComparison(t.date, period, now)).reduce((sum, t) => sum + t.amount, 0)
  const state = budgetState(spent, category.budgetLimit)
  const monthly = period !== 'all'
  const avg = monthly ? 0 : allTimeStats(allTx, now).monthlyAverage

  const actions: { label: string; icon: ReactNode; onClick: () => void }[] = [
    {
      label: category.budgetLimit ? 'تعديل الميزانية' : 'تحديد ميزانية',
      icon: (
        <Svg>
          <circle cx="12" cy="12" r="9" />
          <circle cx="12" cy="12" r="5" />
          <circle cx="12" cy="12" r="1.3" />
        </Svg>
      ),
      onClick: onEditBudget,
    },
    {
      label: 'كل الحركات',
      icon: (
        <Svg>
          <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
        </Svg>
      ),
      onClick: () => navigate(`/transactions?category=${encodeURIComponent(category.name)}${period === 'all' ? '' : `&period=${period === 'cur' ? 'month' : 'last'}`}`),
    },
    { label: 'تعديل الفئة', icon: <EditGlyph />, onClick: () => navigate(`/categories/${category.id}/edit`) },
  ]

  return (
    <div dir="rtl" className="fixed inset-0 z-[60] flex items-end justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-[6px]" style={{ animation: 'fade-in 180ms ease-out both' }} onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-label="تفاصيل الفئة"
        className="relative flex max-h-[85vh] w-full max-w-[480px] flex-col rounded-t-[32px] border-x border-t border-[var(--color-border-strong)] bg-[var(--color-surface-elevated)] shadow-[0_-24px_60px_-20px_rgba(0,0,0,0.85)]"
        style={{ animation: 'sheet-in 420ms var(--ease-out-expo) both' }}
      >
        <SheetHandle onDismiss={onClose} />
        <div className="flex-1 overflow-y-auto px-4 pt-2" style={{ paddingBottom: 'calc(22px + env(safe-area-inset-bottom))' }}>
          <div className="mb-3.5 flex items-center gap-3">
            <CategoryIconBox category={category} size={52} radius={18} iconSize={24} />
            <div className="min-w-0">
              <div className="truncate text-[17px] font-bold">{category.name}</div>
              <div className="text-[12px] text-[var(--color-text-3)]">
                <span className="num">{categoryTx.length}</span> حركة · {CATEGORY_PERIOD_LABEL[period]}
              </div>
            </div>
          </div>

          <div className="qb-card p-3.5">
            <PeriodStepper period={period} onChange={onPeriodChange} />
            <div className="mt-3 flex items-center justify-between gap-2">
              <span className="text-[12.5px] font-medium text-[var(--color-text-2)]">{monthly ? 'المصروف' : 'كل المصروف'}</span>
              <span className="flex items-baseline gap-1.5">
                <span className="self-center">
                  <ChangeBadge pct={monthly ? changePct(spent, prev) : null} />
                </span>
                <span className="num text-[22px] font-bold">{formatAmount(spent)}</span>
                <span className="text-[12px] font-medium text-[var(--color-text-3)]">ر.س</span>
              </span>
            </div>
            {!monthly ? (
              <div className="mt-2 text-[12px] text-[var(--color-text-3)]">
                متوسط شهري <b className="num font-semibold text-[var(--color-text-2)]">{formatAmount(Math.round(avg))}</b> ر.س
              </div>
            ) : category.budgetLimit ? (
              <>
                <div className="mb-1.5 mt-3">
                  <Meter pct={(spent / category.budgetLimit) * 100} color={BUDGET_STATE_COLOR[state]} />
                </div>
                <div className="flex justify-between text-[11px] text-[var(--color-text-3)]">
                  <span style={{ color: BUDGET_STATE_COLOR[state] }}>{budgetLeftLabel(spent, category.budgetLimit, formatMoney)}</span>
                  <span className="num">الميزانية {formatMoney(category.budgetLimit)}</span>
                </div>
              </>
            ) : (
              <div className="mt-2 text-[12px] text-[var(--color-text-3)]">لا توجد ميزانية لهذه الفئة</div>
            )}
          </div>

          <div className="my-3.5 grid grid-cols-3 gap-2">
            {actions.map((a) => (
              <button
                key={a.label}
                onClick={a.onClick}
                className="qb-press flex flex-col items-center gap-1.5 rounded-[18px] border border-[var(--color-border)] bg-[var(--color-surface)] px-1 py-3 text-[11px] font-semibold text-[var(--color-text-2)]"
              >
                <span className="text-[var(--color-text)]">{a.icon}</span>
                {a.label}
              </button>
            ))}
          </div>

          <div className="mx-1 mb-2 text-[11.5px] font-semibold text-[var(--color-text-3)]">{monthly ? `حركات ${CATEGORY_PERIOD_LABEL[period]}` : 'آخر الحركات'}</div>
          {categoryTx.length === 0 ? (
            <div className="qb-card py-5 text-center text-[12px] text-[var(--color-text-3)]">
              {monthly ? `لا مصاريف على هذه الفئة في ${CATEGORY_PERIOD_LABEL[period]}` : 'لا توجد مصاريف على هذه الفئة بعد'}
            </div>
          ) : (
            <div className="qb-card px-3.5 py-1">
              {categoryTx.slice(0, 5).map((t) => (
                <button
                  key={t.id}
                  onClick={() => navigate(`/add/transaction/${t.id}`)}
                  className="flex w-full items-center gap-2.5 border-t border-[var(--color-border)] py-2.5 text-right first:border-t-0"
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[12.5px] font-semibold">{t.note?.trim() || category.name}</div>
                    <div className="text-[10.5px] font-medium text-[var(--color-text-3)]">{formatDate(t.date)}</div>
                  </div>
                  <div dir="ltr" className="num flex-shrink-0 text-[13px] font-bold">
                    −{formatMoney(t.amount)}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export function CategoriesScreen() {
  const { categories, transactions, monthlyBudgetLimit, setMonthlyBudgetLimit, moveCategoryUp, moveCategoryDown, updateCategory } = useData()
  const navigate = useNavigate()
  const [overallDialogOpen, setOverallDialogOpen] = useState(false)
  const [budgetFor, setBudgetFor] = useState<Category | null>(null)
  const [detailId, setDetailId] = useState<string | null>(null)
  const [filter, setFilter] = useState<Filter>('all')
  const [ordering, setOrdering] = useState(false)
  const [period, setPeriodState] = useState<CategoryPeriod>('cur')
  const setPeriod = (p: CategoryPeriod) => {
    setPeriodState(p)
    // فلاتر الميزانية شهرية — ما لها معنى في «الكل».
    if (p === 'all') setFilter('all')
  }

  const expenseCategories = categories.filter((c) => c.kind === 'expense')
  const todayKey = new Date().toDateString()
  // مصروف الفترة والمقارنة لكل فئة — المفتاح '' للمصروف بدون فئة.
  const { spentMap, prevMap, stats, periodCount } = useMemo(() => {
    const now = new Date()
    return {
      spentMap: spentByCategory(transactions, (d) => inPeriod(d, period, now)),
      prevMap: period === 'all' ? null : spentByCategory(transactions, (d) => inComparison(d, period, now)),
      stats: allTimeStats(transactions, now),
      periodCount: transactions.filter((t) => t.type === 'expense' && inPeriod(t.date, period, now)).length,
    }
    // todayKey: يعيد الحساب لو تغيّر اليوم والشاشة مفتوحة.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactions, period, todayKey])
  const spentOf = (id: string) => spentMap.get(id) ?? 0
  const changeOf = (id: string) => (prevMap ? changePct(spentOf(id), prevMap.get(id) ?? 0) : null)

  const monthExpense = [...spentMap.values()].reduce((a, b) => a + b, 0)
  const prevExpense = prevMap ? [...prevMap.values()].reduce((a, b) => a + b, 0) : 0
  const { day, days, daysLeft } = monthProgress()
  const overallState = budgetState(monthExpense, monthlyBudgetLimit ?? undefined)
  const overallPct = monthlyBudgetLimit ? (monthExpense / monthlyBudgetLimit) * 100 : 0
  const remaining = monthlyBudgetLimit ? Math.max(0, monthlyBudgetLimit - monthExpense) : 0
  const lastMonthDays = new Date(new Date().getFullYear(), new Date().getMonth(), 0).getDate()

  const totalSpent = expenseCategories.reduce((s, c) => s + spentOf(c.id), 0)
  const bySpend = expenseCategories.filter((c) => spentOf(c.id) > 0).sort((a, b) => spentOf(b.id) - spentOf(a.id))
  const legendTop = bySpend.slice(0, 5)
  const legendRest = bySpend.slice(5).reduce((s, c) => s + spentOf(c.id), 0)

  const monthly = period !== 'all'
  const counts: Record<Filter, number> = { all: 0, over: 0, near: 0, none: 0 }
  for (const c of expenseCategories) {
    const st = budgetState(spentOf(c.id), c.budgetLimit)
    for (const [f] of FILTERS) if (matchesFilter(st, f)) counts[f]++
  }
  const visible = expenseCategories.filter((c) => matchesFilter(budgetState(spentOf(c.id), c.budgetLimit), filter))
  const detail = detailId ? expenseCategories.find((c) => c.id === detailId) : undefined

  return (
    <ScreenScroll header={<ScreenHeader title="فئات المصاريف" onBack={() => navigate(-1)} right={<HeaderAddButton label="إضافة فئة" onClick={() => navigate('/categories/new')} />} />}>
      <BudgetDialog
        key={`overall-${overallDialogOpen}`}
        open={overallDialogOpen}
        title="السقف الشهري للمصاريف"
        desc="سقف عام لكل مصاريفك الشهرية، بجانب ميزانيات الفئات الفردية"
        clearLabel="إزالة السقف الشهري"
        initialValue={monthlyBudgetLimit}
        onSave={(v) => {
          setMonthlyBudgetLimit(v)
          setOverallDialogOpen(false)
        }}
        onClear={() => {
          setMonthlyBudgetLimit(null)
          setOverallDialogOpen(false)
        }}
        onCancel={() => setOverallDialogOpen(false)}
      />
      <BudgetDialog
        key={`cat-${budgetFor?.id ?? 'none'}`}
        open={budgetFor !== null}
        title={`ميزانية ${budgetFor?.name ?? ''}`}
        desc="الحد الشهري لمصاريف هذه الفئة"
        clearLabel="إزالة ميزانية الفئة"
        initialValue={budgetFor?.budgetLimit ?? null}
        onSave={(v) => {
          if (budgetFor) updateCategory(budgetFor.id, { name: budgetFor.name, kind: budgetFor.kind, icon: budgetFor.icon, budgetLimit: v })
          setBudgetFor(null)
        }}
        onClear={() => {
          if (budgetFor) updateCategory(budgetFor.id, { name: budgetFor.name, kind: budgetFor.kind, icon: budgetFor.icon, budgetLimit: undefined })
          setBudgetFor(null)
        }}
        onCancel={() => setBudgetFor(null)}
      />
      {detail && (
        <CategoryDetailSheet
          category={detail}
          period={period}
          onPeriodChange={setPeriod}
          onClose={() => setDetailId(null)}
          onEditBudget={() => setBudgetFor(detail)}
        />
      )}

      {/* بطاقة الفترة: المتنقّل في رأسها، والمحتوى يتغيّر حسب الفترة */}
      <div className="qb-card-elevated qb-rise mb-1 p-[18px]">
        <PeriodStepper period={period} onChange={setPeriod} />

        <div key={period} style={{ animation: 'qb-rise 420ms var(--ease-out-expo) both' }}>
          <div className="mt-3 flex items-baseline gap-1.5">
            <span className="num text-[32px] font-bold" style={{ color: monthly && overallState === 'over' ? 'var(--color-expense)' : undefined }}>
              {formatAmount(monthExpense)}
            </span>
            <span className="num text-[13px] font-medium text-[var(--color-text-3)]">{monthly && monthlyBudgetLimit ? `/ ${formatAmount(monthlyBudgetLimit)} ر.س` : 'ر.س'}</span>
            {monthly && (
              <span className="self-center">
                <ChangeBadge pct={changePct(monthExpense, prevExpense)} />
              </span>
            )}
            {monthly && <button
              onClick={() => setOverallDialogOpen(true)}
              aria-label={monthlyBudgetLimit ? 'تعديل السقف الشهري' : 'تحديد سقف شهري'}
              className="qb-press ms-auto flex h-[30px] w-[30px] flex-shrink-0 items-center justify-center self-center rounded-full bg-white/[0.07] text-[var(--color-text-2)]"
            >
              <EditGlyph size={13} />
            </button>}
          </div>

          {period === 'cur' &&
            (monthlyBudgetLimit ? (
              <>
                <div className="mb-2 mt-3.5">
                  <Meter pct={overallPct} color={BUDGET_STATE_COLOR[overallState]} marker={(day / days) * 100} />
                </div>
                <div className="flex justify-between text-[11px] text-[var(--color-text-3)]">
                  <span>
                    <b className="num" style={{ color: BUDGET_STATE_COLOR[overallState] }}>
                      {Math.round(overallPct)}%
                    </b>{' '}
                    من السقف
                  </span>
                  <span>
                    مقارنة بأول <span className="num">{day}</span> أيام من الشهر الماضي
                  </span>
                </div>
                <StatRow
                  items={[
                    { v: formatAmount(remaining), k: overallState === 'over' ? 'تجاوزت السقف' : 'متبقي' },
                    { v: formatAmount(Math.floor(remaining / daysLeft)), k: 'مسموح يوميًا' },
                    { v: String(daysLeft), k: 'يوم متبقي' },
                  ]}
                />
              </>
            ) : (
              <div className="mt-2 text-[12px] text-[var(--color-text-3)]">حدّد سقفًا شهريًا لترى المتبقي والمسموح صرفه يوميًا</div>
            ))}

          {period === 'last' && (
            <>
              {monthlyBudgetLimit ? (
                <>
                  <div className="mb-2 mt-3.5">
                    <Meter pct={overallPct} color={BUDGET_STATE_COLOR[overallState]} />
                  </div>
                  <div className="flex justify-between text-[11px] text-[var(--color-text-3)]">
                    <span>
                      <b className="num" style={{ color: BUDGET_STATE_COLOR[overallState] }}>
                        {Math.round(overallPct)}%
                      </b>{' '}
                      من السقف
                    </span>
                    <span>شهر مكتمل</span>
                  </div>
                </>
              ) : (
                <div className="mt-1 text-[11.5px] text-[var(--color-text-3)]">شهر مكتمل</div>
              )}
              <StatRow
                items={[
                  monthlyBudgetLimit
                    ? {
                        v: formatAmount(Math.abs(monthlyBudgetLimit - monthExpense)),
                        k: monthExpense > monthlyBudgetLimit ? 'تجاوزت السقف' : 'وفّرت من السقف',
                        color: monthExpense > monthlyBudgetLimit ? 'var(--color-expense)' : 'var(--color-income)',
                      }
                    : { v: String(periodCount), k: 'حركة' },
                  { v: formatAmount(Math.round(monthExpense / lastMonthDays)), k: 'متوسط يومي' },
                  { v: String(expenseCategories.filter((c) => spentOf(c.id) > 0).length), k: 'فئة صرفت عليها' },
                ]}
              />
            </>
          )}

          {period === 'all' &&
            (stats.since ? (
              <>
                <div className="mt-0.5 text-[11.5px] text-[var(--color-text-3)]">
                  منذ <span className="num">{formatDate(stats.since)}</span> · <span className="num">{stats.months}</span> {stats.months <= 10 ? 'أشهر' : 'شهر'}
                </div>
                <StatRow
                  items={[
                    { v: formatAmount(Math.round(stats.monthlyAverage)), k: 'متوسط شهري' },
                    { v: formatAmount(stats.topMonth?.total ?? 0), k: 'أعلى شهر' },
                    { v: stats.topMonth ? `${Number(stats.topMonth.key.slice(5, 7))}/${stats.topMonth.key.slice(0, 4)}` : '—', k: 'الشهر الأعلى' },
                  ]}
                />
              </>
            ) : (
              <div className="mt-2 text-[12px] text-[var(--color-text-3)]">لا توجد مصاريف مسجّلة بعد</div>
            ))}
        </div>
      </div>

      {totalSpent > 0 && (
        <>
          <div className="mx-1.5 mb-2.5 mt-6 flex items-baseline justify-between gap-2">
            <span className="text-[14px] font-semibold">أين تذهب مصاريفك</span>
            <span className="text-[11px] text-[var(--color-text-3)]">
              {CATEGORY_PERIOD_LABEL[period]}
              {monthly && <span className="num"> · {periodMonthNumber(period, new Date())}</span>}
            </span>
          </div>
          <div className="qb-card p-3.5">
            <div className="flex h-3 gap-0.5 overflow-hidden rounded-full">
              {bySpend.map((c) => (
                <span key={c.id} title={c.name} className="h-full" style={{ flexGrow: spentOf(c.id), background: categoryColor(c) }} />
              ))}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2">
              {legendTop.map((c) => (
                <div key={c.id} className="flex min-w-0 items-center gap-1.5 text-[11.5px] text-[var(--color-text-2)]">
                  <i className="flex-shrink-0 rounded-[3px]" style={{ width: 8, height: 8, background: categoryColor(c) }} />
                  <span className="min-w-0 flex-1 truncate">{c.name}</span>
                  <b className="num font-semibold text-[var(--color-text)]">{Math.round((spentOf(c.id) / totalSpent) * 100)}%</b>
                </div>
              ))}
              {legendRest > 0 && (
                <div className="flex min-w-0 items-center gap-1.5 text-[11.5px] text-[var(--color-text-2)]">
                  <i className="flex-shrink-0 rounded-[3px] bg-[var(--color-surface-high)]" style={{ width: 8, height: 8 }} />
                  <span className="min-w-0 flex-1 truncate">أخرى</span>
                  <b className="num font-semibold text-[var(--color-text)]">{Math.round((legendRest / totalSpent) * 100)}%</b>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      <div className="mx-1.5 mb-2.5 mt-6 flex items-center justify-between">
        <span className="text-[14px] font-semibold">الفئات</span>
        {expenseCategories.length > 1 && (
          <button
            onClick={() => setOrdering((o) => !o)}
            className="qb-press flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11.5px] font-semibold"
            style={
              ordering
                ? { background: 'var(--color-accent)', color: 'var(--color-on-accent)', borderColor: 'transparent' }
                : { background: 'var(--color-surface-elevated)', color: 'var(--color-text-2)', borderColor: 'var(--color-border)' }
            }
          >
            <Svg size={13} strokeWidth={2.2}>
              <path d="M7 4v16M3 8l4-4 4 4M17 20V4M21 16l-4 4-4-4" />
            </Svg>
            {ordering ? 'تم' : 'ترتيب'}
          </button>
        )}
      </div>

      {expenseCategories.length === 0 ? (
        <EmptyState title="لا توجد فئات بعد" actionLabel="إضافة فئة" onAction={() => navigate('/categories/new')} />
      ) : ordering ? (
        <>
          <div className="mx-1.5 mb-2.5 text-[11.5px] text-[var(--color-text-3)]">الأعلى يظهر أولًا عند اختيار الفئة في مصروف جديد</div>
          <div className="qb-card">
            {expenseCategories.map((c, i) => (
              <div key={c.id} className="flex items-center gap-3 border-t border-[var(--color-border)] px-3.5 py-2.5 first:border-t-0">
                <span className="num w-5 text-center text-[11px] text-[var(--color-text-3)]">{i + 1}</span>
                <CategoryIconBox category={c} size={36} radius={12} />
                <span className="min-w-0 flex-1 truncate text-[13.5px] font-semibold">{c.name}</span>
                <div data-own-gesture className="flex gap-1.5">
                  <button
                    onClick={() => moveCategoryUp(c.id)}
                    disabled={i === 0}
                    aria-label="نقل الفئة لأعلى"
                    className="qb-press flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-surface-high)] text-[var(--color-text-2)] disabled:opacity-25"
                  >
                    <Svg size={14} strokeWidth={2.4}>
                      <path d="M5 15 12 8l7 7" />
                    </Svg>
                  </button>
                  <button
                    onClick={() => moveCategoryDown(c.id)}
                    disabled={i === expenseCategories.length - 1}
                    aria-label="نقل الفئة لأسفل"
                    className="qb-press flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-surface-high)] text-[var(--color-text-2)] disabled:opacity-25"
                  >
                    <Svg size={14} strokeWidth={2.4}>
                      <path d="M5 9l7 7 7-7" />
                    </Svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <>
          {monthly && (
          <div data-own-gesture className="-mx-5 mb-3 flex gap-1.5 overflow-x-auto px-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {FILTERS.map(([key, label]) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className="qb-press flex flex-shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-semibold"
                style={
                  filter === key
                    ? { background: 'var(--color-accent)', color: 'var(--color-on-accent)', borderColor: 'transparent' }
                    : { background: 'var(--color-surface)', color: 'var(--color-text-2)', borderColor: 'var(--color-border)' }
                }
              >
                {label}
                <span className="num text-[10.5px] opacity-70">{counts[key]}</span>
              </button>
            ))}
          </div>
          )}
          {visible.length === 0 ? (
            <div className="qb-card py-8 text-center text-[12.5px] text-[var(--color-text-3)]">لا توجد فئات في هذا التصنيف</div>
          ) : (
            <div className="qb-rise grid grid-cols-2 gap-2.5">
              {visible.map((c) => (
                <CategoryTile
                  key={c.id}
                  category={c}
                  spent={spentOf(c.id)}
                  change={changeOf(c.id)}
                  monthlyAverage={monthly ? null : spentOf(c.id) / Math.max(1, stats.months)}
                  onClick={() => setDetailId(c.id)}
                />
              ))}
              {filter === 'all' && (
                <button
                  onClick={() => navigate('/categories/new')}
                  className="qb-press flex min-h-[132px] flex-col items-center justify-center gap-2 rounded-[22px] border border-dashed border-[var(--color-border-strong)] text-[12.5px] font-semibold text-[var(--color-text-2)]"
                >
                  <span className="flex items-center justify-center rounded-[14px] bg-[var(--color-surface-elevated)] text-[var(--color-text)]" style={{ width: 40, height: 40 }}>
                    <Svg size={20} strokeWidth={2.2}>
                      <path d="M12 5v14M5 12h14" />
                    </Svg>
                  </span>
                  فئة جديدة
                </button>
              )}
            </div>
          )}
        </>
      )}
    </ScreenScroll>
  )
}
