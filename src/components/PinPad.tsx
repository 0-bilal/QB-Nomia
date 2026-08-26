interface PinPadProps {
  digits: number
  value: string
  onDigit: (d: string) => void
  onBackspace: () => void
  disabled?: boolean
}

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9']

export function PinPad({ digits, value, onDigit, onBackspace, disabled }: PinPadProps) {
  return (
    <div className="flex flex-col items-center gap-14">
      <div dir="ltr" className="flex h-3.5 gap-4">
        {Array.from({ length: digits }).map((_, i) => {
          const filled = i < value.length
          return (
            <div
              key={i}
              className="h-3.5 w-3.5 rounded-full border-[1.5px] transition-all duration-150"
              style={{
                borderColor: filled ? 'var(--color-accent)' : 'var(--color-text-3)',
                background: filled ? 'var(--color-accent)' : 'transparent',
                transform: filled ? 'scale(1.15)' : 'scale(1)',
              }}
            />
          )
        })}
      </div>

      <div dir="ltr" className="grid grid-cols-3 gap-5">
        {KEYS.map((k) => (
          <button
            key={k}
            type="button"
            disabled={disabled}
            onClick={() => onDigit(k)}
            className="num flex h-17 w-17 items-center justify-center rounded-full border text-2xl font-semibold text-[var(--color-text)] transition-transform active:scale-90"
            style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)', width: 68, height: 68 }}
          >
            {k}
          </button>
        ))}
        <div />
        <button
          type="button"
          disabled={disabled}
          onClick={() => onDigit('0')}
          className="num flex items-center justify-center rounded-full border text-2xl font-semibold text-[var(--color-text)] transition-transform active:scale-90"
          style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)', width: 68, height: 68 }}
        >
          0
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={onBackspace}
          className="flex items-center justify-center rounded-full text-[var(--color-text-2)] transition-transform active:scale-90"
          style={{ width: 68, height: 68 }}
          aria-label="حذف"
        >
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 6 L3 12 L9 18 H20 A2 2 0 0 0 22 16 V8 A2 2 0 0 0 20 6 Z" />
            <line x1="12" y1="9.5" x2="17" y2="14.5" />
            <line x1="17" y1="9.5" x2="12" y2="14.5" />
          </svg>
        </button>
      </div>
    </div>
  )
}
