import { describe, expect, it } from 'vitest'
import { ledgerMonths, monthLedger, type LedgerInput } from './monthLedger'
import type { Account, LoanTransaction, Transaction } from '../types'

let seq = 0
const tx = (p: Partial<Transaction> & Pick<Transaction, 'type' | 'amount' | 'date' | 'accountId'>): Transaction => ({ id: `t${++seq}`, ...p })
const loan = (direction: LoanTransaction['direction'], amount: number, date: string, accountId: string, personId: string): LoanTransaction => ({ id: `l${++seq}`, direction, amount, date, accountId, personId })

/** الأرصدة الحالية = افتتاحي + أثر الحركات، والتخزين الأحدث أولًا. */
function build(opening: Record<string, number>, types: Record<string, Account['type']>, txs: Transaction[], loans: LoanTransaction[] = []): LedgerInput {
  const bal: Record<string, number> = { ...opening }
  const add = (a: string, v: number) => {
    if (a) bal[a] = (bal[a] ?? 0) + v
  }
  for (const t of txs) {
    if (t.type === 'income') add(t.accountId, t.amount)
    else if (t.type === 'expense') add(t.accountId, -t.amount)
    else {
      add(t.accountId, -t.amount)
      add(t.transferToAccountId!, t.amount)
    }
  }
  for (const l of loans) add(l.accountId, l.direction === 'given' ? -l.amount : l.amount)
  return {
    accounts: Object.keys(types).map((id) => ({ id, type: types[id], balance: bal[id] ?? 0 })),
    transactions: [...txs].reverse(),
    loanTransactions: [...loans].reverse(),
    reconciliations: [],
  }
}

const TYPES: Record<string, Account['type']> = { cash: 'cash', card: 'fuel', sav: 'savings', emg: 'emergency' }

