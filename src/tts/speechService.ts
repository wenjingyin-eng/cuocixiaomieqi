export type SpeechEngine = Pick<SpeechSynthesis, 'cancel' | 'speak'>

type QueueSpeechInput = {
  engine: SpeechEngine
  createUtterance: (text: string) => SpeechSynthesisUtterance
  text: string
  voice: SpeechSynthesisVoice
  repeat: number
  gapMs?: number
  onError?: () => void
  schedule?: (callback: () => void, delayMs: number) => unknown
}

const speechSequenceByEngine = new WeakMap<object, number>()

function beginSpeechSequence(engine: SpeechEngine): number {
  const sequence = (speechSequenceByEngine.get(engine) ?? 0) + 1
  speechSequenceByEngine.set(engine, sequence)
  engine.cancel()
  return sequence
}

export function cancelSpeech(engine: SpeechEngine): void {
  beginSpeechSequence(engine)
}

function normalizeLanguage(language: string): string {
  return language.toLowerCase().replace('_', '-')
}

export function getChineseVoices(
  voices: readonly SpeechSynthesisVoice[],
  maxVoices = 3,
): SpeechSynthesisVoice[] {
  const exactChinese = voices.filter((voice) => normalizeLanguage(voice.lang).startsWith('zh-cn'))
  const otherChinese = voices.filter((voice) => (
    normalizeLanguage(voice.lang).startsWith('zh-') && !exactChinese.includes(voice)
  ))
  const seen = new Set<string>()

  return [...exactChinese, ...otherChinese]
    .filter((voice) => {
      const id = voice.voiceURI || `${voice.name}:${voice.lang}`
      if (seen.has(id)) return false
      seen.add(id)
      return true
    })
    .slice(0, maxVoices)
}

export function resolveVoice(
  voices: readonly SpeechSynthesisVoice[],
  preferredVoiceId?: string,
): SpeechSynthesisVoice | null {
  if (voices.length === 0) return null
  return voices.find((voice) => voice.voiceURI === preferredVoiceId) ?? voices[0]
}

export function queueSpeech({
  engine,
  createUtterance,
  text,
  voice,
  repeat,
  gapMs = 1000,
  onError,
  schedule = (callback, delayMs) => globalThis.setTimeout(callback, delayMs),
}: QueueSpeechInput): void {
  if (!text.trim()) throw new Error('朗读文本不能为空')
  if (!Number.isInteger(repeat) || repeat <= 0) throw new Error('播放次数必须是正整数')
  if (!Number.isFinite(gapMs) || gapMs < 0) throw new Error('播放间隔不能为负数')

  const sequence = beginSpeechSequence(engine)

  const playAt = (index: number): void => {
    if (speechSequenceByEngine.get(engine) !== sequence) return
    const utterance = createUtterance(text)
    utterance.voice = voice
    utterance.lang = voice.lang || 'zh-CN'
    utterance.rate = 0.88
    utterance.pitch = 1
    utterance.volume = 1
    utterance.onerror = (event) => {
      if (event.error !== 'canceled' && event.error !== 'interrupted') onError?.()
    }
    utterance.onend = () => {
      if (index + 1 >= repeat || speechSequenceByEngine.get(engine) !== sequence) return
      schedule(() => playAt(index + 1), gapMs)
    }
    engine.speak(utterance)
  }

  playAt(0)
}
