import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useData } from '../state/DataContext'
import { formatMoney, formatDate } from '../lib/format'
import { ScreenScroll } from '../components/ScreenScroll'
import { ScreenHeader } from '../components/ScreenHeader'
import { AmountPad } from '../components/AmountPad'
import { PickerField } from '../components/PickerField'
import { SelectSheet, type SelectSheetItem } from '../components/SelectSheet'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { ACCOUNT_ICON_BG, ACCOUNT_ICON_COLOR, ACCOUNT_TYPE_LABELS, AccountTypeIcon } from '../components/AccountVisuals'
import type { AccountType } from '../types'

function SalaryAdvanceIcon({ size = 20 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2.5" y="6" width="14" height="10" rx="2" />
      <circle cx="9.5" cy="11" r="2" />
      <path d="M19 8.5 22 11.5 19 14.5" />
      <path d="M22 11.5h-5" />
    </svg>
  )
}

/**
 * محرر تسجيل/تعديل سلفة مضمّن (مو نافذة منبثقة) — نفس نمط بقية شاشات إدخال
 * الأرقام بالتطبيق: لوحة أرقام النظام (AmountPad) بدل كيبورد الهاتف. لو
 * initial محددة، يعمل بوضع تعديل (يظهر زر حذف).
 */
function LogAdvanceForm({
  accounts,
  color,
  initial,
  onSave,
  onDelete,
  onCancel,
}: {
  accounts: { id: string; name: string; type: AccountType; balance: number }[]
  color: string
  initial?: { amount: number; accountId: string }
  onSave: (amount: number, accountId: string) => void
  onDelete?: () => void
  onCancel: () => void
}) {
  const navigate = useNavigate()
  const [amount, setAmount] = useState(initial ? String(initial.amount) : '')
  const [accountId, setAccountId] = useState(initial?.accountId ?? accounts[0]?.id ?? '')
  const [accountSheetOpen, setAccountSheetOpen] = useState(false)

  const numeric = Number(amount)
  const selectedAccount = accounts.find((a) => a.id === accountId)
  const canSave = numeric > 0 && !!accountId

  return (
    <div>
      <div className="mb-1.5 text-[12px] text-[var(--color-text-3)]">مبلغ السلفة</div>
      <div dir="ltr" className="mb-4 flex items-baseline justify-center gap-2">
        <span className="num text-[32px] font-bold">{amount || '0'}</span>
        <span className="flex-shrink-0 text-[13px] font-semibold text-[var(--color-text-3)]">ر.س</span>
      </div>
      <div className="mb-4 flex justify-center">
        <AmountPad value={amount} onChange={setAmount} color={color} />
      </div>

      <SelectSheet
        open={accountSheetOpen}
        title="تُضاف إلى حساب"
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
          label="تُضاف إلى حساب"
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
          حفظ
        </button>
      </div>

      {onDelete && (
        <button onClick={onDelete} className="qb-press mt-3 w-full text-center text-[12.5px] font-semibold" style={{ color: 'var(--color-expense)' }}>
          حذف السلفة
        </button>
      )}
    </div>
  )
}

