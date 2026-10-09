import type { ActivityItem } from '../state/DataContext'
import { formatMoney, formatSigned } from '../lib/format'

export function ActivityIcon({ kind }: { kind: ActivityItem['kind'] }) {
  if (kind === 'expense') {
    return (
      <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="5" x2="12" y2="19" />
        <polyline points="6,13 12,19 18,13" />
      </svg>
    )
  }
  if (kind === 'income') {
    return (
      <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="19" x2="12" y2="5" />
        <polyline points="6,11 12,5 18,11" />
      </svg>
    )
  }
  if (kind === 'transfer') {
    return (
      <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="17,3 21,7 17,11" />
        <path d="M3 7h18" />
        <polyline points="7,21 3,17 7,13" />
        <path d="M21 17H3" />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20c0-3.9 3.1-6 7-6s7 2.1 7 6" />
    </svg>
  )
}

/**
 * مبلغ صف الحركة: موجب أخضر والباقي أبيض. المساهمة (دفعها غيرك) تظهر رمادية
 * بمبلغها الفعلي وتحتها «لم تُخصم» — لأنها لا تدخل في أي مجموع.
 */
export function ActivityAmount({ item, hidden = false }: { item: ActivityItem; hidden?: boolean }) {
  if (item.kind === 'contribution') {
    return (
      <div className="flex-shrink-0 text-left">
        <div className="num text-[14px] font-bold text-[var(--color-text-3)]">{hidden ? '•••' : formatMoney(item.paidAmount ?? 0)}</div>
        <div className="mt-0.5 text-[10px] text-[var(--color-text-3)]">لم تُخصم</div>
      </div>
    )
  }
  return (
    <div dir="ltr" className="num flex-shrink-0 text-[14px] font-bold" style={{ color: item.amount > 0 ? 'var(--color-income)' : 'var(--color-text)' }}>
      {hidden ? '•••' : formatSigned(item.amount)}
    </div>
  )
}
