import { useCallback, useEffect, useRef, useState, type ComponentType } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../../state/AuthContext'
import { AppLogoMark } from '../../components/AppLogo'
import { ObLink, ObPrimary } from '../../components/onboarding/ObUi'
import { haptic } from '../../lib/haptics'
import { markIntroSeen } from '../../lib/onboarding'
import { BalanceScene, InsightScene, PeopleScene, PrivacyScene, RecordScene } from './IntroScenes'

interface Story {
  kicker: string
  title: [string, string]
  body: string
  Scene: ComponentType
}

const STORIES: Story[] = [
  { kicker: 'مرحبًا', title: ['محفظتك كلها', 'بمكان واحد'], body: 'حساباتك، مصاريفك، سلفك والتزاماتك. كل ريال تعرف وين هو، بدون جداول ولا حسابات بالراس.', Scene: BalanceScene },
  { kicker: 'بثانية', title: ['سجّل مصروفك', 'قبل ما تنساه'], body: 'المبلغ، الفئة، حفظ. التطبيق يحدّث الرصيد والميزانية والتقارير لحاله.', Scene: RecordScene },
  { kicker: 'افهم شهرك', title: ['اعرف وين', 'راحت فلوسك'], body: 'تدفّق الشهر، أكثر الفئات صرفًا، والمسموح لك يوميًا عشان توصل للراتب الجاي.', Scene: InsightScene },
  { kicker: 'بدون إحراج', title: ['السلف والديون', 'بدون نسيان'], body: 'لك وعليك، سلفة الراتب، ودَين البقالة. مع تذكير قبل موعد السداد.', Scene: PeopleScene },
  { kicker: 'خصوصيتك', title: ['بياناتك عندك،', 'ونسختها مشفّرة'], body: 'ما فيه حسابات ولا سيرفرات لنا. النسخة الاحتياطية تتشفّر بجوالك وتنحفظ في جدول بحسابك أنت.', Scene: PrivacyScene },
]

const DURATION = 6000
const LAST = STORIES.length - 1

/**
 * قصص الترحيب — أول شاشة لمستخدم جديد (قبل إنشاء الرقم السري). تتقدّم
 * تلقائيًا، والضغط يسار للتالي ويمين للسابق، والضغط المطوّل يوقفها.
 */
export function IntroScreen() {
  const { hasPin } = useAuth()
  if (hasPin) return <Navigate to="/" replace />
  return <IntroScreenInner />
}

function IntroScreenInner() {
  const navigate = useNavigate()
  const [index, setIndex] = useState(0)
  const bars = useRef<(HTMLElement | null)[]>([])
  const elapsed = useRef(0)
  const paused = useRef(false)
  const holdTimer = useRef(0)

  const goTo = useCallback((i: number) => {
    elapsed.current = 0
    setIndex(Math.max(0, Math.min(LAST, i)))
  }, [])

  useEffect(() => {
    let raf = 0
    let last = performance.now()
    const tick = (now: number) => {
      if (!paused.current) elapsed.current += now - last
      last = now
      const p = Math.min(1, elapsed.current / DURATION)
      bars.current.forEach((b, j) => {
        if (b) b.style.transform = `scaleX(${j < index ? 1 : j === index ? p : 0})`
      })
      if (p >= 1 && index < LAST) {
        goTo(index + 1)
        return
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [index, goTo])

  function start(to: string) {
    markIntroSeen()
    haptic('tick')
    navigate(to, { replace: to === '/setup' })
  }

  const story = STORIES[index]
  const { Scene } = story
  const isLast = index === LAST

  return (
    <div dir="rtl" className="relative isolate flex h-full w-full flex-col overflow-hidden bg-[var(--color-bg)]">
      <div className="qb-aurora" aria-hidden="true" />

      <div className="safe-top relative z-20 px-5">
        <div className="flex gap-[5px] pt-3">
          {STORIES.map((s, i) => (
            <span key={s.kicker} className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/[0.14]">
              <i
                ref={(el) => {
                  bars.current[i] = el
                }}
                className="block h-full w-full origin-right bg-[var(--color-accent)]"
                style={{ transform: 'scaleX(0)' }}
              />
            </span>
          ))}
        </div>
        <div className="flex h-12 items-center justify-between">
          <div className="flex items-center gap-2 text-[14px] font-bold">
            <AppLogoMark size={26} />
            QB-Nomia
          </div>
          {!isLast && (
            <button onClick={() => goTo(LAST)} className="qb-glass-circle qb-press h-8 rounded-full border px-3 text-[12px] font-semibold">
              تخطي
            </button>
          )}
        </div>
      </div>

      <div
        className="relative z-10 flex min-h-0 flex-1 items-center justify-center"
        onPointerDown={() => {
          holdTimer.current = window.setTimeout(() => (paused.current = true), 220)
        }}
        onPointerUp={() => {
          clearTimeout(holdTimer.current)
          setTimeout(() => (paused.current = false))
        }}
        onPointerLeave={() => {
          clearTimeout(holdTimer.current)
          paused.current = false
        }}
      >
        <div className="qb-ob-speed pointer-events-none absolute right-0 top-1/3 flex flex-col gap-3.5" aria-hidden="true">
          {[60, 90, 50, 80].map((w, i) => (
            <i key={i} style={{ width: w, animationDelay: `${i * 0.4}s` }} />
          ))}
        </div>
        <div key={index} className="qb-rise">
          <Scene />
        </div>
        <button className="absolute inset-y-0 left-0 w-1/2" aria-label="التالي" onClick={() => !paused.current && goTo(index + 1)} />
        <button className="absolute inset-y-0 right-0 w-1/2" aria-label="السابق" onClick={() => !paused.current && goTo(index - 1)} />
      </div>

      <div key={`c${index}`} className="qb-ob-copy relative z-10 min-h-[132px] px-6 pb-2">
        <div className="mb-1.5 text-[11.5px] font-semibold text-[var(--color-text-3)]">
          <span className="num text-[var(--color-text-2)]">
            {index + 1}/{STORIES.length}
          </span>{' '}
          · {story.kicker}
        </div>
        <h1 className="text-[26px] font-bold leading-[1.35]">
          {story.title[0]}
          <br />
          {story.title[1]}
        </h1>
        <p className="mt-1.5 text-[13.5px] leading-[1.8] text-[var(--color-text-2)]">{story.body}</p>
      </div>

      <div className="safe-bottom relative z-10 px-6 pb-6 pt-2">
        {isLast ? (
          <>
            <ObPrimary onClick={() => start('/setup')}>ابدأ من جديد</ObPrimary>
            <ObLink onClick={() => start('/restore')}>عندي نسخة احتياطية، أبي أرجّعها</ObLink>
          </>
        ) : (
          <ObPrimary onClick={() => goTo(index + 1)}>التالي</ObPrimary>
        )}
      </div>
    </div>
  )
}
