import { useNavigate } from 'react-router-dom'
import { ScreenScroll } from '../components/ScreenScroll'
import { AppLogo } from '../components/AppLogo'
import { APP_VERSION, BRAND_NAME, BUILD_ID, DEVELOPER_NAME } from '../lib/version'

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-white/6 py-3 last:border-b-0">
      <div className="text-[12.5px] text-[var(--color-text-2)]">{label}</div>
      <div className="text-[13px] font-semibold">{value}</div>
    </div>
  )
}

function FeatureRow({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-3 py-2">
      <div
        className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-[10px]"
        style={{ width: 32, height: 32, background: 'rgba(255,255,255,0.12)', color: 'var(--color-accent)' }}
      >
        {icon}
      </div>
      <div className="text-[12.5px] font-semibold text-[var(--color-text-2)]">{text}</div>
    </div>
  )
}

export function AboutScreen() {
  const navigate = useNavigate()

  return (
    <ScreenScroll
      header={
        <div className="safe-top flex items-center justify-between px-5 pt-8 pb-6">
          <button onClick={() => navigate(-1)} className="text-[13px] text-[var(--color-text-2)]">
            → رجوع
          </button>
          <div className="text-base font-bold">حول التطبيق</div>
          <div className="w-10" />
        </div>
      }
    >
      <div
        className="mb-4 flex flex-col items-center rounded-3xl border border-[var(--color-border)] py-7"
        style={{ background: 'linear-gradient(160deg, #141417 0%, #0E0E10 100%)', boxShadow: '0 0 40px -14px rgba(255,255,255,0.18)' }}
      >
        <AppLogo tagline="" />
        <div
          className="num mt-3 rounded-full px-3 py-1 text-[11.5px] font-bold"
          style={{ background: 'rgba(255,255,255,0.12)', color: 'var(--color-accent)' }}
        >
          الإصدار {APP_VERSION}
        </div>
      </div>

      <div className="mb-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        <div className="mb-1.5 text-[13px] font-bold">محفظتك المالية، بين يديك بالكامل</div>
        <div className="text-[12.5px] leading-relaxed text-[var(--color-text-2)]">
          QB-Nomia تطبيق ويب تقدمي (PWA) لإدارة أموالك الشخصية — يعمل بدون إنترنت، وكل بياناتك تُخزَّن محليًا على جهازك فقط،
          بدون أي خادم يجمعها أو يطّلع عليها.
        </div>
      </div>

      <div className="mb-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        <div className="mb-1 text-[13px] font-bold text-[var(--color-text-2)]">أبرز المزايا</div>
        <FeatureRow
          text="حسابات وحركات وتقارير مالية"
          icon={
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="6" width="18" height="13" rx="3" />
              <path d="M3 10 H21" />
            </svg>
          }
        />
        <FeatureRow
          text="تتبّع السلف بين الأشخاص"
          icon={
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="9" cy="8" r="3" />
              <path d="M3 19c0-3.3 2.7-5 6-5s6 1.7 6 5" />
            </svg>
          }
        />
        <FeatureRow
          text="إدارة الاشتراكات الشهرية والسنوية"
          icon={
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="8,6 18,12 8,18" />
            </svg>
          }
        />
        <FeatureRow
          text="مزامنة مشفّرة اختيارية مع Google Sheets"
          icon={
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17.5 19a4.5 4.5 0 0 0 0-9 6 6 0 0 0-11.4-1.8A4 4 0 0 0 6.5 16" />
              <path d="M12 12v6M9.5 15.5 12 18l2.5-2.5" />
            </svg>
          }
        />
      </div>

      <div className="mb-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        <InfoRow label="المطوّر" value={DEVELOPER_NAME} />
        <InfoRow label="بواسطة" value={BRAND_NAME} />
        <InfoRow label="الإصدار" value={APP_VERSION} />
        <InfoRow label="بصمة البناء" value={BUILD_ID} />
      </div>

      <div className="pb-2 text-center text-[11px] text-[var(--color-text-3)]">
        © {new Date().getFullYear()} {BRAND_NAME} — جميع الحقوق محفوظة
      </div>
    </ScreenScroll>
  )
}
