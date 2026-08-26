interface AmountPadProps {
  value: string
  onChange: (next: string) => void
  color: string
}

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9']

/**
 * لوحة أرقام مخصصة لإدخال المبالغ — بنفس هوية QB-Nomia (زي PinPad)،
 * بدل الاعتماد على لوحة مفاتيح الهاتف الافتراضية. تدعم كسور عشرية
 * حتى خانتين (هللات) عبر مفتاح النقطة.
 */
export function AmountPad({ value, onChange, color }: AmountPadProps) {
  function pressDigit(d: string) {
    const [whole, decimals] = value.split('.')
    if (decimals !== undefined && decimals.length >= 2) return
    if ((whole ?? '').replace('-', '').length >= 9) return
    onChange(value === '0' ? d : value + d)
  }
  function pressDot() {
    if (value.includes('.')) return
    onChange(value === '' ? '0.' : value + '.')
  }
  function clearAll() {
    onChange('')
  }
  function backspace() {
    onChange(value.slice(0, -1))
  }

  return (
    <div dir="ltr" className="flex flex-col items-center gap-2.5">
      <div className="flex w-full max-w-[228px] justify-end">
        <button type="button" onClick={clearAll} className="px-1 text-[12px] font-semibold text-[var(--color-text-3)]" aria-label="مسح الكل">
          مسح الكل
        </button>
      </div>
      <div className="grid grid-cols-3 gap-3.5">
        {KEYS.map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => pressDigit(k)}
            className="num flex items-center justify-center rounded-full border text-[22px] font-semibold text-[var(--color-text)] transition-transform active:scale-90"
            style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)', width: 64, height: 64 }}
          >
            {k}
          </button>
        ))}

        <button
          type="button"
          onClick={pressDot}
          className="num flex items-center justify-center rounded-full border text-[22px] font-semibold text-[var(--color-text)] transition-transform active:scale-90"
          style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)', width: 64, height: 64 }}
          aria-label="فاصلة عشرية"
        >
          .
        </button>

        <button
          type="button"
          onClick={() => pressDigit('0')}
          className="num flex items-center justify-center rounded-full border text-[22px] font-semibold text-[var(--color-text)] transition-transform active:scale-90"
          style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)', width: 64, height: 64 }}
        >
          0
        </button>

        <button
          type="button"
          onClick={backspace}
          className="flex items-center justify-center rounded-full transition-transform active:scale-90"
          style={{ width: 64, height: 64, color }}
          aria-label="حذف آخر رقم"
        >
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 6 L3 12 L9 18 H20 A2 2 0 0 0 22 16 V8 A2 2 0 0 0 20 6 Z" />
            <line x1="12" y1="9.5" x2="17" y2="14.5" />
            <line x1="17" y1="9.5" x2="12" y2="14.5" />
          </svg>
        </button>
      </div>
    </div>
  )
}
