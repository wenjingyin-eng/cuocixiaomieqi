import { describe, expect, it } from 'vitest'
import type { DictationResult, DictationSession, LocalDate, TermRecord } from '../types/domain'
import { createDictationSession, getTodayQueue, submitDictationSession } from './sessions'
import { createDefaultSettings } from './settings'

const settings = createDefaultSettings()

function termFixture(
  id: string,
  nextReviewDate: LocalDate | null,
  overrides: Partial<TermRecord> = {},
): TermRecord {
  return {
    id,
    text: `词${id}`,
    status: nextReviewDate === null ? 'eliminated' : 'active',
    createdAt: '2026-08-01T09:00:00+08:00',
    updatedAt: '2026-08-01T09:00:00+08:00',
    consecutiveCorrect: 0,
    reviewStage: 0,
    cycleStartDate: '2026-08-01',
    nextReviewDate,
    wholeTermWrongCount: 1,
    wrongChars: { 词: { count: 1, positions: [0] } },
    ...overrides,
  }
}

function submittedSession(
  id: string,
  termIds: string[],
  submittedAt: string,
): DictationSession {
  return {
    id,
    startedAt: submittedAt,
    submittedAt,
    termIds,
    results: termIds.map((termId) => ({ termId, correct: true, wrongCharPositions: [] })),
  }
}

describe('getTodayQueue', () => {
  it('只返回到期 active 词，不使用未来词补数量', () => {
    const terms = [
      termFixture('due-1', '2026-09-27'),
      termFixture('due-2', '2026-09-28'),
      termFixture('future', '2026-09-29'),
      termFixture('eliminated', null),
    ]

    expect(getTodayQueue({ terms, sessions: [], today: '2026-09-28' }).map((term) => term.id))
      .toEqual(['due-1', 'due-2'])
  })

  it('优先返回逾期最久的词', () => {
    const terms = [
      termFixture('newer', '2026-09-27'),
      termFixture('oldest', '2026-09-20'),
      termFixture('middle', '2026-09-25'),
    ]

    expect(getTodayQueue({ terms, sessions: [], today: '2026-09-28' }).map((term) => term.id))
      .toEqual(['oldest', 'middle', 'newer'])
  })

  it('到期日相同时按 createdAt 再按 id 保证顺序稳定', () => {
    const terms = [
      termFixture('b', '2026-09-20', { createdAt: '2026-08-02T09:00:00+08:00' }),
      termFixture('c', '2026-09-20', { createdAt: '2026-08-01T09:00:00+08:00' }),
      termFixture('a', '2026-09-20', { createdAt: '2026-08-01T09:00:00+08:00' }),
    ]

    expect(getTodayQueue({ terms, sessions: [], today: '2026-09-28' }).map((term) => term.id))
      .toEqual(['a', 'c', 'b'])
  })

  it('同一词当天已在提交的 Session 中时不再进入队列', () => {
    const term = termFixture('due', '2026-09-20')
    const session = submittedSession('session-1', ['due'], '2026-09-28T10:00:00+08:00')

    expect(getTodayQueue({ terms: [term], sessions: [session], today: '2026-09-28' }))
      .toEqual([])
  })

  it('前一天提交的词在今天仍可按到期日期进队', () => {
    const term = termFixture('due', '2026-09-28')
    const session = submittedSession('session-1', ['due'], '2026-09-27T10:00:00+08:00')

    expect(getTodayQueue({ terms: [term], sessions: [session], today: '2026-09-28' }))
      .toHaveLength(1)
  })
})

