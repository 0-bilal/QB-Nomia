import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useData } from '../../state/DataContext'
import { formatMoney } from '../../lib/format'
import { PeoplePanel } from './PeoplePanel'
import { SalaryAdvancePanel } from './SalaryAdvancePanel'
import { SalaryViolationsPanel } from './SalaryViolationsPanel'
import { StoreDebtsPanel } from './StoreDebtsPanel'
import { TabHeader, HeaderIconButton, PlusGlyph } from '../../components/TabHeader'
import { BigAmount } from '../../components/BigAmount'
import { haptic } from '../../lib/haptics'

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

  const net = totalOwedToMe - totalIOweAll
  const totalBoth = totalOwedToMe + totalIOweAll

  return (
    <>
      <div className="qb-card-elevated qb-rise mb-5 p-5">
        <div className="relative">
          <div className="mb-2 text-[12.5px] font-medium text-[var(--color-text-2)]">صافي موقفك</div>
          <BigAmount value={net} size={34} color={net >= 0 ? 'var(--color-income)' : 'var(--color-expense)'} />
          <div className="mb-4 mt-1 text-[11.5px] text-[var(--color-text-3)]">{net >= 0 ? 'لك أكثر مما عليك' : 'عليك أكثر مما لك'}</div>

          <div className="mb-3 flex h-2 gap-1 overflow-hidden rounded-full bg-white/[0.05]">
            {totalBoth > 0 && (
              <>
                <div className="h-full rounded-full bg-[var(--color-income)]" style={{ width: `${(totalOwedToMe / totalBoth) * 100}%` }} />
                <div className="h-full rounded-full bg-[var(--color-expense)]" style={{ width: `${(totalIOweAll / totalBoth) * 100}%` }} />
              </>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="mb-0.5 flex items-center gap-1.5 text-[11.5px] text-[var(--color-text-3)]">
                <span className="h-2 w-2 rounded-full bg-[var(--color-income)]" />
                مستحق لك
              </div>
              <div className="num text-[16px] font-bold">{formatMoney(totalOwedToMe)}</div>
            </div>
            <div>
              <div className="mb-0.5 flex items-center gap-1.5 text-[11.5px] text-[var(--color-text-3)]">
                <span className="h-2 w-2 rounded-full bg-[var(--color-expense)]" />
                إجمالي عليك
              </div>
              <div className="num text-[16px] font-bold">{formatMoney(totalIOweAll)}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="qb-section-title mb-3 px-1">تفصيل ما عليك</div>
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
        <button onClick={() => onOpenTab('violations')} className="qb-card qb-press flex w-full items-center justify-between px-4 py-3.5 text-right">
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
      <TabHeader
        title="السلف والديون"
        subtitle="أشخاص، سلفة راتب، مخالفات، وديون متاجر"
        actions={
          tab === 'people' ? (
            <HeaderIconButton accent label="إضافة شخص" onClick={() => navigate('/loans/new')}>
              <PlusGlyph />
            </HeaderIconButton>
          ) : undefined
        }
      />

      <div className="-mx-5 mb-5 flex gap-2 overflow-x-auto px-5">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => {
              haptic('tick')
              selectTab(t.key)
            }}
            data-active={tab === t.key}
            ref={(el) => {
              if (el && tab === t.key) el.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' })
            }}
            className="qb-chip qb-press flex-shrink-0 whitespace-nowrap px-4 py-2 text-[13px] font-medium"
          >
            {t.label}
          </button>
        ))}
      </div>

      <div key={tab} className="qb-rise">
      {tab === 'overview' && <OverviewPanel onOpenTab={selectTab} />}
      {tab === 'people' && <PeoplePanel />}
      {tab === 'advance' && <SalaryAdvancePanel />}
      {tab === 'violations' && <SalaryViolationsPanel />}
      {tab === 'stores' && <StoreDebtsPanel />}
      </div>
    </div>
  )
}
