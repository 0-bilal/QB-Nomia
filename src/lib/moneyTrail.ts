import type { Account, LoanTransaction, Reconciliation, Transaction } from '../types'

/**
 * مسار الفلوس (شجرة المصاريف): كل مبلغ يدخل يصير «دفعة» لها هوية، وكل ريال يخرج يُنسب لدفعة.
 *
 * التوزيع لا يُخزَّن — يُحسب من السجل كاملًا كل مرة (لذلك يشتغل على بيانات المستخدمين القدامى
 * بدون ترحيل، وأي تعديل أو حذف يعيد الحساب تلقائيًا). القواعد:
 *  - كل حساب طابور دفعات، والخروج يأخذ من الأقدم أولًا (بتاريخ الدفعة الأصلي).
 *  - التحويل ينقل الفلوس لحساب آخر بنفس هويتها.
 *  - السلفة المعطاة تبقى معلّقة على دفعتها، وما يرجع منها يرجع لنفس الدفعة (أقدم سلفة مفتوحة أولًا).
 *  - الفلوس المستلمة من شخص: تُسدّد ما لك عنده أولًا، والزائد دفعة «مقترضة» عليك التزامها.
 *  - المُعطى لشخص لك عليه التزام: يُسدّد الالتزام أولًا، والزائد سلفة جديدة.
 *  - الرصيد قبل أول حركة = الرصيد الحالي − أثر كل الحركات ← دفعة «رصيد سابق» لكل حساب.
 *  - خروج أكبر من المتوفر بالحساب ← دفعة «مصدر غير معروف» بالفرق (تظهر في «تحتاج نظرة»)، والحساب يبقى
 *    عليه «عجز»: أول فلوس تدخله بعدها تسدّ العجز قبل أي شيء (فيبقى الباقي بكل حساب = رصيده).
 *  - `fundBatchId` على الحركة يثبّت دفعة معيّنة لها (ما يتوفر منها بالحساب، والباقي بالأقدم أولًا).
 *
 * الحساب الداخلي بالهللة (أعداد صحيحة) عشان ما تتراكم كسور.
 */

export type BatchKind = 'income' | 'borrowed' | 'opening' | 'adjustment' | 'unknown'

export type MovementType = 'tx' | 'loan' | 'rec'

export type TrailEventKind =
  /** دخول الدفعة نفسها. */
  | 'in'
  | 'spent'
  | 'lent'
  /** رجع من شخص لنفس الدفعة. */
  | 'returned'
  /** خرج من الدفعة لسداد التزام عليك لشخص. */
  | 'repaid'
  /** سداد التزام هذه الدفعة المقترضة (من أي دفعة). */
  | 'obligation-paid'
  | 'moved'
  | 'adjust'
  /** فلوس هذه الدفعة سدّت عجزًا سابقًا في الحساب (batchId = دفعة «مصدر غير معروف»). */
  | 'cover'
  /** «مصدر غير معروف»: انسدّ عجزها لاحقًا من دفعة (batchId). */
  | 'covered'

export interface TrailEvent {
  kind: TrailEventKind
  /** مفتاح الحركة المسبّبة: `tx:<id>` أو `loan:<id>` أو `rec:<id>` أو `open:<accountId>`. */
  ref: string
  date: string
  amount: number
  accountId?: string
  toAccountId?: string
  personId?: string
  categoryId?: string
  /** الدفعة الطرف الثاني (لسدّ العجز). */
  batchId?: string
}

