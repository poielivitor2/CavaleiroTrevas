import { useEffect, useMemo, useRef, Suspense } from 'react';
import { useFrame, useLoader, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { CELL, HEIGHT, MAZE, canMove, lineOfSight } from '@/lib/dungeon';
import { buildSurfaces, buildVoid, SCENE_COLORS, surfaceTexture } from '@/lib/dungeon-art';
import torchImage from '@/assets/torch.png';
import skeletonImage from '@/assets/skeleton.png';
import goblinImage from '@/assets/goblin.png';

export interface PlayState {
  keys: Set<string>; playing: boolean; won: boolean; hp: number; mp: number; kills: number; coins: number;
  x: number; z: number; yaw: number; pitch: number; attack: number; magic: number; defending: boolean;
  touchForward: number; touchTurn: number; nearExit: boolean; reset: number;
}
export const initialState = (): PlayState => {
  const next = MAZE.path[1] ?? MAZE.start;
  return { keys: new Set(), playing: false, won: false, hp: 100, mp: 50, kills: 0, coins: 0,
    x: (MAZE.start.x + 0.5) * CELL, z: (MAZE.start.z + 0.5) * CELL,
    yaw: Math.atan2(-(next.x - MAZE.start.x), -(next.z - MAZE.start.z)), pitch: -0.06,
    attack: 0, magic: 0, defending: false, touchForward: 0, touchTurn: 0, nearExit: false, reset: 0 };
};
type Props = { state: React.RefObject<PlayState>; onUpdate: () => void };

function World() {
  const resources = useMemo(() => ({ ...buildSurfaces(), voidGeo: buildVoid(), wallTex: surfaceTexture('wall'), floorTex: surfaceTexture('floor'), doorTex: surfaceTexture('door') }), []);
  useEffect(() => () => { Object.values(resources).forEach(r => r.dispose()); }, [resources]);
  const end = MAZE.end, normal = MAZE.exitNormal;
  const doorX = (end.x + 0.5 + normal.x * 0.493) * CELL;
  const doorZ = (end.z + 0.5 + normal.z * 0.493) * CELL;
  return <>
    <mesh geometry={resources.walls}><meshBasicMaterial map={resources.wallTex} vertexColors /></mesh>
    <mesh geometry={resources.floor}><meshBasicMaterial map={resources.floorTex} vertexColors /></mesh>
    {resources.voidGeo && <mesh geometry={resources.voidGeo}><meshBasicMaterial vertexColors side={THREE.DoubleSide} /></mesh>}
    <mesh position={[doorX, 1.25, doorZ]} rotation-y={Math.atan2(-normal.x, -normal.z)}>
      <planeGeometry args={[1.55, 2.5]} /><meshBasicMaterial map={resources.doorTex} color={SCENE_COLORS.gravel} />
    </mesh>
    <Suspense fallback={null}><FixedProps /></Suspense>
  </>;
}

function FixedProps() {
  const torch = useLoader(THREE.TextureLoader, torchImage);
  const skeleton = useLoader(THREE.TextureLoader, skeletonImage);
  useEffect(() => { [torch, skeleton].forEach(t => { t.magFilter = THREE.NearestFilter; t.colorSpace = THREE.SRGBColorSpace; }); }, [torch, skeleton]);
  const end = MAZE.end;
  return <>
    {MAZE.torches.map((t, i) => <mesh key={i} name={`wall-torch-${i}`} position={[t.x, 1.94, t.z]} rotation-y={t.yaw}>
      <planeGeometry args={[0.32, 0.96]} />
      <meshBasicMaterial map={torch} transparent alphaTest={0.3} side={THREE.DoubleSide} />
    </mesh>)}
    {([[-0.68, -0.4, 0.3], [0.63, 0.32, -0.7], [-0.2, 0.83, 1.9]] as [number, number, number][]).map(([dx, dz, rotation], i) =>
      <mesh key={i} name={`fallen-warrior-${i}`} position={[(end.x + 0.5) * CELL + dx, 0.02 + i * 0.001, (end.z + 0.5) * CELL + dz]} rotation={[-Math.PI / 2, 0, rotation]}>
        <planeGeometry args={[1.0, 1.25]} />
        <meshBasicMaterial map={skeleton} transparent alphaTest={0.3} color={SCENE_COLORS.bone} />
      </mesh>)}
  </>;
}

function Player({ state, onUpdate }: Props) {
  const { camera, gl } = useThree();
  const tick = useRef(0), lastReset = useRef(-1);
  useFrame((_, rawDelta) => {
    const s = state.current, dt = Math.min(rawDelta, 0.05), k = s.keys;
    if (s.playing && !s.won && s.hp > 0) {
      s.yaw += ((k.has('ArrowLeft') ? 1 : 0) - (k.has('ArrowRight') ? 1 : 0) - s.touchTurn) * 1.9 * dt;
      const forward = (k.has('KeyW') || k.has('ArrowUp') ? 1 : 0) - (k.has('KeyS') || k.has('ArrowDown') ? 1 : 0) + s.touchForward;
      const strafe = (k.has('KeyD') ? 1 : 0) - (k.has('KeyA') ? 1 : 0);
      const length = Math.max(1, Math.hypot(forward, strafe));
      const dx = (-Math.sin(s.yaw) * forward + Math.cos(s.yaw) * strafe) / length * 4.5 * dt;
      const dz = (-Math.cos(s.yaw) * forward - Math.sin(s.yaw) * strafe) / length * 4.5 * dt;
      if (canMove(MAZE, s.x + dx, s.z)) s.x += dx;
      if (canMove(MAZE, s.x, s.z + dz)) s.z += dz;
      s.defending = k.has('ShiftLeft') || k.has('ShiftRight') || k.has('KeyL') || k.has('MouseRight');
      s.attack = Math.max(0, s.attack - dt); s.magic = Math.max(0, s.magic - dt);
      s.mp = Math.min(50, s.mp + dt * 1.5);
      const ex = (MAZE.end.x + 0.5) * CELL, ez = (MAZE.end.z + 0.5) * CELL;
      s.nearExit = Math.hypot(s.x - ex, s.z - ez) < 1.7 && lineOfSight(MAZE, s.x, s.z, ex, ez);
      if (s.nearExit && k.has('KeyE')) { s.won = true; s.playing = false; document.exitPointerLock(); onUpdate(); }
    }
    camera.position.set(s.x, 1.35, s.z); camera.rotation.order = 'YXZ'; camera.rotation.set(s.pitch, s.yaw, 0);
    if (lastReset.current !== s.reset) { lastReset.current = s.reset; onUpdate(); }
    tick.current += dt;
    if (tick.current > 0.1) {
      tick.current = 0;
      gl.domElement.dataset['position'] = `${s.x.toFixed(3)},${s.z.toFixed(3)}`;
      gl.domElement.dataset['yaw'] = s.yaw.toFixed(3);
      onUpdate();
    }
  });
  return null;
}

function Enemies({ state }: Props) {
  const texture = useLoader(THREE.TextureLoader, goblinImage);
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  const enemies = useRef(MAZE.path.filter((_, i) => i > 14 && i < MAZE.path.length - 10 && i % 31 === 0).slice(0, 5).map(c => ({ x: (c.x + 0.5) * CELL, z: (c.z + 0.5) * CELL, hp: 2, cooldown: 0, hit: false })));
  const lastReset = useRef(0);
  useEffect(() => { texture.magFilter = THREE.NearestFilter; }, [texture]);
  useFrame((_, delta) => {
    const s = state.current, dt = Math.min(delta, 0.05);
    if (lastReset.current !== s.reset) { lastReset.current = s.reset; enemies.current.forEach(e => { e.hp = 2; e.cooldown = 0; e.hit = false; }); }
    enemies.current.forEach((e, i) => {
      const mesh = refs.current[i]; if (!mesh) return;
      mesh.visible = e.hp > 0; if (e.hp <= 0) return;
      mesh.rotation.y = Math.atan2(s.x - e.x, s.z - e.z);
      if (!s.playing) return;
      e.cooldown -= dt;
      const distance = Math.hypot(s.x - e.x, s.z - e.z);
      const visible = distance < 6 && lineOfSight(MAZE, s.x, s.z, e.x, e.z);
      if (!visible) return;
      const bearing = Math.atan2(-(e.x - s.x), -(e.z - s.z));
      const facing = Math.abs(Math.atan2(Math.sin(bearing - s.yaw), Math.cos(bearing - s.yaw))) < 0.65;
      if (!s.attack && !s.magic) e.hit = false;
      if (!e.hit && facing && ((s.attack > 0.12 && distance < 2.1) || (s.magic > 0.15 && distance < 6))) {
        e.hp -= s.magic > 0.15 ? 2 : 1; e.hit = true;
        if (e.hp <= 0) { s.kills++; s.coins += 10; return; }
      }
      if (distance < 1.4 && e.cooldown <= 0) { s.hp = Math.max(0, s.hp - (s.defending ? 2 : 8)); e.cooldown = 1.4; }
    });
  });
  return enemies.current.map((e, i) => <mesh key={i} ref={m => { refs.current[i] = m; }} position={[e.x, 0.84, e.z]}>
    <planeGeometry args={[1.3, 1.7]} /><meshBasicMaterial map={texture} transparent alphaTest={0.3} />
  </mesh>);
}

// One half-resolution render and one inexpensive palette pass; no bloom or shadow maps.
function PixelPass() {
  const { gl, size } = useThree();
  const post = useMemo(() => {
    const target = new THREE.WebGLRenderTarget(1, 1, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter });
    const material = new THREE.ShaderMaterial({ uniforms: { image: { value: target.texture } }, depthTest: false, depthWrite: false,
      vertexShader: 'varying vec2 uvOut; void main(){uvOut=uv;gl_Position=vec4(position.xy,0.,1.);}',
      fragmentShader: `uniform sampler2D image; varying vec2 uvOut;
      void main(){vec3 c=texture2D(image,uvOut).rgb;float d=mod(floor(gl_FragCoord.x)+floor(gl_FragCoord.y),2.)*.014; c=floor((c+d)*40.)/40.; gl_FragColor=vec4(pow(max(c,vec3(0.)),vec3(1./2.2)),1.);}` });
    const scene = new THREE.Scene(), geometry = new THREE.PlaneGeometry(2, 2);
    scene.add(new THREE.Mesh(geometry, material));
    return { target, material, scene, geometry, camera: new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1) };
  }, []);
  useEffect(() => { const scale = Math.min(0.65, 640 / size.width); post.target.setSize(Math.max(1, Math.floor(size.width * scale)), Math.max(1, Math.floor(size.height * scale))); }, [post, size]);
  useEffect(() => () => { post.target.dispose(); post.material.dispose(); post.geometry.dispose(); }, [post]);
  useFrame(({ scene, camera }) => { gl.setRenderTarget(post.target); gl.render(scene, camera); gl.setRenderTarget(null); gl.render(post.scene, post.camera); }, 1);
  return null;
}

export function DungeonScene(props: Props) {
  return <>
    <color attach="background" args={[SCENE_COLORS.darkness]} />
    <fog attach="fog" args={[SCENE_COLORS.darkness, 3.8, 19]} />
    <ambientLight intensity={0.4} />
    <World /><Player {...props} /><Suspense fallback={null}><Enemies {...props} /></Suspense><PixelPass />
  </>;
}