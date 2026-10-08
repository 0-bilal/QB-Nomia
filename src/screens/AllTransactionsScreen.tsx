import { useMemo, useState, type CSSProperties } from 'react'
import { useNavigate } from 'react-router-dom'
import { useData } from '../state/DataContext'
import { ScreenScroll } from '../components/ScreenScroll'
import { ScreenHeader } from '../components/ScreenHeader'
import { ActivityIcon } from '../components/ActivityIcon'
import { DatePicker } from '../components/DatePicker'
import { activityEditPath } from '../lib/activityNav'
import { formatDate, formatMoney, formatSigned } from '../lib/format'
import type { ActivityItem } from '../state/DataContext'
import { SwipeableRow } from '../components/SwipeableRow'
import { useActivitySwipe } from '../hooks/useActivitySwipe'
import { SheetHandle } from '../components/SheetHandle'

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7" />
      <line x1="21" y1="21" x2="16.5" y2="16.5" />
    </svg>
  )
}
function FilterIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <line x1="4" y1="6" x2="20" y2="6" />
      <line x1="8" y1="12" x2="16" y2="12" />
      <line x1="11" y1="18" x2="13" y2="18" />
    </svg>
  )
}
function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
      <line x1="6" y1="6" x2="18" y2="18" />
      <line x1="18" y1="6" x2="6" y2="18" />
    </svg>
  )
}

type TypeFilter = 'expense' | 'income' | 'transfer' | 'loan'
const TYPE_OPTIONS: [TypeFilter, string][] = [
  ['expense', 'مصروف'],
  ['income', 'دخل'],
  ['transfer', 'تحويل'],
  ['loan', 'سلف'],
]

/** فلتر "سلف" يجمع حركتي السلفة (أعطيته / استلمت منه) تحت خيار واحد. */
function typeFilterOf(kind: ActivityItem['kind']): TypeFilter {
  return kind === 'loan-given' || kind === 'loan-received' ? 'loan' : kind
}

interface Filters {
  types: TypeFilter[]
  accountId: string | null
  from: string
  to: string
  minAmount: string
  maxAmount: string
  /** أسماء فئات المصاريف المختارة من مربعات "حسب الفئة" فوق سجل الحركات — تُطبَّق فورًا بدون المرور بنافذة الفلترة. */
  categories: string[]
}

const EMPTY_FILTERS: Filters = { types: [], accountId: null, from: '', to: '', minAmount: '', maxAmount: '', categories: [] }

function countActive(f: Filters): number {
  let n = 0
  if (f.types.length > 0) n++
  if (f.accountId) n++
  if (f.from || f.to) n++
  if (f.minAmount || f.maxAmount) n++
  if (f.categories.length > 0) n++
  return n
}

