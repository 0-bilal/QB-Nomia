import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useData } from '../state/DataContext'
import { ScreenScroll } from '../components/ScreenScroll'
import { AccountMiniField, FixedPadDock, NoteChip } from '../components/FixedPadDock'
import { SheetHandle } from '../components/SheetHandle'
import { ScreenHeader } from '../components/ScreenHeader'
import { DatePicker } from '../components/DatePicker'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { PickerField } from '../components/PickerField'
import { SelectSheet, type SelectSheetItem } from '../components/SelectSheet'
import { ACCOUNT_ICON_BG, ACCOUNT_ICON_COLOR, ACCOUNT_TYPE_LABELS, AccountTypeIcon } from '../components/AccountVisuals'
import { colorFor } from '../components/Avatar'
import { intervalLabel } from './CommitmentsScreen'
import { formatMoney } from '../lib/format'
import { showUndoToast } from '../lib/undoToast'
import type { CommitmentIntervalUnit, TransactionType } from '../types'
import { AmountHero } from '../components/AmountHero'

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
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 7h12l-3-3M17 17H5l3 3" />
    </svg>
  )
}
function RepeatIcon() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 2l4 4-4 4" />
      <path d="M3 11V9a3 3 0 0 1 3-3h15" />
      <path d="M7 22l-4-4 4-4" />
      <path d="M21 13v2a3 3 0 0 1-3 3H3" />
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

const UNIT_OPTIONS: [CommitmentIntervalUnit, string][] = [
  ['day', 'يوم'],
  ['week', 'أسبوع'],
  ['month', 'شهر'],
  ['year', 'سنة'],
]

