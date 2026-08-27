import { useNavigate } from 'react-router-dom'
import { useData } from '../state/DataContext'
import { formatMoney } from '../lib/format'
import { ScreenScroll } from '../components/ScreenScroll'

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
        <div className="safe-top flex items-center justify-between px-5 pt-8 pb-5">
          <button onClick={() => navigate(-1)} className="text-[13px] text-[var(--color-text-2)]">
            → رجوع
          </button>
          <div className="text-base font-bold">مصادر الدخل</div>
          <button
            onClick={() => navigate('/income-sources/new')}
            className="flex h-9.5 w-9.5 items-center justify-center rounded-xl border"
            style={{ width: 38, height: 38, background: 'rgba(255,255,255,0.12)', borderColor: 'rgba(255,255,255,0.27)', color: 'var(--color-accent)' }}
            aria-label="إضافة مصدر دخل"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
        </div>
      }
    >
      {incomeSources.length === 0 ? (
        <div className="py-10 text-center text-[13px] text-[var(--color-text-3)]">لا توجد مصادر دخل بعد</div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {incomeSources.map((s) => (
            <button
              key={s.id}
              onClick={() => navigate(`/income-sources/${s.id}/edit`)}
              className="flex items-center justify-between rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-right"
            >
              <div className="text-[13.5px] font-bold">{s.name}</div>
              <div className="num text-[13px] font-semibold" style={{ color: 'var(--color-income)' }}>
                {formatMoney(totalFor(s.id))}
              </div>
            </button>
          ))}
        </div>
      )}
    </ScreenScroll>
  )
}
