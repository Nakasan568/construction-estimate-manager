import { describe, it, expect } from 'vitest';
import { calculateProfitRate, calculateDaysPassed, formatCurrency } from '../calculations.js';

describe('calculateProfitRate', () => {
  it('should calculate profit rate correctly', () => {
    expect(calculateProfitRate(120000, 100000)).toBe('120.0');
    expect(calculateProfitRate(110000, 100000)).toBe('110.0');
    expect(calculateProfitRate(90000, 100000)).toBe('90.0');
  });

  it('should handle decimal results correctly', () => {
    expect(calculateProfitRate(115000, 100000)).toBe('115.0');
    expect(calculateProfitRate(112500, 100000)).toBe('112.5');
  });

  it('should handle zero net amount', () => {
    expect(calculateProfitRate(100000, 0)).toBe('0.0');
  });

  it('should handle null and undefined net amounts', () => {
    expect(calculateProfitRate(100000, null)).toBe('0.0');
    expect(calculateProfitRate(100000, undefined)).toBe('0.0');
  });

  it('should handle zero customer amount', () => {
    expect(calculateProfitRate(0, 100000)).toBe('0.0');
  });
});

describe('calculateDaysPassed', () => {
  it('should calculate days passed correctly for today', () => {
    const today = new Date();
    expect(calculateDaysPassed(today)).toBe(0);
  });

  it('should calculate days passed correctly for past dates', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    expect(calculateDaysPassed(yesterday)).toBe(1);

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    expect(calculateDaysPassed(weekAgo)).toBe(7);

    const monthAgo = new Date();
    monthAgo.setDate(monthAgo.getDate() - 30);
    expect(calculateDaysPassed(monthAgo)).toBe(30);
  });

  it('should handle string dates', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayString = yesterday.toISOString().split('T')[0];
    expect(calculateDaysPassed(yesterdayString)).toBe(1);
  });

  it('should ignore time components', () => {
    const today = new Date();
    const todayWithTime = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 15, 30, 45);
    expect(calculateDaysPassed(todayWithTime)).toBe(0);
  });
});

describe('formatCurrency', () => {
  it('should format currency with yen symbol and commas', () => {
    expect(formatCurrency(1000)).toBe('¥1,000');
    expect(formatCurrency(10000)).toBe('¥10,000');
    expect(formatCurrency(100000)).toBe('¥100,000');
    expect(formatCurrency(1000000)).toBe('¥1,000,000');
  });

  it('should handle zero amount', () => {
    expect(formatCurrency(0)).toBe('¥0');
  });

  it('should handle null and undefined amounts', () => {
    expect(formatCurrency(null)).toBe('¥0');
    expect(formatCurrency(undefined)).toBe('¥0');
  });

  it('should handle non-numeric values', () => {
    expect(formatCurrency('invalid')).toBe('¥0');
    expect(formatCurrency(NaN)).toBe('¥0');
  });

  it('should handle decimal amounts', () => {
    expect(formatCurrency(1000.5)).toBe('¥1,001');
    expect(formatCurrency(1000.4)).toBe('¥1,000');
  });

  it('should handle negative amounts', () => {
    expect(formatCurrency(-1000)).toBe('¥-1,000');
  });
});