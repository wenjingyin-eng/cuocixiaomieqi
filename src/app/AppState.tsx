import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import {
  createDictationSession,
  initializeNewTerm,
  reactivateTerm,
  recordManualMistake,
  submitDictationSession,
  todayLocalDate,
} from '../domain'
import { createBackupPayload } from '../backup/backupService'
import type {
  AppSettings,
  BackupPayload,
  DictationResult,
  DictationSession,
  ReviewEvent,
  TermRecord,
} from '../types/domain'
import {
  createEmptyAppData,
  getBrowserStorage,
  loadAppData,
  migrateAppData,
  saveAppData,
} from '../storage/storageService'

export type MistakeDraft = {
  text: string
  wrongCharPositions: number[]
}

type AppStateContextValue = {
  settings: AppSettings
  terms: TermRecord[]
  reviewEvents: ReviewEvent[]
  sessions: DictationSession[]
  currentSession: DictationSession | null
  currentDictationIndex: number
  storageError: string | null
  createBackup: () => BackupPayload
  restoreBackup: (payload: BackupPayload) => void
  startSession: () => DictationSession | null
  setCurrentDictationIndex: (index: number) => void
  abandonCurrentSession: () => void
  addMistakes: (drafts: MistakeDraft[]) => void
  reactivate: (termId: string) => void
  submitCurrentSession: (results: DictationResult[]) => void
  saveSettings: (settings: AppSettings) => void
  clearLearningData: () => void
}

const AppStateContext = createContext<AppStateContextValue | null>(null)

function createId(prefix: string): string {
  const uuid = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`
  return `${prefix}-${uuid}`
}

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [{ storage, result: initialLoad }] = useState(() => {
    try {
      const browserStorage = getBrowserStorage()
      return { storage: browserStorage, result: loadAppData(browserStorage) }
    } catch (cause) {
      const error = cause instanceof Error ? cause : new Error('无法访问本地存储')
      return {
        storage: undefined,
        result: { status: 'error' as const, data: createEmptyAppData(), error },
      }
    }
  })
  const persistenceAllowedRef = useRef(initialLoad.status !== 'error')
  const [storageError, setStorageError] = useState<string | null>(
    initialLoad.status === 'error' ? initialLoad.error.message : null,
  )
  const [settings, setSettings] = useState<AppSettings>(() => initialLoad.data.settings)
  const [terms, setTerms] = useState<TermRecord[]>(() => initialLoad.data.terms)
  const [reviewEvents, setReviewEvents] = useState<ReviewEvent[]>(() => initialLoad.data.reviewEvents)
  const [sessions, setSessions] = useState<DictationSession[]>(() => initialLoad.data.sessions)
  const [currentSession, setCurrentSession] = useState<DictationSession | null>(null)
  const [currentDictationIndex, setCurrentDictationIndex] = useState(0)

  useEffect(() => {
    if (!persistenceAllowedRef.current) return
    try {
      saveAppData(storage, { settings, terms, reviewEvents, sessions })
    } catch (cause) {
      persistenceAllowedRef.current = false
      const message = cause instanceof Error ? cause.message : '保存本地数据失败'
      queueMicrotask(() => setStorageError(message))
    }
  }, [reviewEvents, sessions, settings, storage, terms])

  const value = useMemo<AppStateContextValue>(() => ({
    settings,
    terms,
    reviewEvents,
    sessions,
    currentSession,
    currentDictationIndex,
    storageError,
    createBackup() {
      return createBackupPayload({ settings, terms, reviewEvents, sessions })
    },
    restoreBackup(payload) {
      const imported = migrateAppData(payload)

      try {
        saveAppData(storage, {
          settings: imported.settings,
          terms: imported.terms,
          reviewEvents: imported.reviewEvents,
          sessions: imported.sessions,
        })
      } catch (cause) {
        persistenceAllowedRef.current = false
        const message = cause instanceof Error ? cause.message : '保存导入数据失败'
        setStorageError(message)
        throw new Error(message, { cause })
      }

      persistenceAllowedRef.current = true
      setStorageError(null)
      setSettings({ ...imported.settings, reviewIntervals: [...imported.settings.reviewIntervals] })
      setTerms(imported.terms)
      setReviewEvents(imported.reviewEvents)
      setSessions(imported.sessions)
      setCurrentSession(null)
      setCurrentDictationIndex(0)
    },
    startSession() {
      const today = todayLocalDate()
      const session = createDictationSession({
        id: createId('session'),
        startedAt: new Date().toISOString(),
        today,
        terms,
        sessions,
        settings,
      })
      setCurrentSession(session)
      setCurrentDictationIndex(0)
      return session
    },
    setCurrentDictationIndex,
    abandonCurrentSession() {
      setCurrentSession(null)
      setCurrentDictationIndex(0)
    },
    addMistakes(drafts) {
      const today = todayLocalDate()
      const timestamp = new Date().toISOString()
      const nextTerms = [...terms]
      const newEvents: ReviewEvent[] = []

      for (const draft of drafts) {
        const existingIndex = nextTerms.findIndex((term) => term.text === draft.text)

        if (existingIndex === -1) {
          const created = initializeNewTerm({
            termId: createId('term'),
            eventId: createId('event'),
            text: draft.text,
            wrongCharPositions: draft.wrongCharPositions,
            date: today,
            timestamp,
          }, settings)
          nextTerms.push(created.term)
          newEvents.push(created.event)
        } else {
          const updated = recordManualMistake(nextTerms[existingIndex], {
            eventId: createId('event'),
            date: today,
            timestamp,
            source: 'manual_reentry',
            wrongCharPositions: draft.wrongCharPositions,
          }, settings)
          nextTerms[existingIndex] = updated.term
          newEvents.push(updated.event)
        }
      }

      setTerms(nextTerms)
      setReviewEvents((events) => [...events, ...newEvents])
    },
    reactivate(termId) {
      const today = todayLocalDate()
      const timestamp = new Date().toISOString()
      setTerms((current) => current.map((term) => (
        term.id === termId ? reactivateTerm(term, { date: today, timestamp }, settings) : term
      )))
    },
    submitCurrentSession(results) {
      if (!currentSession) throw new Error('当前没有可提交的 Session')

      const submitted = submitDictationSession({
        session: currentSession,
        terms,
        results,
        date: todayLocalDate(),
        submittedAt: new Date().toISOString(),
        settings,
        createReviewEventId: () => createId('event'),
      })

      setTerms(submitted.terms)
      setReviewEvents((events) => [...events, ...submitted.reviewEvents])
      setSessions((current) => [...current, submitted.session])
      setCurrentSession(null)
      setCurrentDictationIndex(0)
    },
    saveSettings(nextSettings) {
      setSettings({ ...nextSettings, reviewIntervals: [...nextSettings.reviewIntervals] })
    },
    clearLearningData() {
      persistenceAllowedRef.current = true
      setStorageError(null)
      setTerms([])
      setReviewEvents([])
      setSessions([])
      setCurrentSession(null)
      setCurrentDictationIndex(0)
      try {
        saveAppData(storage, {
          settings,
          terms: [],
          reviewEvents: [],
          sessions: [],
        })
      } catch (cause) {
        persistenceAllowedRef.current = false
        setStorageError(cause instanceof Error ? cause.message : '保存本地数据失败')
      }
    },
  }), [
    currentDictationIndex,
    currentSession,
    reviewEvents,
    sessions,
    settings,
    storage,
    storageError,
    terms,
  ])

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAppState(): AppStateContextValue {
  const context = useContext(AppStateContext)
  if (!context) throw new Error('useAppState 必须在 AppStateProvider 内使用')
  return context
}
