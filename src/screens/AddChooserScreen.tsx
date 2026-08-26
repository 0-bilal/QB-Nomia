import { useNavigate } from 'react-router-dom'

export function AddChooserScreen() {
  const navigate = useNavigate()

  return (
    <div dir="rtl" className="safe-top flex h-full flex-col px-5 pb-6 pt-8">
      <div className="mb-8 flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="text-[13px] text-[var(--color-text-2)]">
          إلغاء
        </button>
        <div className="text-base font-bold">إضافة حركة</div>
        <div className="w-10" />
      </div>

      <button
        onClick={() => navigate('/loans')}
        className="mb-3 flex items-center gap-3.5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4.5 text-right"
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

      <div className="mb-3 flex items-center gap-3.5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4.5 opacity-50">
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
          <div className="text-[11.5px] text-[var(--color-text-3)]">قريبًا</div>
        </div>
      </div>
    </div>
  )
}
