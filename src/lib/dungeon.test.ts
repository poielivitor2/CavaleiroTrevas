import { describe, expect, it } from 'vitest';
import { CELL, MAZE, canMove, lineOfSight, torchLight } from './dungeon';

describe('Dungeon requirements', () => {
  it('has exactly one exit at the end of a connected maze', () => {
    expect(MAZE.exits).toHaveLength(1);
    expect(MAZE.path.at(-1)).toEqual(MAZE.exits[0]);
    expect(MAZE.path.length).toBeGreaterThan(60);
    for (let i = 1; i < MAZE.path.length; i++) {
      const a = MAZE.path[i - 1], b = MAZE.path[i];
      if (!a || !b) throw new Error('Missing connected maze step');
      expect(Math.abs(a.x - b.x) + Math.abs(a.z - b.z)).toBe(1);
      expect(MAZE.grid[b.z]?.[b.x]).toBe(0);
    }
  });
  it('places the final door against a solid dark end wall', () => {
    expect(MAZE.grid[MAZE.end.z + MAZE.exitNormal.z]?.[MAZE.end.x + MAZE.exitNormal.x]).toBe(1);
    const end = MAZE.end;
    const exits = ([[1, 0], [-1, 0], [0, 1], [0, -1]] as [number, number][]).filter(([dx, dz]) => MAZE.grid[end.z + dz]?.[end.x + dx] === 0);
    expect(exits).toHaveLength(1);
  });
  it('mounts every torch within 0.12 meters of a solid wall', () => {
    expect(MAZE.torches.length).toBeGreaterThan(5);
    for (const t of MAZE.torches) {
      expect(MAZE.grid[t.wallZ]?.[t.wallX]).toBe(1);
      const wallFace = t.nx !== 0 ? (t.wallX + (t.nx > 0 ? 1 : 0)) * CELL : (t.wallZ + (t.nz > 0 ? 1 : 0)) * CELL;
      const coordinate = t.nx !== 0 ? t.x : t.z;
      expect(Math.abs(coordinate - wallFace)).toBeCloseTo(0.112, 3);
    }
  });
  it('blocks torch visibility and illumination inside solid walls', () => {
    for (const t of MAZE.torches) {
      const x = (t.wallX + 0.5) * CELL, z = (t.wallZ + 0.5) * CELL;
      expect(lineOfSight(MAZE, t.x, t.z, x, z)).toBe(false);
      expect(torchLight(MAZE, x, 2.25, z)).toBe(0);
      expect(torchLight(MAZE, t.x, 2.25, t.z)).toBeGreaterThan(0.5);
    }
  });
  it('does not let the player cross solid cells or the outer boundary', () => {
    expect(canMove(MAZE, 0, 0)).toBe(false);
    expect(canMove(MAZE, (MAZE.start.x + 0.5) * CELL, (MAZE.start.z + 0.5) * CELL)).toBe(true);
    expect(canMove(MAZE, CELL - 0.1, CELL * 1.5)).toBe(false);
  });
});