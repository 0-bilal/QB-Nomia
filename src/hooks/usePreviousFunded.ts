import { useMemo } from 'react'
import { useData } from '../state/DataContext'
import { previousFundedExpenses } from '../lib/periodFunding'

/** المصاريف اللي غطّاها رصيد سابق في شهرها (رقم المصروف ← المبلغ والحسابات) — لشارة «من رصيد سابق». */
export function usePreviousFunded() {
  const { transactions, loanTransactions } = useData()
  return useMemo(() => previousFundedExpenses(transactions, loanTransactions), [transactions, loanTransactions])
}
