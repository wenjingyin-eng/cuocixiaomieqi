import { describe, expect, it, vi } from 'vitest'
import { getChineseVoices, queueSpeech, resolveVoice } from './speechService'

function voice(id: string, lang: string): SpeechSynthesisVoice {
  return {
    default: false,
    lang,
    localService: true,
    name: id,
    voiceURI: id,
  }
}

describe('speechService', () => {
  it('优先选择 zh-CN，再使用其他中文声音，并限制为三个', () => {
    const voices = [
      voice('english', 'en-US'),
      voice('cantonese', 'zh-HK'),
      voice('mandarin-1', 'zh-CN'),
      voice('mandarin-2', 'zh_CN'),
      voice('taiwan', 'zh-TW'),
    ]

    expect(getChineseVoices(voices).map((item) => item.voiceURI))
      .toEqual(['mandarin-1', 'mandarin-2', 'cantonese'])
  })

  it('优先恢复用户选择的声音，否则回退到第一个中文声音', () => {
    const voices = [voice('first', 'zh-CN'), voice('second', 'zh-CN')]

    expect(resolveVoice(voices, 'second')?.voiceURI).toBe('second')
    expect(resolveVoice(voices, 'missing')?.voiceURI).toBe('first')
    expect(resolveVoice([], 'missing')).toBeNull()
  })

  it('自动播放时按指定次数创建并排队语音', () => {
    const spoken: SpeechSynthesisUtterance[] = []
    const engine = {
      cancel: vi.fn(),
      speak: vi.fn((utterance: SpeechSynthesisUtterance) => spoken.push(utterance)),
    }
    const createUtterance = (text: string) => ({ text }) as SpeechSynthesisUtterance
    const selectedVoice = voice('mandarin', 'zh-CN')

    queueSpeech({ engine, createUtterance, text: '旅行', voice: selectedVoice, repeat: 3 })

    expect(engine.cancel).toHaveBeenCalledOnce()
    expect(engine.speak).toHaveBeenCalledTimes(3)
    expect(spoken.every((utterance) => utterance.text === '旅行')).toBe(true)
    expect(spoken.every((utterance) => utterance.voice === selectedVoice)).toBe(true)
    expect(spoken.every((utterance) => utterance.rate === 0.88)).toBe(true)
  })

  it('拒绝空文本和非法播放次数', () => {
    const engine = { cancel: vi.fn(), speak: vi.fn() }
    const createUtterance = () => ({}) as SpeechSynthesisUtterance
    const selectedVoice = voice('mandarin', 'zh-CN')

    expect(() => queueSpeech({
      engine,
      createUtterance,
      text: '',
      voice: selectedVoice,
      repeat: 1,
    })).toThrow('朗读文本不能为空')
    expect(() => queueSpeech({
      engine,
      createUtterance,
      text: '旅行',
      voice: selectedVoice,
      repeat: 0,
    })).toThrow('播放次数必须是正整数')
  })
})
