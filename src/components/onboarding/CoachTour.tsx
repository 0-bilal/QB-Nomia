import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLocation, useNavigate } from 'react-router-dom'
import { haptic } from '../../lib/haptics'
import { setTourPending, useTourPending } from '../../lib/onboarding'
import { placeCard, sameRect, spotRect, type Rect } from './tourLayout'
import { TOUR_PAGES, TOUR_STEPS } from './tourSteps'

const find = (id: string) => document.querySelector<HTMLElement>(`[data-tour="${id}"]`)
/** أقصى انتظار لظهور عنصر بعد الانتقال لصفحة — بعده تُتخطى الخطوة (مثل بطاقة «جهّز محفظتك» لو مخفية). */
const FIND_TIMEOUT = 1800
/** كم إطار متتالي لازم يثبت فيه العنصر (انتهى التمرير، ولحقته الإضاءة) قبل ما تظهر البطاقة. */
const SETTLE_FRAMES = 14

/**
 * جولة التعريف: تبدأ بالرئيسية ثم تنقل المستخدم بنفسها للحسابات، ثم السلف
 * والديون، ثم المزيد، وتضيء أهم أجزاء كل صفحة. تعيش داخل AppShell حتى تبقى
 * أثناء التنقل بين التبويبات. مرة وحدة بعد الإعداد الأول، أو من «حول التطبيق».
 *
 * الإظهار والإخفاء:
 * - الإضاءة عنصر واحد يبقى مركّبًا طول الجولة وينزلق من عنصر لعنصر (بدون وميض تعتيم).
 * - البطاقة تختفي بسرعة عند التنقل، وتظهر بمحتوى الخطوة الجديدة بعد ما يثبت
 *   العنصر في مكانه، بجهة فيها مساحة كافية حتى ما تغطيه.
 * - مكان العنصر يُتابَع كل إطار، فالإضاءة تلحقه أثناء التمرير أو تغيّر التخطيط.
 * - الضغط على التعتيم ما يتخطى شيء — الأزرار فقط، و Esc ينهي الجولة.
 */
