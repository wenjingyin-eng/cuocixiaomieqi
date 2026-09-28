import { describe, expect, it } from 'vitest'
import { createBackupPayload, parseBackup, serializeBackup } from '../backup/backupService'
import {
  createDefaultSettings,
  createDictationSession,
  initializeNewTerm,
  submitDictationSession,
} from '../domain'
import { loadAppData, saveAppData, type StorageLike } from '../storage/storageService'
import type { DictationSession, LocalDate, ReviewEvent, TermRecord } from '../types/domain'

class MemoryStorage implements StorageLike {
  private value: string | null = null

  getItem(): string | null {
    return this.value
  }

  setItem(_key: string, value: string): void {
    this.value = value
  }
}

describe('完整学习流程', () => {
  it('录入、三次到期复习、持久化和备份恢复后正确消灭词语', () => {
    const settings = createDefaultSettings()
    const created = initializeNewTerm({
      termId: 'term-travel',
      eventId: 'event-initial',
      text: '旅行',
      wrongCharPositions: [0],
      date: '2026-09-01',
      timestamp: '2026-09-01T09:00:00+08:00',
    }, settings)
    let terms: TermRecord[] = [created.term]
    let reviewEvents: ReviewEvent[] = [created.event]
    const sessions: DictationSession[] = []

    expect(terms[0].nextReviewDate).toBe('2026-09-02')

    const reviewDates: LocalDate[] = ['2026-09-02', '2026-09-04', '2026-09-08']
    reviewDates.forEach((date, index) => {
      const session = createDictationSession({
        id: `session-${index + 1}`,
        startedAt: `${date}T09:00:00+08:00`,
        today: date,
        terms,
        sessions,
        settings,
      }) as DictationSession
      const submitted = submitDictationSession({
        session,
        terms,
        results: [{ termId: 'term-travel', correct: true, wrongCharPositions: [] }],
        date,
        submittedAt: `${date}T09:05:00+08:00`,
        settings,
        createReviewEventId: () => `event-review-${index + 1}`,
      })
      terms = submitted.terms
      reviewEvents = [...reviewEvents, ...submitted.reviewEvents]
      sessions.push(submitted.session)
    })

    expect(terms[0]).toMatchObject({
      status: 'eliminated',
      consecutiveCorrect: 3,
      reviewStage: 2,
      nextReviewDate: null,
    })
    expect(reviewEvents).toHaveLength(4)
    expect(sessions).toHaveLength(3)

    const storage = new MemoryStorage()
    saveAppData(storage, { settings, terms, reviewEvents, sessions })
    const loaded = loadAppData(storage)
    expect(loaded.status).toBe('loaded')
    expect(loaded.data.terms[0].status).toBe('eliminated')

    const backup = createBackupPayload(loaded.data)
    const restored = parseBackup(serializeBackup(backup))
    expect(restored.terms).toEqual(terms)
    expect(restored.reviewEvents).toEqual(reviewEvents)
    expect(restored.sessions).toEqual(sessions)
  })
})
