import { describe, expect, it } from 'vitest'
import { parseTermInput } from './entry'

describe('parseTermInput', () => {
  it('支持空格、全角空格、换行和常见中英文标点', () => {
    expect(parseTermInput('旅行、尤其。已经！突然\n犹豫　马上? 后来:最后/完成（测试）')).toEqual([
      '旅行',
      '尤其',
      '已经',
      '突然',
      '犹豫',
      '马上',
      '后来',
      '最后',
      '完成',
      '测试',
    ])
  })

  it('标点和符号不进入词语内容', () => {
    expect(parseTermInput('【旅行】+尤其……已经！！！')).toEqual(['旅行', '尤其', '已经'])
    expect(parseTermInput('、。！？；，,.;!?@#$%')).toEqual([])
  })

  it('忽略空内容并在同一次输入中去重', () => {
    expect(parseTermInput('旅行，，；旅行\n已经 ;')).toEqual(['旅行', '已经'])
  })
})
