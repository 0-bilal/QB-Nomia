import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useData, type ActivityItem } from '../state/DataContext'
import { formatAmount, formatMoney, formatSigned, formatDate } from '../lib/format'
import { fuelLevel, fuelLevelColor, lastFuelTopUp } from '../lib/fuelCard'
import { ActivityIcon } from '../components/ActivityIcon'
import { activityEditPath } from '../lib/activityNav'
import { BankCardFace } from '../components/BankCardFace'
import { ACCOUNT_CARD_BG, ACCOUNT_ICON_COLOR, ACCOUNT_TYPE_LABELS } from '../components/AccountVisuals'
import { EyeToggleButton } from '../components/EyeToggleButton'
import { TabHeader, HeaderIconButton, PlusGlyph } from '../components/TabHeader'
import { BigAmount } from '../components/BigAmount'
import { getHideBalancesDefault } from '../lib/privacy'
import type { Account, AccountType } from '../types'
import { SparkLines } from '../components/SparkLines'
import { useSparkScrub } from '../hooks/useSparkScrub'
import { accountsBalanceValues, trendColor } from '../lib/balanceHistory'
import { MONTHS_AR } from '../lib/txFilters'
import { haptic } from '../lib/haptics'

type ViewMode = 'list' | 'cards'
const VIEW_KEY = 'qb-accounts-view'

/** مجموعات شاشة الحسابات — ترتيب العرض بالقائمة، ولون أول نوع فيها يمثّلها بمفتاح شريط التوزيع. */
const GROUPS: { title: string; types: AccountType[] }[] = [
  { title: 'الاستخدام اليومي', types: ['cash', 'bank', 'wallet'] },
  { title: 'الادخار والطوارئ', types: ['savings', 'emergency', 'coins'] },
  { title: 'بطاقات مسبقة الدفع', types: ['fuel', 'steam'] },
]

const PREPAID: AccountType[] = ['wallet', 'fuel', 'steam']

function readViewMode(): ViewMode {
  try {
    return localStorage.getItem(VIEW_KEY) === 'cards' ? 'cards' : 'list'
  } catch {
    return 'list'
  }
}

function saveViewMode(mode: ViewMode) {
  try {
    localStorage.setItem(VIEW_KEY, mode)
  } catch {
    // تفضيل عرض فقط — تجاهل فشل التخزين (وضع التصفح الخاص مثلًا).
  }
}

function sharePct(value: number, total: number): string {
  if (total <= 0 || value <= 0) return '0%'
  const p = (value / total) * 100
  return p < 1 ? '<1%' : `${Math.round(p)}%`
}

/** فترات السبارك: آخر 7 / 30 / 90 / 365 يومًا. */
const SPARK_PERIODS: [number, string, string][] = [
  [7, 'أسبوع', 'آخر 7 أيام'],
  [30, 'شهر', 'آخر 30 يوم'],
  [90, '3 أشهر', 'آخر 3 أشهر'],
  [365, 'سنة', 'آخر سنة'],
]

/** «22 سبتمبر» لنقطة `i` من سلسلة طولها `n` تنتهي اليوم. */
function sparkDayLabel(i: number, n: number): string {
  if (i === n - 1) return 'اليوم'
  const d = new Date()
  d.setDate(d.getDate() - (n - 1 - i))
  return `${d.getDate()} ${MONTHS_AR[d.getMonth()]}`
}

/** شارة تغيّر الرصيد بين أول وآخر نقطة: المبلغ والنسبة، أخضر للزيادة وأحمر للنقص. */
function ChangePill({ values, hidden }: { values: number[]; hidden: boolean }) {
  if (values.length < 2) return null
  const first = values[0]
  const diff = values[values.length - 1] - first
  const pct = first > 0 ? (diff / first) * 100 : null
  const color = diff >= 0 ? 'var(--color-income)' : 'var(--color-expense)'
  return (
    <span dir="ltr" className="num inline-flex flex-shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11.5px] font-semibold" style={{ color, background: `color-mix(in srgb, ${color} 13%, transparent)` }}>
      <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
        <path d={diff >= 0 ? 'M12 19V5M6 11l6-6 6 6' : 'M12 5v14M6 13l6 6 6-6'} />
      </svg>
      {hidden ? '•••' : formatAmount(Math.round(Math.abs(diff)))}
      {!hidden && pct !== null && ` · ${Math.abs(pct).toFixed(1)}%`}
    </span>
  )
}

