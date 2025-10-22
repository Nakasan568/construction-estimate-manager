import { describe, it, expect } from 'vitest'
import { calculateProfitRate, calculateDaysPassed, formatCurrency } from './calculations.js'

describe('calculateProfitRate', () => {
  it('正常な利益率計算', () => {
    expect(calculateProfitRate(120, 100)).toBe('120.0')
    expect(calculateProfitRate(100, 100)).toBe('100.0')
    expect(calculateProfitRate(80, 100)).toBe('80.0')
  })

  it('ネット金額が0の場合', () => {
    expect(calculateProfitRate(100, 0)).toBe('0.0')
  })

  it('null/undefinedの処理', () => {
    expect(calculateProfitRate(100, null)).toBe('0.0')
    expect(calculateProfitRate(100, undefined)).toBe('0.0')
  })

  it('小数点の処理', () => {
    expect(calculateProfitRate(133.33, 100)).toBe('133.3')
    expect(calculateProfitRate(166.67, 100)).toBe('166.7')
  })
})

describe('calculateDaysPassed', () => {
  it('今日の日付', () => {
    const today = new Date().toISOString().split('T')[0]
    expect(calculateDaysPassed(today)).toBe(0)
  })

  it('過去の日付', () => {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayStr = yesterday.toISOString().split('T')[0]
    expect(calculateDaysPassed(yesterdayStr)).toBe(1)
  })

  it('1週間前', () => {
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    const weekAgoStr = weekAgo.toISOString().split('T')[0]
    expect(calculateDaysPassed(weekAgoStr)).toBe(7)
  })

  it('1ヶ月前', () => {
    const monthAgo = new Date()
    monthAgo.setDate(monthAgo.getDate() - 30)
    const monthAgoStr = monthAgo.toISOString().split('T')[0]
    expect(calculateDaysPassed(monthAgoStr)).toBe(30)
  })
})

describe('formatCurrency', () => {
  it('正常な金額フォーマット', () => {
    expect(formatCurrency(1000)).toBe('¥1,000')
    expect(formatCurrency(1000000)).toBe('¥1,000,000')
    expect(formatCurrency(123456789)).toBe('¥123,456,789')
  })

  it('0の処理', () => {
    expect(formatCurrency(0)).toBe('¥0')
  })

  it('null/undefinedの処理', () => {
    expect(formatCurrency(null)).toBe('¥0')
    expect(formatCurrency(undefined)).toBe('¥0')
  })

  it('NaNの処理', () => {
    expect(formatCurrency(NaN)).toBe('¥0')
  })

  it('小数点の処理', () => {
    expect(formatCurrency(1000.5)).toBe('¥1,001')
    expect(formatCurrency(1000.4)).toBe('¥1,000')
  })
})