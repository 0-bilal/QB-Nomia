import { useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { haptic } from '../lib/haptics'
import { TAB_LABELS } from '../lib/tabs'
import { useData } from '../state/DataContext'
import { formatAmount } from '../lib/format'


function HomeIcon({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 10.5 12 4l8 6.5V19a1.5 1.5 0 0 1-1.5 1.5H15v-5.5H9v5.5H5.5A1.5 1.5 0 0 1 4 19v-8.5Z" fillOpacity={active ? 0.18 : 0} />
    </svg>
  )
}

function WalletIcon({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="6" width="18" height="13" rx="3.5" fill={active ? 'currentColor' : 'none'} fillOpacity={0.18} />
      <path d="M3 10.5h18" />
      <circle cx="16.5" cy="14.5" r="1.3" fill="currentColor" stroke="none" />
    </svg>
  )
}

function PeopleIcon({ size = 22, active = false }: { size?: number; active?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="8" r="3" fill={active ? 'currentColor' : 'none'} fillOpacity={0.18} />
      <path d="M3 19c0-3.3 2.7-5 6-5s6 1.7 6 5" />
      <circle cx="17" cy="9" r="2.3" />
      <path d="M15.3 14.2c2.5.4 4.2 1.9 4.2 4.8" />
    </svg>
  )
}

function MoreIcon({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="4" y="4" width="6.5" height="6.5" rx="2" fill={active ? 'currentColor' : 'none'} fillOpacity={0.18} />
      <rect x="13.5" y="4" width="6.5" height="6.5" rx="3.25" />
      <rect x="4" y="13.5" width="6.5" height="6.5" rx="3.25" />
      <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="2" fill={active ? 'currentColor' : 'none'} fillOpacity={0.18} />
    </svg>
  )
}

function ArrowDownIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 7l10 10M17 9v8H9" />
    </svg>
  )
}
function ArrowUpIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 17 7 7M7 15V7h8" />
    </svg>
  )
}
function SwapIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 3l4 4-4 4M20 7H8M8 21l-4-4 4-4M4 17h12" />
    </svg>
  )
}

