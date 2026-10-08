import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { BottomNav } from '../components/BottomNav'
import { TAB_ROUTES, TAB_LABELS } from '../lib/tabs'
import { useData } from '../state/DataContext'
import { notifyNewCriticalItems } from '../lib/deviceNotify'
import { haptic } from '../lib/haptics'

const SWIPE_COMMIT = 72
const INTENT_SLOP = 12

function tabIndexOf(pathname: string): number {
  return TAB_ROUTES.indexOf(pathname === '' ? '/' : pathname)
}

/** أي عنصر يحتاج السحب الأفقي لنفسه (صفوف قابلة للسحب، قوائم أفقية، حقول، رزمة البطاقات) يُستثنى من سحب التبويبات. */
function isGestureOwner(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false
  return Boolean(target.closest('[data-own-gesture], input, textarea, select, .overflow-x-auto'))
}

export function AppShell() {
  const { notifications } = useData()
  const location = useLocation()
  const navigate = useNavigate()
  const currentIndex = tabIndexOf(location.pathname)

  const prevIndexRef = useRef(currentIndex)
  const [enterDir, setEnterDir] = useState<'tab-next' | 'tab-prev' | 'none'>('none')
  const [dragX, setDragX] = useState(0)
  const gesture = useRef({ x: 0, y: 0, active: false, horizontal: false, armed: false })

  // يطلق إشعار جهاز حقيقي للتنبيهات الحرجة الجديدة عند فتح التطبيق —
  // فقط لو المستخدم فعّل إذن التنبيهات أصلًا (من داخل مركز التنبيهات).
  useEffect(() => {
    const critical = notifications
      .filter((n) => n.severity === 'critical')
      .map((n) => ({ id: n.deviceNotifyId ?? n.id, title: n.title, message: n.message }))
    notifyNewCriticalItems(critical)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (prevIndexRef.current !== currentIndex) {
    const dir = currentIndex > prevIndexRef.current ? 'tab-next' : 'tab-prev'
    prevIndexRef.current = currentIndex
    if (dir !== enterDir) setEnterDir(dir)
  }

  function onPointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    if (isGestureOwner(e.target)) return
    gesture.current = { x: e.clientX, y: e.clientY, active: true, horizontal: false, armed: false }
  }

  function onPointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    const g = gesture.current
    if (!g.active) return
    const dx = e.clientX - g.x
    const dy = e.clientY - g.y
    if (!g.horizontal) {
      if (Math.abs(dx) < INTENT_SLOP && Math.abs(dy) < INTENT_SLOP) return
      if (Math.abs(dy) > Math.abs(dx) * 0.8) {
        g.active = false
        return
      }
      g.horizontal = true
    }
    // RTL: السحب لليسار (dx سالب) يروح للتبويب التالي، ولليمين للسابق.
    const target = currentIndex + (dx < 0 ? 1 : -1)
    const resist = target < 0 || target >= TAB_ROUTES.length ? 0.15 : 0.45
    const armed = Math.abs(dx) >= SWIPE_COMMIT && resist > 0.2
    if (armed !== g.armed) {
      g.armed = armed
      if (armed) haptic('tick')
    }
    setDragX(dx * resist)
  }

  function onPointerUp(e: ReactPointerEvent<HTMLDivElement>) {
    const g = gesture.current
    if (!g.active) return
    g.active = false
    setDragX(0)
    if (!g.horizontal) return
    const dx = e.clientX - g.x
    if (Math.abs(dx) < SWIPE_COMMIT) return
    const target = currentIndex + (dx < 0 ? 1 : -1)
    if (target >= 0 && target < TAB_ROUTES.length) navigate(TAB_ROUTES[target])
  }

  const peekTarget = dragX === 0 ? -1 : currentIndex + (dragX < 0 ? 1 : -1)
  const peekLabel = peekTarget >= 0 && peekTarget < TAB_ROUTES.length ? TAB_LABELS[peekTarget] : null

  return (
    <div className="relative isolate flex h-full w-full flex-col overflow-hidden bg-[var(--color-bg)]">
      <div className="qb-aurora" aria-hidden="true" />

      {peekLabel && (
        <div
          className="pointer-events-none absolute top-1/2 z-20 -translate-y-1/2 rounded-full px-3.5 py-1.5 text-[12px] font-semibold"
          style={{
            [dragX < 0 ? 'left' : 'right']: 12,
            background: Math.abs(dragX) >= SWIPE_COMMIT * 0.45 ? 'var(--color-accent)' : 'var(--color-surface-high)',
            color: Math.abs(dragX) >= SWIPE_COMMIT * 0.45 ? 'var(--color-on-accent)' : 'var(--color-text-2)',
            opacity: Math.min(1, Math.abs(dragX) / 24),
            transition: 'background 160ms ease, color 160ms ease',
          }}
        >
          {dragX < 0 ? '‹ ' : ''}
          {peekLabel}
          {dragX > 0 ? ' ›' : ''}
        </div>
      )}

      <div
        className="relative flex-1 overflow-y-auto overflow-x-hidden"
        style={{ touchAction: 'pan-y' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {/* السحب على الغلاف الخارجي، وأنيميشن الدخول على الداخلي — fill-mode للأنيميشن كان يلغي transform السحب لو اجتمعا بنفس العنصر. */}
        <div
          className="min-h-full"
          style={{
            transform: dragX ? `translateX(${dragX}px)` : undefined,
            opacity: dragX ? 1 - Math.min(0.35, Math.abs(dragX) / 300) : undefined,
            transition: dragX ? 'none' : 'transform 320ms var(--ease-out-expo), opacity 320ms ease',
          }}
        >
          <div key={location.pathname} className="qb-screen-enter min-h-full" data-dir={enterDir}>
            <Outlet />
          </div>
        </div>
      </div>
      <BottomNav />
    </div>
  )
}