export interface MoneyBatch {
  id: string
  kind: BatchKind
  /** ترتيب الدفعة بالطابور (الأقدم أصغر). */
  order: number
  /** تاريخ الدخول — فارغ لـ«رصيد سابق». */
  date: string
  accountId: string
  amount: number
  incomeSourceId?: string
  personId?: string
  note?: string
  /** الحركة اللي أنشأت الدفعة (لـ«مصدر غير معروف»: الحركة اللي ما لقت فلوس كفاية). */
  ref: string
  spent: number
  spentByCategory: Record<string, number>
  /** خرج كفرق مطابقة (نقص). */
  adjusted: number
  /** سدّ عجزًا سابقًا في حساب (خروج ما كان له فلوس وقتها). */
  covered: number
  /** «مصدر غير معروف» فقط: كم انسدّ من عجزها لاحقًا. */
  coveredLater: number
  /** خرج لسداد التزامات عليك. */
  repaid: number
  repaidByPerson: Record<string, number>
  /** عند الناس الآن. */
  lent: number
  lentByPerson: Record<string, number>
  /** مجموع ما رجع من الناس. */
  returned: number
  /** باقي لك الآن. */
  left: number
  leftByAccount: Record<string, number>
  /** المقترضة فقط: لو الاستلام كان أكبر مما لك عند الشخص — الجزء اللي كان سدادًا (الباقي صار هذه الدفعة). */
  returnedPart?: number
  /** المقترضة فقط: أصل الالتزام وما سُدّد منه. */
  owed: number
  owedPaid: number
  events: TrailEvent[]
  /** مفتوحة: فيها باقي، أو عند أحد منها شيء، أو التزامها ما خلص. */
  open: boolean
}

export interface Allocation {
  batchId: string
  amount: number
}

export interface MoneyTrail {
  /** الأقدم أولًا. */
  batches: MoneyBatch[]
  byId: Map<string, MoneyBatch>
  /** توزيع كل حركة خروج على الدفعات — المفتاح `tx:<id>` أو `loan:<id>` أو `rec:<id>`. */
  allocations: Map<string, Allocation[]>
  /** ما في كل حساب الآن، بترتيب الأقدم أولًا. */
  holdings: Record<string, Allocation[]>
  /** دفعات «مصدر غير معروف» — حركات ما لقت فلوس كفاية وقتها. */
  issues: MoneyBatch[]
}

export interface MoneyTrailInput {
  accounts: Pick<Account, 'id' | 'balance'>[]
  transactions: Transaction[]
  loanTransactions: LoanTransaction[]
  reconciliations: Reconciliation[]
}

export const txRef = (id: string) => `tx:${id}`
export const loanRef = (id: string) => `loan:${id}`
export const recRef = (id: string) => `rec:${id}`
export const openingBatchId = (accountId: string) => `open:${accountId}`

const toCents = (n: number) => Math.round(n * 100)
const toSar = (c: number) => c / 100

type Movement =
  | { k: 'income'; ref: string; date: string; acc: string; amt: number; created: string; ord: number; tx: Transaction }
  | { k: 'expense'; ref: string; date: string; acc: string; amt: number; created: string; ord: number; tx: Transaction; pin?: string }
  | { k: 'transfer'; ref: string; date: string; acc: string; to: string; amt: number; created: string; ord: number; pin?: string }
  | { k: 'given'; ref: string; date: string; acc: string; amt: number; created: string; ord: number; person: string; pin?: string }
  | { k: 'received'; ref: string; date: string; acc: string; amt: number; created: string; ord: number; person: string; note?: string }
  | { k: 'adjust-in'; ref: string; date: string; acc: string; amt: number; created: string; ord: number }
  | { k: 'adjust-out'; ref: string; date: string; acc: string; amt: number; created: string; ord: number }

/** الداخل قبل الخارج في نفس اليوم — الحركات القديمة بلا وقت إنشاء ما نعرف ترتيبها، وهذا يمنع «مصدر غير معروف» وهمي. */
function priority(m: Movement): number {
  if (m.k === 'income' || m.k === 'received' || m.k === 'adjust-in') return 0
  if (m.k === 'transfer') return 1
  return 2
}

