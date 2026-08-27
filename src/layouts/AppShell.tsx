import { Outlet } from 'react-router-dom'
import { BottomNav } from '../components/BottomNav'

export function AppShell() {
  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-[var(--color-bg)]">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-72"
        style={{ background: 'radial-gradient(120% 100% at 50% 0%, rgba(255,255,255,0.05) 0%, transparent 60%)' }}
        aria-hidden="true"
      />
      <div className="relative flex-1 overflow-y-auto">
        <Outlet />
      </div>
      <BottomNav />
    </div>
  )
}
