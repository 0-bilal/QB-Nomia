import { NavLink, useNavigate } from 'react-router-dom'

const navClass = (active: boolean) => (active ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-3)]')

function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="4,11 12,4 20,11" />
      <rect x="6" y="11" width="12" height="8" rx="1" />
    </svg>
  )
}

function WalletIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="6" width="18" height="13" rx="3" />
      <path d="M3 10 H21" />
      <circle cx="17" cy="14" r="1.3" fill="currentColor" stroke="none" />
    </svg>
  )
}

function PeopleIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="8" r="3" />
      <path d="M3 19c0-3.3 2.7-5 6-5s6 1.7 6 5" />
      <circle cx="17" cy="9" r="2.3" />
      <path d="M15.3 14.2c2.5.4 4.2 1.9 4.2 4.8" />
    </svg>
  )
}

function MoreIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none">
      <circle cx="7" cy="7" r="1.6" fill="currentColor" />
      <circle cx="17" cy="7" r="1.6" fill="currentColor" />
      <circle cx="7" cy="17" r="1.6" fill="currentColor" />
      <circle cx="17" cy="17" r="1.6" fill="currentColor" />
    </svg>
  )
}

function NavItem({ to, label, icon }: { to: string; label: string; icon: (active: boolean) => React.ReactNode }) {
  return (
    <NavLink to={to} className="flex flex-1 flex-col items-center justify-center gap-1" end={to === '/'}>
      {({ isActive }) => (
        <>
          <div className={navClass(isActive)}>{icon(isActive)}</div>
          <div className={`text-[11px] font-semibold ${navClass(isActive)}`}>{label}</div>
        </>
      )}
    </NavLink>
  )
}

export function BottomNav() {
  const navigate = useNavigate()
  return (
    <div className="safe-bottom relative flex h-24 items-center border-t border-[var(--color-border)] bg-[rgba(20,20,23,0.88)] px-2 backdrop-blur-xl">
      <NavItem to="/" label="الرئيسية" icon={() => <HomeIcon />} />
      <NavItem to="/accounts" label="الحسابات" icon={() => <WalletIcon />} />

      <button
        onClick={() => navigate('/add')}
        className="-mt-9 flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full shadow-[0_8px_20px_-4px_rgba(0,226,138,0.45)]"
        style={{ background: 'linear-gradient(145deg, var(--color-accent-a), var(--color-accent-b))' }}
        aria-label="إضافة حركة"
      >
        <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#04140D" strokeWidth="2.4" strokeLinecap="round">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>

      <NavItem to="/loans" label="السلف" icon={() => <PeopleIcon />} />
      <NavItem to="/more" label="المزيد" icon={() => <MoreIcon />} />
    </div>
  )
}
