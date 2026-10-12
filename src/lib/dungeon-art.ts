import * as THREE from 'three';
import { CELL, HEIGHT, MAZE, torchLight } from './dungeon';

export const SCENE_COLORS = {
  darkness: '#101313', bone: '#b4b0a0', steel: '#575e5d', flame: '#ffb34a',
  stone: '#686c5b', moss: '#394b2b', mortar: '#242a26', floor: '#454b43',
  gravel: '#77796b', crack: '#282c28', door: '#413727', iron: '#232827',
};

export function surfaceTexture(kind: 'wall' | 'floor' | 'door') {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.Texture();
  let seed = 2324;
  const rand = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  ctx.fillStyle = kind === 'wall' ? SCENE_COLORS.mortar : kind === 'floor' ? SCENE_COLORS.floor : SCENE_COLORS.door;
  ctx.fillRect(0, 0, 128, 128);
  if (kind === 'wall') {
    for (let row = 0; row < 8; row++) for (let col = -1; col < 5; col++) {
      const x = col * 32 + (row % 2) * 16, y = row * 16;
      ctx.fillStyle = SCENE_COLORS.stone; ctx.globalAlpha = 0.6 + rand() * 0.4;
      ctx.fillRect(x + 1, y + 1, 30, 14);
      ctx.fillStyle = SCENE_COLORS.gravel; ctx.globalAlpha = 0.4; ctx.fillRect(x + 2, y + 1, 28, 1);
      ctx.fillStyle = SCENE_COLORS.crack; ctx.fillRect(x + 2, y + 14, 28, 1);
    }
  }
  ctx.globalAlpha = 1;
  for (let i = 0; i < 2400; i++) {
    ctx.fillStyle = kind === 'wall' && rand() > 0.68 ? SCENE_COLORS.moss : rand() > 0.5 ? SCENE_COLORS.gravel : SCENE_COLORS.crack;
    ctx.globalAlpha = 0.12 + rand() * 0.28;
    ctx.fillRect(Math.floor(rand() * 128), Math.floor(rand() * 128), 1 + Math.floor(rand() * 3), 1 + Math.floor(rand() * 2));
  }
  ctx.globalAlpha = 1;
  if (kind === 'floor') {
    for (let i = 0; i < 35; i++) {
      const x = rand() * 128, y = rand() * 128, s = 2 + rand() * 6;
      ctx.fillStyle = SCENE_COLORS.crack; ctx.fillRect(x, y, s + 2, s * 0.5 + 2);
      ctx.fillStyle = SCENE_COLORS.gravel; ctx.globalAlpha = 0.6; ctx.fillRect(x, y, s, s * 0.5); ctx.globalAlpha = 1;
    }
    ctx.strokeStyle = SCENE_COLORS.crack; ctx.lineWidth = 1;
    for (let i = 0; i < 8; i++) {
      const x = rand() * 128, y = rand() * 128; ctx.beginPath(); ctx.moveTo(x, y);
      ctx.lineTo(x + 8, y + 3); ctx.lineTo(x + 5, y + 12); ctx.lineTo(x + 13, y + 16); ctx.stroke();
    }
  }
  if (kind === 'door') {
    ctx.strokeStyle = SCENE_COLORS.crack; ctx.lineWidth = 3;
    for (let x = 0; x < 128; x += 16) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 128); ctx.stroke(); }
    ctx.fillStyle = SCENE_COLORS.iron;
    for (const y of [16, 100]) { ctx.fillRect(0, y, 128, 9); ctx.fillStyle = SCENE_COLORS.steel;
      for (let x = 7; x < 128; x += 16) ctx.fillRect(x, y + 3, 3, 3); ctx.fillStyle = SCENE_COLORS.iron; }
    ctx.strokeStyle = SCENE_COLORS.gravel; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(98, 67, 6, 0, Math.PI * 2); ctx.stroke();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace; texture.magFilter = THREE.NearestFilter;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

const behindDir = {
  x: MAZE.start.x - (MAZE.path[1]?.x ?? MAZE.start.x),
  z: MAZE.start.z - (MAZE.path[1]?.z ?? MAZE.start.z),
};

