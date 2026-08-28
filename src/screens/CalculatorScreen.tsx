import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ScreenScroll } from '../components/ScreenScroll'
import { ScreenHeader } from '../components/ScreenHeader'
import { AmountPad } from '../components/AmountPad'
import { formatMoney } from '../lib/format'

type Tab = 'calc' | 'split'
type Op = '+' | '−' | '×' | '÷'

const MAX_DISPLAY_LEN = 14

function compute(a: number, b: number, op: Op): number {
  switch (op) {
    case '+':
      return a + b
    case '−':
      return a - b
    case '×':
      return a * b
    case '÷':
      return b === 0 ? NaN : a / b
  }
}

function formatResult(n: number): string {
  if (!Number.isFinite(n)) return 'خطأ'
  const rounded = Math.round(n * 1e8) / 1e8
  return rounded.toLocaleString('en-US', { maximumFractionDigits: 8 })
}

function PeopleIcon() {
  return (
    <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="8" r="3" />
      <path d="M3 19c0-3.3 2.7-5 6-5s6 1.7 6 5" />
      <path d="M16 4.5a3 3 0 0 1 0 5.8" />
      <path d="M18.5 14.5c1.9.5 3.5 1.9 3.5 4.5" />
    </svg>
  )
}
function CalcIcon() {
  return (
    <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="3" width="16" height="18" rx="2.5" />
      <path d="M7.5 7.5h9" />
      <circle cx="8" cy="12.3" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12.3" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="16" cy="12.3" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="8" cy="16.3" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="12" cy="16.3" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="16" cy="16.3" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  )
}
function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}
function MinusIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}
function UseNumberIcon() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="11,6 5,12 11,18" />
    </svg>
  )
}

function UseNumberButton({ onClick, disabled }: { onClick: () => void; disabled?: boolean }) {
  return (
    <button
      dir="rtl"
      onClick={onClick}
      disabled={disabled}
      className="qb-press flex w-full items-center justify-center gap-1.5 rounded-2xl py-2.75 text-[12.5px] font-bold disabled:opacity-40"
      style={{ background: 'rgba(52,199,89,0.14)', color: 'var(--color-income)' }}
    >
      <UseNumberIcon />
      استخدم هذا الرقم
    </button>
  )
}

function TabButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className="qb-press flex flex-1 items-center justify-center gap-1.5 rounded-2xl py-2.5 text-[12.5px] font-bold"
      style={{
        background: active ? 'var(--color-accent)' : 'var(--color-surface)',
        color: active ? '#0A0A0C' : 'var(--color-text-2)',
        border: active ? 'none' : '1px solid var(--color-border)',
      }}
    >
      {icon}
      {label}
    </button>
  )
}

function CalcButton({
  label,
  onClick,
  variant = 'digit',
  wide,
}: {
  label: React.ReactNode
  onClick: () => void
  variant?: 'digit' | 'op' | 'op-active' | 'func' | 'equals'
  wide?: boolean
}) {
  const styles: Record<string, { background: string; color: string }> = {
    digit: { background: 'linear-gradient(165deg, var(--color-surface-elevated) 0%, var(--color-surface) 100%)', color: 'var(--color-text)' },
    op: { background: 'rgba(124,108,255,0.14)', color: 'var(--color-transfer)' },
    'op-active': { background: 'var(--color-transfer)', color: '#fff' },
    func: { background: 'rgba(255,255,255,0.08)', color: 'var(--color-text-2)' },
    equals: { background: 'var(--color-accent)', color: '#0A0A0C' },
  }
  return (
    <button
      onClick={onClick}
      className={`num qb-press flex items-center justify-center rounded-2xl text-xl font-bold ${wide ? 'col-span-2' : ''}`}
      style={{ height: 58, ...styles[variant] }}
    >
      {label}
    </button>
  )
}

