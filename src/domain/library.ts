import type { DictationSession, ReviewEvent, TermRecord } from '../types/domain'

export type DeleteTermInput = {
  termId: string
  terms: TermRecord[]
  reviewEvents: ReviewEvent[]
  sessions: DictationSession[]
}

export type DeleteTermResult = {
  terms: TermRecord[]
  reviewEvents: ReviewEvent[]
  sessions: DictationSession[]
}

/**
 * Permanently removes one term and every reference to it, keeping persisted and
 * exported data internally consistent.
 */
export function deleteTermData(input: DeleteTermInput): DeleteTermResult {
  if (!input.terms.some((term) => term.id === input.termId)) {
    throw new Error('要删除的词语不存在')
  }

  const sessions = input.sessions
    .map((session) => ({
      ...session,
      termIds: session.termIds.filter((termId) => termId !== input.termId),
      results: session.results.filter((result) => result.termId !== input.termId),
    }))
    .filter((session) => session.termIds.length > 0)

  return {
    terms: input.terms.filter((term) => term.id !== input.termId),
    reviewEvents: input.reviewEvents.filter((event) => event.termId !== input.termId),
    sessions,
  }
}
