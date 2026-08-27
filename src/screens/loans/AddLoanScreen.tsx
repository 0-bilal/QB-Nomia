import { useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useData } from '../../state/DataContext'
import { ScreenScroll } from '../../components/ScreenScroll'
import { ScreenHeader } from '../../components/ScreenHeader'
import { AmountPad } from '../../components/AmountPad'
import { DatePicker } from '../../components/DatePicker'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { PickerField } from '../../components/PickerField'
import { SelectSheet, type SelectSheetItem } from '../../components/SelectSheet'
import { ACCOUNT_ICON_BG, ACCOUNT_ICON_COLOR, ACCOUNT_TYPE_LABELS, AccountTypeIcon } from '../../components/AccountVisuals'
import { formatMoney } from '../../lib/format'
import type { LoanDirection } from '../../types'

export function AddLoanScreen() {
  const { personId, loanId } = useParams<{ personId: string; loanId?: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { people, accounts, loanTransactions, addLoanTransaction, updateLoanTransaction, deleteLoanTransaction } = useData()

  const person = people.find((p) => p.id === personId)
  const existing = loanId ? loanTransactions.find((t) => t.id === loanId) : undefined
  const isEditing = Boolean(existing)
  const initialDirection = existing?.direction ?? ((searchParams.get('direction') as LoanDirection) || 'given')

  const [direction, setDirection] = useState<LoanDirection>(initialDirection)
  const [amount, setAmount] = useState(existing ? String(existing.amount) : '')
  const [accountId, setAccountId] = useState(existing?.accountId ?? accounts[0]?.id ?? '')
  const [date, setDate] = useState(existing?.date ?? new Date().toISOString().slice(0, 10))
  const [dueDate, setDueDate] = useState(existing?.dueDate ?? '')
  const [note, setNote] = useState(existing?.note ?? '')
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const [accountSheetOpen, setAccountSheetOpen] = useState(false)

  if (!person) {
    return (
      <div dir="rtl" className="safe-top px-5 pt-15 text-center text-[13px] text-[var(--color-text-3)]">
        هذا الشخص غير موجود
      </div>
    )
  }

  const color = direction === 'given' ? 'var(--color-owed-by)' : 'var(--color-owed-to)'
  const numericAmount = Number(amount)
  const canSave = numericAmount > 0 && accountId
  const selectedAccount = accounts.find((a) => a.id === accountId)

  function handleSave() {
    if (!canSave || !person) return
    const input = {
      personId: person.id,
      direction,
      amount: numericAmount,
      accountId,
      date,
      dueDate: direction === 'given' && dueDate ? dueDate : undefined,
      note,
    }
    if (isEditing && loanId) updateLoanTransaction(loanId, input)
    else addLoanTransaction(input)
    navigate(`/loans/${person.id}`, { replace: true })
  }

  function handleDelete() {
    if (!loanId || !person) return
    deleteLoanTransaction(loanId)
    navigate(`/loans/${person.id}`, { replace: true })
  }

  return (
    <ScreenScroll
      header={
        <ScreenHeader
          title={isEditing ? 'تعديل حركة' : `حركة مع ${person.name}`}
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
            className="qb-press w-full rounded-2xl py-3.5 text-center text-[14.5px] font-bold text-[#0A0A0C] disabled:opacity-40"
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
        <button
          onClick={() => setDirection('given')}
          className="qb-press flex-1 rounded-[14px] py-2.75 text-[13.5px] font-bold"
          style={direction === 'given' ? { background: 'rgba(251,146,60,0.2)', color: 'var(--color-owed-by)' } : { color: 'var(--color-text-2)' }}
        >
          أعطيته مبلغ
        </button>
        <button
          onClick={() => setDirection('received')}
          className="qb-press flex-1 rounded-[14px] py-2.75 text-[13.5px] font-bold"
          style={direction === 'received' ? { background: 'rgba(45,212,191,0.2)', color: 'var(--color-owed-to)' } : { color: 'var(--color-text-2)' }}
        >
          استلمت منه مبلغ
        </button>
      </div>

      <SelectSheet
        open={accountSheetOpen}
        title="اختر الحساب"
        items={accounts.map(
          (a): SelectSheetItem => ({
            id: a.id,
            icon: <AccountTypeIcon type={a.type} size={17} />,
            iconColor: ACCOUNT_ICON_COLOR[a.type],
            iconBg: ACCOUNT_ICON_BG[a.type],
            title: a.name,
            subtitle: ACCOUNT_TYPE_LABELS[a.type],
            trailing: (
              <span className="num font-bold" style={{ color: ACCOUNT_ICON_COLOR[a.type] }}>
                {formatMoney(a.balance)}
              </span>
            ),
          }),
        )}
        selectedId={accountId}
        onSelect={(v) => {
          setAccountId(v)
          setAccountSheetOpen(false)
        }}
        onClose={() => setAccountSheetOpen(false)}
        emptyLabel="لا توجد حسابات بعد"
        footer={
          <button
            onClick={() => {
              setAccountSheetOpen(false)
              navigate('/accounts/new')
            }}
            className="qb-press mt-1 w-full rounded-2xl border border-dashed py-2.5 text-[12.5px] font-semibold"
            style={{ borderColor: 'rgba(255,255,255,0.3)', color: 'var(--color-accent)' }}
          >
            + إضافة حساب جديد
          </button>
        }
      />

      <div className="mb-6">
        <PickerField
          label={direction === 'given' ? 'من حساب' : 'إلى حساب'}
          icon={selectedAccount ? <AccountTypeIcon type={selectedAccount.type} /> : <AccountTypeIcon type="cash" />}
          iconColor={selectedAccount ? ACCOUNT_ICON_COLOR[selectedAccount.type] : 'var(--color-text-3)'}
          iconBg={selectedAccount ? ACCOUNT_ICON_BG[selectedAccount.type] : 'rgba(255,255,255,0.08)'}
          title={selectedAccount?.name ?? (accounts.length === 0 ? 'لا توجد حسابات' : 'اختر حسابًا')}
          placeholder={!selectedAccount}
          subtitle={selectedAccount ? `${ACCOUNT_TYPE_LABELS[selectedAccount.type]} · الرصيد الحالي` : undefined}
          trailing={
            selectedAccount ? (
              <span className="num text-[16px] font-bold" style={{ color: ACCOUNT_ICON_COLOR[selectedAccount.type] }}>
                {formatMoney(selectedAccount.balance)}
              </span>
            ) : undefined
          }
          onClick={() => (accounts.length === 0 ? navigate('/accounts/new') : setAccountSheetOpen(true))}
        />
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

      {accounts.length === 0 && (
        <div className="mb-5 text-[12.5px] text-[var(--color-text-3)]">
          التحويل يحتاج حسابًا — أضف حسابًا من{' '}
          <button type="button" onClick={() => navigate('/accounts/new')} className="font-semibold underline" style={{ color }}>
            هنا
          </button>
        </div>
      )}

      <div className="mb-5">
        <DatePicker value={date} onChange={setDate} color={color} fieldLabel="التاريخ" />
      </div>

      {direction === 'given' && (
        <div className="mb-5">
          <DatePicker value={dueDate} onChange={setDueDate} color={color} placeholder="بدون تاريخ استحقاق" fieldLabel="تاريخ الاستحقاق (اختياري)" />
        </div>
      )}

      <label className="mb-1.5 block text-[12.5px] font-semibold text-[var(--color-text-2)]">ملاحظة (اختياري)</label>
      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="مثال: سلفة راتب"
        className="mb-4 w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-[14px] outline-none placeholder:text-[var(--color-text-3)]"
      />
    </ScreenScroll>
  )
}
