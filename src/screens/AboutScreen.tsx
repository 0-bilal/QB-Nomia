import { useNavigate } from 'react-router-dom'
import { ScreenScroll } from '../components/ScreenScroll'
import { ScreenHeader } from '../components/ScreenHeader'
import { AppLogo } from '../components/AppLogo'
import { APP_VERSION, BRAND_NAME, BUILD_ID, DEVELOPER_NAME } from '../lib/version'
import { SectionTitle } from '../components/ui'

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
    <div className="flex flex-col gap-3 rounded-[18px] bg-white/[0.03] p-3.5">
      <div className="flex flex-shrink-0 items-center justify-center rounded-full" style={{ width: 36, height: 36, background: 'var(--color-accent-soft)', color: 'var(--color-accent)' }}>
        {icon}
      </div>
      <div className="text-[12.5px] font-medium leading-snug">{text}</div>
    </div>
  )
}

export function AboutScreen() {
  const navigate = useNavigate()

  return (
    <ScreenScroll
      header={<ScreenHeader title="حول التطبيق" onBack={() => navigate(-1)} className="pt-8 pb-6" />}
    >
      <div className="qb-card-elevated qb-rise mb-4 flex flex-col items-center py-9">
        <AppLogo tagline="محفظتك المالية الشخصية" size={64} />
        <div
          className="num mt-3 rounded-full px-3 py-1 text-[11.5px] font-bold"
          style={{ background: 'var(--color-accent-soft)', color: 'var(--color-accent)' }}
        >
          الإصدار {APP_VERSION}
        </div>
      </div>

      <div className="qb-card mb-4 p-5">
        <div className="mb-2 text-[16px] font-semibold">محفظتك المالية، بين يديك بالكامل</div>
        <div className="text-[12.5px] leading-relaxed text-[var(--color-text-2)]">
          QB-Nomia تطبيق ويب تقدمي (PWA) لإدارة أموالك الشخصية — يعمل بدون إنترنت، وكل بياناتك تُخزَّن محليًا على جهازك فقط،
          بدون أي خادم يجمعها أو يطّلع عليها.
        </div>
      </div>

      <SectionTitle title="أبرز المزايا" />
      <div className="qb-card mb-4 grid grid-cols-2 gap-1 p-3">
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

      <SectionTitle title="معلومات" />
      <div className="qb-card mb-4 px-4 py-2">
        <InfoRow label="المطوّر" value={DEVELOPER_NAME} />
        <InfoRow label="بواسطة" value={BRAND_NAME} />
        <InfoRow label="الإصدار" value={APP_VERSION} />
        <InfoRow label="بصمة البناء" value={BUILD_ID} />
      </div>

      <a
        href="https://github.com/0-bilal/QB-Nomia/releases/latest/download/app-debug.apk"
        className="qb-btn-primary mb-2 flex w-full items-center justify-center gap-2 py-3.5 text-[14px]"
      >
        <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3v13" />
          <path d="M7 11l5 5 5-5" />
          <path d="M4 20h16" />
        </svg>
        تثبيت التطبيق كتطبيق أندرويد (APK)
      </a>
      <div className="mb-4 px-1 text-[11px] leading-relaxed text-[var(--color-text-3)]">
        بناء تجريبي مباشر، غير منشور على Google Play — عند فتح الملف بالهاتف بيطلب منك تفعيل "تثبيت من مصادر غير معروفة" أول مرة فقط
      </div>

      <div className="pb-2 text-center text-[11px] text-[var(--color-text-3)]">
        © {new Date().getFullYear()} {BRAND_NAME} — جميع الحقوق محفوظة
      </div>
    </ScreenScroll>
  )
}
