import type {
  AppSettings,
  DictationResult,
  DictationSession,
  LocalDate,
  ReviewEvent,
  TermRecord,
} from '../types/domain'
import { compareLocalDates, localDateFromTimestamp } from '../utils/localDate'
import { assertValidSettings } from './settings'
import { applyCorrectReview, applyWrongReview } from './terms'

type GetTodayQueueInput = {
  terms: TermRecord[]
  sessions: DictationSession[]
  today: LocalDate
}

type CreateDictationSessionInput = GetTodayQueueInput & {
  id: string
  startedAt: string
  settings: AppSettings
}

type SubmitDictationSessionInput = {
  session: DictationSession
  terms: TermRecord[]
  results: DictationResult[]
  date: LocalDate
  submittedAt: string
  settings: AppSettings
  createReviewEventId: (termId: string, index: number) => string
}

export type SubmitDictationSessionResult = {
  session: DictationSession
  terms: TermRecord[]
  reviewEvents: ReviewEvent[]
}

function submittedTermIdsForDate(
  sessions: DictationSession[],
  date: LocalDate,
): Set<string> {
  const submittedIds = sessions
    .filter((session) => session.submittedAt !== null)
    .filter((session) => localDateFromTimestamp(session.submittedAt as string) === date)
    .flatMap((session) => session.termIds)

  return new Set(submittedIds)
}

export function getTodayQueue({ terms, sessions, today }: GetTodayQueueInput): TermRecord[] {
  const submittedToday = submittedTermIdsForDate(sessions, today)

  return terms
    .filter((term) => (
      term.status === 'active'
      && term.nextReviewDate !== null
      && compareLocalDates(term.nextReviewDate, today) <= 0
      && !submittedToday.has(term.id)
    ))
    .sort((left, right) => {
      const dueDateOrder = compareLocalDates(
        left.nextReviewDate as LocalDate,
        right.nextReviewDate as LocalDate,
      )

      if (dueDateOrder !== 0) return dueDateOrder

      const createdOrder = left.createdAt.localeCompare(right.createdAt)
      if (createdOrder !== 0) return createdOrder

      return left.id.localeCompare(right.id)
    })
}

export function createDictationSession(
  input: CreateDictationSessionInput,
): DictationSession | null {
  assertValidSettings(input.settings)
  const queue = getTodayQueue(input).slice(0, input.settings.sessionMax)

  if (queue.length === 0) return null

  return {
    id: input.id,
    startedAt: input.startedAt,
    submittedAt: null,
    termIds: queue.map((term) => term.id),
    results: [],
  }
}

function validateSessionResults(
  session: DictationSession,
  results: DictationResult[],
): Map<string, DictationResult> {
  if (session.submittedAt !== null) {
    throw new Error('该 Session 已提交')
  }

  const resultMap = new Map(results.map((result) => [result.termId, result]))

  if (resultMap.size !== results.length) {
    throw new Error('Session 结果中存在重复词条')
  }

  if (results.length !== session.termIds.length) {
    throw new Error('Session 中每个词都必须有且只有一个结果')
  }

  for (const termId of session.termIds) {
    const result = resultMap.get(termId)
    if (!result) throw new Error(`Session 缺少词条 ${termId} 的结果`)

    if (result.correct && result.wrongCharPositions.length > 0) {
      throw new Error(`正确词条 ${termId} 不能包含错字位置`)
    }

    if (!result.correct && result.wrongCharPositions.length === 0) {
      throw new Error(`错误词条 ${termId} 必须至少标记一个错字`)
    }
  }

  for (const result of results) {
    if (!session.termIds.includes(result.termId)) {
      throw new Error(`词条 ${result.termId} 不属于当前 Session`)
    }
  }

  return resultMap
}

export function submitDictationSession(
  input: SubmitDictationSessionInput,
): SubmitDictationSessionResult {
  assertValidSettings(input.settings)
  const resultMap = validateSessionResults(input.session, input.results)
  const termsById = new Map(input.terms.map((term) => [term.id, term]))
  const updatedById = new Map<string, TermRecord>()
  const reviewEvents: ReviewEvent[] = []

  input.session.termIds.forEach((termId, index) => {
    const term = termsById.get(termId)
    if (!term) throw new Error(`找不到 Session 词条: ${termId}`)

    const result = resultMap.get(termId) as DictationResult
    const eventId = input.createReviewEventId(termId, index)
    const mutation = result.correct
      ? applyCorrectReview(term, {
          eventId,
          date: input.date,
          timestamp: input.submittedAt,
          source: 'dictation',
        }, input.settings)
      : applyWrongReview(term, {
          eventId,
          date: input.date,
          timestamp: input.submittedAt,
          source: 'dictation',
          wrongCharPositions: result.wrongCharPositions,
        }, input.settings)

    updatedById.set(termId, mutation.term)
    reviewEvents.push(mutation.event)
  })

  return {
    session: {
      ...input.session,
      submittedAt: input.submittedAt,
      results: input.session.termIds.map((termId) => ({
        ...(resultMap.get(termId) as DictationResult),
        wrongCharPositions: [...(resultMap.get(termId) as DictationResult).wrongCharPositions],
      })),
    },
    terms: input.terms.map((term) => updatedById.get(term.id) ?? term),
    reviewEvents,
  }
}
