import { useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react'
import { haptic } from '../lib/haptics'

const DISMISS_DISTANCE = 110
const DISMISS_VELOCITY = 0.6

/**
 * سحب الـ Sheet السفلي للأسفل لإغلاقه — يُركَّب على مقبض/رأس الـ Sheet (handlers)
 * ويُطبَّق style على جسم الـ Sheet نفسه حتى يتبع الإصبع ثم يرتد أو يُغلق.
 */
export function useSwipeDismiss(onDismiss: () => void) {
  const [dragY, setDragY] = useState(0)
  const [dragging, setDragging] = useState(false)
  const startRef = useRef({ y: 0, t: 0, active: false })

  function onPointerDown(e: ReactPointerEvent<HTMLElement>) {
    e.currentTarget.setPointerCapture?.(e.pointerId)
    startRef.current = { y: e.clientY, t: performance.now(), active: true }
    setDragging(true)
  }
  function onPointerMove(e: ReactPointerEvent<HTMLElement>) {
    if (!startRef.current.active) return
    const dy = e.clientY - startRef.current.y
    // مقاومة مطاطية للسحب للأعلى بدل منعه تمامًا.
    setDragY(dy > 0 ? dy : dy / 6)
  }
  function onPointerUp(e: ReactPointerEvent<HTMLElement>) {
    if (!startRef.current.active) return
    startRef.current.active = false
    setDragging(false)
    const dy = e.clientY - startRef.current.y
    const velocity = dy / Math.max(1, performance.now() - startRef.current.t)
    if (dy > DISMISS_DISTANCE || velocity > DISMISS_VELOCITY) {
      haptic('tick')
      onDismiss()
      setDragY(0)
      return
    }
    setDragY(0)
  }

  const handlers = { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp, style: { touchAction: 'none' } as CSSProperties }
  const sheetStyle: CSSProperties = {
    transform: dragY ? `translateY(${dragY}px)` : undefined,
    transition: dragging ? 'none' : 'transform 320ms var(--ease-out-expo)',
  }
  return { handlers, sheetStyle }
}
