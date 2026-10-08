/**
 * كبسولة عنوان عائمة (النمط "ج") — تظهر في منتصف أعلى الشاشة بعد تمرير العنوان الكبير،
 * وتعرض اسم الصفحة فقط، مع هالة ضبابية خفيفة حولها حتى تبقى مقروءة فوق المحتوى المتمرر.
 */
export function FloatingTitle({ title, visible }: { title: string; visible: boolean }) {
  return (
    <div
      aria-hidden={!visible}
      className="pointer-events-none absolute left-1/2 top-1/2 z-10"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translate(-50%, -50%)' : 'translate(-50%, calc(-50% - 10px)) scale(0.92)',
        transition: 'opacity 220ms ease, transform 320ms cubic-bezier(0.22,1,0.36,1)',
      }}
    >
      <span
        className="absolute rounded-full"
        style={{
          inset: '-14px -24px',
          background: 'rgba(5,5,6,0.35)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          maskImage: 'radial-gradient(closest-side, #000 55%, transparent 100%)',
          WebkitMaskImage: 'radial-gradient(closest-side, #000 55%, transparent 100%)',
        }}
      />
      <span
        className="relative block max-w-[56vw] truncate whitespace-nowrap rounded-full border px-4 py-2 text-[13.5px] font-bold"
        style={{
          background: 'rgba(28,28,33,0.82)',
          borderColor: 'var(--color-border-strong)',
          backdropFilter: 'blur(20px) saturate(1.6)',
          WebkitBackdropFilter: 'blur(20px) saturate(1.6)',
          boxShadow: '0 12px 30px -12px rgba(0,0,0,0.8)',
        }}
      >
        {title}
      </span>
    </div>
  )
}
