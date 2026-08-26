export function formatMoney(amount: number): string {
  const rounded = Math.round(amount * 100) / 100
  return `${rounded.toLocaleString('en-US')} ر.س`
}

export function formatSigned(amount: number): string {
  const sign = amount > 0 ? '+' : amount < 0 ? '−' : ''
  return `${sign}${formatMoney(Math.abs(amount))}`
}

// ar-SA-u-ca-gregory: التقويم الميلادي صراحة — ar-SA لوحدها تستخدم التقويم
// الهجري افتراضيًا بمتصفحات كثيرة، بينما كل تواريخ التطبيق ميلادية (ISO).
export function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('ar-SA-u-ca-gregory', { day: 'numeric', month: 'short' })
}
