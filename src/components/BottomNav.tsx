import { useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'

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

function PeopleIcon({ size = 22 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
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

function TransactionIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#04140D" strokeWidth="2.4" strokeLinecap="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
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

interface SpeedDialAction {
  label: string
  sub: string
  color: string
  bg: string
  icon: React.ReactNode
  to: string
}

const ACTIONS: SpeedDialAction[] = [
  {
    label: 'مصروف / دخل / تحويل',
    sub: 'سجّل حركة على أحد حساباتك',
    color: 'var(--color-expense)',
    bg: 'rgba(255,92,92,0.14)',
    icon: <TransactionIcon />,
    to: '/add/transaction',
  },
  {
    label: 'حركة سلفة',
    sub: 'أعطِ أو استلم مبلغًا من أحد الأشخاص',
    color: 'var(--color-owed-to)',
    bg: 'rgba(45,212,191,0.14)',
    icon: <PeopleIcon size={20} />,
    to: '/loans',
  },
]

export function BottomNav() {
  const navigate = useNavigate()
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const [openedForPath, setOpenedForPath] = useState(location.pathname)

  if (location.pathname !== openedForPath) {
    setOpenedForPath(location.pathname)
    if (open) setOpen(false)
  }

  function goTo(to: string) {
    setOpen(false)
    navigate(to)
  }

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-[2px]"
          style={{ animation: 'fade-in 200ms ease-out both' }}
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      <div className="safe-bottom relative z-50 flex h-24 items-center border-t border-[var(--color-border)] bg-[rgba(20,20,23,0.88)] px-2 backdrop-blur-xl">
        <NavItem to="/" label="الرئيسية" icon={() => <HomeIcon />} />
        <NavItem to="/accounts" label="الحسابات" icon={() => <WalletIcon />} />

        <div className="relative flex h-14 w-14 flex-shrink-0 items-center justify-center">
          {open && (
            <div
              className="absolute bottom-full flex flex-col items-stretch gap-3 pb-4"
              style={{ left: '50%', transform: 'translateX(-50%)', width: 248 }}
            >
              {ACTIONS.map((action, i) => (
                <button
                  key={action.to}
                  onClick={() => goTo(action.to)}
                  className="flex items-center gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] py-2.5 px-3 text-right shadow-[0_10px_30px_-8px_rgba(0,0,0,0.65)]"
                  style={{ animation: `speed-dial-in 220ms ease-out ${i * 40}ms both` }}
                >
                  <div
                    className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full"
                    style={{ background: action.bg, color: action.color }}
                  >
                    {action.icon}
                  </div>
                  <div className="flex-1">
                    <div className="text-[13px] font-bold">{action.label}</div>
                    <div className="text-[10.5px] leading-tight text-[var(--color-text-3)]">{action.sub}</div>
                  </div>
                </button>
              ))}
            </div>
          )}

          <button
            onClick={() => setOpen((o) => !o)}
            className="-mt-9 flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full shadow-[0_8px_20px_-4px_rgba(0,226,138,0.45)] transition-transform duration-200 ease-out"
            style={{
              background: 'linear-gradient(145deg, var(--color-accent-a), var(--color-accent-b))',
              transform: open ? 'rotate(45deg)' : 'rotate(0deg)',
            }}
            aria-expanded={open}
            aria-label={open ? 'إغلاق' : 'إضافة حركة'}
          >
            <PlusIcon />
          </button>
        </div>

        <NavItem to="/loans" label="السلف" icon={() => <PeopleIcon />} />
        <NavItem to="/more" label="المزيد" icon={() => <MoreIcon />} />
      </div>
    </>
  )
}
