export type LocalDate = `${number}-${number}-${number}`

export type TermStatus = 'active' | 'eliminated'

export type ReviewSource = 'initial_entry' | 'manual_reentry' | 'dictation'

export type ReviewResult = 'correct' | 'wrong'

export type ReviewIntervals = [number, number, number, number, number]

export interface WrongCharacterRecord {
  count: number
  positions: number[]
}

export interface TermRecord {
  id: string
  text: string
  status: TermStatus
  createdAt: string
  updatedAt: string
  consecutiveCorrect: number
  reviewStage: number
  cycleStartDate: LocalDate
  nextReviewDate: LocalDate | null
  wholeTermWrongCount: number
  wrongChars: Record<string, WrongCharacterRecord>
}

export interface ReviewEvent {
  id: string
  termId: string
  date: LocalDate
  source: ReviewSource
  result: ReviewResult
  wrongCharPositions: number[]
  wrongChars: string[]
}

export interface DictationResult {
  termId: string
  correct: boolean
  wrongCharPositions: number[]
}

export interface DictationSession {
  id: string
  startedAt: string
  submittedAt: string | null
  termIds: string[]
  results: DictationResult[]
}

export interface AppSettings {
  sessionMax: number
  eliminationTarget: number
  reviewIntervals: ReviewIntervals
  preferredVoiceId?: string
}

export interface BackupPayload {
  schemaVersion: number
  exportedAt: string
  settings: AppSettings
  terms: TermRecord[]
  reviewEvents: ReviewEvent[]
  sessions: DictationSession[]
}
