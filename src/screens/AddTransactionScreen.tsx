import { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useData, SALARY_INCOME_SOURCE_ID } from '../state/DataContext'
import { ScreenScroll } from '../components/ScreenScroll'
import { ScreenHeader } from '../components/ScreenHeader'
import { AmountPad } from '../components/AmountPad'
import { DatePicker } from '../components/DatePicker'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { PickerField } from '../components/PickerField'
import { SelectSheet, type SelectSheetItem } from '../components/SelectSheet'
import { ACCOUNT_ICON_BG, ACCOUNT_ICON_COLOR, ACCOUNT_TYPE_LABELS, AccountTypeIcon } from '../components/AccountVisuals'
import { colorFor } from '../components/Avatar'
import { CategoryIcon } from '../components/CategoryIcons'
import { formatMoney } from '../lib/format'
import { showUndoToast } from '../lib/undoToast'
import type { TransactionType } from '../types'

const TYPE_COLOR: Record<TransactionType, string> = {
  expense: 'var(--color-expense)',
  income: 'var(--color-income)',
  transfer: 'var(--color-transfer)',
}

function ExpenseTypeIcon() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <polyline points="6,13 12,19 18,13" />
    </svg>
  )
}
function IncomeTypeIcon() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="19" x2="12" y2="5" />
      <polyline points="6,11 12,5 18,11" />
    </svg>
  )
}
function TransferTypeIcon() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="17,3 21,7 17,11" />
      <path d="M3 7h18" />
      <polyline points="7,21 3,17 7,13" />
      <path d="M21 17H3" />
    </svg>
  )
}
function SwapIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="7,10 12,15 17,10" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  )
}
function TagIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3h6a2 2 0 0 1 2 2v6L11 20l-8-8Z" />
      <circle cx="15.5" cy="8.5" r="1.3" fill="currentColor" stroke="none" />
    </svg>
  )
}

