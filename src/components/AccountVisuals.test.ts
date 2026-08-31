import { describe, expect, it } from 'vitest'
import {
  ACCOUNT_CARD_ACCENT,
  ACCOUNT_CARD_ACCENT_BG,
  ACCOUNT_CARD_BG,
  ACCOUNT_CARD_TEXT_FAINT,
  ACCOUNT_CARD_TEXT_MUTED,
  ACCOUNT_ICON_BG,
  ACCOUNT_ICON_COLOR,
  ACCOUNT_TYPE_LABELS,
} from './AccountVisuals'
import type { AccountType } from '../types'

const TYPES: AccountType[] = ['cash', 'bank', 'savings', 'wallet', 'emergency']

describe('account visual records', () => {
  it('defines every value for every account type (no accidental gaps)', () => {
    const records = [
      ACCOUNT_ICON_COLOR,
      ACCOUNT_ICON_BG,
      ACCOUNT_TYPE_LABELS,
      ACCOUNT_CARD_BG,
      ACCOUNT_CARD_ACCENT,
      ACCOUNT_CARD_ACCENT_BG,
      ACCOUNT_CARD_TEXT_MUTED,
      ACCOUNT_CARD_TEXT_FAINT,
    ]
    for (const record of records) {
      for (const type of TYPES) {
        expect(record[type], `missing value for "${type}"`).toBeTruthy()
      }
    }
  })

  it('gives each account type its own distinct card background and label, no copy-paste collisions', () => {
    expect(new Set(TYPES.map((t) => ACCOUNT_CARD_BG[t])).size).toBe(TYPES.length)
    expect(new Set(TYPES.map((t) => ACCOUNT_TYPE_LABELS[t])).size).toBe(TYPES.length)
  })

  it('gives the emergency fund its own colors, distinct from every other account type', () => {
    const others: AccountType[] = ['cash', 'bank', 'savings', 'wallet']
    for (const other of others) {
      expect(ACCOUNT_CARD_BG.emergency).not.toBe(ACCOUNT_CARD_BG[other])
      expect(ACCOUNT_ICON_COLOR.emergency).not.toBe(ACCOUNT_ICON_COLOR[other])
      expect(ACCOUNT_CARD_ACCENT.emergency).not.toBe(ACCOUNT_CARD_ACCENT[other])
    }
    expect(ACCOUNT_TYPE_LABELS.emergency).toBe('طوارئ')
  })
})
