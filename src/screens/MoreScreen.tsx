import { useMemo, useState, type CSSProperties } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../state/AuthContext'
import { forceAppUpdate } from '../lib/cache'
import { recordMoreVisit, topUsedRoutes } from '../lib/moreUsage'
import { getLastSyncedAt, isSheetsSyncConfigured } from '../lib/sheetsSync'
import { formatDate } from '../lib/format'
import { APP_VERSION } from '../lib/version'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { AppLogo, AppLogoMark } from '../components/AppLogo'

/** خلفية متدرّجة خفيفة + حد شفاف بلون العنصر — بدل تعبئة مسطّحة موحّدة لكل شارات الأيقونات، يعطي إحساس "بنكي فاخر" بدل flat design. يعمل مع أي قيمة لون CSS (متغيّر أو حرفي) عبر color-mix. */
function iconBadgeStyle(color: string): CSSProperties {
  return {
    background: `linear-gradient(135deg, color-mix(in srgb, ${color} 18%, transparent), color-mix(in srgb, ${color} 5%, transparent))`,
    border: `1px solid color-mix(in srgb, ${color} 22%, transparent)`,
    color,
  }
}

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
function ExportIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 15V4M12 4 8 8M12 4l4 4" />
      <path d="M4 15v4a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4" />
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
function CalculatorIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="3" width="16" height="18" rx="2.5" />
      <path d="M7.5 7.5h9" />
      <circle cx="8" cy="12.3" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12.3" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="16" cy="12.3" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="8" cy="16.3" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="12" cy="16.3" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="16" cy="16.3" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  )
}
function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3 19 6v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3Z" />
      <path d="M9.3 12 11 13.7 15 9.5" />
    </svg>
  )
}
function CarIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 13.5 5 8a2 2 0 0 1 1.9-1.4h10.2A2 2 0 0 1 19 8l2 5.5" />
      <path d="M2.5 13.5h19v4a1 1 0 0 1-1 1h-1.5a1 1 0 0 1-1-1v-1h-11v1a1 1 0 0 1-1 1H4.5a1 1 0 0 1-1-1v-4Z" />
      <circle cx="7" cy="15.5" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="17" cy="15.5" r="1.3" fill="currentColor" stroke="none" />
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

function ChevronIcon() {
  return (
    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15,6 9,12 15,18" />
    </svg>
  )
}

function ListRow({ item, onClick, showDesc = true }: { item: MoreItem; onClick: () => void; showDesc?: boolean }) {
  return (
    <button onClick={onClick} className="qb-press flex w-full items-center gap-3 px-4 py-3 text-right">
      <div className="flex h-9.5 w-9.5 flex-shrink-0 items-center justify-center rounded-[12px]" style={{ width: 38, height: 38, ...iconBadgeStyle(item.color) }}>
        {item.icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] font-bold">{item.label}</div>
        {showDesc && <div className="truncate text-[11px] text-[var(--color-text-3)]">{item.desc}</div>}
      </div>
      <div className="flex-shrink-0 text-[var(--color-text-3)]">
        <ChevronIcon />
      </div>
    </button>
  )
}

function GridTile({ item, onClick, elevated = false }: { item: MoreItem; onClick: () => void; elevated?: boolean }) {
  return (
    <button onClick={onClick} className={`${elevated ? 'qb-card-elevated' : 'qb-card'} qb-press flex flex-col items-center gap-2 p-3.5 text-center`}>
      <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-[14px]" style={{ width: 44, height: 44, ...iconBadgeStyle(item.color) }}>
        {item.icon}
      </div>
      <div className="text-[11.5px] font-semibold leading-tight">{item.label}</div>
    </button>
  )
}

