import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../state/AuthContext'
import { forceAppUpdate } from '../lib/cache'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { AppLogo } from '../components/AppLogo'

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7" />
      <line x1="21" y1="21" x2="16.5" y2="16.5" />
    </svg>
  )
}
function TagIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3h6a2 2 0 0 1 2 2v6L11 20l-8-8Z" />
      <circle cx="15.5" cy="8.5" r="1.3" fill="currentColor" stroke="none" />
    </svg>
  )
}
function IncomeIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="19" x2="12" y2="5" />
      <polyline points="6,11 12,5 18,11" />
    </svg>
  )
}
function SubscriptionIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="8,6 18,12 8,18" />
    </svg>
  )
}
function ChartIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 20V10M12 20V4M20 20v-7" />
    </svg>
  )
}
function CloudSyncIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.5 19a4.5 4.5 0 0 0 0-9 6 6 0 0 0-11.4-1.8A4 4 0 0 0 6.5 16" />
      <path d="M12 12v6M9.5 15.5 12 18l2.5-2.5" />
    </svg>
  )
}
function InfoIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <line x1="12" y1="11" x2="12" y2="16.5" />
      <circle cx="12" cy="7.7" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  )
}
function RefreshIcon({ spinning }: { spinning: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={spinning ? { animation: 'spin 900ms linear infinite' } : undefined}
    >
      <path d="M20 11A8 8 0 0 0 6.3 6.3L4 8.6" />
      <path d="M4 4v4.6h4.6" />
      <path d="M4 13a8 8 0 0 0 13.7 4.7L20 15.4" />
      <path d="M20 20v-4.6h-4.6" />
    </svg>
  )
}
function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4.5" y="11" width="15" height="9" rx="2.5" />
      <path d="M7.5 11V7.5a4.5 4.5 0 0 1 9 0V11" />
    </svg>
  )
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function UpdatingOverlay() {
  return (
    <div dir="rtl" className="fixed inset-0 z-[70] flex flex-col items-center justify-center gap-5 bg-[var(--color-bg)]">
      <AppLogo tagline="" />
      <div
        className="h-8 w-8 rounded-full border-2"
        style={{ borderColor: 'var(--color-border)', borderTopColor: 'var(--color-accent)', animation: 'spin 700ms linear infinite' }}
      />
      <div className="text-[13px] font-semibold text-[var(--color-text-2)]">جارٍ تحديث التطبيق...</div>
    </div>
  )
}

const ITEMS = [
  { label: 'كل الحركات', desc: 'بحث وتعديل بكل حركاتك المسجّلة', to: '/transactions', icon: <SearchIcon />, color: 'var(--color-accent)', bg: 'rgba(255,255,255,0.12)' },
  { label: 'فئات المصاريف', desc: 'إدارة فئات المصروفات والميزانيات', to: '/categories', icon: <TagIcon />, color: 'var(--color-expense)', bg: 'rgba(255,92,92,0.12)' },
  { label: 'مصادر الدخل', desc: 'إدارة مصادر دخلك المتعددة', to: '/income-sources', icon: <IncomeIcon />, color: 'var(--color-income)', bg: 'rgba(34,197,94,0.12)' },
  { label: 'الاشتراكات', desc: 'يوتيوب، Google Play، وغيرها', to: '/subscriptions', icon: <SubscriptionIcon />, color: 'var(--color-subscription)', bg: 'rgba(245,185,66,0.12)' },
  { label: 'التقارير', desc: 'مؤشر الصحة المالية، اتجاه 6 أشهر، وتوزيع الفئات', to: '/reports', icon: <ChartIcon />, color: 'var(--color-transfer)', bg: 'rgba(124,108,255,0.12)' },
  { label: 'مزامنة Google Sheets', desc: 'نسخة احتياطية تلقائية لجدولك', to: '/sync-settings', icon: <CloudSyncIcon />, color: 'var(--color-owed-to)', bg: 'rgba(45,212,191,0.12)' },
  { label: 'حول التطبيق', desc: 'الإصدار، المطوّر، ومعلومات عن QB-Nomia', to: '/about', icon: <InfoIcon />, color: 'var(--color-text-2)', bg: 'rgba(255,255,255,0.06)' },
]

export function MoreScreen() {
  const navigate = useNavigate()
  const auth = useAuth()
  const [busy, setBusy] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  async function confirmUpdateApp() {
    setConfirmOpen(false)
    setBusy(true)
    try {
      await Promise.all([forceAppUpdate(), delay(500)])
      window.location.reload()
    } catch {
      setBusy(false)
    }
  }

  return (
    <div dir="rtl" className="safe-top px-5 pb-4 pt-15">
      {busy && <UpdatingOverlay />}

      <ConfirmDialog
        open={confirmOpen}
        title="تحديث التطبيق"
        message="سيتم تحديث التطبيق لأحدث نسخة وإعادة تحميله. بياناتك المالية لن تتأثر."
        confirmLabel="تحديث الآن"
        onConfirm={confirmUpdateApp}
        onCancel={() => setConfirmOpen(false)}
      />

      <div className="mb-5 text-xl font-bold">المزيد</div>

      <div className="mb-6 flex flex-col gap-2.5">
        {ITEMS.map((item) => (
          <button
            key={item.label}
            onClick={() => navigate(item.to)}
            className="flex items-center gap-3.5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3.5 text-right"
          >
            <div
              className="flex h-10.5 w-10.5 flex-shrink-0 items-center justify-center rounded-[13px]"
              style={{ width: 42, height: 42, background: item.bg, color: item.color }}
            >
              {item.icon}
            </div>
            <div className="flex-1">
              <div className="text-[13.5px] font-bold">{item.label}</div>
              <div className="text-[11.5px] text-[var(--color-text-3)]">{item.desc}</div>
            </div>
          </button>
        ))}
      </div>

      <button
        onClick={() => setConfirmOpen(true)}
        disabled={busy}
        className="mb-6 flex w-full items-center gap-3.5 rounded-2xl border px-4 py-3.5 text-right disabled:opacity-60"
        style={{ borderColor: 'rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.08)' }}
      >
        <div
          className="flex h-10.5 w-10.5 flex-shrink-0 items-center justify-center rounded-[13px]"
          style={{ width: 42, height: 42, background: 'rgba(255,255,255,0.16)', color: 'var(--color-accent)' }}
        >
          <RefreshIcon spinning={busy} />
        </div>
        <div className="flex-1">
          <div className="text-[13.5px] font-bold" style={{ color: 'var(--color-accent)' }}>
            {busy ? 'جارٍ التحديث...' : 'تحديث التطبيق'}
          </div>
          <div className="text-[11.5px] text-[var(--color-text-3)]">يجيب أحدث نسخة من التطبيق فورًا — بياناتك المالية لا تتأثر</div>
        </div>
      </button>

      <button
        onClick={() => {
          auth.lock()
          navigate('/login', { replace: true })
        }}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-[var(--color-border)] py-3.5 text-center text-[13.5px] font-semibold text-[var(--color-text-2)]"
      >
        <LockIcon />
        قفل التطبيق
      </button>
    </div>
  )
}
