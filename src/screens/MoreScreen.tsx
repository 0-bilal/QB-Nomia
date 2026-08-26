import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../state/AuthContext'
import { useData } from '../state/DataContext'
import { clearAppCache } from '../lib/cache'

const ITEMS = [
  { label: 'فئات المصاريف', desc: 'إدارة فئات المصروفات والميزانيات', to: '/categories' },
  { label: 'مصادر الدخل', desc: 'إدارة مصادر دخلك المتعددة', to: '/income-sources' },
  { label: 'الاشتراكات', desc: 'يوتيوب، Google Play، وغيرها', to: '/subscriptions' },
  { label: 'التقارير', desc: 'ملخصات ورسوم بيانية شهرية', soon: true },
  { label: 'ربط Google Sheets', desc: 'مزامنة بياناتك مع حسابك', to: '/sync-settings' },
]

export function MoreScreen() {
  const navigate = useNavigate()
  const auth = useAuth()
  const { resetToBlank } = useData()
  const [busy, setBusy] = useState<'cache' | 'reset' | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  async function handleClearCache() {
    if (!window.confirm('سيتم مسح ذاكرة التخزين المؤقت للتطبيق وإعادة تحميل الصفحة. بياناتك المالية لن تتأثر. متابعة؟')) return
    setBusy('cache')
    try {
      await clearAppCache()
      window.location.reload()
    } catch {
      setMessage('تعذّر مسح الذاكرة المؤقتة')
      setBusy(null)
    }
  }

  function handleResetData() {
    if (
      !window.confirm(
        'سيتم حذف كل الأشخاص والاشتراكات والحركات التجريبية، وتصفير رصيد كل الحسابات إلى صفر. هذا الإجراء لا يمكن التراجع عنه. متابعة؟',
      )
    )
      return
    setBusy('reset')
    resetToBlank()
    setBusy(null)
    setMessage('تم حذف البيانات التجريبية وتصفير كل الحسابات')
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

      <div className="mb-2 text-[12.5px] font-bold text-[var(--color-text-2)]">إدارة البيانات</div>
      <div className="mb-6 flex flex-col gap-2.5">
        <button
          onClick={handleClearCache}
          disabled={busy !== null}
          className="flex items-center justify-between rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3.5 text-right disabled:opacity-50"
        >
          <div>
            <div className="text-[13.5px] font-bold">مسح ذاكرة التخزين المؤقت</div>
            <div className="text-[11.5px] text-[var(--color-text-3)]">يعيد تحميل التطبيق بأحدث نسخة — بياناتك المالية لا تتأثر</div>
          </div>
          {busy === 'cache' && <div className="text-[11px] text-[var(--color-text-3)]">جارٍ...</div>}
        </button>

        <button
          onClick={handleResetData}
          disabled={busy !== null}
          className="flex items-center justify-between rounded-2xl border px-4 py-3.5 text-right disabled:opacity-50"
          style={{ borderColor: 'rgba(255,92,92,0.3)', background: 'rgba(255,92,92,0.08)' }}
        >
          <div>
            <div className="text-[13.5px] font-bold" style={{ color: 'var(--color-expense)' }}>
              حذف البيانات التجريبية وتصفير الحسابات
            </div>
            <div className="text-[11.5px] text-[var(--color-text-3)]">يحذف كل الأشخاص والحركات والاشتراكات، ويصفّر رصيد كل حساب</div>
          </div>
        </button>

        {message && (
          <div className="rounded-2xl p-3 text-center text-[12px] font-semibold" style={{ background: 'rgba(0,226,138,0.12)', color: 'var(--color-accent)' }}>
            {message}
          </div>
        )}
      </div>

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
