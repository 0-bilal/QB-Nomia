import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ScreenHeader } from '../../components/ScreenHeader'
import { ScreenScroll } from '../../components/ScreenScroll'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { GuideDemo } from '../../components/onboarding/GuideDemo'
import { CheckIcon, Icons, ObGhost, ObIcon, ObLink, ObNote, ObPrimary } from '../../components/onboarding/ObUi'
import { UrlField } from '../../components/onboarding/UrlField'
import { clearSheetsSyncCredentials, setSheetsSyncCredentials } from '../../config/sheetsSync'
import { haptic } from '../../lib/haptics'
import { notify } from '../../lib/notify'
import { clearWizardDraft, getWizardDraft, saveWizardDraft } from '../../lib/onboarding'
import { APPS_SCRIPT_CREATE_URL, buildScriptCode, checkWebAppUrl, generateSyncToken, groupToken } from '../../lib/scriptCode'
import { probeSheets, pullFromSheets, pushToSheets, SheetsProbeError } from '../../lib/sheetsSync'
import { useData } from '../../state/DataContext'
import { DEPLOY_FRAMES, EDITOR_URL, OPEN_FRAMES, PASTE_FRAMES, RUN_FRAMES } from './backupGuideFrames'

const LAST = 7
const NEXT_LABELS = ['يلا نبدأ', 'التالي', 'فتحته، التالي', 'لصقته وحفظته', 'شغّلته ووافقت', 'نشرته ونسخت الرابط', 'اختبر الاتصال', 'تم']

type LineState = 'idle' | 'run' | 'ok' | 'fail'
const TEST_LINES = ['الوصول للسكربت', 'تطابق الرمز السري', 'تشفير بياناتك', 'أول نسخة احتياطية']

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    // متصفحات قديمة أو WebView بدون صلاحية الحافظة.
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    const ok = document.execCommand('copy')
    ta.remove()
    return ok
  }
}

function useCopied(): [boolean, () => void] {
  const [on, setOn] = useState(false)
  useEffect(() => {
    if (!on) return
    const t = window.setTimeout(() => setOn(false), 1600)
    return () => clearTimeout(t)
  }, [on])
  return [on, () => setOn(true)]
}

function Kicker({ children }: { children: ReactNode }) {
  return <div className="mt-1 text-[11.5px] font-semibold text-[var(--color-text-3)]">{children}</div>
}
function Title({ children }: { children: ReactNode }) {
  return <h1 className="mt-0.5 text-[24px] font-bold leading-[1.4]">{children}</h1>
}
function Lead({ children }: { children: ReactNode }) {
  return <p className="mb-3.5 mt-1 text-[12.5px] leading-[1.8] text-[var(--color-text-3)]">{children}</p>
}
function Em({ children }: { children: ReactNode }) {
  return <b className="font-semibold text-[var(--color-text)]">{children}</b>
}
function Kbd({ children }: { children: ReactNode }) {
  return (
    <span dir="ltr" className="num inline-block rounded-[5px] border border-[var(--color-border-strong)] bg-[var(--color-surface-high)] px-1.5 text-[10.5px] text-[var(--color-text)]">
      {children}
    </span>
  )
}
function Ordered({ items }: { items: ReactNode[] }) {
  return (
    <div className="mt-3 flex flex-col gap-2">
      {items.map((it, i) => (
        <div key={i} className="flex gap-2.5 text-[12px] leading-[1.7] text-[var(--color-text-2)]">
          <span className="num mt-0.5 grid h-5 w-5 flex-none place-items-center rounded-full bg-[var(--color-surface-high)] text-[10.5px] font-bold text-[var(--color-text)]">{i + 1}</span>
          <span>{it}</span>
        </div>
      ))}
    </div>
  )
}
function Point({ icon, title, body }: { icon: ReactNode; title: string; body: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="grid h-9 w-9 flex-none place-items-center rounded-[12px] bg-[var(--color-surface-high)]">
        <ObIcon size={18}>{icon}</ObIcon>
      </div>
      <div>
        <b className="text-[13px] font-semibold">{title}</b>
        <p className="mt-0.5 text-[11.5px] leading-[1.7] text-[var(--color-text-3)]">{body}</p>
      </div>
    </div>
  )
}

