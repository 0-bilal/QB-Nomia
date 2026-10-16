import { useEffect, useMemo, useState } from 'react'
import { useData } from '../state/DataContext'
import { isSheetsSyncConfigured } from '../config/sheetsSync'
import { isBiometricEnabled, isBiometricSupported } from '../lib/biometric'
import { setupProgress, setupSteps, type SetupProgress } from '../lib/onboarding'

/** حالة «جهّز محفظتك» من البيانات الفعلية. تُحسب من جديد كل ما تركّبت الشاشة أو تغيّرت البيانات. */
export function useSetupProgress(): SetupProgress {
  const { accounts, transactions, recurringTransactions, categories, monthlyBudgetLimit } = useData()
  const [bioSupported, setBioSupported] = useState<boolean | null>(null)

  useEffect(() => {
    let alive = true
    isBiometricSupported().then((ok) => alive && setBioSupported(ok))
    return () => {
      alive = false
    }
  }, [])

  return useMemo(
    () =>
      setupProgress(
        setupSteps({
          accountsCount: accounts.length,
          hasIncome: transactions.some((t) => t.type === 'income') || recurringTransactions.some((r) => r.type === 'income'),
          hasBudget: monthlyBudgetLimit != null || categories.some((c) => (c.budgetLimit ?? 0) > 0),
          backupConfigured: isSheetsSyncConfigured(),
          // قبل ما نعرف الدعم نعرضها كخطوة عادية حتى ما تقفز القائمة لاحقًا إلا لو فعلًا غير مدعومة.
          biometricEnabled: bioSupported === false ? null : isBiometricEnabled(),
        }),
      ),
    [accounts, transactions, recurringTransactions, categories, monthlyBudgetLimit, bioSupported],
  )
}
