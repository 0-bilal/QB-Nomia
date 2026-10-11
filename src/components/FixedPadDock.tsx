import { useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useData } from '../state/DataContext'
import type { Account } from '../types'
import { formatAmount, formatMoney } from '../lib/format'
import { AmountPad } from './AmountPad'
import { PickerField } from './PickerField'
import { SelectSheet, type SelectSheetItem } from './SelectSheet'
import { ACCOUNT_ICON_BG, ACCOUNT_ICON_COLOR, ACCOUNT_TYPE_LABELS, AccountTypeIcon } from './AccountVisuals'

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  )
}

function NoteIcon() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
      <path d="M5 5h14v10l-5 5H5z" />
      <path d="M14 20v-5h5" />
    </svg>
  )
}

/** حقل نصي يُكتب مكان لوحة الأرقام (لوحة الهاتف تأخذ مكانها) — الملاحظة، اسم المتجر... */
export interface DockEditor {
  value: string
  onChange: (v: string) => void
  placeholder: string
  onDone: () => void
}

/** كبسولة الملاحظة في صف القسم الثابت — تمتد لباقي العرض. */
export function NoteChip({ note, placeholder = 'ملاحظة', onClick }: { note: string; placeholder?: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="qb-press flex h-9 min-w-0 flex-1 items-center gap-1.5 rounded-full border bg-[var(--color-surface)] px-3 text-[12px] font-semibold"
      style={{ borderColor: note ? 'var(--color-border-strong)' : 'var(--color-border)', color: note ? 'var(--color-text)' : 'var(--color-text-2)' }}
    >
      <NoteIcon />
      <span className="truncate">{note || placeholder}</span>
    </button>
  )
}

/**
 * القسم الثابت أسفل شاشات إدخال المبالغ: صف كبسولات (تاريخ، ملاحظة...) ثم لوحة الأرقام
 * بزر الحفظ داخلها. مع `editor` يتحول لحقل كتابة مكان اللوحة مع زر «تم».
 */
export function FixedPadDock({
  amount,
  onAmountChange,
  color,
  canSave,
  onSave,
  saveLabel = 'حفظ',
  chips,
  editor,
}: {
  amount: string
  onAmountChange: (v: string) => void
  color: string
  canSave: boolean
  onSave: () => void
  saveLabel?: string
  chips?: ReactNode
  editor?: DockEditor | null
}) {
  return (
    <div className="relative z-10 flex-shrink-0 border-t border-[var(--color-border)] bg-[var(--color-bg)] px-5 pb-4 pt-3">
      <div className="safe-bottom">
        {editor ? (
          <div className="flex items-center gap-2">
            <input
              autoFocus
              value={editor.value}
              onChange={(e) => editor.onChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') editor.onDone()
              }}
              placeholder={editor.placeholder}
              className="h-[46px] min-w-0 flex-1 rounded-2xl border border-[var(--color-accent-line)] bg-[var(--color-surface)] px-3.5 text-[14px] outline-none placeholder:text-[var(--color-text-3)]"
            />
            <button
              type="button"
              onClick={editor.onDone}
              className="qb-press h-[46px] flex-shrink-0 rounded-2xl px-4 text-[13.5px] font-semibold text-[var(--color-on-accent)]"
              style={{ background: 'var(--color-accent)' }}
            >
              تم
            </button>
          </div>
        ) : (
          <>
            {chips && <div className="mb-2.5 flex items-center gap-1.5">{chips}</div>}
            <AmountPad value={amount} onChange={onAmountChange} color={color} action={{ label: saveLabel, icon: <CheckIcon />, color, disabled: !canSave, onPress: onSave }} />
          </>
        )}
      </div>
    </div>
  )
}

/** حقل اختيار حساب مع ورقته — مشترك بين شاشات السلف والديون. */
export function AccountSelectField({ label, sheetTitle, accountId, onChange, className = 'mb-3' }: { label: string; sheetTitle?: string; accountId: string; onChange: (id: string) => void; className?: string }) {
  const navigate = useNavigate()
  const { accounts } = useData()
  const [open, setOpen] = useState(false)
  const selected = accounts.find((a) => a.id === accountId)
  return (
    <div className={className}>
      <SelectSheet
        open={open}
        title={sheetTitle ?? label}
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
          onChange(v)
          setOpen(false)
        }}
        onClose={() => setOpen(false)}
        emptyLabel="لا توجد حسابات بعد"
        footer={
          <button
            onClick={() => {
              setOpen(false)
              navigate('/accounts/new')
            }}
            className="qb-press mt-1 w-full rounded-full py-3 text-[13px] font-semibold"
            style={{ background: 'var(--color-accent-soft)', color: 'var(--color-accent)' }}
          >
            + إضافة حساب جديد
          </button>
        }
      />
      <PickerField
        label={label}
        icon={<AccountTypeIcon type={selected?.type ?? 'cash'} />}
        iconColor={selected ? ACCOUNT_ICON_COLOR[selected.type] : 'var(--color-text-3)'}
        iconBg={selected ? ACCOUNT_ICON_BG[selected.type] : 'rgba(255,255,255,0.08)'}
        title={selected?.name ?? (accounts.length === 0 ? 'لا توجد حسابات' : 'اختر حسابًا')}
        placeholder={!selected}
        subtitle={selected ? ACCOUNT_TYPE_LABELS[selected.type] : undefined}
        trailing={
          selected ? (
            <span className="num text-[14px] font-bold" style={{ color: ACCOUNT_ICON_COLOR[selected.type] }}>
              {formatMoney(selected.balance)}
            </span>
          ) : undefined
        }
        onClick={() => (accounts.length === 0 ? navigate('/accounts/new') : setOpen(true))}
      />
    </div>
  )
}

/** حساب «من» أو «إلى» في التحويل — بطاقتان جنب بعض بدل صفّين، عشان تبقى الشاشة بدون تمرير. */
export function AccountMiniField({ label, account, onClick }: { label: string; account?: Account; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="qb-card qb-press flex min-w-0 flex-col items-start gap-1.5 px-3 py-2.5 text-right">
      <span className="text-[11px] font-medium text-[var(--color-text-3)]">{label}</span>
      <span className="flex w-full min-w-0 items-center gap-2">
        <span
          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-[10px]"
          style={{ background: account ? ACCOUNT_ICON_BG[account.type] : 'rgba(255,255,255,0.08)', color: account ? ACCOUNT_ICON_COLOR[account.type] : 'var(--color-text-3)' }}
        >
          <AccountTypeIcon type={account?.type ?? 'cash'} size={15} />
        </span>
        <span className="min-w-0">
          <span className={`block truncate text-[13px] font-semibold ${account ? '' : 'text-[var(--color-text-3)]'}`}>{account?.name ?? 'اختر حسابًا'}</span>
          {account && <span className="num block truncate text-[11px] text-[var(--color-text-3)]">{formatAmount(account.balance)}</span>}
        </span>
      </span>
    </button>
  )
}
