import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { PeoplePanel } from './PeoplePanel'
import { SalaryAdvancePanel } from './SalaryAdvancePanel'
import { SalaryViolationsPanel } from './SalaryViolationsPanel'
import { StoreDebtsPanel } from './StoreDebtsPanel'

type TabKey = 'people' | 'advance' | 'violations' | 'stores'

const TABS: { key: TabKey; label: string }[] = [
  { key: 'people', label: 'أشخاص' },
  { key: 'advance', label: 'سلفة راتب' },
  { key: 'violations', label: 'خصومات مخالفات' },
  { key: 'stores', label: 'ديون متاجر' },
]

function isTabKey(v: string | null): v is TabKey {
  return v === 'people' || v === 'advance' || v === 'violations' || v === 'stores'
}

/**
 * شاشة موحّدة لكل أنواع الديون والسلف (بدل تفريقها بشاشات منفصلة داخل
 * "المزيد"): سلف الأشخاص، سلفة الراتب، خصومات المخالفات، وديون المتاجر —
 * كل نوع تبويب مستقل بنفس المكان اللي يفتح منه المستخدم "السلف" أصلًا.
 */
export function DebtsHubScreen() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const initialTab = searchParams.get('tab')
  const [tab, setTab] = useState<TabKey>(isTabKey(initialTab) ? initialTab : 'people')

  function selectTab(next: TabKey) {
    setTab(next)
    setSearchParams(next === 'people' ? {} : { tab: next }, { replace: true })
  }

  return (
    <div dir="rtl" className="px-5 pb-4">
      <div className="safe-top qb-sticky-header-row mb-4 flex items-center justify-between pt-14">
        <div className="qb-glass-circle flex h-9.5 items-center rounded-full border px-4 text-[15px] font-bold">السلف</div>
        {tab === 'people' ? (
          <button
            onClick={() => navigate('/loans/new')}
            className="qb-glass-circle qb-press flex h-9.5 w-9.5 items-center justify-center rounded-full border"
            style={{ width: 38, height: 38, color: 'var(--color-accent)' }}
            aria-label="إضافة شخص"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
        ) : (
          <div style={{ width: 38, height: 38 }} />
        )}
      </div>

      <div className="mb-5 flex gap-2 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => selectTab(t.key)}
            className="qb-press flex-shrink-0 whitespace-nowrap rounded-full px-4 py-1.75 text-[12.5px] font-semibold"
            style={
              tab === t.key
                ? { background: 'rgba(255,255,255,0.15)', color: 'var(--color-accent)' }
                : { background: 'var(--color-surface)', color: 'var(--color-text-2)', border: '1px solid var(--color-border)' }
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'people' && <PeoplePanel />}
      {tab === 'advance' && <SalaryAdvancePanel />}
      {tab === 'violations' && <SalaryViolationsPanel />}
      {tab === 'stores' && <StoreDebtsPanel />}
    </div>
  )
}
