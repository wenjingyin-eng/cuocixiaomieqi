import { describe, expect, it, vi } from 'vitest'
import { getChineseVoices, getVoiceId, queueSpeech, resolveVoice } from './speechService'

function voice(id: string, lang: string, isDefault = false, voiceUri = id): SpeechSynthesisVoice {
  return {
    default: isDefault,
    lang,
    localService: true,
    name: id,
    voiceURI: voiceUri,
  }
}

describe('speechService', () => {
  it('候选列表只保留 zh-CN，并限制为三个', () => {
    const voices = [
      voice('english', 'en-US'),
      voice('cantonese', 'zh-HK'),
      voice('mandarin-1', 'zh-CN'),
      voice('mandarin-2', 'zh_CN'),
      voice('simplified', 'zh-Hans-CN'),
      voice('taiwan', 'zh-TW'),
    ]

    expect(getChineseVoices(voices).map((item) => item.voiceURI))
      .toEqual(['mandarin-1', 'mandarin-2'])
  })

  it('优先恢复当前设备仍存在的中文用户选择', () => {
    const voices = [
      voice('mandarin-default', 'zh-CN', true),
      voice('user-selected', 'zh-CN'),
    ]

    expect(resolveVoice(voices, 'user-selected')?.voiceURI).toBe('user-selected')
    expect(resolveVoice([], 'missing')).toBeNull()
  })

  it('失效偏好重新从当前 zh-CN voice 选择，不按原数组位置或其他语言回退', () => {
    const voices = [
      voice('english-default', 'en-US'),
      voice('taiwan-default', 'zh-TW', true),
      voice('mandarin', 'zh-CN'),
    ]

    expect(resolveVoice(voices, 'english-default')?.voiceURI).toBe('mandarin')
    expect(resolveVoice(voices, 'missing')?.voiceURI).toBe('mandarin')
    expect(resolveVoice([voice('english-only', 'en-GB')])).toBeNull()
    expect(resolveVoice([voice('cantonese', 'zh-HK')])).toBeNull()
  })

  it('只在 zh-CN 候选内优先 default voice', () => {
    expect(resolveVoice([
      voice('english', 'en-US', true),
      voice('taiwan', 'zh-TW'),
      voice('mandarin', 'zh-CN'),
      voice('mandarin-default', 'zh-CN', true),
    ])?.voiceURI).toBe('mandarin-default')
  })

  it('voiceURI 为空时使用名称和语言生成设备内稳定标识，不依赖数组下标', () => {
    const selectedVoice = voice('系统普通话', 'zh-CN', false, '')
    expect(getVoiceId(selectedVoice)).toBe('系统普通话:zh-cn')
    expect(resolveVoice([selectedVoice], '系统普通话:zh-cn')).toBe(selectedVoice)
  })

  it('连续播放时在每遍之间留出 1 秒间隔', () => {
    const spoken: SpeechSynthesisUtterance[] = []
    const engine = {
      cancel: vi.fn(),
      speak: vi.fn((utterance: SpeechSynthesisUtterance) => spoken.push(utterance)),
    }
    const createUtterance = (text: string) => ({ text }) as SpeechSynthesisUtterance
    const selectedVoice = voice('mandarin', 'zh-CN')
    const scheduled: Array<{ callback: () => void; delayMs: number }> = []

    queueSpeech({
      engine,
      createUtterance,
      text: '旅行',
      voice: selectedVoice,
      repeat: 3,
      schedule: (callback, delayMs) => scheduled.push({ callback, delayMs }),
    })

    expect(engine.cancel).toHaveBeenCalledOnce()
    expect(engine.speak).toHaveBeenCalledOnce()
    spoken[0].onend?.({} as SpeechSynthesisEvent)
    expect(scheduled[0].delayMs).toBe(1000)
    scheduled[0].callback()
    expect(engine.speak).toHaveBeenCalledTimes(2)
    spoken[1].onend?.({} as SpeechSynthesisEvent)
    expect(scheduled[1].delayMs).toBe(1000)
    scheduled[1].callback()
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
