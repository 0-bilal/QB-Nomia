export function formatMoney(amount: number): string {
  const rounded = Math.round(amount * 100) / 100
  return `${rounded.toLocaleString('en-US')} ر.س`
}

export function formatSigned(amount: number): string {
  const sign = amount > 0 ? '+' : amount < 0 ? '−' : ''
  return `${sign}${formatMoney(Math.abs(amount))}`
}

// تنسيق موحّد لعرض التواريخ بكل التطبيق: YYYY/MM/DD ميلادي (مثال: 2026/08/19).
export function formatDate(iso: string): string {
  const d = new Date(iso)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}/${m}/${day}`
}
