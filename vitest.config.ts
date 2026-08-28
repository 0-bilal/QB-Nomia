import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    // نثبّت المنطقة الزمنية UTC وقت التشغيل — بعض الدوال (formatDate، حسابات الزكاة) تحلّل
    // تواريخ ISO بصيغة "YYYY-MM-DD" اللي تُفسَّر دائمًا كـ UTC حسب المعيار، فلو شغّلنا
    // الاختبارات بمنطقة زمنية غير UTC راح تختلف النتائج حسب جهاز المطوّر أو خادم CI.
    env: { TZ: 'UTC' },
  },
})
