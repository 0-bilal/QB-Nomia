import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useData } from '../state/DataContext'
import { ScreenScroll } from '../components/ScreenScroll'

export function AddCategoryScreen() {
  const { addCategory } = useData()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [budgetLimit, setBudgetLimit] = useState('')

  function handleSave() {
    if (!name.trim()) return
    addCategory({
      name,
      kind: 'expense',
      budgetLimit: budgetLimit ? Number(budgetLimit) : undefined,
    })
    navigate('/categories', { replace: true })
  }

  return (
    <ScreenScroll
      header={
        <div className="safe-top flex items-center justify-between px-5 pt-8 pb-6">
          <button onClick={() => navigate(-1)} className="text-[13px] text-[var(--color-text-2)]">
            إلغاء
          </button>
          <div className="text-base font-bold">إضافة فئة</div>
          <div className="w-10" />
        </div>
      }
      footer={
        <div className="px-5 pb-6 pt-3">
          <button
            onClick={handleSave}
            disabled={!name.trim()}
            className="w-full rounded-2xl py-3.5 text-center text-[14.5px] font-bold text-[#04140D] disabled:opacity-40"
            style={{ background: 'var(--color-accent)' }}
          >
            حفظ
          </button>
        </div>
      }
    >
      <label className="mb-1.5 text-[12.5px] font-semibold text-[var(--color-text-2)]">اسم الفئة</label>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="مثال: صيانة السيارة"
        className="mb-5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-[14px] outline-none placeholder:text-[var(--color-text-3)]"
      />

      <label className="mb-1.5 text-[12.5px] font-semibold text-[var(--color-text-2)]">ميزانية شهرية (اختياري)</label>
      <input
        dir="ltr"
        inputMode="decimal"
        value={budgetLimit}
        onChange={(e) => setBudgetLimit(e.target.value.replace(/[^0-9.]/g, ''))}
        placeholder="0"
        className="num mb-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-[14px] outline-none placeholder:text-[var(--color-text-3)]"
      />
    </ScreenScroll>
  )
}
