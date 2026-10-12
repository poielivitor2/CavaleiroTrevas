export const CELL = 2.8;
export const HEIGHT = 3.1;
export type Cell = { x: number; z: number };
export type Torch = { x: number; z: number; wallX: number; wallZ: number; nx: number; nz: number; yaw: number };

export function createMaze(size = 25) {
  const grid: number[][] = Array.from({ length: size }, () => Array<number>(size).fill(1));
  let seed = 91243;
  const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const start = { x: 1, z: 1 };
  const startRow = grid[1];
  if (startRow) startRow[1] = 0;
  const stack = [start];
  const directions: [number, number][] = [[0, 2], [2, 0], [0, -2], [-2, 0]];
  while (stack.length) {
    const current = stack[stack.length - 1];
    if (!current) break;
    const candidates = directions.filter(([dx, dz]) => {
      const x = current.x + dx, z = current.z + dz;
      return x > 0 && z > 0 && x < size - 1 && z < size - 1 && grid[z]?.[x] === 1;
    });
    const direction = candidates[Math.floor(random() * candidates.length)];
    if (!direction) { stack.pop(); continue; }
    const [dx, dz] = direction;
    const middleRow = grid[current.z + dz / 2], endRow = grid[current.z + dz];
    if (middleRow) middleRow[current.x + dx / 2] = 0;
    if (endRow) endRow[current.x + dx] = 0;
    stack.push({ x: current.x + dx, z: current.z + dz });
  }
  const queue: Cell[] = [start];
  const parents = new Map<string, Cell>();
  const distance = new Map<string, number>([['1,1', 0]]);
  for (let i = 0; i < queue.length; i++) {
    const current = queue[i];
    if (!current) continue;
    for (const [dx, dz] of ([[1, 0], [-1, 0], [0, 1], [0, -1]] as [number, number][])) {
      const next = { x: current.x + dx, z: current.z + dz }, key = `${next.x},${next.z}`;
      if (grid[next.z]?.[next.x] !== 0 || distance.has(key)) continue;
      parents.set(key, current);
      distance.set(key, (distance.get(`${current.x},${current.z}`) ?? 0) + 1);
      queue.push(next);
    }
  }
  const end = queue[queue.length - 1] ?? start;
  const path: Cell[] = [end];
  let previous = parents.get(`${end.x},${end.z}`);
  while (previous) { path.unshift(previous); previous = parents.get(`${previous.x},${previous.z}`); }
  const before = path[path.length - 2] ?? start;
  const exitNormal = { x: end.x - before.x, z: end.z - before.z };
  const torches: Torch[] = [];
  for (const cell of queue) {
    if ((cell.x + cell.z * 3) % 7 !== 0 && !(cell.x === 1 && cell.z === 2)) continue;
    if (Math.hypot(cell.x - end.x, cell.z - end.z) < 2) continue;
    const wall = ([[-1, 0], [1, 0], [0, -1], [0, 1]] as [number, number][]).find(([dx, dz]) => grid[cell.z + dz]?.[cell.x + dx] === 1);
    if (!wall) continue;
    const [dx, dz] = wall;
    torches.push({ x: (cell.x + 0.5 + dx * 0.46) * CELL, z: (cell.z + 0.5 + dz * 0.46) * CELL,
      wallX: cell.x + dx, wallZ: cell.z + dz, nx: -dx, nz: -dz, yaw: Math.atan2(-dx, -dz) });
  }
  return { grid, size, start, end, path, exitNormal, torches, exits: [end] };
}

export type Maze = ReturnType<typeof createMaze>;
export const MAZE = createMaze();

export function isOpen(maze: Maze, x: number, z: number) {
  return maze.grid[Math.floor(z / CELL)]?.[Math.floor(x / CELL)] === 0;
}

export function canMove(maze: Maze, x: number, z: number, radius = 0.22) {
  return isOpen(maze, x - radius, z - radius) && isOpen(maze, x + radius, z - radius)
    && isOpen(maze, x - radius, z + radius) && isOpen(maze, x + radius, z + radius);
}

// Grid DDA: occlusion is evaluated against solid maze cells, never just distance.
export function lineOfSight(maze: Maze, ax: number, az: number, bx: number, bz: number) {
  if (!isOpen(maze, ax, az) || !isOpen(maze, bx, bz)) return false;
  let x = Math.floor(ax / CELL), z = Math.floor(az / CELL);
  const endX = Math.floor(bx / CELL), endZ = Math.floor(bz / CELL);
  const dx = bx - ax, dz = bz - az;
  const sx = Math.sign(dx), sz = Math.sign(dz);
  const tx = dx === 0 ? Infinity : CELL / Math.abs(dx);
  const tz = dz === 0 ? Infinity : CELL / Math.abs(dz);
  let nextX = dx === 0 ? Infinity : ((sx > 0 ? (x + 1) * CELL : x * CELL) - ax) / dx;
  let nextZ = dz === 0 ? Infinity : ((sz > 0 ? (z + 1) * CELL : z * CELL) - az) / dz;
  for (let i = 0; i < maze.size * 2; i++) {
    if (x === endX && z === endZ) return true;
    if (nextX < nextZ) { x += sx; nextX += tx; }
    else { z += sz; nextZ += tz; }
    if (maze.grid[z]?.[x] !== 0) return false;
  }
  return false;
}

export function torchLight(maze: Maze, x: number, y: number, z: number) {
  let light = 0;
  for (const torch of maze.torches) {
    const distance = Math.hypot(x - torch.x, y - 2.25, z - torch.z);
    if (distance < 7 && lineOfSight(maze, torch.x, torch.z, x, z)) light += Math.pow(1 - distance / 7, 2) * 0.85;
  }
  return Math.min(0.85, light);
}