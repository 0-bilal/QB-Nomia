import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useData } from '../../state/DataContext'
import { formatMoney, formatDate } from '../../lib/format'
import { AmountPad } from '../../components/AmountPad'
import { DatePicker } from '../../components/DatePicker'
import { PickerField } from '../../components/PickerField'
import { SelectSheet, type SelectSheetItem } from '../../components/SelectSheet'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { ACCOUNT_ICON_BG, ACCOUNT_ICON_COLOR, ACCOUNT_TYPE_LABELS, AccountTypeIcon } from '../../components/AccountVisuals'
import type { Account, StoreDebt, StoreDebtPayment } from '../../types'

const color = 'var(--color-expense)'

function StoreDebtIcon({ size = 20 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3.5 9.5 4.5 4h15l1 5.5" />
      <path d="M3.5 9.5a2.3 2.3 0 0 0 4.6 0 2.3 2.3 0 0 0 4.6 0 2.3 2.3 0 0 0 4.6 0 2.3 2.3 0 0 0 4.6 0" />
      <path d="M5 9.5V20h14V9.5" />
      <path d="M10 20v-5.5h4V20" />
    </svg>
  )
}

/** محرر تسجيل/تعديل دَين متجر مضمّن — اسم المتجر + المبلغ + التاريخ + استحقاق اختياري + ملاحظة. */
function DebtForm({
  initial,
  onSave,
  onDelete,
  onCancel,
}: {
  initial?: { storeName: string; amount: number; date: string; dueDate?: string; note?: string }
  onSave: (input: { storeName: string; amount: number; date: string; dueDate?: string; note?: string }) => void
  onDelete?: () => void
  onCancel: () => void
}) {
  const [storeName, setStoreName] = useState(initial?.storeName ?? '')
  const [amount, setAmount] = useState(initial ? String(initial.amount) : '')
  const [date, setDate] = useState(initial?.date ?? new Date().toISOString().slice(0, 10))
  const [dueDate, setDueDate] = useState(initial?.dueDate ?? '')
  const [note, setNote] = useState(initial?.note ?? '')

  const numeric = Number(amount)
  const canSave = storeName.trim() && numeric > 0

  return (
    <div>
      <label className="mb-1.5 block text-[12px] text-[var(--color-text-3)]">اسم المتجر</label>
      <input
        value={storeName}
        onChange={(e) => setStoreName(e.target.value)}
        placeholder="مثال: بقالة الحي"
        className="mb-4 w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-[14px] outline-none placeholder:text-[var(--color-text-3)]"
      />

      <div className="mb-1.5 text-[12px] text-[var(--color-text-3)]">مبلغ الدَين</div>
      <div dir="ltr" className="mb-4 flex items-baseline justify-center gap-2">
        <span className="num text-[32px] font-bold">{amount || '0'}</span>
        <span className="flex-shrink-0 text-[13px] font-semibold text-[var(--color-text-3)]">ر.س</span>
      </div>
      <div className="mb-4 flex justify-center">
        <AmountPad value={amount} onChange={setAmount} color={color} />
      </div>

      <div className="mb-4">
        <DatePicker value={date} onChange={setDate} color={color} fieldLabel="تاريخ الدَين" />
      </div>
      <div className="mb-4">
        <DatePicker value={dueDate} onChange={setDueDate} color={color} placeholder="بدون تاريخ استحقاق" fieldLabel="تاريخ الاستحقاق (اختياري)" />
      </div>

      <label className="mb-1.5 block text-[12px] text-[var(--color-text-3)]">ملاحظة (اختياري)</label>
      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="وش اشتريت أو استلمت من خدمة؟"
        className="mb-4 w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-[14px] outline-none placeholder:text-[var(--color-text-3)]"
      />

      <div className="flex gap-2.5">
        <button onClick={onCancel} className="flex-1 rounded-2xl border border-[var(--color-border)] py-2.75 text-[13px] font-semibold text-[var(--color-text-2)]">
          إلغاء
        </button>
        <button
          onClick={() => canSave && onSave({ storeName, amount: numeric, date, dueDate: dueDate || undefined, note })}
          disabled={!canSave}
          className="flex-1 rounded-2xl py-2.75 text-[13px] font-bold text-[#0A0A0C] disabled:opacity-40"
          style={{ background: color }}
        >
          حفظ
        </button>
      </div>

      {onDelete && (
        <button onClick={onDelete} className="qb-press mt-3 w-full text-center text-[12.5px] font-semibold" style={{ color }}>
          حذف الدَين
        </button>
      )}
    </div>
  )
}

