import { useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useData } from '../state/DataContext'
import { ScreenScroll } from '../components/ScreenScroll'
import { AmountPad } from '../components/AmountPad'
import { DatePicker } from '../components/DatePicker'
import { ConfirmDialog } from '../components/ConfirmDialog'
import type { TransactionType } from '../types'

const TYPE_COLOR: Record<TransactionType, string> = {
  expense: 'var(--color-expense)',
  income: 'var(--color-income)',
  transfer: 'var(--color-transfer)',
}

export function AddTransactionScreen() {
  const { id } = useParams<{ id?: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { accounts, categories, incomeSources, transactions, addTransaction, updateTransaction, deleteTransaction } = useData()

  const existing = id ? transactions.find((t) => t.id === id) : undefined
  const isEditing = Boolean(existing)

  const initialType = existing?.type ?? ((searchParams.get('type') as TransactionType) || 'expense')
  const toParam = searchParams.get('to') ?? undefined
  const fromParam = searchParams.get('from') ?? undefined

  const [type, setType] = useState<TransactionType>(initialType)
  const [amount, setAmount] = useState(existing ? String(existing.amount) : '')
  const [accountId, setAccountId] = useState(
    () => existing?.accountId ?? fromParam ?? accounts.find((a) => a.id !== toParam)?.id ?? accounts[0]?.id ?? '',
  )
  const [transferToId, setTransferToId] = useState(
    () =>
      existing?.transferToAccountId ??
      toParam ??
      accounts.find((a) => a.id !== (fromParam ?? accounts[0]?.id))?.id ??
      accounts[1]?.id ??
      accounts[0]?.id ??
      '',
  )
  const [categoryId, setCategoryId] = useState(existing?.categoryId ?? categories.find((c) => c.kind === 'expense')?.id ?? '')
  const [incomeSourceId, setIncomeSourceId] = useState(existing?.incomeSourceId ?? incomeSources[0]?.id ?? '')
  const [date, setDate] = useState(existing?.date ?? new Date().toISOString().slice(0, 10))
  const [note, setNote] = useState(existing?.note ?? '')
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)

  const color = TYPE_COLOR[type]
  const expenseCategories = categories.filter((c) => c.kind === 'expense')
  const numericAmount = Number(amount)

  const canSave =
    numericAmount > 0 &&
    accountId &&
    (type !== 'expense' || categoryId) &&
    (type !== 'income' || incomeSourceId) &&
    (type !== 'transfer' || (transferToId && transferToId !== accountId))

  function handleSave() {
    if (!canSave) return
    const input = {
      type,
      amount: numericAmount,
      date,
      accountId,
      categoryId: type === 'expense' ? categoryId : undefined,
      incomeSourceId: type === 'income' ? incomeSourceId : undefined,
      transferToAccountId: type === 'transfer' ? transferToId : undefined,
      note,
    }
    if (isEditing && id) {
      updateTransaction(id, input)
      navigate(-1)
    } else {
      addTransaction(input)
      navigate('/', { replace: true })
    }
  }

  function handleDelete() {
    if (!id) return
    deleteTransaction(id)
    navigate('/', { replace: true })
  }

  return (
    <ScreenScroll
      header={
        <div className="safe-top flex items-center justify-between px-5 pt-8 pb-6">
          <button onClick={() => navigate(-1)} className="text-[13px] text-[var(--color-text-2)]">
            إلغاء
          </button>
          <div className="text-base font-bold">{isEditing ? 'تعديل حركة' : 'إضافة حركة'}</div>
          {isEditing ? (
            <button onClick={() => setConfirmDeleteOpen(true)} className="text-[13px] font-semibold" style={{ color: 'var(--color-expense)' }}>
              حذف
            </button>
          ) : (
            <div className="w-10" />
          )}
        </div>
      }
      footer={
        <div className="px-5 pb-6 pt-3">
          <button
            onClick={handleSave}
            disabled={!canSave}
            className="w-full rounded-2xl py-3.5 text-center text-[14.5px] font-bold text-[#04140D] disabled:opacity-40"
            style={{ background: color }}
          >
            {isEditing ? 'حفظ التعديلات' : 'حفظ الحركة'}
          </button>
        </div>
      }
    >
      <ConfirmDialog
        open={confirmDeleteOpen}
        title="حذف الحركة"
        message="بيتم حذف هذي الحركة نهائيًا، ورصيد الحساب المرتبط بيرجع لوضعه قبلها."
        confirmLabel="حذف"
        color="var(--color-expense)"
        onConfirm={handleDelete}
        onCancel={() => setConfirmDeleteOpen(false)}
      />
      <div className="mb-6 flex gap-2 rounded-2xl border border-[var(--color-border)] bg-[var(--color-void)] p-1.25">
        {(
          [
            ['expense', 'مصروف'],
            ['income', 'دخل'],
            ['transfer', 'تحويل'],
          ] as [TransactionType, string][]
        ).map(([t, label]) => (
          <button
            key={t}
            onClick={() => setType(t)}
            className="flex-1 rounded-[14px] py-2.75 text-[13.5px] font-bold"
            style={type === t ? { background: `${TYPE_COLOR[t]}26`, color: TYPE_COLOR[t] } : { color: 'var(--color-text-2)' }}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mb-6 text-center">
        <div className="mb-2 text-[12.5px] text-[var(--color-text-2)]">المبلغ</div>
        <div className="num text-[40px] font-bold" style={{ color }}>
          {amount || '0'}
        </div>
      </div>

      <div className="mb-6">
        <AmountPad value={amount} onChange={setAmount} color={color} />
      </div>

      {type === 'expense' && (
        <>
          <label className="mb-1.5 block text-[12.5px] font-semibold text-[var(--color-text-2)]">الفئة</label>
          <div className="mb-5 flex flex-wrap gap-2">
            {expenseCategories.length === 0 ? (
              <div className="text-[12.5px] text-[var(--color-text-3)]">لا توجد فئات — أضف واحدة من "المزيد ← فئات المصاريف"</div>
            ) : (
              expenseCategories.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setCategoryId(c.id)}
                  className="rounded-full px-4 py-2 text-[12.5px] font-semibold"
                  style={
                    categoryId === c.id
                      ? { background: `${color}26`, color }
                      : { background: 'var(--color-surface)', color: 'var(--color-text-2)', border: '1px solid var(--color-border)' }
                  }
                >
                  {c.name}
                </button>
              ))
            )}
          </div>
        </>
      )}

      {type === 'income' && (
        <>
          <label className="mb-1.5 block text-[12.5px] font-semibold text-[var(--color-text-2)]">مصدر الدخل</label>
          <div className="mb-5 flex flex-wrap gap-2">
            {incomeSources.map((s) => (
              <button
                key={s.id}
                onClick={() => setIncomeSourceId(s.id)}
                className="rounded-full px-4 py-2 text-[12.5px] font-semibold"
                style={
                  incomeSourceId === s.id
                    ? { background: `${color}26`, color }
                    : { background: 'var(--color-surface)', color: 'var(--color-text-2)', border: '1px solid var(--color-border)' }
                }
              >
                {s.name}
              </button>
            ))}
          </div>
        </>
      )}

      {type === 'transfer' && accounts.length < 2 && (
        <div className="mb-5 text-[12.5px] text-[var(--color-text-3)]">
          التحويل يحتاج حسابين على الأقل — أضف حسابًا من{' '}
          <button type="button" onClick={() => navigate('/accounts/new')} className="font-semibold underline" style={{ color }}>
            هنا
          </button>
        </div>
      )}

      {type === 'transfer' && accounts.length >= 2 && (
        <>
          <label className="mb-1.5 block text-[12.5px] font-semibold text-[var(--color-text-2)]">من حساب</label>
          <div className="mb-5 flex flex-wrap gap-2">
            {accounts.map((a) => (
              <button
                key={a.id}
                onClick={() => setAccountId(a.id)}
                className="rounded-full px-4 py-2 text-[12.5px] font-semibold"
                style={
                  accountId === a.id
                    ? { background: `${color}26`, color }
                    : { background: 'var(--color-surface)', color: 'var(--color-text-2)', border: '1px solid var(--color-border)' }
                }
              >
                {a.name}
              </button>
            ))}
          </div>
          <label className="mb-1.5 block text-[12.5px] font-semibold text-[var(--color-text-2)]">إلى حساب</label>
          <div className="mb-5 flex flex-wrap gap-2">
            {accounts
              .filter((a) => a.id !== accountId)
              .map((a) => (
                <button
                  key={a.id}
                  onClick={() => setTransferToId(a.id)}
                  className="rounded-full px-4 py-2 text-[12.5px] font-semibold"
                  style={
                    transferToId === a.id
                      ? { background: `${color}26`, color }
                      : { background: 'var(--color-surface)', color: 'var(--color-text-2)', border: '1px solid var(--color-border)' }
                  }
                >
                  {a.name}
                </button>
              ))}
          </div>
        </>
      )}

      {type !== 'transfer' && (
        <>
          <label className="mb-1.5 block text-[12.5px] font-semibold text-[var(--color-text-2)]">الحساب</label>
          <div className="mb-5 flex flex-wrap gap-2">
            {accounts.length === 0 ? (
              <button type="button" onClick={() => navigate('/accounts/new')} className="text-[12.5px] font-semibold underline" style={{ color }}>
                لا توجد حسابات — أضف حسابًا أولًا
              </button>
            ) : (
              accounts.map((a) => (
                <button
                  key={a.id}
                  onClick={() => setAccountId(a.id)}
                  className="rounded-full px-4 py-2 text-[12.5px] font-semibold"
                  style={
                    accountId === a.id
                      ? { background: `${color}26`, color }
                      : { background: 'var(--color-surface)', color: 'var(--color-text-2)', border: '1px solid var(--color-border)' }
                  }
                >
                  {a.name}
                </button>
              ))
            )}
          </div>
        </>
      )}

      <label className="mb-1.5 block text-[12.5px] font-semibold text-[var(--color-text-2)]">التاريخ</label>
      <div className="mb-5">
        <DatePicker value={date} onChange={setDate} color={color} />
      </div>

      <label className="mb-1.5 block text-[12.5px] font-semibold text-[var(--color-text-2)]">ملاحظة (اختياري)</label>
      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="مثال: عشاء مع الأصدقاء"
        className="mb-4 w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-[14px] outline-none placeholder:text-[var(--color-text-3)]"
      />
    </ScreenScroll>
  )
}
