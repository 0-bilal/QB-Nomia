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

export const SHEETS_WEB_APP_URL = ''
export const SHEETS_SECRET_TOKEN = ''

export function isSheetsSyncConfigured(): boolean {
  return SHEETS_WEB_APP_URL.trim().length > 0 && SHEETS_SECRET_TOKEN.trim().length > 0
}