/** محرر تسجيل سداد (كامل أو جزئي) — المبلغ محدود بالمتبقي + اختيار الحساب. */
function PaymentForm({
  remaining,
  accounts,
  onSave,
  onCancel,
}: {
  remaining: number
  accounts: Account[]
  onSave: (amount: number, accountId: string) => void
  onCancel: () => void
}) {
  const navigate = useNavigate()
  const [amount, setAmount] = useState(String(remaining))
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? '')
  const [accountSheetOpen, setAccountSheetOpen] = useState(false)

  const numeric = Number(amount)
  const selectedAccount = accounts.find((a) => a.id === accountId)
  const canSave = numeric > 0 && numeric <= remaining && !!accountId

  return (
    <div>
      <div className="mb-1.5 text-[12px] text-[var(--color-text-3)]">مبلغ السداد (المتبقي {formatMoney(remaining)})</div>
      <div dir="ltr" className="mb-4 flex items-baseline justify-center gap-2">
        <span className="num text-[32px] font-bold">{amount || '0'}</span>
        <span className="flex-shrink-0 text-[13px] font-semibold text-[var(--color-text-3)]">ر.س</span>
      </div>
      <div className="mb-4 flex justify-center">
        <AmountPad value={amount} onChange={setAmount} color={color} />
      </div>

      <SelectSheet
        open={accountSheetOpen}
        title="يُسدَّد من حساب"
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

      <div className="mb-4">
        <PickerField
          label="يُسدَّد من حساب"
          icon={selectedAccount ? <AccountTypeIcon type={selectedAccount.type} /> : <AccountTypeIcon type="cash" />}
          iconColor={selectedAccount ? ACCOUNT_ICON_COLOR[selectedAccount.type] : 'var(--color-text-3)'}
          iconBg={selectedAccount ? ACCOUNT_ICON_BG[selectedAccount.type] : 'rgba(255,255,255,0.08)'}
          title={selectedAccount?.name ?? (accounts.length === 0 ? 'لا توجد حسابات' : 'اختر حسابًا')}
          placeholder={!selectedAccount}
          subtitle={selectedAccount ? ACCOUNT_TYPE_LABELS[selectedAccount.type] : undefined}
          trailing={
            selectedAccount ? (
              <span className="num text-[13.5px] font-bold" style={{ color: ACCOUNT_ICON_COLOR[selectedAccount.type] }}>
                {formatMoney(selectedAccount.balance)}
              </span>
            ) : undefined
          }
          onClick={() => (accounts.length === 0 ? navigate('/accounts/new') : setAccountSheetOpen(true))}
        />
      </div>

      <div className="flex gap-2.5">
        <button onClick={onCancel} className="flex-1 rounded-2xl border border-[var(--color-border)] py-2.75 text-[13px] font-semibold text-[var(--color-text-2)]">
          إلغاء
        </button>
        <button
          onClick={() => canSave && onSave(numeric, accountId)}
          disabled={!canSave}
          className="flex-1 rounded-2xl py-2.75 text-[13px] font-bold text-[#0A0A0C] disabled:opacity-40"
          style={{ background: color }}
        >
          تسجيل السداد
        </button>
      </div>
    </div>
  )
}

type RowMode = 'view' | 'edit' | 'pay'

