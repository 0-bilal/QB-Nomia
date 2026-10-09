import { Fragment, useMemo, useRef, useState, type CSSProperties, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useData, type ActivityItem } from '../state/DataContext'
import { ScreenScroll } from '../components/ScreenScroll'
import { ScreenHeader } from '../components/ScreenHeader'
import { ActivityAmount, ActivityIcon } from '../components/ActivityIcon'
import { CategoryIconBox } from '../components/CategoryVisual'
import { CategoryPickerSheet } from '../components/CategoryPickerSheet'
import { CalendarIcon, TxFilterSheet } from '../components/TxFilterSheet'
import { SwipeableRow } from '../components/SwipeableRow'
import { useActivitySwipe } from '../hooks/useActivitySwipe'
import { useScrolledPast } from '../hooks/useScrolledPast'
import { activityEditPath } from '../lib/activityNav'
import { mostUsedCategories } from '../lib/categoryStats'
import { formatAmount } from '../lib/format'
import { dayLabel, localIso } from '../lib/homeFeed'
import { haptic } from '../lib/haptics'
import { notify } from '../lib/notify'
import { showUndoToast } from '../lib/undoToast'
import {
  EMPTY_TX_FILTERS,
  MONTHS_AR,
  filterActivity,
  monthKey,
  monthLabel,
  netOf,
  periodLabel,
  sheetFilterCount,
  shiftMonth,
  sortActivity,
  totalsOf,
  typeTotals,
  type TxFilters,
  type TxType,
} from '../lib/txFilters'

const PAGE = 60

const TYPE_META: Record<TxType, { label: string; color: string; icon: ActivityItem['kind'] }> = {
  expense: { label: 'مصروف', color: 'var(--color-expense)', icon: 'expense' },
  income: { label: 'دخل', color: 'var(--color-income)', icon: 'income' },
  transfer: { label: 'تحويل', color: 'var(--color-transfer)', icon: 'transfer' },
  loan: { label: 'سلف', color: 'var(--color-owed-to)', icon: 'loan-given' },
}
const TYPES: TxType[] = ['expense', 'income', 'transfer', 'loan']