function StandardCalculator({ onUse }: { onUse: (n: number) => void }) {
  const [display, setDisplay] = useState('0')
  const [prev, setPrev] = useState<number | null>(null)
  const [op, setOp] = useState<Op | null>(null)
  const [overwrite, setOverwrite] = useState(true)

  function inputDigit(d: string) {
    if (overwrite) {
      setDisplay(d)
      setOverwrite(false)
      return
    }
    if (display.length >= MAX_DISPLAY_LEN) return
    setDisplay((v) => (v === '0' ? d : v + d))
  }

  function inputDot() {
    if (overwrite) {
      setDisplay('0.')
      setOverwrite(false)
      return
    }
    if (display.includes('.')) return
    setDisplay((v) => v + '.')
  }

  function chooseOp(next: Op) {
    const current = parseFloat(display)
    if (prev !== null && op !== null && !overwrite) {
      const result = compute(prev, current, op)
      setDisplay(formatResult(result))
      setPrev(result)
    } else {
      setPrev(current)
    }
    setOp(next)
    setOverwrite(true)
  }

  function equals() {
    if (op === null || prev === null) return
    const result = compute(prev, parseFloat(display), op)
    setDisplay(formatResult(result))
    setPrev(null)
    setOp(null)
    setOverwrite(true)
  }

  function clearAll() {
    setDisplay('0')
    setPrev(null)
    setOp(null)
    setOverwrite(true)
  }

  function backspace() {
    if (overwrite) return
    setDisplay((v) => {
      const next = v.slice(0, -1)
      return next === '' || next === '-' ? '0' : next
    })
  }

  function toggleSign() {
    if (display === '0') return
    setDisplay((v) => (v.startsWith('-') ? v.slice(1) : `-${v}`))
  }

  function percent() {
    const n = parseFloat(display)
    setDisplay(formatResult(n / 100))
    setOverwrite(true)
  }

  const currentValue = parseFloat(display)
  const canUse = Number.isFinite(currentValue) && currentValue > 0

  return (
    // dir="ltr": لوحة أرقام الآلة الحاسبة تحافظ على نفس ترتيبها المكاني المعتاد (كأي رقّاعة أرقام)
    // بغض النظر عن لغة الواجهة، بدل ما ينعكس ترتيب الأعمدة تلقائيًا مع RTL.
    <div dir="ltr" className="flex h-full flex-col gap-4">
      <div className="qb-card-elevated flex flex-col justify-end p-5" style={{ height: 128 }}>
        {op && prev !== null && (
          <div dir="ltr" className="num mb-1 text-left text-[13px] text-[var(--color-text-3)]">
            {formatResult(prev)} {op}
          </div>
        )}
        <div dir="ltr" className="num overflow-hidden text-left text-[38px] font-bold text-ellipsis whitespace-nowrap">
          {display}
        </div>
      </div>

      <UseNumberButton onClick={() => onUse(currentValue)} disabled={!canUse} />

      {/* لوحة الأرقام دائمًا بأسفل الشاشة (mt-auto) — بدل ما تلتصق مباشرة تحت الشاشة الرئيسية. */}
      <div className="mt-auto grid grid-cols-4 gap-2.5">
        <CalcButton label="C" variant="func" onClick={clearAll} />
        <CalcButton label="±" variant="func" onClick={toggleSign} />
        <CalcButton label="%" variant="func" onClick={percent} />
        <CalcButton label="÷" variant={op === '÷' ? 'op-active' : 'op'} onClick={() => chooseOp('÷')} />

        <CalcButton label="7" onClick={() => inputDigit('7')} />
        <CalcButton label="8" onClick={() => inputDigit('8')} />
        <CalcButton label="9" onClick={() => inputDigit('9')} />
        <CalcButton label="×" variant={op === '×' ? 'op-active' : 'op'} onClick={() => chooseOp('×')} />

        <CalcButton label="4" onClick={() => inputDigit('4')} />
        <CalcButton label="5" onClick={() => inputDigit('5')} />
        <CalcButton label="6" onClick={() => inputDigit('6')} />
        <CalcButton label="−" variant={op === '−' ? 'op-active' : 'op'} onClick={() => chooseOp('−')} />

        <CalcButton label="1" onClick={() => inputDigit('1')} />
        <CalcButton label="2" onClick={() => inputDigit('2')} />
        <CalcButton label="3" onClick={() => inputDigit('3')} />
        <CalcButton label="+" variant={op === '+' ? 'op-active' : 'op'} onClick={() => chooseOp('+')} />

        <CalcButton
          label={
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 6 L3 12 L9 18 H20 A2 2 0 0 0 22 16 V8 A2 2 0 0 0 20 6 Z" />
              <line x1="12" y1="9.5" x2="17" y2="14.5" />
              <line x1="17" y1="9.5" x2="12" y2="14.5" />
            </svg>
          }
          variant="func"
          onClick={backspace}
        />
        <CalcButton label="0" onClick={() => inputDigit('0')} />
        <CalcButton label="." onClick={inputDot} />
        <CalcButton label="=" variant="equals" onClick={equals} />
      </div>
    </div>
  )
}

