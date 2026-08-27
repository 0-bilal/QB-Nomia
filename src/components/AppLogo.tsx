export function AppLogo({ tagline = 'محفظتك المالية الشخصية' }: { tagline?: string }) {
  return (
    <div className="flex flex-col items-center">
      <div className="mb-1.5 flex items-center gap-2.5">
        <div
          className="flex h-8.5 w-8.5 items-center justify-center rounded-[10px] shadow-[0_6px_16px_-4px_rgba(255,255,255,0.55)]"
          style={{ background: 'linear-gradient(150deg, var(--color-accent), var(--color-accent-b))', width: 34, height: 34 }}
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#0A0A0C" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 17 L10 9 L14 13 L20 5" />
            <path d="M15 5 H20 V10" />
          </svg>
        </div>
        <div className="num text-[19px] font-bold tracking-tight">QB-Nomia</div>
      </div>
      {tagline && <div className="text-[13px] text-[var(--color-text-2)]">{tagline}</div>}
    </div>
  )
}