/** يلوّن Code.gs بشكل بسيط: التعليقات خافتة، وسطر الرمز مميّز. */
function CodeView({ code, token }: { code: string; token: string }) {
  // ترويسة الشرح الطويلة تنسخ مع الكود لكن ما تُعرض هنا — العرض يبدأ من سطر الرمز.
  const lines = useMemo(() => {
    const all = code.split('\n')
    const start = all.findIndex((l) => l.startsWith('var SECRET_TOKEN'))
    return start > 0 ? all.slice(start) : all
  }, [code])
  return (
    <pre dir="ltr" className="max-h-[220px] overflow-auto px-3 py-2.5 text-left font-mono text-[10.5px] leading-[1.7] text-[var(--color-text-2)]">
      {lines.map((l, i) => {
        if (l.includes(`'${token}'`) && l.includes('SECRET_TOKEN =')) {
          const [a, b] = l.split(`'${token}'`)
          return (
            <div key={i}>
              {a}
              <span className="rounded-[4px] px-0.5" style={{ background: 'color-mix(in srgb, var(--color-income) 16%, transparent)', color: 'var(--color-income)' }}>
                '{token}'
              </span>
              {b}
            </div>
          )
        }
        const comment = /^\s*(\/\/|\/\*\*?|\*)/.test(l)
        return (
          // التعليقات العربية بالخط العادي — الخط الأحادي يفكّك الحروف العربية.
          <div key={i} style={comment ? { color: 'var(--color-text-3)', fontFamily: 'var(--font-sans)' } : undefined}>
            {l || ' '}
          </div>
        )
      })}
    </pre>
  )
}

/**
 * معالج النسخة الاحتياطية خطوة بخطوة: يولّد الرمز ويحقنه في الكود، ويعرض
 * واجهة جوجل حيّة لكل خطوة، ثم يختبر الرابط ويرفع أول نسخة. الخطوة والرمز
 * محفوظان كمسودة حتى لو طلع المستخدم لجوجل ورجع أو أُعيد تحميل الصفحة.
 */
