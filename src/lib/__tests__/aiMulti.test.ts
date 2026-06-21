import { describe, expect, it } from 'vitest';
import { splitForHeuristic } from '../aiMulti';

describe('multi-entry fallback', () => {
  it('splits separate actions into separate parts', () => {
    const parts = splitForHeuristic('worked out 30 min, then read 20 pages, and then cooked dinner');
    expect(parts.length).toBe(3);
    expect(parts[0]).toMatch(/worked out/i);
    expect(parts[1]).toMatch(/read 20 pages/i);
    expect(parts[2]).toMatch(/cooked dinner/i);
  });
});
