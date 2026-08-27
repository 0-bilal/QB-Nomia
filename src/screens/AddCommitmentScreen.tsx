import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useData } from '../state/DataContext'
import { ScreenScroll } from '../components/ScreenScroll'
import { ScreenHeader } from '../components/ScreenHeader'
import { DatePicker } from '../components/DatePicker'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { PickerField } from '../components/PickerField'
import { SelectSheet, type SelectSheetItem } from '../components/SelectSheet'
import { ACCOUNT_ICON_BG, ACCOUNT_ICON_COLOR, ACCOUNT_TYPE_LABELS, AccountTypeIcon } from '../components/AccountVisuals'
import { intervalLabel } from './CommitmentsScreen'
import { formatMoney } from '../lib/format'
import { showUndoToast } from '../lib/undoToast'
import type { CommitmentIntervalUnit } from '../types'

function defaultDueDate(): string {
  const d = new Date()
  d.setMonth(d.getMonth() + 1)
  return d.toISOString().slice(0, 10)
}

const UNIT_OPTIONS: [CommitmentIntervalUnit, string][] = [
  ['day', 'يوم'],
  ['week', 'أسبوع'],
  ['month', 'شهر'],
  ['year', 'سنة'],
]

export function AddCommitmentScreen() {
  const { id } = useParams<{ id?: string }>()
  const { accounts, commitments, addCommitment, updateCommitment, deleteCommitment } = useData()
  const navigate = useNavigate()

  const existing = id ? commitments.find((c) => c.id === id) : undefined
  const isEditing = Boolean(existing)

  const [name, setName] = useState(existing?.name ?? '')
  const [note, setNote] = useState(existing?.note ?? '')
  const [hasCost, setHasCost] = useState(Boolean(existing?.cost))
  const [cost, setCost] = useState(existing?.cost ? String(existing.cost) : '')
  const [accountId, setAccountId] = useState(existing?.accountId ?? accounts[0]?.id ?? '')
  const [intervalUnit, setIntervalUnit] = useState<CommitmentIntervalUnit>(existing?.intervalUnit ?? 'month')
  const [intervalCount, setIntervalCount] = useState(existing?.intervalCount ?? 1)
  const [nextDueDate, setNextDueDate] = useState(existing?.nextDueDate ?? defaultDueDate())
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const [accountSheetOpen, setAccountSheetOpen] = useState(false)

  const numericCost = Number(cost)
  const selectedAccount = accounts.find((a) => a.id === accountId)
  const canSave = name.trim() && intervalCount >= 1 && nextDueDate && (!hasCost || (numericCost > 0 && accountId))

  function handleSave() {
    if (!canSave) return
    const input = {
      name,
      note,
      cost: hasCost ? numericCost : undefined,
      accountId: hasCost ? accountId : undefined,
      intervalUnit,
      intervalCount,
      nextDueDate,
    }
    if (isEditing && id) updateCommitment(id, input)
    else addCommitment(input)
    navigate('/commitments', { replace: true })
  }

  function handleDelete() {
    if (!id || !existing) return
    const { name, note, cost, accountId, intervalUnit, intervalCount, nextDueDate } = existing
    deleteCommitment(id)
    navigate('/commitments', { replace: true })
    showUndoToast('تم حذف الالتزام', () =>
      addCommitment({ name, note, cost, accountId, intervalUnit, intervalCount, nextDueDate }),
    )
  }

  return (
    <ScreenScroll
      header={
        <ScreenHeader
          title={isEditing ? 'تعديل التزام' : 'إضافة التزام'}
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
            style={{ background: 'var(--color-commitment)' }}
          >
            {isEditing ? 'حفظ التعديلات' : 'حفظ الالتزام'}
          </button>
        </div>
      }
    >
      <ConfirmDialog
        open={confirmDeleteOpen}
        title="حذف الالتزام"
        message="بيتم حذف هذا الالتزام نهائيًا — الحركات المالية المسجّلة له سابقًا ما تتأثر."
        confirmLabel="حذف"
        color="var(--color-expense)"
        onConfirm={handleDelete}
        onCancel={() => setConfirmDeleteOpen(false)}
      />

      <label className="mb-1.5 block text-[12.5px] font-semibold text-[var(--color-text-2)]">اسم الالتزام</label>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="مثال: تجديد الهوية الوطنية"
        className="mb-5 w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-[14px] outline-none placeholder:text-[var(--color-text-3)]"
      />

      <label className="mb-1.5 block text-[12.5px] font-semibold text-[var(--color-text-2)]">ملاحظة (اختياري)</label>
      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="مثال: عن طريق أبشر"
        className="mb-5 w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-[14px] outline-none placeholder:text-[var(--color-text-3)]"
      />

      <label className="mb-1.5 block text-[12.5px] font-semibold text-[var(--color-text-2)]">يتكرر</label>
      <div className="mb-3 flex flex-wrap gap-2">
        {UNIT_OPTIONS.map(([u, label]) => (
          <button
            key={u}
            onClick={() => setIntervalUnit(u)}
            className="qb-press rounded-full px-4 py-2 text-[12.5px] font-semibold"
            style={
              intervalUnit === u
                ? { background: 'rgba(96,165,250,0.2)', color: 'var(--color-commitment)' }
                : { background: 'var(--color-surface)', color: 'var(--color-text-2)', border: '1px solid var(--color-border)' }
            }
          >
            {label}
          </button>
        ))}
      </div>
      <div className="mb-5 flex items-center gap-3">
        <button
          type="button"
          onClick={() => setIntervalCount((n) => Math.max(1, n - 1))}
          className="qb-press flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] text-[18px] font-bold"
          aria-label="إنقاص"
        >
          −
        </button>
        <div className="flex-1 rounded-2xl border border-[var(--color-border)] bg-[var(--color-void)] py-2.5 text-center">
          <div className="num text-[15px] font-bold">{intervalCount}</div>
          <div className="text-[11px] text-[var(--color-text-3)]">{intervalLabel(intervalUnit, intervalCount)}</div>
        </div>
        <button
          type="button"
          onClick={() => setIntervalCount((n) => Math.min(99, n + 1))}
          className="qb-press flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] text-[18px] font-bold"
          aria-label="زيادة"
        >
          +
        </button>
      </div>

      <div className="mb-5">
        <DatePicker value={nextDueDate} onChange={setNextDueDate} color="var(--color-commitment)" fieldLabel="تاريخ الاستحقاق القادم" />
      </div>

      <button
        type="button"
        onClick={() => setHasCost((v) => !v)}
        className="qb-card qb-press mb-5 flex w-full items-center justify-between px-4 py-3.5 text-right"
      >
        <div>
          <div className="text-[13.5px] font-bold">له تكلفة مالية</div>
          <div className="text-[11.5px] text-[var(--color-text-3)]">فعّلها لو الالتزام يتطلب رسوم تُخصم من أحد حساباتك</div>
        </div>
        <div
          className="flex h-6 w-11 flex-shrink-0 items-center rounded-full p-0.5 transition-colors"
          style={{ background: hasCost ? 'var(--color-commitment)' : 'rgba(255,255,255,0.14)' }}
        >
          <div
            className="h-5 w-5 rounded-full bg-white transition-transform"
            style={{ transform: hasCost ? 'translateX(-20px)' : 'translateX(0)' }}
          />
        </div>
      </button>

      {hasCost && (
        <>
          <label className="mb-1.5 block text-[12.5px] font-semibold text-[var(--color-text-2)]">التكلفة</label>
          <input
            dir="ltr"
            inputMode="decimal"
            value={cost}
            onChange={(e) => setCost(e.target.value.replace(/[^0-9.]/g, ''))}
            placeholder="0"
            className="num mb-5 w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-[14px] outline-none placeholder:text-[var(--color-text-3)]"
          />

          <SelectSheet
            open={accountSheetOpen}
            title="اختر الحساب الذي يُخصم منه"
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

          <div className="mb-5">
            <PickerField
              label="يُخصم من حساب"
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
        </>
      )}
    </ScreenScroll>
  )
}
