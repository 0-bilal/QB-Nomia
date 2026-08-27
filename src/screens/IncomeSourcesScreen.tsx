import { useNavigate } from 'react-router-dom'
import { useData } from '../state/DataContext'
import { formatMoney } from '../lib/format'
import { ScreenScroll } from '../components/ScreenScroll'
import { ScreenHeader } from '../components/ScreenHeader'

export function IncomeSourcesScreen() {
  const { incomeSources, transactions } = useData()
  const navigate = useNavigate()

  function totalFor(sourceId: string): number {
    return transactions
      .filter((t) => t.type === 'income' && t.incomeSourceId === sourceId)
      .reduce((s, t) => s + t.amount, 0)
  }

  return (
    <ScreenScroll
      header={
        <ScreenHeader
          title="مصادر الدخل"
          onBack={() => navigate(-1)}
          right={
            <button
              onClick={() => navigate('/income-sources/new')}
              className="qb-press flex h-9.5 w-9.5 items-center justify-center rounded-full border"
              style={{ width: 38, height: 38, background: 'rgba(255,255,255,0.12)', borderColor: 'rgba(255,255,255,0.27)', color: 'var(--color-accent)' }}
              aria-label="إضافة مصدر دخل"
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>
          }
        />
      }
    >
      {incomeSources.length === 0 ? (
        <div className="qb-card py-10 text-center text-[13px] text-[var(--color-text-3)]">لا توجد مصادر دخل بعد</div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {incomeSources.map((s) => (
            <button
              key={s.id}
              onClick={() => navigate(`/income-sources/${s.id}/edit`)}
              className="qb-card qb-press flex items-center gap-3 p-4 text-right"
            >
              <div
                className="flex h-10.5 w-10.5 flex-shrink-0 items-center justify-center rounded-[13px]"
                style={{ width: 42, height: 42, background: 'rgba(34,197,94,0.12)', color: 'var(--color-income)' }}
              >
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="19" x2="12" y2="5" />
                  <polyline points="6,11 12,5 18,11" />
                </svg>
              </div>
              <div className="min-w-0 flex-1 truncate text-[13.5px] font-bold">{s.name}</div>
              <div className="num flex-shrink-0 text-[13px] font-semibold" style={{ color: 'var(--color-income)' }}>
                {formatMoney(totalFor(s.id))}
              </div>
            </button>
          ))}
        </div>
      )}
    </ScreenScroll>
  )
}