function collectMovements(input: MoneyTrailInput): Movement[] {
  const out: Movement[] = []
  const n = input.transactions.length
  input.transactions.forEach((tx, i) => {
    const base = { ref: txRef(tx.id), date: tx.date, acc: tx.accountId ?? '', amt: toCents(tx.amount), created: tx.createdAt ?? '', ord: n - i }
    if (base.amt <= 0) return
    if (tx.type === 'income') out.push({ ...base, k: 'income', tx })
    else if (tx.type === 'expense') out.push({ ...base, k: 'expense', tx, pin: tx.fundBatchId ?? (tx.loanId ? loanRef(tx.loanId) : undefined) })
    else if (tx.type === 'transfer' && tx.transferToAccountId) out.push({ ...base, k: 'transfer', to: tx.transferToAccountId, pin: tx.fundBatchId })
  })
  const m = input.loanTransactions.length
  input.loanTransactions.forEach((l, i) => {
    const base = { ref: loanRef(l.id), date: l.date, acc: l.accountId ?? '', amt: toCents(l.amount), created: l.createdAt ?? '', ord: m - i, person: l.personId }
    if (base.amt <= 0) return
    if (l.direction === 'given') out.push({ ...base, k: 'given', pin: l.fundBatchId })
    else out.push({ ...base, k: 'received', note: l.note })
  })
  const r = input.reconciliations.length
  input.reconciliations.forEach((rec, i) => {
    if (rec.resolution !== 'adjust' || !rec.difference) return
    const base = { ref: recRef(rec.id), date: rec.date, acc: rec.accountId, amt: toCents(Math.abs(rec.difference)), created: rec.createdAt ?? '', ord: r - i }
    out.push(rec.difference > 0 ? { ...base, k: 'adjust-in' } : { ...base, k: 'adjust-out' })
  })
  return out.sort(
    (a, b) =>
      (a.date < b.date ? -1 : a.date > b.date ? 1 : 0) ||
      priority(a) - priority(b) ||
      (a.created < b.created ? -1 : a.created > b.created ? 1 : 0) ||
      a.ord - b.ord,
  )
}

/** أثر الحركات على كل حساب (بالهللة) — لحساب «رصيد سابق». */
function netEffects(moves: Movement[]): Map<string, number> {
  const eff = new Map<string, number>()
  const add = (acc: string, v: number) => {
    if (acc) eff.set(acc, (eff.get(acc) ?? 0) + v)
  }
  for (const mv of moves) {
    if (mv.k === 'income' || mv.k === 'received' || mv.k === 'adjust-in') add(mv.acc, mv.amt)
    else if (mv.k === 'transfer') {
      add(mv.acc, -mv.amt)
      add(mv.to, mv.amt)
    } else add(mv.acc, -mv.amt)
  }
  return eff
}

interface Piece {
  batchId: string
  amount: number
}

