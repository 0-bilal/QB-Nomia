import type { ReactNode } from 'react'
import { FloatingTitle } from './FloatingTitle'
import { useScrolledPast } from '../hooks/useScrolledPast'

/** ارتفاع منطقة الأزرار العائمة أعلى الشاشة (فوق منطقة الأمان). */
export const FLOATING_ROW_OFFSET = 60

/**
 * صف عائم يلتصق أعلى حاوية التمرير بارتفاع صفر: الأزرار تطفو بمكانها، وكبسولة العنوان تظهر بالمنتصف بعد التمرير.
 * `start` بجهة البداية (يمين بالعربي)، `end` بالجهة المقابلة.
 */
export function FloatingHeaderRow({ title, visible, start, end }: { title: string; visible: boolean; start?: ReactNode; end?: ReactNode }) {
  return (
    <div className="sticky top-0 z-30 -mx-5 h-0">
      <div className="relative flex items-center justify-between gap-2 px-5" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)', height: 'calc(env(safe-area-inset-top, 0px) + 52px)' }}>
        <div className="flex items-center gap-2">{start}</div>
        <div style={{ position: 'absolute', left: 0, right: 0, top: 'calc(env(safe-area-inset-top, 0px) + 12px)', height: 40 }}>
          <FloatingTitle title={title} visible={visible} />
        </div>
        <div className="relative z-20 flex items-center gap-2">{end}</div>
      </div>
    </div>
  )
}

/**
 * رأس التبويبات الرئيسية (الحسابات/السلف/المزيد) — النمط "ج": العنوان الكبير والسطر الفرعي يتمرران مع الصفحة،
 * أزرار الإجراء تطفو ثابتة أعلى الشاشة، وكبسولة باسم الصفحة تظهر بالمنتصف بعد تمرير العنوان.
 */
export function TabHeader({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  const [titleRef, past] = useScrolledPast<HTMLDivElement>(FLOATING_ROW_OFFSET)
  return (
    <>
      <FloatingHeaderRow title={title} visible={past} end={actions} />
      <div ref={titleRef} className="safe-top mb-5 min-w-0 pt-[64px]">
        <h1 className="truncate text-[30px] font-semibold leading-tight tracking-tight">{title}</h1>
        {subtitle && <div className="mt-0.5 truncate text-[12.5px] text-[var(--color-text-3)]">{subtitle}</div>}
      </div>
    </>
  )
}

/** زر إجراء دائري زجاجي لرأس التبويب — نفس مقاس زر العين والجرس. */
export function HeaderIconButton({ onClick, label, children, accent = false }: { onClick: () => void; label: string; children: ReactNode; accent?: boolean }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className={`qb-press flex items-center justify-center rounded-full ${accent ? '' : 'qb-glass-circle border'}`}
      style={
        accent
          ? { width: 40, height: 40, background: 'var(--color-accent)', color: 'var(--color-on-accent)', boxShadow: '0 10px 24px -10px rgba(255,255,255,0.35)' }
          : { width: 40, height: 40, color: 'var(--color-text)' }
      }
    >
      {children}
    </button>
  )
}

export function PlusGlyph({ size = 19 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}
