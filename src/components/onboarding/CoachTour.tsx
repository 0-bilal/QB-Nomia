import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLocation, useNavigate } from 'react-router-dom'
import { haptic } from '../../lib/haptics'
import { setTourPending, useTourPending } from '../../lib/onboarding'
import { TOUR_PAGES, TOUR_STEPS, type TourStep } from './tourSteps'

interface Rect {
  top: number
  left: number
  width: number
  height: number
}

const find = (id: string) => document.querySelector<HTMLElement>(`[data-tour="${id}"]`)
/** أقصى انتظار لظهور عنصر بعد الانتقال لصفحة — بعده تُتخطى الخطوة (مثل بطاقة «جهّز محفظتك» لو مخفية). */
const FIND_TIMEOUT = 1800

/**
 * جولة التعريف: تبدأ بالرئيسية ثم تنقل المستخدم بنفسها للحسابات، ثم السلف
 * والديون، ثم المزيد، وتضيء أهم أجزاء كل صفحة. تعيش داخل AppShell حتى تبقى
 * أثناء التنقل بين التبويبات. مرة وحدة بعد الإعداد الأول، أو من «حول التطبيق».
 */
export function CoachTour() {
  const pending = useTourPending()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [i, setI] = useState(-1)
  const [rect, setRect] = useState<Rect | null>(null)
  const [cardH, setCardH] = useState(180)
  const card = useRef<HTMLDivElement>(null)
  const dir = useRef(1)

  // البداية: من الرئيسية دائمًا، بعد ما تهدأ حركات دخولها.
  useEffect(() => {
    if (!pending) return
    const t = window.setTimeout(() => setI(0), 700)
    return () => clearTimeout(t)
  }, [pending])

  const step: TourStep | undefined = i >= 0 ? TOUR_STEPS[i] : undefined

  const end = useCallback(
    (goHome: boolean) => {
      setTourPending(false)
      setRect(null)
      setI(-1)
      if (goHome) navigate('/')
    },
    [navigate],
  )

  const go = useCallback(
    (to: number) => {
      if (to >= TOUR_STEPS.length) return end(true)
      if (to < 0) return
      dir.current = to > i ? 1 : -1
      setRect(null)
      setI(to)
    },
    [i, end],
  )

  // كل خطوة: انتقل لصفحتها لو لزم، انتظر عنصرها، مرّره للوسط، ثم قِسه.
  useEffect(() => {
    if (!step) return
    if (pathname !== step.route) {
      navigate(step.route)
      return
    }
    let alive = true
    const started = performance.now()
    let timer = 0
    const measure = () => {
      const el = find(step.target)
      if (!el || !alive) return
      const r = el.getBoundingClientRect()
      const pad = step.pad ?? 8
      setRect({ top: r.top - pad, left: r.left - pad, width: r.width + pad * 2, height: r.height + pad * 2 })
    }
    const wait = () => {
      if (!alive) return
      const el = find(step.target)
      if (el) {
        el.scrollIntoView({ block: 'center', behavior: 'smooth' })
        timer = window.setTimeout(measure, 420)
      } else if (performance.now() - started < FIND_TIMEOUT) {
        timer = window.setTimeout(wait, 100)
      } else {
        // العنصر غير موجود (مثلًا البطاقة مخفية) — نكمل بنفس اتجاه التنقل.
        setRect(null)
        const next = i + dir.current
        if (next < 0) setI(0)
        else if (next >= TOUR_STEPS.length) end(true)
        else setI(next)
      }
    }
    timer = window.setTimeout(wait, 120)
    window.addEventListener('resize', measure)
    return () => {
      alive = false
      clearTimeout(timer)
      window.removeEventListener('resize', measure)
    }
  }, [step, pathname, navigate, i, end])

  useLayoutEffect(() => {
    if (card.current) setCardH(card.current.offsetHeight)
  }, [i, rect])

  if (!pending || !step) return null

  const next = TOUR_STEPS[i + 1]
  const leavesPage = next && next.route !== step.route
  const page = TOUR_PAGES.find((p) => p.route === step.route)!
  const pageSteps = TOUR_STEPS.filter((s) => s.route === step.route)
  const inPage = pageSteps.indexOf(step)
  const nextLabel = !next ? 'خلصنا' : leavesPage ? `إلى ${TOUR_PAGES.find((p) => p.route === next.route)!.name}` : 'التالي'

  function onNext() {
    haptic('tick')
    go(i + 1)
  }

  const vh = window.innerHeight
  const below = rect ? rect.top + rect.height / 2 < vh / 2 : true
  const cardTop = !rect ? vh / 2 - cardH / 2 : below ? Math.min(rect.top + rect.height + 14, vh - cardH - 16) : Math.max(16, rect.top - 14 - cardH)

  return createPortal(
    <div dir="rtl" className="fixed inset-0 z-[90]" onClick={onNext}>
      {rect ? (
        <div className="qb-ob-spot" style={{ ...rect, borderRadius: step.round ? 999 : 24 }} />
      ) : (
        // أثناء الانتقال بين الصفحات: تعتيم بدون إضاءة لين يظهر العنصر.
        <div className="fixed inset-0" style={{ background: 'rgba(5,5,6,.78)', animation: 'fade-in 200ms ease-out both' }} />
      )}
      <div
        ref={card}
        role="dialog"
        aria-label={step.title}
        onClick={(e) => e.stopPropagation()}
        className="fixed inset-x-[18px] z-[91] mx-auto max-w-[440px] rounded-[22px] border border-[var(--color-border-strong)] p-3.5"
        style={{
          top: cardTop,
          opacity: rect ? 1 : 0,
          background: 'rgba(28,28,33,.94)',
          backdropFilter: 'blur(20px) saturate(1.6)',
          WebkitBackdropFilter: 'blur(20px) saturate(1.6)',
          boxShadow: '0 20px 40px -12px #000',
          transition: 'top 600ms var(--ease-out-expo), opacity 220ms ease',
        }}
      >
        {/* الصفحات الأربع: الحالية بيضاء، والمنتهية بخط ممتلئ */}
        <div className="mb-2.5 flex gap-1">
          {TOUR_PAGES.map((p, j) => {
            const cur = TOUR_PAGES.indexOf(page)
            return (
              <span
                key={p.route}
                className="flex h-6 flex-1 items-center justify-center rounded-full text-[10.5px] font-semibold"
                style={
                  j === cur
                    ? { background: 'var(--color-accent)', color: 'var(--color-on-accent)' }
                    : { background: j < cur ? 'rgba(255,255,255,.1)' : 'transparent', color: j < cur ? 'var(--color-text-2)' : 'var(--color-text-3)', border: '1px solid var(--color-border)' }
                }
              >
                {p.name}
              </span>
            )
          })}
        </div>
        <b key={`t${i}`} className="qb-rise block text-[15px]">
          {step.title}
        </b>
        <p key={`p${i}`} className="qb-rise mt-1 text-[12px] leading-[1.75] text-[var(--color-text-2)]">
          {step.body}
        </p>
        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center gap-1">
            {pageSteps.map((s, j) => (
              <i key={s.target} className="h-[5px] rounded-full" style={{ width: j === inPage ? 14 : 5, background: j === inPage ? 'var(--color-accent)' : 'var(--color-surface-high)', transition: 'width 300ms var(--ease-spring)' }} />
            ))}
          </div>
          <div className="flex items-center">
            {i > 0 && (
              <button onClick={() => go(i - 1)} className="px-2 text-[12px] font-semibold text-[var(--color-text-3)]">
                السابق
              </button>
            )}
            {next && (
              <button onClick={() => end(false)} className="px-2 text-[12px] font-semibold text-[var(--color-text-3)]">
                تخطي
              </button>
            )}
            <button onClick={onNext} className="qb-press h-9 rounded-full px-4 text-[12.5px] font-bold" style={{ background: 'var(--color-accent)', color: 'var(--color-on-accent)' }}>
              {nextLabel}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