function SplitBill({ onUse }: { onUse: (n: number) => void }) {
  const [amount, setAmount] = useState('')
  const [people, setPeople] = useState(2)

  const total = parseFloat(amount) || 0
  const perPerson = people > 0 ? total / people : 0

  return (
    <div className="flex h-full flex-col gap-4">
      <div>
        <label className="mb-1.5 block text-[12.5px] font-semibold text-[var(--color-text-2)]">المبلغ الإجمالي</label>
        <div dir="ltr" className="qb-card-elevated flex items-center justify-between p-5" style={{ height: 78 }}>
          <div className="num overflow-hidden text-[30px] font-bold text-ellipsis whitespace-nowrap">{amount || '0'}</div>
          <div className="flex-shrink-0 text-[13px] font-semibold text-[var(--color-text-3)]">ر.س</div>
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-[12.5px] font-semibold text-[var(--color-text-2)]">عدد الأشخاص</label>
        <div dir="ltr" className="qb-card flex items-center justify-between px-3 py-2">
          <button
            onClick={() => setPeople((p) => Math.max(1, p - 1))}
            className="qb-press flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full"
            style={{ width: 40, height: 40, background: 'rgba(255,255,255,0.1)' }}
            aria-label="إنقاص"
          >
            <MinusIcon />
          </button>
          <div className="flex items-center gap-2">
            <PeopleIcon />
            <div className="num text-[22px] font-bold">{people}</div>
          </div>
          <button
            onClick={() => setPeople((p) => Math.min(50, p + 1))}
            className="qb-press flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full"
            style={{ width: 40, height: 40, background: 'var(--color-accent)', color: '#0A0A0C' }}
            aria-label="زيادة"
          >
            <PlusIcon />
          </button>
        </div>
      </div>

      <div className="qb-card-elevated flex flex-col items-center py-5">
        <div className="mb-1.5 text-[12.5px] text-[var(--color-text-2)]">نصيب كل شخص</div>
        <div className="num text-[30px] font-bold" style={{ color: 'var(--color-accent)' }}>
          {formatMoney(perPerson)}
        </div>
        {total > 0 && (
          <div className="mt-2 text-[11.5px] text-[var(--color-text-3)]">
            {formatMoney(total)} ÷ {people} {people === 1 ? 'شخص' : 'أشخاص'}
          </div>
        )}
      </div>

      <UseNumberButton onClick={() => onUse(perPerson)} disabled={!(perPerson > 0)} />

      {/* لوحة أرقام التطبيق الخاصة بدل الاعتماد على كيبورد الهاتف — نفس المستخدمة بإدخال مبلغ أي حركة مالية. */}
      <div className="mt-auto flex justify-center pt-2">
        <AmountPad value={amount} onChange={setAmount} color="var(--color-accent)" />
      </div>
    </div>
  )
}

export function CalculatorScreen() {
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('calc')

  function handleUseNumber(n: number) {
    const rounded = Math.round(n * 100) / 100
    navigate(`/add/transaction?amount=${rounded}`)
  }

  return (
    <ScreenScroll
      header={<ScreenHeader title="الآلة الحاسبة" onBack={() => navigate(-1)} className="pt-8 pb-4" />}
      contentClassName="flex flex-1 flex-col px-5 pb-4"
    >
      <div className="mb-4 flex gap-2.5">
        <TabButton active={tab === 'calc'} onClick={() => setTab('calc')} icon={<CalcIcon />} label="عادية" />
        <TabButton active={tab === 'split'} onClick={() => setTab('split')} icon={<PeopleIcon />} label="تقسيم الحساب" />
      </div>

      <div className="flex flex-1 flex-col">
        {tab === 'calc' ? <StandardCalculator onUse={handleUseNumber} /> : <SplitBill onUse={handleUseNumber} />}
      </div>
    </ScreenScroll>
  )
}
