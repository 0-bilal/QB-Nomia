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
import { formatMoney } from '../lib/format'
import { showUndoToast } from '../lib/undoToast'
import type { BillingCycle } from '../types'
import { BigAmount } from '../components/BigAmount'
import { IconBubble, Segmented } from '../components/ui'

function defaultRenewalDate(): string {
  const d = new Date()
  d.setDate(d.getDate() + 30)
  return d.toISOString().slice(0, 10)
}

export function AddSubscriptionScreen() {
  const { id } = useParams<{ id?: string }>()
  const { accounts, subscriptions, addSubscription, updateSubscription, deleteSubscription } = useData()
  const navigate = useNavigate()

  const existing = id ? subscriptions.find((s) => s.id === id) : undefined
  const isEditing = Boolean(existing)

  const [name, setName] = useState(existing?.name ?? '')
  const [provider, setProvider] = useState(existing?.provider ?? '')
  const [cost, setCost] = useState(existing ? String(existing.cost) : '')
  const [billingCycle, setBillingCycle] = useState<BillingCycle>(existing?.billingCycle ?? 'monthly')
  const [accountId, setAccountId] = useState(existing?.accountId ?? accounts.find((a) => a.type === 'wallet')?.id ?? accounts[0]?.id ?? '')
  const [nextRenewalDate, setNextRenewalDate] = useState(existing?.nextRenewalDate ?? defaultRenewalDate())
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const [accountSheetOpen, setAccountSheetOpen] = useState(false)

  const numericCost = Number(cost)
  const canSave = name.trim() && numericCost > 0 && accountId && nextRenewalDate
  const selectedAccount = accounts.find((a) => a.id === accountId)

  function handleSave() {
    if (!canSave) return
    const input = { name, provider, cost: numericCost, billingCycle, nextRenewalDate, accountId }
    if (isEditing && id) updateSubscription(id, input)
    else addSubscription(input)
    navigate('/subscriptions', { replace: true })
  }

  function handleDelete() {
    if (!id || !existing) return
    const { name, provider, cost, billingCycle, nextRenewalDate, accountId } = existing
    deleteSubscription(id)
    navigate('/subscriptions', { replace: true })
    showUndoToast('تم حذف الاشتراك', (data) => data.addSubscription({ name, provider, cost, billingCycle, nextRenewalDate, accountId }))
  }

  return (
    <ScreenScroll
      header={
        <ScreenHeader
          title={isEditing ? 'تعديل اشتراك' : 'إضافة اشتراك'}
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
            style={{ background: 'var(--color-subscription)' }}
          >
            {isEditing ? 'حفظ التعديلات' : 'حفظ الاشتراك'}
          </button>
        </div>
      }
    >
      <ConfirmDialog
        open={confirmDeleteOpen}
        title="حذف الاشتراك"
        message="بيتم حذف هذا الاشتراك نهائيًا — الحركات المالية المسجّلة له سابقًا ما تتأثر."
        confirmLabel="حذف"
        color="var(--color-expense)"
        onConfirm={handleDelete}
        onCancel={() => setConfirmDeleteOpen(false)}
      />
      <div className="qb-card-elevated qb-rise mb-6 p-5">
        <div className="flex items-center gap-3.5">
          <IconBubble color="var(--color-subscription)" size={52}>
            <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
              <path d="M8 5.5v13l10.5-6.5z" />
            </svg>
          </IconBubble>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[17px] font-semibold">{name.trim() || 'اشتراك جديد'}</div>
            <div className="truncate text-[12px] text-[var(--color-text-3)]">{provider.trim() || 'المزود'}</div>
          </div>
        </div>
        <div className="mt-5 flex items-baseline justify-between">
          <BigAmount value={Number(cost) || 0} size={30} color="var(--color-subscription)" animate={false} />
          <span className="text-[12.5px] text-[var(--color-text-3)]">{billingCycle === 'monthly' ? 'شهريًا' : 'سنويًا'}</span>
        </div>
      </div>

      <label className="mb-2 block px-1 text-[12.5px] font-medium text-[var(--color-text-2)]">اسم الاشتراك</label>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="مثال: يوتيوب بريميوم"
        className="mb-5 w-full rounded-[18px] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3.5 text-[14px] outline-none placeholder:text-[var(--color-text-3)]"
      />

      <label className="mb-2 block px-1 text-[12.5px] font-medium text-[var(--color-text-2)]">المزود (اختياري)</label>
      <input
        value={provider}
        onChange={(e) => setProvider(e.target.value)}
        placeholder="مثال: Google Play"
        className="mb-5 w-full rounded-[18px] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3.5 text-[14px] outline-none placeholder:text-[var(--color-text-3)]"
      />

      <label className="mb-2 block px-1 text-[12.5px] font-medium text-[var(--color-text-2)]">التكلفة</label>
      <input
        dir="ltr"
        inputMode="decimal"
        value={cost}
        onChange={(e) => setCost(e.target.value.replace(/[^0-9.]/g, ''))}
        placeholder="0"
        className="num mb-5 w-full rounded-[18px] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3.5 text-[14px] outline-none placeholder:text-[var(--color-text-3)]"
      />

      <label className="mb-2 block px-1 text-[12.5px] font-medium text-[var(--color-text-2)]">دورة الفوترة</label>
      <Segmented
        options={[
          ['monthly', 'شهري'],
          ['yearly', 'سنوي'],
        ]}
        value={billingCycle}
        onChange={(v: BillingCycle) => setBillingCycle(v)}
        color="var(--color-subscription)"
      />

      <SelectSheet
        open={accountSheetOpen}
        title="اختر الحساب المرتبط"
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

      <div className="mb-5">
        <PickerField
          label="الحساب المرتبط"
          icon={selectedAccount ? <AccountTypeIcon type={selectedAccount.type} /> : <AccountTypeIcon type="wallet" />}
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

      <div className="mb-4">
        <DatePicker value={nextRenewalDate} onChange={setNextRenewalDate} color="var(--color-subscription)" fieldLabel="تاريخ التجديد القادم" />
      </div>
    </ScreenScroll>
  )
}