function PeriodChips({ days, onChange }: { days: number; onChange: (d: number) => void }) {
  return (
    <div data-own-gesture className="flex gap-1">
      {SPARK_PERIODS.map(([d, label]) => (
        <button
          key={d}
          onClick={() => {
            if (d === days) return
            haptic('tick')
            onChange(d)
          }}
          className="qb-press h-7 flex-1 rounded-full text-[11px] font-semibold"
          style={d === days ? { background: 'rgba(255,255,255,0.08)', color: 'var(--color-text)' } : { color: 'var(--color-text-3)' }}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

/** تغيّر الرصيد خلال 30 يومًا تحت رصيد الصف. */
function RowChange({ values, hidden }: { values: number[]; hidden: boolean }) {
  const diff = values.length > 1 ? values[values.length - 1] - values[0] : 0
  if (hidden) return <>•••</>
  if (diff === 0) return <span className="text-[var(--color-text-3)]">بدون تغيّر · 30 يوم</span>
  return (
    <span style={{ color: diff > 0 ? 'var(--color-income)' : 'var(--color-expense)' }}>
      <span dir="ltr">
        {diff > 0 ? '+' : '−'}
        {formatAmount(Math.round(Math.abs(diff)))}
      </span>{' '}
      · 30 يوم
    </span>
  )
}

function EditIcon() {
  return (
    <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 20h4L18.5 9.5a2.1 2.1 0 0 0-3-3L5 17v3Z" />
      <path d="M13.5 8 16 10.5" />
    </svg>
  )
}
/** أيقونة "الشاشة الرئيسية" — تُملأ لما الحساب مفعّل الظهور بها، وتبقى بخط فاتح لما يكون مخفيًا عنها. */
function HomeVisibilityIcon({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="17" height="17" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 11 12 4l8 7" />
      <path d="M6 9.5V19a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V9.5" />
    </svg>
  )
}
function TransferIcon({ size = 17 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 3l4 4-4 4M20 7H8M8 21l-4-4 4-4M4 17h12" />
    </svg>
  )
}
function PlusIcon({ size = 17 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}
function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"
      className="flex-shrink-0 text-[var(--color-text-3)]"
      style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 250ms cubic-bezier(0.22,1,0.36,1)' }}
    >
      <polyline points="6,9 12,15 18,9" />
    </svg>
  )
}
function ListGlyph() {
  return (
    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
      <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
    </svg>
  )
}
function CardGlyph() {
  return (
    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round">
      <rect x="2" y="5" width="20" height="14" rx="3" />
      <path d="M2 10h20" />
    </svg>
  )
}

/** مصغّرة البطاقة البنكية — نفس تدرّج الكرت بحجم صغير لتمييز الحساب بلمحة داخل صف القائمة. */
function CardThumb({ type }: { type: AccountType }) {
  return (
    <div
      className="relative flex-shrink-0 overflow-hidden"
      style={{
        width: 46, height: 30, borderRadius: 7, background: ACCOUNT_CARD_BG[type],
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.25), 0 4px 10px -4px rgba(0,0,0,0.8)',
      }}
    >
      <span
        className="absolute"
        style={{ right: 5, top: 6, width: 9, height: 7, borderRadius: 2, background: type === 'savings' ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.55)' }}
      />
    </div>
  )
}

function ProgressBar({ pct, color, height = 4 }: { pct: number; color: string; height?: number }) {
  return (
    <div className="overflow-hidden rounded-full bg-white/[0.07]" style={{ height }}>
      <div className="h-full rounded-full" style={{ width: `${Math.max(0, Math.min(100, pct))}%`, background: color, transition: 'width 300ms ease' }} />
    </div>
  )
}

function ActionTile({ label, icon, highlight, onClick }: { label: string; icon: ReactNode; highlight?: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="qb-press flex flex-col items-center gap-1.5 rounded-2xl px-1 py-2.5 text-[10.5px] font-semibold"
      style={
        highlight
          ? { background: 'var(--color-accent)', color: 'var(--color-on-accent)' }
          : { background: 'var(--color-surface-elevated)', border: '1px solid var(--color-border)', color: 'var(--color-text-2)' }
      }
    >
      <span style={{ color: highlight ? 'var(--color-on-accent)' : 'var(--color-text)' }}>{icon}</span>
      {label}
    </button>
  )
}

/** تفاصيل الحساب: إجراءات سريعة + هدف/مستوى تعبئة + آخر الحركات — مشتركة بين عرض القائمة وعرض البطاقات. */
/** رصيد الحساب عبر الفترة: سبارك بالاتجاه، والسحب يعرض رصيد أي يوم. */
function AccountBalanceSpark({ account, items, hidden }: { account: Account; items: ActivityItem[]; hidden: boolean }) {
  const [days, setDays] = useState(30)
  const values = useMemo(() => accountsBalanceValues(items, [account.id], account.balance, days, new Date()), [items, account.id, account.balance, days])
  const axisRef = useRef<HTMLDivElement>(null)
  const { scrub, handlers } = useSparkScrub(values.length, axisRef)
  const shown = scrub === null ? account.balance : values[scrub]
  return (
    <div className="mb-3">
      <div className="flex items-end justify-between gap-2">
        <div>
          <div className="text-[11px] text-[var(--color-text-3)]">{scrub === null ? 'رصيد الحساب' : `الرصيد في ${sparkDayLabel(scrub, values.length)}`}</div>
          <div className="num mt-0.5 text-[22px] font-bold">
            {hidden ? '•••••' : formatMoney(shown)}
          </div>
        </div>
        <ChangePill values={scrub === null ? values : values.slice(0, scrub + 1)} hidden={hidden} />
      </div>
      <div ref={axisRef} data-own-gesture className="relative -ml-3.5 -mr-1 mt-1 h-[92px] select-none" style={{ touchAction: 'pan-y' }} {...handlers}>
        <SparkLines series={[{ color: trendColor(values), values }]} scrub={scrub} fit />
      </div>
      <div className="mt-1.5">
        <PeriodChips days={days} onChange={setDays} />
      </div>
    </div>
  )
}

function AccountDetail({ account, hidden, items }: { account: Account; hidden: boolean; items: ActivityItem[] }) {
  const { accountActivity, setAccountShowOnHome, transactions } = useData()
  const navigate = useNavigate()
  const activity = accountActivity(account.id, 3)
  const isPrepaid = PREPAID.includes(account.type)
  const onHome = account.showOnHome !== false
  const color = ACCOUNT_ICON_COLOR[account.type]
  const mask = (s: string) => (hidden ? '•••' : s)

  let extra: ReactNode = null
  if (account.goalAmount) {
    const p = (account.balance / account.goalAmount) * 100
    extra = (
      <div className="mb-3 rounded-2xl bg-[var(--color-surface-elevated)] px-3 py-2.5">
        <div className="mb-2 flex items-center justify-between gap-2 text-[11px] font-semibold text-[var(--color-text-2)]">
          <span className="truncate">{account.goalLabel ? `هدف: ${account.goalLabel}` : 'الهدف'}</span>
          <span className="num flex-shrink-0">{mask(`${Math.round(p)}%`)} من {hidden ? '•••••' : formatMoney(account.goalAmount)}</span>
        </div>
        <ProgressBar pct={p} color={color} height={6} />
      </div>
    )
  } else if (account.type === 'fuel') {
    const lastTopUp = lastFuelTopUp(account.id, transactions)
    const level = fuelLevel(account.balance, lastTopUp)
    extra = (
      <div className="mb-3 rounded-2xl bg-[var(--color-surface-elevated)] px-3 py-2.5">
        <div className="mb-2 flex items-center justify-between text-[11px] font-semibold text-[var(--color-text-2)]">
          <span>مستوى التعبئة</span>
          <span className="num">{mask(`${Math.round(level * 100)}%`)}</span>
        </div>
        <ProgressBar pct={level * 100} color={fuelLevelColor(level)} height={6} />
        <div className="mt-1.5 flex items-center justify-between text-[10px] font-bold text-[var(--color-text-3)]">
          <span>E</span>
          <span className="font-semibold">{lastTopUp && !hidden ? `آخر شحن: ${formatMoney(lastTopUp)}` : ''}</span>
          <span>F</span>
        </div>
      </div>
    )
  }

  return (
    <div>
      <AccountBalanceSpark account={account} items={items} hidden={hidden} />
      {extra}
      <div className="mb-3 grid grid-cols-4 gap-1.5">
        <ActionTile
          label={isPrepaid ? 'شحن' : 'إيداع'}
          icon={<PlusIcon />}
          highlight={isPrepaid}
          onClick={() => navigate(isPrepaid ? `/add/transaction?type=transfer&to=${account.id}` : `/add/transaction?type=income&from=${account.id}`)}
        />
        <ActionTile label="تحويل" icon={<TransferIcon />} onClick={() => navigate(`/add/transaction?type=transfer&from=${account.id}`)} />
        <ActionTile
          label={onHome ? 'بالرئيسية' : 'مخفي'}
          icon={<HomeVisibilityIcon active={onHome} />}
          onClick={() => setAccountShowOnHome(account.id, !onHome)}
        />
        <ActionTile label="تعديل" icon={<EditIcon />} onClick={() => navigate(`/accounts/${account.id}/edit`)} />
      </div>

      <div className="mb-1 px-0.5 text-[12px] font-semibold text-[var(--color-text-3)]">آخر الحركات</div>
      {activity.length === 0 ? (
        <div className="py-3 text-center text-[11.5px] font-medium text-[var(--color-text-3)]">لا توجد حركات على هذا الحساب بعد</div>
      ) : (
        <>
          {activity.map((item) => (
            <button
              key={item.id}
              onClick={() => navigate(activityEditPath(item))}
              className="flex w-full items-center gap-2.5 py-2 text-right"
            >
              <div
                className="flex flex-shrink-0 items-center justify-center rounded-full bg-[var(--color-surface-elevated)]"
                style={{ width: 32, height: 32, color: item.color }}
              >
                <ActivityIcon kind={item.kind} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[12.5px] font-semibold">{item.title}</div>
                <div className="text-[10.5px] font-medium text-[var(--color-text-3)]">{formatDate(item.date)}</div>
              </div>
              <div
                dir="ltr"
                className="num flex-shrink-0 text-[12.5px] font-bold"
                style={{ color: item.amount > 0 ? 'var(--color-income)' : 'var(--color-text)' }}
              >
                {hidden ? '•••' : formatSigned(item.amount)}
              </div>
            </button>
          ))}
          <button
            onClick={() => navigate('/transactions')}
            className="block w-full pt-2 text-center text-[11.5px] font-semibold text-[var(--color-text-2)]"
          >
            عرض كل الحركات ←
          </button>
        </>
      )}
    </div>
  )
}

function AccountRow({
  account,
  hidden,
  items,
  open,
  onToggle,
}: {
  account: Account
  hidden: boolean
  items: ActivityItem[]
  open: boolean
  onToggle: () => void
}) {
  const goalPct = account.goalAmount ? (account.balance / account.goalAmount) * 100 : null
  // رصيد آخر 30 يومًا — سبارك خافت خلف الصف (لا يُرسم لو الرصيد ما تغيّر).
  const values = useMemo(() => accountsBalanceValues(items, [account.id], account.balance, 30, new Date()), [items, account.id, account.balance])
  const moved = values.some((v) => v !== values[0])
  return (
    <div className="border-t border-[var(--color-border)] first:border-t-0">
      <button onClick={onToggle} aria-expanded={open} className="relative flex w-full items-center gap-3 overflow-hidden px-3.5 py-3 text-right">
        {moved && !open && (
          <span className="pointer-events-none absolute inset-y-1.5 left-0 right-0">
            <SparkLines series={[{ color: trendColor(values), values }]} fit fade dots={false} opacity={0.55} />
          </span>
        )}
        <CardThumb type={account.type} />
        <div className="relative min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-[14px] font-semibold">{account.name}</span>
            {account.showOnHome === false && (
              <span title="مخفي من الرئيسية" className="flex-shrink-0 rounded-full bg-[var(--color-text-3)]" style={{ width: 6, height: 6 }} />
            )}
          </div>
          <div className="mt-0.5 truncate text-[11px] text-[var(--color-text-3)]">
            {account.goalLabel ? `هدف: ${account.goalLabel}` : ACCOUNT_TYPE_LABELS[account.type]}
          </div>
          {goalPct !== null && (
            <div className="mt-1.5">
              <ProgressBar pct={goalPct} color={ACCOUNT_ICON_COLOR[account.type]} />
            </div>
          )}
        </div>
        <div className="relative flex-shrink-0 text-left">
          <div dir="ltr" className="num text-[15px] font-bold">{hidden ? '•••••' : formatMoney(account.balance)}</div>
          <div className="num mt-0.5 text-[10.5px]">
            <RowChange values={values} hidden={hidden} />
          </div>
        </div>
        <ChevronIcon open={open} />
      </button>
      <div
        className="grid"
        style={{ gridTemplateRows: open ? '1fr' : '0fr', transition: 'grid-template-rows 300ms cubic-bezier(0.22,1,0.36,1)' }}
      >
        <div className="overflow-hidden">
          {open && (
            <div className="px-3.5 pb-3.5 pt-0.5">
              <AccountDetail account={account} hidden={hidden} items={items} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function ListView({ accounts, hidden, items }: { accounts: Account[]; hidden: boolean; items: ActivityItem[] }) {
  const [openId, setOpenId] = useState<string | null>(null)
  const grouped = new Set(GROUPS.flatMap((g) => g.types))
  const groups = [
    ...GROUPS.map((g) => ({ title: g.title, list: accounts.filter((a) => g.types.includes(a.type)) })),
    { title: 'أخرى', list: accounts.filter((a) => !grouped.has(a.type)) },
  ].filter((g) => g.list.length > 0)

  return (
    <div className="qb-rise">
      {groups.map((g) => {
        const sum = g.list.reduce((s, a) => s + a.balance, 0)
        return (
          <div key={g.title} className="mb-4">
            <div className="flex items-center justify-between px-1.5 pb-2 text-[11.5px] font-semibold text-[var(--color-text-3)]">
              <span>{g.title}</span>
              <span className="num">{hidden ? '•••••' : formatMoney(sum)}</span>
            </div>
            <div className="qb-card overflow-hidden" style={{ borderRadius: 24 }}>
              {g.list.map((a) => (
                <AccountRow
                  key={a.id}
                  account={a}
                  hidden={hidden}
                  items={items}
                  open={openId === a.id}
                  onToggle={() => setOpenId((cur) => (cur === a.id ? null : a.id))}
                />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function CardsView({ accounts, hidden, items }: { accounts: Account[]; hidden: boolean; items: ActivityItem[] }) {
  const [active, setActive] = useState(0)
  const scrollerRef = useRef<HTMLDivElement>(null)
  const safeActive = Math.min(active, accounts.length - 1)
  const account = accounts[safeActive]

  // يحدد البطاقة الأقرب لمنتصف الشريط بعد توقف السحب — يعتمد على المواضع الفعلية فيعمل مع اتجاه RTL بدون حسابات scrollLeft.
  useEffect(() => {
    const el = scrollerRef.current
    if (!el) return
    let timer: ReturnType<typeof setTimeout>
    const onScroll = () => {
      clearTimeout(timer)
      timer = setTimeout(() => {
        const box = el.getBoundingClientRect()
        const mid = box.left + box.width / 2
        let best = 0
        let bestDist = Infinity
        Array.from(el.children).forEach((child, i) => {
          const r = child.getBoundingClientRect()
          const d = Math.abs(r.left + r.width / 2 - mid)
          if (d < bestDist) {
            bestDist = d
            best = i
          }
        })
        setActive(best)
      }, 90)
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      clearTimeout(timer)
      el.removeEventListener('scroll', onScroll)
    }
  }, [])

  function scrollTo(i: number) {
    const child = scrollerRef.current?.children[i] as HTMLElement | undefined
    child?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
    setActive(i)
  }

  return (
    <div className="qb-rise">
      <div
        ref={scrollerRef}
        data-own-gesture
        className="-mx-5 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-2 pt-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {accounts.map((a, i) => (
          <div
            key={a.id}
            className="flex-shrink-0 snap-center"
            style={{
              width: '86%',
              height: 196,
              transform: i === safeActive ? 'none' : 'scale(0.94)',
              opacity: i === safeActive ? 1 : 0.55,
              transition: 'transform 300ms cubic-bezier(0.22,1,0.36,1), opacity 300ms ease',
            }}
          >
            <BankCardFace account={a} hidden={hidden} className="h-full" compact onClick={() => scrollTo(i)} />
          </div>
        ))}
      </div>
      {accounts.length > 1 && (
        <div className="mb-3.5 mt-2 flex items-center justify-center gap-1.5">
          {accounts.map((a, i) => (
            <button
              key={a.id}
              onClick={() => scrollTo(i)}
              aria-label={a.name}
              className="rounded-full transition-all"
              style={{ width: i === safeActive ? 16 : 5, height: 5, background: i === safeActive ? 'var(--color-accent)' : 'rgba(255,255,255,0.18)' }}
            />
          ))}
        </div>
      )}
      <div className="qb-card p-3.5" style={{ borderRadius: 24 }}>
        <AccountDetail key={account.id} account={account} hidden={hidden} items={items} />
      </div>
    </div>
  )
}

export function AccountsScreen() {
  const { accounts, totalBalance, recentActivity } = useData()
  const navigate = useNavigate()
  const [hidden, setHidden] = useState(getHideBalancesDefault)
  const [view, setView] = useState<ViewMode>(readViewMode)
  const [days, setDays] = useState(30)
  // كل الحركات مرة واحدة — منها تُحسب أرصدة الأيام السابقة للإجمالي ولكل حساب.
  const items = useMemo(() => recentActivity(1000000), [recentActivity])
  const totalValues = useMemo(
    () => accountsBalanceValues(items, accounts.map((a) => a.id), totalBalance, days, new Date()),
    [items, accounts, totalBalance, days],
  )
  const axisRef = useRef<HTMLDivElement>(null)
  const { scrub, handlers } = useSparkScrub(totalValues.length, axisRef)

  const onHomeCount = accounts.filter((a) => a.showOnHome !== false).length
  // مقام النسب = مجموع الأرصدة الموجبة فقط، حتى لا يشوّه حساب برصيد سالب توزيع الباقي.
  const positiveTotal = accounts.reduce((s, a) => s + Math.max(0, a.balance), 0)
  const allocation = [...accounts].filter((a) => a.balance > 0).sort((a, b) => b.balance - a.balance)

  function changeView(mode: ViewMode) {
    setView(mode)
    saveViewMode(mode)
  }

  return (
    <div dir="rtl" className="px-5 pb-4">
      <TabHeader
        title="حساباتك"
        subtitle={`${accounts.length} حسابات · ${onHomeCount} ظاهرة في الرئيسية`}
        actions={
          <>
            <EyeToggleButton hidden={hidden} onToggle={() => setHidden((h) => !h)} />
            <HeaderIconButton accent label="إضافة حساب" onClick={() => navigate('/accounts/new')}>
              <PlusGlyph />
            </HeaderIconButton>
          </>
        }
      />

      <div className="qb-card-elevated qb-rise mb-5 select-none p-5" data-own-gesture style={{ touchAction: 'pan-y' }} {...handlers}>
        <div className="relative">
          <div className="mb-2 text-[12.5px] font-medium text-[var(--color-text-2)]">
            {scrub === null ? 'إجمالي الأرصدة' : `رصيدك في ${sparkDayLabel(scrub, totalValues.length)}`}
          </div>
          <BigAmount value={scrub === null ? totalBalance : totalValues[scrub]} hidden={hidden} size={36} animate={scrub === null} />
          <div className="mt-2 flex items-center gap-2 text-[11.5px] text-[var(--color-text-3)]">
            <ChangePill values={scrub === null ? totalValues : totalValues.slice(0, scrub + 1)} hidden={hidden} />
            <span>{scrub === null ? SPARK_PERIODS.find((p) => p[0] === days)?.[2] : 'منذ بداية الفترة'}</span>
          </div>
          {/* رصيد كل الحسابات عبر الفترة — يمتد للحافة اليسرى، والسحب الأفقي يختار يومًا. */}
          <div ref={axisRef} className="relative -ml-5 -mr-1 mt-2.5 h-[84px]">
            <SparkLines series={[{ color: trendColor(totalValues), values: totalValues }]} scrub={scrub} fit fade />
          </div>
          <div className="mt-2">
            <PeriodChips days={days} onChange={setDays} />
          </div>

          {allocation.length > 0 && (
            <>
              <div className="mb-2.5 mt-4.5 flex gap-0.5 overflow-hidden rounded-full" style={{ height: 10 }}>
                {allocation.map((a) => (
                  <span
                    key={a.id}
                    title={a.name}
                    className="h-full"
                    style={{ flexGrow: Math.max(a.balance, positiveTotal * 0.012), background: ACCOUNT_ICON_COLOR[a.type], transition: 'flex-grow 500ms ease' }}
                  />
                ))}
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-1.5 text-[11px] text-[var(--color-text-2)]">
                {GROUPS.map((g) => {
                  const sum = accounts.filter((a) => g.types.includes(a.type)).reduce((s, a) => s + Math.max(0, a.balance), 0)
                  if (sum <= 0) return null
                  return (
                    <span key={g.title} className="inline-flex items-center gap-1.5">
                      <i className="inline-block rounded-full" style={{ width: 7, height: 7, background: ACCOUNT_ICON_COLOR[g.types[0]] }} />
                      {g.title}
                      <b className="num text-[var(--color-text)]">{hidden ? '••' : sharePct(sum, positiveTotal)}</b>
                    </span>
                  )
                })}
              </div>
            </>
          )}

          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              onClick={() => navigate('/add/transaction?type=transfer')}
              className="qb-btn-primary flex items-center justify-center gap-2 py-3 text-[13px]"
            >
              <TransferIcon size={16} />
              تحويل
            </button>
            <button
              onClick={() => navigate('/add/transaction?type=income')}
              className="qb-press flex items-center justify-center gap-2 rounded-full py-3 text-[13px] font-semibold"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--color-border-strong)' }}
            >
              <PlusIcon size={16} />
              إيداع
            </button>
          </div>
        </div>
      </div>

      <div className="mb-3 flex items-center justify-between px-1">
        <h2 className="text-[15px] font-semibold">الحسابات</h2>
        <div role="tablist" className="flex rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] p-[3px]">
          {([['list', 'قائمة', <ListGlyph key="l" />], ['cards', 'بطاقات', <CardGlyph key="c" />]] as const).map(([mode, label, glyph]) => (
            <button
              key={mode}
              role="tab"
              aria-selected={view === mode}
              onClick={() => changeView(mode)}
              className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11.5px] font-semibold transition-all"
              style={view === mode ? { background: 'var(--color-surface-high)', color: 'var(--color-text)' } : { color: 'var(--color-text-2)' }}
            >
              {glyph}
              {label}
            </button>
          ))}
        </div>
      </div>

      {accounts.length === 0 ? (
        <button
          onClick={() => navigate('/accounts/new')}
          className="qb-card qb-press flex w-full flex-col items-center justify-center gap-2 p-8 text-center"
          style={{ borderRadius: 24 }}
        >
          <div className="text-[13px] font-semibold">أضف حسابك الأول</div>
          <div className="text-[11.5px] text-[var(--color-text-3)]">كاش، بنكي، ادخار، أو محفظة رقمية</div>
        </button>
      ) : view === 'list' ? (
        <ListView accounts={accounts} hidden={hidden} items={items} />
      ) : (
        <CardsView accounts={accounts} hidden={hidden} items={items} />
      )}
    </div>
  )
}
