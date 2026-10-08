import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useData } from '../state/DataContext'
import { ScreenScroll } from '../components/ScreenScroll'
import { ScreenHeader } from '../components/ScreenHeader'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { showUndoToast } from '../lib/undoToast'

export function AddIncomeSourceScreen() {
  const { id } = useParams<{ id?: string }>()
  const { incomeSources, addIncomeSource, updateIncomeSource, deleteIncomeSource } = useData()
  const navigate = useNavigate()

  const existing = id ? incomeSources.find((s) => s.id === id) : undefined
  const isEditing = Boolean(existing)

  const [name, setName] = useState(existing?.name ?? '')
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)

  function handleSave() {
    if (!name.trim()) return
    if (isEditing && id) updateIncomeSource(id, { name })
    else addIncomeSource({ name })
    navigate('/income-sources', { replace: true })
  }

  function handleDelete() {
    if (!id || !existing) return
    const { name } = existing
    deleteIncomeSource(id)
    navigate('/income-sources', { replace: true })
    showUndoToast('تم حذف مصدر الدخل', (data) => data.addIncomeSource({ name }))
  }

  return (
    <ScreenScroll
      header={
        <ScreenHeader
          title={isEditing ? 'تعديل مصدر دخل' : 'إضافة مصدر دخل'}
          onBack={() => navigate(-1)}
          cancelLabel="إلغاء"
          className="pt-8 pb-6"
          right={
            isEditing ? (
              <button onClick={() => setConfirmDeleteOpen(true)} className="qb-press flex h-10 items-center rounded-full px-4 text-[13px] font-semibold" style={{ color: 'var(--color-expense)', background: 'rgba(255,95,109,0.12)' }}>
                حذف
              </button>
            ) : (
              <div className="w-10" />
            )
          }
        />
      }
      footer={
        <div className="px-5 pb-6 pt-3">
          <button
            onClick={handleSave}
            disabled={!name.trim()}
            className="qb-press w-full rounded-full py-4 text-center text-[15px] font-semibold text-[#0A0A0C] disabled:opacity-35"
            style={{ background: 'var(--color-accent)' }}
          >
            {isEditing ? 'حفظ التعديلات' : 'حفظ'}
          </button>
        </div>
      }
    >
      <ConfirmDialog
        open={confirmDeleteOpen}
        title="حذف مصدر الدخل"
        message="بيتم حذف هذا المصدر — الحركات المسجّلة عليه سابقًا بتبقى بسجلك."
        confirmLabel="حذف"
        color="var(--color-expense)"
        onConfirm={handleDelete}
        onCancel={() => setConfirmDeleteOpen(false)}
      />

      <label className="mb-2 block px-1 text-[12.5px] font-medium text-[var(--color-text-2)]">اسم المصدر</label>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="مثال: تأجير شقة"
        className="mb-4 w-full rounded-[18px] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3.5 text-[14px] outline-none placeholder:text-[var(--color-text-3)]"
      />
    </ScreenScroll>
  )
}
