import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useData } from '../../state/DataContext'
import { formatAmount, formatMoney, formatDate } from '../../lib/format'
import { AmountPad } from '../../components/AmountPad'
import { DatePicker } from '../../components/DatePicker'
import { PickerField } from '../../components/PickerField'
import { SelectSheet, type SelectSheetItem } from '../../components/SelectSheet'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { ACCOUNT_ICON_BG, ACCOUNT_ICON_COLOR, ACCOUNT_TYPE_LABELS, AccountTypeIcon } from '../../components/AccountVisuals'
import type { Account, StoreDebt, StoreDebtPayment } from '../../types'
import { EmptyState, IconBubble, TintButton } from '../../components/ui'
import { DEBT_META, softBg } from './debtTypes'
import { DebtHero, SectionHead } from './DebtVisuals'

const color = DEBT_META.stores.color

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
      <label className="mb-2 block px-1 text-[12.5px] font-medium text-[var(--color-text-2)]">اسم المتجر</label>
      <input
        value={storeName}
        onChange={(e) => setStoreName(e.target.value)}
        placeholder="مثال: بقالة الحي"
        className="mb-4 w-full rounded-[18px] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3.5 text-[14px] outline-none placeholder:text-[var(--color-text-3)]"
      />

      <div className="mb-1.5 text-[12px] text-[var(--color-text-3)]">مبلغ الدَين</div>
      <div dir="ltr" className="mb-4 flex items-baseline justify-center gap-2">
        <span key={amount} className="num text-[44px] font-bold tracking-tight" style={{ animation: 'qb-pop 260ms var(--ease-spring) both' }}>{amount || '0'}</span>
        <span className="flex-shrink-0 text-[16px] font-medium text-[var(--color-text-3)]">ر.س</span>
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

      <label className="mb-2 block px-1 text-[12.5px] font-medium text-[var(--color-text-2)]">ملاحظة (اختياري)</label>
      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="وش اشتريت أو استلمت من خدمة؟"
        className="mb-4 w-full rounded-[18px] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3.5 text-[14px] outline-none placeholder:text-[var(--color-text-3)]"
      />

      <div className="flex gap-2.5">
        <button onClick={onCancel} className="qb-press flex-1 rounded-full bg-white/[0.06] py-3 text-[13.5px] font-medium text-[var(--color-text)]">
          إلغاء
        </button>
        <button
          onClick={() => canSave && onSave({ storeName, amount: numeric, date, dueDate: dueDate || undefined, note })}
          disabled={!canSave}
          className="qb-press flex-1 rounded-full py-3 text-[13.5px] font-semibold text-[#0A0A0C] disabled:opacity-35"
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
        <span key={amount} className="num text-[44px] font-bold tracking-tight" style={{ animation: 'qb-pop 260ms var(--ease-spring) both' }}>{amount || '0'}</span>
        <span className="flex-shrink-0 text-[16px] font-medium text-[var(--color-text-3)]">ر.س</span>
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
            className="qb-press mt-1 w-full rounded-full py-3 text-[13px] font-semibold"
            style={{ background: 'var(--color-accent-soft)', color: 'var(--color-accent)' }}
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
        <button onClick={onCancel} className="qb-press flex-1 rounded-full bg-white/[0.06] py-3 text-[13.5px] font-medium text-[var(--color-text)]">
          إلغاء
        </button>
        <button
          onClick={() => canSave && onSave(numeric, accountId)}
          disabled={!canSave}
          className="qb-press flex-1 rounded-full py-3 text-[13.5px] font-semibold text-[#0A0A0C] disabled:opacity-35"
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
    ? { background: 'rgba(62,224,143,0.12)', color: 'var(--color-income)' }
    : overdue
      ? { background: 'rgba(255,95,109,0.14)', color: 'var(--color-expense)' }
      : { background: 'rgba(255,255,255,0.08)', color: 'var(--color-text-2)' }

  function closeForms() {
    setMode('view')
  }

  return (
    <div className="qb-card overflow-hidden" style={{ opacity: settled && !expanded ? 0.65 : 1 }}>
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

      <button onClick={() => setExpanded((e) => !e)} className="block w-full p-4 text-right active:bg-white/[0.03]">
        <div className="flex items-center gap-3">
          <IconBubble color={settled ? 'var(--color-text-3)' : color}>
            <StoreDebtIcon size={19} />
          </IconBubble>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="truncate text-[14px] font-medium">{debt.storeName}</span>
              <span className="flex-shrink-0 rounded-full px-2 py-0.5 text-[10.5px] font-semibold" style={statusStyle}>
                {statusLabel}
              </span>
            </div>
            <div className="truncate text-[11.5px] text-[var(--color-text-3)]">
              {formatDate(debt.date)}
              {debt.dueDate ? ` · الاستحقاق: ${formatDate(debt.dueDate)}` : ''}
              {debt.note ? ` · ${debt.note}` : ''}
            </div>
          </div>
          <div className="flex flex-shrink-0 flex-col items-end">
            <span className="num text-[15px] font-bold" style={{ color: settled ? 'var(--color-text-2)' : 'var(--color-text)' }}>
              {settled ? '—' : formatAmount(remaining)}
            </span>
            <span className="text-[10px] text-[var(--color-text-3)]">{settled ? '' : 'متبقي'}</span>
          </div>
        </div>
        <div className="mb-1.5 mt-3 overflow-hidden rounded-full bg-white/[0.07]" style={{ height: 7 }}>
          <div
            className="h-full rounded-full"
            style={{ width: `${Math.min(100, (paidTotal / debt.amount) * 100)}%`, background: settled ? 'var(--color-income)' : color, transition: 'width 300ms ease' }}
          />
        </div>
        <div className="flex justify-between text-[11px] text-[var(--color-text-3)]">
          <span>
            سُدد <b className="num font-semibold text-[var(--color-text-2)]">{formatAmount(paidTotal)}</b> من <span className="num">{formatAmount(debt.amount)}</span>
          </span>
          <span className="num">{Math.round(Math.min(100, (paidTotal / debt.amount) * 100))}%</span>
        </div>
      </button>

      {!expanded && !settled && (
        <div className="flex gap-2 px-4 pb-4">
          <button
            onClick={() => {
              setExpanded(true)
              setMode('pay')
            }}
            className="qb-press flex-1 rounded-full border py-2.5 text-[12.5px] font-semibold"
            style={{ background: softBg(color), color, borderColor: softBg(color, 30) }}
          >
            سداد
          </button>
          <button
            onClick={() => {
              setExpanded(true)
              setMode('edit')
            }}
            className="qb-press flex-1 rounded-full bg-[var(--color-surface-high)] py-2.5 text-[12.5px] font-semibold"
          >
            تعديل
          </button>
        </div>
      )}

      {expanded && (
        <div className="border-t qb-divider p-4">
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
                  <TintButton color={color} onClick={() => setMode('pay')} className="flex-1">
                    سداد
                  </TintButton>
                )}
                <button
                  onClick={() => setMode('edit')}
                  className="qb-press flex-1 rounded-full bg-white/[0.06] py-3 text-[13.5px] font-medium text-[var(--color-text)]"
                >
                  تعديل
                </button>
              </div>

              <div className="mb-2 text-[12.5px] font-semibold text-[var(--color-text-2)]">الدفعات المسجَّلة</div>
              {payments.length === 0 ? (
                <div className="rounded-[18px] bg-white/[0.04] p-3 text-center text-[12px] text-[var(--color-text-3)]">
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
                        className="qb-press flex items-center justify-between rounded-[16px] px-3.5 py-2.5 text-right"
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
export function StoreDebtsPanel({ startAdding = false }: { startAdding?: boolean }) {
  const { storeDebts, storeDebtPayments, addStoreDebt, accounts } = useData()
  const [addingNew, setAddingNew] = useState(startAdding)

  const today = new Date().toISOString().slice(0, 10)
  const remainingOf = (debt: StoreDebt) => debt.amount - storeDebtPayments.filter((p) => p.debtId === debt.id).reduce((s, p) => s + p.amount, 0)
  const open = storeDebts.filter((d) => remainingOf(d) > 0)
  const overdueCount = open.filter((d) => d.dueDate && d.dueDate < today).length
  const totalOutstanding = open.reduce((sum, d) => sum + remainingOf(d), 0)
  // المتأخر أولًا، ثم الأقرب استحقاقًا، ثم بدون تاريخ استحقاق، والمسدَّد بالأخير.
  const rank = (d: StoreDebt) => (remainingOf(d) <= 0 ? 3 : d.dueDate ? (d.dueDate < today ? 0 : 1) : 2)
  const sorted = [...storeDebts].sort((a, b) => rank(a) - rank(b) || (a.dueDate ?? '').localeCompare(b.dueDate ?? '') || b.date.localeCompare(a.date))

  return (
    <>
      <DebtHero color={color}>
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
            <div className="text-[12.5px] font-medium text-[var(--color-text-2)]">المتبقي لكل المتاجر</div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="num text-[34px] font-bold" style={{ color: totalOutstanding > 0 ? color : 'var(--color-text-2)' }}>
                {formatAmount(totalOutstanding)}
              </span>
              <span className="text-[13px] font-medium text-[var(--color-text-3)]">ر.س</span>
            </div>
            <div className="mt-0.5 text-[11.5px] text-[var(--color-text-3)]">
              {open.length === 0 ? (
                'لا توجد ديون قائمة حاليًا'
              ) : (
                <>
                  {open.length} ديون قائمة
                  {overdueCount > 0 && <b className="font-semibold" style={{ color: 'var(--color-expense)' }}> · {overdueCount} متأخر عن موعده</b>}
                </>
              )}
            </div>
            <button
              onClick={() => setAddingNew(true)}
              className="qb-press mt-4 flex w-full items-center justify-center gap-2 rounded-full border py-3 text-[13.5px] font-semibold"
              style={{ background: softBg(color), color, borderColor: softBg(color, 30) }}
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
              تسجيل دَين جديد
            </button>
          </>
        )}
      </DebtHero>

      <SectionHead title="الديون" hint={storeDebts.length ? 'المتأخر ثم الأقرب استحقاقًا' : undefined} />
      {storeDebts.length === 0 ? (
        <EmptyState title="لا يوجد سجل بعد" />
      ) : (
        <div className="flex flex-col gap-2.5">
          {sorted.map((debt) => (
            <DebtRow key={debt.id} debt={debt} payments={storeDebtPayments.filter((p) => p.debtId === debt.id)} accounts={accounts} />
          ))}
        </div>
      )}
    </>
  )
}
