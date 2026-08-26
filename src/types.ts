export type AccountType = 'cash' | 'bank' | 'savings' | 'wallet'

export interface Account {
  id: string
  name: string
  type: AccountType
  balance: number
  goalAmount?: number
  goalLabel?: string
}

export interface Person {
  id: string
  name: string
  phone?: string
  note?: string
  createdAt: string
}

export type LoanDirection = 'given' | 'received'

export interface LoanTransaction {
  id: string
  personId: string
  direction: LoanDirection
  amount: number
  accountId: string
  date: string
  dueDate?: string
  note?: string
}

export type CategoryKind = 'expense' | 'income'

export interface Category {
  id: string
  name: string
  kind: CategoryKind
  budgetLimit?: number
}

export interface IncomeSource {
  id: string
  name: string
}

export type TransactionType = 'expense' | 'income' | 'transfer'

export interface Transaction {
  id: string
  type: TransactionType
  amount: number
  date: string
  note?: string
  accountId: string
  categoryId?: string
  incomeSourceId?: string
  transferToAccountId?: string
}

export type BillingCycle = 'monthly' | 'yearly'
export type SubscriptionStatus = 'active' | 'paused' | 'cancelled'

export interface Subscription {
  id: string
  name: string
  provider?: string
  cost: number
  billingCycle: BillingCycle
  nextRenewalDate: string
  accountId: string
  status: SubscriptionStatus
}