const TYPE_OPTIONS: [TransactionType, string, () => React.ReactElement][] = [
  ['expense', 'مصروف', ExpenseTypeIcon],
  ['income', 'دخل', IncomeTypeIcon],
  ['transfer', 'تحويل', TransferTypeIcon],
]

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
  const amountParam = searchParams.get('amount') ?? undefined

  const [type, setType] = useState<TransactionType>(initialType)
  const [amount, setAmount] = useState(existing ? String(existing.amount) : (amountParam ?? ''))
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
  const [hasViolation, setHasViolation] = useState(false)
  const [violationAmount, setViolationAmount] = useState('')
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)

  const [fromSheetOpen, setFromSheetOpen] = useState(false)
  const [toSheetOpen, setToSheetOpen] = useState(false)
  const [metaSheetOpen, setMetaSheetOpen] = useState(false)

  const color = TYPE_COLOR[type]
  const expenseCategories = categories.filter((c) => c.kind === 'expense')
  const numericAmount = Number(amount)
  const selectedAccount = accounts.find((a) => a.id === accountId)
  const selectedTransferToAccount = accounts.find((a) => a.id === transferToId)
  const selectedCategory = expenseCategories.find((c) => c.id === categoryId)
  const selectedIncomeSource = incomeSources.find((s) => s.id === incomeSourceId)

  useEffect(() => {
    if (type === 'transfer' && transferToId === accountId) {
      const alt = accounts.find((a) => a.id !== accountId)
      if (alt) setTransferToId(alt.id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, accountId])

  const isSalaryIncome = type === 'income' && incomeSourceId === SALARY_INCOME_SOURCE_ID
  const showViolationToggle = isSalaryIncome && !isEditing

  const canSave =
    numericAmount > 0 &&
    accountId &&
    (type !== 'expense' || categoryId) &&
    (type !== 'income' || incomeSourceId) &&
    (type !== 'transfer' || (transferToId && transferToId !== accountId)) &&
    (!showViolationToggle || !hasViolation || Number(violationAmount) > 0)

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
      violationDeductionAmount: showViolationToggle && hasViolation ? Number(violationAmount) : undefined,
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
    if (!id || !existing) return
    const { type, amount, date, accountId, categoryId, incomeSourceId, transferToAccountId, note } = existing
    deleteTransaction(id)
    navigate('/', { replace: true })
    showUndoToast('تم حذف الحركة', () =>
      addTransaction({ type, amount, date, accountId, categoryId, incomeSourceId, transferToAccountId, note }),
    )
  }

  function swapAccounts() {
    const a = accountId
    setAccountId(transferToId)
    setTransferToId(a)
  }

  const accountSheetItems = (excludeId?: string): SelectSheetItem[] =>
    accounts
      .filter((a) => a.id !== excludeId)
      .map((a) => ({
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
      }))

  const categorySheetItems: SelectSheetItem[] = expenseCategories.map((c) => {
    const cColor = colorFor(c.name)
    return {
      id: c.id,
      icon: c.icon ? <CategoryIcon iconKey={c.icon} size={17} /> : <span style={{ fontWeight: 700, fontSize: 14 }}>{c.name.trim().charAt(0) || '؟'}</span>,
      iconColor: cColor,
      iconBg: `${cColor}22`,
      title: c.name,
      subtitle: c.budgetLimit ? `الميزانية الشهرية: ${formatMoney(c.budgetLimit)}` : undefined,
    }
  })

  const incomeSourceSheetItems: SelectSheetItem[] = incomeSources.map((s) => {
    const sColor = colorFor(s.name)
    return {
      id: s.id,
      icon: <span style={{ fontWeight: 700, fontSize: 14 }}>{s.name.trim().charAt(0) || '؟'}</span>,
      iconColor: sColor,
      iconBg: `${sColor}22`,
      title: s.name,
    }
  })

  return (
    <ScreenScroll
      header={
        <ScreenHeader
          title={isEditing ? 'تعديل حركة' : 'إضافة حركة'}
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

      <SelectSheet
        open={fromSheetOpen}
        title={type === 'transfer' ? 'من حساب' : 'اختر الحساب'}
        items={accountSheetItems()}
        selectedId={accountId}
        onSelect={(v) => {
          setAccountId(v)
          setFromSheetOpen(false)
        }}
        onClose={() => setFromSheetOpen(false)}
        emptyLabel="لا توجد حسابات بعد"
        footer={
          <button
            onClick={() => {
              setFromSheetOpen(false)
              navigate('/accounts/new')
            }}
            className="qb-press mt-1 w-full rounded-2xl border border-dashed py-2.5 text-[12.5px] font-semibold"
            style={{ borderColor: 'rgba(255,255,255,0.3)', color: 'var(--color-accent)' }}
          >
            + إضافة حساب جديد
          </button>
        }
      />

      <SelectSheet
        open={toSheetOpen}
        title="إلى حساب"
        items={accountSheetItems(accountId)}
        selectedId={transferToId}
        onSelect={(v) => {
          setTransferToId(v)
          setToSheetOpen(false)
        }}
        onClose={() => setToSheetOpen(false)}
        emptyLabel="أضف حسابًا ثانيًا أولًا"
      />

      <SelectSheet
        open={metaSheetOpen}
        title={type === 'expense' ? 'اختر الفئة' : 'اختر مصدر الدخل'}
        items={type === 'expense' ? categorySheetItems : incomeSourceSheetItems}
        selectedId={type === 'expense' ? categoryId : incomeSourceId}
        onSelect={(v) => {
          if (type === 'expense') setCategoryId(v)
          else setIncomeSourceId(v)
          setMetaSheetOpen(false)
        }}
        onClose={() => setMetaSheetOpen(false)}
        emptyLabel={type === 'expense' ? 'لا توجد فئات — أضف واحدة من "المزيد ← فئات المصاريف"' : 'لا توجد مصادر دخل بعد'}
      />

      <div className="mb-6 flex gap-2 rounded-2xl border border-[var(--color-border)] bg-[var(--color-void)] p-1.25">
        {TYPE_OPTIONS.map(([t, label, Icon]) => (
          <button
            key={t}
            onClick={() => setType(t)}
            className="qb-press flex flex-1 items-center justify-center gap-1.5 rounded-[14px] py-2.75 text-[13.5px] font-bold"
            style={type === t ? { background: `${TYPE_COLOR[t]}26`, color: TYPE_COLOR[t] } : { color: 'var(--color-text-2)' }}
          >
            <Icon />
            {label}
          </button>
        ))}
      </div>

      {type === 'transfer' ? (
        <div className="mb-6 flex flex-col gap-2">
          <PickerField
            label="من حساب"
            icon={selectedAccount ? <AccountTypeIcon type={selectedAccount.type} /> : <AccountTypeIcon type="cash" />}
            iconColor={selectedAccount ? ACCOUNT_ICON_COLOR[selectedAccount.type] : 'var(--color-text-3)'}
            iconBg={selectedAccount ? ACCOUNT_ICON_BG[selectedAccount.type] : 'rgba(255,255,255,0.08)'}
            title={selectedAccount?.name ?? 'اختر حسابًا'}
            placeholder={!selectedAccount}
            subtitle={selectedAccount ? ACCOUNT_TYPE_LABELS[selectedAccount.type] : undefined}
            trailing={
              selectedAccount ? (
                <span className="num text-[13.5px] font-bold" style={{ color: ACCOUNT_ICON_COLOR[selectedAccount.type] }}>
                  {formatMoney(selectedAccount.balance)}
                </span>
              ) : undefined
            }
            onClick={() => setFromSheetOpen(true)}
          />

          <div className="flex items-center justify-center">
            <button
              onClick={swapAccounts}
              aria-label="تبديل الحسابين"
              disabled={accounts.length < 2}
              className="qb-press flex h-8 w-8 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-2)] disabled:opacity-30"
            >
              <SwapIcon />
            </button>
          </div>

          <PickerField
            label="إلى حساب"
            icon={selectedTransferToAccount ? <AccountTypeIcon type={selectedTransferToAccount.type} /> : <AccountTypeIcon type="cash" />}
            iconColor={selectedTransferToAccount ? ACCOUNT_ICON_COLOR[selectedTransferToAccount.type] : 'var(--color-text-3)'}
            iconBg={selectedTransferToAccount ? ACCOUNT_ICON_BG[selectedTransferToAccount.type] : 'rgba(255,255,255,0.08)'}
            title={selectedTransferToAccount?.name ?? 'اختر حسابًا'}
            placeholder={!selectedTransferToAccount}
            subtitle={selectedTransferToAccount ? ACCOUNT_TYPE_LABELS[selectedTransferToAccount.type] : undefined}
            trailing={
              selectedTransferToAccount ? (
                <span className="num text-[13.5px] font-bold" style={{ color: ACCOUNT_ICON_COLOR[selectedTransferToAccount.type] }}>
                  {formatMoney(selectedTransferToAccount.balance)}
                </span>
              ) : undefined
            }
            onClick={() => setToSheetOpen(true)}
          />

          {accounts.length < 2 && (
            <div className="text-[12px] text-[var(--color-text-3)]">
              التحويل يحتاج حسابين على الأقل — أضف حسابًا من{' '}
              <button type="button" onClick={() => navigate('/accounts/new')} className="font-semibold underline" style={{ color }}>
                هنا
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="mb-6">
          <PickerField
            label="الحساب"
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
            onClick={() => (accounts.length === 0 ? navigate('/accounts/new') : setFromSheetOpen(true))}
          />
        </div>
      )}

      <div className="mb-6 text-center">
        <div className="mb-2 text-[12.5px] text-[var(--color-text-2)]">المبلغ</div>
        <div className="num text-[40px] font-bold" style={{ color }}>
          {amount || '0'}
        </div>
      </div>

      <div className="mb-6">
        <AmountPad value={amount} onChange={setAmount} color={color} />
      </div>

      {type !== 'transfer' && (
        <div className="mb-5">
          <PickerField
            label={type === 'expense' ? 'الفئة' : 'مصدر الدخل'}
            icon={
              type === 'expense' ? (
                selectedCategory ? (
                  selectedCategory.icon ? (
                    <CategoryIcon iconKey={selectedCategory.icon} size={17} />
                  ) : (
                    <span style={{ fontWeight: 700, fontSize: 15 }}>{selectedCategory.name.trim().charAt(0)}</span>
                  )
                ) : (
                  <TagIcon />
                )
              ) : selectedIncomeSource ? (
                <span style={{ fontWeight: 700, fontSize: 15 }}>{selectedIncomeSource.name.trim().charAt(0)}</span>
              ) : (
                <IncomeTypeIcon />
              )
            }
            iconColor={
              type === 'expense'
                ? selectedCategory
                  ? colorFor(selectedCategory.name)
                  : 'var(--color-text-3)'
                : selectedIncomeSource
                  ? colorFor(selectedIncomeSource.name)
                  : 'var(--color-text-3)'
            }
            iconBg={
              type === 'expense'
                ? selectedCategory
                  ? `${colorFor(selectedCategory.name)}22`
                  : 'rgba(255,255,255,0.08)'
                : selectedIncomeSource
                  ? `${colorFor(selectedIncomeSource.name)}22`
                  : 'rgba(255,255,255,0.08)'
            }
            title={
              type === 'expense'
                ? (selectedCategory?.name ?? (expenseCategories.length === 0 ? 'لا توجد فئات' : 'اختر فئة'))
                : (selectedIncomeSource?.name ?? (incomeSources.length === 0 ? 'لا توجد مصادر دخل' : 'اختر مصدر الدخل'))
            }
            placeholder={type === 'expense' ? !selectedCategory : !selectedIncomeSource}
            onClick={() => {
              if (type === 'expense' && expenseCategories.length === 0) {
                navigate('/categories/new')
                return
              }
              if (type === 'income' && incomeSources.length === 0) {
                navigate('/income-sources/new')
                return
              }
              setMetaSheetOpen(true)
            }}
          />
        </div>
      )}

      {showViolationToggle && (
        <>
          <button
            type="button"
            onClick={() => setHasViolation((v) => !v)}
            className="qb-card qb-press mb-5 flex w-full items-center justify-between px-4 py-3.5 text-right"
          >
            <div>
              <div className="text-[13.5px] font-bold">خصم مخالفة (اختياري)</div>
              <div className="text-[11.5px] text-[var(--color-text-3)]">فعّله لو فيه مبلغ يُخصم من هذا الراتب بسبب مخالفة عمل</div>
            </div>
            <div
              className="flex h-6 w-11 flex-shrink-0 items-center rounded-full p-0.5 transition-colors"
              style={{ background: hasViolation ? 'var(--color-expense)' : 'rgba(255,255,255,0.14)' }}
            >
              <div
                className="h-5 w-5 rounded-full bg-white transition-transform"
                style={{ transform: hasViolation ? 'translateX(-20px)' : 'translateX(0)' }}
              />
            </div>
          </button>

          {hasViolation && (
            <div className="mb-5">
              <div className="mb-3 text-center">
                <div className="mb-2 text-[12.5px] text-[var(--color-text-2)]">مبلغ الخصم</div>
                <div className="num text-[28px] font-bold" style={{ color: 'var(--color-expense)' }}>
                  {violationAmount || '0'}
                </div>
              </div>
              <AmountPad value={violationAmount} onChange={setViolationAmount} color="var(--color-expense)" />
            </div>
          )}
        </>
      )}

      <div className="mb-5">
        <DatePicker value={date} onChange={setDate} color={color} fieldLabel="التاريخ" />
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
