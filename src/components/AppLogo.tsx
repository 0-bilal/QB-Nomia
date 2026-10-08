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

/**
 * شعار التطبيق (الأيقونة فقط) — مربع أبيض لؤلؤي بزوايا ناعمة (أو دائرة بـ round) وسهم
 * صاعد أسود، مع نقطة رمادية صغيرة كتوقيع للهوية.
 */
export function AppLogoMark({ size = 34, round = false }: { size?: number; round?: boolean }) {
  return (
    <div
      className="relative flex flex-shrink-0 items-center justify-center"
      style={{
        background: 'linear-gradient(150deg, var(--color-accent-a), var(--color-accent) 55%, var(--color-accent-b))',
        width: size,
        height: size,
        borderRadius: round ? size : size * 0.32,
        boxShadow: `0 ${size * 0.18}px ${size * 0.5}px -${size * 0.2}px rgba(255,255,255,0.28), inset 0 1px 0 rgba(255,255,255,0.55)`,
      }}
    >
      <svg viewBox="0 0 24 24" width={size * 0.56} height={size * 0.56} fill="none" stroke="var(--color-on-accent)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <ArrowGlyphPaths />
      </svg>
      <span
        className="absolute rounded-full"
        style={{
          width: size * 0.2,
          height: size * 0.2,
          bottom: size * 0.12,
          left: size * 0.12,
          background: '#6b6b75',
          boxShadow: '0 0 0 1.5px #ffffff',
        }}
      />
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

export function AppLogo({ tagline = 'محفظتك المالية الشخصية', size = 44 }: { tagline?: string; size?: number }) {
  return (
    <div className="flex flex-col items-center">
      <AppLogoMark size={size} />
      <div className="mt-3.5 text-[22px] font-semibold tracking-tight">
        <span className="num">QB</span>
        <span className="text-[var(--color-accent)]">·</span>
        <span className="num">Nomia</span>
      </div>
      {tagline && <div className="mt-1 text-[13px] text-[var(--color-text-2)]">{tagline}</div>}
    </div>
  )
}