export function CoachTour() {
  const pending = useTourPending()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [i, setI] = useState(-1)
  const [rect, setRect] = useState<Rect | null>(null)
  /** الخطوة المعروضة في البطاقة — تتبدّل بعد ما يثبت العنصر الجديد، مو لحظة الضغط. */
  const [shown, setShown] = useState(-1)
  const [cardH, setCardH] = useState(0)
  const card = useRef<HTMLDivElement>(null)
  const dir = useRef(1)

  // البداية: من الرئيسية دائمًا، بعد ما تهدأ حركات دخولها.
  useEffect(() => {
    if (!pending) return
    const t = window.setTimeout(() => setI(0), 700)
    return () => clearTimeout(t)
  }, [pending])

  const step = i >= 0 ? TOUR_STEPS[i] : undefined

  const end = useCallback(
    (goHome: boolean) => {
      setTourPending(false)
      setI(-1)
      setShown(-1)
      setRect(null)
      if (goHome) navigate('/')
    },
    [navigate],
  )

  const go = useCallback(
    (to: number) => {
      if (to >= TOUR_STEPS.length) return end(true)
      if (to < 0 || to === i) return
      dir.current = to > i ? 1 : -1
      setI(to)
    },
    [i, end],
  )

  // كل خطوة: انتقل لصفحتها لو لزم، انتظر عنصرها، مرّره للوسط، وتابِع مكانه كل إطار.
  useEffect(() => {
    if (!step) return
    if (pathname !== step.route) {
      navigate(step.route)
      return
    }
    let alive = true
    let raf = 0
    let timer = 0
    let still = 0
    let last: Rect | null = null
    const started = performance.now()

    const track = () => {
      if (!alive) return
      const el = find(step.target)
      if (el) {
        const r = spotRect(el.getBoundingClientRect(), step.pad ?? 8, window.innerWidth, window.innerHeight)
        if (last && sameRect(last, r)) still++
        else {
          still = 0
          setRect(r)
        }
        last = r
        if (still === SETTLE_FRAMES) setShown(i)
      }
      raf = requestAnimationFrame(track)
    }

    const wait = () => {
      if (!alive) return
      const el = find(step.target)
      if (el) {
        el.scrollIntoView({ block: 'center', behavior: 'smooth' })
        raf = requestAnimationFrame(track)
      } else if (performance.now() - started < FIND_TIMEOUT) {
        timer = window.setTimeout(wait, 100)
      } else {
        // العنصر غير موجود (مثلًا البطاقة مخفية) — نكمل بنفس اتجاه التنقل.
        const next = i + dir.current
        if (next < 0) setI(0)
        else if (next >= TOUR_STEPS.length) end(true)
        else setI(next)
      }
    }
    timer = window.setTimeout(wait, 80)
    return () => {
      alive = false
      clearTimeout(timer)
      cancelAnimationFrame(raf)
    }
  }, [step, pathname, navigate, i, end])

  // ارتفاع البطاقة الفعلي للخطوة المعروضة — قبل ما نحدد مكانها.
  useLayoutEffect(() => {
    if (card.current) setCardH(card.current.offsetHeight)
  }, [shown])

  useEffect(() => {
    if (!pending || i < 0) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') end(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [pending, i, end])

  if (!pending || !step) return null

  const viewIndex = shown >= 0 ? shown : i
  const view = TOUR_STEPS[viewIndex]
  const next = TOUR_STEPS[viewIndex + 1]
  const leavesPage = next && next.route !== view.route
  const page = TOUR_PAGES.findIndex((p) => p.route === view.route)
  const pageSteps = TOUR_STEPS.filter((s) => s.route === view.route)
  const inPage = pageSteps.indexOf(view)
  const nextLabel = !next ? 'خلصنا' : leavesPage ? `إلى ${TOUR_PAGES.find((p) => p.route === next.route)!.name}` : 'التالي'

  const vw = window.innerWidth
  const vh = window.innerHeight
  // قبل أول قياس: الإضاءة نقطة في المنتصف (التعتيم كامل)، وتتمدد للعنصر بانزلاق.
  const spot = rect ?? { top: vh / 2, left: vw / 2, width: 0, height: 0 }
  // البطاقة تظهر فقط لما الخطوة المعروضة = الحالية (يعني عنصرها ثبت في مكانه).
  const visible = shown === i && cardH > 0 && rect !== null
  const top = rect ? placeCard(rect, cardH || 180, vh) : vh / 2

  function onNext() {
    haptic('tick')
    go(i + 1)
  }

  return createPortal(
    <div dir="rtl" className="fixed inset-0 z-[90]" aria-modal="true">
      <div className="qb-ob-spot" data-empty={rect ? undefined : ''} style={{ ...spot, borderRadius: TOUR_STEPS[i].round ? 999 : 24 }} />
      <div
        ref={card}
        role="dialog"
        aria-label={view.title}
        aria-hidden={!visible}
        className="fixed inset-x-[18px] z-[91] mx-auto max-w-[440px] rounded-[22px] border border-[var(--color-border-strong)] p-3.5"
        style={{
          top,
          opacity: visible ? 1 : 0,
          transform: visible ? 'none' : 'translateY(6px) scale(.97)',
          pointerEvents: visible ? 'auto' : 'none',
          background: 'rgba(28,28,33,.94)',
          backdropFilter: 'blur(20px) saturate(1.6)',
          WebkitBackdropFilter: 'blur(20px) saturate(1.6)',
          boxShadow: '0 20px 40px -12px #000',
          // الظهور نابض، والاختفاء سريع؛ المكان يتغيّر بس والبطاقة مخفية.
          transition: visible ? 'opacity 220ms ease, transform 420ms var(--ease-spring)' : 'opacity 120ms ease, transform 120ms ease',
        }}
      >
        {/* الصفحات الأربع: الحالية بيضاء، والمنتهية بخلفية خفيفة */}
        <div className="mb-2.5 flex gap-1">
          {TOUR_PAGES.map((p, j) => (
            <span
              key={p.route}
              className="flex h-6 flex-1 items-center justify-center rounded-full text-[10.5px] font-semibold"
              style={
                j === page
                  ? { background: 'var(--color-accent)', color: 'var(--color-on-accent)' }
                  : { background: j < page ? 'rgba(255,255,255,.1)' : 'transparent', color: j < page ? 'var(--color-text-2)' : 'var(--color-text-3)', border: '1px solid var(--color-border)' }
              }
            >
              {p.name}
            </span>
          ))}
        </div>
        <b className="block text-[15px]">{view.title}</b>
        <p className="mt-1 text-[12px] leading-[1.75] text-[var(--color-text-2)]">{view.body}</p>
        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center gap-1">
            {pageSteps.map((s, j) => (
              <i key={s.target} className="h-[5px] rounded-full" style={{ width: j === inPage ? 14 : 5, background: j === inPage ? 'var(--color-accent)' : 'var(--color-surface-high)', transition: 'width 300ms var(--ease-spring)' }} />
            ))}
          </div>
          <div className="flex items-center">
            {viewIndex > 0 && (
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
