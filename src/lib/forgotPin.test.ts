import { describe, expect, it } from 'vitest'
import { agoLabel, backupStatus, countLabel, waitLabel } from './forgotPin'
import { setSheetsSyncCredentials } from '../config/sheetsSync'

const W: [string, string, string, string] = ['دقيقة', 'دقيقتين', 'دقائق', 'دقيقة']

describe('countLabel', () => {
  it('uses singular, dual, plural and >10 forms', () => {
    expect(countLabel(1, W)).toBe('دقيقة')
    expect(countLabel(2, W)).toBe('دقيقتين')
    expect(countLabel(5, W)).toBe('5 دقائق')
    expect(countLabel(15, W)).toBe('15 دقيقة')
  })
})

describe('waitLabel', () => {
  it('shows seconds under a minute, minutes after', () => {
    expect(waitLabel(28_200)).toBe('29 ثانية')
    expect(waitLabel(60_000)).toBe('دقيقة')
    expect(waitLabel(120_000)).toBe('دقيقتين')
    expect(waitLabel(15 * 60_000)).toBe('15 دقيقة')
  })
})

describe('agoLabel', () => {
  const now = Date.parse('2026-11-05T12:00:00Z')
  it('describes how long ago a sync happened', () => {
    expect(agoLabel('2026-11-05T11:59:40Z', now)).toBe('قبل لحظات')
    expect(agoLabel('2026-11-05T11:57:00Z', now)).toBe('قبل 3 دقائق')
    expect(agoLabel('2026-11-05T10:00:00Z', now)).toBe('قبل ساعتين')
    expect(agoLabel('2026-11-04T12:00:00Z', now)).toBe('قبل يوم')
    expect(agoLabel('2026-10-31T12:00:00Z', now)).toBe('قبل 5 أيام')
  })
})

describe('backupStatus', () => {
  it('is none when Sheets sync is not linked', () => {
    expect(backupStatus()).toEqual({ kind: 'none' })
  })

  it('reports the last sync time when linked', () => {
    setSheetsSyncCredentials('https://script.google.com/macros/s/x/exec', 'tok')
    localStorage.setItem('qbnomia.sync.lastSyncedAt', '2026-11-05T11:57:00Z')
    expect(backupStatus()).toEqual({ kind: 'sheets', lastSyncedAt: '2026-11-05T11:57:00Z' })
  })
})
