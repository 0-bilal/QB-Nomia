export type AccountType = 'cash' | 'bank' | 'savings' | 'wallet' | 'emergency'

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

/** سجل تغيير زيت السيارة — كل مرة تنهي فترة وتبدأ حساب فترة جديدة من عداد السيارة عند هذا التاريخ. */
export interface OilChangeLog {
  id: string
  date: string
  odometerKm: number
  cost?: number
  accountId?: string
}

/** سجل تعبئة وقود — isFullTank يحدد إذا كانت تعبئة لين آخر الخزان (تُستخدم لحساب معدل الاستهلاك) أو تعبئة جزئية (تُسجَّل للتكلفة فقط). */
export interface FuelLog {
  id: string
  date: string
  odometerKm: number
  liters: number
  isFullTank: boolean
  cost?: number
  accountId?: string
}

/** سلفة راتب — مبلغ يُستلم مقدَّمًا (يُسجَّل كدخل بحسابه فورًا) ويُخصم تلقائيًا من أول حركة دخل "راتب" تُسجَّل بعدها. */
export interface SalaryAdvance {
  id: string
  date: string
  amount: number
  accountId: string
  /** الحركة المالية (دخل) المرتبطة بلحظة استلام السلفة — تُحدَّث أو تُحذف معها لو عُدِّلت السلفة أو حُذفت. */
  transactionId?: string
  settled: boolean
  settledDate?: string
  settledTransactionId?: string
}

/** خصم مخالفة عمل من راتب — يُسجَّل مباشرة وقت إضافة حركة الراتب نفسها (مو مسبقًا زي سلفة الراتب)، فيقل صافي الحركة بمقدار الخصم فورًا. */
export interface SalaryViolationDeduction {
  id: string
  date: string
  amount: number
  accountId: string
  note?: string
  /** حركة الراتب اللي انخصم منها هذا المبلغ — تُحدَّث أو تُحذف معها لو عُدِّل الخصم أو حُذف. */
  transactionId: string
}

/** دَين لمتجر/محل — أخذت سلعة أو خدمة ولسه ما دفعت قيمتها بالكامل. أخذ الدَين نفسه لا يؤثر على أي رصيد؛ فقط سداده لاحقًا (StoreDebtPayment) يُنشئ حركة مصروف فعلية. */
export interface StoreDebt {
  id: string
  storeName: string
  amount: number
  date: string
  dueDate?: string
  note?: string
}

/** سداد (كامل أو جزئي) لدَين متجر — كل سداد له حركة مصروف حقيقية مرتبطة به (transactionId)، تُحدَّث أو تُحذف معه لو عُدِّل السداد أو حُذف. */
export interface StoreDebtPayment {
  id: string
  debtId: string
  amount: number
  date: string
  accountId: string
  transactionId: string
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
  /** مفتاح أيقونة مختارة من CATEGORY_ICON_OPTIONS — اختياري، يعرض أول حرف من الاسم لو ما تحدّدت. */
  icon?: string
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
