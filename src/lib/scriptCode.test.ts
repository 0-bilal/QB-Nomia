import { describe, expect, it } from 'vitest'
import { buildScriptCode, checkWebAppUrl, generateSyncToken, groupToken, TOKEN_LENGTH, TOKEN_PLACEHOLDER } from './scriptCode'

describe('generateSyncToken', () => {
  it('يولّد رمزًا بالطول المطلوب من أبجدية بدون أحرف متشابهة', () => {
    const t = generateSyncToken()
    expect(t).toHaveLength(TOKEN_LENGTH)
    expect(t).toMatch(/^[A-HJ-NP-Za-km-z2-9]+$/)
  })

  it('كل مرة رمز مختلف', () => {
    expect(generateSyncToken()).not.toBe(generateSyncToken())
  })
})

describe('groupToken', () => {
  it('يقسّم الرمز لمجموعات من 8 بدون مسافة بالنهاية', () => {
    expect(groupToken('abcdefgh12345678xyz')).toBe('abcdefgh 12345678 xyz')
    expect(groupToken('abcdefgh')).toBe('abcdefgh')
  })
})

describe('buildScriptCode', () => {
  it('يحقن الرمز مكان القيمة الافتراضية في Code.gs الحقيقي', () => {
    const code = buildScriptCode('MyToken123')
    expect(code).toContain("var SECRET_TOKEN = 'MyToken123'")
    expect(code).toContain('function doPost(e)')
    expect(code).toContain('function getSpreadsheet()')
    // فحص القيمة الافتراضية في checkToken يبقى كما هو
    expect(code).toContain(`SECRET_TOKEN === '${TOKEN_PLACEHOLDER}'`)
  })

  it('ما يسمح بكسر النص بعلامة اقتباس', () => {
    expect(buildScriptCode("a'b\\c", `var SECRET_TOKEN = '${TOKEN_PLACEHOLDER}'`)).toBe("var SECRET_TOKEN = 'abc'")
  })
})

describe('checkWebAppUrl', () => {
  it('يقبل رابط /exec', () => {
    expect(checkWebAppUrl('https://script.google.com/macros/s/AKfycbx7Qm2nB_demo9hKe0LwPq3rTz/exec')).toBe('ok')
    expect(checkWebAppUrl('  https://script.google.com/a/macros/acme.com/s/AKfycbx7Qm2nB_demo9hKe0LwPq3rTz/exec/ ')).toBe('ok')
  })

  it('يميّز رابط الاختبار /dev', () => {
    expect(checkWebAppUrl('https://script.google.com/macros/s/AKfycbx7Qm2nB_demo9hKe0LwPq3rTz/dev')).toBe('dev')
  })

  it('يرفض غيرها', () => {
    expect(checkWebAppUrl('')).toBe('empty')
    expect(checkWebAppUrl('https://script.google.com/home/projects/abc/edit')).toBe('bad')
    expect(checkWebAppUrl('http://script.google.com/macros/s/AKfycbx7Qm2nB_demo9hKe0LwPq3rTz/exec')).toBe('bad')
  })
})
