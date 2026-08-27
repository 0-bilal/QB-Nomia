import { jsPDF } from 'jspdf'
import html2canvas from 'html2canvas'

/**
 * يحوّل عنصر HTML طويل إلى PDF مقاس A4 متعدد الصفحات — يرسم العنصر
 * كصورة واحدة طويلة (بخط ورسم المتصفح نفسه، فيضمن عرض العربي RTL
 * صحيحًا بدون أي تعامل يدوي مع تشكيل الحروف)، ثم يقص الصورة أفقيًا
 * لصفحات A4 متتالية.
 */
export async function htmlElementToA4Pdf(element: HTMLElement, filename: string): Promise<void> {
  const canvas = await html2canvas(element, { scale: 2, backgroundColor: '#ffffff', useCORS: true })

  const pdf = new jsPDF('p', 'mm', 'a4')
  const pageWidthMm = 210
  const pageHeightMm = 297
  const pxPerMm = canvas.width / pageWidthMm
  const pageHeightPx = Math.floor(pageHeightMm * pxPerMm)

  let renderedHeight = 0
  let firstPage = true
  while (renderedHeight < canvas.height) {
    const sliceHeight = Math.min(pageHeightPx, canvas.height - renderedHeight)
    const pageCanvas = document.createElement('canvas')
    pageCanvas.width = canvas.width
    pageCanvas.height = sliceHeight
    const ctx = pageCanvas.getContext('2d')
    if (!ctx) break
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height)
    ctx.drawImage(canvas, 0, renderedHeight, canvas.width, sliceHeight, 0, 0, canvas.width, sliceHeight)

    const imgData = pageCanvas.toDataURL('image/jpeg', 0.95)
    if (!firstPage) pdf.addPage()
    firstPage = false
    const imgHeightMm = sliceHeight / pxPerMm
    pdf.addImage(imgData, 'JPEG', 0, 0, pageWidthMm, imgHeightMm)

    renderedHeight += sliceHeight
  }

  pdf.save(filename)
}
