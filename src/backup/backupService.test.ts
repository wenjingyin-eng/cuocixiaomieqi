import { describe, expect, it } from 'vitest'
import { createDefaultSettings } from '../domain/settings'
import type { TermRecord } from '../types/domain'
import {
  createBackupFileName,
  createBackupPayload,
  parseBackup,
  serializeBackup,
} from './backupService'

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

describe('backupService', () => {
  it('创建包含完整学习数据与设置的备份', () => {
    const payload = createBackupPayload({
      settings: createDefaultSettings(),
      terms: [termFixture()],
      reviewEvents: [{
        id: 'event-1',
        termId: 'term-1',
        date: '2026-09-28',
        source: 'initial_entry',
        result: 'wrong',
        wrongCharPositions: [0],
        wrongChars: ['旅'],
      }],
      sessions: [],
    }, '2026-09-28T10:00:00+08:00')

    expect(payload.schemaVersion).toBe(1)
    expect(payload.exportedAt).toBe('2026-09-28T10:00:00+08:00')
    expect(payload.terms[0].wrongChars['旅'].count).toBe(1)
    expect(payload.reviewEvents).toHaveLength(1)
  })

  it('序列化后的备份可以完整解析', () => {
    const payload = createBackupPayload({
      settings: createDefaultSettings(),
      terms: [termFixture()],
      reviewEvents: [],
      sessions: [],
    })

    expect(parseBackup(serializeBackup(payload))).toEqual(payload)
  })

  it('拒绝损坏的 JSON 和字段不完整的数据', () => {
    expect(() => parseBackup('{broken')).toThrow('无法识别这个备份文件')
    expect(() => parseBackup(JSON.stringify({ schemaVersion: 1 })))
      .toThrow('无法识别这个备份文件')
  })

  it('拒绝引用不存在词条的历史记录', () => {
    const payload = createBackupPayload({
      settings: createDefaultSettings(),
      terms: [termFixture()],
      reviewEvents: [],
      sessions: [],
    })
    payload.reviewEvents.push({
      id: 'event-orphan',
      termId: 'missing-term',
      date: '2026-09-28',
      source: 'dictation',
      result: 'correct',
      wrongCharPositions: [],
      wrongChars: [],
    })

    expect(() => parseBackup(serializeBackup(payload))).toThrow('无法识别这个备份文件')
  })

  it('生成符合 PRD 的日期文件名', () => {
    expect(createBackupFileName('2026-09-28')).toBe('cuozi-backup-2026-09-28.json')
  })
})
