import { useMemo, useState } from 'react'

const MONTHS = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
]
const WEEKDAYS = ['ح', 'ن', 'ث', 'ر', 'خ', 'ج', 'س']

function parseISO(value: string): Date | null {
  if (!value) return null
  const [y, m, d] = value.split('-').map(Number)
  if (!y || !m || !d) return null
  return new Date(y, m - 1, d)
}

function toISO(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function ChevronIcon({ direction }: { direction: 'left' | 'right' }) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {direction === 'left' ? <polyline points="15,6 9,12 15,18" /> : <polyline points="9,6 15,12 9,18" />}
    </svg>
  )
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3.5" y="5" width="17" height="16" rx="3" />
      <path d="M3.5 10h17M8 3v4M16 3v4" />
    </svg>
  )
}

function FieldChevronIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15,6 9,12 15,18" />
    </svg>
  )
}

interface DatePickerProps {
  value: string
  onChange: (next: string) => void
  color?: string
  placeholder?: string
  /** إذا انحطّ، الزر يترسم بهيئة صف نموذج (أيقونة + تسمية أعلى القيمة) بدل الزر المدمج — يوحّد شكله مع PickerField. */
  fieldLabel?: string
}

/** منتقي تاريخ مخصص بهوية التطبيق — بديل عن input[type=date] اللي شكله والنافذة المنبثقة له تابعين للمتصفح/النظام ومستحيل تصميمهما. */
export function DatePicker({ value, onChange, color = 'var(--color-accent)', placeholder = 'اختر تاريخًا', fieldLabel }: DatePickerProps) {
  const [open, setOpen] = useState(false)
  const selected = parseISO(value)
  const [viewDate, setViewDate] = useState(() => selected ?? new Date())

  const label = selected
    ? `${selected.getFullYear()}/${String(selected.getMonth() + 1).padStart(2, '0')}/${String(selected.getDate()).padStart(2, '0')}`
    : placeholder

  function openPicker() {
    setViewDate(selected ?? new Date())
    setOpen(true)
  }

  const grid = useMemo(() => {
    const year = viewDate.getFullYear()
    const month = viewDate.getMonth()
    const startOffset = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const cells: (number | null)[] = []
    for (let i = 0; i < startOffset; i++) cells.push(null)
    for (let d = 1; d <= daysInMonth; d++) cells.push(d)
    return cells
  }, [viewDate])

  function selectDay(day: number) {
    onChange(toISO(new Date(viewDate.getFullYear(), viewDate.getMonth(), day)))
    setOpen(false)
  }

  function goToday() {
    onChange(toISO(new Date()))
    setOpen(false)
  }

  const today = new Date()
  const isToday = (day: number) =>
    day === today.getDate() && viewDate.getMonth() === today.getMonth() && viewDate.getFullYear() === today.getFullYear()
  const isSelected = (day: number) =>
    selected != null &&
    day === selected.getDate() &&
    viewDate.getMonth() === selected.getMonth() &&
    viewDate.getFullYear() === selected.getFullYear()

  return (
    <>
      {fieldLabel ? (
        <button type="button" onClick={openPicker} className="qb-card qb-press flex w-full items-center gap-3 px-4 py-3 text-right">
          <div
            className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-[14px]"
            style={{ width: 44, height: 44, background: `${color}1f`, color }}
          >
            <CalendarIcon />
          </div>
          <div className="min-w-0 flex-1">
            <div className="mb-0.5 text-[11px] font-semibold text-[var(--color-text-2)]">{fieldLabel}</div>
            <div className={`num truncate text-[14px] font-bold ${value ? '' : 'text-[var(--color-text-3)]'}`}>{label}</div>
          </div>
          <div className="flex-shrink-0 text-[var(--color-text-3)]">
            <FieldChevronIcon />
          </div>
        </button>
      ) : (
        <button
          type="button"
          onClick={openPicker}
          className="flex w-full items-center justify-between rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-[13.5px]"
        >
          <span className={value ? 'num font-semibold' : 'text-[var(--color-text-3)]'}>{label}</span>
          <span style={{ color }}>
            <CalendarIcon />
          </span>
        </button>
      )}

      {open && (
        <div dir="rtl" className="fixed inset-0 z-[60] flex items-center justify-center px-6">
          <div
            className="absolute inset-0 bg-black/65 backdrop-blur-[2px]"
            style={{ animation: 'fade-in 180ms ease-out both' }}
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div
            className="relative w-full max-w-[320px] rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-4 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.7)]"
            style={{ animation: 'speed-dial-in 200ms ease-out both' }}
          >
            <div className="mb-3 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))}
                className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--color-text-2)]"
                aria-label="الشهر السابق"
              >
                <ChevronIcon direction="right" />
              </button>
              <div className="num text-[14px] font-bold">
                {MONTHS[viewDate.getMonth()]} {viewDate.getFullYear()}
              </div>
              <button
                type="button"
                onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))}
                className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--color-text-2)]"
                aria-label="الشهر القادم"
              >
                <ChevronIcon direction="left" />
              </button>
            </div>

            <div className="mb-1 grid grid-cols-7 gap-1 text-center text-[11px] text-[var(--color-text-3)]">
              {WEEKDAYS.map((w, i) => (
                <div key={i}>{w}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {grid.map((day, i) =>
                day === null ? (
                  <div key={i} />
                ) : (
                  <button
                    key={i}
                    type="button"
                    onClick={() => selectDay(day)}
                    className="num flex h-9 w-9 items-center justify-center rounded-full text-[13px] font-semibold"
                    style={
                      isSelected(day)
                        ? { background: color, color: '#0A0A0C' }
                        : isToday(day)
                          ? { border: `1px solid ${color}`, color }
                          : { color: 'var(--color-text)' }
                    }
                  >
                    {day}
                  </button>
                ),
              )}
            </div>

            <button
              type="button"
              onClick={goToday}
              className="mt-3 w-full rounded-2xl py-2.5 text-center text-[12.5px] font-semibold"
              style={{ background: 'var(--color-surface)', color: 'var(--color-text-2)', border: '1px solid var(--color-border)' }}
            >
              اليوم
            </button>
          </div>
        </div>
      )}
    </>
  )
}
