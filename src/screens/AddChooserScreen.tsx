import { useNavigate } from 'react-router-dom'
import { ScreenScroll } from '../components/ScreenScroll'
import { ScreenHeader } from '../components/ScreenHeader'

export function AddChooserScreen() {
  const navigate = useNavigate()

  return (
    <ScreenScroll
      header={<ScreenHeader title="إضافة حركة" onBack={() => navigate(-1)} cancelLabel="إلغاء" className="pt-8 pb-8" />}
    >
      <button
        onClick={() => navigate('/loans')}
        className="qb-card qb-press mb-3 flex items-center gap-3.5 p-4.5 text-right"
      >
        <div
          className="flex h-11.5 w-11.5 flex-shrink-0 items-center justify-center rounded-[14px]"
          style={{ width: 46, height: 46, background: 'rgba(45,212,191,0.12)', color: 'var(--color-owed-to)' }}
        >
          <svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="9" cy="8" r="3" />
            <path d="M3 19c0-3.3 2.7-5 6-5s6 1.7 6 5" />
            <circle cx="17" cy="9" r="2.3" />
            <path d="M15.3 14.2c2.5.4 4.2 1.9 4.2 4.8" />
          </svg>
        </div>
        <div className="flex-1">
          <div className="text-[14px] font-bold">حركة سلفة</div>
          <div className="text-[11.5px] text-[var(--color-text-3)]">أعطِ أو استلم مبلغًا من أحد الأشخاص</div>
        </div>
      </button>

      <button
        onClick={() => navigate('/add/transaction')}
        className="qb-card qb-press mb-3 flex items-center gap-3.5 p-4.5 text-right"
      >
        <div
          className="flex h-11.5 w-11.5 flex-shrink-0 items-center justify-center rounded-[14px]"
          style={{ width: 46, height: 46, background: 'rgba(255,92,92,0.12)', color: 'var(--color-expense)' }}
        >
          <svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </div>
        <div className="flex-1">
          <div className="text-[14px] font-bold">مصروف / دخل / تحويل</div>
          <div className="text-[11.5px] text-[var(--color-text-3)]">سجّل حركة على أحد حساباتك</div>
        </div>
      </button>
    </ScreenScroll>
  )
}
