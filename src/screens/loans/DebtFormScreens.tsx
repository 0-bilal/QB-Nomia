import { useState, type ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useData } from '../../state/DataContext'
import { ScreenScroll } from '../../components/ScreenScroll'
import { ScreenHeader } from '../../components/ScreenHeader'
import { DatePicker } from '../../components/DatePicker'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { AmountHero } from '../../components/AmountHero'
import { AccountSelectField, FixedPadDock, NoteChip, type DockEditor } from '../../components/FixedPadDock'
import { formatAmount, formatDate } from '../../lib/format'
import { haptic } from '../../lib/haptics'
import { DEBT_META, softBg } from './debtTypes'

const today = () => new Date().toISOString().slice(0, 10)

/**
 * غلاف مشترك لشاشات الديون: عنوان في كبسولة الرأس، زر حذف عند التعديل،
 * والمحتوى فوق القسم الثابت (الكبسولات + لوحة الأرقام بزر الحفظ).
 */
function DebtFormShell({
  title,
  onDelete,
  deleteTitle,
  deleteMessage,
  dock,
  children,
}: {
  title: string
  onDelete?: () => void
  deleteTitle?: string
  deleteMessage?: string
  dock: ReactNode
  children: ReactNode
}) {
  const navigate = useNavigate()
  const [confirmOpen, setConfirmOpen] = useState(false)
  return (
    <ScreenScroll
      largeTitle={false}
      contentClassName="px-5"
      header={
        <ScreenHeader
          title={title}
          onBack={() => navigate(-1)}
          cancelLabel="إلغاء"
          className="pt-8 pb-6"
          right={
            onDelete ? (
              <button
                onClick={() => setConfirmOpen(true)}
                className="qb-press flex h-10 items-center rounded-full px-4 text-[13px] font-semibold"
                style={{ color: 'var(--color-expense)', background: 'rgba(255,95,109,0.12)' }}
              >
                حذف
              </button>
            ) : (
              <div className="w-10" />
            )
          }
        />
      }
      footer={dock}
    >
      {onDelete && (
        <ConfirmDialog
          open={confirmOpen}
          title={deleteTitle ?? 'حذف'}
          message={deleteMessage ?? ''}
          confirmLabel="حذف"
          color="var(--color-expense)"
          onConfirm={() => {
            setConfirmOpen(false)
            onDelete()
          }}
          onCancel={() => setConfirmOpen(false)}
        />
      )}
      {children}
    </ScreenScroll>
  )
}

function Missing({ label }: { label: string }) {
  return <div dir="rtl" className="safe-top px-5 pt-16 text-center text-[13px] text-[var(--color-text-3)]">{label}</div>
}

/** تسجيل أو تعديل دَين متجر: اسم المتجر فوق، والتاريخ والاستحقاق والملاحظة كبسولات فوق اللوحة. */
export function StoreDebtFormScreen() {
  const { id } = useParams<{ id?: string }>()
  const navigate = useNavigate()
  const { storeDebts, addStoreDebt, updateStoreDebt, deleteStoreDebt } = useData()
  const existing = id ? storeDebts.find((d) => d.id === id) : undefined
  const color = DEBT_META.stores.color

  const [storeName, setStoreName] = useState(existing?.storeName ?? '')
  const [amount, setAmount] = useState(existing ? String(existing.amount) : '')
  const [date, setDate] = useState(existing?.date ?? today())
  const [dueDate, setDueDate] = useState(existing?.dueDate ?? '')
  const [note, setNote] = useState(existing?.note ?? '')
  // دَين جديد يبدأ بكتابة اسم المتجر — ثم «تم» يرجّع لوحة الأرقام.
  const [editing, setEditing] = useState<'store' | 'note' | null>(existing ? null : 'store')

  if (id && !existing) return <Missing label="هذا الدَين غير موجود" />

  const numeric = Number(amount)
  const canSave = !!storeName.trim() && numeric > 0

  function save() {
    if (!canSave) return
    const input = { storeName: storeName.trim(), amount: numeric, date, dueDate: dueDate || undefined, note }
    if (existing) updateStoreDebt(existing.id, input)
    else addStoreDebt(input)
    navigate(-1)
  }

  const editor: DockEditor | null =
    editing === 'store'
      ? { value: storeName, onChange: setStoreName, placeholder: 'مثال: بقالة الحي', onDone: () => setEditing(null) }
      : editing === 'note'
        ? { value: note, onChange: setNote, placeholder: 'وش اشتريت أو استلمت من خدمة؟', onDone: () => setEditing(null) }
        : null

  return (
    <DebtFormShell
      title={existing ? 'تعديل دَين' : 'دَين متجر جديد'}
      onDelete={
        existing
          ? () => {
              deleteStoreDebt(existing.id)
              navigate(-1)
            }
          : undefined
      }
      deleteTitle="حذف الدَين"
      deleteMessage="بيتم حذف هذا الدَين وكل الدفعات المسجَّلة له، وترجع أي حركة مصروف مرتبطة بها لرصيد حسابها."
      dock={
        <FixedPadDock
          amount={amount}
          onAmountChange={setAmount}
          color={color}
          canSave={canSave}
          onSave={save}
          editor={editor}
          chips={
            <>
              <DatePicker chip value={date} onChange={setDate} color={color} />
              <DatePicker chip value={dueDate} onChange={setDueDate} color={color} placeholder="استحقاق" />
              <NoteChip note={note} onClick={() => setEditing('note')} />
            </>
          }
        />
      }
    >
      <div className="mx-1 mb-1.5 text-[12px] font-medium text-[var(--color-text-3)]">اسم المتجر</div>
      <button
        type="button"
        onClick={() => setEditing('store')}
        className="qb-press mb-3 flex h-[50px] w-full items-center rounded-[18px] border bg-[var(--color-surface)] px-4 text-right text-[14px]"
        style={{ borderColor: editing === 'store' ? 'var(--color-accent-line)' : 'var(--color-border)', color: storeName ? 'var(--color-text)' : 'var(--color-text-3)' }}
      >
        <span className="truncate">{storeName || 'مثال: بقالة الحي'}</span>
      </button>
      <AmountHero amount={amount} color={color} label="مبلغ الدَين" className="mb-3" />
    </DebtFormShell>
  )
}

