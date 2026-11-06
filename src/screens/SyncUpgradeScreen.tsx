import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ScreenHeader } from '../components/ScreenHeader'
import { ScreenScroll } from '../components/ScreenScroll'
import { CheckIcon, Icons, ObIcon, ObLink, ObNote, ObPrimary } from '../components/onboarding/ObUi'
import { CheckLines, Em, Kbd, Kicker, Lead, Ordered, Title, type LineState } from '../components/onboarding/WizardUi'
import { ScriptCodeView } from '../components/onboarding/ScriptCodeView'
import { useAuthKey } from '../hooks/useAuthKey'
import { copyText, useCopied } from '../lib/clipboard'
import { buildScriptCode, generateSyncToken, groupToken } from '../lib/scriptCode'
import { SheetsProbeError, hasPendingPush, probeSheets, pullFromSheets, pushToSheets, storedCredsStillWork } from '../lib/sheetsSync'
import { SyncConflictError, getConflict } from '../lib/syncConflict'
import { getSheetsWebAppUrl, isSheetsSyncConfigured } from '../config/sheetsSync'
import { haptic } from '../lib/haptics'
import { useData } from '../state/DataContext'

/** الرمز الجديد محفوظ كمسودة: المستخدم يطلع للـ Apps Script ويرجع، وما نبي يتغيّر عليه. */
const DRAFT_KEY = 'qbnomia.sync.upgradeDraft'
const STEPS = 4
const TEST_LINES = ['الوصول للسكربت', 'قبول مفتاح الدخول الجديد', 'إعادة تشفير بياناتك بالمفتاح الجديد', 'رفعها لـ Google Sheets']

function loadDraft(): string {
  try {
    const t = localStorage.getItem(DRAFT_KEY)
    if (t) return t
    const fresh = generateSyncToken()
    localStorage.setItem(DRAFT_KEY, fresh)
    return fresh
  } catch {
    return generateSyncToken()
  }
}

const OLD_CODE_LIVE =
  'الرابط المحفوظ لسا يشغّل الكود القديم، فالنشر الجديد ما وصله. افتح Deploy ← Manage deployments، عدّل النشر الموجود (القلم) واختر Version: New version ثم Deploy. لا تسوي «New deployment» لأنه يطلع رابط ثاني.'
const KEY_MISMATCH =
  'السكربت ما يقبل الرمز القديم ولا الجديد. غالبًا الكود المنشور من رمز ثاني (ضغطت «رمز جديد» بعد ما نسخت الكود؟) أو انلصق في مشروع ثاني. ارجع للخطوة 2 وانسخ الكود من جديد، والصقه في نفس المشروع اللي رابطه محفوظ في التطبيق، واحفظ وانشر New version.'

/**
 * رسالة فشل الاختبار حسب السبب الحقيقي. لو السكربت رفض مفتاح الدخول الجديد، نشيك هل الرابط لسا يقبل
 * الرمز القديم: لو يقبله = النشر الجديد ما وصل هذا الرابط، وإلا = الكود المنشور من رمز ثاني أو مشروع ثاني.
 */
async function upgradeErrorMessage(err: unknown): Promise<string> {
  if (err instanceof SheetsProbeError && err.reason === 'auth') return (await storedCredsStillWork()) ? OLD_CODE_LIVE : KEY_MISMATCH
  return err instanceof Error ? err.message : 'فشل التحديث'
}

type Prep = 'run' | 'ok' | { error: string; conflict?: boolean }

/**
 * تحديث حماية المزامنة (v1 ← v2): رمز جديد، كود Apps Script جديد فيه مفتاح دخول مشتق فقط، نشر نسخة
 * جديدة بنفس الرابط، ثم إعادة تشفير البيانات بمفتاح ما يطلع من الجهاز ورفعها (design/sync-key-split.html).
 */
