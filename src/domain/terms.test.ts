import { describe, expect, it } from 'vitest'
import { createDefaultSettings } from './settings'
import { applyCorrectReview, applyWrongReview, initializeNewTerm } from './terms'

const settings = createDefaultSettings()

function createTravelTerm(date = '2026-09-01' as const) {
  return initializeNewTerm({
    termId: 'term-travel',
    eventId: 'event-initial',
    text: '旅行',
    wrongCharPositions: [0],
    date,
  }, settings).term
}

describe('新词初始化', () => {
  it('今天录入，明天第一次复习', () => {
    const { term, event } = initializeNewTerm({
      termId: 'term-1',
      eventId: 'event-1',
      text: ' 旅行 ',
      wrongCharPositions: [0],
      date: '2026-09-28',
    }, settings)

    expect(term).toMatchObject({
      text: '旅行',
      status: 'active',
      consecutiveCorrect: 0,
      reviewStage: 0,
      cycleStartDate: '2026-09-28',
      nextReviewDate: '2026-09-29',
      wholeTermWrongCount: 1,
    })
    expect(term.wrongChars).toEqual({ 旅: { count: 1, positions: [0] } })
    expect(event).toMatchObject({ source: 'initial_entry', result: 'wrong', wrongChars: ['旅'] })
  })

  it('没有标记错字时不能创建新词', () => {
    expect(() => initializeNewTerm({
      termId: 'term-1',
      eventId: 'event-1',
      text: '旅行',
      wrongCharPositions: [],
      date: '2026-09-28',
    }, settings)).toThrow('至少标记一个错字')
  })
})

describe('正确结果推进', () => {
  it('默认在第 1/3/7 天连续正确后消灭', () => {
    const initial = createTravelTerm()

    const first = applyCorrectReview(initial, {
      eventId: 'event-correct-1',
      date: '2026-09-02',
    }, settings).term
    expect(first).toMatchObject({
      consecutiveCorrect: 1,
      reviewStage: 1,
      nextReviewDate: '2026-09-04',
      status: 'active',
    })

    const second = applyCorrectReview(first, {
      eventId: 'event-correct-2',
      date: '2026-09-04',
    }, settings).term
    expect(second).toMatchObject({
      consecutiveCorrect: 2,
      reviewStage: 2,
      nextReviewDate: '2026-09-08',
      status: 'active',
    })

    const third = applyCorrectReview(second, {
      eventId: 'event-correct-3',
      date: '2026-09-08',
    }, settings).term
    expect(third).toMatchObject({
      consecutiveCorrect: 3,
      reviewStage: 2,
      nextReviewDate: null,
      status: 'eliminated',
    })
  })

  it('逾期复习后，若原 cycle 的下一日期已过则安排到明天', () => {
    const term = createTravelTerm()
    const result = applyCorrectReview(term, {
      eventId: 'event-late',
      date: '2026-09-06',
    }, settings).term
    expect(result.nextReviewDate).toBe('2026-09-07')
  })
})

describe('错误结果重置', () => {
  it('Stage 2 答错后重置 cycle 并安排明天复习', () => {
    const initial = createTravelTerm()
    const stage1 = applyCorrectReview(initial, {
      eventId: 'correct-1',
      date: '2026-09-02',
    }, settings).term
    const stage2 = applyCorrectReview(stage1, {
      eventId: 'correct-2',
      date: '2026-09-04',
    }, settings).term

    const wrong = applyWrongReview(stage2, {
      eventId: 'wrong-stage-2',
      date: '2026-09-08',
      wrongCharPositions: [0],
    }, settings).term

    expect(wrong).toMatchObject({
      consecutiveCorrect: 0,
      reviewStage: 0,
      cycleStartDate: '2026-09-08',
      nextReviewDate: '2026-09-09',
      status: 'active',
      wholeTermWrongCount: 2,
    })
  })

  it('多错字时词错误次数只加 1，每个错字分别加 1', () => {
    const initial = initializeNewTerm({
      termId: 'term-idiom',
      eventId: 'event-initial',
      text: '迫不及待',
      wrongCharPositions: [1],
      date: '2026-09-01',
    }, settings).term

    const { term, event } = applyWrongReview(initial, {
      eventId: 'event-multiple',
      date: '2026-09-02',
      wrongCharPositions: [0, 2],
    }, settings)

    expect(term.wholeTermWrongCount).toBe(2)
    expect(term.wrongChars['迫']).toEqual({ count: 1, positions: [0] })
    expect(term.wrongChars['及']).toEqual({ count: 1, positions: [2] })
    expect(term.wrongChars['不']).toEqual({ count: 1, positions: [1] })
    expect(event.wrongChars).toEqual(['迫', '及'])
  })

  it('同一汉字的两个位置都写错时，该字错误次数累计 2 次', () => {
    const initial = initializeNewTerm({
      termId: 'term-repeated-char',
      eventId: 'event-initial',
      text: '哈哈',
      wrongCharPositions: [0],
      date: '2026-09-01',
    }, settings).term

    const { term, event } = applyWrongReview(initial, {
      eventId: 'event-two-positions',
      date: '2026-09-02',
      wrongCharPositions: [0, 1],
    }, settings)

    expect(term.wholeTermWrongCount).toBe(2)
    expect(term.wrongChars['哈']).toEqual({ count: 3, positions: [0, 1] })
    expect(event.wrongCharPositions).toEqual([0, 1])
    expect(event.wrongChars).toEqual(['哈', '哈'])
  })
})
