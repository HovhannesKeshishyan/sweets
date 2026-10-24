import { describe, expect, it } from 'vitest'
import {
  currencyFractionDigits,
  formatMoney,
  isMinorAmount,
  percentOf,
  toMajorUnits,
  toMinorUnits,
} from '../../shared/utils/money'

describe('money', () => {
  it('knows minor-unit digits per currency', () => {
    expect(currencyFractionDigits('USD')).toBe(2)
    expect(currencyFractionDigits('eur')).toBe(2)
    expect(currencyFractionDigits('JPY')).toBe(0)
  })

  it('converts major to minor units without float drift', () => {
    expect(toMinorUnits(1.005, 'USD')).toBe(101)
    expect(toMinorUnits(19.99, 'USD')).toBe(1999)
    expect(toMinorUnits(0.1 + 0.2, 'USD')).toBe(30)
    expect(toMinorUnits(1500, 'JPY')).toBe(1500)
    expect(toMinorUnits(1e-7, 'USD')).toBe(0)
  })

  it('rejects non-finite amounts', () => {
    expect(() => toMinorUnits(Number.NaN, 'USD')).toThrow(RangeError)
    expect(() => toMinorUnits(Number.POSITIVE_INFINITY, 'USD')).toThrow(RangeError)
  })

  it('converts minor back to major units', () => {
    expect(toMajorUnits(1999, 'USD')).toBe(19.99)
    expect(toMajorUnits(1500, 'JPY')).toBe(1500)
  })

  it('formats for display', () => {
    expect(formatMoney(123456, 'USD')).toBe('$1,234.56')
    expect(formatMoney(1500, 'JPY')).toBe('¥1,500')
  })

  it('computes percentages in whole minor units', () => {
    expect(percentOf(1999, 10)).toBe(200) // 199.9 → 200
    expect(percentOf(1000, 15)).toBe(150)
    expect(() => percentOf(1000, 101)).toThrow(RangeError)
  })

  it('validates minor amounts', () => {
    expect(isMinorAmount(100)).toBe(true)
    expect(isMinorAmount(0)).toBe(true)
    expect(isMinorAmount(1.5)).toBe(false)
    expect(isMinorAmount(-1)).toBe(false)
    expect(isMinorAmount('100')).toBe(false)
  })
})