export function computeMoneyTrail(input: MoneyTrailInput): MoneyTrail {
  const moves = collectMovements(input)
  const batches: MoneyBatch[] = []
  const byId = new Map<string, MoneyBatch>()
  const allocations = new Map<string, Allocation[]>()
  /** حساب ← (دفعة ← هللات). */
  const lots = new Map<string, Map<string, number>>()
  /** ما لك عند كل شخص: قطع بدفعاتها، الأقدم أولًا. */
  const lentQ = new Map<string, Piece[]>()
  /** ما عليك لكل شخص: قطع بدفعاتها المقترضة، الأقدم أولًا. */
  const owedQ = new Map<string, Piece[]>()
  /** عجز كل حساب: قطع «مصدر غير معروف» تنتظر أول فلوس تدخله. */
  const deficits = new Map<string, Piece[]>()

  function newBatch(kind: BatchKind, id: string, date: string, accountId: string, cents: number, ref: string, extra: Partial<MoneyBatch> = {}): MoneyBatch {
    const b: MoneyBatch = {
      id,
      kind,
      order: batches.length,
      date,
      accountId,
      amount: cents,
      ref,
      spent: 0,
      spentByCategory: {},
      adjusted: 0,
      covered: 0,
      coveredLater: 0,
      repaid: 0,
      repaidByPerson: {},
      lent: 0,
      lentByPerson: {},
      returned: 0,
      left: 0,
      leftByAccount: {},
      owed: 0,
      owedPaid: 0,
      events: [],
      open: true,
      ...extra,
    }
    batches.push(b)
    byId.set(id, b)
    if (kind !== 'opening') b.events.push({ kind: 'in', ref, date, amount: cents, accountId: accountId || undefined, personId: b.personId })
    return b
  }

  function put(acc: string, batchId: string, cents: number, ref: string, date: string) {
    if (cents <= 0) return
    const owedHole = deficits.get(acc)
    if (owedHole && owedHole.length > 0) {
      const b = byId.get(batchId)!
      for (const q of popQueue(owedHole, cents)) {
        const u = byId.get(q.batchId)!
        b.covered += q.amount
        u.coveredLater += q.amount
        b.events.push({ kind: 'cover', ref, date, amount: q.amount, accountId: acc || undefined, batchId: u.id })
        u.events.push({ kind: 'covered', ref, date, amount: q.amount, accountId: acc || undefined, batchId: b.id })
        cents -= q.amount
      }
      if (cents <= 0) return
    }
    let pool = lots.get(acc)
    if (!pool) lots.set(acc, (pool = new Map()))
    pool.set(batchId, (pool.get(batchId) ?? 0) + cents)
  }

  /** يأخذ من حساب: الدفعة المثبّتة أولًا (لو متوفرة)، ثم الأقدم أولًا، والنقص دفعة «مصدر غير معروف». */
  function take(acc: string, cents: number, ref: string, date: string, pin?: string): Piece[] {
    const pool = lots.get(acc) ?? new Map<string, number>()
    const out: Piece[] = []
    let need = cents
    const grab = (bid: string) => {
      const have = pool.get(bid) ?? 0
      const t = Math.min(have, need)
      if (t <= 0) return
      need -= t
      if (have - t === 0) pool.delete(bid)
      else pool.set(bid, have - t)
      const last = out.find((p) => p.batchId === bid)
      if (last) last.amount += t
      else out.push({ batchId: bid, amount: t })
    }
    if (pin) grab(pin)
    if (need > 0) {
      const ids = [...pool.keys()].sort((a, b) => (byId.get(a)?.order ?? 0) - (byId.get(b)?.order ?? 0))
      for (const bid of ids) {
        if (need <= 0) break
        grab(bid)
      }
    }
    if (need > 0) {
      const u = newBatch('unknown', `unknown:${ref}`, date, acc, need, ref)
      out.push({ batchId: u.id, amount: need })
      const hole = deficits.get(acc) ?? []
      hole.push({ batchId: u.id, amount: need })
      deficits.set(acc, hole)
    }
    lots.set(acc, pool)
    return out
  }

  /** يقسم قطعًا مأخوذة: أول `cents` منها ثم الباقي. */
  function split(pieces: Piece[], cents: number): [Piece[], Piece[]] {
    const a: Piece[] = []
    const b: Piece[] = []
    let rest = cents
    for (const p of pieces) {
      const t = Math.min(p.amount, rest)
      if (t > 0) a.push({ batchId: p.batchId, amount: t })
      if (p.amount - t > 0) b.push({ batchId: p.batchId, amount: p.amount - t })
      rest -= t
    }
    return [a, b]
  }

  /** يسحب من طابور شخص بالأقدم أولًا. */
  function popQueue(q: Piece[], cents: number): Piece[] {
    const out: Piece[] = []
    let need = cents
    while (need > 0 && q.length > 0) {
      const head = q[0]
      const t = Math.min(head.amount, need)
      out.push({ batchId: head.batchId, amount: t })
      head.amount -= t
      need -= t
      if (head.amount === 0) q.shift()
    }
    return out
  }

  const sumQ = (q: Piece[] | undefined) => (q ?? []).reduce((s, p) => s + p.amount, 0)
  const bump = (rec: Record<string, number>, key: string, v: number) => {
    rec[key] = (rec[key] ?? 0) + v
  }

  // «رصيد سابق»: يشمل الحسابات المحذوفة اللي لها حركات (رصيدها الحالي صفر).
  const effects = netEffects(moves)
  const balances = new Map(input.accounts.map((a) => [a.id, toCents(a.balance)]))
  const accIds = [...new Set([...input.accounts.map((a) => a.id), ...effects.keys()])]
  for (const acc of accIds) {
    const opening = (balances.get(acc) ?? 0) - (effects.get(acc) ?? 0)
    if (opening > 0) {
      newBatch('opening', openingBatchId(acc), '', acc, opening, openingBatchId(acc))
      put(acc, openingBatchId(acc), opening, openingBatchId(acc), '')
    }
  }

  for (const mv of moves) {
    switch (mv.k) {
      case 'income': {
        newBatch('income', mv.ref, mv.date, mv.acc, mv.amt, mv.ref, { incomeSourceId: mv.tx.incomeSourceId, note: mv.tx.note })
        put(mv.acc, mv.ref, mv.amt, mv.ref, mv.date)
        break
      }
      case 'adjust-in': {
        newBatch('adjustment', mv.ref, mv.date, mv.acc, mv.amt, mv.ref)
        put(mv.acc, mv.ref, mv.amt, mv.ref, mv.date)
        break
      }
      case 'expense': {
        const pieces = take(mv.acc, mv.amt, mv.ref, mv.date, mv.pin)
        allocations.set(mv.ref, pieces)
        const cat = mv.tx.categoryId ?? ''
        for (const p of pieces) {
          const b = byId.get(p.batchId)!
          b.spent += p.amount
          bump(b.spentByCategory, cat, p.amount)
          b.events.push({ kind: 'spent', ref: mv.ref, date: mv.date, amount: p.amount, accountId: mv.acc || undefined, categoryId: mv.tx.categoryId })
        }
        break
      }
      case 'adjust-out': {
        const pieces = take(mv.acc, mv.amt, mv.ref, mv.date)
        allocations.set(mv.ref, pieces)
        for (const p of pieces) {
          const b = byId.get(p.batchId)!
          b.adjusted += p.amount
          b.events.push({ kind: 'adjust', ref: mv.ref, date: mv.date, amount: p.amount, accountId: mv.acc })
        }
        break
      }
      case 'transfer': {
        const pieces = take(mv.acc, mv.amt, mv.ref, mv.date, mv.pin)
        allocations.set(mv.ref, pieces)
        for (const p of pieces) {
          byId.get(p.batchId)!.events.push({ kind: 'moved', ref: mv.ref, date: mv.date, amount: p.amount, accountId: mv.acc, toAccountId: mv.to })
          put(mv.to, p.batchId, p.amount, mv.ref, mv.date)
        }
        break
      }
      case 'given': {
        const pieces = take(mv.acc, mv.amt, mv.ref, mv.date, mv.pin)
        allocations.set(mv.ref, pieces)
        const owedQueue = owedQ.get(mv.person) ?? []
        const repayCents = Math.min(mv.amt, sumQ(owedQueue))
        const [repayPart, lendPart] = split(pieces, repayCents)
        for (const p of repayPart) {
          const b = byId.get(p.batchId)!
          b.repaid += p.amount
          bump(b.repaidByPerson, mv.person, p.amount)
          b.events.push({ kind: 'repaid', ref: mv.ref, date: mv.date, amount: p.amount, accountId: mv.acc || undefined, personId: mv.person })
        }
        for (const q of popQueue(owedQueue, repayCents)) {
          const bb = byId.get(q.batchId)!
          bb.owedPaid += q.amount
          bb.events.push({ kind: 'obligation-paid', ref: mv.ref, date: mv.date, amount: q.amount, personId: mv.person })
        }
        const lentQueue = lentQ.get(mv.person) ?? []
        for (const p of lendPart) {
          const b = byId.get(p.batchId)!
          b.lent += p.amount
          bump(b.lentByPerson, mv.person, p.amount)
          b.events.push({ kind: 'lent', ref: mv.ref, date: mv.date, amount: p.amount, accountId: mv.acc || undefined, personId: mv.person })
          lentQueue.push({ ...p })
        }
        lentQ.set(mv.person, lentQueue)
        owedQ.set(mv.person, owedQueue)
        break
      }
      case 'received': {
        const lentQueue = lentQ.get(mv.person) ?? []
        const returnCents = Math.min(mv.amt, sumQ(lentQueue))
        for (const q of popQueue(lentQueue, returnCents)) {
          const b = byId.get(q.batchId)!
          b.lent -= q.amount
          bump(b.lentByPerson, mv.person, -q.amount)
          b.returned += q.amount
          b.events.push({ kind: 'returned', ref: mv.ref, date: mv.date, amount: q.amount, accountId: mv.acc || undefined, personId: mv.person })
          put(mv.acc, q.batchId, q.amount, mv.ref, mv.date)
        }
        const borrowed = mv.amt - returnCents
        if (borrowed > 0) {
          const b = newBatch('borrowed', mv.ref, mv.date, mv.acc, borrowed, mv.ref, { personId: mv.person, owed: borrowed, note: mv.note, returnedPart: returnCents > 0 ? returnCents : undefined })
          put(mv.acc, b.id, borrowed, mv.ref, mv.date)
          const owedQueue = owedQ.get(mv.person) ?? []
          owedQueue.push({ batchId: b.id, amount: borrowed })
          owedQ.set(mv.person, owedQueue)
        }
        lentQ.set(mv.person, lentQueue)
        break
      }
    }
  }

  // الباقي بكل حساب الآن.
  const holdings: Record<string, Allocation[]> = {}
  for (const [acc, pool] of lots) {
    const list = [...pool.entries()]
      .filter(([, c]) => c > 0)
      .sort(([a], [b]) => byId.get(a)!.order - byId.get(b)!.order)
      .map(([batchId, c]) => {
        const b = byId.get(batchId)!
        b.left += c
        bump(b.leftByAccount, acc, c)
        return { batchId, amount: toSar(c) }
      })
    if (list.length > 0) holdings[acc] = list
  }

  // التحويل للريال وحالة الدفعة.
  const sarRecord = (r: Record<string, number>) => {
    const out: Record<string, number> = {}
    for (const [k, v] of Object.entries(r)) if (v !== 0) out[k] = toSar(v)
    return out
  }
  for (const b of batches) {
    b.open = b.left > 0 || b.lent > 0 || b.owed - b.owedPaid > 0
    b.amount = toSar(b.amount)
    b.spent = toSar(b.spent)
    b.adjusted = toSar(b.adjusted)
    b.covered = toSar(b.covered)
    b.coveredLater = toSar(b.coveredLater)
    b.repaid = toSar(b.repaid)
    b.lent = toSar(b.lent)
    b.returned = toSar(b.returned)
    b.left = toSar(b.left)
    b.owed = toSar(b.owed)
    if (b.returnedPart) b.returnedPart = toSar(b.returnedPart)
    b.owedPaid = toSar(b.owedPaid)
    b.spentByCategory = sarRecord(b.spentByCategory)
    b.repaidByPerson = sarRecord(b.repaidByPerson)
    b.lentByPerson = sarRecord(b.lentByPerson)
    b.leftByAccount = sarRecord(b.leftByAccount)
    b.events = b.events.map((e) => ({ ...e, amount: toSar(e.amount) }))
  }
  for (const [k, list] of allocations) allocations.set(k, list.map((p) => ({ batchId: p.batchId, amount: toSar(p.amount) })))

  return { batches, byId, allocations, holdings, issues: batches.filter((b) => b.kind === 'unknown') }
}

