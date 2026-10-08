import { useEffect, useState, type CSSProperties, type ReactNode } from 'react'
import { SheetHandle } from './SheetHandle'
import { AppLogoMark } from './AppLogo'
import { APP_VERSION, BUILD_ID, RELEASE_NOTES } from '../lib/version'
import { APK_URL, applyWebUpdate, checkForUpdate, isNativeApp, type RemoteVersion, type UpdateDone, type UpdateStep } from '../lib/appUpdate'

type SheetState =
  | { kind: 'checking' }
  | { kind: 'latest' }
  | { kind: 'available'; remote: RemoteVersion }
  | { kind: 'progress'; target: string; step: UpdateStep }
  | { kind: 'restarting'; target: string }
  | { kind: 'done'; info: UpdateDone }
  | { kind: 'error'; during: 'check' | 'update' }

interface AppUpdateSheetProps {
  open: boolean
  /** يفتح على رسالة "تم التحديث" بدل الفحص — بعد إعادة التشغيل الناتجة عن التحديث. */
  done?: UpdateDone | null
  onClose: () => void
}

function Svg({ size = 30, strokeWidth = 2.2, children }: { size?: number; strokeWidth?: number; children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  )
}
const CheckGlyph = ({ size = 30 }: { size?: number }) => (
  <Svg size={size} strokeWidth={2.5}>
    <path d="M5 12.5 10 17l9-10" />
  </Svg>
)
const ArrowStart = () => (
  <span className="text-[var(--color-text-3)]">
    <Svg size={18}>
      <path d="m15 6-6 6 6 6" />
    </Svg>
  </span>
)

type Tone = 'neutral' | 'good' | 'new' | 'bad'
const TONES: Record<Tone, CSSProperties> = {
  neutral: { background: 'var(--color-surface-high)', color: 'var(--color-text)' },
  good: { background: 'rgba(62,224,143,0.12)', color: 'var(--color-income)' },
  new: { background: 'var(--color-accent)', color: 'var(--color-on-accent)', boxShadow: '0 14px 34px -14px rgba(255,255,255,0.4)' },
  bad: { background: 'rgba(255,95,109,0.12)', color: 'var(--color-expense)' },
}

function HeroIcon({ tone, children }: { tone: Tone; children: ReactNode }) {
  return (
    <div className="mx-auto mb-3.5 mt-1 flex items-center justify-center" style={{ width: 64, height: 64, borderRadius: 22, ...TONES[tone] }}>
      {children}
    </div>
  )
}

function Title({ children, desc }: { children: ReactNode; desc?: ReactNode }) {
  return (
    <>
      <div className="text-center text-[19px] font-bold">{children}</div>
      {desc && <div className="mt-1.5 text-center text-[12.5px] leading-relaxed text-[var(--color-text-2)]">{desc}</div>}
    </>
  )
}

function VersionChip({ label, version, highlight, faded }: { label: string; version: string; highlight?: boolean; faded?: boolean }) {
  return (
    <div
      className="rounded-[14px] border px-3.5 py-1.5 text-center"
      style={
        highlight
          ? { background: 'var(--color-accent)', color: 'var(--color-on-accent)', borderColor: 'transparent' }
          : { background: 'var(--color-surface-elevated)', borderColor: 'var(--color-border)', opacity: faded ? 0.55 : 1 }
      }
    >
      <div className="text-[10px] font-medium" style={{ color: highlight ? 'rgba(10,10,12,0.55)' : 'var(--color-text-3)' }}>
        {label}
      </div>
      <div className="num text-[15px] font-bold" style={{ textDecoration: faded ? 'line-through' : undefined }}>
        {version}
      </div>
    </div>
  )
}

