import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PinPad } from '../../components/PinPad'
import { useAuth } from '../../state/AuthContext'
import { useData } from '../../state/DataContext'
import { AppLogo } from '../../components/AppLogo'
import { ProfileAvatar } from '../../components/ProfileAvatar'
import { getProfile } from '../../lib/profile'
import { configuredDigits } from '../../lib/auth'
import { runBackgroundPull } from '../../lib/autoSync'
import { isBiometricEnabled, verifyBiometric } from '../../lib/biometric'
import { APP_VERSION } from '../../lib/version'
import { haptic } from '../../lib/haptics'
import { LockBackground } from '../../components/LockBackground'
import { getBiometricFirst, getLockBackground, getLockClock } from '../../lib/lockPrefs'
import { balanceSeries } from '../../lib/balanceHistory'

const DAYS_AR = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']
const MONTHS_AR = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر']

/** الوقت بالساعة والدقيقة، يتحدّث كل دقيقة. */
function useClock(enabled: boolean): Date {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    if (!enabled) return
    const id = window.setInterval(() => setNow(new Date()), 15000)
    return () => window.clearInterval(id)
  }, [enabled])
  return now
}

type Stage = 'input' | 'success'

function FingerprintIcon({ size = 30 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={size > 32 ? 1.5 : 1.6} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3a7 7 0 0 1 7 7c0 2.5-.5 4-1 5" />
      <path d="M12 3a7 7 0 0 0-7 7c0 1.2.1 2.2.3 3" />
      <path d="M12 7a6 6 0 0 1 6 6c0 2-.4 3.5-1 4.7" />
      <path d="M12 7a6 6 0 0 0-6 6c0 2.8.7 4.5 1.5 5.7" />
      <path d="M12 11a2.5 2.5 0 0 1 2.5 2.5c0 2.3-.7 4-1.8 5.5" />
      <path d="M9.5 20c-.6-1-1-2.3-1-4a3.5 3.5 0 0 1 3.5-3.5" />
    </svg>
  )
}

