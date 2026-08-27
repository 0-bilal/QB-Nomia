import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useData } from '../state/DataContext'
import { ScreenScroll } from '../components/ScreenScroll'
import { ScreenHeader } from '../components/ScreenHeader'
import { ActivityIcon } from '../components/ActivityIcon'
import { activityEditPath } from '../lib/activityNav'
import { formatDate, formatSigned } from '../lib/format'
import type { ActivityItem } from '../state/DataContext'

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

type TypeFilter = 'expense' | 'income' | 'transfer'
const TYPE_OPTIONS: [TypeFilter, string][] = [
  ['expense', 'مصروف'],
  ['income', 'دخل'],
  ['transfer', 'تحويل'],
]

interface Filters {
  types: TypeFilter[]
  accountId: string | null
  from: string
  to: string
  minAmount: string
  maxAmount: string
}

const EMPTY_FILTERS: Filters = { types: [], accountId: null, from: '', to: '', minAmount: '', maxAmount: '' }

function countActive(f: Filters): number {
  let n = 0
  if (f.types.length > 0) n++
  if (f.accountId) n++
  if (f.from || f.to) n++
  if (f.minAmount || f.maxAmount) n++
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
      <div className="absolute inset-0 bg-black/65 backdrop-blur-[2px]" style={{ animation: 'fade-in 180ms ease-out both' }} onClick={onClose} aria-hidden="true" />
      <div
        className="relative flex max-h-[85vh] w-full max-w-[480px] flex-col rounded-t-[28px] border-x border-t border-[var(--color-border)] bg-[var(--color-surface-elevated)] shadow-[0_-24px_60px_-20px_rgba(0,0,0,0.85)]"
        style={{ animation: 'sheet-in 260ms cubic-bezier(0.16,1,0.3,1) both' }}
      >
        <div className="mx-auto mb-1 mt-2.5 h-1 w-9 flex-shrink-0 rounded-full bg-white/15" />
        <div className="flex flex-shrink-0 items-center justify-between px-5 py-3">
          <div className="text-[15px] font-bold">فلترة الحركات</div>
          <button onClick={onClose} aria-label="إغلاق" className="qb-press flex h-8 w-8 items-center justify-center rounded-full text-[var(--color-text-2)]" style={{ background: 'rgba(255,255,255,0.08)' }}>
            <CloseIcon />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-2">
          <label className="mb-1.5 block text-[12px] font-semibold text-[var(--color-text-2)]">نوع الحركة</label>
          <div className="mb-4 flex flex-wrap gap-2">
            {TYPE_OPTIONS.map(([t, label]) => (
              <button
                key={t}
                onClick={() => toggleType(t)}
                className="qb-press rounded-full px-4 py-2 text-[12.5px] font-semibold"
                style={
                  draft.types.includes(t)
                    ? { background: 'rgba(255,255,255,0.18)', color: 'var(--color-accent)' }
                    : { background: 'var(--color-surface)', color: 'var(--color-text-2)', border: '1px solid var(--color-border)' }
                }
              >
                {label}
              </button>
            ))}
          </div>

          <label className="mb-1.5 block text-[12px] font-semibold text-[var(--color-text-2)]">الحساب</label>
          <div className="mb-4 flex flex-wrap gap-2">
            <button
              onClick={() => setDraft((d) => ({ ...d, accountId: null }))}
              className="qb-press rounded-full px-4 py-2 text-[12.5px] font-semibold"
              style={
                draft.accountId === null
                  ? { background: 'rgba(255,255,255,0.18)', color: 'var(--color-accent)' }
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
                    ? { background: 'rgba(255,255,255,0.18)', color: 'var(--color-accent)' }
                    : { background: 'var(--color-surface)', color: 'var(--color-text-2)', border: '1px solid var(--color-border)' }
                }
              >
                {a.name}
              </button>
            ))}
          </div>

          <label className="mb-1.5 block text-[12px] font-semibold text-[var(--color-text-2)]">الفترة</label>
          <div className="mb-4 flex gap-2">
            <input
              type="date"
              value={draft.from}
              onChange={(e) => setDraft((d) => ({ ...d, from: e.target.value }))}
              className="num flex-1 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 text-[13px] outline-none"
              style={{ colorScheme: 'dark' }}
            />
            <input
              type="date"
              value={draft.to}
              onChange={(e) => setDraft((d) => ({ ...d, to: e.target.value }))}
              className="num flex-1 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 text-[13px] outline-none"
              style={{ colorScheme: 'dark' }}
            />
          </div>

          <label className="mb-1.5 block text-[12px] font-semibold text-[var(--color-text-2)]">المبلغ</label>
          <div className="mb-2 flex gap-2">
            <input
              dir="ltr"
              inputMode="decimal"
              value={draft.minAmount}
              onChange={(e) => setDraft((d) => ({ ...d, minAmount: e.target.value.replace(/[^0-9.]/g, '') }))}
              placeholder="أدنى"
              className="num flex-1 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 text-[13px] outline-none placeholder:text-[var(--color-text-3)]"
            />
            <input
              dir="ltr"
              inputMode="decimal"
              value={draft.maxAmount}
              onChange={(e) => setDraft((d) => ({ ...d, maxAmount: e.target.value.replace(/[^0-9.]/g, '') }))}
              placeholder="أقصى"
              className="num flex-1 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 text-[13px] outline-none placeholder:text-[var(--color-text-3)]"
            />
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
            className="qb-press flex-1 rounded-2xl py-3 text-[13px] font-bold text-[#0A0A0C]"
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

