import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  cn,
  formatDate,
  formatTime,
  formatDuration,
  getScoreLabel,
  getScoreColor,
  generateId,
  debounce,
  throttle,
} from './utils'

describe('cn (className merge)', () => {
  it('merges multiple class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar')
  })

  it('handles conditional classes', () => {
    expect(cn('base', true && 'active', false && 'hidden')).toBe('base active')
  })

  it('merges Tailwind classes correctly', () => {
    expect(cn('p-4', 'p-2')).toBe('p-2')
    expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500')
  })

  it('handles empty inputs', () => {
    expect(cn()).toBe('')
    expect(cn('', null, undefined)).toBe('')
  })
})

describe('formatDate', () => {
  it('formats Date object correctly', () => {
    const date = new Date('2024-12-28T12:00:00')
    const result = formatDate(date)
    expect(result).toContain('Dec')
    expect(result).toContain('28')
  })

  it('formats ISO string correctly', () => {
    const result = formatDate('2024-12-28T12:00:00')
    expect(result).toContain('Dec')
    expect(result).toContain('28')
  })
})

describe('formatTime', () => {
  it('formats morning time correctly', () => {
    const date = new Date('2024-12-28T09:30:00')
    const result = formatTime(date)
    expect(result).toMatch(/9:30\s*AM/i)
  })

  it('formats afternoon time correctly', () => {
    const date = new Date('2024-12-28T14:45:00')
    const result = formatTime(date)
    expect(result).toMatch(/2:45\s*PM/i)
  })
})

describe('formatDuration', () => {
  it('formats minutes only', () => {
    expect(formatDuration(30)).toBe('30m')
    expect(formatDuration(59)).toBe('59m')
  })

  it('formats hours only', () => {
    expect(formatDuration(60)).toBe('1h')
    expect(formatDuration(120)).toBe('2h')
  })

  it('formats hours and minutes', () => {
    expect(formatDuration(90)).toBe('1h 30m')
    expect(formatDuration(150)).toBe('2h 30m')
  })

  it('handles zero', () => {
    expect(formatDuration(0)).toBe('0m')
  })
})

describe('getScoreLabel', () => {
  it('returns Musk-Level for scores >= 90', () => {
    expect(getScoreLabel(90)).toBe('Musk-Level')
    expect(getScoreLabel(100)).toBe('Musk-Level')
  })

  it('returns Strong Signal for scores >= 75', () => {
    expect(getScoreLabel(75)).toBe('Strong Signal')
    expect(getScoreLabel(89)).toBe('Strong Signal')
  })

  it('returns Moderate Noise for scores >= 60', () => {
    expect(getScoreLabel(60)).toBe('Moderate Noise')
    expect(getScoreLabel(74)).toBe('Moderate Noise')
  })

  it('returns Noisy for scores >= 40', () => {
    expect(getScoreLabel(40)).toBe('Noisy')
    expect(getScoreLabel(59)).toBe('Noisy')
  })

  it('returns Static for scores < 40', () => {
    expect(getScoreLabel(39)).toBe('Static')
    expect(getScoreLabel(0)).toBe('Static')
  })
})

describe('getScoreColor', () => {
  it('returns green for scores >= 75', () => {
    expect(getScoreColor(75)).toBe('green')
    expect(getScoreColor(100)).toBe('green')
  })

  it('returns amber for scores >= 50', () => {
    expect(getScoreColor(50)).toBe('amber')
    expect(getScoreColor(74)).toBe('amber')
  })

  it('returns red for scores < 50', () => {
    expect(getScoreColor(49)).toBe('red')
    expect(getScoreColor(0)).toBe('red')
  })
})

describe('generateId', () => {
  it('generates unique IDs', () => {
    const id1 = generateId()
    const id2 = generateId()
    expect(id1).not.toBe(id2)
  })

  it('returns a string with timestamp prefix', () => {
    const id = generateId()
    expect(typeof id).toBe('string')
    expect(id).toMatch(/^\d+-[a-z0-9]+$/)
  })
})

describe('debounce', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('delays function execution', () => {
    const fn = vi.fn()
    const debouncedFn = debounce(fn, 100)

    debouncedFn()
    expect(fn).not.toHaveBeenCalled()

    vi.advanceTimersByTime(100)
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('resets timer on subsequent calls', () => {
    const fn = vi.fn()
    const debouncedFn = debounce(fn, 100)

    debouncedFn()
    vi.advanceTimersByTime(50)
    debouncedFn()
    vi.advanceTimersByTime(50)
    expect(fn).not.toHaveBeenCalled()

    vi.advanceTimersByTime(50)
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('passes arguments correctly', () => {
    const fn = vi.fn()
    const debouncedFn = debounce(fn, 100)

    debouncedFn('arg1', 'arg2')
    vi.advanceTimersByTime(100)

    expect(fn).toHaveBeenCalledWith('arg1', 'arg2')
  })
})

describe('throttle', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('executes immediately on first call', () => {
    const fn = vi.fn()
    const throttledFn = throttle(fn, 100)

    throttledFn()
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('ignores calls within delay period', () => {
    const fn = vi.fn()
    const throttledFn = throttle(fn, 100)

    throttledFn()
    throttledFn()
    throttledFn()
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('allows calls after delay period', () => {
    const fn = vi.fn()
    const throttledFn = throttle(fn, 100)

    throttledFn()
    expect(fn).toHaveBeenCalledTimes(1)

    vi.advanceTimersByTime(100)
    throttledFn()
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('passes arguments correctly', () => {
    const fn = vi.fn()
    const throttledFn = throttle(fn, 100)

    throttledFn('arg1', 'arg2')
    expect(fn).toHaveBeenCalledWith('arg1', 'arg2')
  })
})
