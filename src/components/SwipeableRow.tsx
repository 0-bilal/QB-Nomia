import { useRef, useState, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'
import { haptic } from '../lib/haptics'

export interface SwipeAction {
  label: string
  icon: ReactNode
  /** خلفية الإجراء المكشوف (لون دلالي كامل). */
  color: string
  /** لون الأيقونة/النص فوق الخلفية. */
  textColor?: string
  onTrigger: () => void
}

interface SwipeableRowProps {
  children: ReactNode
  /** يظهر على يمين الصف عند سحبه لليسار (مثل: حذف). */
  leftSwipe?: SwipeAction
  /** يظهر على يسار الصف عند سحبه لليمين (مثل: تعديل/تكرار). */
  rightSwipe?: SwipeAction
  className?: string
}

const INTENT_SLOP = 10
const TRIGGER_DISTANCE = 96
const MAX_DRAG = 150

/**
 * صف قابل للسحب أفقيًا كاختصار سريع (نمط تطبيقات البنوك 2026): اسحب الحركة لتكشف
 * إجراءً ملوّنًا خلفها، وتجاوز العتبة ينفّذه مباشرة مع اهتزاز تأكيد. السحب العمودي
 * يبقى للتمرير الطبيعي (touch-action: pan-y)، والنقر العادي يمر للمحتوى كما هو.
 */
export function SwipeableRow({ children, leftSwipe, rightSwipe, className = '' }: SwipeableRowProps) {
  const [dx, setDx] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [leaving, setLeaving] = useState<0 | 1 | -1>(0)
  const start = useRef({ x: 0, y: 0, id: -1, horizontal: false, moved: false, armed: false, active: false, dx: 0 })

  function onPointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    start.current = { x: e.clientX, y: e.clientY, id: e.pointerId, horizontal: false, moved: false, armed: false, active: true, dx: 0 }
    setDragging(true)
  }

  function onPointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    const s = start.current
    if (!s.active || s.id !== e.pointerId) return
    const mx = e.clientX - s.x
    const my = e.clientY - s.y
    if (!s.horizontal) {
      if (Math.abs(mx) < INTENT_SLOP && Math.abs(my) < INTENT_SLOP) return
      if (Math.abs(my) > Math.abs(mx)) {
        s.active = false
        setDragging(false)
        return
      }
      s.horizontal = true
      s.moved = true
      e.currentTarget.setPointerCapture?.(e.pointerId)
    }
    let next = mx
    if (next < 0 && !leftSwipe) next = next / 8
    if (next > 0 && !rightSwipe) next = next / 8
    next = Math.max(-MAX_DRAG, Math.min(MAX_DRAG, next))
    const armed = Math.abs(next) >= TRIGGER_DISTANCE
    if (armed !== s.armed) {
      s.armed = armed
      if (armed) haptic('select')
    }
    s.dx = next
    setDx(next)
  }

  function onPointerUp() {
    const s = start.current
    if (!s.active) return
    s.active = false
    setDragging(false)
    const dx = s.dx
    const action = dx <= -TRIGGER_DISTANCE ? leftSwipe : dx >= TRIGGER_DISTANCE ? rightSwipe : undefined
    if (action) {
      const dir = dx < 0 ? -1 : 1
      setLeaving(dir)
      setDx(dir * 420)
      setTimeout(() => {
        action.onTrigger()
        setLeaving(0)
        setDx(0)
      }, 220)
      return
    }
    setDx(0)
  }

  function onClickCapture(e: ReactMouseEvent) {
    if (start.current.moved) {
      e.preventDefault()
      e.stopPropagation()
      start.current.moved = false
    }
  }

  const reveal = Math.min(1, Math.abs(dx) / TRIGGER_DISTANCE)
  const shown = dx < 0 ? leftSwipe : dx > 0 ? rightSwipe : undefined

  return (
    <div data-own-gesture className={`relative overflow-hidden ${className}`}>
      {shown && (
        <div
          className="absolute inset-0 flex items-center px-6"
          style={{
            background: shown.color,
            color: shown.textColor ?? '#fff',
            justifyContent: dx < 0 ? 'flex-start' : 'flex-end',
            opacity: 0.35 + reveal * 0.65,
          }}
          aria-hidden="true"
        >
          <div
            className="flex flex-col items-center gap-1 text-[11px] font-semibold"
            style={{ transform: `scale(${0.7 + reveal * 0.3})`, transition: 'transform 160ms var(--ease-spring)' }}
          >
            {shown.icon}
            {shown.label}
          </div>
        </div>
      )}
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onClickCapture={onClickCapture}
        className="relative bg-[var(--color-surface)]"
        style={{
          transform: dx ? `translateX(${dx}px)` : undefined,
          transition: dragging && !leaving ? 'none' : 'transform 300ms var(--ease-out-expo)',
          touchAction: 'pan-y',
        }}
      >
        {children}
      </div>
    </div>
  )
}

export function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3" />
    </svg>
  )
}

export function PencilIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 20h4L19 9l-4-4L4 16v4Z" />
      <path d="M13.5 6.5l4 4" />
    </svg>
  )
}

export function RepeatIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <rect x="8" y="8" width="12" height="12" rx="3" />
      <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
    </svg>
  )
}
