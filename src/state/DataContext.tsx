import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { loadJSON, saveJSON } from '../lib/storage'
import { makeId } from '../lib/id'
import { scheduleBackgroundSync } from '../lib/autoSync'
import type {
  Account,
  BillingCycle,
  Category,
  CategoryKind,
  Commitment,
  CommitmentIntervalUnit,
  CommitmentStatus,
  IncomeSource,
  LoanDirection,
  LoanTransaction,
  Person,
  Subscription,
  SubscriptionStatus,
  Transaction,
  TransactionType,
} from '../types'

const ACCOUNTS_KEY = 'qbnomia.accounts'
const PEOPLE_KEY = 'qbnomia.people'
const LOANS_KEY = 'qbnomia.loanTransactions'
const CATEGORIES_KEY = 'qbnomia.categories'
const INCOME_SOURCES_KEY = 'qbnomia.incomeSources'
const TRANSACTIONS_KEY = 'qbnomia.transactions'
const SUBSCRIPTIONS_KEY = 'qbnomia.subscriptions'
const COMMITMENTS_KEY = 'qbnomia.commitments'

// لا حسابات ولا أشخاص ولا حركات افتراضية — المستخدم يبنيها بنفسه من الصفر.
function seedAccounts(): Account[] {
  return []
}

function seedPeople(): Person[] {
  return []
}

function seedLoans(): LoanTransaction[] {
  return []
}

// الفئات ومصادر الدخل مجرد تسميات تنظيمية جاهزة (مو بيانات مالية وهمية) فتبقى كنقطة انطلاق مفيدة.
function seedCategories(): Category[] {
  return [
    { id: 'cat-food', name: 'مطاعم', kind: 'expense' },
    { id: 'cat-transport', name: 'مواصلات', kind: 'expense' },
    { id: 'cat-bills', name: 'فواتير', kind: 'expense' },
    { id: 'cat-shopping', name: 'تسوق', kind: 'expense' },
    { id: 'cat-health', name: 'صحة', kind: 'expense' },
    { id: 'cat-fun', name: 'ترفيه', kind: 'expense' },
    { id: 'cat-subscriptions', name: 'اشتراكات', kind: 'expense' },
    { id: 'cat-commitments', name: 'التزامات', kind: 'expense' },
  ]
}

function seedIncomeSources(): IncomeSource[] {
  return [
    { id: 'src-salary', name: 'راتب' },
    { id: 'src-freelance', name: 'عمل حر' },
    { id: 'src-gifts', name: 'هدايا' },
    { id: 'src-other', name: 'أخرى' },
  ]
}

function seedTransactions(): Transaction[] {
  return []
}

function seedSubscriptions(): Subscription[] {
  return []
}

function seedCommitments(): Commitment[] {
  return []
}

/** يحسب موعد الاستحقاق التالي بإضافة (intervalCount × intervalUnit) على التاريخ المُعطى. */
function advanceByInterval(iso: string, unit: CommitmentIntervalUnit, count: number): string {
  const d = new Date(iso)
  if (unit === 'day') d.setDate(d.getDate() + count)
  else if (unit === 'week') d.setDate(d.getDate() + count * 7)
  else if (unit === 'month') d.setMonth(d.getMonth() + count)
  else d.setFullYear(d.getFullYear() + count)
  return d.toISOString().slice(0, 10)
}

interface AddPersonInput {
  name: string
  phone?: string
  note?: string
}

interface AddLoanInput {
  personId: string
  direction: LoanDirection
  amount: number
  accountId: string
  date: string
  dueDate?: string
  note?: string
}

interface AddCategoryInput {
  name: string
  kind: CategoryKind
  budgetLimit?: number
}

interface AddIncomeSourceInput {
  name: string
}

interface AddTransactionInput {
  type: TransactionType
  amount: number
  date: string
  accountId: string
  categoryId?: string
  incomeSourceId?: string
  transferToAccountId?: string
  note?: string
}

interface AddSubscriptionInput {
  name: string
  provider?: string
  cost: number
  billingCycle: BillingCycle
  nextRenewalDate: string
  accountId: string
}

interface AddCommitmentInput {
  name: string
  note?: string
  cost?: number
  accountId?: string
  intervalUnit: CommitmentIntervalUnit
  intervalCount: number
  nextDueDate: string
}

interface AddAccountInput {
  name: string
  type: Account['type']
  balance: number
  goalAmount?: number
  goalLabel?: string
}