function FeatureCard({ item, onClick }: { item: MoreItem; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="qb-press flex flex-col items-start gap-5 rounded-[20px] border border-[var(--color-border)] p-4 text-right"
      style={{ background: `radial-gradient(120% 120% at 100% 0%, color-mix(in srgb, ${item.color} 14%, transparent), transparent 60%), var(--color-surface)` }}
    >
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-[13px]" style={{ width: 40, height: 40, ...iconBadgeStyle(item.color) }}>
        {item.icon}
      </div>
      <div>
        <div className="mb-0.5 text-[13px] font-bold">{item.label}</div>
        <div className="text-[10.5px] leading-snug text-[var(--color-text-3)]">{item.desc}</div>
      </div>
    </button>
  )
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
}

const SECTIONS: { title: string; layout?: 'grid' | 'feature'; items: MoreItem[] }[] = [
  {
    title: 'البيانات المالية',
    layout: 'grid',
    items: [
      { label: 'كل الحركات', desc: 'بحث وتعديل بكل حركاتك المسجّلة', to: '/transactions', icon: <SearchIcon />, color: 'var(--color-accent)' },
      { label: 'فئات المصاريف', desc: 'إدارة فئات المصروفات والميزانيات', to: '/categories', icon: <TagIcon />, color: 'var(--color-expense)' },
      { label: 'مصادر الدخل', desc: 'إدارة مصادر دخلك المتعددة', to: '/income-sources', icon: <IncomeIcon />, color: 'var(--color-income)' },
    ],
  },
  {
    title: 'أدوات',
    items: [
      { label: 'الآلة الحاسبة', desc: 'عمليات حسابية عادية، أو تقسيم حساب على أشخاص', to: '/calculator', icon: <CalculatorIcon />, color: 'var(--color-transfer)' },
    ],
  },
  {
    title: 'الدوري والمتكرر',
    items: [
      { label: 'الاشتراكات', desc: 'يوتيوب، Google Play، وغيرها', to: '/subscriptions', icon: <SubscriptionIcon />, color: 'var(--color-subscription)' },
      { label: 'الالتزامات', desc: 'تجديد الهوية، عقود، رخص، والتزامات دورية أخرى', to: '/commitments', icon: <CommitmentIcon />, color: 'var(--color-commitment)' },
      { label: 'الحركات المتكررة', desc: 'راتب أو أي حركة بمبلغ متغيّر تحتاج تأكيد قبل تسجيلها', to: '/recurring', icon: <RecurringIcon />, color: 'var(--color-transfer)' },
    ],
  },
  {
    title: 'الادخار والسيارة',
    layout: 'feature',
    items: [
      { label: 'الأهداف', desc: 'تتبّع أهداف الادخار وموعد تحقيقها', to: '/goals', icon: <GoalIcon />, color: 'var(--color-subscription)' },
      { label: 'صيانة السيارة', desc: 'العداد، الزيت، والوقود', to: '/vehicle', icon: <CarIcon />, color: 'var(--color-vehicle)' },
    ],
  },
  {
    title: 'التقارير والتحليلات',
    layout: 'grid',
    items: [
      { label: 'التقارير', desc: 'مؤشر الصحة المالية، اتجاه 6 أشهر، وتوزيع الفئات', to: '/reports', icon: <ChartIcon />, color: 'var(--color-transfer)' },
      { label: 'المقارنة الشخصية', desc: 'قارن دخلك ومصاريفك شهريًا، ربع سنويًا، أو سنويًا', to: '/comparisons', icon: <CompareIcon />, color: 'var(--color-income)' },
      { label: 'تصدير التقرير', desc: 'ملف PDF جاهز للطباعة A4 أو ملف Excel منسّق', to: '/export-report', icon: <ExportIcon />, color: 'var(--color-subscription)' },
    ],
  },
  {
    title: 'الحساب والنظام',
    items: [
      { label: 'الأمان والخصوصية', desc: 'الرقم السري، البصمة، وإخفاء الأرصدة', to: '/security', icon: <ShieldIcon />, color: 'var(--color-income)' },
      { label: 'مزامنة Google Sheets', desc: 'نسخة احتياطية تلقائية لجدولك', to: '/sync-settings', icon: <CloudSyncIcon />, color: 'var(--color-owed-to)' },
      { label: 'حول التطبيق', desc: 'الإصدار، المطوّر، ومعلومات عن QB-Nomia', to: '/about', icon: <InfoIcon />, color: 'var(--color-text-2)' },
    ],
  },
]