export function SyncUpgradeScreen() {
  const navigate = useNavigate()
  const { exportSnapshot, importSnapshot } = useData()
  const [step, setStep] = useState(0) // 0 = تجهيز، 1..4 الخطوات، 5 = تم
  const [prep, setPrep] = useState<Prep>('run')
  const [attempt, setAttempt] = useState(0)
  const [token, setToken] = useState(loadDraft)
  const [saved, setSaved] = useState(false)
  const [tokenCopied, flashToken] = useCopied()
  const [codeCopied, setCodeCopied] = useState(false)
  const [lines, setLines] = useState<LineState[]>(['idle', 'idle', 'idle', 'idle'])
  const [testError, setTestError] = useState('')
  const [testing, setTesting] = useState(false)
  const authKey = useAuthKey(token)
  const code = useMemo(() => (authKey ? buildScriptCode(authKey) : ''), [authKey])

  // قبل ما نبدأ: نتأكد إن بيانات هذا الجهاز محدّثة بالطريقة الحالية، حتى ما نعيد تشفير نسخة قديمة.
  useEffect(() => {
    let alive = true
    async function prepare() {
      if (!isSheetsSyncConfigured()) throw new Error('المزامنة مو مربوطة على هذا الجهاز')
      if (getConflict()) throw new SyncConflictError()
      if (hasPendingPush()) await pushToSheets(exportSnapshot())
      else importSnapshot(await pullFromSheets())
    }
    prepare()
      .then(() => {
        if (!alive) return
        setPrep('ok')
        setStep(1)
      })
      .catch((err) => {
        if (!alive) return
        setPrep(err instanceof SyncConflictError ? { error: 'فيه تعارض بين هذا الجهاز ونسخة Google Sheets. حلّه من الرئيسية أولًا، وبعدها ارجع هنا.', conflict: true } : { error: err instanceof Error ? err.message : 'تعذّرت المزامنة' })
      })
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt])

  function setLine(i: number, s: LineState) {
    setLines((prev) => prev.map((v, j) => (j === i ? s : v)))
  }

  async function runTest() {
    setTesting(true)
    setTestError('')
    setLines(['run', 'idle', 'idle', 'idle'])
    const url = getSheetsWebAppUrl()
    try {
      const { scheme } = await probeSheets(url, token)
      setLines(['ok', 'run', 'idle', 'idle'])
      if (scheme !== 'v2') throw new SheetsProbeError('token', OLD_CODE_LIVE, 'script')
      setLines(['ok', 'ok', 'run', 'idle'])
      await new Promise((r) => setTimeout(r, 400))
      setLines(['ok', 'ok', 'ok', 'run'])
      // إعادة الكتابة بالمفتاح الجديد: البيانات هنا هي آخر نسخة (تأكدنا بالتجهيز)، والسكربت ما عاد يقبل الرمز القديم.
      await pushToSheets(exportSnapshot(), { force: true, creds: { url, token, scheme: 'v2' } })
      setLine(3, 'ok')
      try {
        localStorage.removeItem(DRAFT_KEY)
      } catch {
        // مسودة فقط.
      }
      haptic('success')
      setTimeout(() => setStep(5), 500)
    } catch (err) {
      const stage = err instanceof SheetsProbeError ? err.stage : null
      setLines((prev) => {
        const failAt = stage === 'reach' ? 0 : stage === 'token' ? 1 : prev.findIndex((s) => s === 'run')
        return prev.map((_s, i) => (i < failAt ? 'ok' : i === failAt ? 'fail' : 'idle'))
      })
      setTestError(await upgradeErrorMessage(err))
      haptic('warning')
    } finally {
      setTesting(false)
    }
  }

  const exit = () => navigate('/sync-settings', { replace: true })
  const nextDisabled = (step === 1 && !saved) || (step === 2 && !codeCopied) || (step === 4 && testing)
  const nextLabel = step === 3 ? 'نشرت النسخة الجديدة' : step === 4 ? (testing ? 'جارٍ…' : lines[3] === 'ok' ? 'تم' : 'اختبر وحدّث') : step === 5 ? 'رجوع للمزامنة' : 'التالي'
  function next() {
    if (step === 4) return void runTest()
    if (step === 5) return exit()
    setStep(step + 1)
  }

  return (
    <ScreenScroll
      header={
        <ScreenHeader
          title="تحديث الحماية"
          onBack={() => (step > 1 && step < 5 ? setStep(step - 1) : exit())}
          right={
            step >= 1 && step <= STEPS ? (
              <span className="qb-glass-circle num flex h-10 min-w-10 items-center justify-center rounded-full border px-3 text-[12px] font-semibold">
                {step}/{STEPS}
              </span>
            ) : undefined
          }
        />
      }
      footer={
        step === 0 ? undefined : (
          <div className="safe-bottom px-5 pb-3 pt-2">
            <ObPrimary disabled={nextDisabled} onClick={next}>
              {nextLabel}
            </ObPrimary>
            {step < 4 && <ObLink onClick={exit}>ليس الآن</ObLink>}
          </div>
        )
      }
    >
      {step >= 1 && step <= STEPS && (
        <div className="mb-1 mt-1 flex gap-1">
          {Array.from({ length: STEPS }, (_, i) => (
            <span key={i} className="h-[3px] flex-1 rounded-full" style={{ background: i < step ? 'var(--color-accent)' : 'rgba(255,255,255,.12)', transition: 'background 400ms' }} />
          ))}
        </div>
      )}

      <div key={step} className="qb-rise pb-2">
        {step === 0 && (
          <div className="pt-6 text-center">
            <Title>نجهّز التحديث</Title>
            {prep === 'run' && <Lead>نتأكد إن بيانات هذا الجهاز محدّثة قبل ما نبدأ…</Lead>}
            {typeof prep === 'object' && (
              <>
                <div className="mt-3 rounded-[16px] border p-3 text-[12px] leading-[1.7]" style={{ color: 'var(--color-expense)', borderColor: 'color-mix(in srgb, var(--color-expense) 32%, transparent)', background: 'color-mix(in srgb, var(--color-expense) 8%, transparent)' }}>
                  {prep.error}
                </div>
                <div className="mt-4 flex flex-col gap-2">
                  {prep.conflict ? (
                    <ObPrimary onClick={() => navigate('/', { replace: true })}>روح للرئيسية</ObPrimary>
                  ) : (
                    <ObPrimary onClick={() => (setPrep('run'), setAttempt((n) => n + 1))}>جرّب مرة ثانية</ObPrimary>
                  )}
                  <ObLink onClick={exit}>رجوع</ObLink>
                </div>
              </>
            )}
          </div>
        )}

        {step === 1 && (
          <>
            <Kicker>
              الخطوة <span className="num">1</span> · رمز جديد
            </Kicker>
            <Title>رمزك الجديد</Title>
            <Lead>
              نسوي رمز جديد بدل القديم، لأن القديم انكتب في كود السكربت ويبقى في سجل نسخه. <Em>احفظه</Em>، تحتاجه لو ربطت جهاز ثاني أو رجعت بياناتك.
            </Lead>
            <div dir="ltr" className="select-text rounded-[18px] border border-[var(--color-border-strong)] bg-[var(--color-void)] p-4 text-left font-mono text-[15px] leading-[1.6] tracking-wide">
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
              <button
                type="button"
                aria-label="رمز جديد"
                onClick={() => {
                  const fresh = generateSyncToken()
                  try {
                    localStorage.setItem(DRAFT_KEY, fresh)
                  } catch {
                    // مسودة فقط.
                  }
                  setToken(fresh)
                  setSaved(false)
                  setCodeCopied(false)
                }}
                className="qb-press grid w-12 flex-none place-items-center rounded-[15px] border border-[var(--color-border-strong)] bg-white/[0.06]"
              >
                <ObIcon size={16}>{Icons.refresh}</ObIcon>
              </button>
            </div>
            <ObNote tone="warn" icon={<ObIcon size={18}>{Icons.warn}</ObIcon>}>
              <Em>الرمز القديم يتقاعد.</Em> بعد التحديث ما يفتح السكربت ولا يفك بياناتك الجديدة. أجهزتك الثانية بتطلب منك الرمز الجديد.
            </ObNote>
            <button
              type="button"
              onClick={() => setSaved((v) => !v)}
              className="qb-press mt-3 flex w-full items-center gap-2.5 rounded-[16px] border border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-right text-[13px]"
            >
              <span
                className="grid h-[22px] w-[22px] flex-none place-items-center rounded-[7px] border-[1.5px]"
                style={saved ? { background: 'var(--color-accent)', borderColor: 'var(--color-accent)', color: 'var(--color-on-accent)' } : { borderColor: 'var(--color-border-strong)' }}
              >
                {saved && <CheckIcon />}
              </span>
              حفظت الرمز الجديد بمكان آمن
            </button>
          </>
        )}

        {step === 2 && (
          <>
            <Kicker>
              الخطوة <span className="num">2</span> · الكود
            </Kicker>
            <Title>بدّل كود السكربت</Title>
            <Lead>
              افتح نفس مشروع Apps Script اللي سويته أول مرة. امسح الكود كله والصق هذا مكانه. السطر الملوّن فيه <Em>مفتاح دخول</Em> مشتق من رمزك، مو الرمز نفسه.
            </Lead>
            <div className="overflow-hidden rounded-[18px] border border-[var(--color-border-strong)] bg-[var(--color-void)]">
              <div className="flex items-center justify-between border-b border-[var(--color-border)] py-2 pe-2.5 ps-3">
                <span dir="ltr" className="font-mono text-[11px] text-[var(--color-text-2)]">
                  Code.gs
                </span>
                <button
                  type="button"
                  onClick={async () => {
                    if (code && (await copyText(code))) {
                      setCodeCopied(true)
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
              {authKey && <ScriptCodeView code={code} highlight={authKey} />}
            </div>
            <ObNote icon={<ObIcon size={18}>{Icons.lock}</ObIcon>}>
              حتى لو أحد شاف هذا الكود، <Em>ما يقدر يفك بياناتك</Em>. مفتاح التشفير ينحسب من رمزك على جهازك فقط.
            </ObNote>
            <Ordered
              items={[
                <>
                  في المحرر <Kbd>Ctrl + A</Kbd> ثم <Kbd>Delete</Kbd>.
                </>,
                <>
                  الصق بـ <Kbd>Ctrl + V</Kbd> واحفظ بـ <Kbd>Ctrl + S</Kbd>.
                </>,
              ]}
            />
          </>
        )}

        {step === 3 && (
          <>
            <Kicker>
              الخطوة <span className="num">3</span> · النشر
            </Kicker>
            <Title>انشر نسخة جديدة</Title>
            <Lead>
              نحدّث النشر الموجود بدل ما نسوي واحد جديد، فيبقى <Em>نفس الرابط</Em> وما تحتاج تغيّره بأي جهاز.
            </Lead>
            <Ordered
              items={[
                <>
                  فوق يمين اضغط <Em>Deploy</Em> ثم <Em>Manage deployments</Em>.
                </>,
                <>اختر النشر الموجود واضغط أيقونة القلم (تعديل).</>,
                <>
                  في <Em>Version</Em> اختر <Em>New version</Em>.
                </>,
                <>
                  اضغط <Em>Deploy</Em>. الرابط المنتهي بـ <Kbd>/exec</Kbd> ما يتغيّر.
                </>,
              ]}
            />
            <ObNote tone="warn" icon={<ObIcon size={18}>{Icons.warn}</ObIcon>}>
              من هذي اللحظة، أي جهاز ما تحدّث يوقف عن المزامنة لين تدخل فيه الرمز الجديد.
            </ObNote>
          </>
        )}

        {step === 4 && (
          <>
            <Kicker>
              الخطوة <span className="num">4</span> · الاختبار
            </Kicker>
            <Title>نتأكد ونشفّر من جديد</Title>
            <Lead>نتأكد إن السكربت الجديد يقبل مفتاح الدخول، وبعدها نعيد تشفير بياناتك بالمفتاح الجديد ونرفعها.</Lead>
            <div className="qb-card px-3 py-1">
              <CheckLines labels={TEST_LINES} states={lines} />
            </div>
            {testError && (
              <div className="mt-3 rounded-[16px] border p-3 text-[12px] leading-[1.7]" style={{ color: 'var(--color-expense)', borderColor: 'color-mix(in srgb, var(--color-expense) 32%, transparent)', background: 'color-mix(in srgb, var(--color-expense) 8%, transparent)' }}>
                {testError}
              </div>
            )}
          </>
        )}

        {step === 5 && (
          <>
            <div className="flex flex-col items-center pt-5 text-center">
              <div className="grid h-24 w-24 place-items-center rounded-full bg-[var(--color-accent)] text-[var(--color-on-accent)]" style={{ animation: 'qb-pop 520ms var(--ease-spring) both' }}>
                <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 3 5 6v6c0 4.2 2.9 7.6 7 9 4.1-1.4 7-4.8 7-9V6zM9 12l2 2 4-4" />
                </svg>
              </div>
              <Title>
                <span className="mt-5 block">بياناتك صارت أأمن</span>
              </Title>
              <p className="mt-1 max-w-[300px] text-[12.5px] leading-[1.8] text-[var(--color-text-3)]">السكربت يعرف مفتاح دخول فقط، ومفتاح التشفير على أجهزتك. ما يقدر أحد يفك بياناتك من حساب Google.</p>
            </div>
            <ObNote tone="warn" icon={<ObIcon size={18}>{Icons.phone}</ObIcon>}>
              <Em>أجهزتك الثانية:</Em> بتطلب الرمز الجديد أول ما تحاول تزامن. دخّله فيها مرة وحدة.
            </ObNote>
            <ObNote tone="warn" icon={<ObIcon size={18}>{Icons.warn}</ObIcon>}>
              <Em>سجل نسخ الجدول</Em> في Google Sheets يحتفظ بالنسخ القديمة المشفّرة بالرمز القديم. خلّ الرمز القديم سري، أو احذف الجدول القديم لو تبي تمسحها نهائيًا.
            </ObNote>
          </>
        )}
      </div>
    </ScreenScroll>
  )
}
