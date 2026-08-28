import { afterEach } from 'vitest'
import { webcrypto } from 'node:crypto'

// jsdom's crypto has getRandomValues لكنه ما يطبّق crypto.subtle (SubtleCrypto) —
// نستبدله بتطبيق Node الأصلي حتى تشتغل auth.ts وcryptoUtil.ts (تشفير/تحقق PIN ومزامنة Sheets) بالاختبارات.
if (!globalThis.crypto?.subtle) {
  Object.defineProperty(globalThis, 'crypto', { value: webcrypto, configurable: true })
}

afterEach(() => {
  localStorage.clear()
})
