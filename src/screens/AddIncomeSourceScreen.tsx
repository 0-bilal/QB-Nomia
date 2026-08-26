import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useData } from '../state/DataContext'
import { ScreenScroll } from '../components/ScreenScroll'

export function AddIncomeSourceScreen() {
  const { addIncomeSource } = useData()
  const navigate = useNavigate()
  const [name, setName] = useState('')

  function handleSave() {
    if (!name.trim()) return
    addIncomeSource({ name })
    navigate('/income-sources', { replace: true })
  }

  return (
    <ScreenScroll
      header={
        <div className="safe-top flex items-center justify-between px-5 pt-8 pb-6">
          <button onClick={() => navigate(-1)} className="text-[13px] text-[var(--color-text-2)]">
            إلغاء
          </button>
          <div className="text-base font-bold">إضافة مصدر دخل</div>
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
      <label className="mb-1.5 text-[12.5px] font-semibold text-[var(--color-text-2)]">اسم المصدر</label>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="مثال: تأجير شقة"
        className="mb-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-[14px] outline-none placeholder:text-[var(--color-text-3)]"
      />
    </ScreenScroll>
  )
}
