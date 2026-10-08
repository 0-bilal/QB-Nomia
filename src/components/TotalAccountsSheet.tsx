import { useState } from 'react'
import { useData } from '../state/DataContext'
import { formatMoney } from '../lib/format'
import { haptic } from '../lib/haptics'
import { ACCOUNT_ICON_BG, ACCOUNT_ICON_COLOR, ACCOUNT_TYPE_LABELS, AccountTypeIcon } from './AccountVisuals'
import { SheetHandle } from './SheetHandle'

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="5,13 10,18 19,6" />
    </svg>
  )
}

/**
 * Sheet اختيار الحسابات اللي تدخل بـ"إجمالي رصيدك" بالرئيسية — مثلًا استثناء حساب
 * الطوارئ أو بطاقة الوقود من الرقم الإجمالي. المعاينة تتحدّث مباشرة قبل الحفظ.
 */
export function TotalAccountsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null
  return <TotalAccountsSheetBody onClose={onClose} />
}

function TotalAccountsSheetBody({ onClose }: { onClose: () => void }) {
  const { accounts, setAccountsIncludedInTotal } = useData()
  const [selected, setSelected] = useState<Set<string>>(() => new Set(accounts.filter((a) => a.includeInTotal !== false).map((a) => a.id)))

  const previewTotal = accounts.filter((a) => selected.has(a.id)).reduce((s, a) => s + a.balance, 0)
  const allSelected = selected.size === accounts.length

  function toggle(id: string) {
    haptic('tick')
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function save() {
    setAccountsIncludedInTotal([...selected])
    haptic('success')
    onClose()
  }

  return (
    <div dir="rtl" className="fixed inset-0 z-[65] flex items-end justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-[6px]" style={{ animation: 'fade-in 180ms ease-out both' }} onClick={onClose} aria-hidden="true" />
      <div
        className="relative flex max-h-[82vh] w-full max-w-[480px] flex-col rounded-t-[32px] border-x border-t border-[var(--color-border-strong)] bg-[var(--color-surface-elevated)] shadow-[0_-24px_60px_-20px_rgba(0,0,0,0.85)]"
        style={{ animation: 'sheet-in 420ms var(--ease-out-expo) both' }}
      >
        <SheetHandle onDismiss={onClose} />
        <div className="flex flex-shrink-0 items-start justify-between gap-3 px-5 pb-3">
          <div>
            <div className="text-[17px] font-semibold">حسابات الإجمالي</div>
            <div className="text-[12px] text-[var(--color-text-3)]">اختر الحسابات اللي تدخل في "إجمالي رصيدك"</div>
          </div>
          <button
            onClick={() => setSelected(allSelected ? new Set() : new Set(accounts.map((a) => a.id)))}
            className="qb-press flex-shrink-0 rounded-full bg-white/[0.08] px-3.5 py-2 text-[12px] font-medium"
          >
            {allSelected ? 'إلغاء الكل' : 'تحديد الكل'}
          </button>
        </div>

        <div className="mx-5 mb-3 flex items-baseline justify-between rounded-[20px] bg-white/[0.05] px-4 py-3.5">
          <span className="text-[12.5px] text-[var(--color-text-2)]">
            الإجمالي ({selected.size} من {accounts.length})
          </span>
          <span key={previewTotal} className="num text-[20px] font-bold" style={{ animation: 'qb-pop 260ms var(--ease-spring) both' }}>
            {formatMoney(previewTotal)}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-2">
          {accounts.length === 0 ? (
            <div className="py-8 text-center text-[13px] text-[var(--color-text-3)]">لا توجد حسابات بعد</div>
          ) : (
            <div className="flex flex-col gap-2 pb-2">
              {accounts.map((a) => {
                const on = selected.has(a.id)
                return (
                  <button
                    key={a.id}
                    onClick={() => toggle(a.id)}
                    role="checkbox"
                    aria-checked={on}
                    className="qb-press flex w-full items-center gap-3 rounded-[20px] border px-3.5 py-3 text-right"
                    style={{
                      borderColor: on ? 'rgba(255,255,255,0.28)' : 'var(--color-border)',
                      background: on ? 'rgba(255,255,255,0.06)' : 'var(--color-surface)',
                      transition: 'background 200ms ease, border-color 200ms ease',
                    }}
                  >
                    <div
                      className="flex flex-shrink-0 items-center justify-center rounded-full"
                      style={{ width: 40, height: 40, background: ACCOUNT_ICON_BG[a.type], color: ACCOUNT_ICON_COLOR[a.type], opacity: on ? 1 : 0.5 }}
                    >
                      <AccountTypeIcon type={a.type} size={17} />
                    </div>
                    <div className="min-w-0 flex-1" style={{ opacity: on ? 1 : 0.55 }}>
                      <div className="truncate text-[14px] font-medium">{a.name}</div>
                      <div className="truncate text-[11.5px] text-[var(--color-text-3)]">{ACCOUNT_TYPE_LABELS[a.type]}</div>
                    </div>
                    <span className="num flex-shrink-0 text-[13.5px] font-semibold" style={{ opacity: on ? 1 : 0.45 }}>
                      {formatMoney(a.balance)}
                    </span>
                    <span
                      className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border"
                      style={{
                        background: on ? 'var(--color-accent)' : 'transparent',
                        borderColor: on ? 'transparent' : 'rgba(255,255,255,0.25)',
                        color: 'var(--color-on-accent)',
                        transition: 'background 200ms ease',
                      }}
                    >
                      {on && <CheckIcon />}
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <div className="safe-bottom flex-shrink-0 px-5 pb-5 pt-2">
          <button onClick={save} className="qb-btn-primary w-full py-3.5 text-[14.5px]">
            حفظ الاختيار
          </button>
        </div>
      </div>
    </div>
  )
}
