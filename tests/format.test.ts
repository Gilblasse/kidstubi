import { describe, expect, it } from 'vitest';
import { formatDuration } from '@/lib/format';
import { parseISO8601Duration } from '@/lib/youtube/client';

describe('formatDuration', () => {
  it('formats sub-minute', () => {
    expect(formatDuration(0)).toBe('0:00');
    expect(formatDuration(7)).toBe('0:07');
    expect(formatDuration(59)).toBe('0:59');
  });
  it('formats minutes:seconds', () => {
    expect(formatDuration(60)).toBe('1:00');
    expect(formatDuration(74)).toBe('1:14');
    expect(formatDuration(125)).toBe('2:05');
  });
  it('formats hours:minutes:seconds with zero-padding', () => {
    expect(formatDuration(3600)).toBe('1:00:00');
    expect(formatDuration(3661)).toBe('1:01:01');
    expect(formatDuration(3 * 3600 + 5 * 60 + 9)).toBe('3:05:09');
  });
  it('handles invalid input', () => {
    expect(formatDuration(Number.NaN)).toBe('0:00');
    expect(formatDuration(-10)).toBe('0:00');
  });
});

describe('parseISO8601Duration', () => {
  it('parses HMS', () => {
    expect(parseISO8601Duration('PT1H2M3S')).toBe(3723);
  });
  it('parses minutes only', () => {
    expect(parseISO8601Duration('PT5M')).toBe(300);
  });
  it('parses seconds only', () => {
    expect(parseISO8601Duration('PT45S')).toBe(45);
  });
  it('returns 0 on garbage', () => {
    expect(parseISO8601Duration('nonsense')).toBe(0);
    expect(parseISO8601Duration('')).toBe(0);
  });
});
