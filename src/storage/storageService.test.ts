import { describe, expect, it } from 'vitest'
import type { TermRecord } from '../types/domain'
import {
  APP_STORAGE_KEY,
  CURRENT_SCHEMA_VERSION,
  createEmptyAppData,
  loadAppData,
  migrateAppData,
  saveAppData,
  type StorageLike,
} from './storageService'

class MemoryStorage implements StorageLike {
  private values = new Map<string, string>()
  setCount = 0

  getItem(key: string): string | null {
    return this.values.get(key) ?? null
  }

  setItem(key: string, value: string): void {
    this.setCount += 1
    this.values.set(key, value)
  }
}

function termFixture(): TermRecord {
  return {
    id: 'term-1',
    text: '旅行',
    status: 'active',
    createdAt: '2026-09-28T09:00:00+08:00',
    updatedAt: '2026-09-28T09:00:00+08:00',
    consecutiveCorrect: 0,
    reviewStage: 0,
    cycleStartDate: '2026-09-28',
    nextReviewDate: '2026-09-29',
    wholeTermWrongCount: 1,
    wrongChars: { 旅: { count: 1, positions: [0] } },
  }
}

describe('storageService', () => {
  it('没有本地数据时返回默认空数据', () => {
    const result = loadAppData(new MemoryStorage())

    expect(result.status).toBe('empty')
    expect(result.data.schemaVersion).toBe(CURRENT_SCHEMA_VERSION)
    expect(result.data.settings.reviewIntervals).toEqual([1, 3, 7, 15, 30])
    expect(result.data.terms).toEqual([])
  })

  it('保存后可以完整读取学习数据与设置', () => {
    const storage = new MemoryStorage()
    const empty = createEmptyAppData('2026-09-28T08:00:00+08:00')
    const saved = saveAppData(storage, {
      settings: { ...empty.settings, sessionMax: 12, preferredVoiceId: '女声1' },
      terms: [termFixture()],
      reviewEvents: [],
      sessions: [],
    }, '2026-09-28T09:00:00+08:00')

    const loaded = loadAppData(storage)
    expect(loaded.status).toBe('loaded')
    expect(loaded.data).toEqual(saved)
    expect(loaded.data.settings.sessionMax).toBe(12)
    expect(loaded.data.terms[0].text).toBe('旅行')
  })

  it('兼容未标记具体错字的手动错词记录', () => {
    const empty = createEmptyAppData('2026-09-28T08:00:00+08:00')
    const term = { ...termFixture(), wrongChars: {} }
    const migrated = migrateAppData({
      ...empty,
      terms: [term],
      reviewEvents: [{
        id: 'event-1',
        termId: term.id,
        date: '2026-09-28',
        source: 'initial_entry',
        result: 'wrong',
        wrongCharPositions: [],
        wrongChars: [],
      }],
    })

    expect(migrated.terms[0].wrongChars).toEqual({})
    expect(migrated.reviewEvents[0]).toMatchObject({
      result: 'wrong',
      wrongCharPositions: [],
      wrongChars: [],
    })
  })

  it('格式损坏时返回错误且不覆盖原始内容', () => {
    const storage = new MemoryStorage()
    storage.setItem(APP_STORAGE_KEY, '{broken json')
    const writesBeforeLoad = storage.setCount

    const result = loadAppData(storage)

    expect(result.status).toBe('error')
    expect(storage.setCount).toBe(writesBeforeLoad)
    expect(storage.getItem(APP_STORAGE_KEY)).toBe('{broken json')
  })

  it('拒绝高于当前应用支持范围的数据版本', () => {
    expect(() => migrateAppData({ schemaVersion: CURRENT_SCHEMA_VERSION + 1 }))
      .toThrow('高于当前支持版本')
  })

  it('拒绝字段不完整的当前版本数据', () => {
    expect(() => migrateAppData({ schemaVersion: CURRENT_SCHEMA_VERSION }))
      .toThrow('本地数据格式无效')
  })
})