function PlusIcon({ size = 26 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={size < 20 ? 2.8 : 2.4} strokeLinecap="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}

interface QuickAction {
  key: string
  label: string
  color: string
  icon: ReactNode
  to: string
}

/** أنواع الإضافة بكبسولة زر + (من اليمين لليسار). */
const QUICK_ACTIONS: QuickAction[] = [
  { key: 'expense', label: 'مصروف', color: 'var(--color-expense)', icon: <ArrowDownIcon />, to: '/add/transaction?type=expense' },
  { key: 'income', label: 'دخل', color: 'var(--color-income)', icon: <ArrowUpIcon />, to: '/add/transaction?type=income' },
  { key: 'transfer', label: 'تحويل', color: 'var(--color-transfer)', icon: <SwapIcon />, to: '/add/transaction?type=transfer' },
  { key: 'loan', label: 'سلفة', color: 'var(--color-owed-to)', icon: <PeopleIcon size={20} />, to: '/loans' },
]

function RepeatGlyph() {
  return (
    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 12a8 8 0 0 1 14-5.3M20 4v4h-4" />
      <path d="M20 12a8 8 0 0 1-14 5.3M4 20v-4h4" />
    </svg>
  )
}

const DRAG_SLOP = 8
const SNAP_RADIUS = 52

function NavItem({ to, label, icon }: { to: string; label: string; icon: (active: boolean) => ReactNode }) {
  return (
    <NavLink to={to} className="flex flex-1 items-center justify-center" end={to === '/'} onClick={() => haptic('tick')}>
      {({ isActive }) => (
        <div
          className="qb-press flex h-11 items-center justify-center gap-1.5 rounded-full"
          style={{
            padding: isActive ? '0 14px 0 12px' : '0 10px',
            background: isActive ? 'var(--color-accent-soft)' : 'transparent',
            color: isActive ? 'var(--color-accent)' : 'var(--color-text-3)',
            transition: 'padding 320ms var(--ease-spring), background 240ms ease, color 240ms ease',
          }}
        >
          {icon(isActive)}
          <span
            className="overflow-hidden whitespace-nowrap text-[12px] font-semibold"
            style={{
              maxWidth: isActive ? 64 : 0,
              opacity: isActive ? 1 : 0,
              transition: 'max-width 320ms var(--ease-spring), opacity 200ms ease',
            }}
          >
            {label}
          </span>
        </div>
      )}
    </NavLink>
  )
}

export function BottomNav() {
  const navigate = useNavigate()
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [hot, setHot] = useState<string | null>(null)
  const [openedForPath, setOpenedForPath] = useState(location.pathname)
  const fabRef = useRef<HTMLButtonElement>(null)
  const actionRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const { recentActivity, transactions } = useData()
  // refs لا state للتتبّع أثناء الإيماءة: أحداث المؤشر السريعة تصل قبل إعادة الرسم فكانت تقرأ قيمًا قديمة.
  const drag = useRef({ x: 0, y: 0, moved: false, cx: 0, cy: 0, active: false, hot: null as string | null })

  if (location.pathname !== openedForPath) {
    setOpenedForPath(location.pathname)
    if (open) setOpen(false)
  }

  // "كرّر": آخر مصروفين بأسماء مختلفة — نفس المبلغ والحساب والفئة بضغطة.
  const repeats = useMemo(() => {
    if (!open) return []
    const seen = new Set<string>()
    const out: { id: string; title: string; amount: number; to: string }[] = []
    for (const item of recentActivity(30)) {
      if (item.kind !== 'expense' || seen.has(item.title)) continue
      const txn = transactions.find((x) => x.id === item.id)
      if (!txn) continue
      seen.add(item.title)
      const params = new URLSearchParams({ type: 'expense', amount: String(txn.amount), from: txn.accountId })
      if (txn.categoryId) params.set('category', txn.categoryId)
      out.push({ id: txn.id, title: item.title, amount: txn.amount, to: `/add/transaction?${params.toString()}` })
      if (out.length === 2) break
    }
    return out
  }, [open, recentActivity, transactions])

  function goTo(action: QuickAction) {
    haptic('success')
    setOpen(false)
    setHot(null)
    navigate(action.to)
  }

  function nearest(x: number, y: number): QuickAction | null {
    let best: QuickAction | null = null
    let bestDist = SNAP_RADIUS
    for (const a of QUICK_ACTIONS) {
      const r = actionRefs.current[a.key]?.getBoundingClientRect()
      if (!r) continue
      const d = Math.hypot(x - (r.left + r.width / 2), y - (r.top + r.height / 2))
      if (d < bestDist) {
        bestDist = d
        best = a
      }
    }
    return best
  }

  function onFabDown(e: ReactPointerEvent<HTMLButtonElement>) {
    const rect = fabRef.current?.getBoundingClientRect()
    if (!rect) return
    e.currentTarget.setPointerCapture?.(e.pointerId)
    drag.current = { x: e.clientX, y: e.clientY, moved: false, cx: rect.left + rect.width / 2, cy: rect.top + rect.height / 2, active: true, hot: null }
    setDragging(true)
  }

  function onFabMove(e: ReactPointerEvent<HTMLButtonElement>) {
    const d = drag.current
    if (!d.active) return
    if (!d.moved && Math.hypot(e.clientX - d.x, e.clientY - d.y) < DRAG_SLOP) return
    if (!d.moved) {
      d.moved = true
      setOpen(true)
      haptic('tick')
    }
    const target = nearest(e.clientX, e.clientY)
    const key = target?.key ?? null
    if (key !== d.hot) {
      d.hot = key
      setHot(key)
      if (key) haptic('select')
    }
  }

  function onFabUp(e: ReactPointerEvent<HTMLButtonElement>) {
    const d = drag.current
    if (!d.active) return
    d.active = false
    setDragging(false)
    if (d.moved) {
      // الموضع النهائي يُحسب مرة أخيرة عند الإفلات — بعض الأجهزة ترسل آخر حركة مع الإفلات نفسه.
      const target = nearest(e.clientX, e.clientY) ?? QUICK_ACTIONS.find((a) => a.key === d.hot)
      if (target) goTo(target)
      else setOpen(false)
      setHot(null)
      return
    }
    haptic('tick')
    setOpen((o) => !o)
  }

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-[6px]"
          style={{ animation: 'fade-in 200ms ease-out both' }}
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      <div className="safe-bottom pointer-events-none relative z-50 px-4 pb-3 pt-1">
        {/* كبسولة الإضافة: الزر يتمدد لكبسولة أفقية فوق الشريط (هوية الكبسولة الذكية) + "كرّر" لآخر مصروفين. */}
        <div
          className="absolute inset-x-0 flex flex-col items-center gap-2 px-4"
          style={{
            bottom: 'calc(100% - 4px)',
            opacity: open ? 1 : 0,
            transform: open ? 'none' : 'translateY(30px) scale(0.4)',
            transformOrigin: '50% 100%',
            transition: 'opacity 220ms ease, transform 450ms var(--ease-spring)',
          }}
          aria-hidden={!open}
        >
          <div className="text-[12px] font-medium text-[var(--color-text-3)]">{dragging ? 'أفلت على النوع' : 'اختر نوع الحركة — أو اسحب من زر +'}</div>
          <div
            role="menu"
            className="flex gap-1 rounded-full border border-[var(--color-border-strong)] p-1.5"
            style={{
              pointerEvents: open ? 'auto' : 'none',
              background: 'rgba(28,28,33,0.94)',
              backdropFilter: 'blur(20px) saturate(1.6)',
              WebkitBackdropFilter: 'blur(20px) saturate(1.6)',
              boxShadow: '0 20px 40px -12px rgba(0,0,0,0.9)',
            }}
          >
            {QUICK_ACTIONS.map((action) => {
              const isHot = hot === action.key
              return (
                <button
                  key={action.key}
                  ref={(el) => {
                    actionRefs.current[action.key] = el
                  }}
                  role="menuitem"
                  tabIndex={open ? 0 : -1}
                  onClick={() => goTo(action)}
                  className="qb-press flex w-16 flex-col items-center gap-1 rounded-[26px] pb-[7px] pt-2"
                  style={{ background: isHot ? 'rgba(255,255,255,0.1)' : 'transparent', transition: 'background 160ms ease' }}
                >
                  <span
                    className="flex h-9 w-9 items-center justify-center rounded-full"
                    style={{
                      background: isHot ? action.color : `color-mix(in srgb, ${action.color} 18%, transparent)`,
                      color: isHot ? '#0a0a0c' : action.color,
                      transform: `scale(${isHot ? 1.12 : 1})`,
                      transition: 'background 160ms ease, color 160ms ease, transform 220ms var(--ease-spring)',
                    }}
                  >
                    {action.icon}
                  </span>
                  <span className="text-[11px] font-semibold">{action.label}</span>
                </button>
              )
            })}
          </div>
          {repeats.length > 0 && (
            <div className="flex max-w-full gap-1.5" style={{ pointerEvents: open ? 'auto' : 'none' }}>
              {repeats.map((r) => (
                <button
                  key={r.id}
                  tabIndex={open ? 0 : -1}
                  onClick={() => {
                    haptic('success')
                    setOpen(false)
                    navigate(r.to)
                  }}
                  className="qb-press flex min-w-0 items-center gap-1.5 rounded-full border border-[var(--color-border-strong)] py-[7px] pe-3 ps-2.5 text-[11.5px] font-semibold"
                  style={{ background: 'rgba(28,28,33,0.94)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}
                >
                  <span className="flex-shrink-0 text-[var(--color-text-3)]">
                    <RepeatGlyph />
                  </span>
                  <span className="truncate">كرّر: {r.title}</span>
                  <b className="num flex-shrink-0">{formatAmount(r.amount)}</b>
                </button>
              ))}
            </div>
          )}
        </div>

        <div
          className="pointer-events-auto relative mx-auto flex h-[66px] max-w-[420px] items-center rounded-full border border-[var(--color-border-strong)] px-2 shadow-[0_24px_50px_-16px_rgba(0,0,0,0.95)]"
          style={{ background: 'rgba(18,18,22,0.82)', backdropFilter: 'blur(24px) saturate(1.6)', WebkitBackdropFilter: 'blur(24px) saturate(1.6)' }}
        >
          <NavItem to="/" label={TAB_LABELS[0]} icon={(a) => <HomeIcon active={a} />} />
          <NavItem to="/accounts" label={TAB_LABELS[1]} icon={(a) => <WalletIcon active={a} />} />

          {/* زر + غائر داخل الشريط: تجويف داكن كأنه محفور في الكبسولة وفي وسطه زر أبيض صغير — ضغطة تفتح كبسولة الأنواع، وسحب منه يختار مباشرة. */}
          <button
            ref={fabRef}
            onPointerDown={onFabDown}
            onPointerMove={onFabMove}
            onPointerUp={onFabUp}
            onPointerCancel={onFabUp}
            className="mx-1 flex h-[52px] w-[52px] flex-shrink-0 items-center justify-center rounded-full"
            style={{
              background: 'radial-gradient(circle at 50% 30%, #2a2a31, #121216)',
              boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.8), inset 0 -1px 0 rgba(255,255,255,0.08), 0 0 0 1px rgba(255,255,255,0.08)',
              touchAction: 'none',
            }}
            aria-expanded={open}
            aria-label={open ? 'إغلاق' : 'إضافة حركة — اسحب للأعلى للاختيار'}
          >
            <span
              className="flex h-[30px] w-[30px] items-center justify-center rounded-full"
              style={{
                background: 'linear-gradient(150deg, var(--color-accent-a), var(--color-accent) 50%, var(--color-accent-b))',
                color: 'var(--color-on-accent)',
                boxShadow: '0 4px 12px -4px rgba(255,255,255,0.5), inset 0 1px 0 rgba(255,255,255,0.6)',
                transform: `rotate(${open ? 45 : 0}deg) scale(${dragging ? 0.86 : 1})`,
                transition: 'transform 320ms var(--ease-spring)',
              }}
            >
              <PlusIcon size={17} />
            </span>
          </button>

          <NavItem to="/loans" label={TAB_LABELS[2]} icon={(a) => <PeopleIcon active={a} />} />
          <NavItem to="/more" label={TAB_LABELS[3]} icon={(a) => <MoreIcon active={a} />} />
        </div>
      </div>
    </>
  )
}