export function PinLoginScreen() {
  const auth = useAuth()
  const { importSnapshot, accounts, recentActivity, homeTotalBalance } = useData()
  const navigate = useNavigate()
  const digits = configuredDigits()
  const [value, setValue] = useState('')
  const [error, setError] = useState(false)
  const [stage, setStage] = useState<Stage>('input')
  const [biometricAvailable] = useState(isBiometricEnabled)
  const [biometricBusy, setBiometricBusy] = useState(false)
  const [biometricError, setBiometricError] = useState(false)
  const [background] = useState(getLockBackground)
  const [showClock] = useState(getLockClock)
  // البصمة أولًا: زر بصمة كبير بدل لوحة الأرقام، و«استخدم الرقم السري» يُظهر اللوحة.
  const [padVisible, setPadVisible] = useState(() => !(isBiometricEnabled() && getBiometricFirst()))
  const now = useClock(showClock)
  // منحنى الرصيد (الشكل فقط بدون أرقام) لخلفية «منحنى الرصيد».
  const curve = useMemo(() => {
    if (background !== 'curve') return []
    const included = new Set(accounts.filter((a) => a.includeInTotal !== false).map((a) => a.id))
    return balanceSeries(recentActivity(1000000), included, homeTotalBalance, 30, new Date()).map((p) => p.balance)
  }, [background, accounts, recentActivity, homeTotalBalance])

  async function handleBiometric() {
    if (biometricBusy || stage !== 'input') return
    setBiometricBusy(true)
    setBiometricError(false)
    const ok = await verifyBiometric()
    setBiometricBusy(false)
    if (ok) {
      auth.unlockWithBiometric()
      setStage('success')
      setTimeout(() => {
        navigate('/', { replace: true })
        runBackgroundPull(importSnapshot)
      }, 750)
    } else {
      setBiometricError(true)
      setTimeout(() => setBiometricError(false), 2500)
    }
  }

  useEffect(() => {
    if (biometricAvailable) handleBiometric()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleDigit(d: string) {
    if (stage !== 'input' || error || value.length >= digits) return
    const next = value + d
    setValue(next)
    if (next.length === digits) {
      const ok = await auth.login(next)
      if (ok) {
        haptic('success')
        setStage('success')
        setTimeout(() => {
          navigate('/', { replace: true })
          // يسحب أحدث نسخة من جوجل شيت بالخلفية بدل ما يحجب الدخول للتطبيق —
          // حالة السحب تظهر كشريط عائم أعلى الشاشة (IslandHost).
          runBackgroundPull(importSnapshot)
        }, 750)
      } else {
        haptic('warning')
        setError(true)
        setTimeout(() => {
          setError(false)
          setValue('')
        }, 700)
      }
    }
  }

  function handleBackspace() {
    if (stage !== 'input' || error) return
    setValue((v) => v.slice(0, -1))
  }

  const hour = new Date().getHours()
  // الاسم والصورة بشاشة القفل فقط لو المستخدم فعّلها من الملف الشخصي (مطفأة افتراضيًا للخصوصية).
  const profile = getProfile()
  const showName = Boolean(profile?.prefs.nameOnLock && profile.name.trim())
  const base = hour >= 5 && hour < 12 ? 'صباح الخير' : hour >= 5 && hour < 17 ? 'نهارك سعيد' : 'مساء الخير'
  const greeting = showName ? `${hour >= 5 && hour < 12 ? 'صباح الخير' : 'أهلًا'} ${profile!.name.trim()}` : base

  return (
    <div className="relative isolate flex h-full w-full flex-col items-center overflow-hidden bg-[var(--color-bg)]">
      <LockBackground variant={background} curve={curve} ringsAt={padVisible ? 0.36 : 0.74} />

      <div className="relative z-10 flex h-full w-full flex-col items-center px-7 pb-8 pt-16">
        <div className="qb-rise flex flex-col items-center">
          {showClock ? (
            <>
              <div className="num text-[64px] font-bold leading-none" style={{ letterSpacing: '-0.04em', textShadow: '0 2px 20px rgba(5,5,6,0.8)' }}>
                {String(now.getHours()).padStart(2, '0')}:{String(now.getMinutes()).padStart(2, '0')}
              </div>
              <div className="mb-3 mt-1.5 text-[13px] text-[var(--color-text-2)]">
                {DAYS_AR[now.getDay()]}، <span className="num">{now.getDate()}</span> {MONTHS_AR[now.getMonth()]}
              </div>
            </>
          ) : (
            <>
              {showName && profile ? <ProfileAvatar profile={profile} size={78} /> : <AppLogo tagline="" size={52} />}
              <div className={`mb-1 text-[20px] font-semibold ${showName ? 'mt-5' : 'mt-9'}`}>{greeting}</div>
            </>
          )}
          <div className="h-5 text-[13px]" style={{ color: error || biometricError ? 'var(--color-expense)' : 'var(--color-text-2)' }}>
            {error
              ? 'رقم غير صحيح، حاول مرة أخرى'
              : biometricError
                ? 'تعذّر التحقق بالبصمة — جرّب مرة أخرى أو استخدم الرقم السري'
                : biometricBusy
                  ? 'جارٍ التحقق…'
                  : padVisible
                    ? 'أدخل رقمك السري للمتابعة'
                    : showClock
                      ? greeting
                      : 'افتح ببصمتك'}
          </div>
        </div>

        {!padVisible ? (
          // البصمة أولًا: زر زجاجي كبير يطلب التحقق، والرقم السري متاح بزر صغير.
          <div className="mt-auto flex flex-col items-center gap-3.5" style={{ animation: 'qb-rise 520ms var(--ease-out-expo) both' }}>
            <button
              type="button"
              onClick={handleBiometric}
              disabled={biometricBusy || stage !== 'input'}
              aria-label="افتح ببصمة الإصبع"
              className="qb-press relative flex h-[110px] w-[110px] items-center justify-center rounded-full text-[var(--color-text)]"
            >
              {!biometricBusy && <span className="qb-bio-halo" />}
              <span
                className="absolute inset-0 rounded-full border"
                style={{
                  background: 'rgba(28,28,33,0.75)',
                  borderColor: biometricError ? 'var(--color-expense)' : 'var(--color-border-strong)',
                  backdropFilter: 'blur(20px) saturate(1.6)',
                  WebkitBackdropFilter: 'blur(20px) saturate(1.6)',
                  boxShadow: '0 20px 50px -20px rgba(0,0,0,0.9)',
                  transition: 'border-color 200ms ease',
                }}
              />
              {biometricBusy && <span className="qb-bio-arc" />}
              <span className="relative" style={{ color: biometricError ? 'var(--color-expense)' : undefined }}>
                <FingerprintIcon size={42} />
              </span>
            </button>
            <div className="text-[12.5px] text-[var(--color-text-2)]">{biometricBusy ? 'ضع إصبعك على المستشعر' : 'المس للفتح'}</div>
            <button
              type="button"
              onClick={() => {
                haptic('tick')
                setPadVisible(true)
              }}
              className="qb-press mt-3 rounded-full border border-[var(--color-border)] bg-white/[0.06] px-4.5 py-2.5 text-[12.5px] font-semibold"
              style={{ paddingInline: 18 }}
            >
              استخدم الرقم السري
            </button>
          </div>
        ) : (
        <div className="mt-auto" style={{ animation: 'qb-rise 420ms var(--ease-out-expo) both' }}>
          <PinPad
            digits={digits}
            value={value}
            onDigit={handleDigit}
            onBackspace={handleBackspace}
            disabled={stage !== 'input' || error}
            error={error}
            success={stage === 'success'}
            extraKey={
              biometricAvailable ? (
                <button
                  type="button"
                  onClick={handleBiometric}
                  disabled={biometricBusy || stage !== 'input'}
                  aria-label="افتح ببصمة الإصبع"
                  className="flex h-[76px] w-[76px] items-center justify-center rounded-full text-[var(--color-accent)] transition-transform active:scale-90 disabled:opacity-50"
                  style={{ animation: biometricBusy ? 'qb-hint-up 1.2s ease-in-out infinite' : undefined }}
                >
                  <FingerprintIcon />
                </button>
              ) : undefined
            }
          />
        </div>
        )}

        <div className="mt-8 flex w-full items-center justify-between px-2 text-[12px]">
          <button type="button" onClick={() => auth.forgetPin()} className="text-[var(--color-text-2)]">
            نسيت الرقم السري؟
          </button>
          <div className="num text-[var(--color-text-3)]">v{APP_VERSION}</div>
        </div>
      </div>

      {stage === 'success' && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-5 bg-[var(--color-bg)]" style={{ animation: 'fade-in 200ms ease-out both' }}>
          <div className="relative flex items-center justify-center">
            <span className="absolute h-20 w-20 rounded-full border-2 border-[var(--color-accent)]" style={{ animation: 'qb-ring 900ms var(--ease-out-expo) both' }} />
            <div
              className="flex items-center justify-center rounded-full"
              style={{ width: 80, height: 80, background: 'var(--color-accent)', animation: 'qb-pop 520ms var(--ease-spring) both', boxShadow: '0 0 60px -6px rgba(255,255,255,0.35)' }}
            >
              <svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="var(--color-on-accent)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="5,13 10,18 19,6" />
              </svg>
            </div>
          </div>
          <div className="text-[17px] font-semibold">أهلًا بعودتك</div>
        </div>
      )}
    </div>
  )
}
