import { createContext, useEffect, useRef, useState } from 'react'

/**
 * هل تمرر المستخدم بعد عنصر (العنوان الكبير) لأعلى الشاشة؟ — يُظهر كبسولة العنوان العائمة.
 * IntersectionObserver يعمل مع أي حاوية تمرير (حتى المتداخلة) بدون الاستماع لحدث scroll.
 * `offset` = ارتفاع منطقة الأزرار العائمة أعلى الشاشة.
 */
export function useScrolledPast<T extends Element>(offset = 60) {
  const ref = useRef<T>(null)
  const [past, setPast] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(
      ([entry]) => setPast(!entry.isIntersecting && entry.boundingClientRect.top < offset),
      { rootMargin: `-${offset}px 0px 0px 0px`, threshold: 0 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [offset])
  return [ref, past] as const
}

/**
 * حالة رأس الشاشات الفرعية: ScreenScroll يعرض العنوان الكبير داخل المحتوى ويبلّغ ScreenHeader
 * متى يُظهر الكبسولة. `managed: false` (خارج ScreenScroll) = ScreenHeader يعرض العنوان بجانب زر الرجوع كالسابق.
 */
export const ScreenTitleContext = createContext<{ managed: boolean; scrolled: boolean }>({ managed: false, scrolled: false })
