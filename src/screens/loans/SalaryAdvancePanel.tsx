import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useData } from '../../state/DataContext'
import { formatMoney, formatDate } from '../../lib/format'
import { AmountPad } from '../../components/AmountPad'
import { PickerField } from '../../components/PickerField'
import { SelectSheet, type SelectSheetItem } from '../../components/SelectSheet'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { ACCOUNT_ICON_BG, ACCOUNT_ICON_COLOR, ACCOUNT_TYPE_LABELS, AccountTypeIcon } from '../../components/AccountVisuals'
import type { AccountType } from '../../types'
import { BigAmount } from '../../components/BigAmount'
import { Badge, EmptyState, IconBubble, ListGroup, ListItem, SectionTitle } from '../../components/ui'

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
      <div className="mb-1 text-center text-[12.5px] text-[var(--color-text-2)]">مبلغ السلفة</div>
      <div dir="ltr" className="mb-5 flex items-baseline justify-center gap-2" style={{ color }}>
        <span key={amount} className="num text-[44px] font-bold tracking-tight" style={{ animation: 'qb-pop 260ms var(--ease-spring) both' }}>
          {amount || '0'}
        </span>
        <span className="flex-shrink-0 text-[16px] font-medium opacity-60">ر.س</span>
      </div>
      <div className="mb-4">
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
            className="qb-press mt-1 w-full rounded-full py-3 text-[13px] font-semibold"
            style={{ background: 'var(--color-accent-soft)', color: 'var(--color-accent)' }}
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
        <button onClick={onCancel} className="qb-press flex-1 rounded-full bg-white/[0.06] py-3 text-[13.5px] font-medium text-[var(--color-text)]">
          إلغاء
        </button>
        <button
          onClick={() => canSave && onSave(numeric, accountId)}
          disabled={!canSave}
          className="qb-press flex-1 rounded-full py-3 text-[13.5px] font-semibold text-[#0A0A0C] disabled:opacity-35"
          style={{ background: color, boxShadow: canSave ? `0 12px 26px -12px ${color}` : 'none' }}
        >
          حفظ
        </button>
      </div>

      {onDelete && (
        <button onClick={onDelete} className="qb-press mt-4 w-full text-center text-[13px] font-medium" style={{ color: 'var(--color-expense)' }}>
          حذف السلفة
        </button>
      )}
    </div>
  )
}

/** محتوى تبويب "سلفة راتب" داخل شاشة الديون والسلف — بدون غلاف/عنوان خاص به، تُدرَج مباشرة تحت رأس التبويبات المشترك. */
export function SalaryAdvancePanel() {
  const { salaryAdvances, logSalaryAdvance, updateSalaryAdvance, deleteSalaryAdvance, accounts } = useData()
  const [editingId, setEditingId] = useState<'new' | string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const outstanding = salaryAdvances.filter((a) => !a.settled)
  const outstandingTotal = outstanding.reduce((sum, a) => sum + a.amount, 0)
  const color = 'var(--color-income)'
  const editingAdvance = editingId && editingId !== 'new' ? salaryAdvances.find((a) => a.id === editingId) : undefined

  return (
    <>
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

      <div className="qb-card-elevated qb-rise mb-6 p-5">
        <div className="relative">
        <div className="mb-5 flex items-center gap-3">
          <IconBubble color={color} size={46}>
            <SalaryAdvanceIcon />
          </IconBubble>
          <div className="min-w-0 flex-1">
            <div className="text-[16px] font-semibold">سلفة الراتب</div>
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
              <div className="mb-4 rounded-[20px] bg-white/[0.04] p-4 text-[12.5px] leading-relaxed text-[var(--color-text-2)]">
                لا توجد سلف قائمة حاليًا. سجّل سلفة جديدة وبتُخصم تلقائيًا من أول راتب تسجّله بعدها.
              </div>
            ) : (
              <div className="mb-5">
                <div className="mb-1.5 text-[12.5px] text-[var(--color-text-2)]">المتبقي غير المسدَّد</div>
                <BigAmount value={outstandingTotal} size={36} color={color} />
              </div>
            )}

            <button
              onClick={() => setEditingId('new')}
              disabled={accounts.length === 0}
              className="qb-btn-primary flex w-full items-center justify-center gap-2 py-3 text-[13.5px]"
            >
              تسجيل سلفة جديدة
            </button>
          </>
        )}
      </div>
      </div>

      <SectionTitle title="سجل السلف" />
      {salaryAdvances.length === 0 ? (
        <EmptyState title="لا يوجد سجل بعد" desc="كل سلفة تسجّلها تظهر هنا مع حالة سدادها." />
      ) : (
        <ListGroup>
          {salaryAdvances.map((a, i) => {
            const account = accounts.find((acc) => acc.id === a.accountId)
            const sub = [account ? `${account.name} · ${ACCOUNT_TYPE_LABELS[account.type]}` : '', a.settled && a.settledDate ? `خُصمت بتاريخ ${formatDate(a.settledDate)}` : '']
              .filter(Boolean)
              .join(' — ')
            return (
              <ListItem
                key={a.id}
                divider={i > 0}
                muted={a.settled}
                onClick={a.settled ? undefined : () => setEditingId(a.id)}
                leading={
                  <IconBubble color={a.settled ? 'var(--color-text-3)' : color}>
                    <SalaryAdvanceIcon size={18} />
                  </IconBubble>
                }
                title={
                  <span className="flex items-center gap-2">
                    <span className="num">{formatDate(a.date)}</span>
                    <Badge color={a.settled ? 'var(--color-text-3)' : color}>{a.settled ? 'مسدَّدة' : 'قائمة'}</Badge>
                  </span>
                }
                subtitle={sub || undefined}
                trailing={
                  <span className="num text-[14px] font-bold" style={{ color: a.settled ? 'var(--color-text-2)' : color }}>
                    {formatMoney(a.amount)}
                  </span>
                }
              />
            )
          })}
        </ListGroup>
      )}
    </>
  )
}