describe('createDictationSession', () => {
  it('应用 sessionMax 单次上限', () => {
    const terms = Array.from({ length: 30 }, (_, index) => (
      termFixture(`term-${String(index).padStart(2, '0')}`, '2026-09-20')
    ))

    const session = createDictationSession({
      id: 'session-1',
      startedAt: '2026-09-28T09:00:00+08:00',
      today: '2026-09-28',
      terms,
      sessions: [],
      settings,
    })

    expect(session?.termIds).toHaveLength(20)
  })

  it('只有 5 个到期词时不从未来词补满 20 个', () => {
    const dueTerms = Array.from({ length: 5 }, (_, index) => (
      termFixture(`due-${index}`, '2026-09-28')
    ))
    const futureTerms = Array.from({ length: 20 }, (_, index) => (
      termFixture(`future-${index}`, '2026-10-01')
    ))

    const session = createDictationSession({
      id: 'session-1',
      startedAt: '2026-09-28T09:00:00+08:00',
      today: '2026-09-28',
      terms: [...dueTerms, ...futureTerms],
      sessions: [],
      settings,
    })

    expect(session?.termIds).toHaveLength(5)
    expect(session?.termIds.every((id) => id.startsWith('due-'))).toBe(true)
  })

  it('没有到期词时不创建空 Session', () => {
    expect(createDictationSession({
      id: 'session-empty',
      startedAt: '2026-09-28T09:00:00+08:00',
      today: '2026-09-28',
      terms: [termFixture('future', '2026-09-29')],
      sessions: [],
      settings,
    })).toBeNull()
  })
})

describe('submitDictationSession', () => {
  it('30 个到期词在 sessionMax=20 时拆成当天 20 + 10 两个 Session', () => {
    const terms = Array.from({ length: 30 }, (_, index) => (
      termFixture(`term-${String(index).padStart(2, '0')}`, '2026-09-20')
    ))

    const first = createDictationSession({
      id: 'session-1',
      startedAt: '2026-09-28T09:00:00+08:00',
      today: '2026-09-28',
      terms,
      sessions: [],
      settings,
    }) as DictationSession

    const firstResults: DictationResult[] = first.termIds.map((termId) => ({
      termId,
      correct: true,
      wrongCharPositions: [],
    }))

    const submitted = submitDictationSession({
      session: first,
      terms,
      results: firstResults,
      date: '2026-09-28',
      submittedAt: '2026-09-28T10:00:00+08:00',
      settings,
      createReviewEventId: (termId) => `event-${termId}`,
    })

    const second = createDictationSession({
      id: 'session-2',
      startedAt: '2026-09-28T10:05:00+08:00',
      today: '2026-09-28',
      terms: submitted.terms,
      sessions: [submitted.session],
      settings,
    })

    expect(first.termIds).toHaveLength(20)
    expect(second?.termIds).toHaveLength(10)
    expect(new Set([...first.termIds, ...(second?.termIds ?? [])])).toHaveLength(30)
  })

  it('一个 Session 内多错字仍只记一次词错误', () => {
    const term = termFixture('idiom', '2026-09-28', {
      text: '迫不及待',
      wholeTermWrongCount: 3,
      wrongChars: {},
    })
    const session: DictationSession = {
      id: 'session-1',
      startedAt: '2026-09-28T09:00:00+08:00',
      submittedAt: null,
      termIds: [term.id],
      results: [],
    }

    const submitted = submitDictationSession({
      session,
      terms: [term],
      results: [{ termId: term.id, correct: false, wrongCharPositions: [0, 2] }],
      date: '2026-09-28',
      submittedAt: '2026-09-28T10:00:00+08:00',
      settings,
      createReviewEventId: () => 'event-1',
    })
    const updated = submitted.terms[0]

    expect(updated.wholeTermWrongCount).toBe(4)
    expect(updated.wrongChars['迫'].count).toBe(1)
    expect(updated.wrongChars['及'].count).toBe(1)
    expect(submitted.reviewEvents).toHaveLength(1)
  })

  it('缺少任何一个词的结果时拒绝提交', () => {
    const terms = [termFixture('one', '2026-09-28'), termFixture('two', '2026-09-28')]
    const session: DictationSession = {
      id: 'session-1',
      startedAt: '2026-09-28T09:00:00+08:00',
      submittedAt: null,
      termIds: ['one', 'two'],
      results: [],
    }

    expect(() => submitDictationSession({
      session,
      terms,
      results: [{ termId: 'one', correct: true, wrongCharPositions: [] }],
      date: '2026-09-28',
      submittedAt: '2026-09-28T10:00:00+08:00',
      settings,
      createReviewEventId: (termId) => `event-${termId}`,
    })).toThrow('每个词都必须有且只有一个结果')
  })
})
