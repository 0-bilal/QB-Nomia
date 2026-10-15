import { useNavigate } from 'react-router-dom'
import { useData } from '../../state/DataContext'
import type { MoneyBatch } from '../../lib/moneyTrail'
import { formatDate } from '../../lib/format'
import { AlertIcon, money, useTrailNames } from '../../components/MoneyTrailVisuals'

/** صف في «تحتاج نظرة»: خروج بلا مصدر، أو استلام من شخص أكبر مما لك عنده. الضغط يفتح الدفعة. */
export function ReviewRow({ batch, hidden, divider = false }: { batch: MoneyBatch; hidden: boolean; divider?: boolean }) {
  const navigate = useNavigate()
  const { transactions, loanTransactions, categories } = useData()
  const { accountName, personName } = useTrailNames()
  const [type, id] = [batch.ref.slice(0, batch.ref.indexOf(':')), batch.ref.slice(batch.ref.indexOf(':') + 1)]

  let title: string
  let sub: string
  if (batch.kind === 'borrowed') {
    const who = personName(batch.personId)
    title = `${who} رجّع ${money(batch.amount, hidden)} زيادة`
    sub = `أكثر مما لك عنده وقتها (${money(batch.returnedPart ?? 0, hidden)}) · الزيادة صارت عليك له`
  } else {
    const tx = type === 'tx' ? transactions.find((t) => t.id === id) : undefined
    const loan = type === 'loan' ? loanTransactions.find((l) => l.id === id) : undefined
    const what = tx
      ? tx.type === 'transfer'
        ? 'تحويل'
        : 'مصروف'
      : loan
        ? `سلفة لـ${personName(loan.personId)}`
        : type === 'rec'
          ? 'فرق مطابقة'
          : 'خروج'
    const category = tx?.categoryId ? categories.find((c) => c.id === tx.categoryId)?.name : undefined
    title = `${what} ${money(batch.amount, hidden)} بلا مصدر`
    const acc = batch.accountId ? accountName(batch.accountId) : 'الحساب'
    sub = `${category ? `${category} · ` : ''}${formatDate(batch.date)} · ${acc} ما كان فيه كفاية وقتها. غالبًا دخل ما انسجّل.`
  }

  return (
    <button
      onClick={() => navigate(`/trail/${encodeURIComponent(batch.id)}`)}
      className={`qb-press flex w-full items-start gap-2.5 py-2.5 text-right ${divider ? 'border-t qb-divider' : ''}`}
    >
      <span className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full" style={{ background: 'color-mix(in srgb, var(--color-subscription) 15%, transparent)', color: 'var(--color-subscription)' }}>
        <AlertIcon size={14} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-[13px] font-semibold">{title}</div>
        <div className="text-[11px] leading-relaxed text-[var(--color-text-3)]">{sub}</div>
      </div>
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="mt-1.5 flex-shrink-0 text-[var(--color-text-3)]">
        <path d="m15 6-6 6 6 6" />
      </svg>
    </button>
  )
}