export function BackupWizardScreen() {
  const navigate = useNavigate()
  const location = useLocation()
  const { exportSnapshot, importSnapshot } = useData()
  const draft = useMemo(() => getWizardDraft(), [])
  const [step, setStep] = useState(() => Math.min(draft?.step ?? 0, 6))
  const [token, setToken] = useState(() => draft?.token ?? generateSyncToken())
  const [savedToken, setSavedToken] = useState(draft?.savedToken ?? false)
  const [url, setUrl] = useState(draft?.url ?? '')
  const [lines, setLines] = useState<LineState[]>(['idle', 'idle', 'idle', 'idle'])
  const [testError, setTestError] = useState('')
  const [testing, setTesting] = useState(false)
  const [existing, setExisting] = useState(false)
  const [confirmPull, setConfirmPull] = useState(false)
  const [tokenCopied, flashToken] = useCopied()
  const [codeCopied, flashCode] = useCopied()

  const code = useMemo(() => buildScriptCode(token), [token])
  const tested = lines[3] === 'ok'

  useEffect(() => {
    if (step < LAST) saveWizardDraft({ step, token, savedToken, url })
  }, [step, token, savedToken, url])

  function exit() {
    // فُتحت مباشرة (بدون تاريخ داخل التطبيق) — نرجع لخطوات التشغيل بدل ما نطلع من التطبيق.
    if (location.key === 'default') navigate('/getting-started', { replace: true })
    else navigate(-1)
  }

  function go(n: number) {
    haptic('tick')
    setStep(n)
    document.querySelector('[data-wizard-scroll]')?.parentElement?.scrollTo({ top: 0 })
  }

  function setLine(i: number, s: LineState) {
    setLines((prev) => prev.map((v, j) => (j === i ? s : v)))
  }

  async function upload() {
    setLine(2, 'run')
    await new Promise((r) => setTimeout(r, 450))
    setLine(2, 'ok')
    setLine(3, 'run')
    try {
      await pushToSheets(exportSnapshot())
      setLine(3, 'ok')
      haptic('success')
    } catch (err) {
      setLine(3, 'fail')
      clearSheetsSyncCredentials()
      setTestError(err instanceof Error ? err.message : 'فشل الرفع')
    }
  }

  async function runTest() {
    setTesting(true)
    setTestError('')
    setExisting(false)
    setLines(['run', 'idle', 'idle', 'idle'])
    try {
      const { hasData } = await probeSheets(url, token)
      setLines(['ok', 'ok', 'idle', 'idle'])
      setSheetsSyncCredentials(url, token)
      if (hasData) setExisting(true)
      else await upload()
    } catch (err) {
      const stage = err instanceof SheetsProbeError ? err.stage : 'reach'
      setLines(stage === 'reach' ? ['fail', 'idle', 'idle', 'idle'] : ['ok', 'fail', 'idle', 'idle'])
      setTestError(err instanceof Error ? err.message : 'تعذّر الاتصال')
      haptic('warning')
    } finally {
      setTesting(false)
    }
  }

  async function replaceRemote() {
    setExisting(false)
    setTesting(true)
    await upload()
    setTesting(false)
  }

  async function restoreRemote() {
    setConfirmPull(false)
    setExisting(false)
    setTesting(true)
    try {
      importSnapshot(await pullFromSheets())
      setLines(['ok', 'ok', 'ok', 'ok'])
      haptic('success')
      notify('success', 'رجعت بياناتك من النسخة المحفوظة')
    } catch (err) {
      clearSheetsSyncCredentials()
      setTestError(err instanceof Error ? err.message : 'تعذّر السحب')
    } finally {
      setTesting(false)
    }
  }

  function next() {
    if (step === 6) {
      if (!tested) return void runTest()
      clearWizardDraft()
      notify('success', 'النسخة الاحتياطية شغّالة')
      return go(LAST)
    }
    if (step === LAST) return exit()
    go(step + 1)
  }

  const nextDisabled = (step === 1 && !savedToken) || (step === 6 && (testing || existing || (!tested && checkWebAppUrl(url) !== 'ok')))
  const nextLabel = step === 6 && !tested ? (testing ? 'جارٍ الاختبار…' : 'اختبر الاتصال') : step === 6 ? 'التالي' : NEXT_LABELS[step]

  return (
    <ScreenScroll
      largeTitle={false}
      header={
        <ScreenHeader
          title="النسخة الاحتياطية"
          onBack={() => (step > 0 && step < LAST ? go(step - 1) : exit())}
          right={
            <span className="qb-glass-circle num flex h-10 min-w-10 items-center justify-center rounded-full border px-3 text-[12px] font-semibold">
              {step === LAST ? 'تم' : `${step + 1}/${LAST}`}
            </span>
          }
        />
      }
      footer={
        <div className="safe-bottom px-5 pb-3 pt-2">
          <ObPrimary disabled={nextDisabled} onClick={next}>
            {nextLabel}
          </ObPrimary>
          {step < LAST && <ObLink onClick={exit}>ليس الآن</ObLink>}
        </div>
      }
    >
      <ConfirmDialog
        open={confirmPull}
        title="استرجاع النسخة"
        message="بتنسحب النسخة المحفوظة في الجدول وتستبدل كل بياناتك الحالية على هذا الجهاز."
        confirmLabel="استرجاع واستبدال"
        color="var(--color-owed-to)"
        onConfirm={restoreRemote}
        onCancel={() => setConfirmPull(false)}
      />
      <div data-wizard-scroll className="mb-1 mt-1 flex gap-1">
        {Array.from({ length: LAST }, (_, i) => (
          <span key={i} className="h-[3px] flex-1 rounded-full" style={{ background: i < step || step === LAST ? 'var(--color-accent)' : 'rgba(255,255,255,.12)', transition: 'background 400ms' }} />
        ))}
      </div>

      <div key={step} className="qb-rise pb-2">
        {step === 0 && (
          <>
            <Kicker>قبل ما نبدأ</Kicker>
            <Title>نسخة مشفّرة في جدول بحسابك أنت</Title>
            <Lead>
              بياناتك تعيش على جوالك. النسخة الاحتياطية ترسل صورة منها <Em>مشفّرة</Em> إلى Google Sheets عن طريق سكربت صغير تنشئه أنت في Google Apps Script. ما فيه سيرفر لنا، ولا أحد يشوف أرقامك.
            </Lead>
            <div className="qb-card p-3.5">
              <div className="relative mb-2 h-[118px]">
                <svg viewBox="0 0 330 118" preserveAspectRatio="none" className="absolute inset-0 h-full w-full" aria-hidden="true">
                  <path d="M262 40 H200 M130 40 H68" fill="none" stroke="rgba(255,255,255,.14)" strokeWidth="1.4" strokeDasharray="4 5" className="qb-ob-wire" />
                </svg>
                {[
                  { icon: Icons.phone, label: 'جوالك', pos: 'right-1' },
                  { icon: Icons.lock, label: 'تشفير برمزك', pos: 'left-1/2 -ml-[38px]', light: true },
                  { icon: Icons.sheet, label: 'جدولك في Google', pos: 'left-1' },
                ].map((n) => (
                  <div key={n.label} className={`absolute top-3 flex w-[76px] flex-col items-center gap-1.5 text-center text-[10.5px] text-[var(--color-text-3)] ${n.pos}`}>
                    <div
                      className={`grid h-14 w-14 place-items-center rounded-[18px] ${n.light ? 'qb-ob-halo' : 'border border-[var(--color-border-strong)] bg-[var(--color-surface)]'}`}
                      style={n.light ? { background: 'linear-gradient(150deg, var(--color-accent-a), var(--color-accent-b))', color: 'var(--color-on-accent)' } : undefined}
                    >
                      <ObIcon size={24}>{n.icon}</ObIcon>
                    </div>
                    {n.label}
                  </div>
                ))}
              </div>
              <div className="flex flex-col gap-3">
                <Point icon={Icons.upload} title="تلقائية بعد كل تعديل" body="أي حركة تضيفها ترتفع بالخلفية خلال ثانيتين، بدون ما تضغط شيء." />
                <Point icon={Icons.lock} title="مشفّرة قبل ما تطلع" body="الجدول يحفظ نصًا عشوائيًا. فكّه يحتاج رمزك السري، وهو على جوالك بس." />
                <Point icon={Icons.refresh} title="ترجع لها من أي جهاز" body="جوال جديد؟ تدخل الرابط والرمز وترجع كل بياناتك." />
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {[
                  <>
                    حوالي <span className="num">5</span> دقائق
                  </>,
                  'حساب Google',
                  'يُفضّل من متصفح الجوال أو كمبيوتر',
                ].map((c, i) => (
                  <span key={i} className="inline-flex h-6 items-center gap-1 rounded-full border border-[var(--color-border)] bg-white/[0.05] px-2.5 text-[11px] font-semibold text-[var(--color-text-2)]">
                    {c}
                  </span>
                ))}
              </div>
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <Kicker>
              الخطوة <span className="num">1</span> · رمزك السري
            </Kicker>
            <Title>هذا مفتاح بياناتك</Title>
            <Lead>سوّينا لك رمزًا عشوائيًا قويًا. نفس الرمز بيكون داخل الكود اللي بتلصقه، وبه تتشفّر النسخة وتنفك. ما تحتاج تكتبه بيدك.</Lead>
            <div dir="ltr" className="rounded-[18px] border border-[var(--color-border-strong)] bg-[var(--color-void)] p-4 text-left font-mono text-[15px] leading-[1.6] tracking-[0.04em]">
              {groupToken(token)}
            </div>
            <div className="mt-2.5 flex gap-2">
              <ObPrimary
                small
                className="flex-1"
                style={tokenCopied ? { background: 'var(--color-income)' } : undefined}
                onClick={async () => {
                  if (await copyText(token)) flashToken()
                }}
              >
                {tokenCopied ? <CheckIcon size={16} /> : <ObIcon size={16}>{Icons.copy}</ObIcon>}
                {tokenCopied ? 'انتسخ' : 'انسخ الرمز'}
              </ObPrimary>
              <ObGhost
                className="w-12 flex-none"
                aria-label="رمز جديد"
                onClick={() => {
                  setToken(generateSyncToken())
                  setSavedToken(false)
                }}
              >
                <ObIcon size={16}>{Icons.refresh}</ObIcon>
              </ObGhost>
            </div>
            <ObNote tone="warn" icon={<ObIcon size={18}>{Icons.warn}</ObIcon>}>
              <Em>احفظه بمكان آمن</Em> (مدير كلمات المرور، أو ملاحظة مقفلة). لو ضاع جوالك وضاع الرمز معه، النسخة ما تنفك، ولا حتى نحن نقدر نرجّعها.
            </ObNote>
            <button
              onClick={() => setSavedToken((v) => !v)}
              className="qb-press mt-3 flex w-full items-center gap-2.5 rounded-[16px] border border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-right text-[12.5px]"
            >
              <span
                className="grid h-[22px] w-[22px] flex-none place-items-center rounded-[7px] border-[1.5px]"
                style={savedToken ? { background: 'var(--color-accent)', borderColor: 'var(--color-accent)', color: 'var(--color-on-accent)' } : { borderColor: 'var(--color-text-3)' }}
              >
                {savedToken && <CheckIcon />}
              </span>
              حفظت الرمز بمكان آمن
            </button>
          </>
        )}

        {step === 2 && (
          <>
            <Kicker>
              الخطوة <span className="num">2</span> · افتح Google Apps Script
            </Kicker>
            <Title>أنشئ مشروعًا جديدًا</Title>
            <Lead>
              الزر يفتح لك مشروعًا فارغًا مباشرة. سجّل دخولك بحساب Google لو طلب، وسمّ المشروع <Em>QB-Nomia Backup</Em>. الجدول نفسه بينشأ تلقائيًا في الخطوة الرابعة.
            </Lead>
            <GuideDemo url="script.google.com/create" frames={OPEN_FRAMES} />
            <ObPrimary className="mt-3" onClick={() => window.open(APPS_SCRIPT_CREATE_URL, '_blank', 'noopener')}>
              <ObIcon size={16}>{Icons.external}</ObIcon>
              افتح Google Apps Script
            </ObPrimary>
            <p className="mt-2 text-center text-[11.5px] text-[var(--color-text-3)]">ارجع هنا بعد ما يفتح المحرر، وكمّل.</p>
          </>
        )}

        {step === 3 && (
          <>
            <Kicker>
              الخطوة <span className="num">3</span> · الكود
            </Kicker>
            <Title>انسخ الكود والصقه</Title>
            <Lead>الكود جاهز وفيه رمزك (السطر الملوّن). امسح الموجود في المحرر والصق هذا مكانه.</Lead>
            <GuideDemo url={EDITOR_URL} frames={PASTE_FRAMES} />
            <div className="mt-3 overflow-hidden rounded-[18px] border border-[var(--color-border-strong)] bg-[var(--color-void)]">
              <div className="flex items-center justify-between border-b border-[var(--color-border)] py-2 pe-2.5 ps-3">
                <span dir="ltr" className="font-mono text-[11px] text-[var(--color-text-2)]">
                  Code.gs
                </span>
                <button
                  onClick={async () => {
                    if (await copyText(code)) {
                      flashCode()
                      haptic('success')
                    }
                  }}
                  className="qb-press flex h-[30px] items-center gap-1.5 rounded-full border border-[var(--color-border-strong)] px-3 text-[12px] font-semibold"
                  style={codeCopied ? { background: 'var(--color-income)', color: 'var(--color-on-accent)', borderColor: 'var(--color-income)' } : { background: 'rgba(28,28,33,.9)' }}
                >
                  {codeCopied ? <CheckIcon size={14} /> : <ObIcon size={14}>{Icons.copy}</ObIcon>}
                  {codeCopied ? 'انتسخ الكود' : 'انسخ الكود كاملًا'}
                </button>
              </div>
              <CodeView code={code} token={token} />
            </div>
            <Ordered
              items={[
                <>
                  في المحرر اضغط <Kbd>Ctrl + A</Kbd> ثم <Kbd>Delete</Kbd> لمسح <Em>myFunction</Em>.
                </>,
                <>
                  الصق بـ <Kbd>Ctrl + V</Kbd> (أو اضغط مطوّلًا ثم «لصق» في الجوال).
                </>,
                <>
                  احفظ بـ <Kbd>Ctrl + S</Kbd> أو أيقونة الحفظ.
                </>,
              ]}
            />
          </>
        )}

        {step === 4 && (
          <>
            <Kicker>
              الخطوة <span className="num">4</span> · التشغيل والصلاحيات
            </Kicker>
            <Title>شغّل setup مرة وحدة</Title>
            <Lead>هذا ينشئ الجدول في حسابك ويعطي السكربت إذنًا يكتب فيه. جوجل بيعرض تحذير «غير موثّق»، وهذا طبيعي لأن السكربت حقك أنت، مو تطبيق منشور.</Lead>
            <GuideDemo url={EDITOR_URL} frames={RUN_FRAMES} />
            <Ordered
              items={[
                <>
                  من القائمة فوق اختر <Em>setup</Em> ثم <Em>Run</Em> (تشغيل).
                </>,
                <>
                  <Em>Review permissions</Em> ← اختر حسابك.
                </>,
                <>
                  <Em>Advanced</Em> (متقدّم) ← <Em>Go to QB-Nomia Backup (unsafe)</Em>.
                </>,
                <>
                  <Em>Allow</Em> (سماح)، وانتظر «Execution completed».
                </>,
              ]}
            />
          </>
        )}

        {step === 5 && (
          <>
            <Kicker>
              الخطوة <span className="num">5</span> · النشر
            </Kicker>
            <Title>انشره كتطبيق ويب</Title>
            <Lead>النشر يعطيك رابطًا يكلّمه التطبيق. الإعدادين تحت لازم يكونون بالضبط كذا.</Lead>
            <GuideDemo url={EDITOR_URL} frames={DEPLOY_FRAMES} />
            <div className="qb-card mt-3 px-3.5 py-1">
              {[
                ['Execute as (التشغيل باسم)', 'Me'],
                ['Who has access (من يصل)', 'Anyone'],
              ].map(([k, v], i) => (
                <div key={k} className={`flex justify-between py-2.5 text-[12.5px] ${i ? 'border-t border-[var(--color-border)]' : ''}`}>
                  <span className="text-[var(--color-text-3)]">{k}</span>
                  <b className="num">{v}</b>
                </div>
              ))}
            </div>
            <ObNote icon={<ObIcon size={18}>{Icons.info}</ObIcon>}>«Anyone» ما يعني أن أحد يقدر يقرأ بياناتك: السكربت يرفض أي طلب بدون رمزك، والمحفوظ مشفّر أصلًا.</ObNote>
          </>
        )}

        {step === 6 && (
          <>
            <Kicker>
              الخطوة <span className="num">6</span> · الربط
            </Kicker>
            <Title>الصق الرابط وجرّب</Title>
            <Lead>
              انسخ رابط <Em>Web app</Em> من نافذة النشر والصقه هنا.
            </Lead>
            <UrlField
              value={url}
              onChange={(v) => {
                setUrl(v)
                setLines(['idle', 'idle', 'idle', 'idle'])
                setTestError('')
                setExisting(false)
              }}
            />
            <div className="mt-3 flex flex-col">
              {TEST_LINES.map((label, i) => {
                const s = lines[i]
                return (
                  <div key={label} className="flex items-center gap-2.5 px-1 py-2.5 text-[12.5px]" style={{ color: s === 'idle' ? 'var(--color-text-3)' : s === 'run' ? 'var(--color-text)' : 'var(--color-text-2)' }}>
                    <span
                      className="grid h-[22px] w-[22px] flex-none place-items-center rounded-full border-[1.5px]"
                      style={
                        s === 'ok'
                          ? { background: 'var(--color-income)', borderColor: 'var(--color-income)', color: 'var(--color-on-accent)' }
                          : s === 'fail'
                            ? { background: 'var(--color-expense)', borderColor: 'var(--color-expense)', color: 'var(--color-on-accent)' }
                            : s === 'run'
                              ? { borderColor: 'rgba(255,255,255,.15)', borderTopColor: '#fff', animation: 'spin 800ms linear infinite' }
                              : { borderColor: 'var(--color-surface-high)' }
                      }
                    >
                      {s === 'ok' && <CheckIcon size={12} />}
                      {s === 'fail' && <ObIcon size={11} width={3}>{Icons.close}</ObIcon>}
                    </span>
                    {label}
                  </div>
                )
              })}
            </div>
            {testError && (
              <div
                className="mt-1 rounded-[16px] border p-3 text-[12px] leading-[1.7]"
                style={{ color: 'var(--color-expense)', borderColor: 'color-mix(in srgb, var(--color-expense) 32%, transparent)', background: 'color-mix(in srgb, var(--color-expense) 8%, transparent)' }}
              >
                {testError}
              </div>
            )}
            {existing && (
              <div className="qb-card mt-1 p-3.5">
                <div className="text-[13px] font-semibold">فيه نسخة محفوظة بهذا الجدول</div>
                <p className="mt-1 text-[11.5px] leading-[1.7] text-[var(--color-text-3)]">غالبًا من جهاز ثاني. تبي ترجّعها هنا، أو تستبدلها ببيانات هذا الجهاز؟</p>
                <div className="mt-3 flex gap-2">
                  <ObPrimary small className="flex-1" onClick={() => setConfirmPull(true)}>
                    استرجعها هنا
                  </ObPrimary>
                  <ObGhost className="flex-1" onClick={replaceRemote}>
                    استبدلها
                  </ObGhost>
                </div>
              </div>
            )}
          </>
        )}

        {step === LAST && (
          <>
            <div className="flex flex-col items-center pt-5 text-center">
              <div className="relative grid h-24 w-24 place-items-center rounded-[32px]" style={{ background: 'color-mix(in srgb, var(--color-income) 15%, transparent)', color: 'var(--color-income)' }}>
                <span className="absolute -inset-2 rounded-[40px] border qb-ob-halo" style={{ borderColor: 'color-mix(in srgb, var(--color-income) 35%, transparent)' }} />
                <svg viewBox="0 0 24 24" width="44" height="44" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12l5 5L20 7" strokeDasharray="40" strokeDashoffset="40" className="qb-ob-draw" />
                </svg>
              </div>
              <Title>
                <span className="mt-5 block">نسختك الاحتياطية شغّالة</span>
              </Title>
              <p className="mt-1 max-w-[290px] text-[12.5px] leading-[1.8] text-[var(--color-text-3)]">من الحين أي تعديل يرتفع لحاله. تقدر تدير كل شيء من المزيد ← المزامنة.</p>
            </div>
            <div className="qb-card mt-4 px-3.5 py-1">
              {[
                ['آخر نسخة', 'قبل لحظات'],
                ['المكان', 'جدول QB-Nomia Backup في حسابك'],
                ['الرفع التلقائي', 'مفعّل'],
              ].map(([k, v], i) => (
                <div key={k} className={`flex justify-between gap-3 py-2.5 text-[12.5px] ${i ? 'border-t border-[var(--color-border)]' : ''}`}>
                  <span className="text-[var(--color-text-3)]">{k}</span>
                  <b className="font-semibold" style={i === 2 ? { color: 'var(--color-income)' } : undefined}>
                    {v}
                  </b>
                </div>
              ))}
            </div>
            <ObNote icon={<ObIcon size={18}>{Icons.phone}</ObIcon>}>على جهاز ثاني: افتح التطبيق، واختر «عندي نسخة احتياطية» من أول شاشة، والصق نفس الرابط والرمز.</ObNote>
          </>
        )}
      </div>
    </ScreenScroll>
  )
}
