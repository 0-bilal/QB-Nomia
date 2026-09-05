import type { ReportData } from './reportData'

const HEADER_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF111111' } } as const
const HEADER_FONT = { color: { argb: 'FFFFFFFF' }, bold: true } as const
const THIN_BORDER = { style: 'thin', color: { argb: 'FFDADADA' } } as const

/** يصدّر ملف Excel احترافي التنسيق (خلايا منسّقة، رؤوس ملوّنة، عرض أعمدة مناسب) بورقتين: ملخص وحركات. */
export async function exportReportExcel(data: ReportData, filename: string): Promise<void> {
  const ExcelJS = (await import('exceljs')).default

  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'QB-Nomia'
  workbook.created = new Date()

  const summarySheet = workbook.addWorksheet('الملخص', { views: [{ rightToLeft: true }] })
  summarySheet.columns = [
    { header: 'البند', key: 'label', width: 28 },
    { header: 'القيمة', key: 'value', width: 20 },
  ]
  styleHeaderRow(summarySheet.getRow(1))

  const summaryRows = [
    ['الفترة', data.periodLabel],
    ['تاريخ الإصدار', data.generatedAtLabel],
    ['الدخل', data.income],
    ['المصروف', data.expense],
    ['صافي التوفير', data.net],
    ['نسبة الادخار', data.savingsRate === null ? '—' : `${data.savingsRate}%`],
  ]
  for (const [label, value] of summaryRows) {
    const row = summarySheet.addRow({ label, value })
    if (typeof value === 'number') row.getCell('value').numFmt = '#,##0.00 "ر.س"'
    styleBodyRow(row)
  }

  summarySheet.addRow([])
  const catHeaderRow = summarySheet.addRow(['الفئة', 'المبلغ', 'النسبة'])
  styleHeaderRow(catHeaderRow)
  for (const c of data.categoryRows) {
    const row = summarySheet.addRow([c.name, c.spent, `${c.pct}%`])
    row.getCell(2).numFmt = '#,##0.00 "ر.س"'
    styleBodyRow(row)
  }

  if (data.extras?.subscriptions && data.extras.subscriptions.length > 0) {
    summarySheet.addRow([])
    const subHeaderRow = summarySheet.addRow(['الاشتراك', 'دورة الفوترة', 'التكلفة'])
    styleHeaderRow(subHeaderRow)
    for (const s of data.extras.subscriptions) {
      const row = summarySheet.addRow([s.name, s.billingCycleLabel, s.cost])
      row.getCell(3).numFmt = '#,##0.00 "ر.س"'
      styleBodyRow(row)
    }
  }

  if (data.extras?.commitments && data.extras.commitments.length > 0) {
    summarySheet.addRow([])
    const comHeaderRow = summarySheet.addRow(['الالتزام', 'التكلفة'])
    styleHeaderRow(comHeaderRow)
    for (const c of data.extras.commitments) {
      const row = summarySheet.addRow([c.name, c.cost])
      row.getCell(2).numFmt = '#,##0.00 "ر.س"'
      styleBodyRow(row)
    }
  }

  if (data.extras?.debts) {
    summarySheet.addRow([])
    const debtHeaderRow = summarySheet.addRow(['ملخص الديون', ''])
    styleHeaderRow(debtHeaderRow)
    const oweRow = summarySheet.addRow(['إجمالي عليك (سلف أشخاص)', data.extras.debts.totalIOwe])
    oweRow.getCell(2).numFmt = '#,##0.00 "ر.س"'
    styleBodyRow(oweRow)
    const owedRow = summarySheet.addRow(['مستحق لك (سلف أشخاص)', data.extras.debts.totalOwedToMe])
    owedRow.getCell(2).numFmt = '#,##0.00 "ر.س"'
    styleBodyRow(owedRow)
  }

  if (data.extras?.vehicleCostPerKm != null) {
    summarySheet.addRow([])
    const vehHeaderRow = summarySheet.addRow(['تكلفة السيارة', ''])
    styleHeaderRow(vehHeaderRow)
    const costRow = summarySheet.addRow(['التكلفة لكل كيلومتر', data.extras.vehicleCostPerKm])
    costRow.getCell(2).numFmt = '#,##0.00 "ر.س/كم"'
    styleBodyRow(costRow)
  }

  const txSheet = workbook.addWorksheet('الحركات', { views: [{ rightToLeft: true }] })
  txSheet.columns = [
    { header: 'التاريخ', key: 'date', width: 14 },
    { header: 'النوع', key: 'type', width: 12 },
    { header: 'البيان', key: 'label', width: 26 },
    { header: 'الحساب', key: 'account', width: 20 },
    { header: 'المبلغ', key: 'amount', width: 16 },
  ]
  styleHeaderRow(txSheet.getRow(1))
  for (const t of data.transactionRows) {
    const row = txSheet.addRow({ date: t.date, type: t.typeLabel, label: t.label, account: t.account, amount: t.amount })
    const amountCell = row.getCell('amount')
    amountCell.numFmt = '#,##0.00 "ر.س";[Red]-#,##0.00 "ر.س"'
    styleBodyRow(row)
  }

  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  downloadBlob(blob, filename)
}

function styleHeaderRow(row: import('exceljs').Row): void {
  row.eachCell((cell) => {
    cell.fill = HEADER_FILL as unknown as import('exceljs').Fill
    cell.font = HEADER_FONT
    cell.alignment = { horizontal: 'right', vertical: 'middle' }
    cell.border = { top: THIN_BORDER, bottom: THIN_BORDER, left: THIN_BORDER, right: THIN_BORDER }
  })
  row.height = 22
}

function styleBodyRow(row: import('exceljs').Row): void {
  row.eachCell((cell) => {
    cell.alignment = { horizontal: 'right', vertical: 'middle' }
    cell.border = { bottom: THIN_BORDER }
  })
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}
