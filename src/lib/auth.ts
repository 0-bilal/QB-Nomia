const STORAGE_KEY = 'qbnomia.auth'

interface StoredAuth {
  salt: string
  hash: string
  digits: number
}

function bytesToHex(bytes: ArrayBuffer): string {
  return Array.from(new Uint8Array(bytes))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

function randomSalt(): string {
  const arr = new Uint8Array(16)
  crypto.getRandomValues(arr)
  return bytesToHex(arr.buffer)
}

async function hashPin(pin: string, salt: string): Promise<string> {
  const data = new TextEncoder().encode(salt + pin)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return bytesToHex(digest)
}

function readStored(): StoredAuth | null {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as StoredAuth
  } catch {
    return null
  }
}

export function hasPinConfigured(): boolean {
  return readStored() !== null
}

export async function setupPin(pin: string): Promise<void> {
  const salt = randomSalt()
  const hash = await hashPin(pin, salt)
  const stored: StoredAuth = { salt, hash, digits: pin.length }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stored))
}

export async function verifyPin(pin: string): Promise<boolean> {
  const stored = readStored()
  if (!stored) return false
  const hash = await hashPin(pin, stored.salt)
  return hash === stored.hash
}

export function configuredDigits(): number {
  return readStored()?.digits ?? 6
}

export function resetPin(): void {
  localStorage.removeItem(STORAGE_KEY)
}
