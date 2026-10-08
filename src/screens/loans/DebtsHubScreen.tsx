import { useState, type ReactNode } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useData } from '../../state/DataContext'
import { formatAmount, formatDate } from '../../lib/format'
import { PeoplePanel } from './PeoplePanel'
import { SalaryAdvancePanel } from './SalaryAdvancePanel'
import { SalaryViolationsPanel } from './SalaryViolationsPanel'
import { StoreDebtsPanel } from './StoreDebtsPanel'
import { TabHeader, HeaderIconButton, PlusGlyph } from '../../components/TabHeader'
import { SheetHandle } from '../../components/SheetHandle'
import { haptic } from '../../lib/haptics'
import { DEBT_KINDS, DEBT_META, isDebtTab, softBg, type DebtKind, type DebtTab } from './debtTypes'
import { DebtHero, DebtKindBubble, DebtKindIcon, DebtKindTag, SectionHead } from './DebtVisuals'

const TABS: DebtTab[] = ['overview', ...DEBT_KINDS]

function todayIso(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** أرقام كل نوع — مصدر واحد للشريط (نقاط التنبيه) والنظرة العامة. */
function useDebtSummary() {
  const { people, personBalance, totalOwedToMe, totalIOwe, salaryAdvances, storeDebts, storeDebtPayments, salaryViolations } = useData()
  const today = todayIso()
  const paidOf = (debtId: string) => storeDebtPayments.filter((p) => p.debtId === debtId).reduce((s, p) => s + p.amount, 0)
  const openStores = storeDebts.filter((d) => d.amount - paidOf(d.id) > 0)
  const year = String(new Date().getFullYear())
  const violationsSorted = [...salaryViolations].sort((a, b) => b.date.localeCompare(a.date))
  return {
    owedToMe: totalOwedToMe,
    iOwePeople: totalIOwe,
    peopleCount: people.length,
    openPeople: people.filter((p) => personBalance(p.id) !== 0).length,
    advanceOutstanding: salaryAdvances.filter((a) => !a.settled).reduce((s, a) => s + a.amount, 0),
    storeOutstanding: openStores.reduce((s, d) => s + d.amount - paidOf(d.id), 0),
    openStoreCount: openStores.length,
    overdueStores: openStores.filter((d) => d.dueDate && d.dueDate < today).length,
    violationsYear: salaryViolations.filter((v) => v.date.startsWith(year)).reduce((s, v) => s + v.amount, 0),
    lastViolation: violationsSorted[0],
  }
}

function TypeSwitcher({ tab, onSelect, alerts }: { tab: DebtTab; onSelect: (t: DebtTab) => void; alerts: Partial<Record<DebtTab, string>> }) {
  return (
    <div
      data-own-gesture
      className="sticky top-0 z-[3] -mx-5 mb-4 px-5 pb-2.5 pt-2"
      style={{ background: 'linear-gradient(180deg, var(--color-bg) 75%, transparent)' }}
    >
      <div className="grid grid-cols-5 gap-1.5" role="tablist">
        {TABS.map((t) => {
          const { color, label } = DEBT_META[t]
          const active = tab === t
          return (
            <button
              key={t}
              role="tab"
              aria-selected={active}
              onClick={() => onSelect(t)}
              className="qb-press relative flex flex-col items-center gap-1.5 rounded-[18px] border px-0.5 pb-2 pt-2.5"
              style={{
                background: active ? softBg(color) : 'var(--color-surface)',
                borderColor: active ? color : 'var(--color-border)',
                transition: 'background 250ms ease, border-color 250ms ease',
              }}
            >
              {alerts[t] && <span className="absolute rounded-full" style={{ top: 6, left: 8, width: 7, height: 7, background: alerts[t] }} />}
              <span
                className="flex items-center justify-center"
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 11,
                  background: active ? color : softBg(color),
                  color: active ? '#0a0a0c' : color,
                  transition: 'background 250ms ease, color 250ms ease',
                }}
              >
                <DebtKindIcon kind={t} size={16} strokeWidth={2} />
              </span>
              <span className="whitespace-nowrap text-[10px] font-semibold" style={{ color: active ? 'var(--color-text)' : 'var(--color-text-2)' }}>
                {label}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

interface TimelineItem {
  id: string
  kind: DebtKind
  title: string
  date: string
  amount: string
  color: string
  hint: string
  onClick: () => void
}

/** ملخّص كل الأنواع: صافي الموقف، بطاقة لكل نوع، وآخر الحركات من كل الأنواع بقائمة واحدة. */
function OverviewPanel({ onOpenTab }: { onOpenTab: (tab: DebtTab) => void }) {
  const navigate = useNavigate()
  const { people, loanTransactions, salaryAdvances, salaryViolations, storeDebts, storeDebtPayments } = useData()
  const s = useDebtSummary()
  const iOweAll = s.iOwePeople + s.advanceOutstanding + s.storeOutstanding
  const net = s.owedToMe - iOweAll
  const netColor = net >= 0 ? 'var(--color-income)' : 'var(--color-expense)'

  const cards: { kind: DebtKind; amount: ReactNode; sub: ReactNode }[] = [
    {
      kind: 'people',
      amount: (
        <span dir="ltr" className="inline-block">
          <span style={{ color: 'var(--color-income)' }}>+{formatAmount(s.owedToMe)}</span> / <span style={{ color: 'var(--color-owed-by)' }}>−{formatAmount(s.iOwePeople)}</span>
        </span>
      ),
      sub: s.peopleCount === 0 ? 'لا يوجد أشخاص بعد' : `${s.peopleCount} أشخاص · ${s.openPeople} بحساب مفتوح`,
    },
    {
      kind: 'advance',
      amount: formatAmount(s.advanceOutstanding),
      sub: s.advanceOutstanding > 0 ? 'تُخصم من راتبك القادم' : 'لا توجد سلفة قائمة',
    },
    {
      kind: 'violations',
      amount: formatAmount(s.lastViolation?.amount ?? 0),
      sub: s.lastViolation ? `آخر خصم · ${formatDate(s.lastViolation.date)} · السنة ${formatAmount(s.violationsYear)}` : 'لا توجد خصومات',
    },
    {
      kind: 'stores',
      amount: formatAmount(s.storeOutstanding),
      sub:
        s.openStoreCount === 0 ? (
          'لا توجد ديون قائمة'
        ) : (
          <>
            {s.openStoreCount} ديون قائمة
            {s.overdueStores > 0 && <b style={{ color: 'var(--color-expense)' }}> · {s.overdueStores} متأخر</b>}
          </>
        ),
    },
  ]

  const items: TimelineItem[] = [
    ...loanTransactions.map((l): TimelineItem => {
      const person = people.find((p) => p.id === l.personId)
      const given = l.direction === 'given'
      return {
        id: `l-${l.id}`,
        kind: 'people',
        title: `${person?.name ?? 'شخص'} — ${given ? 'أعطيته' : 'أخذت منه'}`,
        date: l.date,
        amount: formatAmount(l.amount),
        color: given ? 'var(--color-owed-to)' : 'var(--color-owed-by)',
        hint: given ? 'لك عنده' : 'عليك له',
        onClick: () => navigate(`/loans/${l.personId}`),
      }
    }),
    ...salaryAdvances.map(
      (a): TimelineItem => ({
        id: `a-${a.id}`,
        kind: 'advance',
        title: 'سلفة راتب',
        date: a.date,
        amount: `+${formatAmount(a.amount)}`,
        color: a.settled ? 'var(--color-text-2)' : DEBT_META.advance.color,
        hint: a.settled ? 'مسدَّدة' : 'تُخصم من الراتب',
        onClick: () => onOpenTab('advance'),
      }),
    ),
    ...salaryViolations.map(
      (v): TimelineItem => ({
        id: `v-${v.id}`,
        kind: 'violations',
        title: v.note?.trim() ? `خصم مخالفة · ${v.note.trim()}` : 'خصم مخالفة',
        date: v.date,
        amount: `−${formatAmount(v.amount)}`,
        color: DEBT_META.violations.color,
        hint: 'من الراتب',
        onClick: () => onOpenTab('violations'),
      }),
    ),
    ...storeDebts.map(
      (d): TimelineItem => ({
        id: `d-${d.id}`,
        kind: 'stores',
        title: `دَين ${d.storeName}`,
        date: d.date,
        amount: formatAmount(d.amount),
        color: DEBT_META.stores.color,
        hint: 'شراء بالآجل',
        onClick: () => onOpenTab('stores'),
      }),
    ),
    ...storeDebtPayments.map((p): TimelineItem => {
      const debt = storeDebts.find((d) => d.id === p.debtId)
      return {
        id: `p-${p.id}`,
        kind: 'stores',
        title: `سداد ${debt?.storeName ?? 'متجر'}`,
        date: p.date,
        amount: `−${formatAmount(p.amount)}`,
        color: DEBT_META.stores.color,
        hint: 'سداد',
        onClick: () => onOpenTab('stores'),
      }
    }),
  ]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 6)

  return (
    <>
      <DebtHero color={netColor}>
        <div className="text-[12.5px] font-medium text-[var(--color-text-2)]">صافي موقفك</div>
        <div className="mt-1 flex items-baseline gap-1.5" style={{ color: netColor }}>
          <span dir="ltr" className="num text-[34px] font-bold">
            {net < 0 ? '−' : ''}
            {formatAmount(Math.abs(net))}
          </span>
          <span className="text-[13px] font-medium text-[var(--color-text-3)]">ر.س</span>
        </div>
        <div className="mt-0.5 text-[11.5px] text-[var(--color-text-3)]">{net >= 0 ? 'لك أكثر مما عليك' : 'عليك أكثر مما لك'}</div>
        <div className="my-3.5 flex h-2 gap-[3px] overflow-hidden rounded-full bg-white/[0.05]">
          {s.owedToMe > 0 && <span className="h-full rounded-full bg-[var(--color-income)]" style={{ flexGrow: s.owedToMe }} />}
          {iOweAll > 0 && <span className="h-full rounded-full bg-[var(--color-expense)]" style={{ flexGrow: iOweAll }} />}
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          {[
            { label: 'مستحق لك', value: s.owedToMe, color: 'var(--color-income)' },
            { label: 'إجمالي عليك', value: iOweAll, color: 'var(--color-expense)' },
          ].map((x) => (
            <div key={x.label}>
              <div className="flex items-center gap-1.5 text-[11px] text-[var(--color-text-3)]">
                <span className="rounded-full" style={{ width: 7, height: 7, background: x.color }} />
                {x.label}
              </div>
              <div className="num mt-0.5 text-[16px] font-bold">{formatAmount(x.value)}</div>
            </div>
          ))}
        </div>
      </DebtHero>

      <SectionHead title="حسب النوع" />
      <div className="grid grid-cols-2 gap-2.5">
        {cards.map((c) => {
          const { color, title } = DEBT_META[c.kind]
          return (
            <button
              key={c.kind}
              onClick={() => onOpenTab(c.kind)}
              className="qb-press relative flex min-h-[138px] flex-col overflow-hidden rounded-[22px] border border-[var(--color-border)] bg-[var(--color-surface)] p-3.5 text-right"
            >
              <span className="pointer-events-none absolute rounded-full" style={{ left: -30, bottom: -40, width: 110, height: 110, background: color, filter: 'blur(30px)', opacity: 0.16 }} />
              <span className="relative">
                <DebtKindBubble kind={c.kind} size={40} iconSize={19} />
              </span>
              <span className="relative mt-2.5 text-[13px] font-semibold">{title}</span>
              <span className="num relative mt-0.5 text-[17px] font-bold">{c.amount}</span>
              <span className="relative mt-auto pt-2 text-[10.5px] leading-relaxed text-[var(--color-text-3)]">{c.sub}</span>
            </button>
          )
        })}
      </div>

      <SectionHead title="آخر الحركات" hint="كل الأنواع" />
      {items.length === 0 ? (
        <div className="qb-card py-8 text-center text-[12.5px] text-[var(--color-text-3)]">لا توجد حركات بعد</div>
      ) : (
        <div className="qb-card px-3.5 py-1">
          {items.map((it) => (
            <button key={it.id} onClick={it.onClick} className="flex w-full items-center gap-3 border-t border-[var(--color-border)] py-2.5 text-right first:border-t-0">
              <DebtKindBubble kind={it.kind} size={40} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-semibold">{it.title}</div>
                <div className="mt-1 flex items-center gap-1.5 text-[10.5px] text-[var(--color-text-3)]">
                  <DebtKindTag kind={it.kind} />
                  <span className="num">{formatDate(it.date)}</span>
                </div>
              </div>
              <div className="flex-shrink-0 text-left">
                <div dir="ltr" className="num text-[13.5px] font-bold" style={{ color: it.color }}>
                  {it.amount}
                </div>
                <div className="mt-0.5 text-[10px] font-semibold text-[var(--color-text-3)]">{it.hint}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </>
  )
}

function AddDebtSheet({ open, onClose, onPick }: { open: boolean; onClose: () => void; onPick: (kind: DebtKind) => void }) {
  if (!open) return null
  const options: { kind: DebtKind; title: string; desc: string }[] = [
    { kind: 'people', title: 'سلفة مع شخص', desc: 'أعطيت أو أخذت مبلغًا من شخص' },
    { kind: 'advance', title: 'سلفة راتب', desc: 'مبلغ مقدّم يُخصم من راتبك القادم' },
    { kind: 'stores', title: 'دَين متجر', desc: 'شراء بالآجل وتسدّده لاحقًا' },
    { kind: 'violations', title: 'خصم مخالفة', desc: 'يُسجَّل مع حركة الراتب — يفتح إضافة دخل' },
  ]
  return (
    <div dir="rtl" className="fixed inset-0 z-[60] flex items-end justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-[6px]" style={{ animation: 'fade-in 180ms ease-out both' }} onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-label="إضافة"
        className="relative w-full max-w-[480px] rounded-t-[32px] border-x border-t border-[var(--color-border-strong)] bg-[var(--color-surface-elevated)] px-4 shadow-[0_-24px_60px_-20px_rgba(0,0,0,0.85)]"
        style={{ animation: 'sheet-in 420ms var(--ease-out-expo) both', paddingBottom: 'calc(22px + env(safe-area-inset-bottom))' }}
      >
        <SheetHandle onDismiss={onClose} />
        <div className="mx-1 mb-3.5 mt-1 text-[17px] font-semibold">ماذا تريد أن تسجّل؟</div>
        {options.map((o) => (
          <button
            key={o.kind}
            onClick={() => onPick(o.kind)}
            className="qb-press mb-2 flex w-full items-center gap-3 rounded-[20px] border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-3 text-right"
          >
            <DebtKindBubble kind={o.kind} size={40} iconSize={19} />
            <div className="min-w-0 flex-1">
              <div className="text-[14px] font-semibold">{o.title}</div>
              <div className="mt-0.5 text-[11px] text-[var(--color-text-3)]">{o.desc}</div>
            </div>
            <span className="text-[var(--color-text-3)]">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="m15 6-6 6 6 6" />
              </svg>
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}

/**
 * شاشة موحّدة لكل أنواع الديون والسلف: سلف الأشخاص، سلفة الراتب، خصومات المخالفات، وديون المتاجر.
 * كل نوع له لون وأيقونة ثابتة، وشريط علوي بأيقونات للتنقل بينها مع نقطة تنبيه عند وجود ما يحتاج انتباه.
 */
export function DebtsHubScreen() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const initialTab = searchParams.get('tab')
  const [tab, setTab] = useState<DebtTab>(isDebtTab(initialTab) ? initialTab : 'overview')
  const [addOpen, setAddOpen] = useState(false)
  /** نوع فُتح من ورقة "+" — تبويبه يبدأ بنموذج الإضافة مفتوحًا. nonce يعيد تركيب التبويب حتى لو اختير نفس النوع مرة ثانية. */
  const [addingKind, setAddingKind] = useState<DebtKind | null>(null)
  const [addNonce, setAddNonce] = useState(0)
  const s = useDebtSummary()

  function selectTab(next: DebtTab) {
    haptic('tick')
    setTab(next)
    setAddingKind(null)
    setSearchParams(next === 'overview' ? {} : { tab: next }, { replace: true })
  }

  function pickAdd(kind: DebtKind) {
    setAddOpen(false)
    if (kind === 'violations') {
      navigate('/add/transaction?type=income')
      return
    }
    if (kind === 'people') {
      if (s.peopleCount === 0) navigate('/loans/new')
      else selectTab('people')
      return
    }
    selectTab(kind)
    setAddingKind(kind)
    setAddNonce((n) => n + 1)
  }

  const alerts: Partial<Record<DebtTab, string>> = {
    people: s.openPeople > 0 ? DEBT_META.people.color : undefined,
    advance: s.advanceOutstanding > 0 ? DEBT_META.advance.color : undefined,
    stores: s.overdueStores > 0 ? 'var(--color-expense)' : undefined,
  }

  return (
    <div dir="rtl" className="px-5 pb-4">
      <AddDebtSheet open={addOpen} onClose={() => setAddOpen(false)} onPick={pickAdd} />
      <TabHeader
        title="السلف والديون"
        subtitle={DEBT_META[tab].subtitle}
        actions={
          <HeaderIconButton accent label="إضافة" onClick={() => setAddOpen(true)}>
            <PlusGlyph />
          </HeaderIconButton>
        }
      />

      <TypeSwitcher tab={tab} onSelect={selectTab} alerts={alerts} />

      <div key={`${tab}-${addNonce}`} className="qb-rise">
        {tab === 'overview' && <OverviewPanel onOpenTab={selectTab} />}
        {tab === 'people' && <PeoplePanel />}
        {tab === 'advance' && <SalaryAdvancePanel startAdding={addingKind === 'advance'} />}
        {tab === 'violations' && <SalaryViolationsPanel />}
        {tab === 'stores' && <StoreDebtsPanel startAdding={addingKind === 'stores'} />}
      </div>
    </div>
  )
}
