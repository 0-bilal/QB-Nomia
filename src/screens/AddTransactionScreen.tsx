import { useEffect, useMemo, useRef, useState } from 'react'
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
import { CategoryPickerSheet } from '../components/CategoryPickerSheet'
import { ExpenseCategoryField } from '../components/ExpenseCategoryField'
import { mostUsedCategories } from '../lib/categoryStats'
import { formatMoney } from '../lib/format'
import { showUndoToast } from '../lib/undoToast'
import { haptic } from '../lib/haptics'
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
const TYPE_OPTIONS: [TransactionType, string, () => React.ReactElement][] = [
  ['expense', 'مصروف', ExpenseTypeIcon],
  ['income', 'دخل', IncomeTypeIcon],
  ['transfer', 'تحويل', TransferTypeIcon],
]

export function AddTransactionScreen() {
  const { id } = useParams<{ id?: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { accounts, categories, incomeSources, transactions, addTransaction, updateTransaction, deleteTransaction, categorySpentThisMonth } = useData()

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
  const [categoryPickerOpen, setCategoryPickerOpen] = useState(false)

  const color = TYPE_COLOR[type]
  const expenseCategories = categories.filter((c) => c.kind === 'expense')
  const numericAmount = Number(amount)
  const selectedAccount = accounts.find((a) => a.id === accountId)
  const selectedTransferToAccount = accounts.find((a) => a.id === transferToId)
  const mostUsed = useMemo(() => mostUsedCategories(expenseCategories, transactions), [expenseCategories, transactions])
  /** مصروف الفئة هذا الشهر بدون مبلغ هذه الحركة نفسها (عند التعديل) — حتى لا يُحسب المبلغ مرتين في "بعد هذا المصروف". */
  function spentExcludingThis(id: string): number {
    const spent = categorySpentThisMonth(id)
    const now = new Date()
    const monthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    return existing && existing.type === 'expense' && existing.categoryId === id && existing.date.startsWith(monthPrefix) ? spent - existing.amount : spent
  }
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

  const typeIndex = TYPE_OPTIONS.findIndex(([t]) => t === type)

  function changeType(next: TransactionType) {
    if (next === type) return
    haptic('select')
    setType(next)
  }

  // إيماءة سحب أفقية على المبلغ لتبديل نوع الحركة بسرعة (RTL: يسار = النوع التالي).
  const amountSwipe = useRef({ x: 0, y: 0, active: false })
  function onAmountPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    amountSwipe.current = { x: e.clientX, y: e.clientY, active: true }
  }
  function onAmountPointerUp(e: React.PointerEvent<HTMLDivElement>) {
    const g = amountSwipe.current
    if (!g.active || isEditing) return
    g.active = false
    const dx = e.clientX - g.x
    const dy = e.clientY - g.y
    if (Math.abs(dx) < 50 || Math.abs(dy) > Math.abs(dx)) return
    const next = typeIndex + (dx < 0 ? 1 : -1)
    if (next >= 0 && next < TYPE_OPTIONS.length) changeType(TYPE_OPTIONS[next][0])
  }

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
      haptic('success')
      navigate('/', { replace: true })
    }
  }

  function handleDelete() {
    if (!id || !existing) return
    const { type, amount, date, accountId, categoryId, incomeSourceId, transferToAccountId, note } = existing
    deleteTransaction(id)
    navigate('/', { replace: true })
    showUndoToast('تم حذف الحركة', (data) =>
      data.addTransaction({ type, amount, date, accountId, categoryId, incomeSourceId, transferToAccountId, note }),
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
        <div className="px-5 pb-6 pt-3">
          <button
            onClick={handleSave}
            disabled={!canSave}
            className="qb-press w-full rounded-full py-4 text-center text-[15px] font-semibold text-[#0A0A0C] disabled:opacity-35"
            style={{ background: color, boxShadow: canSave ? `0 16px 34px -14px ${color}` : 'none', transition: 'background 240ms ease, box-shadow 240ms ease, opacity 200ms ease' }}
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
            className="qb-press mt-1 w-full rounded-full py-3 text-[13px] font-semibold"
            style={{ background: 'var(--color-accent-soft)', color: 'var(--color-accent)' }}
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
        title="اختر مصدر الدخل"
        items={incomeSourceSheetItems}
        selectedId={incomeSourceId}
        onSelect={(v) => {
          setIncomeSourceId(v)
          setMetaSheetOpen(false)
        }}
        onClose={() => setMetaSheetOpen(false)}
        emptyLabel="لا توجد مصادر دخل بعد"
      />

      <CategoryPickerSheet
        open={categoryPickerOpen}
        categories={expenseCategories}
        mostUsed={mostUsed}
        selectedId={categoryId}
        spentOf={spentExcludingThis}
        onSelect={(v) => {
          setCategoryId(v)
          setCategoryPickerOpen(false)
        }}
        onAddNew={() => navigate('/categories/new')}
        onClose={() => setCategoryPickerOpen(false)}
      />

      <div data-own-gesture className="relative mb-5 flex rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] p-1">
        <div
          className="absolute bottom-1 top-1 rounded-full"
          style={{
            width: 'calc((100% - 8px) / 3)',
            right: `calc(4px + ${typeIndex} * (100% - 8px) / 3)`,
            background: color,
            boxShadow: `0 8px 22px -10px ${color}`,
            transition: 'right 380ms var(--ease-spring), background 240ms ease',
          }}
        />
        {TYPE_OPTIONS.map(([t, label, Icon]) => (
          <button
            key={t}
            onClick={() => changeType(t)}
            className="relative z-10 flex flex-1 items-center justify-center gap-1.5 rounded-full py-2.5 text-[13.5px] font-semibold"
            style={{ color: type === t ? '#0a0a0c' : 'var(--color-text-2)', transition: 'color 200ms ease' }}
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
              className="qb-press -my-1 flex h-10 w-10 items-center justify-center rounded-full border-4 border-[var(--color-bg)] bg-[var(--color-surface-high)] text-[var(--color-accent)] disabled:opacity-30"
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

      <div
        data-own-gesture
        className="mb-5 select-none text-center"
        style={{ touchAction: 'pan-y' }}
        onPointerDown={onAmountPointerDown}
        onPointerUp={onAmountPointerUp}
        onPointerCancel={() => (amountSwipe.current.active = false)}
      >
        <div className="mb-1 text-[12.5px] text-[var(--color-text-2)]">{type === 'expense' ? 'كم صرفت؟' : type === 'income' ? 'كم استلمت؟' : 'كم تحوّل؟'}</div>
        <div dir="ltr" className="num inline-flex items-baseline justify-center gap-2 font-bold" style={{ color, transition: 'color 240ms ease' }}>
          <span key={amount} className="text-[52px] leading-tight tracking-tight" style={{ animation: 'qb-pop 260ms var(--ease-spring) both' }}>
            {amount ? Number(amount.split('.')[0] || 0).toLocaleString('en-US') + (amount.includes('.') ? '.' + (amount.split('.')[1] ?? '') : '') : '0'}
          </span>
          <span className="font-sans text-[18px] font-medium opacity-60">ر.س</span>
        </div>
        {!isEditing && <div className="mt-1 text-[11px] text-[var(--color-text-3)]">‹ اسحب هنا يمينًا أو يسارًا لتغيير نوع الحركة ›</div>}
      </div>

      {type === 'expense' && (
        <ExpenseCategoryField
          categories={expenseCategories}
          mostUsed={mostUsed}
          selectedId={categoryId}
          spentOf={spentExcludingThis}
          amount={numericAmount}
          onSelect={setCategoryId}
          onOpenAll={() => (expenseCategories.length === 0 ? navigate('/categories/new') : setCategoryPickerOpen(true))}
        />
      )}

      <div className="mb-6">
        <AmountPad value={amount} onChange={setAmount} color={color} />
      </div>

      {type === 'income' && (
        <div className="mb-5">
          <PickerField
            label="مصدر الدخل"
            icon={selectedIncomeSource ? <span style={{ fontWeight: 700, fontSize: 15 }}>{selectedIncomeSource.name.trim().charAt(0)}</span> : <IncomeTypeIcon />}
            iconColor={selectedIncomeSource ? colorFor(selectedIncomeSource.name) : 'var(--color-text-3)'}
            iconBg={selectedIncomeSource ? `${colorFor(selectedIncomeSource.name)}22` : 'rgba(255,255,255,0.08)'}
            title={selectedIncomeSource?.name ?? (incomeSources.length === 0 ? 'لا توجد مصادر دخل' : 'اختر مصدر الدخل')}
            placeholder={!selectedIncomeSource}
            onClick={() => {
              if (incomeSources.length === 0) {
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
              <div className="text-[13.5px] font-semibold">خصم مخالفة (اختياري)</div>
              <div className="text-[11.5px] text-[var(--color-text-3)]">فعّله لو فيه مبلغ يُخصم من هذا الراتب بسبب مخالفة عمل</div>
            </div>
            <div
              className="flex h-[30px] w-[52px] flex-shrink-0 items-center rounded-full p-[3px] transition-colors duration-300"
              style={{ background: hasViolation ? 'var(--color-expense)' : 'rgba(255,255,255,0.14)' }}
            >
              <div
                className="h-6 w-6 rounded-full bg-white shadow-[0_2px_6px_rgba(0,0,0,0.35)] transition-transform duration-300"
                style={{ transform: hasViolation ? 'translateX(-22px)' : 'translateX(0)' }}
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

      <label className="mb-2 block px-1 text-[12.5px] font-medium text-[var(--color-text-2)]">ملاحظة (اختياري)</label>
      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="مثال: عشاء مع الأصدقاء"
        className="mb-4 w-full rounded-[18px] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3.5 text-[14px] outline-none placeholder:text-[var(--color-text-3)]"
      />
    </ScreenScroll>
  )
}