export interface ActivityItem {
  id: string
  date: string
  kind: 'expense' | 'income' | 'transfer' | 'loan-given' | 'loan-received'
  title: string
  subtitle: string
  amount: number
  color: string
  accountIds: string[]
  personId?: string
  note?: string
}

interface DataContextValue {
  accounts: Account[]
  people: Person[]
  loanTransactions: LoanTransaction[]
  categories: Category[]
  incomeSources: IncomeSource[]
  transactions: Transaction[]
  subscriptions: Subscription[]
  commitments: Commitment[]
  totalBalance: number
  availableBalance: number
  totalMonthlySubscriptions: number
  addSubscription: (input: AddSubscriptionInput) => Subscription
  updateSubscription: (id: string, input: AddSubscriptionInput) => void
  deleteSubscription: (id: string) => void
  setSubscriptionStatus: (id: string, status: SubscriptionStatus) => void
  logSubscriptionPayment: (id: string) => void
  addCommitment: (input: AddCommitmentInput) => Commitment
  updateCommitment: (id: string, input: AddCommitmentInput) => void
  deleteCommitment: (id: string) => void
  setCommitmentStatus: (id: string, status: CommitmentStatus) => void
  logCommitmentRenewal: (id: string) => void
  addAccount: (input: AddAccountInput) => Account
  updateAccount: (id: string, input: AddAccountInput) => void
  deleteAccount: (id: string) => void
  addPerson: (input: AddPersonInput) => Person
  updatePerson: (id: string, input: AddPersonInput) => void
  deletePerson: (id: string) => void
  addLoanTransaction: (input: AddLoanInput) => void
  updateLoanTransaction: (id: string, input: AddLoanInput) => void
  deleteLoanTransaction: (id: string) => void
  personBalance: (personId: string) => number
  personTransactions: (personId: string) => LoanTransaction[]
  totalOwedToMe: number
  totalIOwe: number
  addCategory: (input: AddCategoryInput) => Category
  updateCategory: (id: string, input: AddCategoryInput) => void
  deleteCategory: (id: string) => void
  addIncomeSource: (input: AddIncomeSourceInput) => IncomeSource
  updateIncomeSource: (id: string, input: AddIncomeSourceInput) => void
  deleteIncomeSource: (id: string) => void
  addTransaction: (input: AddTransactionInput) => void
  updateTransaction: (id: string, input: AddTransactionInput) => void
  deleteTransaction: (id: string) => void
  categorySpentThisMonth: (categoryId: string) => number
  recentActivity: (limit?: number) => ActivityItem[]
  accountActivity: (accountId: string, limit?: number) => ActivityItem[]
  monthTotals: () => { income: number; expense: number }
  monthlyTrend: (months?: number) => { label: string; income: number; expense: number }[]
  financialHealthScore: () => number | null
  exportSnapshot: () => DataSnapshot
  importSnapshot: (snapshot: DataSnapshot) => void
}

export interface DataSnapshot {
  accounts: Account[]
  people: Person[]
  loanTransactions: LoanTransaction[]
  categories: Category[]
  incomeSources: IncomeSource[]
  transactions: Transaction[]
  subscriptions: Subscription[]
  commitments?: Commitment[]
}

const DataContext = createContext<DataContextValue | null>(null)

/** يطبّق أثر حركة مالية (مصروف/دخل/تحويل) على أرصدة الحسابات — multiplier=-1 يعكس نفس الأثر (لحذف أو تعديل حركة قائمة). */
function withTransactionEffect(accs: Account[], txn: Transaction, multiplier: 1 | -1): Account[] {
  if (txn.type === 'expense') {
    return accs.map((a) => (a.id === txn.accountId ? { ...a, balance: a.balance - multiplier * txn.amount } : a))
  }
  if (txn.type === 'income') {
    return accs.map((a) => (a.id === txn.accountId ? { ...a, balance: a.balance + multiplier * txn.amount } : a))
  }
  if (txn.type === 'transfer' && txn.transferToAccountId) {
    return accs.map((a) => {
      if (a.id === txn.accountId) return { ...a, balance: a.balance - multiplier * txn.amount }
      if (a.id === txn.transferToAccountId) return { ...a, balance: a.balance + multiplier * txn.amount }
      return a
    })
  }
  return accs
}

