/**
 * إعدادات مزامنة Google Sheets — تُضبط هنا بالكود مباشرة (مو من داخل التطبيق).
 *
 * 1) انشر سكربت google-apps-script/Code.gs على جدول Google Sheets الخاص بك
 *    (الخطوات كاملة في google-apps-script/README.md).
 * 2) انسخ رابط الـ Web App (ينتهي بـ /exec) وألصقه بـ SHEETS_WEB_APP_URL.
 * 3) انسخ نفس SECRET_TOKEN اللي حطيته بالسكربت وألصقه بـ SHEETS_SECRET_TOKEN.
 * 4) احفظ، وارفع (build + deploy) نسخة جديدة من التطبيق حتى تسري القيم.
 *
 * البيانات تُشفَّر بالكامل بهذا الرمز السري (AES-GCM، عبر src/lib/cryptoUtil.ts)
 * قبل إرسالها لجوجل وبعد استلامها منه — جوجل شيت نفسه يخزّن نصًا مشفّرًا غير
 * مقروء، لا بيانات مالية صريحة.
 */

export const SHEETS_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbw-gvFe4Tlkd4IpzqWgj0v_XVu3FgBn-vEG6h2wMh0E9XtDHZ8HmWbv0jsyjjx5ZzU7/exec'
export const SHEETS_SECRET_TOKEN = 'qbnomia-8f3a1c9d2e7b4560af91c3d8e2b7a4f1'

export function isSheetsSyncConfigured(): boolean {
  return SHEETS_WEB_APP_URL.trim().length > 0 && SHEETS_SECRET_TOKEN.trim().length > 0
}
