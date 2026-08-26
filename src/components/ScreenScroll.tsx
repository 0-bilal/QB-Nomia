import type { ReactNode } from 'react'

/**
 * كل شاشة مستقلة (خارج AppShell) لازم تستخدم هذا الغلاف: header/footer
 * ثابتان، والمحتوى بينهما هو الوحيد اللي يتمرر. body مقفول بالكامل
 * (index.css) فأي شاشة ما تستخدم هذا النمط بيصير محتواها الزائد مقصوص
 * بدل ما يتمرر — هذا هو اللي يخلي التطبيق يحس "تطبيق" مو "موقع ويب".
 */
export function ScreenScroll({
  header,
  footer,
  children,
  contentClassName = 'px-5 pb-4',
}: {
  header?: ReactNode
  footer?: ReactNode
  children: ReactNode
  contentClassName?: string
}) {
  return (
    <div dir="rtl" className="flex h-full flex-col overflow-hidden">
      {header}
      <div className={`flex-1 overflow-y-auto ${contentClassName}`}>{children}</div>
      {footer}
    </div>
  )
}
