import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import { loadJSON, saveJSON } from '../lib/storage'
import { makeId } from '../lib/id'
import type { Account, LoanDirection, LoanTransaction, Person } from '../types'

const ACCOUNTS_KEY = 'qbnomia.accounts'
const PEOPLE_KEY = 'qbnomia.people'
const LOANS_KEY = 'qbnomia.loanTransactions'

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

interface DataContextValue {
  accounts: Account[]
  people: Person[]
  loanTransactions: LoanTransaction[]
  totalBalance: number
  addPerson: (input: AddPersonInput) => Person
  addLoanTransaction: (input: AddLoanInput) => void
  personBalance: (personId: string) => number
  personTransactions: (personId: string) => LoanTransaction[]
  totalOwedToMe: number
  totalIOwe: number
}

const DataContext = createContext<DataContextValue | null>(null)

export function DataProvider({ children }: { children: ReactNode }) {
  const [accounts, setAccounts] = useState<Account[]>(() => loadJSON(ACCOUNTS_KEY, seedAccounts()))
  const [people, setPeople] = useState<Person[]>(() => loadJSON(PEOPLE_KEY, seedPeople()))
  const [loanTransactions, setLoanTransactions] = useState<LoanTransaction[]>(() =>
    loadJSON(LOANS_KEY, seedLoans()),
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

    return {
      accounts,
      people,
      loanTransactions,
      totalBalance: accounts.reduce((s, a) => s + a.balance, 0),
      totalOwedToMe,
      totalIOwe,
      personBalance,
      personTransactions,
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
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accounts, people, loanTransactions])

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

export function useData(): DataContextValue {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('useData must be used within DataProvider')
  return ctx
}
