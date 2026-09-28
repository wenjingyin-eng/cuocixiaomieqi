import { describe, expect, it } from 'vitest'
import { parseTermInput } from './entry'

describe('parseTermInput', () => {
  it('支持四种分隔符并去除首尾空格', () => {
    expect(parseTermInput('旅行， 已经;尤其；突然, 犹豫')).toEqual([
      '旅行',
      '已经',
      '尤其',
      '突然',
      '犹豫',
    ])
  })

  it('忽略空内容并在同一次输入中去重', () => {
    expect(parseTermInput('旅行，，；旅行, 已经 ;')).toEqual(['旅行', '已经'])
  })
})
