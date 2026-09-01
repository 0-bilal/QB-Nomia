import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useData } from '../state/DataContext'
import { ScreenScroll } from '../components/ScreenScroll'
import { ScreenHeader } from '../components/ScreenHeader'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { showUndoToast } from '../lib/undoToast'
import { formatDate, formatMoney } from '../lib/format'
import { ACCOUNT_TYPE_LABELS, AccountTypeIcon } from '../components/AccountVisuals'

export function AddCategoryScreen() {
  const { id } = useParams<{ id?: string }>()
  const { categories, addCategory, updateCategory, deleteCategory, transactions, accounts } = useData()
  const navigate = useNavigate()

  const existing = id ? categories.find((c) => c.id === id) : undefined
  const isEditing = Boolean(existing)

  const [name, setName] = useState(existing?.name ?? '')
  const [budgetLimit, setBudgetLimit] = useState(existing?.budgetLimit ? String(existing.budgetLimit) : '')
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)

  // كل حركات هذي الفئة من أول ما استُخدمت — مو بس الشهر الحالي (المعروض
  // أصلًا بشاشة "فئات المصاريف" نفسها كمصروف/ميزانية الشهر).
  const categoryTransactions = isEditing
    ? transactions.filter((t) => t.type === 'expense' && t.categoryId === id).sort((a, b) => (a.date === b.date ? 0 : a.date < b.date ? 1 : -1))
    : []
  const categoryTotal = categoryTransactions.reduce((sum, t) => sum + t.amount, 0)

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
    if (!id || !existing) return
    const { name, kind, budgetLimit } = existing
    deleteCategory(id)
    navigate('/categories', { replace: true })
    showUndoToast('تم حذف الفئة', () => addCategory({ name, kind, budgetLimit }))
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

      {isEditing && (
        <>
          <div className="mb-2 mt-3 flex items-center justify-between px-1">
            <div className="qb-section-label">حركات هذه الفئة</div>
            {categoryTransactions.length > 0 && (
              <span className="num text-[12.5px] font-bold" style={{ color: 'var(--color-expense)' }}>
                الإجمالي {formatMoney(categoryTotal)}
              </span>
            )}
          </div>
          {categoryTransactions.length === 0 ? (
            <div className="qb-card py-8 text-center text-[12.5px] text-[var(--color-text-3)]">لا توجد حركات مسجّلة على هذي الفئة بعد</div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {categoryTransactions.map((t) => {
                const account = accounts.find((a) => a.id === t.accountId)
                return (
                  <button key={t.id} onClick={() => navigate(`/add/transaction/${t.id}`)} className="qb-card qb-press p-3.5 text-right">
                    <div className="flex items-center justify-between">
                      <div className="text-[13px] font-bold">{formatDate(t.date)}</div>
                      <span className="num text-[13px] font-bold" style={{ color: 'var(--color-expense)' }}>
                        {formatMoney(t.amount)}
                      </span>
                    </div>
                    {t.note && <div className="mt-1 truncate text-[11.5px] text-[var(--color-text-2)]">{t.note}</div>}
                    {account && (
                      <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-[var(--color-text-3)]">
                        <AccountTypeIcon type={account.type} size={13} />
                        <span>{account.name} · {ACCOUNT_TYPE_LABELS[account.type]}</span>
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </>
      )}
    </ScreenScroll>
  )
}
