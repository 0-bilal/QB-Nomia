import { useNavigate } from 'react-router-dom'
import { useAuth } from '../state/AuthContext'

const ITEMS = [
  { label: 'فئات المصاريف', desc: 'إدارة فئات المصروفات والميزانيات', to: '/categories' },
  { label: 'مصادر الدخل', desc: 'إدارة مصادر دخلك المتعددة', to: '/income-sources' },
  { label: 'الاشتراكات', desc: 'يوتيوب، Google Play، وغيرها', soon: true },
  { label: 'التقارير', desc: 'ملخصات ورسوم بيانية شهرية', soon: true },
  { label: 'ربط Google Sheets', desc: 'مزامنة بياناتك مع حسابك', soon: true },
]

export function MoreScreen() {
  const navigate = useNavigate()
  const auth = useAuth()

  return (
    <div dir="rtl" className="safe-top px-5 pb-4 pt-15">
      <div className="mb-5 text-xl font-bold">المزيد</div>

      <div className="flex flex-col gap-2.5">
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
        onClick={() => {
          auth.lock()
          navigate('/login', { replace: true })
        }}
        className="mt-8 w-full rounded-2xl border border-[var(--color-border)] py-3.5 text-center text-[13.5px] font-semibold text-[var(--color-text-2)]"
      >
        قفل التطبيق
      </button>
    </div>
  )
}