type Point = [number, number, number];
export function buildVoid(): THREE.BufferGeometry | null {
  if (behindDir.x === 0 && behindDir.z === 0) return null;
  const sx0 = MAZE.start.x * CELL, sx1 = (MAZE.start.x + 1) * CELL;
  const sz0 = MAZE.start.z * CELL, sz1 = (MAZE.start.z + 1) * CELL;
  const depth = 3 * CELL;
  const near = 0.035;
  let vx0 = sx0, vx1 = sx1, vz0 = sz0, vz1 = sz1;
  if (behindDir.x === -1) { vx0 = sx0 - depth; vx1 = sx0; }
  else if (behindDir.x === 1) { vx0 = sx1; vx1 = sx1 + depth; }
  else if (behindDir.z === -1) { vz0 = sz0 - depth; vz1 = sz0; }
  else if (behindDir.z === 1) { vz0 = sz1; vz1 = sz1 + depth; }
  const isXDir = behindDir.x !== 0;
  const darknessAt = (x: number, z: number): number => {
    if (isXDir) return behindDir.x === -1 ? (sx0 - x) / depth : (x - sx1) / depth;
    return behindDir.z === -1 ? (sz0 - z) / depth : (z - sz1) / depth;
  };
  const positions: number[] = [];
  const colors: number[] = [];
  const addVertex = (x: number, y: number, z: number) => {
    positions.push(x, y, z);
    const d = Math.max(0, Math.min(1, darknessAt(x, z)));
    const v = near * (1 - d);
    colors.push(v, v, v);
  };
  const addQuad = (a: Point, b: Point, c: Point, d: Point) => {
    addVertex(...a); addVertex(...b); addVertex(...c);
    addVertex(...a); addVertex(...c); addVertex(...d);
  };
  addQuad([vx0, 0, vz1], [vx1, 0, vz1], [vx1, 0, vz0], [vx0, 0, vz0]);
  addQuad([vx0, HEIGHT, vz0], [vx1, HEIGHT, vz0], [vx1, HEIGHT, vz1], [vx0, HEIGHT, vz1]);
  if (isXDir) {
    addQuad([vx0, 0, vz0], [vx1, 0, vz0], [vx1, HEIGHT, vz0], [vx0, HEIGHT, vz0]);
    addQuad([vx1, 0, vz1], [vx0, 0, vz1], [vx0, HEIGHT, vz1], [vx1, HEIGHT, vz1]);
  } else {
    addQuad([vx0, 0, vz0], [vx0, 0, vz1], [vx0, HEIGHT, vz1], [vx0, HEIGHT, vz0]);
    addQuad([vx1, 0, vz1], [vx1, 0, vz0], [vx1, HEIGHT, vz0], [vx1, HEIGHT, vz1]);
  }
  if (isXDir) {
    const bx = behindDir.x === -1 ? vx0 : vx1;
    addQuad([bx, 0, vz0], [bx, 0, vz1], [bx, HEIGHT, vz1], [bx, HEIGHT, vz0]);
  } else {
    const bz = behindDir.z === -1 ? vz0 : vz1;
    addQuad([vx0, 0, bz], [vx1, 0, bz], [vx1, HEIGHT, bz], [vx0, HEIGHT, bz]);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  g.computeVertexNormals();
  return g;
}

export function buildSurfaces() {
  const wallPos: number[] = [], wallUv: number[] = [], wallColors: number[] = [];
  const floorPos: number[] = [], floorUv: number[] = [], floorColors: number[] = [];
  function quad(corners: [Point, Point, Point, Point], sampleOffset: Point, floor = false, dark = false) {
    const positions = floor ? floorPos : wallPos, uvs = floor ? floorUv : wallUv, colors = floor ? floorColors : wallColors;
    const steps = 2;
    const a = new THREE.Vector3(...corners[0]), b = new THREE.Vector3(...corners[1]), d = new THREE.Vector3(...corners[3]);
    for (let iz = 0; iz < steps; iz++) for (let ix = 0; ix < steps; ix++) {
      const coords: [number, number][] = [[ix, iz], [ix + 1, iz], [ix + 1, iz + 1], [ix, iz + 1]];
      for (const idx of [0, 1, 2, 0, 2, 3]) {
        const coordinate = coords[idx];
        if (!coordinate) continue;
        const [u, v] = coordinate;
        const p = a.clone().addScaledVector(b.clone().sub(a), u / steps).addScaledVector(d.clone().sub(a), v / steps);
        positions.push(p.x, p.y, p.z); uvs.push(u / steps, v / steps);
        const sx = p.x + sampleOffset[0], sz = p.z + sampleOffset[2];
        const light = torchLight(MAZE, sx, p.y, sz);
        const base = dark ? 0.2 : floor ? 0.47 : 0.54;
        colors.push(base + light * 0.66, base + light * 0.43, base + light * 0.19);
      }
    }
  }
  for (let z = 1; z < MAZE.size - 1; z++) for (let x = 1; x < MAZE.size - 1; x++) {
    if (MAZE.grid[z]?.[x] !== 0) continue;
    const x0 = x * CELL, x1 = (x + 1) * CELL, z0 = z * CELL, z1 = (z + 1) * CELL;
    quad([[x0, 0, z1], [x1, 0, z1], [x1, 0, z0], [x0, 0, z0]], [0.015, 0, 0.015], true);
    quad([[x0, HEIGHT, z0], [x1, HEIGHT, z0], [x1, HEIGHT, z1], [x0, HEIGHT, z1]], [0.015, 0, 0.015]);
    const final = x === MAZE.end.x && z === MAZE.end.z;
    const isStart = x === MAZE.start.x && z === MAZE.start.z;
    if (MAZE.grid[z - 1]?.[x] === 1 && !(isStart && behindDir.z === -1)) quad([[x0, 0, z0], [x1, 0, z0], [x1, HEIGHT, z0], [x0, HEIGHT, z0]], [0.01, 0, 0.025], false, final);
    if (MAZE.grid[z + 1]?.[x] === 1 && !(isStart && behindDir.z === 1)) quad([[x1, 0, z1], [x0, 0, z1], [x0, HEIGHT, z1], [x1, HEIGHT, z1]], [-0.01, 0, -0.025], false, final);
    if (MAZE.grid[z]?.[x - 1] === 1 && !(isStart && behindDir.x === -1)) quad([[x0, 0, z1], [x0, 0, z0], [x0, HEIGHT, z0], [x0, HEIGHT, z1]], [0.025, 0, -0.01], false, final);
    if (MAZE.grid[z]?.[x + 1] === 1 && !(isStart && behindDir.x === 1)) quad([[x1, 0, z0], [x1, 0, z1], [x1, HEIGHT, z1], [x1, HEIGHT, z0]], [-0.025, 0, 0.01], false, final);
  }
  function geometry(pos: number[], uv: number[], color: number[]) {
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setAttribute('color', new THREE.Float32BufferAttribute(color, 3)); g.computeVertexNormals(); return g;
  }
  return { walls: geometry(wallPos, wallUv, wallColors), floor: geometry(floorPos, floorUv, floorColors) };
}