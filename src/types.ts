export type AccountType = 'cash' | 'bank' | 'savings'

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
