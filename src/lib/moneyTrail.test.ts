import { describe, expect, it } from 'vitest'
import { batchParts, borrowedInAccount, computeMoneyTrail, groupBatchesByMonth, loanRef, openingBatchId, previewTake, reviewItems, txRef, type MoneyTrailInput } from './moneyTrail'
import type { LoanTransaction, Reconciliation, Transaction } from '../types'

let seq = 0
const tx = (p: Partial<Transaction> & Pick<Transaction, 'type' | 'amount' | 'date' | 'accountId'>): Transaction => ({ id: `t${++seq}`, ...p })
const loan = (p: Partial<LoanTransaction> & Pick<LoanTransaction, 'direction' | 'amount' | 'date' | 'accountId' | 'personId'>): LoanTransaction => ({ id: `l${++seq}`, ...p })

/** يبني المدخلات بترتيب زمني طبيعي (الأقدم أولًا) ويقلبها مثل التخزين الفعلي (الأحدث أولًا). الرصيد الحالي يُحسب من الحركات + رصيد افتتاحي. */
function input(opening: Record<string, number>, txs: Transaction[], loans: LoanTransaction[] = [], recs: Reconciliation[] = []): MoneyTrailInput {
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
  for (const r of recs) if (r.resolution === 'adjust') add(r.accountId, r.difference)
  return {
    accounts: Object.entries(bal).map(([id, balance]) => ({ id, balance })),
    transactions: [...txs].reverse(),
    loanTransactions: [...loans].reverse(),
    reconciliations: [...recs].reverse(),
  }
}

