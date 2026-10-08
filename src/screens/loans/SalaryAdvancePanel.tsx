import { useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useData } from '../../state/DataContext'
import { formatAmount, formatMoney, formatDate } from '../../lib/format'
import { AmountPad } from '../../components/AmountPad'
import { PickerField } from '../../components/PickerField'
import { SelectSheet, type SelectSheetItem } from '../../components/SelectSheet'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { ACCOUNT_ICON_BG, ACCOUNT_ICON_COLOR, ACCOUNT_TYPE_LABELS, AccountTypeIcon } from '../../components/AccountVisuals'
import type { AccountType, SalaryAdvance } from '../../types'
import { EmptyState } from '../../components/ui'
import { DEBT_META, softBg } from './debtTypes'
import { DebtHero, SectionHead } from './DebtVisuals'

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

function StepIcon({ kind }: { kind: 'check' | 'clock' | 'wallet' }) {
  return (
    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth={kind === 'check' ? 3 : 2.2} strokeLinecap="round" strokeLinejoin="round">
      {kind === 'check' && <path d="M5 12.5 10 17l9-10" />}
      {kind === 'clock' && (
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </>
      )}
      {kind === 'wallet' && (
        <>
          <path d="M4 7h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a1 1 0 0 1-1-1Z" />
          <path d="M4 7l11-3v3" />
        </>
      )}
    </svg>
  )
}

/** مراحل السلفة القائمة: سُجّلت ← بانتظار الراتب ← تُخصم — تشرح للمستخدم وين وصلت بدون نص طويل. */
function AdvanceSteps({ color, since }: { color: string; since: string }) {
  const steps: { label: ReactNode; icon: 'check' | 'clock' | 'wallet'; state: 'done' | 'now' | 'todo' }[] = [
    { label: <>سُجّلت<br /><span className="num font-medium text-[var(--color-text-3)]">{formatDate(since).slice(5)}</span></>, icon: 'check', state: 'done' },
    { label: 'بانتظار الراتب', icon: 'clock', state: 'now' },
    { label: 'تُخصم', icon: 'wallet', state: 'todo' },
  ]
  return (
    <div className="mt-4 flex items-start">
      {steps.map((st, i) => (
        <div key={i} className="relative flex flex-1 flex-col items-center gap-1.5 text-center">
          {i > 0 && (
            <span
              className="absolute"
              style={{ top: 13, right: '50%', width: '100%', height: 2, background: st.state === 'todo' ? 'var(--color-border-strong)' : color }}
            />
          )}
          <span
            className="relative z-[1] flex items-center justify-center rounded-full border-2"
            style={{
              width: 28,
              height: 28,
              ...(st.state === 'done'
                ? { background: color, borderColor: 'transparent', color: '#0b0820' }
                : st.state === 'now'
                  ? { background: 'var(--color-surface-high)', borderColor: color, color, boxShadow: `0 0 0 5px ${softBg(color)}` }
                  : { background: 'var(--color-surface-high)', borderColor: 'var(--color-border-strong)', color: 'var(--color-text-3)' }),
            }}
          >
            <StepIcon kind={st.icon} />
          </span>
          <span className="text-[10.5px] font-semibold" style={{ color: st.state === 'todo' ? 'var(--color-text-3)' : 'var(--color-text)' }}>
            {st.label}
          </span>
        </div>
      ))}
    </div>
  )
}

function AdvanceRow({ advance, accountLabel, color, onClick }: { advance: SalaryAdvance; accountLabel: string; color: string; onClick?: () => void }) {
  const settled = advance.settled
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag onClick={onClick} className="flex w-full items-center gap-3 border-t border-[var(--color-border)] py-2.5 text-right first:border-t-0">
      <span
        className="flex flex-shrink-0 items-center justify-center"
        style={{ width: 40, height: 40, borderRadius: 14, background: settled ? 'var(--color-surface-high)' : softBg(color), color: settled ? 'var(--color-text-3)' : color }}
      >
        {settled ? <StepIcon kind="check" /> : <SalaryAdvanceIcon size={18} />}
      </span>
      <div className="min-w-0 flex-1">
        <div className="num text-[13px] font-semibold">{formatDate(advance.date)}</div>
        <div className="mt-0.5 truncate text-[10.5px] text-[var(--color-text-3)]">
          {settled ? (
            <>
              خُصمت من راتب <span className="num">{advance.settledDate ? formatDate(advance.settledDate) : ''}</span>
            </>
          ) : (
            `${accountLabel}${accountLabel ? ' · ' : ''}بانتظار الراتب`
          )}
        </div>
      </div>
      <span className="num flex-shrink-0 text-[13.5px] font-bold" style={{ color: settled ? 'var(--color-text-2)' : color }}>
        {formatMoney(advance.amount)}
      </span>
    </Tag>
  )
}

