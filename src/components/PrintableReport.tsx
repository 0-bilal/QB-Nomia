import { formatMoney, formatSigned } from '../lib/format'
import type { ReportData } from '../lib/reportData'

const PAGE_WIDTH = 794 // A4 @ 96dpi

const ink = '#111111'
const inkSoft = '#555555'
const inkFaint = '#888888'
const border = '#DADADA'
const lineLight = '#EFEFEF'

/** تقرير مطبوع بخلفية بيضاء وألوان محايدة — مصمم للطباعة/PDF بمقاس A4، منفصل تمامًا عن هوية التطبيق الداكنة. */
export function PrintableReport({ data }: { data: ReportData }) {
  return (
    <div
      dir="rtl"
      style={{
        width: PAGE_WIDTH,
        background: '#ffffff',
        color: ink,
        fontFamily: 'Tahoma, "Segoe UI", Arial, sans-serif',
        padding: '48px 44px',
        boxSizing: 'border-box',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `2px solid ${ink}`, paddingBottom: 16, marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>QB-Nomia</div>
          <div style={{ fontSize: 12, color: inkSoft, marginTop: 2 }}>التقرير المالي الشهري</div>
        </div>
        <div style={{ textAlign: 'left' }}>
          <div style={{ fontSize: 15, fontWeight: 700 }}>{data.periodLabel}</div>
          <div style={{ fontSize: 11, color: inkFaint, marginTop: 2 }}>تاريخ الإصدار: {data.generatedAtLabel}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 28 }}>
        <SummaryCard label="الدخل" value={formatMoney(data.income)} />
        <SummaryCard label="المصروف" value={formatMoney(data.expense)} />
        <SummaryCard label="صافي التوفير" value={formatMoney(data.net)} />
        <SummaryCard label="نسبة الادخار" value={data.savingsRate === null ? '—' : `${data.savingsRate}%`} />
      </div>

      <SectionTitle>المصاريف حسب الفئة</SectionTitle>
      {data.categoryRows.length === 0 ? (
        <EmptyNote text="لا توجد مصاريف مسجّلة في هذه الفترة" />
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 28, fontSize: 12 }}>
          <thead>
            <tr>
              <Th align="right">الفئة</Th>
              <Th align="left">المبلغ</Th>
              <Th align="left">النسبة</Th>
            </tr>
          </thead>
          <tbody>
            {data.categoryRows.map((c, i) => (
              <tr key={c.name} style={{ background: i % 2 === 0 ? '#ffffff' : '#FAFAFA' }}>
                <Td align="right">{c.name}</Td>
                <Td align="left" numeric>{formatMoney(c.spent)}</Td>
                <Td align="left" numeric>{c.pct}%</Td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <SectionTitle>كل الحركات ({data.transactionRows.length})</SectionTitle>
      {data.transactionRows.length === 0 ? (
        <EmptyNote text="لا توجد حركات مسجّلة في هذه الفترة" />
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5 }}>
          <thead>
            <tr>
              <Th align="right">التاريخ</Th>
              <Th align="right">النوع</Th>
              <Th align="right">البيان</Th>
              <Th align="right">الحساب</Th>
              <Th align="left">المبلغ</Th>
            </tr>
          </thead>
          <tbody>
            {data.transactionRows.map((t, i) => (
              <tr key={i} style={{ background: i % 2 === 0 ? '#ffffff' : '#FAFAFA' }}>
                <Td align="right" numeric>{t.date}</Td>
                <Td align="right">{t.typeLabel}</Td>
                <Td align="right">{t.label}</Td>
                <Td align="right">{t.account}</Td>
                <Td align="left" numeric color={t.amount < 0 ? '#B00020' : '#1B7A3E'}>
                  {formatSigned(t.amount)}
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div style={{ marginTop: 32, paddingTop: 12, borderTop: `1px solid ${border}`, fontSize: 10, color: inkFaint, textAlign: 'center' }}>
        تم إنشاء هذا التقرير تلقائيًا بواسطة تطبيق QB-Nomia
      </div>
    </div>
  )
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ border: `1px solid ${border}`, borderRadius: 8, padding: '12px 14px' }}>
      <div style={{ fontSize: 11, color: inkSoft, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 700 }}>{value}</div>
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, color: ink }}>{children}</div>
}

function EmptyNote({ text }: { text: string }) {
  return <div style={{ fontSize: 12, color: inkFaint, marginBottom: 28, padding: '16px 0', textAlign: 'center', border: `1px dashed ${border}`, borderRadius: 8 }}>{text}</div>
}

function Th({ children, align }: { children: string; align: 'right' | 'left' }) {
  return (
    <th style={{ textAlign: align, padding: '8px 10px', fontSize: 11, fontWeight: 700, color: '#ffffff', background: ink, borderBottom: `1px solid ${border}` }}>
      {children}
    </th>
  )
}

function Td({ children, align, numeric, color }: { children: React.ReactNode; align: 'right' | 'left'; numeric?: boolean; color?: string }) {
  return (
    <td
      style={{
        textAlign: align,
        padding: '7px 10px',
        borderBottom: `1px solid ${lineLight}`,
        fontVariantNumeric: numeric ? 'tabular-nums' : undefined,
        direction: numeric ? 'ltr' : undefined,
        color: color ?? ink,
        fontWeight: color ? 700 : 400,
      }}
    >
      {children}
    </td>
  )
}
