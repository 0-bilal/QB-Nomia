import { execSync } from 'node:child_process'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vite'

// https://vite.dev/config/
// نُشر التطبيق حاليًا على GitHub Pages كموقع مشروع (project site) على
// https://0-bilal.github.io/QB-Nomia/ — لذلك لازم base يطابق اسم المستودع
// حتى تتحمّل كل الأصول (JS/CSS/الأيقونة) من المسار الصحيح.
const base = '/QB-Nomia/'

// بصمة بناء فريدة (git commit) تُعرض بشاشة "حول التطبيق" — تتغيّر تلقائيًا
// مع كل نشر بدون الحاجة لتذكّر رفع رقم الإصدار يدويًا في كل مرة.
function buildId(): string {
  try {
    return execSync('git rev-parse --short HEAD').toString().trim()
  } catch {
    return 'dev'
  }
}

export default defineConfig({
  base,
  define: {
    __BUILD_ID__: JSON.stringify(buildId()),
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        id: base,
        name: 'QB-Nomia',
        short_name: 'QB-Nomia',
        description: 'محفظتك المالية الشخصية',
        lang: 'ar',
        dir: 'rtl',
        theme_color: '#000000',
        background_color: '#000000',
        display: 'standalone',
        orientation: 'portrait',
        start_url: base,
        scope: base,
        icons: [
          {
            src: 'icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any',
          },
        ],
        shortcuts: [
          {
            name: 'إضافة حركة سريعة',
            short_name: 'إضافة',
            url: `${base}add`,
            icons: [{ src: 'icon.svg', sizes: 'any', type: 'image/svg+xml' }],
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
      },
    }),
  ],
})
