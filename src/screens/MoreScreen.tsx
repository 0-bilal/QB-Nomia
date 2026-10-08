import { useEffect, useMemo, useState, type ReactElement } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../state/AuthContext'
import { backgroundUpdateCheck, dismissUpdateDone, peekUpdateDone } from '../lib/appUpdate'
import { recordMoreVisit, topUsedRoutes } from '../lib/moreUsage'
import { getLastSyncedAt, isSheetsSyncConfigured } from '../lib/sheetsSync'
import { formatDate } from '../lib/format'
import { APP_VERSION } from '../lib/version'
import { AppUpdateSheet } from '../components/AppUpdateSheet'
import { TabHeader, HeaderIconButton } from '../components/TabHeader'
import { ListGroup, ListItem, SearchField } from '../components/ui'
import { rise } from '../lib/motion'

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
function RefreshIcon() {
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


/** أيقونة تطبيق بشبكة "المزيد" — دائرة/مربع ناعم أحادي اللون بنمط شاشة تطبيقات الهاتف، والتسمية تحتها بسطرين كحد أقصى. */
function AppTile({ label, icon, onClick, highlight = false, badge = false }: { label: string; icon: ReactElement; onClick: () => void; highlight?: boolean; badge?: boolean }) {
  return (
    <button onClick={onClick} className="qb-press flex flex-col items-center gap-2 text-center">
      <span
        className="relative flex items-center justify-center rounded-[20px] border"
        style={{
          width: 60,
          height: 60,
          background: highlight ? 'var(--color-accent)' : 'linear-gradient(160deg, var(--color-surface-high), var(--color-surface))',
          borderColor: highlight ? 'transparent' : 'var(--color-border)',
          color: highlight ? 'var(--color-on-accent)' : 'var(--color-text)',
          boxShadow: highlight ? '0 12px 26px -12px rgba(255,255,255,0.4)' : 'inset 0 1px 0 rgba(255,255,255,0.06)',
        }}
      >
        {icon}
        {badge && (
          <span
            aria-label="يتوفر تحديث"
            className="absolute rounded-full"
            style={{ top: -3, left: -3, width: 13, height: 13, background: 'var(--color-income)', border: '2.5px solid var(--color-bg)' }}
          />
        )}
      </span>
      <span className="line-clamp-2 min-h-[30px] text-[11.5px] font-medium leading-tight text-[var(--color-text-2)]">{label}</span>
    </button>
  )
}

interface MoreItem {
  /** اسم قصير يظهر تحت الأيقونة بالشبكة. */
  label: string
  /** الاسم الكامل — يُستخدم بالبحث ونتائجه. */
  full: string
  desc: string
  to: string
  icon: ReactElement
}

const SECTIONS: { title: string; items: MoreItem[] }[] = [
  {
    title: 'المالية',
    items: [
      { label: 'الحركات', full: 'كل الحركات', desc: 'بحث وتعديل بكل حركاتك', to: '/transactions', icon: <SearchIcon /> },
      { label: 'الفئات', full: 'فئات المصاريف', desc: 'الفئات والميزانيات', to: '/categories', icon: <TagIcon /> },
      { label: 'الدخل', full: 'مصادر الدخل', desc: 'مصادر دخلك المتعددة', to: '/income-sources', icon: <IncomeIcon /> },
      { label: 'الأهداف', full: 'أهداف الادخار', desc: 'تتبّع الأهداف والزكاة', to: '/goals', icon: <GoalIcon /> },
    ],
  },
  {
    title: 'الدوري',
    items: [
      { label: 'اشتراكات', full: 'الاشتراكات', desc: 'يوتيوب، Google Play، وغيرها', to: '/subscriptions', icon: <SubscriptionIcon /> },
      { label: 'التزامات', full: 'الالتزامات', desc: 'هوية، عقود، رخص', to: '/commitments', icon: <CommitmentIcon /> },
      { label: 'متكررة', full: 'الحركات المتكررة', desc: 'راتب أو حركة تحتاج تأكيد', to: '/recurring', icon: <RecurringIcon /> },
      { label: 'السيارة', full: 'صيانة السيارة', desc: 'العداد، الزيت، والوقود', to: '/vehicle', icon: <CarIcon /> },
    ],
  },
  {
    title: 'التقارير',
    items: [
      { label: 'تقارير', full: 'التقارير', desc: 'الصحة المالية والاتجاهات', to: '/reports', icon: <ChartIcon /> },
      { label: 'مقارنة', full: 'المقارنة الشخصية', desc: 'شهري، ربع سنوي، سنوي', to: '/comparisons', icon: <CompareIcon /> },
      { label: 'تصدير', full: 'تصدير التقرير', desc: 'PDF أو Excel', to: '/export-report', icon: <ExportIcon /> },
      { label: 'حاسبة', full: 'الآلة الحاسبة', desc: 'حساب أو تقسيم فاتورة', to: '/calculator', icon: <CalculatorIcon /> },
    ],
  },
  {
    title: 'النظام',
    items: [
      { label: 'الأمان', full: 'الأمان والخصوصية', desc: 'الرقم السري والبصمة', to: '/security', icon: <ShieldIcon /> },
      { label: 'مزامنة', full: 'المزامنة والنسخ الاحتياطي', desc: 'نسخة احتياطية مشفّرة', to: '/sync-settings', icon: <CloudSyncIcon /> },
      { label: 'حول', full: 'حول التطبيق', desc: 'الإصدار والمطوّر', to: '/about', icon: <InfoIcon /> },
    ],
  },
]

const ALL_ITEMS: MoreItem[] = SECTIONS.flatMap((s) => s.items)

export function MoreScreen() {
  const navigate = useNavigate()
  const auth = useAuth()
  // بعد إعادة تشغيل ناتجة عن التحديث، تفتح الورقة مباشرة على "تم التحديث" بالإصدار السابق والحالي.
  const [updateDone, setUpdateDone] = useState(peekUpdateDone)
  const [updateOpen, setUpdateOpen] = useState(updateDone !== null)
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [query, setQuery] = useState('')

  useEffect(() => {
    let alive = true
    backgroundUpdateCheck().then((res) => {
      if (alive && res?.available) setUpdateAvailable(true)
    })
    return () => {
      alive = false
    }
  }, [])

  function closeUpdateSheet() {
    setUpdateOpen(false)
    setUpdateDone(null)
    dismissUpdateDone()
  }

  function goTo(item: MoreItem) {
    recordMoreVisit(item.to)
    navigate(item.to)
  }

  const topItems = useMemo(() => {
    const routes = topUsedRoutes(4)
    return routes.map((r) => ALL_ITEMS.find((i) => i.to === r)).filter((i): i is MoreItem => Boolean(i))
  }, [])

  const trimmedQuery = query.trim()
  const searchResults = trimmedQuery ? ALL_ITEMS.filter((i) => i.full.includes(trimmedQuery) || i.desc.includes(trimmedQuery)) : null

  const lastSynced = isSheetsSyncConfigured() ? getLastSyncedAt() : null
  const statusLine = lastSynced ? `آخر مزامنة: ${formatDate(lastSynced)} · الإصدار ${APP_VERSION}` : `الإصدار ${APP_VERSION}`

  return (
    <div dir="rtl" className="px-5 pb-6">

      {updateOpen && <AppUpdateSheet open done={updateDone} onClose={closeUpdateSheet} />}

      <TabHeader
        title="المزيد"
        subtitle={statusLine}
        actions={
          <HeaderIconButton
            label="قفل التطبيق"
            onClick={() => {
              auth.lock()
              navigate('/login', { replace: true })
            }}
          >
            <LockIcon />
          </HeaderIconButton>
        }
      />

      <SearchField value={query} onChange={setQuery} placeholder="ابحث عن أداة أو إعداد..." className="mb-6" />

      {searchResults ? (
        searchResults.length === 0 ? (
          <div className="qb-card px-6 py-10 text-center text-[13px] text-[var(--color-text-3)]">لا توجد نتائج مطابقة</div>
        ) : (
          <ListGroup className="qb-rise">
            {searchResults.map((item, i) => (
              <ListItem
                key={item.to}
                divider={i > 0}
                onClick={() => goTo(item)}
                leading={
                  <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-[14px] bg-[var(--color-surface-high)] text-[var(--color-text)]">{item.icon}</span>
                }
                title={item.full}
                subtitle={item.desc}
                chevron
              />
            ))}
          </ListGroup>
        )
      ) : (
        <>
          {topItems.length > 0 && (
            <section className="qb-card qb-rise mb-6 p-4" style={rise(0)}>
              <div className="mb-4 text-[12.5px] font-medium text-[var(--color-text-3)]">الأكثر استخدامًا</div>
              <div className="grid grid-cols-4 gap-x-2 gap-y-4">
                {topItems.map((item) => (
                  <AppTile key={item.to} label={item.label} icon={item.icon} onClick={() => goTo(item)} highlight />
                ))}
              </div>
            </section>
          )}

          {SECTIONS.map((section, si) => (
            <section key={section.title} className="qb-rise mb-6" style={rise(si + 1)}>
              <div className="qb-section-title mb-3.5 px-1">{section.title}</div>
              <div className="grid grid-cols-4 gap-x-2 gap-y-4">
                {section.items.map((item) => (
                  <AppTile key={item.to} label={item.label} icon={item.icon} onClick={() => goTo(item)} />
                ))}
                {section.title === 'النظام' && <AppTile label="تحديث" icon={<RefreshIcon />} badge={updateAvailable} onClick={() => setUpdateOpen(true)} />}
              </div>
            </section>
          ))}
        </>
      )}
    </div>
  )
}
