function EyeIcon({ hidden }: { hidden: boolean }) {
  if (hidden) {
    return (
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 3l18 18" />
        <path d="M10.6 5.2A10.4 10.4 0 0 1 12 5c5 0 9 4 10 7-0.4 1.2-1.2 2.6-2.4 3.9M6.5 6.6C4.4 8 2.9 10 2 12c1 3 5 7 10 7 1.4 0 2.7-.3 3.9-.8" />
        <path d="M9.5 10a3 3 0 0 0 4.2 4.2" />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12c1-3 5-7 10-7s9 4 10 7c-1 3-5 7-10 7s-9-4-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

/** زر دائري بأيقونة العين — يكشف/يخفي الأرصدة وأرقام الحسابات مؤقتًا فوق أي شاشة تعرضها. */
export function EyeToggleButton({ hidden, onToggle }: { hidden: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className="qb-glass-circle qb-press flex h-9.5 w-9.5 items-center justify-center rounded-full border text-[var(--color-text-2)]"
      style={{ width: 38, height: 38 }}
      aria-label={hidden ? 'إظهار الأرقام' : 'إخفاء الأرقام'}
    >
      <EyeIcon hidden={hidden} />
    </button>
  )
}
