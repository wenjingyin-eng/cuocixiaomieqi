import { describe, expect, it } from 'vitest'
import type { DictationSession, ReviewEvent, TermRecord } from '../types/domain'
import { deleteTermData } from './library'

const baseTerm = {
  status: 'active',
  createdAt: '2026-09-01T08:00:00.000Z',
  updatedAt: '2026-09-01T08:00:00.000Z',
  consecutiveCorrect: 0,
  reviewStage: 0,
  cycleStartDate: '2026-09-01',
  nextReviewDate: '2026-09-02',
  wholeTermWrongCount: 1,
  wrongChars: {},
} satisfies Omit<TermRecord, 'id' | 'text'>

describe('删除词语', () => {
  it('同步删除词语、关联复习记录和 Session 引用', () => {
    const terms: TermRecord[] = [
      { ...baseTerm, id: 'term-1', text: '旅行' },
      { ...baseTerm, id: 'term-2', text: '已经' },
    ]
    const reviewEvents = [
      { id: 'event-1', termId: 'term-1' },
      { id: 'event-2', termId: 'term-2' },
    ] as ReviewEvent[]
    const sessions = [{
      id: 'session-1',
      startedAt: '2026-09-02T08:00:00.000Z',
      submittedAt: '2026-09-02T08:05:00.000Z',
      termIds: ['term-1', 'term-2'],
      results: [
        { termId: 'term-1', correct: true, wrongCharPositions: [] },
        { termId: 'term-2', correct: true, wrongCharPositions: [] },
      ],
    }] satisfies DictationSession[]

    const result = deleteTermData({ termId: 'term-1', terms, reviewEvents, sessions })

    expect(result.terms.map((term) => term.id)).toEqual(['term-2'])
    expect(result.reviewEvents.map((event) => event.termId)).toEqual(['term-2'])
    expect(result.sessions[0].termIds).toEqual(['term-2'])
    expect(result.sessions[0].results.map((item) => item.termId)).toEqual(['term-2'])
  })

  it('不保留删除后为空的 Session', () => {
    const term = { ...baseTerm, id: 'term-1', text: '旅行' } as TermRecord
    const session = {
      id: 'session-1',
      startedAt: '2026-09-02T08:00:00.000Z',
      submittedAt: null,
      termIds: ['term-1'],
      results: [],
    } satisfies DictationSession

    expect(deleteTermData({
      termId: 'term-1',
      terms: [term],
      reviewEvents: [],
      sessions: [session],
    }).sessions).toEqual([])
  })
})