const ALL_ITEMS: MoreItem[] = SECTIONS.flatMap((s) => s.items)

export function MoreScreen() {
  const navigate = useNavigate()
  const auth = useAuth()
  const [busy, setBusy] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [query, setQuery] = useState('')

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

  function goTo(item: MoreItem) {
    recordMoreVisit(item.to)
    navigate(item.to)
  }

  const topItems = useMemo(() => {
    const routes = topUsedRoutes(3)
    return routes.map((r) => ALL_ITEMS.find((i) => i.to === r)).filter((i): i is MoreItem => Boolean(i))
  }, [])

  const trimmedQuery = query.trim()
  const searchResults = trimmedQuery ? ALL_ITEMS.filter((i) => i.label.includes(trimmedQuery)) : null

  const lastSynced = isSheetsSyncConfigured() ? getLastSyncedAt() : null
  const statusLine = lastSynced ? `آخر مزامنة: ${formatDate(lastSynced)}` : `الإصدار ${APP_VERSION}`

  return (
    <div dir="rtl" className="px-5 pb-4">
      {busy && <UpdatingOverlay />}

      <ConfirmDialog
        open={confirmOpen}
        title="تحديث التطبيق"
        message="سيتم تحديث التطبيق لأحدث نسخة وإعادة تحميله. بياناتك المالية لن تتأثر."
        confirmLabel="تحديث الآن"
        onConfirm={confirmUpdateApp}
        onCancel={() => setConfirmOpen(false)}
      />

      <div className="safe-top qb-sticky-header-row mb-6 flex items-center gap-3 pt-15">
        <AppLogoMark size={46} />
        <div className="min-w-0">
          <div className="mb-0.5 text-[11.5px] font-bold text-[var(--color-text-3)]">المزيد</div>
          <div className="truncate text-[12px] font-semibold text-[var(--color-text-2)]">{statusLine}</div>
        </div>
      </div>

      {!searchResults && topItems.length > 0 && (
        <div className="mb-5">
          <div className="qb-section-label mb-2 px-1">الأكثر استخدامًا</div>
          <div className="grid grid-cols-3 gap-2.5">
            {topItems.map((item) => (
              <GridTile key={item.label} item={item} onClick={() => goTo(item)} elevated />
            ))}
          </div>
        </div>
      )}

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="ابحث بالاسم..."
        className="mb-5 w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5 text-[13.5px] outline-none placeholder:text-[var(--color-text-3)]"
      />

      {searchResults ? (
        searchResults.length === 0 ? (
          <div className="qb-card py-8 text-center text-[13px] text-[var(--color-text-3)]">لا توجد نتائج مطابقة</div>
        ) : (
          <div className="qb-card mb-5 overflow-hidden">
            {searchResults.map((item, i) => (
              <div key={item.label} className={i > 0 ? 'border-t qb-divider' : ''}>
                <ListRow item={item} onClick={() => goTo(item)} />
              </div>
            ))}
          </div>
        )
      ) : (
        SECTIONS.map((section) => (
          <div key={section.title} className="mb-5">
            <div className="qb-section-label mb-2 px-1">{section.title}</div>
            {section.layout === 'grid' ? (
              <div className="grid grid-cols-3 gap-2.5">
                {section.items.map((item) => (
                  <GridTile key={item.label} item={item} onClick={() => goTo(item)} />
                ))}
              </div>
            ) : section.layout === 'feature' ? (
              <div className="grid grid-cols-2 gap-2.5">
                {section.items.map((item) => (
                  <FeatureCard key={item.label} item={item} onClick={() => goTo(item)} />
                ))}
              </div>
            ) : (
              <div className="qb-card overflow-hidden">
                {section.items.map((item, i) => (
                  <div key={item.label} className={i > 0 ? 'border-t qb-divider' : ''}>
                    <ListRow item={item} onClick={() => goTo(item)} />
                  </div>
                ))}
              </div>
            )}
          </div>
        ))
      )}

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
