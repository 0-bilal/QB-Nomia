export type AccountType = 'cash' | 'bank' | 'savings' | 'wallet'

export interface Account {
  id: string
  name: string
  type: AccountType
  balance: number
  goalAmount?: number
  goalLabel?: string
  goalTargetDate?: string
  /** تاريخ بداية حول الزكاة لهذا الهدف — يُفترض تلقائيًا تاريخ إنشاء الهدف، وقابل للتعديل. */
  zakatHawlStartDate?: string
}

/** سجل دفعة زكاة مسجَّلة لهدف ادخار — كل دفعة تنهي حول وتبدأ حول جديد (account.zakatHawlStartDate يُصفَّر لتاريخ الدفعة). */
export interface ZakatPayment {
  id: string
  accountId: string
  date: string
  amount: number
  hawlStartDate: string
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

// التزامات دورية غير مالية بالضرورة (تجديد هوية، عقد إيجار، رخصة...) —
// نفس فكرة الاشتراكات لكن بدورة متكررة حرة (كل N يوم/أسبوع/شهر/سنة)
// وتكلفة/حساب اختياريين بدل إجباريين.
export type CommitmentIntervalUnit = 'day' | 'week' | 'month' | 'year'
export type CommitmentStatus = 'active' | 'paused' | 'cancelled'

export interface Commitment {
  id: string
  name: string
  note?: string
  cost?: number
  accountId?: string
  intervalUnit: CommitmentIntervalUnit
  intervalCount: number
  nextDueDate: string
  status: CommitmentStatus
}

// حركات متكررة بمبلغ تقديري (راتب، اشتراك يدوي...) — لا تُنفَّذ تلقائيًا،
// بل تظهر كإشعار يحتاج موافقة/تعديل قبل تسجيلها كحركة فعلية.
export type RecurringStatus = 'active' | 'paused' | 'cancelled'

export interface RecurringTransaction {
  id: string
  name: string
  type: TransactionType
  amount: number
  accountId: string
  categoryId?: string
  incomeSourceId?: string
  transferToAccountId?: string
  intervalUnit: CommitmentIntervalUnit
  intervalCount: number
  nextDueDate: string
  status: RecurringStatus
  note?: string
}
