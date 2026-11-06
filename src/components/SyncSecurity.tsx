import { useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useData } from '../state/DataContext'
import { useSyncConflict } from '../hooks/useSyncConflict'
import { getSheetsWebAppUrl, getSyncScheme, isSheetsSyncConfigured } from '../config/sheetsSync'
import { useTokenChanged } from '../hooks/useTokenChanged'
import { probeSheets, saveSyncCredentials } from '../lib/sheetsSync'
import { runBackgroundPull } from '../lib/autoSync'
import { notify } from '../lib/notify'

const SUB = 'var(--color-subscription)'
const OWED = 'var(--color-owed-to)'

function Icon({ children, size = 20 }: { children: ReactNode; size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  )
}
const KeyIcon = () => <Icon><path d="M8 11a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM11 12l9-9M17 6l3 3M15 8l2 2" /></Icon>
const ShieldIcon = () => <Icon><path d="M12 3 5 6v6c0 4.2 2.9 7.6 7 9 4.1-1.4 7-4.8 7-9V6zM9 12l2 2 4-4" /></Icon>

function Tinted({ color, icon, title, children, className = '' }: { color: string; icon: ReactNode; title: string; children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-[22px] border p-3.5 ${className}`} style={{ background: `color-mix(in srgb, ${color} 9%, var(--color-surface))`, borderColor: `color-mix(in srgb, ${color} 32%, transparent)` }}>
      <div className="flex items-start gap-3">
        <span className="flex h-[38px] w-[38px] flex-none items-center justify-center rounded-[13px]" style={{ background: `color-mix(in srgb, ${color} 16%, transparent)`, color }}>
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[13.5px] font-semibold">{title}</div>
          {children}
        </div>
      </div>
    </div>
  )
}

/**
 * «رمز المزامنة تغيّر»: جهاز ثاني حدّث حماية المزامنة برمز جديد. `compact` للرئيسية (يوصّل للمزامنة)،
 * والكامل في شاشة المزامنة فيه حقل الرمز الجديد.
 */
export function SyncTokenChangedCard({ compact = false, className = '' }: { compact?: boolean; className?: string }) {
  const changed = useTokenChanged()
  const navigate = useNavigate()
  const { importSnapshot, exportSnapshot } = useData()
  const [token, setToken] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  if (!changed || !isSheetsSyncConfigured()) return null

  if (compact) {
    return (
      <Tinted color={SUB} icon={<KeyIcon />} title="رمز المزامنة تغيّر" className={className}>
        <div className="mt-0.5 text-[12px] leading-[1.7] text-[var(--color-text-2)]">حدّثت حماية المزامنة من جهاز ثاني. دخّل الرمز الجديد هنا مرة وحدة.</div>
        <button type="button" onClick={() => navigate('/sync-settings')} className="qb-press mt-2.5 inline-flex h-[34px] items-center rounded-full bg-[var(--color-accent)] px-3.5 text-[12.5px] font-bold text-[var(--color-on-accent)]">
          دخّل الرمز الجديد
        </button>
      </Tinted>
    )
  }

  async function verify() {
    const clean = token.replace(/\s+/g, '')
    if (!clean) return
    setBusy(true)
    setError('')
    try {
      const url = getSheetsWebAppUrl()
      const { scheme } = await probeSheets(url, clean)
      saveSyncCredentials(url, clean, scheme)
      setToken('')
      notify('success', 'رجعت المزامنة بالرمز الجديد')
      // تعديلات معلّقة ترتفع (مع فحص التعارض)، وإلا نسحب آخر نسخة.
      runBackgroundPull(importSnapshot, exportSnapshot)
    } catch {
      setError('الرمز ما يطابق. تأكد إنه الرمز الجديد من الجهاز اللي حدّثته.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Tinted color={SUB} icon={<KeyIcon />} title="رمز المزامنة تغيّر" className={className}>
      <div className="mt-0.5 text-[12px] leading-[1.7] text-[var(--color-text-2)]">حدّثت حماية المزامنة من جهاز ثاني. دخّل الرمز الجديد هنا مرة وحدة، وبعدها نجيب آخر نسخة من Google Sheets.</div>
      <label className="mt-3 block text-[12px] font-semibold text-[var(--color-text-3)]" htmlFor="new-sync-token">
        الرمز الجديد
      </label>
      <input
        id="new-sync-token"
        dir="ltr"
        value={token}
        onChange={(e) => setToken(e.target.value)}
        autoComplete="off"
        autoCapitalize="off"
        spellCheck={false}
        placeholder="Kp7mWx2Q nR9vTz4H …"
        className="mt-1.5 h-12 w-full rounded-[15px] border border-[var(--color-border-strong)] bg-[var(--color-void)] px-3.5 font-mono text-[14px] outline-none focus:border-[var(--color-accent-line)]"
      />
      {error && <div className="mt-2 text-[12px] text-[var(--color-expense)]">{error}</div>}
      <button type="button" onClick={verify} disabled={busy || !token.trim()} className="qb-press mt-3 h-11 w-full rounded-[15px] bg-[var(--color-accent)] text-[13.5px] font-bold text-[var(--color-on-accent)] disabled:opacity-40">
        {busy ? 'جارٍ التحقق…' : 'تحقق وكمّل'}
      </button>
    </Tinted>
  )
}

function Row({ color, children }: { color: string; children: ReactNode }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="h-[7px] w-[7px] flex-none rounded-full" style={{ background: color }} />
      {children}
    </div>
  )
}

/** بطاقة «حدّث حماية المزامنة» في شاشة المزامنة — للمستخدم على الصيغة القديمة (v1) فقط. */
export function SyncUpgradeCard({ className = '' }: { className?: string }) {
  const navigate = useNavigate()
  const conflict = useSyncConflict()
  const changed = useTokenChanged()
  if (!isSheetsSyncConfigured() || getSyncScheme() !== 'v1' || conflict || changed) return null
  return (
    <Tinted color={OWED} icon={<ShieldIcon />} title="حدّث حماية المزامنة" className={className}>
      <div className="mt-0.5 text-[12px] leading-[1.75] text-[var(--color-text-2)]">
        رمزك الحالي مكتوب داخل كود Apps Script، فأي أحد يوصل لحساب Google حقك يقدر يفك تشفير بياناتك. التحديث يخلي السكربت يعرف «مفتاح دخول» فقط، ومفتاح التشفير ما يطلع من أجهزتك.
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-[11.5px] leading-[1.7] text-[var(--color-text-2)]">
        <div className="rounded-[16px] border border-[var(--color-border)] bg-[var(--color-void)] p-2.5">
          <div className="mb-1 text-[11px] font-bold" style={{ color: SUB }}>الحين</div>
          <Row color={SUB}>السكربت يقدر يفك بياناتك</Row>
          <Row color={SUB}>الرمز يمر في الرابط</Row>
        </div>
        <div className="rounded-[16px] border border-[var(--color-border)] bg-[var(--color-void)] p-2.5">
          <div className="mb-1 text-[11px] font-bold text-[var(--color-income)]">بعد التحديث</div>
          <Row color="var(--color-income)">السكربت ما يقدر يفكها</Row>
          <Row color="var(--color-income)">الرمز ما يمر بأي رابط</Row>
        </div>
      </div>
      <button type="button" onClick={() => navigate('/sync-settings/upgrade')} className="qb-press mt-3 h-11 w-full rounded-[15px] bg-[var(--color-accent)] text-[13.5px] font-bold text-[var(--color-on-accent)]">
        حدّث الحماية (حوالي 3 دقائق)
      </button>
    </Tinted>
  )
}
