import { createRoot } from 'react-dom/client'
import { createElement } from 'react'
import { PrintableReport } from '../components/PrintableReport'
import type { ReportData } from './reportData'

/** يركّب تقرير الطباعة خارج الشاشة، يصدّره PDF بمقاس A4، ثم يزيله فورًا. */
export async function exportReportPdf(data: ReportData, filename: string): Promise<void> {
  const container = document.createElement('div')
  container.style.position = 'fixed'
  container.style.top = '0'
  container.style.left = '-10000px'
  container.style.zIndex = '-1'
  document.body.appendChild(container)

  const root = createRoot(container)
  root.render(createElement(PrintableReport, { data }))

  // ننتظر رسم React ثم تحميل الخطوط فعليًا قبل الالتقاط، حتى ما ينكتب المحتوى بخط احتياطي غير مضبوط القياس.
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
  if (document.fonts?.ready) await document.fonts.ready

  try {
    const target = container.firstElementChild as HTMLElement | null
    if (target) {
      const { htmlElementToA4Pdf } = await import('./htmlToPdf')
      await htmlElementToA4Pdf(target, filename)
    }
  } finally {
    root.unmount()
    container.remove()
  }
}
