import { useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { ScreenScroll } from '../components/ScreenScroll'
import { ScreenHeader } from '../components/ScreenHeader'
import { AppLogoMark } from '../components/AppLogo'
import { APP_VERSION, BRAND_NAME, BUILD_ID, DEVELOPER_NAME, RELEASE_NOTES } from '../lib/version'

function Svg({ size = 16, children }: { size?: number; children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  )
}

function SectionHead({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="mx-1.5 mb-2.5 mt-6 flex items-baseline justify-between gap-2">
      <div className="text-[13px] font-semibold">{title}</div>
      {hint && <div className="num text-[11px] text-[var(--color-text-3)]">{hint}</div>}
    </div>
  )
}

const PROMISES: { title: string; desc: string; icon: ReactNode }[] = [
  {
    title: 'بياناتك على جهازك فقط',
    desc: 'لا يوجد خادم يجمع بياناتك أو يطّلع عليها.',
    icon: (
      <Svg>
        <rect x="5" y="2" width="14" height="20" rx="3" />
        <path d="M11 18h2" />
      </Svg>
    ),
  },
  {
    title: 'يعمل بدون إنترنت',
    desc: 'تطبيق ويب تقدّمي (PWA) يفتح ويحفظ حتى بدون اتصال.',
    icon: (
      <Svg>
        <path d="M5 12.5a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0M2 9a15 15 0 0 1 20 0" />
        <path d="M12 19.5h.01" />
      </Svg>
    ),
  },
  {
    title: 'مزامنة مشفّرة اختيارية',
    desc: 'نسخة مشفّرة على Google Sheets لا يقرؤها أحد غيرك.',
    icon: (
      <Svg>
        <rect x="4" y="10" width="16" height="11" rx="2.5" />
        <path d="M8 10V7a4 4 0 0 1 8 0v3" />
      </Svg>
    ),
  },
]

const FEATURES: { label: string; color: string; bg: string; icon: ReactNode }[] = [
  {
    label: 'الحسابات والبطاقات',
    color: 'var(--color-transfer)',
    bg: 'rgba(139,123,255,0.14)',
    icon: (
      <Svg size={17}>
        <rect x="3" y="6" width="18" height="13" rx="3" />
        <path d="M3 10h18" />
      </Svg>
    ),
  },
  {
    label: 'تقارير ومقارنات',
    color: 'var(--color-income)',
    bg: 'rgba(62,224,143,0.12)',
    icon: (
      <Svg size={17}>
        <path d="M4 19V10M10 19V5M16 19v-6M22 19H2" />
      </Svg>
    ),
  },
  {
    label: 'السلف والديون',
    color: 'var(--color-owed-to)',
    bg: 'rgba(46,230,200,0.12)',
    icon: (
      <Svg size={17}>
        <circle cx="9" cy="8" r="3" />
        <path d="M3 19c0-3.3 2.7-5 6-5s6 1.7 6 5" />
        <path d="M16 4a3 3 0 0 1 0 6M18 14c2 .6 3 2.2 3 5" />
      </Svg>
    ),
  },
  {
    label: 'الاشتراكات والالتزامات',
    color: 'var(--color-subscription)',
    bg: 'rgba(255,191,71,0.12)',
    icon: (
      <Svg size={17}>
        <rect x="3" y="5" width="18" height="16" rx="3" />
        <path d="M3 10h18M8 3v4M16 3v4" />
      </Svg>
    ),
  },
  {
    label: 'الأهداف والزكاة',
    color: 'var(--color-expense)',
    bg: 'rgba(255,95,109,0.12)',
    icon: (
      <Svg size={17}>
        <circle cx="12" cy="12" r="9" />
        <circle cx="12" cy="12" r="5" />
        <circle cx="12" cy="12" r="1.5" />
      </Svg>
    ),
  },
  {
    label: 'تصدير PDF و Excel',
    color: 'var(--color-text)',
    bg: 'var(--color-accent-soft)',
    icon: (
      <Svg size={17}>
        <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
        <path d="M14 3v5h5M9 13h6M9 17h4" />
      </Svg>
    ),
  },
]

function InfoRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-t border-[var(--color-border)] px-4 py-3 first:border-t-0">
      <div className="text-[12.5px] text-[var(--color-text-2)]">{label}</div>
      <div className="flex min-w-0 items-center gap-2 text-[13px] font-semibold">{children}</div>
    </div>
  )
}

