import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useData } from '../../state/DataContext'
import { useMoneyTrail } from '../../hooks/useMoneyTrail'
import { groupBatchesByMonth, type MoneyBatch } from '../../lib/moneyTrail'
import { getHideBalancesDefault } from '../../lib/privacy'
import { MONTHS_AR } from '../../lib/txFilters'
import { haptic } from '../../lib/haptics'
import { rise } from '../../lib/motion'
import { ScreenScroll } from '../../components/ScreenScroll'
import { ScreenHeader } from '../../components/ScreenHeader'
import { EyeToggleButton } from '../../components/EyeToggleButton'
import { BigAmount } from '../../components/BigAmount'
import { EmptyState } from '../../components/ui'
import { AlertIcon, BatchBar, BatchIconBox, BatchLegend, BatchStatusBadge, TrailIcon, longDate, money, useTrailNames } from '../../components/MoneyTrailVisuals'

type Filter = 'all' | 'open' | 'done' | 'borrowed' | 'lent'
const FILTERS: [Filter, string][] = [
  ['all', 'الكل'],
  ['open', 'مفتوحة'],
  ['done', 'مكتملة'],
  ['borrowed', 'مقترضة'],
  ['lent', 'عند الناس'],
]

function matches(b: MoneyBatch, f: Filter): boolean {
  if (f === 'open') return b.open && b.kind !== 'borrowed'
  if (f === 'done') return !b.open
  if (f === 'borrowed') return b.kind === 'borrowed'
  if (f === 'lent') return b.lent > 0
  return true
}

const INTRO_KEY = 'qbnomia.moneyTrailIntroSeen'
function readIntroSeen(): boolean {
  try {
    return localStorage.getItem(INTRO_KEY) === '1'
  } catch {
    return true
  }
}

function monthTitle(key: string): string {
  if (!key) return 'قبل بداية التتبع'
  const [y, m] = key.split('-')
  return `${MONTHS_AR[Number(m) - 1]} ${y}`
}

function CheckDot() {
  return (
    <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full" style={{ background: 'color-mix(in srgb, var(--color-income) 15%, transparent)', color: 'var(--color-income)' }}>
      <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="m5 12.5 4.5 4.5L19 7.5" />
      </svg>
    </span>
  )
}

