import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useData } from '../state/DataContext'
import { ScreenScroll } from '../components/ScreenScroll'
import { ScreenHeader } from '../components/ScreenHeader'
import { ConfirmDialog } from '../components/ConfirmDialog'

export function AddCategoryScreen() {
  const { id } = useParams<{ id?: string }>()
  const { categories, addCategory, updateCategory, deleteCategory } = useData()
  const navigate = useNavigate()

  const existing = id ? categories.find((c) => c.id === id) : undefined
  const isEditing = Boolean(existing)

  const [name, setName] = useState(existing?.name ?? '')
  const [budgetLimit, setBudgetLimit] = useState(existing?.budgetLimit ? String(existing.budgetLimit) : '')
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)

  function handleSave() {
    if (!name.trim()) return
    const input = {
      name,
      kind: 'expense' as const,
      budgetLimit: budgetLimit ? Number(budgetLimit) : undefined,
    }
    if (isEditing && id) updateCategory(id, input)
    else addCategory(input)
    navigate('/categories', { replace: true })
  }

  function handleDelete() {
    if (!id) return
    deleteCategory(id)
    navigate('/categories', { replace: true })
  }

  return (
    <ScreenScroll
      header={
        <ScreenHeader
          title={isEditing ? 'تعديل فئة' : 'إضافة فئة'}
          onBack={() => navigate(-1)}
          cancelLabel="إلغاء"
          className="pt-8 pb-6"
          right={
            isEditing ? (
              <button onClick={() => setConfirmDeleteOpen(true)} className="qb-press text-[13px] font-semibold" style={{ color: 'var(--color-expense)' }}>
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
            className="w-full rounded-2xl py-3.5 text-center text-[14.5px] font-bold text-[#0A0A0C] disabled:opacity-40"
            style={{ background: 'var(--color-accent)' }}
          >
            {isEditing ? 'حفظ التعديلات' : 'حفظ'}
          </button>
        </div>
      }
    >
      <ConfirmDialog
        open={confirmDeleteOpen}
        title="حذف الفئة"
        message="بيتم حذف هذي الفئة — الحركات المسجّلة عليها سابقًا بتبقى بسجلك بس بدون فئة."
        confirmLabel="حذف"
        color="var(--color-expense)"
        onConfirm={handleDelete}
        onCancel={() => setConfirmDeleteOpen(false)}
      />

      <label className="mb-1.5 block text-[12.5px] font-semibold text-[var(--color-text-2)]">اسم الفئة</label>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="مثال: صيانة السيارة"
        className="mb-5 w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-[14px] outline-none placeholder:text-[var(--color-text-3)]"
      />

      <label className="mb-1.5 block text-[12.5px] font-semibold text-[var(--color-text-2)]">ميزانية شهرية (اختياري)</label>
      <input
        dir="ltr"
        inputMode="decimal"
        value={budgetLimit}
        onChange={(e) => setBudgetLimit(e.target.value.replace(/[^0-9.]/g, ''))}
        placeholder="0"
        className="num mb-4 w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-[14px] outline-none placeholder:text-[var(--color-text-3)]"
      />
    </ScreenScroll>
  )
}
