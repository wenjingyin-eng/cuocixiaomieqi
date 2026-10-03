import { useCallback, useEffect, useMemo, useState } from 'react'
import { cancelSpeech, getChineseVoices, queueSpeech, resolveVoice } from './speechService'

const UNAVAILABLE_MESSAGE = '当前设备暂时无法播放语音'
const NO_CHINESE_VOICE_MESSAGE = '当前设备没有合适的中文语音'

type SpeechSynthesisState = {
  allVoices: SpeechSynthesisVoice[]
  voices: SpeechSynthesisVoice[]
  isReady: boolean
  error: string | null
  speak: (text: string, repeat: number, voiceId?: string) => boolean
  cancel: () => void
}

function getEnvironment(): {
  engine: SpeechSynthesis | null
  createUtterance: ((text: string) => SpeechSynthesisUtterance) | null
} {
  if (
    typeof window === 'undefined'
    || !('speechSynthesis' in window)
    || !('SpeechSynthesisUtterance' in window)
  ) return { engine: null, createUtterance: null }

  return {
    engine: window.speechSynthesis,
    createUtterance: (text) => new window.SpeechSynthesisUtterance(text),
  }
}

export function useSpeechSynthesis(): SpeechSynthesisState {
  const environment = useMemo(() => getEnvironment(), [])
  const initialAllVoices = useMemo(() => (
    environment.engine ? environment.engine.getVoices() : []
  ), [environment])
  const initialVoices = useMemo(() => getChineseVoices(initialAllVoices), [initialAllVoices])
  const [allVoices, setAllVoices] = useState<SpeechSynthesisVoice[]>(initialAllVoices)
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>(initialVoices)
  const [isReady, setIsReady] = useState(initialVoices.length > 0 || environment.engine === null)
  const [error, setError] = useState<string | null>(
    environment.engine === null ? UNAVAILABLE_MESSAGE : null,
  )

  useEffect(() => {
    const { engine } = environment
    if (!engine) return

    const refreshVoices = () => {
      const nextAllVoices = engine.getVoices()
      const nextVoices = getChineseVoices(nextAllVoices)
      setAllVoices(nextAllVoices)
      setVoices(nextVoices)
      setIsReady(true)
      setError(nextVoices.length === 0 ? NO_CHINESE_VOICE_MESSAGE : null)
    }

    engine.addEventListener('voiceschanged', refreshVoices)
    const fallbackTimer = window.setTimeout(refreshVoices, 500)
    return () => {
      window.clearTimeout(fallbackTimer)
      engine.removeEventListener('voiceschanged', refreshVoices)
      cancelSpeech(engine)
    }
  }, [environment])

  const speak = useCallback((text: string, repeat: number, voiceId?: string): boolean => {
    const { engine, createUtterance } = environment
    const voice = resolveVoice(voices, voiceId)
    if (!engine || !createUtterance || !voice) {
      setError(engine && createUtterance ? NO_CHINESE_VOICE_MESSAGE : UNAVAILABLE_MESSAGE)
      return false
    }

    try {
      setError(null)
      queueSpeech({
        engine,
        createUtterance,
        text,
        voice,
        repeat,
        onError: () => setError(UNAVAILABLE_MESSAGE),
      })
      return true
    } catch {
      setError(UNAVAILABLE_MESSAGE)
      return false
    }
  }, [environment, voices])

  const cancel = useCallback(() => {
    if (environment.engine) cancelSpeech(environment.engine)
  }, [environment])

  return { allVoices, voices, isReady, error, speak, cancel }
}
