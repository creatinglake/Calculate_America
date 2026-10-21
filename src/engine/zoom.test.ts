import { describe, expect, it } from 'vitest';
import { fromDataFile } from './distribution';
import { buildQuantile } from './quantile';
import { loadData } from './test/data';
import { CELLS, HOURS_PER_YEAR, levelStats, withinTop1, ZOOM_LEVELS } from './zoom';

const file = loadData('us-ptinc');
const Q = buildQuantile(fromDataFile(file, 2023));
const adults = file.adults!['2023']!;

describe('zoom grid', () => {
  it('cells tile each level and people come from the adult count', () => {
    for (let l = 0; l < ZOOM_LEVELS.length; l++) {
      const s = levelStats(Q, adults, l);
      expect(s.cells).toHaveLength(CELLS);
      expect(s.cells[0]!.p0).toBeCloseTo(ZOOM_LEVELS[l]!.from, 12);
      expect(s.cells[99]!.p1).toBe(1);
      expect(s.peoplePerCell * CELLS).toBeCloseTo(adults * (1 - ZOOM_LEVELS[l]!.from), 3);
      // the level's average is the average of its cells
      const avg = s.cells.reduce((a, c) => a + c.average, 0) / CELLS;
      expect(avg / s.average).toBeCloseTo(1, 9);
    }
  });

  it('cell averages rise and the zoom target is the top tenth', () => {
    const s0 = levelStats(Q, adults, 0), s1 = levelStats(Q, adults, 1);
    expect(s0.zoomFrom).toBe(99);
    expect(s1.zoomFrom).toBe(90);
    expect(levelStats(Q, adults, 3).zoomFrom).toBeNull();
    for (let i = 1; i < CELLS; i++) expect(s1.cells[i]!.average).toBeGreaterThanOrEqual(s1.cells[i - 1]!.average);
  });

  it('hours to earn the median', () => {
    const s = levelStats(Q, adults, 2);
    expect(s.hoursToEarnMedian).toBeCloseTo((s.median / s.average) * HOURS_PER_YEAR, 9);
    expect(levelStats(Q, adults, 0).hoursToEarnMedian).toBeLessThan(HOURS_PER_YEAR);
  });

  it('within-top-1% shares sum to 1', () => {
    const w = withinTop1(Q);
    expect(w.t09 + w.t009 + w.t001).toBeCloseTo(1, 12);
  });
});
