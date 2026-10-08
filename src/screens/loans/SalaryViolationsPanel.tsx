import { useState } from 'react'
import { useData } from '../../state/DataContext'
import { formatMoney, formatDate } from '../../lib/format'
import { AmountPad } from '../../components/AmountPad'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { ACCOUNT_TYPE_LABELS } from '../../components/AccountVisuals'
import { BigAmount } from '../../components/BigAmount'
import { Badge, EmptyState, IconBubble, ListGroup, ListItem, SectionTitle } from '../../components/ui'

const color = 'var(--color-expense)'

function SalaryViolationIcon({ size = 20 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3.5 22 20.5H2Z" />
      <line x1="12" y1="9.5" x2="12" y2="14" />
      <circle cx="12" cy="17" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  )
}

/**
 * محرر تعديل خصم مخالفة مضمّن — بدون اختيار حساب (الحساب موروث من حركة
 * الراتب المرتبطة ولا يتغيّر)، فقط المبلغ وملاحظة اختيارية.
 */
function EditViolationForm({
  initial,
  onSave,
  onDelete,
  onCancel,
}: {
  initial: { amount: number; note?: string }
  onSave: (amount: number, note: string) => void
  onDelete: () => void
  onCancel: () => void
}) {
  const [amount, setAmount] = useState(String(initial.amount))
  const [note, setNote] = useState(initial.note ?? '')

  const numeric = Number(amount)
  const canSave = numeric > 0

  return (
    <div>
      <div className="mb-1.5 text-[12px] text-[var(--color-text-3)]">مبلغ الخصم</div>
      <div dir="ltr" className="mb-4 flex items-baseline justify-center gap-2">
        <span key={amount} className="num text-[44px] font-bold tracking-tight" style={{ animation: 'qb-pop 260ms var(--ease-spring) both' }}>{amount || '0'}</span>
        <span className="flex-shrink-0 text-[16px] font-medium text-[var(--color-text-3)]">ر.س</span>
      </div>
      <div className="mb-4 flex justify-center">
        <AmountPad value={amount} onChange={setAmount} color={color} />
      </div>

      <label className="mb-2 block px-1 text-[12.5px] font-medium text-[var(--color-text-2)]">ملاحظة (اختياري)</label>
      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="سبب المخالفة"
        className="mb-4 w-full rounded-[18px] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3.5 text-[14px] outline-none placeholder:text-[var(--color-text-3)]"
      />

      <div className="flex gap-2.5">
        <button onClick={onCancel} className="qb-press flex-1 rounded-full bg-white/[0.06] py-3 text-[13.5px] font-medium text-[var(--color-text)]">
          إلغاء
        </button>
        <button
          onClick={() => canSave && onSave(numeric, note)}
          disabled={!canSave}
          className="qb-press flex-1 rounded-full py-3 text-[13.5px] font-semibold text-[#0A0A0C] disabled:opacity-35"
          style={{ background: color }}
        >
          حفظ
        </button>
      </div>

      <button onClick={onDelete} className="qb-press mt-3 w-full text-center text-[12.5px] font-semibold" style={{ color }}>
        حذف الخصم
      </button>
    </div>
  )
}

/** محتوى تبويب "خصومات مخالفات" داخل شاشة الديون والسلف. */
export function SalaryViolationsPanel() {
  const { salaryViolations, updateSalaryViolation, deleteSalaryViolation, accounts } = useData()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const total = salaryViolations.reduce((sum, v) => sum + v.amount, 0)
  const editingViolation = editingId ? salaryViolations.find((v) => v.id === editingId) : undefined

  return (
    <>
      <ConfirmDialog
        open={confirmDeleteId !== null}
        title="حذف الخصم"
        message="بيتم حذف هذا الخصم، ويرجع مبلغه لحركة الراتب المرتبطة به ولرصيد الحساب."
        confirmLabel="حذف"
        color="var(--color-expense)"
        onConfirm={() => {
          if (confirmDeleteId) deleteSalaryViolation(confirmDeleteId)
          setConfirmDeleteId(null)
          setEditingId(null)
        }}
        onCancel={() => setConfirmDeleteId(null)}
      />

      <div className="qb-card-elevated qb-rise mb-6 p-5">
        <div className="mb-5 flex items-center gap-3">
          <IconBubble color={color} size={46}>
            <SalaryViolationIcon />
          </IconBubble>
          <div className="min-w-0 flex-1">
            <div className="text-[16px] font-semibold">خصومات المخالفات</div>
            <div className="truncate text-[11px] text-[var(--color-text-3)]">تُسجَّل مباشرة عند إضافة حركة راتب فيها خصم مخالفة</div>
          </div>
        </div>

        {editingViolation ? (
          <EditViolationForm
            initial={{ amount: editingViolation.amount, note: editingViolation.note }}
            onSave={(amount, note) => {
              updateSalaryViolation(editingViolation.id, { amount, note })
              setEditingId(null)
            }}
            onDelete={() => setConfirmDeleteId(editingViolation.id)}
            onCancel={() => setEditingId(null)}
          />
        ) : total === 0 ? (
          <div className="rounded-[20px] bg-white/[0.04] p-4 text-[12.5px] leading-relaxed text-[var(--color-text-2)]">
            لا توجد خصومات مسجَّلة بعد. تقدر تضيف خصم مخالفة عند تسجيل حركة راتب جديدة.
          </div>
        ) : (
          <div className="flex items-end justify-between gap-3">
            <div>
              <div className="mb-1.5 text-[12.5px] text-[var(--color-text-2)]">إجمالي الخصومات</div>
              <BigAmount value={total} size={36} color={color} />
            </div>
            <Badge color={color}>{salaryViolations.length} خصم</Badge>
          </div>
        )}
      </div>

      <SectionTitle title="سجل الخصومات" hint="اضغط أي خصم لتعديل مبلغه أو حذفه" />
      {salaryViolations.length === 0 ? (
        <EmptyState title="لا يوجد سجل بعد" />
      ) : (
        <ListGroup>
          {salaryViolations.map((v, i) => {
            const account = accounts.find((acc) => acc.id === v.accountId)
            return (
              <ListItem
                key={v.id}
                divider={i > 0}
                onClick={() => setEditingId(v.id)}
                leading={
                  <IconBubble color={color}>
                    <SalaryViolationIcon size={18} />
                  </IconBubble>
                }
                title={<span className="num">{formatDate(v.date)}</span>}
                subtitle={[account ? `${account.name} · ${ACCOUNT_TYPE_LABELS[account.type]}` : '', v.note ?? ''].filter(Boolean).join(' — ') || undefined}
                trailing={
                  <span className="num text-[14px] font-bold" style={{ color }}>
                    −{formatMoney(v.amount)}
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
