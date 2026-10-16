import { useMemo } from 'react'
import { useData } from '../state/DataContext'
import { savingsAccountIds } from '../lib/monthLedger'

/** معرّفات حسابات المدخرات (ادخار وطوارئ) — مصروفها «من مدخراتك» وما ينحسب على الشهر. */
export function useSavingsIds(): Set<string> {
  const { accounts } = useData()
  return useMemo(() => savingsAccountIds(accounts), [accounts])
}
