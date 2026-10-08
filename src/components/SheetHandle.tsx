import { useRef, type PointerEvent as ReactPointerEvent } from 'react'
import { haptic } from '../lib/haptics'

const DISMISS_DISTANCE = 110
const DISMISS_VELOCITY = 0.6

/**
 * مقبض أعلى أي Sheet سفلي: اسحبه للأسفل لإغلاق الـ Sheet. يحرّك العنصر الأب (لوحة
 * الـ Sheet نفسها) عبر خاصية CSS `translate` المستقلة عن `transform` — فما يتعارض
 * مع أنيميشن الدخول (sheet-in) اللي يكتب transform، ويركَّب بأي Sheet بدون إعادة هيكلته.
 */
export function SheetHandle({ onDismiss }: { onDismiss: () => void }) {
  const drag = useRef({ y: 0, t: 0, active: false, dy: 0 })

  function panel(e: ReactPointerEvent<HTMLDivElement>): HTMLElement | null {
    return e.currentTarget.parentElement
  }

  function onPointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    e.currentTarget.setPointerCapture?.(e.pointerId)
    drag.current = { y: e.clientY, t: performance.now(), active: true, dy: 0 }
    const p = panel(e)
    if (p) p.style.transition = 'none'
  }

  function onPointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    if (!drag.current.active) return
    const dy = e.clientY - drag.current.y
    drag.current.dy = dy
    const p = panel(e)
    if (p) p.style.translate = `0 ${dy > 0 ? dy : dy / 6}px`
  }

  function onPointerUp(e: ReactPointerEvent<HTMLDivElement>) {
    const d = drag.current
    if (!d.active) return
    d.active = false
    const p = panel(e)
    const velocity = d.dy / Math.max(1, performance.now() - d.t)
    if (d.dy > DISMISS_DISTANCE || velocity > DISMISS_VELOCITY) {
      haptic('tick')
      if (p) {
        p.style.transition = 'translate 220ms ease-in'
        p.style.translate = '0 100%'
      }
      setTimeout(onDismiss, 200)
      return
    }
    if (p) {
      p.style.transition = 'translate 320ms var(--ease-spring)'
      p.style.translate = '0 0'
    }
  }

  return (
    <div
      className="flex h-7 w-full flex-shrink-0 cursor-grab items-center justify-center"
      style={{ touchAction: 'none' }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      aria-hidden="true"
    >
      <div className="h-[5px] w-10 rounded-full bg-white/20" />
    </div>
  )
}