export function AboutScreen() {
  const navigate = useNavigate()
  const [copied, setCopied] = useState(false)

  async function copyBuildId() {
    try {
      await navigator.clipboard.writeText(BUILD_ID)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      // الحافظة غير متاحة (سياق غير آمن مثلًا) — البصمة ظاهرة ويمكن نسخها يدويًا.
    }
  }

  return (
    <ScreenScroll header={<ScreenHeader title="حول التطبيق" onBack={() => navigate(-1)} className="pt-8 pb-6" />}>
      <div className="qb-card-elevated qb-rise flex flex-col items-center px-5 pb-6 pt-8 text-center">
        <AppLogoMark size={72} />
        <div className="mt-3.5 text-[24px] font-bold tracking-tight">
          <span className="num">QB</span>
          <span className="text-[var(--color-text-3)]">·</span>
          <span className="num">Nomia</span>
        </div>
        <div className="mt-0.5 text-[13px] text-[var(--color-text-2)]">محفظتك المالية الشخصية</div>
        <div className="mt-3.5 flex flex-wrap justify-center gap-1.5">
          <span className="num rounded-full px-3 py-1 text-[11.5px] font-bold" style={{ background: 'var(--color-accent)', color: 'var(--color-on-accent)' }}>
            الإصدار {APP_VERSION}
          </span>
          <span className="rounded-full px-3 py-1 text-[11.5px] font-semibold" style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--color-text-2)' }}>
            PWA · أندرويد
          </span>
        </div>
      </div>

      <SectionHead title="خصوصيتك أولًا" />
      <div className="qb-card px-4 py-1">
        {PROMISES.map((p) => (
          <div key={p.title} className="flex items-start gap-3 border-t border-[var(--color-border)] py-3 first:border-t-0">
            <div className="flex flex-shrink-0 items-center justify-center rounded-full" style={{ width: 34, height: 34, background: 'var(--color-accent-soft)' }}>
              {p.icon}
            </div>
            <div className="min-w-0">
              <div className="text-[13.5px] font-semibold">{p.title}</div>
              <div className="mt-0.5 text-[11.5px] leading-relaxed text-[var(--color-text-3)]">{p.desc}</div>
            </div>
          </div>
        ))}
      </div>

      <SectionHead title="أبرز المزايا" />
      <div className="grid grid-cols-3 gap-2">
        {FEATURES.map((f) => (
          <div key={f.label} className="qb-card px-2 pb-3 pt-3.5 text-center" style={{ borderRadius: 20 }}>
            <div className="mx-auto mb-2 flex items-center justify-center rounded-full" style={{ width: 38, height: 38, background: f.bg, color: f.color }}>
              {f.icon}
            </div>
            <div className="text-[11.5px] font-semibold leading-snug">{f.label}</div>
          </div>
        ))}
      </div>

      {RELEASE_NOTES.length > 0 && (
        <>
          <SectionHead title="ما الجديد" hint={APP_VERSION} />
          <div className="qb-card px-4 py-1.5">
            {RELEASE_NOTES.map((note) => (
              <div key={note} className="flex gap-2.5 py-2 text-[12.5px] leading-relaxed text-[var(--color-text-2)]">
                <span className="mt-2 flex-shrink-0 rounded-full bg-[var(--color-accent)]" style={{ width: 6, height: 6 }} />
                {note}
              </div>
            ))}
          </div>
        </>
      )}

      <SectionHead title="تطبيق أندرويد" />
      <div className="qb-card flex items-center gap-3.5 p-4">
        <div className="flex flex-shrink-0 items-center justify-center rounded-2xl" style={{ width: 48, height: 48, background: 'rgba(62,224,143,0.12)', color: 'var(--color-income)' }}>
          <Svg size={24}>
            <path d="M12 3v13M7 11l5 5 5-5M4 20h16" />
          </Svg>
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[14px] font-semibold">تثبيت ملف APK</div>
          <div className="mt-0.5 text-[11px] leading-relaxed text-[var(--color-text-3)]">
            بناء تجريبي غير منشور على Google Play — يطلب تفعيل «مصادر غير معروفة» أول مرة فقط.
          </div>
        </div>
      </div>
      <a
        href="https://github.com/0-bilal/QB-Nomia/releases/latest/download/app-debug.apk"
        className="qb-btn-primary mt-2.5 flex w-full items-center justify-center gap-2 py-3.5 text-[13.5px]"
      >
        <Svg size={17}>
          <path d="M12 3v13M7 11l5 5 5-5M4 20h16" />
        </Svg>
        تنزيل أحدث نسخة
      </a>

      <SectionHead title="معلومات" />
      <div className="qb-card">
        <InfoRow label="المطوّر">{DEVELOPER_NAME}</InfoRow>
        <InfoRow label="بواسطة">{BRAND_NAME}</InfoRow>
        <InfoRow label="الإصدار">
          <span className="num">{APP_VERSION}</span>
        </InfoRow>
        <InfoRow label="بصمة البناء">
          <span dir="ltr" className="num truncate">{BUILD_ID}</span>
          <button
            onClick={copyBuildId}
            className="qb-press flex flex-shrink-0 items-center gap-1 rounded-full bg-[var(--color-surface-high)] px-2.5 py-1 text-[11px] font-semibold text-[var(--color-text-2)]"
          >
            {copied ? (
              <Svg size={12}>
                <path d="M5 12.5 10 17l9-10" />
              </Svg>
            ) : (
              <Svg size={12}>
                <rect x="9" y="9" width="11" height="11" rx="2" />
                <path d="M5 15V6a2 2 0 0 1 2-2h9" />
              </Svg>
            )}
            {copied ? 'تم النسخ' : 'نسخ'}
          </button>
        </InfoRow>
      </div>

      <div className="pb-2 pt-6 text-center text-[11px] text-[var(--color-text-3)]">
        © {new Date().getFullYear()} {BRAND_NAME} — جميع الحقوق محفوظة
      </div>
    </ScreenScroll>
  )
}
