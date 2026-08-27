import type { CSSProperties } from 'react'

/** مسار سهم الشعار الصاعد — مصدر واحد يُعاد استخدامه بالشارة الملوّنة (AppLogoMark) وبعلامة الخلفية الشفافة (AppLogoWatermark). */
function ArrowGlyphPaths() {
  return (
    <>
      <path d="M4 17 L10 9 L14 13 L20 5" />
      <path d="M15 5 H20 V10" />
    </>
  )
}

/** شعار التطبيق (الأيقونة فقط، بدون الاسم) — مصدر واحد يُعاد استخدامه بأي حجم بأي مكان يحتاج علامة QB-Nomia. */
export function AppLogoMark({ size = 34 }: { size?: number }) {
  return (
    <div
      className="flex flex-shrink-0 items-center justify-center shadow-[0_6px_16px_-4px_rgba(255,255,255,0.55)]"
      style={{
        background: 'linear-gradient(150deg, var(--color-accent), var(--color-accent-b))',
        width: size,
        height: size,
        borderRadius: size * 0.29,
      }}
    >
      <svg viewBox="0 0 24 24" width={size * 0.53} height={size * 0.53} fill="none" stroke="#0A0A0C" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <ArrowGlyphPaths />
      </svg>
    </div>
  )
}

/** نسخة شفافة كبيرة من شعار السهم — تُستخدم كعلامة مائية بخلفية البطاقات البنكية. */
export function AppLogoWatermark({ size = 148, style }: { size?: number; style?: CSSProperties }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.1"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={style}
    >
      <ArrowGlyphPaths />
    </svg>
  )
}

export function AppLogo({ tagline = 'محفظتك المالية الشخصية' }: { tagline?: string }) {
  return (
    <div className="flex flex-col items-center">
      <div className="mb-1.5 flex items-center gap-2.5">
        <AppLogoMark />
        <div className="num text-[19px] font-bold tracking-tight">QB-Nomia</div>
      </div>
      {tagline && <div className="text-[13px] text-[var(--color-text-2)]">{tagline}</div>}
    </div>
  )
}