/** أول فتح بعد التحديث: ملخص ما رتّبناه من السجل القديم بدون أي تغيير على البيانات. */
function IntroCard({ hidden, onDone, onReview }: { hidden: boolean; onDone: () => void; onReview: () => void }) {
  const { transactions, loanTransactions } = useData()
  const trail = useMoneyTrail()
  const count = transactions.length + loanTransactions.length
  const first = [...transactions, ...loanTransactions].reduce<string>((min, t) => (!min || t.date < min ? t.date : min), '')
  const incomes = trail.batches.filter((b) => b.kind === 'income').length
  const opening = trail.batches.filter((b) => b.kind === 'opening').reduce((s, b) => s + b.amount, 0)
  const linked = new Set(trail.batches.flatMap((b) => b.events.filter((e) => e.kind === 'returned' || e.kind === 'obligation-paid').map((e) => e.ref))).size
  const rows = [
    count > 0 && { t: <>قرأنا <span className="num">{count}</span> حركة{first && <> من <span className="num">{longDate(first)}</span></>}</>, s: 'بدون ما يتغيّر أي رصيد أو حركة' },
    incomes > 0 && { t: <><span className="num">{incomes}</span> دفعة دخل</>, s: 'كل دخل سجّلته صار دفعة' },
    opening > 0 && { t: <>رصيد سابق <span className="num">{money(opening, hidden)}</span> ر.س</>, s: 'اللي كان في حساباتك قبل أول حركة' },
    linked > 0 && { t: <><span className="num">{linked}</span> سداد ربطناه بسلفته</>, s: 'كل سداد على أقدم سلفة مفتوحة للشخص' },
  ].filter(Boolean) as { t: React.ReactNode; s: string }[]

  return (
    <div className="qb-rise mb-5 overflow-hidden rounded-[22px] border border-white/10 p-4" style={{ background: 'radial-gradient(120% 90% at 100% 0%, rgba(255,255,255,0.06), transparent 55%), linear-gradient(165deg, var(--color-surface-elevated), var(--color-bg))' }}>
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-white/[0.07] text-[var(--color-text)]">
          <TrailIcon size={20} />
        </span>
        <div className="min-w-0">
          <div className="text-[15px] font-bold">جهّزنا مسار فلوسك من سجلك</div>
          <div className="text-[11.5px] text-[var(--color-text-3)]">رتّبنا حركاتك القديمة من أولها بالأقدم أولًا</div>
        </div>
      </div>
      <div className="mt-3">
        {rows.map((r, i) => (
          <div key={i} className={`flex items-start gap-2.5 py-2 ${i > 0 ? 'border-t qb-divider' : ''}`}>
            <CheckDot />
            <div className="min-w-0">
              <div className="text-[13px] font-semibold">{r.t}</div>
              <div className="text-[11px] text-[var(--color-text-3)]">{r.s}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 flex gap-2">
        {trail.issues.length > 0 && (
          <button onClick={onReview} className="qb-press flex h-11 flex-1 items-center justify-center gap-1.5 rounded-full text-[13px] font-semibold" style={{ background: 'color-mix(in srgb, var(--color-subscription) 14%, transparent)', color: 'var(--color-subscription)' }}>
            <AlertIcon size={15} />
            تحتاج نظرة <span className="num">{trail.issues.length}</span>
          </button>
        )}
        <button onClick={onDone} className="qb-btn-primary h-11 flex-1 text-[13px]">
          تمام
        </button>
      </div>
    </div>
  )
}

export function MoneyTrailScreen() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const filter = (FILTERS.find(([f]) => f === params.get('f'))?.[0] ?? 'all') as Filter
  const trail = useMoneyTrail()
  const { batchTitle, batchSubtitle, personName } = useTrailNames()
  const [hidden, setHidden] = useState(getHideBalancesDefault)
  const [introSeen, setIntroSeen] = useState(readIntroSeen)

  const totals = useMemo(() => {
    let left = 0
    let lent = 0
    let open = 0
    for (const b of trail.batches) {
      left += b.left
      lent += b.lent
      if (b.open) open++
    }
    return { left, lent, open, unknown: trail.issues.reduce((s, b) => s + b.amount, 0) }
  }, [trail])

  const groups = useMemo(() => groupBatchesByMonth(trail.batches.filter((b) => matches(b, filter))), [trail, filter])

  function setFilter(f: Filter) {
    haptic('tick')
    setParams(f === 'all' ? {} : { f }, { replace: true })
  }

  function dismissIntro() {
    try {
      localStorage.setItem(INTRO_KEY, '1')
    } catch {
      // تفضيل عرض فقط — لو التخزين مقفول تظهر البطاقة مرة ثانية، بدون ضرر.
    }
    setIntroSeen(true)
  }

  return (
    <ScreenScroll header={<ScreenHeader title="شجرة المصاريف" onBack={() => navigate(-1)} right={<EyeToggleButton hidden={hidden} onToggle={() => setHidden((h) => !h)} />} />}>
      <div className="-mt-2 mb-4 px-1 text-[12px] text-[var(--color-text-3)]">كل دخل دفعة، وكل ريال له وجهة</div>

      {trail.batches.length === 0 ? (
        <EmptyState icon={<TrailIcon size={24} />} title="ما فيه فلوس نتتبعها بعد" desc="سجّل أول دخل أو أضف حسابًا برصيده، وبتظهر هنا كل دفعة ووين راحت." actionLabel="إضافة دخل" onAction={() => navigate('/add/transaction?type=income')} />
      ) : (
        <>
          {!introSeen && <IntroCard hidden={hidden} onDone={dismissIntro} onReview={() => navigate('/trail/review')} />}

          <div className="qb-rise mb-4 overflow-hidden rounded-[22px] border border-white/[0.09] p-4" style={{ ...rise(0), background: 'radial-gradient(120% 90% at 100% 0%, rgba(255,255,255,0.06), transparent 55%), linear-gradient(165deg, var(--color-surface-elevated), var(--color-bg))' }}>
            <div className="text-[12px] text-[var(--color-text-2)]">باقي لك من دفعاتك</div>
            <BigAmount value={totals.left} hidden={hidden} size={34} className="mt-1" />
            <div className="mt-3.5 grid grid-cols-3 gap-2 border-t pt-3 qb-divider">
              <button onClick={() => setFilter('lent')} className="qb-press text-right">
                <div className="text-[11px] text-[var(--color-text-3)]">عند الناس</div>
                <div className="num text-[15px] font-bold" style={{ color: 'var(--color-owed-to)' }}>{money(totals.lent, hidden)}</div>
              </button>
              <button onClick={() => setFilter('open')} className="qb-press text-right">
                <div className="text-[11px] text-[var(--color-text-3)]">دفعات مفتوحة</div>
                <div className="num text-[15px] font-bold">{totals.open}</div>
              </button>
              <button onClick={() => navigate('/trail/review')} className="qb-press text-right">
                <div className="text-[11px] text-[var(--color-text-3)]">بلا مصدر</div>
                <div className="num text-[15px] font-bold" style={{ color: totals.unknown > 0 ? 'var(--color-subscription)' : 'var(--color-text-3)' }}>{money(totals.unknown, hidden)}</div>
              </button>
            </div>
          </div>

          <div className="qb-rise mb-1 flex justify-center" style={rise(1)}>
            <div
              data-own-gesture
              className="flex max-w-full items-center gap-1 overflow-x-auto rounded-full border p-1 [scrollbar-width:none]"
              style={{ background: 'rgba(28,28,33,0.9)', borderColor: 'var(--color-border-strong)', backdropFilter: 'blur(20px) saturate(1.6)', WebkitBackdropFilter: 'blur(20px) saturate(1.6)', boxShadow: '0 12px 30px -12px rgba(0,0,0,0.8)' }}
            >
              {FILTERS.map(([f, label]) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className="qb-press h-8 flex-shrink-0 rounded-full px-3 text-[12px] font-semibold"
                  style={{
                    background: filter === f ? 'var(--color-accent)' : 'transparent',
                    color: filter === f ? 'var(--color-on-accent)' : 'var(--color-text-2)',
                    transition: 'background 300ms var(--ease-spring), color 200ms',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {groups.length === 0 && <div className="qb-card mt-4 px-6 py-8 text-center text-[12.5px] text-[var(--color-text-3)]">ما فيه دفعات بهذا الفلتر</div>}

          {groups.map((g, gi) => (
            <section key={g.key || 'opening'} className="qb-rise" style={rise(gi + 2)}>
              <div className="mx-1.5 mb-2 mt-5 flex justify-between text-[11.5px] font-semibold text-[var(--color-text-3)]">
                <span>{monthTitle(g.key)}</span>
                <span className="num">{money(g.batches.reduce((s, b) => s + b.amount, 0), hidden)}</span>
              </div>
              {g.batches.map((b) => (
                <button key={b.id} onClick={() => navigate(`/trail/${encodeURIComponent(b.id)}`)} className="qb-card qb-press mb-2 block w-full p-3.5 text-right">
                  <div className="flex items-center gap-3">
                    <BatchIconBox batch={b} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13.5px] font-semibold">{batchTitle(b)}</div>
                      <div className="truncate text-[11px] text-[var(--color-text-3)]">{batchSubtitle(b)}</div>
                    </div>
                    <div className="flex flex-shrink-0 flex-col items-end gap-1">
                      <span className="num text-[15px] font-bold">
                        {money(b.amount, hidden)}
                        <span className="ms-1 font-sans text-[11px] font-medium text-[var(--color-text-3)]">ر.س</span>
                      </span>
                      <BatchStatusBadge batch={b} />
                    </div>
                  </div>
                  <BatchBar batch={b} style={{ marginTop: 12 }} />
                  <BatchLegend batch={b} hidden={hidden} />
                  {b.kind === 'borrowed' && b.owed - b.owedPaid > 0 && (
                    <div className="mt-2 text-[11px]" style={{ color: 'var(--color-owed-by)' }}>
                      باقي عليك لـ{personName(b.personId)} <span className="num">{money(b.owed - b.owedPaid, hidden)}</span> ر.س
                    </div>
                  )}
                </button>
              ))}
            </section>
          ))}
        </>
      )}
    </ScreenScroll>
  )
}
