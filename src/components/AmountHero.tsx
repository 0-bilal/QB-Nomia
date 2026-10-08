/**
 * عرض المبلغ البطل فوق لوحة الأرقام (AmountPad) بكل شاشات الإدخال: سؤال قصير،
 * الرقم كبير بلون نوع الحركة مع نبضة عند كل ضغطة، والعملة أصغر بجانبه.
 */
export function AmountHero({ amount, color, label = 'المبلغ', className = 'mb-5' }: { amount: string; color: string; label?: string; className?: string }) {
  const [whole, decimals] = amount.split('.')
  const shown = amount ? Number(whole || 0).toLocaleString('en-US') + (decimals !== undefined ? `.${decimals}` : '') : '0'
  return (
    <div className={`text-center ${className}`}>
      <div className="mb-1 text-[12.5px] text-[var(--color-text-2)]">{label}</div>
      <div dir="ltr" className="num inline-flex items-baseline justify-center gap-2 font-bold" style={{ color, transition: 'color 240ms ease' }}>
        <span key={amount} className="text-[50px] leading-tight tracking-tight" style={{ animation: 'qb-pop 260ms var(--ease-spring) both' }}>
          {shown}
        </span>
        <span className="font-sans text-[18px] font-medium opacity-60">ر.س</span>
      </div>
    </div>
  )
}