export function SalaryAdvanceScreen() {
  const navigate = useNavigate()
  const { salaryAdvances, logSalaryAdvance, updateSalaryAdvance, deleteSalaryAdvance, accounts } = useData()
  const [editingId, setEditingId] = useState<'new' | string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const outstanding = salaryAdvances.filter((a) => !a.settled)
  const outstandingTotal = outstanding.reduce((sum, a) => sum + a.amount, 0)
  const color = 'var(--color-income)'
  const editingAdvance = editingId && editingId !== 'new' ? salaryAdvances.find((a) => a.id === editingId) : undefined

  return (
    <ScreenScroll header={<ScreenHeader title="سلفة الراتب" onBack={() => navigate(-1)} className="pt-8 pb-6" />}>
      <ConfirmDialog
        open={confirmDeleteId !== null}
        title="حذف السلفة"
        message="بيتم حذف هذي السلفة والحركة المالية المرتبطة بيها من سجلك، وخصم مبلغها من رصيد الحساب."
        confirmLabel="حذف"
        color="var(--color-expense)"
        onConfirm={() => {
          if (confirmDeleteId) deleteSalaryAdvance(confirmDeleteId)
          setConfirmDeleteId(null)
          setEditingId(null)
        }}
        onCancel={() => setConfirmDeleteId(null)}
      />

      <div className="qb-card-elevated mb-5 p-4.5">
        <div className="mb-3 flex items-center gap-3">
          <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-[14px]" style={{ width: 44, height: 44, background: 'rgba(34,197,94,0.14)', color }}>
            <SalaryAdvanceIcon />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[14.5px] font-bold">سلفة الراتب</div>
            <div className="truncate text-[11px] text-[var(--color-text-3)]">تُخصم تلقائيًا من أول حركة دخل "راتب" تسجّلها</div>
          </div>
        </div>

        {editingId === 'new' ? (
          <LogAdvanceForm
            accounts={accounts}
            color={color}
            onSave={(amount, accountId) => {
              logSalaryAdvance({ amount, accountId })
              setEditingId(null)
            }}
            onCancel={() => setEditingId(null)}
          />
        ) : editingAdvance ? (
          <LogAdvanceForm
            accounts={accounts}
            color={color}
            initial={{ amount: editingAdvance.amount, accountId: editingAdvance.accountId }}
            onSave={(amount, accountId) => {
              updateSalaryAdvance(editingAdvance.id, { amount, accountId })
              setEditingId(null)
            }}
            onDelete={() => setConfirmDeleteId(editingAdvance.id)}
            onCancel={() => setEditingId(null)}
          />
        ) : (
          <>
            {outstandingTotal === 0 ? (
              <div className="mb-3 rounded-2xl border border-dashed p-3.5 text-[12px] leading-relaxed" style={{ borderColor: 'rgba(34,197,94,0.4)', color: 'var(--color-text-2)' }}>
                لا توجد سلف قائمة حاليًا. سجّل سلفة جديدة وبتُخصم تلقائيًا من أول راتب تسجّله بعدها.
              </div>
            ) : (
              <div className="mb-3">
                <div className="text-[11.5px] text-[var(--color-text-3)]">المتبقي غير المسدَّد</div>
                <div className="num text-[22px] font-bold" style={{ color }}>
                  {formatMoney(outstandingTotal)}
                </div>
              </div>
            )}

            <button
              onClick={() => setEditingId('new')}
              disabled={accounts.length === 0}
              className="qb-press w-full rounded-2xl py-2.75 text-[12.5px] font-bold disabled:opacity-40"
              style={{ background: 'rgba(34,197,94,0.18)', color }}
            >
              تسجيل سلفة جديدة
            </button>
          </>
        )}
      </div>

      <div className="qb-section-label mb-2 px-1">سجل السلف</div>
      {salaryAdvances.length === 0 ? (
        <div className="qb-card py-10 text-center text-[13px] text-[var(--color-text-3)]">لا يوجد سجل بعد</div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {salaryAdvances.map((a) => {
            const account = accounts.find((acc) => acc.id === a.accountId)
            const row = (
              <>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <div className="text-[13px] font-bold">{formatDate(a.date)}</div>
                    <span
                      className="rounded-full px-1.5 py-0.5 text-[9.5px] font-bold"
                      style={a.settled ? { background: 'rgba(255,255,255,0.08)', color: 'var(--color-text-3)' } : { background: 'rgba(34,197,94,0.16)', color }}
                    >
                      {a.settled ? 'مسدَّدة' : 'قائمة'}
                    </span>
                  </div>
                  <span className="num text-[13px] font-bold" style={{ color }}>
                    {formatMoney(a.amount)}
                  </span>
                </div>
                {account && (
                  <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-[var(--color-text-3)]">
                    <AccountTypeIcon type={account.type} size={13} />
                    <span>{account.name} · {ACCOUNT_TYPE_LABELS[account.type]}</span>
                  </div>
                )}
                {a.settled && a.settledDate && (
                  <div className="mt-1 text-[11px] text-[var(--color-text-3)]">تمّ خصمها من الراتب بتاريخ {formatDate(a.settledDate)}</div>
                )}
              </>
            )
            return a.settled ? (
              <div key={a.id} className="qb-card p-3.5">
                {row}
              </div>
            ) : (
              <button key={a.id} onClick={() => setEditingId(a.id)} className="qb-card qb-press p-3.5 text-right">
                {row}
              </button>
            )
          })}
        </div>
      )}
    </ScreenScroll>
  )
}