/** يطبّق أثر حركة سلفة على رصيد الحساب المرتبط بها — نفس مبدأ withTransactionEffect. */
function withLoanEffect(accs: Account[], txn: LoanTransaction, multiplier: 1 | -1): Account[] {
  const delta = txn.direction === 'given' ? -txn.amount : txn.amount
  return accs.map((a) => (a.id === txn.accountId ? { ...a, balance: a.balance + multiplier * delta } : a))
}

export function DataProvider({ children }: { children: ReactNode }) {
  const [accounts, setAccounts] = useState<Account[]>(() => loadJSON(ACCOUNTS_KEY, seedAccounts()))
  const [people, setPeople] = useState<Person[]>(() => loadJSON(PEOPLE_KEY, seedPeople()))
  const [loanTransactions, setLoanTransactions] = useState<LoanTransaction[]>(() =>
    loadJSON(LOANS_KEY, seedLoans()),
  )
  const [categories, setCategories] = useState<Category[]>(() => loadJSON(CATEGORIES_KEY, seedCategories()))
  const [incomeSources, setIncomeSources] = useState<IncomeSource[]>(() =>
    loadJSON(INCOME_SOURCES_KEY, seedIncomeSources()),
  )
  const [transactions, setTransactions] = useState<Transaction[]>(() =>
    loadJSON(TRANSACTIONS_KEY, seedTransactions()),
  )
  const [subscriptions, setSubscriptions] = useState<Subscription[]>(() =>
    loadJSON(SUBSCRIPTIONS_KEY, seedSubscriptions()),
  )
  const [commitments, setCommitments] = useState<Commitment[]>(() =>
    loadJSON(COMMITMENTS_KEY, seedCommitments()),
  )

  function persistAccounts(next: Account[]) {
    setAccounts(next)
    saveJSON(ACCOUNTS_KEY, next)
  }
  function persistPeople(next: Person[]) {
    setPeople(next)
    saveJSON(PEOPLE_KEY, next)
  }
  function persistLoans(next: LoanTransaction[]) {
    setLoanTransactions(next)
    saveJSON(LOANS_KEY, next)
  }
  function persistCategories(next: Category[]) {
    setCategories(next)
    saveJSON(CATEGORIES_KEY, next)
  }
  function persistIncomeSources(next: IncomeSource[]) {
    setIncomeSources(next)
    saveJSON(INCOME_SOURCES_KEY, next)
  }
  function persistTransactions(next: Transaction[]) {
    setTransactions(next)
    saveJSON(TRANSACTIONS_KEY, next)
  }
  function persistSubscriptions(next: Subscription[]) {
    setSubscriptions(next)
    saveJSON(SUBSCRIPTIONS_KEY, next)
  }
  function persistCommitments(next: Commitment[]) {
    setCommitments(next)
    saveJSON(COMMITMENTS_KEY, next)
  }

  // يرفع نسخة خلفية تلقائيًا لجوجل شيت بعد أي تعديل حقيقي على البيانات —
  // بلا حاجة لفتح "المزيد" والضغط "رفع" يدويًا. يُستثنى أول تحميل للتطبيق
  // (isFirstRender) وأي استيراد ناتج عن سحب من جوجل شيت نفسه
  // (importSnapshot يضبط skipNextAutoSync) حتى ما نرفع البيانات فورًا
  // للمصدر اللي جبناها منه أصلًا.
  const isFirstRender = useRef(true)
  const skipNextAutoSync = useRef(false)
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    if (skipNextAutoSync.current) {
      skipNextAutoSync.current = false
      return
    }
    scheduleBackgroundSync(() => ({
      accounts,
      people,
      loanTransactions,
      categories,
      incomeSources,
      transactions,
      subscriptions,
      commitments,
    }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accounts, people, loanTransactions, categories, incomeSources, transactions, subscriptions, commitments])

  const value = useMemo<DataContextValue>(() => {
    function personBalance(personId: string): number {
      return loanTransactions
        .filter((t) => t.personId === personId)
        .reduce((sum, t) => sum + (t.direction === 'given' ? t.amount : -t.amount), 0)
    }

    function personTransactions(personId: string): LoanTransaction[] {
      return loanTransactions
        .filter((t) => t.personId === personId)
        .sort((a, b) => (a.date < b.date ? 1 : -1))
    }

    const balances = people.map((p) => personBalance(p.id))
    const totalOwedToMe = balances.filter((b) => b > 0).reduce((s, b) => s + b, 0)
    const totalIOwe = balances.filter((b) => b < 0).reduce((s, b) => s + Math.abs(b), 0)

    function categorySpentThisMonth(categoryId: string): number {
      const now = new Date()
      const prefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
      return transactions
        .filter((t) => t.type === 'expense' && t.categoryId === categoryId && t.date.startsWith(prefix))
        .reduce((s, t) => s + t.amount, 0)
    }

    function monthTotals(): { income: number; expense: number } {
      const now = new Date()
      const prefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
      const monthTxns = transactions.filter((t) => t.date.startsWith(prefix))
      return {
        income: monthTxns.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0),
        expense: monthTxns.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0),
      }
    }

    function monthlyTrend(months = 6): { label: string; income: number; expense: number }[] {
      const now = new Date()
      const result: { label: string; income: number; expense: number }[] = []
      for (let i = months - 1; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const prefix = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        const monthTxns = transactions.filter((t) => t.date.startsWith(prefix))
        result.push({
          label: d.toLocaleDateString('ar-SA-u-ca-gregory', { month: 'short' }),
          income: monthTxns.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0),
          expense: monthTxns.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0),
        })
      }
      return result
    }

    /**
     * مؤشر الصحة المالية الشهري (0-100): 70% منه نسبة الادخار هذا الشهر
     * (دخل - مصروف / دخل)، و30% منه مدى خفّة عبء الاشتراكات الشهرية من الدخل.
     * لا معنى له بدون دخل مسجّل هذا الشهر فيرجع null.
     */
    function financialHealthScore(): number | null {
      const { income, expense } = monthTotals()
      if (income <= 0) return null
      const savingsRate = (income - expense) / income
      const subscriptionBurden = totalMonthlySubscriptions / income
      const clamp01 = (n: number) => Math.max(0, Math.min(1, n))
      const score = clamp01(savingsRate) * 70 + clamp01(1 - subscriptionBurden) * 30
      return Math.round(score)
    }

    function accountName(id: string): string {
      return accounts.find((a) => a.id === id)?.name ?? ''
    }
    function categoryName(id?: string): string {
      return categories.find((c) => c.id === id)?.name ?? 'بدون فئة'
    }
    function sourceName(id?: string): string {
      return incomeSources.find((s) => s.id === id)?.name ?? 'دخل'
    }
    function personName(id: string): string {
      return people.find((p) => p.id === id)?.name ?? '—'
    }

    function buildActivity(): ActivityItem[] {
      const fromTxns: ActivityItem[] = transactions.map((t) => {
        if (t.type === 'expense') {
          return {
            id: t.id,
            date: t.date,
            kind: 'expense',
            title: categoryName(t.categoryId),
            subtitle: accountName(t.accountId),
            amount: -t.amount,
            color: 'var(--color-expense)',
            accountIds: [t.accountId],
            note: t.note,
          }
        }
        if (t.type === 'income') {
          return {
            id: t.id,
            date: t.date,
            kind: 'income',
            title: sourceName(t.incomeSourceId),
            subtitle: accountName(t.accountId),
            amount: t.amount,
            color: 'var(--color-income)',
            accountIds: [t.accountId],
            note: t.note,
          }
        }
        return {
          id: t.id,
          date: t.date,
          kind: 'transfer',
          title: 'تحويل بين الحسابات',
          subtitle: `${accountName(t.accountId)} ← ${accountName(t.transferToAccountId ?? '')}`,
          amount: -t.amount,
          color: 'var(--color-transfer)',
          accountIds: [t.accountId, t.transferToAccountId].filter((x): x is string => Boolean(x)),
          note: t.note,
        }
      })

      const fromLoans: ActivityItem[] = loanTransactions.map((t) => ({
        id: t.id,
        date: t.date,
        kind: t.direction === 'given' ? 'loan-given' : 'loan-received',
        title: personName(t.personId),
        subtitle: t.direction === 'given' ? 'أعطيته' : 'استلمت منه',
        amount: t.direction === 'given' ? -t.amount : t.amount,
        color: t.direction === 'given' ? 'var(--color-owed-by)' : 'var(--color-owed-to)',
        accountIds: [t.accountId],
        personId: t.personId,
      }))

      return [...fromTxns, ...fromLoans].sort((a, b) => (a.date < b.date ? 1 : -1))
    }

    function recentActivity(limit = 5): ActivityItem[] {
      return buildActivity().slice(0, limit)
    }

    function accountActivity(accountId: string, limit = 3): ActivityItem[] {
      return buildActivity()
        .filter((item) => item.accountIds.includes(accountId))
        .map((item) => {
          // التحويل يبدو موجب (وارد) لو نعرضه تحت الحساب المستلِم، وسالب (صادر) تحت حساب المصدر
          if (item.kind === 'transfer' && item.accountIds[1] === accountId) {
            return { ...item, amount: Math.abs(item.amount) }
          }
          return item
        })
        .slice(0, limit)
    }

    const totalMonthlySubscriptions = subscriptions
      .filter((s) => s.status === 'active')
      .reduce((sum, s) => sum + (s.billingCycle === 'monthly' ? s.cost : s.cost / 12), 0)

    return {
      accounts,
      people,
      loanTransactions,
      categories,
      incomeSources,
      transactions,
      subscriptions,
      commitments,
      totalBalance: accounts.reduce((s, a) => s + a.balance, 0),
      // ادخار ومحفظة رقمية مو رصيد جاهز للصرف فورًا — تُستثنى من "الرصيد
      // المتاح" بالرئيسية (بخلاف totalBalance اللي يبقى مجموع كل الحسابات
      // فعليًا لشاشة الحسابات نفسها).
      availableBalance: accounts
        .filter((a) => a.type === 'cash' || a.type === 'bank')
        .reduce((s, a) => s + a.balance, 0),
      totalMonthlySubscriptions,
      totalOwedToMe,
      totalIOwe,
      personBalance,
      personTransactions,
      categorySpentThisMonth,
      recentActivity,
      accountActivity,
      monthTotals,
      monthlyTrend,
      financialHealthScore,
      addPerson(input: AddPersonInput) {
        const person: Person = {
          id: makeId(),
          name: input.name.trim(),
          phone: input.phone?.trim() || undefined,
          note: input.note?.trim() || undefined,
          createdAt: new Date().toISOString(),
        }
        persistPeople([person, ...people])
        return person
      },
      updatePerson(id: string, input: AddPersonInput) {
        persistPeople(
          people.map((p) =>
            p.id === id
              ? { ...p, name: input.name.trim(), phone: input.phone?.trim() || undefined, note: input.note?.trim() || undefined }
              : p,
          ),
        )
      },
      deletePerson(id: string) {
        // حذف الشخص يحذف سجل سلفه معه بالكامل — ويرجّع أثر كل حركة سلفة على رصيد حسابها المرتبط قبل الحذف.
        const theirLoans = loanTransactions.filter((t) => t.personId === id)
        let nextAccounts = accounts
        for (const t of theirLoans) nextAccounts = withLoanEffect(nextAccounts, t, -1)
        persistAccounts(nextAccounts)
        persistLoans(loanTransactions.filter((t) => t.personId !== id))
        persistPeople(people.filter((p) => p.id !== id))
      },
      addLoanTransaction(input: AddLoanInput) {
        const txn: LoanTransaction = {
          id: makeId(),
          personId: input.personId,
          direction: input.direction,
          amount: input.amount,
          accountId: input.accountId,
          date: input.date,
          dueDate: input.direction === 'given' ? input.dueDate : undefined,
          note: input.note?.trim() || undefined,
        }
        persistLoans([txn, ...loanTransactions])
        persistAccounts(withLoanEffect(accounts, txn, 1))
      },
      updateLoanTransaction(id: string, input: AddLoanInput) {
        const old = loanTransactions.find((t) => t.id === id)
        if (!old) return
        const updated: LoanTransaction = {
          ...old,
          direction: input.direction,
          amount: input.amount,
          accountId: input.accountId,
          date: input.date,
          dueDate: input.direction === 'given' ? input.dueDate : undefined,
          note: input.note?.trim() || undefined,
        }
        const reverted = withLoanEffect(accounts, old, -1)
        persistAccounts(withLoanEffect(reverted, updated, 1))
        persistLoans(loanTransactions.map((t) => (t.id === id ? updated : t)))
      },
      deleteLoanTransaction(id: string) {
        const txn = loanTransactions.find((t) => t.id === id)
        if (!txn) return
        persistAccounts(withLoanEffect(accounts, txn, -1))
        persistLoans(loanTransactions.filter((t) => t.id !== id))
      },
      addCategory(input: AddCategoryInput) {
        const category: Category = {
          id: makeId(),
          name: input.name.trim(),
          kind: input.kind,
          budgetLimit: input.budgetLimit,
        }
        persistCategories([...categories, category])
        return category
      },
      updateCategory(id: string, input: AddCategoryInput) {
        persistCategories(
          categories.map((c) => (c.id === id ? { ...c, name: input.name.trim(), kind: input.kind, budgetLimit: input.budgetLimit } : c)),
        )
      },
      deleteCategory(id: string) {
        persistCategories(categories.filter((c) => c.id !== id))
      },
      addIncomeSource(input: AddIncomeSourceInput) {
        const source: IncomeSource = { id: makeId(), name: input.name.trim() }
        persistIncomeSources([...incomeSources, source])
        return source
      },
      updateIncomeSource(id: string, input: AddIncomeSourceInput) {
        persistIncomeSources(incomeSources.map((s) => (s.id === id ? { ...s, name: input.name.trim() } : s)))
      },
      deleteIncomeSource(id: string) {
        persistIncomeSources(incomeSources.filter((s) => s.id !== id))
      },
      addTransaction(input: AddTransactionInput) {
        const txn: Transaction = {
          id: makeId(),
          type: input.type,
          amount: input.amount,
          date: input.date,
          accountId: input.accountId,
          categoryId: input.type === 'expense' ? input.categoryId : undefined,
          incomeSourceId: input.type === 'income' ? input.incomeSourceId : undefined,
          transferToAccountId: input.type === 'transfer' ? input.transferToAccountId : undefined,
          note: input.note?.trim() || undefined,
        }
        persistTransactions([txn, ...transactions])
        persistAccounts(withTransactionEffect(accounts, txn, 1))
      },
      updateTransaction(id: string, input: AddTransactionInput) {
        const old = transactions.find((t) => t.id === id)
        if (!old) return
        const updated: Transaction = {
          ...old,
          type: input.type,
          amount: input.amount,
          date: input.date,
          accountId: input.accountId,
          categoryId: input.type === 'expense' ? input.categoryId : undefined,
          incomeSourceId: input.type === 'income' ? input.incomeSourceId : undefined,
          transferToAccountId: input.type === 'transfer' ? input.transferToAccountId : undefined,
          note: input.note?.trim() || undefined,
        }
        const reverted = withTransactionEffect(accounts, old, -1)
        persistAccounts(withTransactionEffect(reverted, updated, 1))
        persistTransactions(transactions.map((t) => (t.id === id ? updated : t)))
      },
      deleteTransaction(id: string) {
        const txn = transactions.find((t) => t.id === id)
        if (!txn) return
        persistAccounts(withTransactionEffect(accounts, txn, -1))
        persistTransactions(transactions.filter((t) => t.id !== id))
      },
      addSubscription(input: AddSubscriptionInput) {
        const sub: Subscription = {
          id: makeId(),
          name: input.name.trim(),
          provider: input.provider?.trim() || undefined,
          cost: input.cost,
          billingCycle: input.billingCycle,
          nextRenewalDate: input.nextRenewalDate,
          accountId: input.accountId,
          status: 'active',
        }
        persistSubscriptions([sub, ...subscriptions])
        return sub
      },
      updateSubscription(id: string, input: AddSubscriptionInput) {
        persistSubscriptions(
          subscriptions.map((s) =>
            s.id === id
              ? {
                  ...s,
                  name: input.name.trim(),
                  provider: input.provider?.trim() || undefined,
                  cost: input.cost,
                  billingCycle: input.billingCycle,
                  nextRenewalDate: input.nextRenewalDate,
                  accountId: input.accountId,
                }
              : s,
          ),
        )
      },
      deleteSubscription(id: string) {
        persistSubscriptions(subscriptions.filter((s) => s.id !== id))
      },
      setSubscriptionStatus(id: string, status: SubscriptionStatus) {
        persistSubscriptions(subscriptions.map((s) => (s.id === id ? { ...s, status } : s)))
      },
      logSubscriptionPayment(id: string) {
        const sub = subscriptions.find((s) => s.id === id)
        if (!sub) return

        const txn: Transaction = {
          id: makeId(),
          type: 'expense',
          amount: sub.cost,
          date: new Date().toISOString().slice(0, 10),
          accountId: sub.accountId,
          categoryId: 'cat-subscriptions',
          note: sub.name,
        }
        persistTransactions([txn, ...transactions])
        persistAccounts(
          accounts.map((a) => (a.id === sub.accountId ? { ...a, balance: a.balance - sub.cost } : a)),
        )

        const next = new Date(sub.nextRenewalDate)
        if (sub.billingCycle === 'monthly') next.setMonth(next.getMonth() + 1)
        else next.setFullYear(next.getFullYear() + 1)
        persistSubscriptions(
          subscriptions.map((s) =>
            s.id === id ? { ...s, nextRenewalDate: next.toISOString().slice(0, 10) } : s,
          ),
        )
      },
      addCommitment(input: AddCommitmentInput) {
        const commitment: Commitment = {
          id: makeId(),
          name: input.name.trim(),
          note: input.note?.trim() || undefined,
          cost: input.cost && input.cost > 0 ? input.cost : undefined,
          accountId: input.cost && input.cost > 0 ? input.accountId : undefined,
          intervalUnit: input.intervalUnit,
          intervalCount: input.intervalCount,
          nextDueDate: input.nextDueDate,
          status: 'active',
        }
        persistCommitments([commitment, ...commitments])
        return commitment
      },
      updateCommitment(id: string, input: AddCommitmentInput) {
        persistCommitments(
          commitments.map((c) =>
            c.id === id
              ? {
                  ...c,
                  name: input.name.trim(),
                  note: input.note?.trim() || undefined,
                  cost: input.cost && input.cost > 0 ? input.cost : undefined,
                  accountId: input.cost && input.cost > 0 ? input.accountId : undefined,
                  intervalUnit: input.intervalUnit,
                  intervalCount: input.intervalCount,
                  nextDueDate: input.nextDueDate,
                }
              : c,
          ),
        )
      },
      deleteCommitment(id: string) {
        persistCommitments(commitments.filter((c) => c.id !== id))
      },
      setCommitmentStatus(id: string, status: CommitmentStatus) {
        persistCommitments(commitments.map((c) => (c.id === id ? { ...c, status } : c)))
      },
      logCommitmentRenewal(id: string) {
        const commitment = commitments.find((c) => c.id === id)
        if (!commitment) return

        if (commitment.cost && commitment.accountId) {
          const txn: Transaction = {
            id: makeId(),
            type: 'expense',
            amount: commitment.cost,
            date: new Date().toISOString().slice(0, 10),
            accountId: commitment.accountId,
            categoryId: 'cat-commitments',
            note: commitment.name,
          }
          persistTransactions([txn, ...transactions])
          persistAccounts(
            accounts.map((a) => (a.id === commitment.accountId ? { ...a, balance: a.balance - commitment.cost! } : a)),
          )
        }

        persistCommitments(
          commitments.map((c) =>
            c.id === id ? { ...c, nextDueDate: advanceByInterval(c.nextDueDate, c.intervalUnit, c.intervalCount) } : c,
          ),
        )
      },
      addAccount(input: AddAccountInput) {
        const account: Account = {
          id: makeId(),
          name: input.name.trim(),
          type: input.type,
          balance: input.balance,
          goalAmount: input.goalAmount,
          goalLabel: input.goalLabel,
        }
        persistAccounts([...accounts, account])
        return account
      },
      updateAccount(id: string, input: AddAccountInput) {
        persistAccounts(
          accounts.map((a) =>
            a.id === id
              ? { ...a, name: input.name.trim(), type: input.type, balance: input.balance, goalAmount: input.goalAmount, goalLabel: input.goalLabel }
              : a,
          ),
        )
      },
      deleteAccount(id: string) {
        persistAccounts(accounts.filter((a) => a.id !== id))
      },
      exportSnapshot(): DataSnapshot {
        return { accounts, people, loanTransactions, categories, incomeSources, transactions, subscriptions, commitments }
      },
      importSnapshot(snapshot: DataSnapshot) {
        skipNextAutoSync.current = true
        persistAccounts(snapshot.accounts ?? [])
        persistPeople(snapshot.people ?? [])
        persistLoans(snapshot.loanTransactions ?? [])
        persistCategories(snapshot.categories ?? [])
        persistIncomeSources(snapshot.incomeSources ?? [])
        persistTransactions(snapshot.transactions ?? [])
        persistSubscriptions(snapshot.subscriptions ?? [])
        persistCommitments(snapshot.commitments ?? [])
      },
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accounts, people, loanTransactions, categories, incomeSources, transactions, subscriptions, commitments])

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

export function useData(): DataContextValue {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('useData must be used within DataProvider')
  return ctx
}
