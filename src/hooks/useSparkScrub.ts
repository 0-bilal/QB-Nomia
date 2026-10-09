import { useRef, useState, type PointerEvent as ReactPointerEvent, type RefObject } from 'react'
import { haptic } from '../lib/haptics'

/**
 * اختيار نقطة بالسحب الأفقي على بطاقة: يبدأ بعد سحب أفقي واضح (حتى يبقى التمرير العمودي والضغط العادي يعملان)،
 * والماوس يختار بالمرور. `axisRef` هو عنصر الرسم الذي يحدد عرض المحور. يرجع null عند الرفع.
 */
export function useSparkScrub(count: number, axisRef: RefObject<HTMLElement | null>) {
  const [scrub, setScrub] = useState<number | null>(null)
  const drag = useRef({ active: false, x: 0, scrubbing: false })

  function indexAt(clientX: number): number {
    const r = axisRef.current!.getBoundingClientRect()
    const idx = Math.round(((clientX - r.left) / Math.max(1, r.width)) * (count - 1))
    return Math.max(0, Math.min(count - 1, idx))
  }
  function pick(idx: number) {
    setScrub((prev) => {
      if (idx !== prev) haptic('select')
      return idx
    })
  }
  function end() {
    drag.current.active = false
    drag.current.scrubbing = false
    setScrub(null)
  }
  const handlers = {
    onPointerDown(e: ReactPointerEvent) {
      drag.current = { active: true, x: e.clientX, scrubbing: false }
    },
    onPointerMove(e: ReactPointerEvent) {
      if (count < 2 || !axisRef.current) return
      if (e.pointerType === 'mouse' && !drag.current.active) return pick(indexAt(e.clientX))
      const d = drag.current
      if (!d.active) return
      if (!d.scrubbing) {
        if (Math.abs(e.clientX - d.x) < 6) return
        d.scrubbing = true
        e.currentTarget.setPointerCapture?.(e.pointerId)
      }
      pick(indexAt(e.clientX))
    },
    onPointerUp: end,
    onPointerCancel: end,
    onPointerLeave: end,
  }
  return { scrub, handlers }
}
