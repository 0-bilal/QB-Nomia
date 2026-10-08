import release from '../release.json'

/** رقم الإصدار وملاحظاته مصدرهما src/release.json — نفس الملف يُنشر كـ version.json مع كل بناء (vite.config.ts) لفحص التحديثات. */
export const APP_VERSION: string = release.version
export const DEVELOPER_NAME = 'بلال الخواجة'
export const BRAND_NAME = 'برمجيات QB'

/** أبرز تغييرات الإصدار الحالي — تُعرض بشاشة حول التطبيق وبورقة التحديث، وتُحدَّث مع كل رفع للإصدار في release.json. */
export const RELEASE_NOTES: string[] = release.notes

/** بصمة فريدة لكل بناء (git commit) — تتغيّر تلقائيًا مع كل نشر حتى لو نسينا رفع APP_VERSION يدويًا. حقنها vite.config.ts وقت البناء. */
export const BUILD_ID = __BUILD_ID__