function VersionPair({ from, to, fromLabel, toLabel, fadeFrom }: { from: string; to: string; fromLabel: string; toLabel: string; fadeFrom?: boolean }) {
  return (
    <div className="mb-1 mt-4 flex items-center justify-center gap-2.5">
      <VersionChip label={fromLabel} version={from} faded={fadeFrom} />
      <ArrowStart />
      <VersionChip label={toLabel} version={to} highlight />
    </div>
  )
}

function Notes({ title, version, notes }: { title: string; version: string; notes: string[] }) {
  if (notes.length === 0) return null
  return (
    <div className="mt-4 rounded-[20px] border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-3">
      <div className="mb-1 flex justify-between text-[12px] font-semibold text-[var(--color-text-3)]">
        <span>{title}</span>
        <span className="num">{version}</span>
      </div>
      {notes.map((n) => (
        <div key={n} className="flex gap-2.5 py-1.5 text-[12.5px] leading-relaxed text-[var(--color-text-2)]">
          <span className="mt-2 flex-shrink-0 rounded-full bg-[var(--color-accent)]" style={{ width: 6, height: 6 }} />
          {n}
        </div>
      ))}
    </div>
  )
}

function PrimaryButton({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button onClick={onClick} className="qb-btn-primary mt-4 flex w-full items-center justify-center gap-2 py-3.5 text-[14px]">
      {children}
    </button>
  )
}
function GhostButton({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button onClick={onClick} className="mt-1.5 w-full py-2.5 text-center text-[13px] font-semibold text-[var(--color-text-2)]">
      {children}
    </button>
  )
}

const STEPS = [
  { label: 'تنزيل النسخة الجديدة', sub: 'التأكد من توفر ملفات التطبيق' },
  { label: 'تجهيز النسخة', sub: 'استبدال الملفات المخزّنة' },
  { label: 'إعادة التشغيل', sub: 'ستعود لنفس الشاشة مباشرة' },
]
const STEP_PCT = [30, 70, 100]

/**
 * ورقة "تحديث التطبيق": فحص → (محدّث | يوجد تحديث | خطأ) → تقدّم بخطوات → إعادة تشغيل → "تم التحديث".
 * المستخدم يعرف دائمًا إصداره قبل وبعد، ولا يُطلب منه الرمز بعد إعادة التشغيل الناتجة عن التحديث.
 */
