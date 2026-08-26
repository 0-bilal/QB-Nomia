export function formatMoney(amount: number): string {
  const rounded = Math.round(amount * 100) / 100
  return `${rounded.toLocaleString('en-US')} ر.س`
}

export function formatSigned(amount: number): string {
  const sign = amount > 0 ? '+' : amount < 0 ? '−' : ''
  return `${sign}${formatMoney(Math.abs(amount))}`
}

export function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('ar-SA', { day: 'numeric', month: 'short' })
}