describe('monthLedger', () => {
  it('اللي دخل = وين راح، والباقي يترحّل للشهر الجاي', () => {
    const txs = [
      tx({ type: 'income', amount: 4000, date: '2026-09-03', accountId: 'cash', incomeSourceId: 'salary' }),
      tx({ type: 'income', amount: 200, date: '2026-09-06', accountId: 'cash', incomeSourceId: 'free' }),
      tx({ type: 'transfer', amount: 2500, date: '2026-09-03', accountId: 'cash', transferToAccountId: 'sav' }),
      tx({ type: 'transfer', amount: 500, date: '2026-09-03', accountId: 'cash', transferToAccountId: 'emg' }),
      tx({ type: 'transfer', amount: 482, date: '2026-09-30', accountId: 'cash', transferToAccountId: 'card' }),
      tx({ type: 'expense', amount: 300, date: '2026-09-10', accountId: 'card', categoryId: 'fuel' }),
      tx({ type: 'expense', amount: 900, date: '2026-09-12', accountId: 'cash', categoryId: 'food' }),
      tx({ type: 'expense', amount: 500, date: '2026-09-20', accountId: 'sav', categoryId: 'clothes' }),
      tx({ type: 'income', amount: 3700, date: '2026-10-01', accountId: 'cash', incomeSourceId: 'salary' }),
    ]
    const loans = [loan('received', 740, '2026-09-15', 'cash', 'noor'), loan('given', 200, '2026-09-16', 'cash', 'shaker')]
    const input = build({ cash: 450, sav: 1500 }, TYPES, txs, loans)
    const sep = monthLedger(input, '2026-09')
    expect(sep.carried).toBe(450)
    expect(sep.incomeTotal).toBe(4200)
    expect(sep.income).toEqual([
      { sourceId: 'salary', amount: 4000, count: 1 },
      { sourceId: 'free', amount: 200, count: 1 },
    ])
    expect(sep.fromPeople).toEqual([{ personId: 'noor', amount: 740 }])
    expect(sep.withPeople).toEqual([{ personId: 'shaker', amount: 200 }])
    // التحويل كاش ← بطاقة الوقود ما يظهر، ومصروف البطاقة ينحسب صرف.
    expect(sep.spent).toBe(1200)
    expect(sep.saved).toBe(3000)
    expect(sep.left).toBe(450 + 4200 + 740 - 200 - 3000 - 1200)
    expect(sep.inTotal).toBe(sep.outTotal)
    expect(sep.savings).toMatchObject({ start: 1500, added: 3000, spent: [{ categoryId: 'clothes', amount: 500 }], end: 4000 })
    expect(sep.steps.some((s) => s.kind === 'savings-expense')).toBe(true)
    expect(sep.steps.some((s) => s.toAccountId === 'card')).toBe(false)

    const oct = monthLedger(input, '2026-10')
    expect(oct.carried).toBe(sep.left)
    expect(oct.inTotal).toBe(oct.outTotal)
  })

  it('السحب من المدخرات يدخل الشهر، والسلفة من المدخرات في بطاقتها', () => {
    const txs = [
      tx({ type: 'income', amount: 1000, date: '2026-10-01', accountId: 'cash' }),
      tx({ type: 'transfer', amount: 2000, date: '2026-10-02', accountId: 'sav', transferToAccountId: 'cash' }),
      tx({ type: 'transfer', amount: 300, date: '2026-10-03', accountId: 'cash', transferToAccountId: 'emg' }),
      tx({ type: 'expense', amount: 2500, date: '2026-10-05', accountId: 'cash' }),
      tx({ type: 'transfer', amount: 100, date: '2026-10-06', accountId: 'sav', transferToAccountId: 'emg' }),
    ]
    const loans = [loan('given', 1900, '2026-10-02', 'sav', 'noor')]
    const l = monthLedger(build({ sav: 5000 }, TYPES, txs, loans), '2026-10')
    expect(l.withdrawn).toBe(1700)
    expect(l.saved).toBe(0)
    expect(l.left).toBe(1000 + 1700 - 2500)
    expect(l.inTotal).toBe(l.outTotal)
    expect(l.savings).toMatchObject({ start: 5000, added: 300, withdrawn: 2000, lent: [{ personId: 'noor', amount: 1900 }], end: 1400 })
  })

  it('صافي السلف لكل شخص: السداد على دفعات يطلع رقم واحد', () => {
    const loans = [loan('given', 70, '2026-10-06', 'cash', 'noor'), loan('received', 100, '2026-10-10', 'cash', 'noor'), loan('received', 5, '2026-10-13', 'cash', 'noor'), loan('received', 100, '2026-10-14', 'cash', 'noor')]
    const l = monthLedger(build({ cash: 50 }, TYPES, [], loans), '2026-10')
    expect(l.fromPeople).toEqual([{ personId: 'noor', amount: 135 }])
    expect(l.withPeople).toEqual([])
    expect(l.left).toBe(185)
  })

  it('الكسور بالهللة والطرفان متساويان', () => {
    const txs = [tx({ type: 'income', amount: 100.1, date: '2026-10-01', accountId: 'cash' }), tx({ type: 'expense', amount: 0.3, date: '2026-10-02', accountId: 'cash' })]
    const l = monthLedger(build({ cash: 0.25 }, TYPES, txs), '2026-10')
    expect(l.carried).toBe(0.25)
    expect(l.left).toBe(100.05)
    expect(l.inTotal).toBe(l.outTotal)
  })
})

describe('ledgerMonths', () => {
  it('من أقدم حركة لين الشهر الحالي، الأحدث أولًا', () => {
    const input = build({}, TYPES, [tx({ type: 'income', amount: 1, date: '2026-07-05', accountId: 'cash' })])
    expect(ledgerMonths(input, '2026-10-16')).toEqual(['2026-10', '2026-09', '2026-08', '2026-07'])
    expect(ledgerMonths(build({}, TYPES, []), '2026-10-16')).toEqual(['2026-10'])
  })
})