/** سداد دَين متجر (كامل أو جزئي): يبدأ بكامل المتبقي، وأول رقم يُكتب يستبدله. */
export function StoreDebtPaymentScreen() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { storeDebts, storeDebtPayments, addStoreDebtPayment, accounts } = useData()
  const debt = storeDebts.find((d) => d.id === id)
  const color = DEBT_META.stores.color
  const paid = storeDebtPayments.filter((p) => p.debtId === id).reduce((s, p) => s + p.amount, 0)
  const remaining = debt ? Math.round((debt.amount - paid) * 100) / 100 : 0

  const [amount, setAmount] = useState(remaining > 0 ? String(remaining) : '')
  const [prefilled, setPrefilled] = useState(remaining > 0)
  const [quick, setQuick] = useState<'all' | 'half' | null>(remaining > 0 ? 'all' : null)
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? '')

  if (!debt) return <Missing label="هذا الدَين غير موجود" />

  const numeric = Number(amount)
  const over = numeric > remaining
  const canSave = numeric > 0 && !over && !!accountId

  function changeAmount(next: string) {
    setQuick(null)
    if (prefilled) {
      // المبلغ المقترح يُستبدل بأول ضغطة: رقم يبدأ مبلغًا جديدًا، والحذف يمسحه.
      setPrefilled(false)
      setAmount(next.length > amount.length ? next.slice(amount.length).replace(/^\./, '0.') : '')
      return
    }
    setAmount(next)
  }

  function pickQuick(kind: 'all' | 'half') {
    haptic('tick')
    setQuick(kind)
    setPrefilled(true)
    setAmount(String(kind === 'all' ? remaining : Math.round((remaining / 2) * 100) / 100))
  }

  function save() {
    if (!canSave || !debt) return
    addStoreDebtPayment({ debtId: debt.id, amount: numeric, accountId, date: today() })
    navigate(-1)
  }

  const pct = Math.min(100, (paid / debt.amount) * 100)

  return (
    <DebtFormShell title={`سداد · ${debt.storeName}`} dock={<FixedPadDock amount={amount} onAmountChange={changeAmount} color={color} canSave={canSave} onSave={save} />}>
      <div className="qb-card mb-2 flex items-center justify-between gap-3 px-4 py-3">
        <div>
          <div className="text-[11.5px] text-[var(--color-text-3)]">المتبقي</div>
          <div className="num mt-0.5 text-[19px] font-bold">
            {formatAmount(remaining)} <span className="font-sans text-[11px] font-medium text-[var(--color-text-3)]">ر.س</span>
          </div>
        </div>
        <div className="w-[130px]">
          <div className="text-left text-[11px] text-[var(--color-text-3)]">
            مسدَّد <span className="num">{formatAmount(paid)}</span> من <span className="num">{formatAmount(debt.amount)}</span>
          </div>
          <div className="mt-2 overflow-hidden rounded-full bg-white/[0.07]" style={{ height: 5 }}>
            <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
          </div>
        </div>
      </div>

      <AmountHero amount={amount} color={over ? 'var(--color-expense)' : color} label="مبلغ السداد" className="mb-1" />
      <div className="mb-2 h-4 text-center text-[11.5px] text-[var(--color-expense)]">{over ? `أكثر من المتبقي (${formatAmount(remaining)})` : ''}</div>
      <div className="mb-3 flex justify-center gap-1.5">
        {(
          [
            ['all', 'كامل المتبقي'],
            ['half', 'النصف'],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            type="button"
            onClick={() => pickQuick(k)}
            className="qb-press h-[30px] rounded-full border px-3 text-[11.5px] font-semibold"
            style={quick === k ? { background: softBg(color), borderColor: softBg(color, 40), color } : { background: 'rgba(255,255,255,.05)', borderColor: 'var(--color-border)', color: 'var(--color-text-2)' }}
          >
            {label}
          </button>
        ))}
      </div>

      <AccountSelectField label="يُسدَّد من حساب" accountId={accountId} onChange={setAccountId} />
    </DebtFormShell>
  )
}

