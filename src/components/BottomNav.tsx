import { useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { haptic } from '../lib/haptics'
import { TAB_LABELS } from '../lib/tabs'


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

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
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
  /** موضع الهدف بالنسبة لمركز زر الإضافة (px) — قوس فوق الزر. */
  dx: number
  dy: number
}

/** أهداف إيماءة "اسحب من زر +" مرتّبة بقوس من اليمين لليسار (اتجاه القراءة). */
const QUICK_ACTIONS: QuickAction[] = [
  { key: 'expense', label: 'مصروف', color: 'var(--color-expense)', icon: <ArrowDownIcon />, to: '/add/transaction?type=expense', dx: 122, dy: -92 },
  { key: 'income', label: 'دخل', color: 'var(--color-income)', icon: <ArrowUpIcon />, to: '/add/transaction?type=income', dx: 46, dy: -150 },
  { key: 'transfer', label: 'تحويل', color: 'var(--color-transfer)', icon: <SwapIcon />, to: '/add/transaction?type=transfer', dx: -46, dy: -150 },
  { key: 'loan', label: 'سلفة', color: 'var(--color-owed-to)', icon: <PeopleIcon size={20} />, to: '/loans', dx: -122, dy: -92 },
]

const DRAG_SLOP = 8
const SNAP_RADIUS = 58

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
  // refs لا state للتتبّع أثناء الإيماءة: أحداث المؤشر السريعة تصل قبل إعادة الرسم فكانت تقرأ قيمًا قديمة.
  const drag = useRef({ x: 0, y: 0, moved: false, cx: 0, cy: 0, active: false, hot: null as string | null })

  if (location.pathname !== openedForPath) {
    setOpenedForPath(location.pathname)
    if (open) setOpen(false)
  }

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
      const d = Math.hypot(x - (drag.current.cx + a.dx), y - (drag.current.cy + a.dy))
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
        >
          <div className="absolute inset-x-0 bottom-[290px] text-center text-[12px] font-medium text-[var(--color-text-3)]">
            {dragging ? 'أفلت على الاختصار' : 'اختر نوع الحركة — أو اسحب من زر + مباشرة'}
          </div>
        </div>
      )}

      <div className="safe-bottom pointer-events-none relative z-50 px-4 pb-3 pt-1">
        <div
          className="pointer-events-auto relative mx-auto flex h-[66px] max-w-[420px] items-center rounded-full border border-[var(--color-border-strong)] px-2 shadow-[0_24px_50px_-16px_rgba(0,0,0,0.95)]"
          style={{ background: 'rgba(18,18,22,0.78)', backdropFilter: 'blur(24px) saturate(1.6)', WebkitBackdropFilter: 'blur(24px) saturate(1.6)' }}
        >
          <NavItem to="/" label={TAB_LABELS[0]} icon={(a) => <HomeIcon active={a} />} />
          <NavItem to="/accounts" label={TAB_LABELS[1]} icon={(a) => <WalletIcon active={a} />} />

          <div className="relative flex h-14 w-14 flex-shrink-0 items-center justify-center">
            {open &&
              QUICK_ACTIONS.map((action, i) => {
                const isHot = hot === action.key
                return (
                  <button
                    key={action.key}
                    onClick={() => goTo(action)}
                    className="absolute"
                    style={{ left: `calc(50% + ${action.dx}px)`, top: `calc(50% + ${action.dy}px)`, transform: 'translate(-50%, -50%)' }}
                    aria-label={action.label}
                  >
                    {/* الطبقات منفصلة عمدًا: أنيميشن الظهور (qb-pop) يكتب transform فكان يلغي إزاحة الموضع لو اجتمعا بنفس العنصر. */}
                    <span className="flex flex-col items-center gap-1.5" style={{ animation: `qb-pop 380ms var(--ease-spring) ${i * 45}ms both` }}>
                      <span
                        className="flex h-[54px] w-[54px] items-center justify-center rounded-full border"
                        style={{
                          background: isHot ? action.color : 'var(--color-surface-elevated)',
                          borderColor: isHot ? 'transparent' : `color-mix(in srgb, ${action.color} 40%, transparent)`,
                          color: isHot ? '#0a0a0c' : action.color,
                          boxShadow: isHot ? `0 0 0 8px color-mix(in srgb, ${action.color} 18%, transparent)` : '0 12px 26px -10px rgba(0,0,0,0.8)',
                          transform: `scale(${isHot ? 1.14 : 1})`,
                          transition: 'background 160ms ease, color 160ms ease, box-shadow 200ms ease, transform 220ms var(--ease-spring)',
                        }}
                      >
                        {action.icon}
                      </span>
                      <span className="whitespace-nowrap text-[11.5px] font-semibold" style={{ color: isHot ? action.color : 'var(--color-text)' }}>
                        {action.label}
                      </span>
                    </span>
                  </button>
                )
              })}

            {!open && (
              <span
                className="pointer-events-none absolute -top-[22px] text-[var(--color-accent)]"
                style={{ animation: 'qb-hint-up 2.8s ease-in-out infinite' }}
                aria-hidden="true"
              >
                <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6,15 12,9 18,15" />
                </svg>
              </span>
            )}

            <button
              ref={fabRef}
              onPointerDown={onFabDown}
              onPointerMove={onFabMove}
              onPointerUp={onFabUp}
              onPointerCancel={onFabUp}
              className="-mt-7 flex h-[60px] w-[60px] flex-shrink-0 items-center justify-center rounded-full"
              style={{
                background: 'linear-gradient(150deg, var(--color-accent-a), var(--color-accent) 50%, var(--color-accent-b))',
                color: 'var(--color-on-accent)',
                boxShadow: '0 0 0 5px var(--color-bg), 0 16px 34px -8px rgba(255,255,255,0.3), inset 0 1px 0 rgba(255,255,255,0.6)',
                transform: `rotate(${open ? 45 : 0}deg) scale(${dragging ? 0.92 : 1})`,
                transition: 'transform 320ms var(--ease-spring)',
                touchAction: 'none',
              }}
              aria-expanded={open}
              aria-label={open ? 'إغلاق' : 'إضافة حركة — اسحب للأعلى للاختصارات'}
            >
              <PlusIcon />
            </button>
          </div>

          <NavItem to="/loans" label={TAB_LABELS[2]} icon={(a) => <PeopleIcon active={a} />} />
          <NavItem to="/more" label={TAB_LABELS[3]} icon={(a) => <MoreIcon active={a} />} />
        </div>
      </div>
    </>
  )
}