const soft = (color: string, pct = 15) => `color-mix(in srgb, ${color} ${pct}%, transparent)`
/** صافي مختصر بدون العملة — لعناوين الأشهر والأيام. */
const signedAmount = (n: number) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${formatAmount(Math.abs(n))}`

const ic = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
const SearchIcon = () => (
  <svg {...ic} width={17} height={17} strokeWidth={2}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </svg>
)
const FilterIcon = ({ size = 18 }: { size?: number }) => (
  <svg {...ic} width={size} height={size} strokeWidth={2.2}>
    <path d="M4 6h16M7 12h10M10 18h4" />
  </svg>
)
const CloseIcon = ({ size = 12 }: { size?: number }) => (
  <svg {...ic} width={size} height={size} strokeWidth={2.6}>
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
)
const CheckIcon = ({ size = 12 }: { size?: number }) => (
  <svg {...ic} width={size} height={size} strokeWidth={3}>
    <path d="M5 12.5 10 17l9-10" />
  </svg>
)
const SelectIcon = () => (
  <svg {...ic} width={17} height={17} strokeWidth={2.1}>
    <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
    <path d="M8 12.5 11 15l5-6" />
  </svg>
)
const Chevron = ({ dir }: { dir: 'right' | 'left' }) => (
  <svg {...ic} width={15} height={15} strokeWidth={2.4}>
    <path d={dir === 'right' ? 'm9 6 6 6-6 6' : 'm15 6-6 6 6 6'} />
  </svg>
)
const TagIcon = () => (
  <svg {...ic} width={17} height={17} strokeWidth={2}>
    <path d="M3 12V4h8l10 10-8 8L3 12Z" />
    <circle cx="7.5" cy="8.5" r="1.2" />
  </svg>
)
const TrashIcon = () => (
  <svg {...ic} width={17} height={17} strokeWidth={2}>
    <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />
  </svg>
)

/** يلوّن نص البحث داخل النص. */
function Highlight({ text, q }: { text: string; q: string }) {
  if (!q || !text.includes(q)) return <>{text}</>
  const parts = text.split(q)
  return (
    <>
      {parts.map((p, i) => (
        <Fragment key={i}>
          {p}
          {i < parts.length - 1 && (
            <mark className="rounded px-0.5 text-[var(--color-text)]" style={{ background: 'rgba(255,191,71,0.28)' }}>
              {q}
            </mark>
          )}
        </Fragment>
      ))}
    </>
  )
}

/** ضغط مطوّل على صف = بدء التحديد المتعدد (مع تجاهل النقرة اللي تتبعه). */
function useLongPress(onLongPress: (id: string) => void) {
  const timer = useRef<number | null>(null)
  const start = useRef({ x: 0, y: 0 })
  const fired = useRef(false)
  const clear = () => {
    if (timer.current !== null) window.clearTimeout(timer.current)
    timer.current = null
  }
  return {
    /** هل كانت النقرة الحالية نهاية ضغط مطوّل؟ (ويصفّر العلامة). */
    consumeFired: () => {
      const f = fired.current
      fired.current = false
      return f
    },
    bind: (id: string) => ({
      onPointerDown: (e: ReactPointerEvent) => {
        fired.current = false
        start.current = { x: e.clientX, y: e.clientY }
        clear()
        timer.current = window.setTimeout(() => {
          fired.current = true
          onLongPress(id)
        }, 480)
      },
      onPointerMove: (e: ReactPointerEvent) => {
        if (Math.abs(e.clientX - start.current.x) > 8 || Math.abs(e.clientY - start.current.y) > 8) clear()
      },
      onPointerUp: clear,
      onPointerCancel: clear,
      onContextMenu: (e: ReactMouseEvent) => e.preventDefault(),
    }),
  }
}

function GlassButton({ onClick, label, active, badge, visible = true, children }: { onClick: () => void; label: string; active?: boolean; badge?: number; visible?: boolean; children: ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      tabIndex={visible ? 0 : -1}
      className={`qb-press relative flex flex-shrink-0 items-center justify-center rounded-full border ${active ? '' : 'qb-glass-circle'}`}
      style={{
        width: 40,
        height: 40,
        background: active ? 'var(--color-accent)' : undefined,
        color: active ? 'var(--color-on-accent)' : 'var(--color-text)',
        borderColor: active ? 'transparent' : undefined,
        opacity: visible ? 1 : 0,
        transform: visible ? 'none' : 'scale(0.6)',
        pointerEvents: visible ? 'auto' : 'none',
        transition: 'opacity 200ms ease, transform 320ms cubic-bezier(0.34,1.56,0.64,1)',
      }}
    >
      {children}
      {!!badge && (
        <span
          className="num absolute flex items-center justify-center rounded-full text-[10px] font-bold"
          style={{ top: -3, left: -3, minWidth: 18, height: 18, padding: '0 4px', background: 'var(--color-expense)', color: '#fff', border: '2px solid var(--color-bg)' }}
        >
          {badge}
        </span>
      )}
    </button>
  )
}

/** كبسولة الأنواع المدمجة بعد التمرير: "الكل" + أيقونات الأنواع، والمختار يتمدد باسمه ولونه. */
function TypeCapsule({ visible, type, onSelect }: { visible: boolean; type: TxType | null; onSelect: (t: TxType | null) => void }) {
  const items: { key: TxType | null; label: string; color: string; icon: ReactNode }[] = [
    {
      key: null,
      label: 'الكل',
      color: 'var(--color-accent)',
      icon: (
        <svg {...ic} width={16} height={16} strokeWidth={2}>
          <rect x="4" y="4" width="6.5" height="6.5" rx="2" />
          <rect x="13.5" y="4" width="6.5" height="6.5" rx="2" />
          <rect x="4" y="13.5" width="6.5" height="6.5" rx="2" />
          <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="2" />
        </svg>
      ),
    },
    ...TYPES.map((t) => ({ key: t, label: TYPE_META[t].label, color: TYPE_META[t].color, icon: <ActivityIcon kind={TYPE_META[t].icon} /> })),
  ]
  return (
    <div
      className="absolute inset-x-0 top-0 flex justify-center"
      aria-hidden={!visible}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'none' : 'translateY(-8px) scale(0.6)',
        pointerEvents: 'none',
        transition: 'opacity 220ms ease, transform 420ms cubic-bezier(0.34,1.56,0.64,1)',
      }}
    >
      <div
        role="tablist"
        className="relative flex items-center gap-1 rounded-full border p-1"
        style={{
          pointerEvents: visible ? 'auto' : 'none',
          background: 'rgba(28,28,33,0.9)',
          borderColor: 'var(--color-border-strong)',
          backdropFilter: 'blur(20px) saturate(1.6)',
          WebkitBackdropFilter: 'blur(20px) saturate(1.6)',
          boxShadow: '0 12px 30px -12px rgba(0,0,0,0.8)',
        }}
      >
        <span
          className="pointer-events-none absolute rounded-full"
          style={{
            inset: '-12px -16px',
            zIndex: -1,
            background: 'rgba(5,5,6,0.35)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            maskImage: 'radial-gradient(closest-side, #000 60%, transparent 100%)',
            WebkitMaskImage: 'radial-gradient(closest-side, #000 60%, transparent 100%)',
          }}
        />
        {items.map((it) => {
          const active = type === it.key
          return (
            <button
              key={it.label}
              role="tab"
              aria-selected={active}
              aria-label={it.label}
              tabIndex={visible ? 0 : -1}
              onClick={() => {
                haptic('tick')
                onSelect(it.key)
              }}
              className="qb-press flex h-9 items-center justify-center gap-1.5 rounded-full"
              style={{
                minWidth: 36,
                padding: active ? '0 12px 0 10px' : 0,
                background: active ? it.color : 'transparent',
                color: active ? 'var(--color-on-accent)' : it.color,
                transition: 'background 250ms ease, padding 300ms cubic-bezier(0.22,1,0.36,1)',
              }}
            >
              <span className="flex scale-[0.85] items-center">{it.icon}</span>
              {active && <span className="whitespace-nowrap text-[12px] font-bold">{it.label}</span>}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function AllTransactionsScreen() {
  const navigate = useNavigate()
  const { recentActivity, accounts, categories, transactions, deleteTransactions, setTransactionsCategory, categorySpentThisMonth } = useData()
  const [searchParams] = useSearchParams()
  const [query, setQuery] = useState('')
  // ?category=<اسم>&period=month|last — يفتح القائمة مفلترة على فئة واحدة وفترتها (من تفاصيل الفئة بشاشة الفئات).
  const [filters, setFilters] = useState<TxFilters>(() => {
    const category = searchParams.get('category')
    const period = searchParams.get('period')
    return {
      ...EMPTY_TX_FILTERS,
      ...(category ? { categories: [category] } : {}),
      ...(period === 'month' || period === 'last' ? { period } : {}),
    }
  })
  const [sheetOpen, setSheetOpen] = useState(false)
  const [limit, setLimit] = useState(PAGE)
  const [selectMode, setSelectMode] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [catPickerOpen, setCatPickerOpen] = useState(false)
  const [toolsEndRef, toolsGone] = useScrolledPast<HTMLDivElement>(64)
  const [typesSentinelRef, typesStuck] = useScrolledPast<HTMLDivElement>(60)
  const swipeFor = useActivitySwipe()

  const today = localIso(new Date())
  const q = query.trim()
  const all = useMemo(() => recentActivity(1000000), [recentActivity])
  const byId = useMemo(() => new Map(all.map((i) => [i.id, i])), [all])

  const typeBase = useMemo(() => filterActivity(all, filters, query, today, { ignoreType: true, ignoreCategory: true }), [all, filters, query, today])
  const tTotals = useMemo(() => typeTotals(typeBase), [typeBase])
  const noCat = useMemo(() => filterActivity(all, filters, query, today, { ignoreCategory: true }), [all, filters, query, today])
  const filtered = useMemo(() => sortActivity(filterActivity(all, filters, query, today), filters.sort), [all, filters, query, today])
  const totals = useMemo(() => totalsOf(filtered), [filtered])
  // مساهمات (دفعها غيرك) ضمن النتائج — خارج المجاميع، تُذكر بسطر صغير.
  const contributedTotal = useMemo(() => filtered.reduce((s, i) => s + (i.kind === 'contribution' ? (i.paidAmount ?? 0) : 0), 0), [filtered])

  // بطاقات الفئات: مجموع كل فئة ضمن باقي الفلاتر — الأعلى إنفاقًا أولًا.
  const categoryTiles = useMemo(() => {
    const map = new Map<string, { name: string; total: number; categoryId?: string }>()
    for (const item of noCat) {
      if (item.kind !== 'expense') continue
      const cur = map.get(item.title) ?? { name: item.title, total: 0, categoryId: item.categoryId }
      cur.total += Math.abs(item.amount)
      map.set(item.title, cur)
    }
    return [...map.values()].sort((a, b) => b.total - a.total)
  }, [noCat])

  const monthNet = useMemo(() => {
    const m = new Map<string, ActivityItem[]>()
    for (const i of filtered) m.set(monthKey(i.date), [...(m.get(monthKey(i.date)) ?? []), i])
    return new Map([...m].map(([k, v]) => [k, netOf(v)]))
  }, [filtered])
  const dayNet = useMemo(() => {
    const m = new Map<string, number>()
    for (const i of filtered) if (i.kind !== 'transfer') m.set(i.date, (m.get(i.date) ?? 0) + i.amount)
    return m
  }, [filtered])

  // متنقّل الأشهر: من أقدم حركة حتى الشهر الحالي.
  const curMonth = monthKey(today)
  const firstMonth = all.length ? monthKey(all[all.length - 1].date) : curMonth
  const activeMonth = filters.period.startsWith('m:') ? filters.period.slice(2) : null
  function stepMonth(delta: number) {
    const next = activeMonth ? shiftMonth(activeMonth, delta) : delta < 0 ? curMonth : null
    if (!next || next > curMonth || next < firstMonth) return
    haptic('tick')
    update({ period: `m:${next}` })
  }

  function update(patch: Partial<TxFilters>) {
    setFilters((f) => ({ ...f, ...patch }))
    setLimit(PAGE)
  }

  const sheetCount = sheetFilterCount(filters)
  const chips: { key: string; label: string; clear: () => void }[] = [
    ...filters.categories.map((c) => ({ key: `c:${c}`, label: c, clear: () => update({ categories: filters.categories.filter((x) => x !== c) }) })),
    ...(q ? [{ key: 'q', label: `«${q}»`, clear: () => setQuery('') }] : []),
    ...filters.accountIds.map((id) => ({ key: `a:${id}`, label: accounts.find((a) => a.id === id)?.name ?? '', clear: () => update({ accountIds: filters.accountIds.filter((x) => x !== id) }) })),
    ...(filters.minAmount || filters.maxAmount
      ? [
          {
            key: 'amt',
            label: filters.minAmount && filters.maxAmount ? `${filters.minAmount} – ${filters.maxAmount}` : filters.minAmount ? `أكثر من ${filters.minAmount}` : `أقل من ${filters.maxAmount}`,
            clear: () => update({ minAmount: '', maxAmount: '' }),
          },
        ]
      : []),
  ]

  // التحديد المتعدد
  const longPress = useLongPress((id) => {
    haptic('tick')
    setSelectMode(true)
    setSelected(new Set([id]))
  })
  function toggleSelect(id: string) {
    setSelected((s) => {
      const n = new Set(s)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  }
  function exitSelect() {
    setSelectMode(false)
    setSelected(new Set())
  }
  const selItems = [...selected].map((id) => byId.get(id)).filter((x): x is ActivityItem => !!x)
  const selTxnIds = selItems.filter((i) => i.kind !== 'loan-given' && i.kind !== 'loan-received' && i.kind !== 'contribution').map((i) => i.id)
  const selExpenseIds = selItems.filter((i) => i.kind === 'expense').map((i) => i.id)

  function bulkDelete() {
    if (selTxnIds.length === 0) {
      notify('info', 'السلف والمساهمات تُحذف من صفحتها أو بالسحب')
      return
    }
    const removed = deleteTransactions(selTxnIds)
    haptic('warning')
    const skipped = selItems.length - removed.length
    showUndoToast(skipped > 0 ? `حُذفت ${removed.length} · تُرك ${skipped} سلف ومساهمات` : `تم حذف ${removed.length} ${removed.length === 1 ? 'حركة' : 'حركات'}`, (data) => data.restoreTransactions(removed))
    exitSelect()
  }

  const expenseCategories = useMemo(() => categories.filter((c) => c.kind === 'expense'), [categories])
  const mostUsed = useMemo(() => mostUsedCategories(expenseCategories, transactions), [expenseCategories, transactions])

  // نوع الحركة يظهر في كبسولة الأنواع اللاصقة، فكبسولة العنوان تعرض الفترة فقط.
  const capsuleTitle = filters.period !== 'all' ? periodLabel(filters) : ''
  const shown = filtered.slice(0, limit)
  const byDate = filters.sort === 'new' || filters.sort === 'old'

  function openItem(item: ActivityItem) {
    if (longPress.consumeFired()) return
    if (selectMode) toggleSelect(item.id)
    else navigate(activityEditPath(item))
  }

  function renderRow(item: ActivityItem, i: number) {
    const category = (item.kind === 'expense' || item.kind === 'contribution') && item.categoryId ? categories.find((c) => c.id === item.categoryId) : undefined
    const sel = selected.has(item.id)
    const row = (
      <button
        {...longPress.bind(item.id)}
        onClick={() => openItem(item)}
        className="flex w-full select-none items-center gap-3 px-3.5 py-3 text-right transition-colors active:bg-white/[0.03]"
        style={{ background: sel ? 'rgba(255,255,255,0.05)' : undefined, WebkitTouchCallout: 'none' }}
      >
        {selectMode && (
          <span
            className="flex flex-shrink-0 items-center justify-center rounded-full border-2"
            style={{
              width: 22,
              height: 22,
              background: sel ? 'var(--color-accent)' : 'transparent',
              borderColor: sel ? 'transparent' : 'var(--color-border-strong)',
              color: 'var(--color-on-accent)',
            }}
          >
            {sel && <CheckIcon />}
          </span>
        )}
        {category ? (
          <CategoryIconBox category={category} size={42} radius={14} iconSize={19} />
        ) : (
          <span className="flex flex-shrink-0 items-center justify-center" style={{ width: 42, height: 42, borderRadius: 14, background: soft(item.color, 14), color: item.color }}>
            <ActivityIcon kind={item.kind} />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13.5px] font-semibold">
            <Highlight text={item.title} q={q} />
          </div>
          <div className="truncate text-[11px] text-[var(--color-text-3)]">
            {item.note?.trim() && (
              <>
                <Highlight text={item.note.trim()} q={q} /> ·{' '}
              </>
            )}
            <Highlight text={item.subtitle} q={q} />
            {!byDate && <span className="num"> · {item.date.slice(5).replace('-', '/')}</span>}
          </div>
        </div>
        <ActivityAmount item={item} />
      </button>
    )
    const border = i > 0 ? 'border-t qb-divider' : ''
    return selectMode ? (
      <div key={item.id} className={border}>
        {row}
      </div>
    ) : (
      <SwipeableRow key={item.id} {...swipeFor(item)} className={border}>
        {row}
      </SwipeableRow>
    )
  }

  function renderList() {
    if (!byDate) return <div className="qb-card overflow-hidden">{shown.map(renderRow)}</div>
    const out: ReactNode[] = []
    let month = ''
    let day: ActivityItem[] = []
    const flushDay = () => {
      if (day.length === 0) return
      const d = day[0].date
      const net = dayNet.get(d) ?? 0
      out.push(
        <section key={`d-${d}`} className="qb-rise" style={{ '--i': Math.min(out.length, 8) } as CSSProperties}>
          <div className="mx-1.5 mb-2 mt-3.5 flex justify-between text-[11.5px] font-semibold text-[var(--color-text-3)]">
            <span>{dayLabel(d, today) || `${Number(d.slice(8, 10))} ${MONTHS_AR[Number(d.slice(5, 7)) - 1]}`}</span>
            {net !== 0 && (
              <span dir="ltr" className="num" style={{ color: net > 0 ? 'var(--color-income)' : undefined }}>
                {signedAmount(net)}
              </span>
            )}
          </div>
          <div className="qb-card overflow-hidden">{day.map(renderRow)}</div>
        </section>,
      )
      day = []
    }
    for (const item of shown) {
      const m = monthKey(item.date)
      if (m !== month) {
        flushDay()
        month = m
        const net = monthNet.get(m) ?? 0
        out.push(
          <div
            key={`m-${m}`}
            className="-mx-1 mt-4 flex items-center justify-between rounded-xl border border-[var(--color-border)] px-3 py-2 text-[12px] font-bold first:mt-0"
            style={{ background: 'var(--color-surface-elevated)' }}
          >
            <span>{monthLabel(m)}</span>
            <span dir="ltr" className="num font-semibold text-[var(--color-text-3)]">
              {signedAmount(net)}
            </span>
          </div>,
        )
      }
      if (day.length && day[0].date !== item.date) flushDay()
      day.push(item)
    }
    flushDay()
    return out
  }

  return (
    <ScreenScroll
      header={
        <ScreenHeader
          title="كل الحركات"
          capsuleTitle={toolsGone && capsuleTitle ? capsuleTitle : undefined}
          onBack={() => (selectMode ? exitSelect() : navigate(-1))}
          right={
            <div className="flex items-center gap-2">
              <GlassButton label="فلترة" visible={toolsGone && !selectMode} badge={sheetCount} onClick={() => setSheetOpen(true)}>
                <FilterIcon size={17} />
              </GlassButton>
              <GlassButton label="تحديد" active={selectMode} onClick={() => (selectMode ? exitSelect() : setSelectMode(true))}>
                <SelectIcon />
              </GlassButton>
            </div>
          }
        />
      }
    >
      {sheetOpen && (
        <TxFilterSheet
          initial={filters}
          accounts={accounts}
          countFor={(f) => filterActivity(all, f, query, today).length}
          onApply={(f) => {
            setFilters(f)
            setLimit(PAGE)
            setSheetOpen(false)
          }}
          onClose={() => setSheetOpen(false)}
        />
      )}
      <CategoryPickerSheet
        open={catPickerOpen}
        categories={expenseCategories}
        mostUsed={mostUsed}
        spentOf={categorySpentThisMonth}
        onSelect={(id) => {
          setTransactionsCategory(selExpenseIds, id)
          haptic('success')
          notify('success', `تم نقل ${selExpenseIds.length} ${selExpenseIds.length === 1 ? 'مصروف' : 'مصاريف'} إلى ${categories.find((c) => c.id === id)?.name ?? ''}`)
          setCatPickerOpen(false)
          exitSelect()
        }}
        onAddNew={() => navigate('/categories/new')}
        onClose={() => setCatPickerOpen(false)}
      />

      {/* البحث + زر الفلترة */}
      <div className="flex gap-2">
        <label
          className="flex h-[46px] flex-1 items-center gap-2 rounded-full border border-[var(--color-border)] px-4 text-[var(--color-text-3)] focus-within:border-[var(--color-accent-line)]"
          style={{ background: 'linear-gradient(180deg, var(--color-surface-elevated), var(--color-surface))' }}
        >
          <SearchIcon />
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setLimit(PAGE)
            }}
            placeholder="ابحث بالاسم، الملاحظة، أو المبلغ..."
            className="min-w-0 flex-1 bg-transparent text-[13px] text-[var(--color-text)] outline-none placeholder:text-[var(--color-text-3)]"
            style={{ boxShadow: 'none' }}
          />
          {query && (
            <button onClick={() => setQuery('')} aria-label="مسح البحث" className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-[var(--color-surface-high)] text-[var(--color-text-2)]">
              <CloseIcon size={11} />
            </button>
          )}
        </label>
        <button
          onClick={() => setSheetOpen(true)}
          aria-label="فلترة"
          className="qb-press relative flex flex-shrink-0 items-center justify-center rounded-full"
          style={{ width: 46, height: 46, background: 'var(--color-accent)', color: 'var(--color-on-accent)' }}
        >
          <FilterIcon />
          {sheetCount > 0 && (
            <span
              className="num absolute flex items-center justify-center rounded-full text-[10px] font-bold"
              style={{ top: -2, left: -2, minWidth: 18, height: 18, padding: '0 4px', background: 'var(--color-expense)', color: '#fff', border: '2px solid var(--color-bg)' }}
            >
              {sheetCount}
            </span>
          )}
        </button>
      </div>

      {/* بطاقات النوع — ضغطة للتصفية وضغطة ثانية للإلغاء. بعد التمرير تتحول لكبسولة زجاجية مدمجة (أسلوب الكبسولة الذكية). */}
      <div ref={typesSentinelRef} aria-hidden="true" />
      {/* sticky يُقاس من داخل حشوة حاوية ScreenScroll (المنطقة الآمنة + 64) — ‎-8px تضعه تحت صف الأزرار العائمة مباشرة. */}
      <div className="pointer-events-none sticky z-[3] -mx-5 mt-2.5 px-5" style={{ top: -8 }}>
        <div
          className="grid grid-cols-4 gap-[7px]"
          aria-hidden={typesStuck}
          style={{
            opacity: typesStuck ? 0 : 1,
            transform: typesStuck ? 'translateY(-10px) scale(0.94)' : 'none',
            pointerEvents: typesStuck ? 'none' : 'auto',
            transition: 'opacity 200ms ease, transform 320ms cubic-bezier(0.22,1,0.36,1)',
          }}
        >
          {TYPES.map((t) => {
            const meta = TYPE_META[t]
            const on = filters.type === t
            const dim = filters.type !== null && !on
            return (
              <button
                key={t}
                onClick={() => {
                  haptic('tick')
                  update({ type: on ? null : t })
                }}
                className="qb-press flex flex-col items-center gap-[5px] rounded-2xl border px-1.5 pb-2 pt-2.5"
                style={{
                  background: on ? soft(meta.color, 13) : 'var(--color-surface)',
                  borderColor: on ? soft(meta.color, 45) : 'var(--color-border)',
                  opacity: dim ? 0.45 : 1,
                  transition: 'opacity 250ms ease, background 250ms ease, border-color 250ms ease',
                }}
              >
                <span className="flex items-center justify-center rounded-[10px]" style={{ width: 30, height: 30, background: soft(meta.color, 16), color: meta.color }}>
                  <ActivityIcon kind={meta.icon} />
                </span>
                <span className="text-[11.5px] font-semibold" style={{ color: on ? 'var(--color-text)' : 'var(--color-text-2)' }}>
                  {meta.label}
                </span>
                <span className="num max-w-full truncate text-[10.5px] font-bold text-[var(--color-text-3)]">{formatAmount(tTotals[t])}</span>
              </button>
            )
          })}
        </div>
        <TypeCapsule visible={typesStuck} type={filters.type} onSelect={(type) => update({ type })} />
      </div>

      {/* متنقّل الأشهر */}
      <div className="mt-2.5 flex items-center gap-1.5">
        <button
          onClick={() => update({ period: 'all' })}
          className="qb-press h-[34px] flex-shrink-0 rounded-full border px-3 text-[11.5px] font-semibold"
          style={
            filters.period === 'all'
              ? { background: 'var(--color-accent)', color: 'var(--color-on-accent)', borderColor: 'transparent' }
              : { color: 'var(--color-text-2)', borderColor: 'var(--color-border)' }
          }
        >
          الكل
        </button>
        <button
          onClick={() => stepMonth(-1)}
          aria-label="الشهر السابق"
          disabled={activeMonth !== null && activeMonth <= firstMonth}
          className="qb-press flex h-[34px] w-[34px] flex-shrink-0 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-2)] disabled:opacity-35"
        >
          <Chevron dir="right" />
        </button>
        <button
          onClick={() => setSheetOpen(true)}
          className="qb-press flex h-[34px] min-w-0 flex-1 items-center justify-center gap-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-[12.5px] font-bold"
        >
          <CalendarIcon />
          <span className="truncate">{filters.period === 'all' ? 'كل الوقت' : periodLabel(filters)}</span>
        </button>
        <button
          onClick={() => stepMonth(1)}
          aria-label="الشهر التالي"
          disabled={!activeMonth || activeMonth >= curMonth}
          className="qb-press flex h-[34px] w-[34px] flex-shrink-0 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-2)] disabled:opacity-35"
        >
          <Chevron dir="left" />
        </button>
      </div>

      {/* نهاية الأدوات — بعد تمريرها تظهر أزرار البحث والفلترة مصغّرة بالرأس، والكبسولة تعرض الفلتر الحالي */}
      <div ref={toolsEndRef} className="h-3.5" />

      {chips.length > 0 && (
        <div className="-mx-5 mb-2.5 flex gap-1.5 overflow-x-auto px-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {chips.map((c) => (
            <button
              key={c.key}
              onClick={c.clear}
              className="qb-press flex flex-shrink-0 items-center gap-1.5 rounded-full border border-[var(--color-border-strong)] bg-white/[0.08] px-3 py-1.5 text-[12px] font-semibold"
            >
              {c.label}
              <CloseIcon size={10} />
            </button>
          ))}
          <button
            onClick={() => {
              setQuery('')
              setFilters(EMPTY_TX_FILTERS)
              setLimit(PAGE)
            }}
            className="qb-press flex-shrink-0 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-[12px] font-semibold text-[var(--color-expense)]"
          >
            مسح الكل
          </button>
        </div>
      )}

      {/* ملخص النتائج */}
      {all.length > 0 && (
        <div
          className="mb-3.5 rounded-[22px] border border-white/[0.09] p-3.5"
          style={{ background: 'radial-gradient(120% 90% at 100% 0%, rgba(255,255,255,0.06), transparent 55%), linear-gradient(165deg, var(--color-surface-elevated), var(--color-bg))' }}
        >
          <div className="text-[12px] text-[var(--color-text-2)]">
            <b className="num text-[var(--color-text)]">{filtered.length.toLocaleString('en-US')}</b> حركة
            {filters.period !== 'all' && ` · ${periodLabel(filters)}`}
          </div>
          <div className="mt-2.5 grid grid-cols-3 gap-2">
            {[
              ['الدخل', totals.income, 'var(--color-income)'],
              ['المصروف', totals.expense, 'var(--color-expense)'],
              ['الصافي', totals.net, 'var(--color-text)'],
            ].map(([label, v, color]) => (
              <div key={label as string} className="rounded-[14px] bg-white/[0.04] px-2 py-2 text-center">
                <small className="block text-[10.5px] text-[var(--color-text-3)]">{label}</small>
                <b dir="ltr" className="num block truncate text-[15px] font-bold" style={{ color: color as string }}>
                  {(v as number) < 0 ? '−' : ''}
                  {formatAmount(Math.abs(v as number))}
                </b>
              </div>
            ))}
          </div>
          {contributedTotal > 0 && (
            <div className="mt-2 text-[10.5px] text-[var(--color-text-3)]">
              لا يشمل <span className="num">{formatAmount(contributedTotal)}</span> ر.س دفعها غيرك
            </div>
          )}
          {totals.income + totals.expense > 0 && (
            <div className="mt-2.5 flex h-1.5 gap-0.5 overflow-hidden rounded-full bg-white/[0.05]">
              <span style={{ flex: totals.income, background: 'var(--color-income)' }} />
              <span style={{ flex: totals.expense, background: 'var(--color-expense)' }} />
            </div>
          )}
        </div>
      )}

      {/* بطاقات الفئات */}
      {categoryTiles.length > 0 && (
        <div className="-mx-5 mb-3.5 flex gap-2 overflow-x-auto px-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {categoryTiles.map((tile) => {
            const on = filters.categories.includes(tile.name)
            const category = tile.categoryId ? categories.find((c) => c.id === tile.categoryId) : undefined
            return (
              <button
                key={tile.name}
                onClick={() => update({ categories: on ? filters.categories.filter((c) => c !== tile.name) : [...filters.categories, tile.name] })}
                className="qb-press flex flex-shrink-0 items-center gap-2 rounded-2xl border py-[7px] pe-3 ps-[7px] text-right"
                style={{ background: on ? 'var(--color-surface-high)' : 'var(--color-surface)', borderColor: on ? 'var(--color-accent)' : 'var(--color-border)' }}
              >
                {category ? (
                  <CategoryIconBox category={category} size={30} radius={10} iconSize={16} />
                ) : (
                  <span className="flex items-center justify-center rounded-[10px]" style={{ width: 30, height: 30, background: soft('var(--color-expense)', 14), color: 'var(--color-expense)' }}>
                    <ActivityIcon kind="expense" />
                  </span>
                )}
                <span>
                  <b className="block text-[11.5px] font-semibold">{tile.name}</b>
                  <small className="num text-[11px] text-[var(--color-text-3)]">{formatAmount(tile.total)}</small>
                </span>
              </button>
            )
          })}
        </div>
      )}

      {all.length === 0 ? (
        <div className="qb-card qb-rise px-6 py-12 text-center text-[13.5px] leading-relaxed text-[var(--color-text-3)]">لا توجد حركات بعد</div>
      ) : filtered.length === 0 ? (
        <div className="qb-card qb-rise flex flex-col items-center gap-3 px-6 py-10 text-center text-[13.5px] text-[var(--color-text-3)]">
          لا توجد حركات مطابقة
          <button
            onClick={() => {
              setQuery('')
              setFilters(EMPTY_TX_FILTERS)
            }}
            className="qb-press rounded-full px-4 py-2 text-[12.5px] font-bold"
            style={{ background: 'var(--color-accent)', color: 'var(--color-on-accent)' }}
          >
            مسح الفلاتر
          </button>
        </div>
      ) : (
        <>
          {renderList()}
          {filtered.length > limit && (
            <button
              onClick={() => setLimit((l) => l + PAGE)}
              className="qb-press mt-3.5 w-full rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] py-3 text-[12.5px] font-semibold text-[var(--color-text-2)]"
            >
              عرض المزيد ({(filtered.length - limit).toLocaleString('en-US')})
            </button>
          )}
          <div className="pb-2 pt-3 text-center text-[11px] text-[var(--color-text-3)]">
            {selectMode ? 'اضغط الحركات لتحديدها' : 'اسحب يسارًا للحذف · يمينًا للتكرار · اضغط مطوّلًا للتحديد'}
          </div>
          {selectMode && <div style={{ height: 84 }} />}
        </>
      )}

      {/* شريط التحديد المتعدد */}
      <div
        className="fixed inset-x-3 z-50 mx-auto flex max-w-[456px] items-center gap-2 rounded-[22px] border border-[var(--color-border-strong)] p-2.5"
        style={{
          bottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)',
          background: 'rgba(30,30,36,0.96)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          boxShadow: '0 20px 44px -12px rgba(0,0,0,0.9)',
          transform: selectMode && selected.size > 0 ? 'none' : 'translateY(160%)',
          transition: 'transform 350ms var(--ease-out-expo)',
        }}
      >
        <div className="min-w-0 flex-1 ps-1.5 text-[12.5px] font-bold">
          {selected.size} محددة
          <small className="num block text-[10.5px] font-medium text-[var(--color-text-3)]">
            مجموع {formatAmount(selItems.reduce((s, i) => s + Math.abs(i.amount), 0))} ر.س
          </small>
        </div>
        <button
          onClick={() => setSelected(new Set(filtered.map((i) => i.id)))}
          className="qb-press flex flex-col items-center gap-0.5 rounded-xl px-2 py-1.5 text-[10px] font-semibold text-[var(--color-text-2)]"
        >
          <SelectIcon />
          تحديد الكل
        </button>
        <button
          onClick={() => (selExpenseIds.length ? setCatPickerOpen(true) : notify('info', 'تغيير الفئة للمصاريف فقط'))}
          className="qb-press flex flex-col items-center gap-0.5 rounded-xl px-2 py-1.5 text-[10px] font-semibold text-[var(--color-text-2)]"
        >
          <TagIcon />
          تغيير الفئة
        </button>
        <button onClick={bulkDelete} className="qb-press flex flex-col items-center gap-0.5 rounded-xl px-2 py-1.5 text-[10px] font-semibold text-[var(--color-expense)]">
          <TrashIcon />
          حذف
        </button>
      </div>
    </ScreenScroll>
  )
}