describe('computeMoneyTrail', () => {
  it('يتتبع راتبًا: مصروف، تحويل، سلفة ترجع لنفس الدفعة', () => {
    const salary = tx({ type: 'income', amount: 3000, date: '2026-08-01', accountId: 'bank', incomeSourceId: 'src-salary' })
    const lend = loan({ direction: 'given', amount: 500, date: '2026-08-03', accountId: 'bank', personId: 'ahmad' })
    const save = tx({ type: 'transfer', amount: 1300, date: '2026-08-05', accountId: 'bank', transferToAccountId: 'savings' })
    const groceries = tx({ type: 'expense', amount: 1200, date: '2026-08-20', accountId: 'bank', categoryId: 'food' })
    const sepSalary = tx({ type: 'income', amount: 3000, date: '2026-09-01', accountId: 'bank' })
    const back = loan({ direction: 'received', amount: 300, date: '2026-10-08', accountId: 'bank', personId: 'ahmad' })
    const dinner = tx({ type: 'expense', amount: 450, date: '2026-10-10', accountId: 'bank', categoryId: 'food' })

    const trail = computeMoneyTrail(input({}, [salary, save, groceries, sepSalary, dinner], [lend, back]))
    const aug = trail.byId.get(txRef(salary.id))!
    expect(aug.kind).toBe('income')
    expect(aug.amount).toBe(3000)
    expect(aug.lent).toBe(200)
    expect(aug.lentByPerson).toEqual({ ahmad: 200 })
    expect(aug.returned).toBe(300)
    // 1200 + أول 300 من مصروف أكتوبر (اللي رجعت من أحمد هي أقدم فلوس بالبنك).
    expect(aug.spent).toBe(1500)
    expect(aug.left).toBe(1300)
    expect(aug.leftByAccount).toEqual({ savings: 1300 })
    expect(aug.open).toBe(true)

    // المصروف الواحد انقسم على دفعتين.
    expect(trail.allocations.get(txRef(dinner.id))).toEqual([
      { batchId: txRef(salary.id), amount: 300 },
      { batchId: txRef(sepSalary.id), amount: 150 },
    ])
    expect(trail.byId.get(txRef(sepSalary.id))!.left).toBe(2850)
    expect(trail.issues).toEqual([])
    // ولا شيء بلا مصدر، ولا رصيد سابق.
    expect(trail.byId.has(openingBatchId('bank'))).toBe(false)
  })

  it('سلفة من سلفة: مثبّتة على الدفعة المقترضة، والسداد يغلق الحلقة', () => {
    const khalid = loan({ direction: 'received', amount: 1000, date: '2026-10-05', accountId: 'cash', personId: 'khalid' })
    const toFahad = loan({ direction: 'given', amount: 1000, date: '2026-10-05', accountId: 'cash', personId: 'fahad', fundBatchId: '' })
    const fahadBack = loan({ direction: 'received', amount: 600, date: '2026-10-12', accountId: 'cash', personId: 'fahad' })
    const payKhalid = loan({ direction: 'given', amount: 600, date: '2026-10-12', accountId: 'cash', personId: 'khalid' })
    toFahad.fundBatchId = loanRef(khalid.id)

    // في الكاش 340 رصيد سابق — بدون التثبيت كانت السلفة بتاخذ منه أولًا.
    const trail = computeMoneyTrail(input({ cash: 340 }, [], [khalid, toFahad, fahadBack, payKhalid]))
    const b = trail.byId.get(loanRef(khalid.id))!
    expect(b.kind).toBe('borrowed')
    expect(b.personId).toBe('khalid')
    expect(b.owed).toBe(1000)
    expect(b.owedPaid).toBe(600)
    expect(b.lentByPerson).toEqual({ fahad: 400 })
    expect(b.returned).toBe(600)
    // سداد خالد أخذ بالأقدم أولًا: 340 رصيد سابق ثم 260 من سلفة خالد.
    expect(trail.allocations.get(loanRef(payKhalid.id))).toEqual([
      { batchId: openingBatchId('cash'), amount: 340 },
      { batchId: loanRef(khalid.id), amount: 260 },
    ])
    expect(b.repaid).toBe(260)
    expect(b.left).toBe(340)
    expect(b.open).toBe(true)
    expect(trail.byId.get(openingBatchId('cash'))!.repaidByPerson).toEqual({ khalid: 340 })
  })

  it('بدون تثبيت: السلفة المعطاة تاخذ بالأقدم أولًا', () => {
    const khalid = loan({ direction: 'received', amount: 1000, date: '2026-10-05', accountId: 'cash', personId: 'khalid' })
    const toFahad = loan({ direction: 'given', amount: 1000, date: '2026-10-05', accountId: 'cash', personId: 'fahad' })
    const trail = computeMoneyTrail(input({ cash: 340 }, [], [khalid, toFahad]))
    expect(trail.allocations.get(loanRef(toFahad.id))).toEqual([
      { batchId: openingBatchId('cash'), amount: 340 },
      { batchId: loanRef(khalid.id), amount: 660 },
    ])
    expect(borrowedInAccount(trail, 'cash').map((x) => x.available)).toEqual([340])
  })

  it('الاستلام من شخص لك عنده يُعتبر سدادًا، والزائد يصير دفعة مقترضة', () => {
    const salary = tx({ type: 'income', amount: 1000, date: '2026-01-01', accountId: 'cash' })
    const lend = loan({ direction: 'given', amount: 200, date: '2026-01-02', accountId: 'cash', personId: 'p' })
    const back = loan({ direction: 'received', amount: 250, date: '2026-01-10', accountId: 'cash', personId: 'p' })
    const trail = computeMoneyTrail(input({}, [salary], [lend, back]))
    const s = trail.byId.get(txRef(salary.id))!
    expect(s.returned).toBe(200)
    expect(s.lent).toBe(0)
    expect(s.left).toBe(1000)
    const extra = trail.byId.get(loanRef(back.id))!
    expect(extra.kind).toBe('borrowed')
    expect(extra.amount).toBe(50)
    expect(extra.owed).toBe(50)
    expect(extra.returnedPart).toBe(200)
    expect(reviewItems(trail).map((b) => b.id)).toEqual([loanRef(back.id)])
  })

  it('previewTake: المثبّتة أولًا ثم الأقدم أولًا، والزائد بلا مصدر', () => {
    const khalid = loan({ direction: 'received', amount: 1000, date: '2026-10-05', accountId: 'cash', personId: 'khalid' })
    const trail = computeMoneyTrail(input({ cash: 340 }, [], [khalid]))
    expect(previewTake(trail, 'cash', 1000)).toEqual([
      { batchId: openingBatchId('cash'), amount: 340 },
      { batchId: loanRef(khalid.id), amount: 660 },
    ])
    expect(previewTake(trail, 'cash', 1000, loanRef(khalid.id))).toEqual([{ batchId: loanRef(khalid.id), amount: 1000 }])
    expect(previewTake(trail, 'cash', 1500)).toEqual([
      { batchId: openingBatchId('cash'), amount: 340 },
      { batchId: loanRef(khalid.id), amount: 1000 },
      { batchId: null, amount: 160 },
    ])
  })

  it('رصيد سابق يُحسب من الرصيد الحالي ويُصرف أولًا', () => {
    const salary = tx({ type: 'income', amount: 500, date: '2026-02-01', accountId: 'cash' })
    const spend = tx({ type: 'expense', amount: 300, date: '2026-02-03', accountId: 'cash' })
    const trail = computeMoneyTrail(input({ cash: 200 }, [salary, spend]))
    const opening = trail.byId.get(openingBatchId('cash'))!
    expect(opening.kind).toBe('opening')
    expect(opening.amount).toBe(200)
    expect(opening.spent).toBe(200)
    expect(opening.open).toBe(false)
    expect(trail.byId.get(txRef(salary.id))!.left).toBe(400)
  })

  it('الداخل قبل الخارج في نفس اليوم، والنقص الفعلي دفعة «مصدر غير معروف»', () => {
    const spend = tx({ type: 'expense', amount: 120, date: '2026-03-14', accountId: 'cash' })
    const income = tx({ type: 'income', amount: 100, date: '2026-03-14', accountId: 'cash' })
    // المصروف مخزَّن قبل الدخل، لكن الدخل يُعالج أولًا.
    const trail = computeMoneyTrail({
      accounts: [{ id: 'cash', balance: -20 }],
      transactions: [income, spend],
      loanTransactions: [],
      reconciliations: [],
    })
    expect(trail.allocations.get(txRef(spend.id))).toEqual([
      { batchId: txRef(income.id), amount: 100 },
      { batchId: `unknown:${txRef(spend.id)}`, amount: 20 },
    ])
    expect(trail.issues.map((b) => b.amount)).toEqual([20])
    expect(trail.issues[0].open).toBe(false)
  })

  it('التسوية: الزيادة دفعة، والنقص يخرج بالأقدم أولًا', () => {
    const salary = tx({ type: 'income', amount: 100, date: '2026-04-01', accountId: 'cash' })
    const plus: Reconciliation = { id: 'r1', accountId: 'cash', date: '2026-04-02', appBalance: 100, actualBalance: 110, difference: 10, resolution: 'adjust' }
    const minus: Reconciliation = { id: 'r2', accountId: 'cash', date: '2026-04-03', appBalance: 110, actualBalance: 80, difference: -30, resolution: 'adjust' }
    const trail = computeMoneyTrail(input({}, [salary], [], [plus, minus]))
    expect(trail.byId.get('rec:r1')!.kind).toBe('adjustment')
    expect(trail.byId.get(txRef(salary.id))!.adjusted).toBe(30)
    expect(trail.byId.get(txRef(salary.id))!.left).toBe(70)
  })

  it('مصروف بسلفة من شخص (بدون حساب) يُصرف من دفعة السلفة نفسها', () => {
    const l = loan({ direction: 'received', amount: 120, date: '2026-10-10', accountId: '', personId: 'saad' })
    const e = tx({ type: 'expense', amount: 120, date: '2026-10-10', accountId: '', loanId: l.id, categoryId: 'fuel' })
    const trail = computeMoneyTrail(input({}, [e], [l]))
    const b = trail.byId.get(loanRef(l.id))!
    expect(b.spent).toBe(120)
    expect(b.spentByCategory).toEqual({ fuel: 120 })
    expect(b.open).toBe(true) // الالتزام لسعد باقي
    expect(trail.issues).toEqual([])
  })

  it('العجز يسدّه أول فلوس تدخل الحساب، فيبقى الباقي = الرصيد', () => {
    const early = tx({ type: 'expense', amount: 50, date: '2026-07-01', accountId: 'sav' })
    const salary = tx({ type: 'income', amount: 3000, date: '2026-08-01', accountId: 'bank' })
    const save = tx({ type: 'transfer', amount: 1300, date: '2026-08-05', accountId: 'bank', transferToAccountId: 'sav' })
    const inp = input({}, [early, salary, save])
    expect(inp.accounts.find((a) => a.id === 'sav')!.balance).toBe(1250)
    const trail = computeMoneyTrail(inp)
    const u = trail.byId.get(`unknown:${txRef(early.id)}`)!
    expect(u.amount).toBe(50)
    expect(u.coveredLater).toBe(50)
    const s = trail.byId.get(txRef(salary.id))!
    expect(s.covered).toBe(50)
    expect(s.leftByAccount).toEqual({ bank: 1700, sav: 1250 })
    expect(trail.issues.length).toBe(1)
  })

  it('حساب محذوف له حركات لا يولّد «مصدر غير معروف» وهمي', () => {
    const income = tx({ type: 'income', amount: 50, date: '2026-05-02', accountId: 'gone' })
    const spend = tx({ type: 'expense', amount: 80, date: '2026-05-03', accountId: 'gone' })
    const trail = computeMoneyTrail({ accounts: [], transactions: [spend, income], loanTransactions: [], reconciliations: [] })
    expect(trail.issues).toEqual([])
    expect(trail.byId.get(openingBatchId('gone'))!.amount).toBe(30)
  })

  it('مجموع الباقي بكل حساب = رصيده، ومجموع أجزاء كل دفعة = مبلغها', () => {
    const t = [
      tx({ type: 'income', amount: 1000.5, date: '2026-01-01', accountId: 'a' }),
      tx({ type: 'transfer', amount: 300.25, date: '2026-01-02', accountId: 'a', transferToAccountId: 'b' }),
      tx({ type: 'expense', amount: 99.99, date: '2026-01-03', accountId: 'b' }),
      tx({ type: 'income', amount: 10.1, date: '2026-01-04', accountId: 'b' }),
      tx({ type: 'expense', amount: 0.3, date: '2026-01-05', accountId: 'a' }),
    ]
    const l = [loan({ direction: 'given', amount: 50, date: '2026-01-06', accountId: 'b', personId: 'x' })]
    const inp = input({ a: 12.34 }, t, l)
    const trail = computeMoneyTrail(inp)
    for (const acc of inp.accounts) {
      const held = (trail.holdings[acc.id] ?? []).reduce((s, h) => s + h.amount, 0)
      expect(Math.round(held * 100)).toBe(Math.round(acc.balance * 100))
    }
    for (const b of trail.batches) {
      const parts = batchParts(b).reduce((s, p) => s + p.amount, 0)
      expect(Math.round(parts * 100)).toBe(Math.round(b.amount * 100))
    }
  })
})

describe('groupBatchesByMonth', () => {
  it('الأحدث أولًا، و«رصيد سابق» آخر مجموعة', () => {
    const trail = computeMoneyTrail(
      input({ cash: 10 }, [
        tx({ type: 'income', amount: 1, date: '2026-08-01', accountId: 'cash' }),
        tx({ type: 'income', amount: 2, date: '2026-09-03', accountId: 'cash' }),
        tx({ type: 'income', amount: 3, date: '2026-09-10', accountId: 'cash' }),
      ]),
    )
    const groups = groupBatchesByMonth(trail.batches)
    expect(groups.map((g) => g.key)).toEqual(['2026-09', '2026-08', ''])
    expect(groups[0].batches.map((b) => b.amount)).toEqual([3, 2])
  })
})
