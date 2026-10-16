import { useNavigate } from 'react-router-dom'
import { ScreenHeader } from '../../components/ScreenHeader'
import { ScreenScroll } from '../../components/ScreenScroll'
import { CheckIcon, ObIcon, ObLink, ObPrimary, ProgressRing } from '../../components/onboarding/ObUi'
import { useSetupProgress } from '../../hooks/useSetupProgress'
import { haptic } from '../../lib/haptics'
import { rise } from '../../lib/motion'
import { setChecklistHidden } from '../../lib/onboarding'
import { STEP_META } from './setupStepMeta'

const soft = (c: string, p = 15) => `color-mix(in srgb, ${c} ${p}%, transparent)`

/** «جهّز محفظتك» — بعد «عرّفنا بنفسك»، ومن بطاقة الرئيسية لين تكتمل الخطوات. */
export function GettingStartedScreen() {
  const navigate = useNavigate()
  const progress = useSetupProgress()
  const { steps, doneCount, total, complete, next } = progress
  const goHome = () => navigate('/', { replace: true })

  function open(to: string) {
    haptic('tick')
    navigate(to)
  }

  return (
    <ScreenScroll
      header={<ScreenHeader title="جهّز محفظتك" onBack={goHome} />}
      footer={
        <div className="safe-bottom px-5 pb-3 pt-2">
          {complete ? <ObPrimary onClick={goHome}>إلى الرئيسية</ObPrimary> : <ObPrimary onClick={() => next && open(STEP_META[next.id].to)}>أكمل الخطوة التالية</ObPrimary>}
          {!complete && <ObLink onClick={goHome}>أكمّل لاحقًا</ObLink>}
        </div>
      }
    >
      <p className="-mt-2 text-[12.5px] leading-[1.8] text-[var(--color-text-3)]">
        خطوات بسيطة وتشتغل الحسابات صح من أول يوم. كل خطوة تتعلّم لحالها لما تخلّصها، وتقدر تكمّلها لاحقًا من بطاقة في الرئيسية.
      </p>

      <div className="qb-card-elevated qb-rise relative my-4 flex items-center gap-4 p-4" style={rise(0)}>
        <ProgressRing done={doneCount} total={total} />
        <div className="min-w-0">
          <div className="text-[15px] font-semibold">{complete ? 'محفظتك جاهزة' : doneCount === 0 ? 'لنبدأ بالحسابات' : `الخطوة الجاية: ${STEP_META[next!.id].title}`}</div>
          <div className="mt-1 text-[11.5px] leading-[1.7] text-[var(--color-text-3)]">{complete ? 'كل شيء مضبوط. الأرقام اللي تشوفها الحين دقيقة.' : STEP_META[next!.id].desc}</div>
        </div>
      </div>

      {steps.map((s, i) => {
        const m = STEP_META[s.id]
        const isNext = next?.id === s.id
        return (
          <button
            key={s.id}
            onClick={() => open(m.to)}
            className="qb-press qb-rise mb-2 flex w-full items-center gap-3 rounded-[20px] border p-3 text-right"
            style={{
              ...rise(i + 1),
              background: isNext ? 'var(--color-surface-elevated)' : 'var(--color-surface)',
              borderColor: isNext ? 'var(--color-accent-line)' : 'var(--color-border)',
            }}
          >
            <span
              className="grid h-[42px] w-[42px] flex-none place-items-center rounded-[14px]"
              style={s.done ? { background: soft('var(--color-income)'), color: 'var(--color-income)' } : { background: soft(m.color), color: m.color }}
            >
              <ObIcon size={20}>{m.icon}</ObIcon>
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1.5 text-[13.5px] font-semibold" style={{ color: s.done ? 'var(--color-text-2)' : undefined }}>
                {m.title}
                {m.tag && !s.done && (
                  <span className="rounded-full px-[7px] py-[2px] text-[10px] font-semibold" style={{ background: soft(m.tag[1], 14), color: m.tag[1] }}>
                    {m.tag[0]}
                  </span>
                )}
              </span>
              <span className="mt-[3px] block text-[11px] leading-[1.6] text-[var(--color-text-3)]">{m.desc}</span>
            </span>
            <span
              className="grid h-6 w-6 flex-none place-items-center rounded-full border-[1.5px]"
              style={
                s.done
                  ? { background: 'var(--color-income)', borderColor: 'var(--color-income)', color: 'var(--color-on-accent)' }
                  : { borderColor: 'var(--color-text-3)' }
              }
            >
              {s.done && <CheckIcon />}
            </span>
          </button>
        )
      })}

      {!complete && (
        <ObLink
          className="mt-1"
          onClick={() => {
            setChecklistHidden(true)
            goHome()
          }}
        >
          إخفاء البطاقة من الرئيسية
        </ObLink>
      )}
    </ScreenScroll>
  )
}