export function AppUpdateSheet({ open, done, onClose }: AppUpdateSheetProps) {
  const [state, setState] = useState<SheetState>(done ? { kind: 'done', info: done } : { kind: 'checking' })
  const native = isNativeApp()
  const locked = state.kind === 'progress' || state.kind === 'restarting'

  async function runCheck() {
    setState({ kind: 'checking' })
    try {
      const [res] = await Promise.all([checkForUpdate(), new Promise((r) => setTimeout(r, 700))])
      setState(res.available ? { kind: 'available', remote: res.remote } : { kind: 'latest' })
    } catch {
      setState({ kind: 'error', during: 'check' })
    }
  }

  async function runUpdate(target: string) {
    if (native) {
      window.open(APK_URL, '_blank')
      return
    }
    setState({ kind: 'progress', target, step: 0 })
    try {
      await applyWebUpdate((step) => {
        if (step === 2) setState({ kind: 'restarting', target })
        else setState({ kind: 'progress', target, step })
      })
    } catch {
      setState({ kind: 'error', during: 'update' })
    }
  }

  // يبدأ الفحص تلقائيًا كل ما انفتحت الورقة على وضع الفحص.
  useEffect(() => {
    if (open && !done) void runCheck()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  if (!open) return null

  if (state.kind === 'restarting') {
    return (
      <div dir="rtl" className="fixed inset-0 z-[80] flex flex-col items-center justify-center gap-4 bg-[var(--color-bg)]" style={{ animation: 'fade-in 200ms ease-out both' }}>
        <AppLogoMark size={68} />
        <div className="text-[13px] font-semibold text-[var(--color-text-2)]">جارٍ تشغيل الإصدار الجديد</div>
        <div className="num text-[12px] text-[var(--color-text-3)]">{state.target}</div>
      </div>
    )
  }

  let body: ReactNode
  switch (state.kind) {
    case 'checking':
      body = (
        <>
          <HeroIcon tone="neutral">
            <span style={{ animation: 'spin 1s linear infinite', display: 'flex' }}>
              <Svg size={28} strokeWidth={2}>
                <path d="M21 12a9 9 0 1 1-9-9" />
              </Svg>
            </span>
          </HeroIcon>
          <Title desc={<>نقارن نسختك الحالية <span className="num">{APP_VERSION}</span> بأحدث نسخة منشورة</>}>جارٍ البحث عن تحديث</Title>
          <div style={{ height: 40 }} />
        </>
      )
      break
    case 'latest':
      body = (
        <>
          <HeroIcon tone="good">
            <CheckGlyph />
          </HeroIcon>
          <Title desc="أنت على أحدث إصدار — لا حاجة لإعادة التشغيل">تطبيقك محدّث</Title>
          <div className="mb-1 mt-4 flex justify-center">
            <VersionChip label="الإصدار الحالي" version={APP_VERSION} />
          </div>
          <Notes title="آخر التغييرات" version={APP_VERSION} notes={RELEASE_NOTES} />
          <PrimaryButton onClick={onClose}>تم</PrimaryButton>
          {!native && <GhostButton onClick={() => runUpdate(APP_VERSION)}>إعادة تحميل التطبيق على أي حال</GhostButton>}
        </>
      )
      break
    case 'available':
      body = (
        <>
          <HeroIcon tone="new">
            <Svg>
              <path d="M12 4v11M8 11l4 4 4-4" />
              <path d="M5 20h14" />
            </Svg>
          </HeroIcon>
          <Title desc={native ? 'التحديث على أندرويد يتم بتنزيل ملف APK الجديد وتثبيته' : undefined}>يتوفر إصدار جديد</Title>
          <VersionPair from={APP_VERSION} to={state.remote.version} fromLabel="الحالي" toLabel="الجديد" />
          <Notes title="ما الجديد" version={state.remote.version} notes={state.remote.notes} />
          <div className="mt-3.5 flex items-center justify-center gap-2 text-[11.5px] text-[var(--color-text-3)]">
            <Svg size={13}>
              <rect x="4" y="10" width="16" height="11" rx="2.5" />
              <path d="M8 10V7a4 4 0 0 1 8 0v3" />
            </Svg>
            بياناتك المالية تبقى كما هي على جهازك
          </div>
          <PrimaryButton onClick={() => runUpdate(state.remote.version)}>{native ? 'تنزيل التحديث (APK)' : 'تحديث الآن'}</PrimaryButton>
          <GhostButton onClick={onClose}>لاحقًا</GhostButton>
        </>
      )
      break
    case 'progress':
      body = (
        <>
          <Title desc="لا تغلق التطبيق — يستغرق بضع ثوانٍ">
            جارٍ التحديث إلى <span className="num">{state.target}</span>
          </Title>
          <div className="mt-4">
            {STEPS.map((s, i) => {
              const status = i < state.step ? 'done' : i === state.step ? 'run' : 'todo'
              return (
                <div key={s.label} className="flex items-center gap-3 px-0.5 py-2.5">
                  <div
                    className="flex flex-shrink-0 items-center justify-center rounded-full border-[1.5px]"
                    style={{
                      width: 26,
                      height: 26,
                      ...(status === 'done'
                        ? { background: 'var(--color-income)', borderColor: 'transparent', color: '#05120b' }
                        : status === 'run'
                          ? { borderColor: 'var(--color-border-strong)', borderTopColor: 'var(--color-accent)', animation: 'spin 800ms linear infinite' }
                          : { borderColor: 'var(--color-border-strong)' }),
                    }}
                  >
                    {status === 'done' && <CheckGlyph size={13} />}
                  </div>
                  <div>
                    <div className="text-[13px] font-semibold" style={{ color: status === 'todo' ? 'var(--color-text-3)' : 'var(--color-text)' }}>
                      {s.label}
                    </div>
                    <div className="text-[11px] text-[var(--color-text-3)]">{s.sub}</div>
                  </div>
                </div>
              )
            })}
          </div>
          <div className="mt-3.5 overflow-hidden rounded-full bg-white/[0.07]" style={{ height: 6 }}>
            <div className="h-full rounded-full bg-[var(--color-accent)]" style={{ width: `${STEP_PCT[state.step]}%`, transition: 'width 600ms cubic-bezier(0.22,1,0.36,1)' }} />
          </div>
          <div className="mt-2 flex justify-between text-[11px] text-[var(--color-text-3)]">
            <span className="num">{STEP_PCT[state.step]}%</span>
            <span dir="ltr" className="num">
              {APP_VERSION} → {state.target}
            </span>
          </div>
        </>
      )
      break
    case 'done': {
      const sameBuild = state.info.fromBuild === BUILD_ID
      body = (
        <>
          <HeroIcon tone="good">
            <CheckGlyph />
          </HeroIcon>
          {sameBuild ? (
            <>
              <Title desc="لا يوجد إصدار أحدث — أنت على نفس الإصدار">تمت إعادة تحميل التطبيق</Title>
              <div className="mb-1 mt-4 flex justify-center">
                <VersionChip label="الإصدار الحالي" version={APP_VERSION} highlight />
              </div>
            </>
          ) : (
            <>
              <Title desc="تعمل الآن على الإصدار الجديد">تم التحديث بنجاح</Title>
              <VersionPair from={state.info.fromVersion} to={APP_VERSION} fromLabel="السابق" toLabel="الحالي" fadeFrom />
              <Notes title="ما الجديد" version={APP_VERSION} notes={RELEASE_NOTES} />
            </>
          )}
          <PrimaryButton onClick={onClose}>متابعة</PrimaryButton>
        </>
      )
      break
    }
    case 'error':
      body = (
        <>
          <HeroIcon tone="bad">
            <Svg>
              <path d="M2 8.8a15 15 0 0 1 20 0M5 12.6a10 10 0 0 1 9.5-2.6M3 3l18 18" />
              <path d="M12 19.5h.01" />
            </Svg>
          </HeroIcon>
          <Title
            desc={
              <>
                تأكد من اتصالك بالإنترنت وحاول مرة أخرى.
                <br />
                نسختك الحالية <span className="num">{APP_VERSION}</span> تعمل بشكل طبيعي.
              </>
            }
          >
            {state.during === 'check' ? 'تعذّر التحقق من التحديث' : 'تعذّر إكمال التحديث'}
          </Title>
          <PrimaryButton onClick={runCheck}>إعادة المحاولة</PrimaryButton>
          <GhostButton onClick={onClose}>إغلاق</GhostButton>
        </>
      )
      break
  }

  return (
    <div dir="rtl" className="fixed inset-0 z-[70] flex items-end justify-center">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-[6px]"
        style={{ animation: 'fade-in 180ms ease-out both' }}
        onClick={locked ? undefined : onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-label="تحديث التطبيق"
        className="relative w-full max-w-[480px] rounded-t-[32px] border-x border-t border-[var(--color-border-strong)] bg-[var(--color-surface-elevated)] px-5 shadow-[0_-24px_60px_-20px_rgba(0,0,0,0.85)]"
        style={{ animation: 'sheet-in 420ms var(--ease-out-expo) both', paddingBottom: 'calc(24px + env(safe-area-inset-bottom))' }}
      >
        <SheetHandle onDismiss={locked ? () => {} : onClose} />
        <div key={state.kind} className="pt-2" style={{ animation: 'fade-in 260ms ease-out both' }}>
          {body}
        </div>
      </div>
    </div>
  )
}
