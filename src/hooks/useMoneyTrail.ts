import { useMemo } from 'react'
import { useData } from '../state/DataContext'
import { computeMoneyTrail, type MoneyTrail } from '../lib/moneyTrail'

/** مسار الفلوس محسوبًا من السجل الحالي — يُعاد حسابه فقط لما تتغير الحركات أو الأرصدة. */
export function useMoneyTrail(): MoneyTrail {
  const { accounts, transactions, loanTransactions, reconciliations } = useData()
  return useMemo(() => computeMoneyTrail({ accounts, transactions, loanTransactions, reconciliations }), [accounts, transactions, loanTransactions, reconciliations])
}