function DebtRow({ debt, payments, accounts }: { debt: StoreDebt; payments: StoreDebtPayment[]; accounts: Account[] }) {
  const { updateStoreDebt, deleteStoreDebt, addStoreDebtPayment, deleteStoreDebtPayment } = useData()
  const [expanded, setExpanded] = useState(false)
  const [mode, setMode] = useState<RowMode>('view')
  const [confirmDeleteDebt, setConfirmDeleteDebt] = useState(false)
  const [confirmDeletePaymentId, setConfirmDeletePaymentId] = useState<string | null>(null)

  const today = new Date().toISOString().slice(0, 10)
  const paidTotal = payments.reduce((s, p) => s + p.amount, 0)
  const remaining = debt.amount - paidTotal
  const settled = remaining <= 0
  const overdue = !settled && !!debt.dueDate && debt.dueDate < today
  const statusLabel = settled ? 'مسدَّد' : overdue ? 'متأخر' : 'قائم'
  const statusStyle = settled
    ? { background: 'rgba(255,255,255,0.08)', color: 'var(--color-text-3)' }
    : overdue
      ? { background: 'rgba(255,92,92,0.16)', color: color }
      : { background: 'rgba(255,255,255,0.08)', color: 'var(--color-text-2)' }

  function closeForms() {
    setMode('view')
  }

  return (
    <div className="qb-card overflow-hidden">
      <ConfirmDialog
        open={confirmDeleteDebt}
        title="حذف الدَين"
        message="بيتم حذف هذا الدَين وكل الدفعات المسجَّلة له، وترجع أي حركة مصروف مرتبطة بها لرصيد حسابها."
        confirmLabel="حذف"
        color={color}
        onConfirm={() => {
          deleteStoreDebt(debt.id)
          setConfirmDeleteDebt(false)
        }}
        onCancel={() => setConfirmDeleteDebt(false)}
      />
      <ConfirmDialog
        open={confirmDeletePaymentId !== null}
        title="حذف السداد"
        message="بيتم حذف هذا السداد وحركة المصروف المرتبطة به، ويرجع مبلغه لرصيد الحساب."
        confirmLabel="حذف"
        color={color}
        onConfirm={() => {
          if (confirmDeletePaymentId) deleteStoreDebtPayment(confirmDeletePaymentId)
          setConfirmDeletePaymentId(null)
        }}
        onCancel={() => setConfirmDeletePaymentId(null)}
      />

      <button onClick={() => setExpanded((e) => !e)} className="qb-press block w-full p-3.5 text-right">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <div className="text-[13.5px] font-bold">{debt.storeName}</div>
            <span className="rounded-full px-1.5 py-0.5 text-[9.5px] font-bold" style={statusStyle}>
              {statusLabel}
            </span>
          </div>
          <span className="num text-[13.5px] font-bold" style={{ color }}>
            {formatMoney(remaining)}
          </span>
        </div>
        <div className="mt-1.5 text-[11px] text-[var(--color-text-3)]">
          {formatDate(debt.date)}
          {debt.dueDate ? ` · الاستحقاق: ${formatDate(debt.dueDate)}` : ''}
          {debt.note ? ` · ${debt.note}` : ''}
        </div>
      </button>

      {expanded && (
        <div className="border-t qb-divider p-3.5">
          {mode === 'edit' ? (
            <DebtForm
              initial={{ storeName: debt.storeName, amount: debt.amount, date: debt.date, dueDate: debt.dueDate, note: debt.note }}
              onSave={(input) => {
                updateStoreDebt(debt.id, input)
                closeForms()
              }}
              onDelete={() => setConfirmDeleteDebt(true)}
              onCancel={closeForms}
            />
          ) : mode === 'pay' ? (
            <PaymentForm
              remaining={remaining}
              accounts={accounts}
              onSave={(amount, accountId) => {
                addStoreDebtPayment({ debtId: debt.id, amount, accountId, date: new Date().toISOString().slice(0, 10) })
                closeForms()
              }}
              onCancel={closeForms}
            />
          ) : (
            <>
              <div className="mb-3 flex gap-2.5">
                {!settled && (
                  <button onClick={() => setMode('pay')} className="qb-press flex-1 rounded-2xl py-2.5 text-[12.5px] font-bold" style={{ background: 'rgba(255,92,92,0.16)', color }}>
                    سداد
                  </button>
                )}
                <button
                  onClick={() => setMode('edit')}
                  className="qb-press flex-1 rounded-2xl border border-[var(--color-border)] py-2.5 text-[12.5px] font-semibold text-[var(--color-text-2)]"
                >
                  تعديل
                </button>
              </div>

              <div className="qb-section-label mb-2">الدفعات المسجَّلة</div>
              {payments.length === 0 ? (
                <div className="rounded-2xl border border-dashed p-3 text-center text-[11.5px] text-[var(--color-text-3)]" style={{ borderColor: 'rgba(255,255,255,0.14)' }}>
                  ما فيه دفعات مسجَّلة بعد
                </div>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {payments.map((p) => {
                    const account = accounts.find((a) => a.id === p.accountId)
                    return (
                      <button
                        key={p.id}
                        onClick={() => setConfirmDeletePaymentId(p.id)}
                        className="qb-press flex items-center justify-between rounded-xl px-3 py-2 text-right"
                        style={{ background: 'rgba(255,255,255,0.04)' }}
                      >
                        <div className="text-[11.5px] text-[var(--color-text-3)]">
                          {formatDate(p.date)}
                          {account ? ` · ${account.name}` : ''}
                        </div>
                        <span className="num text-[12.5px] font-bold">{formatMoney(p.amount)}</span>
                      </button>
                    )
                  })}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

/** محتوى تبويب "ديون متاجر" داخل شاشة الديون والسلف. */
export function StoreDebtsPanel() {
  const { storeDebts, storeDebtPayments, addStoreDebt, accounts } = useData()
  const [addingNew, setAddingNew] = useState(false)

  const remainingOf = (debt: StoreDebt) => debt.amount - storeDebtPayments.filter((p) => p.debtId === debt.id).reduce((s, p) => s + p.amount, 0)
  const totalOutstanding = storeDebts.reduce((sum, d) => sum + Math.max(0, remainingOf(d)), 0)

  return (
    <>
      <div className="qb-card-elevated mb-5 p-4.5">
        <div className="mb-3 flex items-center gap-3">
          <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-[14px]" style={{ width: 44, height: 44, background: 'rgba(255,92,92,0.14)', color }}>
            <StoreDebtIcon />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[14.5px] font-bold">ديون المتاجر</div>
            <div className="truncate text-[11px] text-[var(--color-text-3)]">سلع أو خدمات أخذتها ولسه ما دفعت قيمتها بالكامل</div>
          </div>
        </div>

        {addingNew ? (
          <DebtForm
            onSave={(input) => {
              addStoreDebt(input)
              setAddingNew(false)
            }}
            onCancel={() => setAddingNew(false)}
          />
        ) : (
          <>
            {totalOutstanding === 0 ? (
              <div className="mb-3 rounded-2xl border border-dashed p-3.5 text-[12px] leading-relaxed" style={{ borderColor: 'rgba(255,92,92,0.4)', color: 'var(--color-text-2)' }}>
                لا توجد ديون قائمة حاليًا.
              </div>
            ) : (
              <div className="mb-3">
                <div className="text-[11.5px] text-[var(--color-text-3)]">إجمالي المتبقي</div>
                <div className="num text-[22px] font-bold" style={{ color }}>
                  {formatMoney(totalOutstanding)}
                </div>
              </div>
            )}
            <button onClick={() => setAddingNew(true)} className="qb-press w-full rounded-2xl py-2.75 text-[12.5px] font-bold" style={{ background: 'rgba(255,92,92,0.16)', color }}>
              تسجيل دَين جديد
            </button>
          </>
        )}
      </div>

      <div className="qb-section-label mb-2 px-1">سجل الديون</div>
      {storeDebts.length === 0 ? (
        <div className="qb-card py-10 text-center text-[13px] text-[var(--color-text-3)]">لا يوجد سجل بعد</div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {storeDebts.map((debt) => (
            <DebtRow key={debt.id} debt={debt} payments={storeDebtPayments.filter((p) => p.debtId === debt.id)} accounts={accounts} />
          ))}
        </div>
      )}
    </>
  )
}
