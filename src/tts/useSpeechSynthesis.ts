import { useCallback, useEffect, useMemo, useState } from 'react'
import { getChineseVoices, queueSpeech, resolveVoice } from './speechService'

const UNAVAILABLE_MESSAGE = '当前设备暂时无法播放语音'

type SpeechSynthesisState = {
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
  const initialVoices = useMemo(() => (
    environment.engine ? getChineseVoices(environment.engine.getVoices()) : []
  ), [environment])
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>(initialVoices)
  const [isReady, setIsReady] = useState(initialVoices.length > 0 || environment.engine === null)
  const [error, setError] = useState<string | null>(
    environment.engine === null ? UNAVAILABLE_MESSAGE : null,
  )

  useEffect(() => {
    const { engine } = environment
    if (!engine) return

    const refreshVoices = () => {
      const nextVoices = getChineseVoices(engine.getVoices())
      setVoices(nextVoices)
      setIsReady(true)
      setError(nextVoices.length === 0 ? UNAVAILABLE_MESSAGE : null)
    }

    engine.addEventListener('voiceschanged', refreshVoices)
    const fallbackTimer = window.setTimeout(refreshVoices, 500)
    return () => {
      window.clearTimeout(fallbackTimer)
      engine.removeEventListener('voiceschanged', refreshVoices)
      engine.cancel()
    }
  }, [environment])

  const speak = useCallback((text: string, repeat: number, voiceId?: string): boolean => {
    const { engine, createUtterance } = environment
    const voice = resolveVoice(voices, voiceId)
    if (!engine || !createUtterance || !voice) {
      setError(UNAVAILABLE_MESSAGE)
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

  const cancel = useCallback(() => environment.engine?.cancel(), [environment])

  return { voices, isReady, error, speak, cancel }
}
