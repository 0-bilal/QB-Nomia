import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../state/AuthContext'
import { clearAppCache } from '../lib/cache'

const ITEMS = [
  { label: 'فئات المصاريف', desc: 'إدارة فئات المصروفات والميزانيات', to: '/categories' },
  { label: 'مصادر الدخل', desc: 'إدارة مصادر دخلك المتعددة', to: '/income-sources' },
  { label: 'الاشتراكات', desc: 'يوتيوب، Google Play، وغيرها', to: '/subscriptions' },
  { label: 'التقارير', desc: 'ملخصات ورسوم بيانية شهرية', soon: true },
  { label: 'مزامنة Google Sheets', desc: 'رفع وسحب بياناتك من جدولك', to: '/sync-settings' },
]

export function MoreScreen() {
  const navigate = useNavigate()
  const auth = useAuth()
  const [busy, setBusy] = useState(false)

  async function handleClearCache() {
    if (!window.confirm('سيتم مسح ذاكرة التخزين المؤقت للتطبيق وإعادة تحميل الصفحة. بياناتك المالية لن تتأثر. متابعة؟')) return
    setBusy(true)
    try {
      await clearAppCache()
      window.location.reload()
    } catch {
      setBusy(false)
    }
  }

  return (
    <div dir="rtl" className="safe-top px-5 pb-4 pt-15">
      <div className="mb-5 text-xl font-bold">المزيد</div>

      <div className="mb-6 flex flex-col gap-2.5">
        {ITEMS.map((item) => {
          const Wrapper = item.to ? 'button' : 'div'
          return (
            <Wrapper
              key={item.label}
              onClick={item.to ? () => navigate(item.to!) : undefined}
              className={`flex items-center justify-between rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3.5 text-right ${item.soon ? 'opacity-60' : ''}`}
            >
              <div>
                <div className="text-[13.5px] font-bold">{item.label}</div>
                <div className="text-[11.5px] text-[var(--color-text-3)]">{item.desc}</div>
              </div>
              {item.soon && (
                <div className="rounded-full px-2.5 py-1 text-[11px] font-semibold" style={{ background: 'rgba(0,226,138,0.12)', color: 'var(--color-accent)' }}>
                  قريبًا
                </div>
              )}
            </Wrapper>
          )
        })}
      </div>

      <button
        onClick={handleClearCache}
        disabled={busy}
        className="mb-6 flex w-full items-center justify-between rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3.5 text-right disabled:opacity-50"
      >
        <div>
          <div className="text-[13.5px] font-bold">مسح ذاكرة التخزين المؤقت</div>
          <div className="text-[11.5px] text-[var(--color-text-3)]">يعيد تحميل التطبيق بأحدث نسخة — بياناتك المالية لا تتأثر</div>
        </div>
        {busy && <div className="text-[11px] text-[var(--color-text-3)]">جارٍ...</div>}
      </button>

      <button
        onClick={() => {
          auth.lock()
          navigate('/login', { replace: true })
        }}
        className="w-full rounded-2xl border border-[var(--color-border)] py-3.5 text-center text-[13.5px] font-semibold text-[var(--color-text-2)]"
      >
        قفل التطبيق
      </button>
    </div>
  )
}