/** محتوى تبويب "سلفة راتب" داخل شاشة الديون والسلف. */
export function SalaryAdvancePanel({ startAdding = false }: { startAdding?: boolean }) {
  const { salaryAdvances, logSalaryAdvance, updateSalaryAdvance, deleteSalaryAdvance, accounts } = useData()
  const [editingId, setEditingId] = useState<'new' | string | null>(startAdding && accounts.length > 0 ? 'new' : null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const outstanding = salaryAdvances.filter((a) => !a.settled)
  const settled = salaryAdvances.filter((a) => a.settled)
  const outstandingTotal = outstanding.reduce((sum, a) => sum + a.amount, 0)
  const oldestOutstanding = [...outstanding].sort((a, b) => a.date.localeCompare(b.date))[0]
  const color = DEBT_META.advance.color
  const editingAdvance = editingId && editingId !== 'new' ? salaryAdvances.find((a) => a.id === editingId) : undefined
  const accountLabel = (id: string) => {
    const account = accounts.find((acc) => acc.id === id)
    return account ? `${account.name} · ${ACCOUNT_TYPE_LABELS[account.type]}` : ''
  }

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

      <DebtHero color={color}>
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
            <div className="text-[12.5px] font-medium text-[var(--color-text-2)]">المتبقي من سلفة الراتب</div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="num text-[34px] font-bold" style={{ color: outstandingTotal > 0 ? color : 'var(--color-text-2)' }}>
                {formatAmount(outstandingTotal)}
              </span>
              <span className="text-[13px] font-medium text-[var(--color-text-3)]">ر.س</span>
            </div>
            <div className="mt-0.5 text-[11.5px] text-[var(--color-text-3)]">
              {outstandingTotal > 0 ? 'تُخصم تلقائيًا من أول حركة دخل «راتب» تسجّلها' : 'لا توجد سلفة قائمة — سجّل سلفة وبتُخصم من أول راتب بعدها'}
            </div>
            {oldestOutstanding && <AdvanceSteps color={color} since={oldestOutstanding.date} />}
            <button
              onClick={() => setEditingId('new')}
              disabled={accounts.length === 0}
              className="qb-press mt-4 flex w-full items-center justify-center gap-2 rounded-full border py-3 text-[13.5px] font-semibold disabled:opacity-40"
              style={{ background: softBg(color), color, borderColor: softBg(color, 30) }}
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
              تسجيل سلفة جديدة
            </button>
          </>
        )}
      </DebtHero>

      {salaryAdvances.length === 0 ? (
        <>
          <SectionHead title="سجل السلف" />
          <EmptyState title="لا يوجد سجل بعد" desc="كل سلفة تسجّلها تظهر هنا مع حالة سدادها." />
        </>
      ) : (
        <>
          {outstanding.length > 0 && (
            <>
              <SectionHead title="قائمة" hint="اضغط للتعديل" />
              <div className="qb-card px-3.5 py-1">
                {outstanding.map((a) => (
                  <AdvanceRow key={a.id} advance={a} accountLabel={accountLabel(a.accountId)} color={color} onClick={() => setEditingId(a.id)} />
                ))}
              </div>
            </>
          )}
          {settled.length > 0 && (
            <>
              <SectionHead title="مسدَّدة" />
              <div className="qb-card px-3.5 py-1 opacity-75">
                {settled.map((a) => (
                  <AdvanceRow key={a.id} advance={a} accountLabel={accountLabel(a.accountId)} color={color} />
                ))}
              </div>
            </>
          )}
        </>
      )}
    </>
  )
}