function FiltersSheet({
  open,
  filters,
  accounts,
  onApply,
  onClose,
}: {
  open: boolean
  filters: Filters
  accounts: { id: string; name: string }[]
  onApply: (f: Filters) => void
  onClose: () => void
}) {
  const [draft, setDraft] = useState<Filters>(filters)

  if (!open) return null

  function toggleType(t: TypeFilter) {
    setDraft((d) => ({ ...d, types: d.types.includes(t) ? d.types.filter((x) => x !== t) : [...d.types, t] }))
  }

  return (
    <div dir="rtl" className="fixed inset-0 z-[65] flex items-end justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-[6px]" style={{ animation: 'fade-in 180ms ease-out both' }} onClick={onClose} aria-hidden="true" />
      <div
        className="relative flex max-h-[85vh] w-full max-w-[480px] flex-col rounded-t-[32px] border-x border-t border-[var(--color-border-strong)] bg-[var(--color-surface-elevated)] shadow-[0_-24px_60px_-20px_rgba(0,0,0,0.85)]"
        style={{ animation: 'sheet-in 420ms var(--ease-out-expo) both' }}
      >
        <SheetHandle onDismiss={onClose} />
        <div className="flex flex-shrink-0 items-center justify-between px-5 py-3">
          <div className="text-[17px] font-semibold">فلترة الحركات</div>
          <button onClick={onClose} aria-label="إغلاق" className="qb-press flex h-9 w-9 items-center justify-center rounded-full text-[var(--color-text-2)]" style={{ background: 'rgba(255,255,255,0.08)' }}>
            <CloseIcon />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-2">
          <label className="mb-2 block px-1 text-[12.5px] font-medium text-[var(--color-text-2)]">نوع الحركة</label>
          <div className="mb-4 flex flex-wrap gap-2">
            {TYPE_OPTIONS.map(([t, label]) => (
              <button
                key={t}
                onClick={() => toggleType(t)}
                className="qb-press rounded-full px-4 py-2 text-[12.5px] font-semibold"
                style={
                  draft.types.includes(t)
                    ? { background: 'var(--color-accent)', color: 'var(--color-on-accent)' }
                    : { background: 'var(--color-surface)', color: 'var(--color-text-2)', border: '1px solid var(--color-border)' }
                }
              >
                {label}
              </button>
            ))}
          </div>

          <label className="mb-2 block px-1 text-[12.5px] font-medium text-[var(--color-text-2)]">الحساب</label>
          <div className="mb-4 flex flex-wrap gap-2">
            <button
              onClick={() => setDraft((d) => ({ ...d, accountId: null }))}
              className="qb-press rounded-full px-4 py-2 text-[12.5px] font-semibold"
              style={
                draft.accountId === null
                  ? { background: 'var(--color-accent)', color: 'var(--color-on-accent)' }
                  : { background: 'var(--color-surface)', color: 'var(--color-text-2)', border: '1px solid var(--color-border)' }
              }
            >
              الكل
            </button>
            {accounts.map((a) => (
              <button
                key={a.id}
                onClick={() => setDraft((d) => ({ ...d, accountId: a.id }))}
                className="qb-press rounded-full px-4 py-2 text-[12.5px] font-semibold"
                style={
                  draft.accountId === a.id
                    ? { background: 'var(--color-accent)', color: 'var(--color-on-accent)' }
                    : { background: 'var(--color-surface)', color: 'var(--color-text-2)', border: '1px solid var(--color-border)' }
                }
              >
                {a.name}
              </button>
            ))}
          </div>

          <label className="mb-2 block px-1 text-[12.5px] font-medium text-[var(--color-text-2)]">الفترة</label>
          <div className="mb-4 flex items-center gap-2">
            <div className="flex-1">
              <DatePicker value={draft.from} onChange={(v) => setDraft((d) => ({ ...d, from: v }))} placeholder="من تاريخ" />
            </div>
            <div className="flex-shrink-0 text-[var(--color-text-3)]">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="14,6 8,12 14,18" />
              </svg>
            </div>
            <div className="flex-1">
              <DatePicker value={draft.to} onChange={(v) => setDraft((d) => ({ ...d, to: v }))} placeholder="إلى تاريخ" />
            </div>
          </div>

          <label className="mb-2 block px-1 text-[12.5px] font-medium text-[var(--color-text-2)]">المبلغ</label>
          <div className="mb-2 flex flex-col gap-2">
            <div className="flex w-full items-center gap-2 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-2.5">
              <span className="flex-shrink-0 text-[11px] font-semibold text-[var(--color-text-3)]">أدنى</span>
              <input
                dir="ltr"
                inputMode="decimal"
                value={draft.minAmount}
                onChange={(e) => setDraft((d) => ({ ...d, minAmount: e.target.value.replace(/[^0-9.]/g, '') }))}
                placeholder="0"
                className="num min-w-0 flex-1 bg-transparent text-left text-[13.5px] font-semibold outline-none placeholder:text-[var(--color-text-3)]"
              />
            </div>
            <div className="flex w-full items-center gap-2 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-2.5">
              <span className="flex-shrink-0 text-[11px] font-semibold text-[var(--color-text-3)]">أقصى</span>
              <input
                dir="ltr"
                inputMode="decimal"
                value={draft.maxAmount}
                onChange={(e) => setDraft((d) => ({ ...d, maxAmount: e.target.value.replace(/[^0-9.]/g, '') }))}
                placeholder="0"
                className="num min-w-0 flex-1 bg-transparent text-left text-[13.5px] font-semibold outline-none placeholder:text-[var(--color-text-3)]"
              />
            </div>
          </div>
        </div>

        <div className="flex flex-shrink-0 gap-2.5 px-5 pb-3 pt-2">
          <button
            onClick={() => {
              setDraft(EMPTY_FILTERS)
              onApply(EMPTY_FILTERS)
            }}
            className="qb-press flex-1 rounded-2xl border border-[var(--color-border)] py-3 text-[13px] font-semibold text-[var(--color-text-2)]"
          >
            مسح الفلاتر
          </button>
          <button
            onClick={() => onApply(draft)}
            className="qb-press flex-1 rounded-2xl py-3 text-[13px] font-semibold text-[#0A0A0C]"
            style={{ background: 'var(--color-accent)' }}
          >
            تطبيق
          </button>
        </div>
        <div className="safe-bottom flex-shrink-0" />
      </div>
    </div>
  )
}

