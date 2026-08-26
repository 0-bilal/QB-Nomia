import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import { loadJSON, saveJSON } from '../lib/storage'
import { makeId } from '../lib/id'
import type {
  Account,
  BillingCycle,
  Category,
  CategoryKind,
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

function seedAccounts(): Account[] {
  return [
    { id: 'acc-cash', name: 'الكاش', type: 'cash', balance: 1200 },
    { id: 'acc-bank', name: 'الحساب البنكي', type: 'bank', balance: 18650 },
    {
      id: 'acc-savings',
      name: 'الادخار',
      type: 'savings',
      balance: 5000,
      goalAmount: 10000,
      goalLabel: 'رحلة عمرة',
    },
    { id: 'acc-googleplay', name: 'محفظة Google Play', type: 'wallet', balance: 67 },
  ]
}

function seedPeople(): Person[] {
  return [{ id: 'p-ahmad', name: 'أحمد', phone: '', note: '', createdAt: new Date().toISOString() }]
}

function seedLoans(): LoanTransaction[] {
  const today = new Date()
  const daysAgo = (n: number) => new Date(today.getTime() - n * 86400000).toISOString().slice(0, 10)
  return [
    {
      id: 'loan-1',
      personId: 'p-ahmad',
      direction: 'given',
      amount: 500,
      accountId: 'acc-cash',
      date: daysAgo(6),
      dueDate: undefined,
      note: 'سلفة',
    },
    {
      id: 'loan-2',
      personId: 'p-ahmad',
      direction: 'received',
      amount: 200,
      accountId: 'acc-cash',
      date: daysAgo(2),
      note: 'سداد جزئي',
    },
  ]
}

function seedCategories(): Category[] {
  return [
    { id: 'cat-food', name: 'مطاعم', kind: 'expense' },
    { id: 'cat-transport', name: 'مواصلات', kind: 'expense' },
    { id: 'cat-bills', name: 'فواتير', kind: 'expense' },
    { id: 'cat-shopping', name: 'تسوق', kind: 'expense' },
    { id: 'cat-health', name: 'صحة', kind: 'expense' },
    { id: 'cat-fun', name: 'ترفيه', kind: 'expense' },
    { id: 'cat-subscriptions', name: 'اشتراكات', kind: 'expense' },
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
  const today = new Date()
  const daysAgo = (n: number) => new Date(today.getTime() - n * 86400000).toISOString().slice(0, 10)
  return [
    {
      id: 'txn-1',
      type: 'income',
      amount: 8500,
      date: daysAgo(1),
      accountId: 'acc-bank',
      incomeSourceId: 'src-salary',
      note: 'راتب شهري',
    },
    {
      id: 'txn-2',
      type: 'expense',
      amount: 45,
      date: daysAgo(0),
      accountId: 'acc-cash',
      categoryId: 'cat-food',
    },
    {
      id: 'txn-3',
      type: 'transfer',
      amount: 100,
      date: daysAgo(10),
      accountId: 'acc-bank',
      transferToAccountId: 'acc-googleplay',
      note: 'تعبئة رصيد Google Play',
    },
    {
      id: 'txn-4',
      type: 'expense',
      amount: 21,
      date: daysAgo(10),
      accountId: 'acc-googleplay',
      categoryId: 'cat-subscriptions',
      note: 'يوتيوب بريميوم',
    },
    {
      id: 'txn-5',
      type: 'expense',
      amount: 12,
      date: daysAgo(10),
      accountId: 'acc-googleplay',
      categoryId: 'cat-subscriptions',
      note: 'تخزين آيكلاود',
    },
  ]
}

function seedSubscriptions(): Subscription[] {
  const today = new Date()
  const inDays = (n: number) => new Date(today.getTime() + n * 86400000).toISOString().slice(0, 10)
  return [
    {
      id: 'sub-youtube',
      name: 'يوتيوب بريميوم',
      provider: 'Google Play',
      cost: 21,
      billingCycle: 'monthly',
      nextRenewalDate: inDays(20),
      accountId: 'acc-googleplay',
      status: 'active',
    },
    {
      id: 'sub-icloud',
      name: 'تخزين آيكلاود',
      provider: 'Apple',
      cost: 12,
      billingCycle: 'monthly',
      nextRenewalDate: inDays(4),
      accountId: 'acc-googleplay',
      status: 'active',
    },
  ]
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
}

interface DataContextValue {
  accounts: Account[]
  people: Person[]
  loanTransactions: LoanTransaction[]
  categories: Category[]
  incomeSources: IncomeSource[]
  transactions: Transaction[]
  subscriptions: Subscription[]
  totalBalance: number
  totalMonthlySubscriptions: number
  addSubscription: (input: AddSubscriptionInput) => Subscription
  setSubscriptionStatus: (id: string, status: SubscriptionStatus) => void
  logSubscriptionPayment: (id: string) => void
  addAccount: (input: AddAccountInput) => Account
  addPerson: (input: AddPersonInput) => Person
  addLoanTransaction: (input: AddLoanInput) => void
  personBalance: (personId: string) => number
  personTransactions: (personId: string) => LoanTransaction[]
  totalOwedToMe: number
  totalIOwe: number
  addCategory: (input: AddCategoryInput) => Category
  addIncomeSource: (input: AddIncomeSourceInput) => IncomeSource
  addTransaction: (input: AddTransactionInput) => void
  categorySpentThisMonth: (categoryId: string) => number
  recentActivity: (limit?: number) => ActivityItem[]
  accountActivity: (accountId: string, limit?: number) => ActivityItem[]
  monthTotals: () => { income: number; expense: number }
  resetToBlank: () => void
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
}

const DataContext = createContext<DataContextValue | null>(null)

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
      totalBalance: accounts.reduce((s, a) => s + a.balance, 0),
      totalMonthlySubscriptions,
      totalOwedToMe,
      totalIOwe,
      personBalance,
      personTransactions,
      categorySpentThisMonth,
      recentActivity,
      accountActivity,
      monthTotals,
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

        const delta = input.direction === 'given' ? -input.amount : input.amount
        persistAccounts(
          accounts.map((a) => (a.id === input.accountId ? { ...a, balance: a.balance + delta } : a)),
        )
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
      addIncomeSource(input: AddIncomeSourceInput) {
        const source: IncomeSource = { id: makeId(), name: input.name.trim() }
        persistIncomeSources([...incomeSources, source])
        return source
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

        let nextAccounts = accounts
        if (input.type === 'expense') {
          nextAccounts = accounts.map((a) =>
            a.id === input.accountId ? { ...a, balance: a.balance - input.amount } : a,
          )
        } else if (input.type === 'income') {
          nextAccounts = accounts.map((a) =>
            a.id === input.accountId ? { ...a, balance: a.balance + input.amount } : a,
          )
        } else if (input.type === 'transfer' && input.transferToAccountId) {
          nextAccounts = accounts.map((a) => {
            if (a.id === input.accountId) return { ...a, balance: a.balance - input.amount }
            if (a.id === input.transferToAccountId) return { ...a, balance: a.balance + input.amount }
            return a
          })
        }
        persistAccounts(nextAccounts)
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
      resetToBlank() {
        persistAccounts(accounts.map((a) => ({ ...a, balance: 0 })))
        persistPeople([])
        persistLoans([])
        persistTransactions([])
        persistSubscriptions([])
      },
      exportSnapshot(): DataSnapshot {
        return { accounts, people, loanTransactions, categories, incomeSources, transactions, subscriptions }
      },
      importSnapshot(snapshot: DataSnapshot) {
        persistAccounts(snapshot.accounts ?? [])
        persistPeople(snapshot.people ?? [])
        persistLoans(snapshot.loanTransactions ?? [])
        persistCategories(snapshot.categories ?? [])
        persistIncomeSources(snapshot.incomeSources ?? [])
        persistTransactions(snapshot.transactions ?? [])
        persistSubscriptions(snapshot.subscriptions ?? [])
      },
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accounts, people, loanTransactions, categories, incomeSources, transactions, subscriptions])

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

export function useData(): DataContextValue {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('useData must be used within DataProvider')
  return ctx
}
