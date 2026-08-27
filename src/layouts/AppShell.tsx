import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { BottomNav } from '../components/BottomNav'
import { useData } from '../state/DataContext'
import { notifyNewCriticalItems } from '../lib/deviceNotify'

export function AppShell() {
  const { notifications } = useData()

  // يطلق إشعار جهاز حقيقي للتنبيهات الحرجة الجديدة عند فتح التطبيق —
  // فقط لو المستخدم فعّل إذن التنبيهات أصلًا (من داخل مركز التنبيهات).
  useEffect(() => {
    const critical = notifications.filter((n) => n.severity === 'critical')
    notifyNewCriticalItems(critical)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