/** تسجيل أو تعديل سلفة راتب: المبلغ والحساب فقط. */
export function SalaryAdvanceFormScreen() {
  const { id } = useParams<{ id?: string }>()
  const navigate = useNavigate()
  const { salaryAdvances, logSalaryAdvance, updateSalaryAdvance, deleteSalaryAdvance, accounts } = useData()
  const existing = id ? salaryAdvances.find((a) => a.id === id) : undefined
  const color = DEBT_META.advance.color

  const [amount, setAmount] = useState(existing ? String(existing.amount) : '')
  const [accountId, setAccountId] = useState(existing?.accountId ?? accounts[0]?.id ?? '')

  if (id && !existing) return <Missing label="هذه السلفة غير موجودة" />

  const numeric = Number(amount)
  const canSave = numeric > 0 && !!accountId

  function save() {
    if (!canSave) return
    if (existing) updateSalaryAdvance(existing.id, { amount: numeric, accountId })
    else logSalaryAdvance({ amount: numeric, accountId })
    navigate(-1)
  }

  return (
    <DebtFormShell
      title={existing ? 'تعديل سلفة راتب' : 'سلفة راتب'}
      onDelete={
        existing
          ? () => {
              deleteSalaryAdvance(existing.id)
              navigate(-1)
            }
          : undefined
      }
      deleteTitle="حذف السلفة"
      deleteMessage="بيتم حذف هذي السلفة والحركة المالية المرتبطة بيها من سجلك، وخصم مبلغها من رصيد الحساب."
      dock={<FixedPadDock amount={amount} onAmountChange={setAmount} color={color} canSave={canSave} onSave={save} />}
    >
      <AmountHero amount={amount} color={color} label="مبلغ السلفة" className="mb-1" />
      <div className="mb-3 text-center text-[11.5px] text-[var(--color-text-3)]">تُخصم تلقائيًا من أول حركة دخل «راتب» تسجّلها</div>
      <AccountSelectField label="تُضاف إلى حساب" accountId={accountId} onChange={setAccountId} />
    </DebtFormShell>
  )
}

/** تعديل خصم مخالفة: المبلغ والسبب — الحساب موروث من حركة الراتب ولا يتغيّر. */
export function ViolationEditScreen() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { salaryViolations, updateSalaryViolation, deleteSalaryViolation } = useData()
  const existing = salaryViolations.find((v) => v.id === id)
  const color = DEBT_META.violations.color

  const [amount, setAmount] = useState(existing ? String(existing.amount) : '')
  const [note, setNote] = useState(existing?.note ?? '')
  const [noteEditing, setNoteEditing] = useState(false)

  if (!existing) return <Missing label="هذا الخصم غير موجود" />

  const numeric = Number(amount)
  const canSave = numeric > 0

  function save() {
    if (!canSave || !existing) return
    updateSalaryViolation(existing.id, { amount: numeric, note })
    navigate(-1)
  }

  return (
    <DebtFormShell
      title="تعديل خصم مخالفة"
      onDelete={() => {
        deleteSalaryViolation(existing.id)
        navigate(-1)
      }}
      deleteTitle="حذف الخصم"
      deleteMessage="بيتم حذف هذا الخصم، ويرجع مبلغه لحركة الراتب المرتبطة به ولرصيد الحساب."
      dock={
        <FixedPadDock
          amount={amount}
          onAmountChange={setAmount}
          color={color}
          canSave={canSave}
          onSave={save}
          editor={noteEditing ? { value: note, onChange: setNote, placeholder: 'سبب المخالفة', onDone: () => setNoteEditing(false) } : null}
          chips={<NoteChip note={note} placeholder="سبب المخالفة" onClick={() => setNoteEditing(true)} />}
        />
      }
    >
      <AmountHero amount={amount} color={color} label="مبلغ الخصم" className="mb-1" />
      <div className="text-center text-[11.5px] text-[var(--color-text-3)]">
        من راتب <span className="num">{formatDate(existing.date)}</span>
      </div>
    </DebtFormShell>
  )
}
