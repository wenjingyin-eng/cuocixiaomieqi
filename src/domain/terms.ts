import type {
  AppSettings,
  LocalDate,
  ReviewEvent,
  ReviewSource,
  TermRecord,
  WrongCharacterRecord,
} from '../types/domain'
import { calculateNextReviewDate } from './scheduling'
import { assertValidSettings } from './settings'

type InitializeNewTermInput = {
  termId: string
  eventId: string
  text: string
  wrongCharPositions: number[]
  date: LocalDate
  timestamp?: string
}

type ApplyReviewInput = {
  eventId: string
  date: LocalDate
  timestamp?: string
  source?: ReviewSource
}

type ApplyWrongReviewInput = ApplyReviewInput & {
  wrongCharPositions: number[]
}

type ReactivateTermInput = {
  date: LocalDate
  timestamp?: string
}

export type TermMutationResult = {
  term: TermRecord
  event: ReviewEvent
}

function normalizeText(text: string): string {
  const normalized = text.trim()
  if (!normalized) throw new Error('词语不能为空')
  return normalized
}

function normalizeWrongPositions(text: string, positions: number[]): number[] {
  const characters = [...text]
  const normalized = [...new Set(positions)].sort((left, right) => left - right)

  if (normalized.length === 0) {
    throw new Error('错误词必须至少标记一个错字')
  }

  for (const position of normalized) {
    if (!Number.isInteger(position) || position < 0 || position >= characters.length) {
      throw new Error(`无效的错字位置: ${position}`)
    }
  }

  return normalized
}

function buildWrongCharacterRecords(
  text: string,
  positions: number[],
  existing: TermRecord['wrongChars'] = {},
): TermRecord['wrongChars'] {
  const characters = [...text]
  const next: TermRecord['wrongChars'] = Object.fromEntries(
    Object.entries(existing).map(([character, record]) => [
      character,
      { count: record.count, positions: [...record.positions] },
    ]),
  )

  for (const position of positions) {
    const character = characters[position]
    const current: WrongCharacterRecord = next[character] ?? { count: 0, positions: [] }
    next[character] = {
      count: current.count + 1,
      positions: [...new Set([...current.positions, position])].sort((left, right) => left - right),
    }
  }

  return next
}

function buildReviewEvent(
  eventId: string,
  term: TermRecord,
  date: LocalDate,
  source: ReviewSource,
  wrongCharPositions: number[],
): ReviewEvent {
  const characters = [...term.text]
  return {
    id: eventId,
    termId: term.id,
    date,
    source,
    result: wrongCharPositions.length > 0 ? 'wrong' : 'correct',
    wrongCharPositions: [...wrongCharPositions],
    wrongChars: wrongCharPositions.map((position) => characters[position]),
  }
}

function assertActiveTerm(term: TermRecord): void {
  if (term.status !== 'active') {
    throw new Error(`词语“${term.text}”已消灭，不能直接提交复习结果`)
  }
}

export function initializeNewTerm(
  input: InitializeNewTermInput,
  settings: AppSettings,
): TermMutationResult {
  assertValidSettings(settings)
  const text = normalizeText(input.text)
  const wrongCharPositions = normalizeWrongPositions(text, input.wrongCharPositions)
  const timestamp = input.timestamp ?? input.date

  const term: TermRecord = {
    id: input.termId,
    text,
    status: 'active',
    createdAt: timestamp,
    updatedAt: timestamp,
    consecutiveCorrect: 0,
    reviewStage: 0,
    cycleStartDate: input.date,
    nextReviewDate: calculateNextReviewDate({
      cycleStartDate: input.date,
      reviewStage: 0,
      reviewIntervals: settings.reviewIntervals,
      today: input.date,
    }),
    wholeTermWrongCount: 1,
    wrongChars: buildWrongCharacterRecords(text, wrongCharPositions),
  }

  return {
    term,
    event: buildReviewEvent(input.eventId, term, input.date, 'initial_entry', wrongCharPositions),
  }
}

export function applyCorrectReview(
  term: TermRecord,
  input: ApplyReviewInput,
  settings: AppSettings,
): TermMutationResult {
  assertValidSettings(settings)
  assertActiveTerm(term)

  const consecutiveCorrect = term.consecutiveCorrect + 1
  const eliminated = consecutiveCorrect >= settings.eliminationTarget
  const nextStage = eliminated ? term.reviewStage : term.reviewStage + 1
  const timestamp = input.timestamp ?? input.date

  const updatedTerm: TermRecord = {
    ...term,
    status: eliminated ? 'eliminated' : 'active',
    updatedAt: timestamp,
    consecutiveCorrect,
    reviewStage: nextStage,
    nextReviewDate: eliminated
      ? null
      : calculateNextReviewDate({
          cycleStartDate: term.cycleStartDate,
          reviewStage: nextStage,
          reviewIntervals: settings.reviewIntervals,
          today: input.date,
        }),
  }

  return {
    term: updatedTerm,
    event: buildReviewEvent(
      input.eventId,
      updatedTerm,
      input.date,
      input.source ?? 'dictation',
      [],
    ),
  }
}

export function applyWrongReview(
  term: TermRecord,
  input: ApplyWrongReviewInput,
  settings: AppSettings,
): TermMutationResult {
  assertValidSettings(settings)
  assertActiveTerm(term)

  const wrongCharPositions = normalizeWrongPositions(term.text, input.wrongCharPositions)
  const timestamp = input.timestamp ?? input.date

  const updatedTerm: TermRecord = {
    ...term,
    status: 'active',
    updatedAt: timestamp,
    consecutiveCorrect: 0,
    reviewStage: 0,
    cycleStartDate: input.date,
    nextReviewDate: calculateNextReviewDate({
      cycleStartDate: input.date,
      reviewStage: 0,
      reviewIntervals: settings.reviewIntervals,
      today: input.date,
    }),
    wholeTermWrongCount: term.wholeTermWrongCount + 1,
    wrongChars: buildWrongCharacterRecords(term.text, wrongCharPositions, term.wrongChars),
  }

  return {
    term: updatedTerm,
    event: buildReviewEvent(
      input.eventId,
      updatedTerm,
      input.date,
      input.source ?? 'dictation',
      wrongCharPositions,
    ),
  }
}

export function recordManualMistake(
  term: TermRecord,
  input: ApplyWrongReviewInput,
  settings: AppSettings,
): TermMutationResult {
  if (term.status === 'active') {
    return applyWrongReview(term, { ...input, source: 'manual_reentry' }, settings)
  }

  const reactivated = reactivateTerm(term, input, settings)
  return applyWrongReview(
    { ...reactivated, wholeTermWrongCount: term.wholeTermWrongCount },
    { ...input, source: 'manual_reentry' },
    settings,
  )
}

export function reactivateTerm(
  term: TermRecord,
  input: ReactivateTermInput,
  settings: AppSettings,
): TermRecord {
  assertValidSettings(settings)
  const timestamp = input.timestamp ?? input.date

  return {
    ...term,
    status: 'active',
    updatedAt: timestamp,
    consecutiveCorrect: 0,
    reviewStage: 0,
    cycleStartDate: input.date,
    nextReviewDate: calculateNextReviewDate({
      cycleStartDate: input.date,
      reviewStage: 0,
      reviewIntervals: settings.reviewIntervals,
      today: input.date,
    }),
  }
}