/**
 * «تحتاج نظرة»: خروج بلا مصدر (دفعات «مصدر غير معروف»)، واستلام من شخص أكبر مما لك عنده
 * (الزيادة صارت سلفة عليك له — غالبًا صح، لكن تستاهل نظرة لو كان خطأ إدخال).
 */
export function reviewItems(trail: MoneyTrail): MoneyBatch[] {
  return trail.batches.filter((b) => b.kind === 'unknown' || (b.kind === 'borrowed' && (b.returnedPart ?? 0) > 0)).sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
}

/**
 * من أي دفعات بيطلع مبلغ لو خرج الآن من حساب — للسطر التوضيحي قبل الحفظ.
 * المثبّتة أولًا (بحد المتوفر منها)، ثم الأقدم أولًا، والزائد عن رصيد الحساب `null`.
 */
export function previewTake(trail: MoneyTrail, accountId: string, amount: number, pin?: string): { batchId: string | null; amount: number }[] {
  const held = (trail.holdings[accountId] ?? []).map((h) => ({ ...h, amount: toCents(h.amount) }))
  const out: { batchId: string | null; amount: number }[] = []
  let need = toCents(amount)
  const grab = (h: { batchId: string; amount: number }) => {
    const t = Math.min(h.amount, need)
    if (t <= 0) return
    h.amount -= t
    need -= t
    const last = out.find((p) => p.batchId === h.batchId)
    if (last) last.amount += t
    else out.push({ batchId: h.batchId, amount: t })
  }
  const pinned = pin ? held.find((h) => h.batchId === pin) : undefined
  if (pinned) grab(pinned)
  for (const h of held) if (need > 0) grab(h)
  if (need > 0) out.push({ batchId: null, amount: need })
  return out.map((p) => ({ batchId: p.batchId, amount: toSar(p.amount) }))
}

