import { useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useData } from '../state/DataContext'
import { ScreenScroll } from '../components/ScreenScroll'
import { ScreenHeader } from '../components/ScreenHeader'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { DatePicker } from '../components/DatePicker'
import { showUndoToast } from '../lib/undoToast'
import type { AccountType } from '../types'

const TYPE_OPTIONS: [AccountType, string][] = [
  ['cash', 'كاش'],
  ['bank', 'بنكي'],
  ['savings', 'ادخار'],
  ['wallet', 'محفظة رقمية'],
]

export function AddAccountScreen() {
  const { id } = useParams<{ id?: string }>()
  const { accounts, transactions, loanTransactions, subscriptions, addAccount, updateAccount, deleteAccount } = useData()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const existing = id ? accounts.find((a) => a.id === id) : undefined
  const isEditing = Boolean(existing)
  const initialType = existing?.type ?? ((searchParams.get('type') as AccountType) || 'wallet')

  const [name, setName] = useState(existing?.name ?? '')
  const [type, setType] = useState<AccountType>(initialType)
  const [balance, setBalance] = useState(existing ? String(existing.balance) : '')
  const [goalAmount, setGoalAmount] = useState(existing?.goalAmount ? String(existing.goalAmount) : '')
  const [goalLabel, setGoalLabel] = useState(existing?.goalLabel ?? '')
  const [goalTargetDate, setGoalTargetDate] = useState(existing?.goalTargetDate ?? '')
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)

  const canSave = name.trim().length > 0

  const linkedActivityCount = id
    ? transactions.filter((t) => t.accountId === id || t.transferToAccountId === id).length +
      loanTransactions.filter((t) => t.accountId === id).length +
      subscriptions.filter((s) => s.accountId === id).length
    : 0

  function handleSave() {
    if (!canSave) return
    const input = {
      name,
      type,
      balance: balance ? Number(balance) : 0,
      goalAmount: type === 'savings' && goalAmount ? Number(goalAmount) : undefined,
      goalLabel: type === 'savings' && goalLabel ? goalLabel : undefined,
      goalTargetDate: type === 'savings' && goalTargetDate ? goalTargetDate : undefined,
    }
    if (isEditing && id) updateAccount(id, input)
    else addAccount(input)
    navigate('/accounts', { replace: true })
  }

  function handleDelete() {
    if (!id || !existing) return
    const { name, type, balance, goalAmount, goalLabel, goalTargetDate } = existing
    deleteAccount(id)
    navigate('/accounts', { replace: true })
    showUndoToast('تم حذف الحساب', () => addAccount({ name, type, balance, goalAmount, goalLabel, goalTargetDate }))
  }

  return (
    <ScreenScroll
      header={
        <ScreenHeader
          title={isEditing ? 'تعديل حساب' : 'إضافة حساب'}
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
            disabled={!canSave}
            className="w-full rounded-2xl py-3.5 text-center text-[14.5px] font-bold text-[#0A0A0C] disabled:opacity-40"
            style={{ background: 'var(--color-accent)' }}
          >
            {isEditing ? 'حفظ التعديلات' : 'حفظ الحساب'}
          </button>
        </div>
      }
    >
      <ConfirmDialog
        open={confirmDeleteOpen}
        title="حذف الحساب"
        message={
          linkedActivityCount > 0
            ? `فيه ${linkedActivityCount} حركة/سلفة/اشتراك مرتبطة بهذا الحساب — بتبقى بسجلك بس بدون حساب مرتبط. الحذف نهائي.`
            : 'بيتم حذف هذا الحساب نهائيًا.'
        }
        confirmLabel="حذف"
        color="var(--color-expense)"
        onConfirm={handleDelete}
        onCancel={() => setConfirmDeleteOpen(false)}
      />

      <label className="mb-1.5 block text-[12.5px] font-semibold text-[var(--color-text-2)]">اسم الحساب</label>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="مثال: محفظة Google Play"
        className="mb-5 w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-[14px] outline-none placeholder:text-[var(--color-text-3)]"
      />

      <label className="mb-1.5 block text-[12.5px] font-semibold text-[var(--color-text-2)]">نوع الحساب</label>
      <div className="mb-5 flex flex-wrap gap-2">
        {TYPE_OPTIONS.map(([t, label]) => (
          <button
            key={t}
            onClick={() => setType(t)}
            className="rounded-full px-4 py-2 text-[12.5px] font-semibold"
            style={
              type === t
                ? { background: 'rgba(255,255,255,0.18)', color: 'var(--color-accent)' }
                : { background: 'var(--color-surface)', color: 'var(--color-text-2)', border: '1px solid var(--color-border)' }
            }
          >
            {label}
          </button>
        ))}
      </div>

      <label className="mb-1.5 block text-[12.5px] font-semibold text-[var(--color-text-2)]">الرصيد الحالي (اختياري)</label>
      <input
        dir="ltr"
        inputMode="decimal"
        value={balance}
        onChange={(e) => setBalance(e.target.value.replace(/[^0-9.]/g, ''))}
        placeholder="0"
        className="num mb-5 w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-[14px] outline-none placeholder:text-[var(--color-text-3)]"
      />

      {type === 'savings' && (
        <>
          <label className="mb-1.5 block text-[12.5px] font-semibold text-[var(--color-text-2)]">اسم الهدف (اختياري)</label>
          <input
            value={goalLabel}
            onChange={(e) => setGoalLabel(e.target.value)}
            placeholder="مثال: رحلة عمرة"
            className="mb-5 w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-[14px] outline-none placeholder:text-[var(--color-text-3)]"
          />
          <label className="mb-1.5 block text-[12.5px] font-semibold text-[var(--color-text-2)]">مبلغ الهدف (اختياري)</label>
          <input
            dir="ltr"
            inputMode="decimal"
            value={goalAmount}
            onChange={(e) => setGoalAmount(e.target.value.replace(/[^0-9.]/g, ''))}
            placeholder="0"
            className="num mb-5 w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-[14px] outline-none placeholder:text-[var(--color-text-3)]"
          />
          <div className="mb-5">
            <DatePicker value={goalTargetDate} onChange={setGoalTargetDate} color="var(--color-subscription)" placeholder="بدون تاريخ مستهدف" fieldLabel="تاريخ تحقيق الهدف (اختياري)" />
          </div>
        </>
      )}

      {type === 'wallet' && (
        <div className="mb-5 rounded-2xl border border-dashed p-3.5 text-[12px] leading-relaxed" style={{ borderColor: 'rgba(255,255,255,0.35)', color: 'var(--color-text-2)' }}>
          محفظة رقمية زي "Google Play" — عبّيها بتحويل من الكاش أو البنكي، واربط اشتراكاتك فيها عشان تعرف الرصيد المتبقي بها في أي وقت.
        </div>
      )}
    </ScreenScroll>
  )
}
