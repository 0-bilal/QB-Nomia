import { useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useData } from '../../state/DataContext'
import { ScreenScroll } from '../../components/ScreenScroll'
import { ScreenHeader } from '../../components/ScreenHeader'
import { DatePicker } from '../../components/DatePicker'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { AccountSelectField, FixedPadDock, NoteChip } from '../../components/FixedPadDock'
import { formatAmount } from '../../lib/format'
import { showUndoToast } from '../../lib/undoToast'
import type { LoanDirection } from '../../types'
import { Segmented } from '../../components/ui'
import { AmountHero } from '../../components/AmountHero'
import { Avatar } from '../../components/Avatar'

export function AddLoanScreen() {
  const { personId, loanId } = useParams<{ personId: string; loanId?: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { people, accounts, loanTransactions, addLoanTransaction, updateLoanTransaction, deleteLoanTransaction, personBalance } = useData()

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
  const [noteEditing, setNoteEditing] = useState(false)

  if (!person) {
    return (
      <div dir="rtl" className="safe-top px-5 pt-15 text-center text-[13px] text-[var(--color-text-3)]">
        هذا الشخص غير موجود
      </div>
    )
  }

  const color = direction === 'given' ? 'var(--color-owed-by)' : 'var(--color-owed-to)'
  const numericAmount = Number(amount)
  /** الرصيد الصافي مع الشخص: موجب = لك عنده، سالب = عليك له. */
  const net = personBalance(person.id)
  const canSave = numericAmount > 0 && accountId

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
    if (!loanId || !person || !existing) return
    const { personId, direction, amount, accountId, date, dueDate, note } = existing
    deleteLoanTransaction(loanId)
    navigate(`/loans/${person.id}`, { replace: true })
    showUndoToast('تم حذف الحركة', (data) => data.addLoanTransaction({ personId, direction, amount, accountId, date, dueDate, note }))
  }

  return (
    <ScreenScroll
      largeTitle={false}
      contentClassName="px-5"
      header={
        <ScreenHeader
          title={isEditing ? 'تعديل حركة' : `حركة مع ${person.name}`}
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
        <FixedPadDock
          amount={amount}
          onAmountChange={setAmount}
          color={color}
          canSave={!!canSave}
          onSave={handleSave}
          saveLabel={isEditing ? 'حفظ التعديل' : 'حفظ'}
          editor={noteEditing ? { value: note, onChange: setNote, placeholder: 'مثال: سلفة راتب', onDone: () => setNoteEditing(false) } : null}
          chips={
            <>
              <DatePicker chip value={date} onChange={setDate} color={color} />
              {direction === 'given' && <DatePicker chip value={dueDate} onChange={setDueDate} color={color} placeholder="استحقاق" />}
              <NoteChip note={note} onClick={() => setNoteEditing(true)} />
            </>
          }
        />
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

      <div className="mb-3 flex items-center gap-3 px-1">
        <Avatar name={person.name} size={44} />
        <div className="min-w-0">
          <div className="truncate text-[15px] font-semibold">{person.name}</div>
          <div className="truncate text-[11.5px] text-[var(--color-text-3)]">
            {direction === 'given' ? 'المبلغ يُضاف لما لك عنده' : 'المبلغ يُخصم مما لك عنده'}
            {net !== 0 && (
              <>
                {' · '}
                {net > 0 ? 'لك عنده' : 'عليك له'} <span className="num">{formatAmount(Math.abs(net))}</span>
              </>
            )}
          </div>
        </div>
      </div>

      <Segmented
        options={[
          ['given', 'أعطيته مبلغ'],
          ['received', 'استلمت منه'],
        ]}
        value={direction}
        onChange={setDirection}
        color={color}
        className="mb-3"
      />

      <AmountHero amount={amount} color={color} label={direction === 'given' ? 'كم أعطيته؟' : 'كم استلمت منه؟'} className="mb-3" />

      <AccountSelectField label={direction === 'given' ? 'من حساب' : 'إلى حساب'} sheetTitle="اختر الحساب" accountId={accountId} onChange={setAccountId} />

      {accounts.length === 0 && (
        <div className="mb-3 text-[12.5px] text-[var(--color-text-3)]">
          التحويل يحتاج حسابًا — أضف حسابًا من{' '}
          <button type="button" onClick={() => navigate('/accounts/new')} className="font-semibold underline" style={{ color }}>
            هنا
          </button>
        </div>
      )}
    </ScreenScroll>
  )
}
