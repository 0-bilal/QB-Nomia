import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../state/AuthContext'
import { forceAppUpdate } from '../lib/cache'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { AppLogo } from '../components/AppLogo'
import { BiometricToggleRow } from '../components/BiometricToggleRow'

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
function CommitmentIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="3" width="16" height="18" rx="2.5" />
      <path d="M8 8h8M8 12h8M8 16h5" />
    </svg>
  )
}
function RecurringIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 11A8 8 0 0 0 6.3 6.3L4 8.6" />
      <path d="M4 4v4.6h4.6" />
      <path d="M4 13a8 8 0 0 0 13.7 4.7L20 15.4" />
      <path d="M20 20v-4.6h-4.6" />
    </svg>
  )
}
function GoalIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" />
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
function CompareIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 3v14M8 17l-3.5-3.5M8 17l3.5-3.5" />
      <path d="M16 21V7M16 7l-3.5 3.5M16 7l3.5 3.5" />
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

interface MoreItem {
  label: string
  desc: string
  to: string
  icon: React.ReactElement
  color: string
  bg: string
}

const SECTIONS: { title: string; items: MoreItem[] }[] = [
  {
    title: 'البيانات المالية',
    items: [
      { label: 'كل الحركات', desc: 'بحث وتعديل بكل حركاتك المسجّلة', to: '/transactions', icon: <SearchIcon />, color: 'var(--color-accent)', bg: 'rgba(255,255,255,0.12)' },
      { label: 'فئات المصاريف', desc: 'إدارة فئات المصروفات والميزانيات', to: '/categories', icon: <TagIcon />, color: 'var(--color-expense)', bg: 'rgba(255,92,92,0.12)' },
      { label: 'مصادر الدخل', desc: 'إدارة مصادر دخلك المتعددة', to: '/income-sources', icon: <IncomeIcon />, color: 'var(--color-income)', bg: 'rgba(34,197,94,0.12)' },
    ],
  },
  {
    title: 'الدوري والمتكرر',
    items: [
      { label: 'الاشتراكات', desc: 'يوتيوب، Google Play، وغيرها', to: '/subscriptions', icon: <SubscriptionIcon />, color: 'var(--color-subscription)', bg: 'rgba(245,185,66,0.12)' },
      { label: 'الالتزامات', desc: 'تجديد الهوية، عقود، رخص، والتزامات دورية أخرى', to: '/commitments', icon: <CommitmentIcon />, color: 'var(--color-commitment)', bg: 'rgba(96,165,250,0.12)' },
      { label: 'الحركات المتكررة', desc: 'راتب أو أي حركة بمبلغ متغيّر تحتاج تأكيد قبل تسجيلها', to: '/recurring', icon: <RecurringIcon />, color: 'var(--color-transfer)', bg: 'rgba(124,108,255,0.12)' },
    ],
  },
  {
    title: 'الادخار',
    items: [
      { label: 'الأهداف', desc: 'تتبّع أهداف الادخار وموعد تحقيقها', to: '/goals', icon: <GoalIcon />, color: 'var(--color-subscription)', bg: 'rgba(245,185,66,0.12)' },
    ],
  },
  {
    title: 'التقارير والتحليلات',
    items: [
      { label: 'التقارير', desc: 'مؤشر الصحة المالية، اتجاه 6 أشهر، وتوزيع الفئات', to: '/reports', icon: <ChartIcon />, color: 'var(--color-transfer)', bg: 'rgba(124,108,255,0.12)' },
      { label: 'المقارنة الشخصية', desc: 'قارن دخلك ومصاريفك شهريًا، ربع سنويًا، أو سنويًا', to: '/comparisons', icon: <CompareIcon />, color: 'var(--color-income)', bg: 'rgba(34,197,94,0.12)' },
    ],
  },
  {
    title: 'الحساب والنظام',
    items: [
      { label: 'مزامنة Google Sheets', desc: 'نسخة احتياطية تلقائية لجدولك', to: '/sync-settings', icon: <CloudSyncIcon />, color: 'var(--color-owed-to)', bg: 'rgba(45,212,191,0.12)' },
      { label: 'حول التطبيق', desc: 'الإصدار، المطوّر، ومعلومات عن QB-Nomia', to: '/about', icon: <InfoIcon />, color: 'var(--color-text-2)', bg: 'rgba(255,255,255,0.06)' },
    ],
  },
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

      {SECTIONS.map((section) => (
        <div key={section.title} className="mb-5">
          <div className="qb-section-label mb-2 px-1">{section.title}</div>
          <div className="qb-card overflow-hidden">
            {section.items.map((item, i) => (
              <button
                key={item.label}
                onClick={() => navigate(item.to)}
                className={`qb-press flex w-full items-center gap-3 px-4 py-3 text-right ${i > 0 ? 'border-t qb-divider' : ''}`}
              >
                <div
                  className="flex h-9.5 w-9.5 flex-shrink-0 items-center justify-center rounded-[12px]"
                  style={{ width: 38, height: 38, background: item.bg, color: item.color }}
                >
                  {item.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-bold">{item.label}</div>
                  <div className="truncate text-[11px] text-[var(--color-text-3)]">{item.desc}</div>
                </div>
                <div className="flex-shrink-0 text-[var(--color-text-3)]">
                  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="15,6 9,12 15,18" />
                  </svg>
                </div>
              </button>
            ))}
          </div>
        </div>
      ))}

      <BiometricToggleRow />

      <button
        onClick={() => setConfirmOpen(true)}
        disabled={busy}
        className="qb-press mb-6 flex w-full items-center gap-3.5 rounded-2xl border px-4 py-3.5 text-right disabled:opacity-60"
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
        className="qb-press flex w-full items-center justify-center gap-2 rounded-2xl border border-[var(--color-border)] py-3.5 text-center text-[13.5px] font-semibold text-[var(--color-text-2)]"
      >
        <LockIcon />
        قفل التطبيق
      </button>
    </div>
  )
}