/** «يتكرر كل…» — ورقة صغيرة بدل حقلين داخل الشاشة، عشان تبقى لوحة الأرقام ثابتة. */
function RepeatSheet({
  open,
  color,
  unit,
  count,
  onUnit,
  onCount,
  onClose,
}: {
  open: boolean
  color: string
  unit: CommitmentIntervalUnit
  count: number
  onUnit: (u: CommitmentIntervalUnit) => void
  onCount: (n: number) => void
  onClose: () => void
}) {
  if (!open) return null
  return (
    <div dir="rtl" className="fixed inset-0 z-[65] flex items-end justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-[6px]" style={{ animation: 'fade-in 180ms ease-out both' }} onClick={onClose} aria-hidden="true" />
      <div
        className="relative w-full max-w-[480px] rounded-t-[32px] border-x border-t border-[var(--color-border-strong)] bg-[var(--color-surface-elevated)] px-5 pb-4 shadow-[0_-24px_60px_-20px_rgba(0,0,0,0.85)]"
        style={{ animation: 'sheet-in 420ms var(--ease-out-expo) both' }}
      >
        <SheetHandle onDismiss={onClose} />
        <div className="mb-4 text-[17px] font-semibold">يتكرر</div>
        <div className="mb-4 flex flex-wrap gap-2">
          {UNIT_OPTIONS.map(([u, label]) => (
            <button
              key={u}
              onClick={() => onUnit(u)}
              className="qb-press rounded-full px-4 py-2 text-[12.5px] font-semibold"
              style={unit === u ? { background: `color-mix(in srgb, ${color} 16%, transparent)`, color } : { background: 'var(--color-surface)', color: 'var(--color-text-2)', border: '1px solid var(--color-border)' }}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="mb-4 flex items-center gap-3">
          <button
            type="button"
            onClick={() => onCount(Math.max(1, count - 1))}
            className="qb-press flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] text-[18px] font-bold"
            aria-label="إنقاص"
          >
            −
          </button>
          <div className="flex-1 rounded-2xl border border-[var(--color-border)] bg-[var(--color-void)] py-2.5 text-center">
            <div className="num text-[17px] font-bold">{count}</div>
            <div className="text-[11px] text-[var(--color-text-3)]">{intervalLabel(unit, count)}</div>
          </div>
          <button
            type="button"
            onClick={() => onCount(Math.min(99, count + 1))}
            className="qb-press flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] text-[18px] font-bold"
            aria-label="زيادة"
          >
            +
          </button>
        </div>
        <div className="safe-bottom">
          <button onClick={onClose} className="qb-press h-[50px] w-full rounded-full text-[14px] font-semibold text-[var(--color-on-accent)]" style={{ background: color }}>
            تم
          </button>
        </div>
      </div>
    </div>
  )
}

function defaultDueDate(): string {
  const d = new Date()
  d.setMonth(d.getMonth() + 1)
  return d.toISOString().slice(0, 10)
}

export function AddRecurringScreen() {
  const { id } = useParams<{ id?: string }>()
  const navigate = useNavigate()
  const {
    accounts,
    categories,
    incomeSources,
    recurringTransactions,
    addRecurringTransaction,
    updateRecurringTransaction,
    deleteRecurringTransaction,
  } = useData()

  const existing = id ? recurringTransactions.find((r) => r.id === id) : undefined
  const isEditing = Boolean(existing)

  const [name, setName] = useState(existing?.name ?? '')
  const [type, setType] = useState<TransactionType>(existing?.type ?? 'income')
  const [amount, setAmount] = useState(existing ? String(existing.amount) : '')
  const [accountId, setAccountId] = useState(() => existing?.accountId ?? accounts[0]?.id ?? '')
  const [transferToId, setTransferToId] = useState(
    () => existing?.transferToAccountId ?? accounts.find((a) => a.id !== accounts[0]?.id)?.id ?? accounts[0]?.id ?? '',
  )
  const [categoryId, setCategoryId] = useState(existing?.categoryId ?? categories.find((c) => c.kind === 'expense')?.id ?? '')
  const [incomeSourceId, setIncomeSourceId] = useState(existing?.incomeSourceId ?? incomeSources[0]?.id ?? '')
  const [intervalUnit, setIntervalUnit] = useState<CommitmentIntervalUnit>(existing?.intervalUnit ?? 'month')
  const [intervalCount, setIntervalCount] = useState(existing?.intervalCount ?? 1)
  const [nextDueDate, setNextDueDate] = useState(existing?.nextDueDate ?? defaultDueDate())
  const [note, setNote] = useState(existing?.note ?? '')
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  // حركة جديدة تبدأ بكتابة الاسم — ثم «تم» يرجّع لوحة الأرقام.
  const [editing, setEditing] = useState<'name' | 'note' | null>(existing ? null : 'name')
  const [repeatSheetOpen, setRepeatSheetOpen] = useState(false)

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

  const canSave =
    name.trim() &&
    numericAmount > 0 &&
    accountId &&
    intervalCount >= 1 &&
    nextDueDate &&
    (type !== 'expense' || categoryId) &&
    (type !== 'income' || incomeSourceId) &&
    (type !== 'transfer' || (transferToId && transferToId !== accountId))

  function handleSave() {
    if (!canSave) return
    const input = {
      name,
      type,
      amount: numericAmount,
      accountId,
      categoryId: type === 'expense' ? categoryId : undefined,
      incomeSourceId: type === 'income' ? incomeSourceId : undefined,
      transferToAccountId: type === 'transfer' ? transferToId : undefined,
      intervalUnit,
      intervalCount,
      nextDueDate,
      note,
    }
    if (isEditing && id) updateRecurringTransaction(id, input)
    else addRecurringTransaction(input)
    navigate('/recurring', { replace: true })
  }

  function handleDelete() {
    if (!id || !existing) return
    const { name, type, amount, accountId, categoryId, incomeSourceId, transferToAccountId, intervalUnit, intervalCount, nextDueDate, note } = existing
    deleteRecurringTransaction(id)
    navigate('/recurring', { replace: true })
    showUndoToast('تم حذف الحركة المتكررة', (data) =>
      data.addRecurringTransaction({ name, type, amount, accountId, categoryId, incomeSourceId, transferToAccountId, intervalUnit, intervalCount, nextDueDate, note }),
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
      icon: <span style={{ fontWeight: 700, fontSize: 14 }}>{c.name.trim().charAt(0) || '؟'}</span>,
      iconColor: cColor,
      iconBg: `${cColor}22`,
      title: c.name,
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
      largeTitle={false}
      contentClassName="px-5"
      header={
        <ScreenHeader
          title={isEditing ? 'تعديل حركة متكررة' : 'حركة متكررة جديدة'}
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
          editor={
            editing === 'name'
              ? { value: name, onChange: setName, placeholder: 'مثال: راتب الشهر', onDone: () => setEditing(null) }
              : editing === 'note'
                ? { value: note, onChange: setNote, placeholder: 'مثال: قد يختلف المبلغ بسبب الخصومات', onDone: () => setEditing(null) }
                : null
          }
          chips={
            <>
              <button
                type="button"
                onClick={() => setRepeatSheetOpen(true)}
                className="qb-press flex h-9 flex-shrink-0 items-center gap-1.5 rounded-full border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 text-[12px] font-semibold"
              >
                <span style={{ color }}>
                  <RepeatIcon />
                </span>
                <span className="num">{intervalLabel(intervalUnit, intervalCount)}</span>
              </button>
              <DatePicker chip value={nextDueDate} onChange={setNextDueDate} color={color} placeholder="الموعد القادم" />
              <NoteChip note={note} onClick={() => setEditing('note')} />
            </>
          }
        />
      }
    >
      <ConfirmDialog
        open={confirmDeleteOpen}
        title="حذف الحركة المتكررة"
        message="بيتم حذف هذي الحركة المتكررة نهائيًا — الحركات المسجّلة سابقًا منها ما تتأثر."
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

      <RepeatSheet
        open={repeatSheetOpen}
        color={color}
        unit={intervalUnit}
        count={intervalCount}
        onUnit={setIntervalUnit}
        onCount={setIntervalCount}
        onClose={() => setRepeatSheetOpen(false)}
      />

      <button
        type="button"
        onClick={() => setEditing('name')}
        className="qb-press mb-3 flex h-[50px] w-full items-center gap-2 rounded-[18px] border bg-[var(--color-surface)] px-4 text-right text-[14px]"
        style={{ borderColor: editing === 'name' ? 'var(--color-accent-line)' : 'var(--color-border)' }}
      >
        <span className="flex-shrink-0 text-[12px] text-[var(--color-text-3)]">الاسم</span>
        <span className={`truncate font-semibold ${name ? '' : 'font-normal text-[var(--color-text-3)]'}`}>{name || 'مثال: راتب الشهر'}</span>
      </button>

      <div data-own-gesture className="relative mb-3 flex rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] p-1">
        <div
          className="absolute bottom-1 top-1 rounded-full"
          style={{
            width: 'calc((100% - 8px) / 3)',
            right: `calc(4px + ${TYPE_OPTIONS.findIndex(([t]) => t === type)} * (100% - 8px) / 3)`,
            background: color,
            transition: 'right 380ms var(--ease-spring), background 240ms ease',
          }}
        />
        {TYPE_OPTIONS.map(([t, label, Icon]) => (
          <button
            key={t}
            onClick={() => setType(t)}
            className="relative z-10 flex flex-1 items-center justify-center gap-1.5 rounded-full py-2.5 text-[13.5px] font-semibold"
            style={{ color: type === t ? '#0a0a0c' : 'var(--color-text-2)', transition: 'color 200ms ease' }}
          >
            <Icon />
            {label}
          </button>
        ))}
      </div>

      <AmountHero amount={amount} color={color} label="المبلغ التقديري — تقدر تعدّله عند التأكيد" className="mb-3" />

      {type === 'transfer' ? (
        <div className="mb-3 grid items-center gap-1.5" style={{ gridTemplateColumns: '1fr auto 1fr' }}>
          <AccountMiniField label="من" account={selectedAccount} onClick={() => setFromSheetOpen(true)} />
          <button
            onClick={swapAccounts}
            aria-label="تبديل الحسابين"
            disabled={accounts.length < 2}
            className="qb-press flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-surface-high)] text-[var(--color-text)] disabled:opacity-30"
          >
            <SwapIcon />
          </button>
          <AccountMiniField label="إلى" account={selectedTransferToAccount} onClick={() => setToSheetOpen(true)} />
        </div>
      ) : (
        <div className="mb-3">
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

      {type !== 'transfer' && (
        <div className="mb-3">
          <PickerField
            label={type === 'expense' ? 'الفئة' : 'مصدر الدخل'}
            icon={
              type === 'expense' ? (
                selectedCategory ? (
                  <span style={{ fontWeight: 700, fontSize: 15 }}>{selectedCategory.name.trim().charAt(0)}</span>
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

    </ScreenScroll>
  )
}