/** يجمع الحركات (المرتّبة أصلًا من الأحدث) بمجموعات حسب اليوم — قائمة بعناوين أيام بنمط تطبيقات البنوك. */
function groupByDay(items: ActivityItem[]): { date: string; items: ActivityItem[] }[] {
  const groups: { date: string; items: ActivityItem[] }[] = []
  for (const item of items) {
    const last = groups[groups.length - 1]
    if (last && last.date === item.date) last.items.push(item)
    else groups.push({ date: item.date, items: [item] })
  }
  return groups
}

function dayLabel(iso: string): string {
  const today = new Date()
  const toIso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  if (iso === toIso(today)) return 'اليوم'
  const y = new Date(today)
  y.setDate(y.getDate() - 1)
  if (iso === toIso(y)) return 'أمس'
  return formatDate(iso)
}

export function AllTransactionsScreen() {
  const navigate = useNavigate()
  const { recentActivity, accounts } = useData()
  const [query, setQuery] = useState('')
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS)
  const [filtersOpen, setFiltersOpen] = useState(false)

  const all = useMemo(() => recentActivity(1000000), [recentActivity])

  // كل الفلاتر عدا فلتر الفئة — الأساس اللي تُحسب عليه مربعات "حسب الفئة"
  // نفسها، عشان كل المربعات تفضل ظاهرة وقابلة للاختيار حتى بعد اختيار فئة.
  const baseFiltered = useMemo(() => {
    const q = query.trim()
    return all.filter((item: ActivityItem) => {
      if (q && !item.title.includes(q) && !item.subtitle.includes(q) && !(item.note ?? '').includes(q)) return false
      if (filters.types.length > 0 && !filters.types.includes(typeFilterOf(item.kind))) return false
      if (filters.accountId && !item.accountIds.includes(filters.accountId)) return false
      if (filters.from && item.date < filters.from) return false
      if (filters.to && item.date > filters.to) return false
      const absAmount = Math.abs(item.amount)
      if (filters.minAmount && absAmount < Number(filters.minAmount)) return false
      if (filters.maxAmount && absAmount > Number(filters.maxAmount)) return false
      return true
    })
  }, [all, query, filters])

  const filtered = useMemo(
    () => baseFiltered.filter((item) => filters.categories.length === 0 || (item.kind === 'expense' && filters.categories.includes(item.title))),
    [baseFiltered, filters.categories],
  )

  // إجمالي كل فئة يعتمد على باقي الفلاتر النشطة (الحساب، التاريخ، النوع،
  // المبلغ، البحث) — الأعلى إنفاقًا أولًا.
  const categoryTiles = useMemo(() => {
    const totals = new Map<string, number>()
    for (const item of baseFiltered) {
      if (item.kind !== 'expense') continue
      totals.set(item.title, (totals.get(item.title) ?? 0) + Math.abs(item.amount))
    }
    return [...totals.entries()].map(([name, total]) => ({ name, total })).sort((a, b) => b.total - a.total)
  }, [baseFiltered])

  function toggleCategory(name: string) {
    setFilters((f) => ({ ...f, categories: f.categories.includes(name) ? f.categories.filter((c) => c !== name) : [...f.categories, name] }))
  }

  const activeCount = countActive(filters)
  const swipeFor = useActivitySwipe()

  return (
    <ScreenScroll
      header={<ScreenHeader title="كل الحركات" onBack={() => navigate(-1)} className="pt-8 pb-6" />}
    >
      <FiltersSheet
        open={filtersOpen}
        filters={filters}
        accounts={accounts}
        onApply={(f) => {
          setFilters(f)
          setFiltersOpen(false)
        }}
        onClose={() => setFiltersOpen(false)}
      />

      <div className="mb-4 flex items-center gap-2">
        <label className="flex flex-1 items-center gap-2.5 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-4 focus-within:border-[var(--color-accent-line)]">
          <span className="text-[var(--color-text-3)]">
            <SearchIcon />
          </span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ابحث بالفئة، الحساب، أو الملاحظة..."
            className="w-full bg-transparent py-3 outline-none placeholder:text-[var(--color-text-3)]"
            style={{ boxShadow: 'none' }}
          />
        </label>
        <button
          onClick={() => setFiltersOpen(true)}
          aria-label="فلترة"
          className="qb-press relative flex flex-shrink-0 items-center justify-center rounded-full border"
          style={{
            width: 48,
            height: 48,
            borderColor: activeCount > 0 ? 'transparent' : 'var(--color-border)',
            background: activeCount > 0 ? 'var(--color-accent)' : 'var(--color-surface)',
            color: activeCount > 0 ? 'var(--color-on-accent)' : 'var(--color-text-2)',
          }}
        >
          <FilterIcon />
          {activeCount > 0 && (
            <span
              className="num absolute flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold"
              style={{ top: -3, left: -3, background: 'var(--color-expense)', color: '#fff', border: '2px solid var(--color-bg)' }}
            >
              {activeCount}
            </span>
          )}
        </button>
      </div>

      {categoryTiles.length > 0 && (
        <div className="-mx-5 mb-5 flex gap-2 overflow-x-auto px-5">
          {categoryTiles.map((tile) => {
            const active = filters.categories.includes(tile.name)
            return (
              <button
                key={tile.name}
                onClick={() => toggleCategory(tile.name)}
                className="qb-press flex min-w-[92px] flex-shrink-0 flex-col items-start gap-0.5 rounded-[20px] px-3.5 py-2.5 text-right"
                style={
                  active
                    ? { background: 'var(--color-accent)', color: 'var(--color-on-accent)' }
                    : { background: 'var(--color-surface)', color: 'var(--color-text-2)', border: '1px solid var(--color-border)' }
                }
              >
                <span className="truncate text-[11.5px] font-semibold">{tile.name}</span>
                <span className="num text-[12.5px] font-bold">{formatMoney(tile.total)}</span>
              </button>
            )
          })}
        </div>
      )}

      {all.length === 0 ? (
        <div className="qb-card qb-rise px-6 py-12 text-center text-[13.5px] leading-relaxed text-[var(--color-text-3)]">لا توجد حركات بعد</div>
      ) : filtered.length === 0 ? (
        <div className="qb-card qb-rise px-6 py-12 text-center text-[13.5px] leading-relaxed text-[var(--color-text-3)]">لا توجد نتائج مطابقة</div>
      ) : (
        <div className="flex flex-col gap-5">
          {groupByDay(filtered).map((group, gi) => (
            <section key={group.date} className="qb-rise" style={{ '--i': Math.min(gi, 8) } as CSSProperties}>
              <div className="mb-2 flex items-center justify-between px-1">
                <div className="text-[13px] font-semibold text-[var(--color-text-2)]">{dayLabel(group.date)}</div>
                <div className="num text-[12px] font-medium text-[var(--color-text-3)]">{formatSigned(group.items.reduce((sum, x) => sum + x.amount, 0))}</div>
              </div>
              <div className="qb-card overflow-hidden">
                {group.items.map((item, i) => (
                  <SwipeableRow key={item.id} {...swipeFor(item)} className={i > 0 ? 'border-t qb-divider' : ''}>
                    <button onClick={() => navigate(activityEditPath(item))} className="flex w-full items-center gap-3 px-4 py-3.5 text-right active:bg-white/[0.03]">
                      <div
                        className="flex flex-shrink-0 items-center justify-center rounded-full"
                        style={{ width: 44, height: 44, background: `color-mix(in srgb, ${item.color} 14%, transparent)`, color: item.color }}
                      >
                        <ActivityIcon kind={item.kind} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[14px] font-medium">{item.title}</div>
                        <div className="truncate text-[11.5px] text-[var(--color-text-3)]">
                          {item.subtitle}
                          {item.note ? ` · ${item.note}` : ''}
                        </div>
                      </div>
                      <div className="num flex-shrink-0 text-[14px] font-bold" style={{ color: item.amount > 0 ? 'var(--color-income)' : 'var(--color-text)' }}>
                        {formatSigned(item.amount)}
                      </div>
                    </button>
                  </SwipeableRow>
                ))}
              </div>
            </section>
          ))}
          <div className="pb-2 text-center text-[11px] text-[var(--color-text-3)]">اسحب أي حركة يسارًا للحذف · يمينًا لتكرارها</div>
        </div>
      )}
    </ScreenScroll>
  )
}
