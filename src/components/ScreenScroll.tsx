import { useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'
import { useNavigate, useNavigationType } from 'react-router-dom'
import { haptic } from '../lib/haptics'

const EDGE_ZONE = 20
const BACK_COMMIT = 90

/**
 * كل شاشة مستقلة (خارج AppShell) لازم تستخدم هذا الغلاف: header/footer
 * ثابتان، والمحتوى بينهما هو الوحيد اللي يتمرر. body مقفول بالكامل
 * (index.css) فأي شاشة ما تستخدم هذا النمط بيصير محتواها الزائد مقصوص
 * بدل ما يتمرر — هذا هو اللي يخلي التطبيق يحس "تطبيق" مو "موقع ويب".
 *
 * يضيف أيضًا: هالة الهوية (aurora) أعلى الشاشة، أنيميشن دخول باتجاه التنقل
 * (للأمام/للخلف)، وإيماءة "اسحب من الحافة اليمنى للرجوع" (اتجاه RTL).
 */
export function ScreenScroll({
  header,
  footer,
  children,
  contentClassName = 'px-5 pb-4',
}: {
  header?: ReactNode
  footer?: ReactNode
  children: ReactNode
  contentClassName?: string
}) {
  const navigate = useNavigate()
  const navType = useNavigationType()
  const [dragX, setDragX] = useState(0)
  const edge = useRef({ active: false, x: 0, armed: false, captured: false })

  function onPointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    if (rect.right - e.clientX > EDGE_ZONE) return
    edge.current = { active: true, x: e.clientX, armed: false, captured: false }
  }
  function onPointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    if (!edge.current.active) return
    const dx = Math.min(0, e.clientX - edge.current.x)
    // الالتقاط بعد بدء سحب فعلي فقط — الالتقاط عند اللمس مباشرة كان يبلع نقرات أي زر قريب من الحافة.
    if (!edge.current.captured) {
      if (dx > -10) return
      edge.current.captured = true
      e.currentTarget.setPointerCapture?.(e.pointerId)
    }
    const armed = -dx >= BACK_COMMIT
    if (armed !== edge.current.armed) {
      edge.current.armed = armed
      if (armed) haptic('tick')
    }
    setDragX(dx)
  }
  function onPointerUp() {
    if (!edge.current.active) return
    edge.current.active = false
    const commit = -dragX >= BACK_COMMIT
    setDragX(0)
    if (commit) navigate(-1)
  }

  const progress = Math.min(1, -dragX / BACK_COMMIT)

  return (
    <div
      dir="rtl"
      className="relative isolate flex h-full flex-col overflow-hidden bg-[var(--color-bg)]"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <div className="qb-aurora" aria-hidden="true" />

      {dragX !== 0 && (
        <div
          className="pointer-events-none absolute top-1/2 z-30 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full"
          style={{
            right: 10 + progress * 18,
            background: progress >= 1 ? 'var(--color-accent)' : 'var(--color-surface-high)',
            color: progress >= 1 ? 'var(--color-on-accent)' : 'var(--color-text)',
            opacity: progress,
            transform: `translateY(-50%) scale(${0.6 + progress * 0.4})`,
          }}
          aria-hidden="true"
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9,5 16,12 9,19" />
          </svg>
        </div>
      )}

      <div
        className="qb-screen-enter relative z-10 flex min-h-0 flex-1 flex-col"
        data-dir={navType === 'POP' ? 'back' : 'forward'}
      >
        <div
          className="flex min-h-0 flex-1 flex-col"
          style={{
            transform: dragX ? `translateX(${dragX * 0.5}px)` : undefined,
            transition: dragX ? 'none' : 'transform 300ms var(--ease-out-expo)',
          }}
        >
          {header}
          <div className={`flex-1 overflow-y-auto overflow-x-hidden ${contentClassName}`}>{children}</div>
          {footer}
        </div>
      </div>
    </div>
  )
}
