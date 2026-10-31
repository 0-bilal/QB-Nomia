// يصدّر marketing/reel.html إلى فيديو MP4 عمودي 1080×1920 إطارًا إطارًا.
// الاستخدام: node marketing/render-reel.mjs [fps=30] [out=marketing/qb-nomia-reel.mp4]
// يحتاج Playwright (Chromium) و ffmpeg.
import { createRequire } from 'node:module'
import { spawn } from 'node:child_process'
import { fileURLToPath, pathToFileURL } from 'node:url'
import path from 'node:path'

// require بدل import حتى يلقى Playwright المثبّت عامًّا (NODE_PATH) لو مو في node_modules
const { chromium } = createRequire(import.meta.url)('playwright')
const here = path.dirname(fileURLToPath(import.meta.url))
const fps = Number(process.argv[2] ?? 30)
const out = process.argv[3] ?? path.join(here, 'qb-nomia-reel.mp4')

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 540, height: 960 }, deviceScaleFactor: 2 })
await page.goto(pathToFileURL(path.join(here, 'reel.html')).href + '?render', { waitUntil: 'networkidle' })
await page.evaluate(() => window.__ready)
const duration = await page.evaluate(() => window.__duration)
const frames = Math.round(duration * fps)

const ff = spawn('ffmpeg', [
  '-y', '-loglevel', 'error',
  '-f', 'image2pipe', '-framerate', String(fps), '-i', '-',
  '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-preset', 'slow', '-crf', '18',
  '-movflags', '+faststart', out,
], { stdio: ['pipe', 'inherit', 'inherit'] })

for (let i = 0; i < frames; i++) {
  await page.evaluate(t => window.__seek(t), i / fps)
  const buf = await page.screenshot({ type: 'png' })
  if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r))
  if (i % fps === 0) process.stdout.write(`\r${(i / fps).toFixed(0)}s / ${duration}s`)
}
ff.stdin.end()
await new Promise((res, rej) => ff.on('close', c => (c === 0 ? res() : rej(new Error('ffmpeg ' + c)))))
await browser.close()
console.log(`\nتم: ${out}`)