export function AllTransactionsScreen() {
  const navigate = useNavigate()
  const { recentActivity, accounts } = useData()
  const [query, setQuery] = useState('')
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS)
  const [filtersOpen, setFiltersOpen] = useState(false)

  const all = useMemo(
    () => recentActivity(1000000).filter((item) => item.kind === 'expense' || item.kind === 'income' || item.kind === 'transfer'),
    [recentActivity],
  )

  const filtered = useMemo(() => {
    const q = query.trim()
    return all.filter((item: ActivityItem) => {
      if (q && !item.title.includes(q) && !item.subtitle.includes(q) && !(item.note ?? '').includes(q)) return false
      if (filters.types.length > 0 && !filters.types.includes(item.kind as TypeFilter)) return false
      if (filters.accountId && !item.accountIds.includes(filters.accountId)) return false
      if (filters.from && item.date < filters.from) return false
      if (filters.to && item.date > filters.to) return false
      const absAmount = Math.abs(item.amount)
      if (filters.minAmount && absAmount < Number(filters.minAmount)) return false
      if (filters.maxAmount && absAmount > Number(filters.maxAmount)) return false
      return true
    })
  }, [all, query, filters])

  const activeCount = countActive(filters)

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
        <div className="qb-card flex flex-1 items-center gap-2 px-4 py-3">
          <span className="text-[var(--color-text-3)]">
            <SearchIcon />
          </span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ابحث بالفئة، الحساب، أو الملاحظة..."
            className="w-full bg-transparent text-[13.5px] outline-none placeholder:text-[var(--color-text-3)]"
          />
        </div>
        <button
          onClick={() => setFiltersOpen(true)}
          aria-label="فلترة"
          className="qb-press relative flex h-11.5 w-11.5 flex-shrink-0 items-center justify-center rounded-2xl border"
          style={{
            width: 46,
            height: 46,
            borderColor: activeCount > 0 ? 'var(--color-accent)' : 'var(--color-border)',
            background: activeCount > 0 ? 'rgba(255,255,255,0.12)' : 'var(--color-surface)',
            color: activeCount > 0 ? 'var(--color-accent)' : 'var(--color-text-2)',
          }}
        >
          <FilterIcon />
          {activeCount > 0 && (
            <span
              className="num absolute flex h-4 w-4 items-center justify-center rounded-full text-[9.5px] font-bold"
              style={{ top: -4, left: -4, background: 'var(--color-expense)', color: '#fff' }}
            >
              {activeCount}
            </span>
          )}
        </button>
      </div>

      {all.length === 0 ? (
        <div className="qb-card py-8 text-center text-[13px] text-[var(--color-text-3)]">لا توجد حركات بعد</div>
      ) : filtered.length === 0 ? (
        <div className="qb-card py-8 text-center text-[13px] text-[var(--color-text-3)]">لا توجد نتائج مطابقة</div>
      ) : (
        <div className="qb-card overflow-hidden">
          {filtered.map((item, i) => (
            <button
              key={item.id}
              onClick={() => navigate(activityEditPath(item))}
              className={`qb-press flex w-full items-center gap-3 px-4 py-3 text-right ${i > 0 ? 'border-t qb-divider' : ''}`}
            >
              <div
                className="flex h-10.5 w-10.5 flex-shrink-0 items-center justify-center rounded-[13px]"
                style={{ width: 42, height: 42, background: `${item.color}1f`, color: item.color }}
              >
                <ActivityIcon kind={item.kind} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13.5px] font-semibold">{item.title}</div>
                <div className="truncate text-[11.5px] text-[var(--color-text-3)]">
                  {item.subtitle} · {formatDate(item.date)}
                  {item.note ? ` · ${item.note}` : ''}
                </div>
              </div>
              <div className="num flex-shrink-0 text-[13.5px] font-bold" style={{ color: item.color }}>
                {formatSigned(item.amount)}
              </div>
            </button>
          ))}
        </div>
      )}
    </ScreenScroll>
  )
}