/** الدفعات المقترضة المتوفرة الآن في حساب — لاقتراح «من سلفة فلان؟» عند إعطاء سلفة. */
export function borrowedInAccount(trail: MoneyTrail, accountId: string): { batch: MoneyBatch; available: number }[] {
  return (trail.holdings[accountId] ?? [])
    .map((h) => ({ batch: trail.byId.get(h.batchId)!, available: h.amount }))
    .filter((x) => x.batch.kind === 'borrowed' && x.available > 0)
}

/** أجزاء شريط الدفعة بالترتيب: صُرف، فرق مطابقة، سدّ عجز، سداد التزام، عند الناس، باقي لك. */
export type BatchPart = 'spent' | 'adjusted' | 'covered' | 'repaid' | 'lent' | 'left'
export function batchParts(b: MoneyBatch): { part: BatchPart; amount: number }[] {
  return (
    [
      ['spent', b.spent],
      ['adjusted', b.adjusted],
      ['covered', b.covered],
      ['repaid', b.repaid],
      ['lent', b.lent],
      ['left', b.left],
    ] as [BatchPart, number][]
  )
    .filter(([, v]) => v > 0)
    .map(([part, amount]) => ({ part, amount }))
}

/** مجموعات القائمة: بالشهر (الأحدث أولًا)، و«رصيد سابق» آخرها. */
export function groupBatchesByMonth(batches: MoneyBatch[]): { key: string; batches: MoneyBatch[] }[] {
  const groups = new Map<string, MoneyBatch[]>()
  const sorted = [...batches].sort((a, b) => (a.date === b.date ? b.order - a.order : a.date < b.date ? 1 : -1))
  for (const b of sorted) {
    const key = b.date ? b.date.slice(0, 7) : ''
    const list = groups.get(key) ?? []
    list.push(b)
    groups.set(key, list)
  }
  return [...groups.entries()].map(([key, list]) => ({ key, batches: list })).sort((a, b) => (a.key === '' ? 1 : b.key === '' ? -1 : a.key < b.key ? 1 : -1))
}
