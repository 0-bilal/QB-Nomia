import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useData } from '../../state/DataContext'
import { formatMoney } from '../../lib/format'
import { PeoplePanel } from './PeoplePanel'
import { SalaryAdvancePanel } from './SalaryAdvancePanel'
import { SalaryViolationsPanel } from './SalaryViolationsPanel'
import { StoreDebtsPanel } from './StoreDebtsPanel'

type TabKey = 'overview' | 'people' | 'advance' | 'violations' | 'stores'

const TABS: { key: TabKey; label: string }[] = [
  { key: 'overview', label: 'نظرة عامة' },
  { key: 'people', label: 'أشخاص' },
  { key: 'advance', label: 'سلفة راتب' },
  { key: 'violations', label: 'خصومات مخالفات' },
  { key: 'stores', label: 'ديون متاجر' },
]

function isTabKey(v: string | null): v is TabKey {
  return v === 'overview' || v === 'people' || v === 'advance' || v === 'violations' || v === 'stores'
}

function ChevronIcon() {
  return (
    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15,6 9,12 15,18" />
    </svg>
  )
}

/** ملخّص موحّد لكل أنواع الديون والسلف بمكان واحد — يجمع أرقامًا مبعثرة بأربع تبويبات مختلفة بمكان واحد بدل ما يفتح المستخدم كل تبويب لوحده عشان يعرف وضعه الإجمالي. */
function OverviewPanel({ onOpenTab }: { onOpenTab: (tab: TabKey) => void }) {
  const { totalOwedToMe, totalIOwe, salaryAdvances, storeDebts, storeDebtPayments, salaryViolations } = useData()

  const outstandingAdvance = salaryAdvances.filter((a) => !a.settled).reduce((s, a) => s + a.amount, 0)
  const outstandingStoreDebt = storeDebts.reduce((sum, d) => {
    const paid = storeDebtPayments.filter((p) => p.debtId === d.id).reduce((s, p) => s + p.amount, 0)
    return sum + Math.max(0, d.amount - paid)
  }, 0)
  const totalViolations = salaryViolations.reduce((s, v) => s + v.amount, 0)
  const totalIOweAll = totalIOwe + outstandingAdvance + outstandingStoreDebt

  const rows: { label: string; value: number; tab: TabKey }[] = [
    { label: 'سلف الأشخاص (عليك)', value: totalIOwe, tab: 'people' },
    { label: 'سلفة الراتب (متبقي)', value: outstandingAdvance, tab: 'advance' },
    { label: 'ديون المتاجر (متبقي)', value: outstandingStoreDebt, tab: 'stores' },
  ]

  return (
    <>
      <div className="mb-4 grid grid-cols-2 gap-2.5">
        <div className="qb-card-elevated p-4">
          <div className="mb-1.5 text-[11.5px] text-[var(--color-text-2)]">إجمالي عليك</div>
          <div className="num text-[19px] font-bold" style={{ color: 'var(--color-expense)' }}>
            {formatMoney(totalIOweAll)}
          </div>
        </div>
        <div className="qb-card-elevated p-4">
          <div className="mb-1.5 text-[11.5px] text-[var(--color-text-2)]">مستحق لك (من أشخاص)</div>
          <div className="num text-[19px] font-bold" style={{ color: 'var(--color-income)' }}>
            {formatMoney(totalOwedToMe)}
          </div>
        </div>
      </div>

      <div className="qb-section-label mb-2 px-1">تفصيل ما عليك</div>
      <div className="qb-card mb-4 overflow-hidden">
        {rows.map((r, i) => (
          <button
            key={r.tab}
            onClick={() => onOpenTab(r.tab)}
            className={`qb-press flex w-full items-center justify-between px-4 py-3.5 text-right ${i > 0 ? 'border-t qb-divider' : ''}`}
          >
            <span className="text-[12.5px] font-semibold">{r.label}</span>
            <span className="flex items-center gap-2">
              <span className="num text-[13.5px] font-bold" style={{ color: r.value > 0 ? 'var(--color-expense)' : 'var(--color-text-3)' }}>
                {formatMoney(r.value)}
              </span>
              <span className="text-[var(--color-text-3)]">
                <ChevronIcon />
              </span>
            </span>
          </button>
        ))}
      </div>

      {totalViolations > 0 && (
        <button onClick={() => onOpenTab('violations')} className="qb-press flex w-full items-center justify-between rounded-2xl border border-[var(--color-border)] px-4 py-3.5 text-right">
          <span className="text-[12px] text-[var(--color-text-3)]">إجمالي خصومات المخالفات المسجَّلة</span>
          <span className="num text-[13px] font-bold" style={{ color: 'var(--color-expense)' }}>
            {formatMoney(totalViolations)}
          </span>
        </button>
      )}
    </>
  )
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
  const [tab, setTab] = useState<TabKey>(isTabKey(initialTab) ? initialTab : 'overview')

  function selectTab(next: TabKey) {
    setTab(next)
    setSearchParams(next === 'overview' ? {} : { tab: next }, { replace: true })
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

      {tab === 'overview' && <OverviewPanel onOpenTab={selectTab} />}
      {tab === 'people' && <PeoplePanel />}
      {tab === 'advance' && <SalaryAdvancePanel />}
      {tab === 'violations' && <SalaryViolationsPanel />}
      {tab === 'stores' && <StoreDebtsPanel />}
    </div>
  )
}
