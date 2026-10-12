import { Canvas } from '@react-three/fiber';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Compass, Pause, Play, RotateCcw, Shield, Sword, WandSparkles, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, DoorOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DungeonScene, initialState } from './DungeonScene';
import shieldImage from '@/assets/Gemini_Generated_Image_2zi9992zi9992zi9-removebg-preview.png';
import swordImage from '@/assets/sword.png';

export function DungeonGame() {
  const state = useRef(initialState()), container = useRef<HTMLDivElement>(null);
  const [, render] = useState(0);
  const update = useCallback(() => render(v => v + 1), []);
  const [ready, setReady] = useState(false);
  const s = state.current;
  const start = () => { s.playing = true; setReady(true); update(); };
  const reset = () => { const n = s.reset + 1; state.current = initialState(); state.current.reset = n; state.current.playing = true; setReady(true); update(); };
  const attack = () => { if (s.playing && s.attack <= 0) s.attack = 0.34; };
  const magic = () => { if (s.playing && s.magic <= 0 && s.mp >= 10) { s.mp -= 10; s.magic = 0.4; } };
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Tab'].includes(e.code)) e.preventDefault();
      const s = state.current; s.keys.add(e.code);
      if (e.code === 'KeyJ' && s.playing && s.attack <= 0) s.attack = 0.34;
      if (e.code === 'KeyK' && s.playing && s.magic <= 0 && s.mp >= 10) { s.mp -= 10; s.magic = 0.4; }
      if (e.code === 'Escape') { s.playing = false; update(); }
    };
    const up = (e: KeyboardEvent) => state.current.keys.delete(e.code);
    const blur = () => { state.current.keys.clear(); state.current.playing = false; update(); };
    const move = (e: MouseEvent) => {
      if (document.pointerLockElement !== container.current || !state.current.playing) return;
      state.current.yaw -= e.movementX * 0.002;
      state.current.pitch = Math.max(-0.65, Math.min(0.65, state.current.pitch - e.movementY * 0.002));
    };
    const mouseDown = (e: MouseEvent) => {
      const s = state.current;
      if (!s.playing || document.pointerLockElement !== container.current) return;
      if (e.button === 0 && s.attack <= 0) s.attack = 0.34;
      if (e.button === 2) s.keys.add('MouseRight');
    };
    const mouseUp = (e: MouseEvent) => { if (e.button === 2) state.current.keys.delete('MouseRight'); };
    window.addEventListener('keydown', down); window.addEventListener('keyup', up); window.addEventListener('blur', blur); document.addEventListener('mousemove', move); document.addEventListener('mousedown', mouseDown); document.addEventListener('mouseup', mouseUp);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); window.removeEventListener('blur', blur); document.removeEventListener('mousemove', move); document.removeEventListener('mousedown', mouseDown); document.removeEventListener('mouseup', mouseUp); };
  }, [update]);
  const touchKey = (key: string, down: boolean) => { if (down) s.keys.add(key); else s.keys.delete(key); };
  return <main className="dungeon-game" ref={container} onContextMenu={e => e.preventDefault()}>
    <div className="dungeon-viewport" onClick={() => {
      if (!state.current.playing) return;
      if (document.pointerLockElement !== container.current)
        container.current?.requestPointerLock()?.catch(() => {});
    }}>
      <Canvas dpr={1} gl={{ antialias: false, powerPreference: 'high-performance' }} camera={{ fov: 72, near: 0.05, far: 45 }}>
        <DungeonScene state={state} onUpdate={update} />
      </Canvas>
    </div>
    <div className="dungeon-hud">
      <div className="game-status">
        <div className="stat-row"><span className="stat-icon health">♥</span><span>HP</span><div className="stat-track health"><meter min="0" max="100" value={s.hp} /><span>{s.hp}/100</span></div></div>
        <div className="stat-row"><span className="stat-icon mana">⚗</span><span>MP</span><div className="stat-track mana"><meter min="0" max="50" value={s.mp} /><span>{Math.floor(s.mp)}/50</span></div></div>
      </div>
      <div className="game-counter"><span>⚔ {s.kills}/5</span><span className="gold">◉ {s.coins}</span></div>
      <div className="game-identity"><h1>GUERREIRO DAS TREVAS</h1><span>A MASMORRA ESQUECIDA</span></div>
      <div className="crosshair" aria-hidden="true">+</div>
      <img className={`weapon shield ${s.defending ? 'defending' : ''}`} src={shieldImage} alt="" width="484" height="454" />
      <img className={`weapon sword ${s.attack > 0 ? 'attacking' : ''}`} src={swordImage} alt="" width="488" height="497" />
      {s.magic > 0 && <div className="magic-flash" />}
      {s.nearExit && s.playing && <div className="exit-prompt"><Button variant="secondary" onClick={() => { s.won = true; s.playing = false; update(); }}><DoorOpen /> Abrir saída <kbd>E</kbd></Button></div>}
      <div className="game-controls"><span>WASD / Setas <b>MOVER</b></span><i /><span>CLIQUE ESQ. <b>ATACAR</b></span><i /><span>CLIQUE DIR. <b>DEFENDER</b></span><i /><span>K <b>MAGIA</b></span></div>
      <div className="game-toolbar"><Compass size={14} /><span>LABIRINTO</span><Button title={s.playing ? 'Pausar' : 'Continuar'} aria-label={s.playing ? 'Pausar' : 'Continuar'} variant="ghost" size="icon" onClick={() => { s.playing = !s.playing; setReady(true); update(); }}>{s.playing ? <Pause /> : <Play />}</Button></div>
    </div>
    <div className="touch-controls">
      <div className="touch-dpad">{[{ k: 'ArrowUp', icon: ArrowUp }, { k: 'ArrowLeft', icon: ArrowLeft }, { k: 'ArrowDown', icon: ArrowDown }, { k: 'ArrowRight', icon: ArrowRight }].map(({ k, icon: Icon }) => <Button key={k} variant="outline" size="icon" aria-label={k} onPointerDown={e => { e.currentTarget.setPointerCapture(e.pointerId); touchKey(k, true); }} onPointerUp={() => touchKey(k, false)} onPointerCancel={() => touchKey(k, false)}><Icon /></Button>)}</div>
      <div className="touch-actions"><Button variant="outline" size="icon" aria-label="Atacar" onClick={attack}><Sword /></Button><Button variant="outline" size="icon" aria-label="Defender" onPointerDown={() => touchKey('KeyL', true)} onPointerUp={() => touchKey('KeyL', false)} onPointerCancel={() => touchKey('KeyL', false)}><Shield /></Button><Button variant="outline" size="icon" aria-label="Magia" onClick={magic}><WandSparkles /></Button></div>
    </div>
    {(!s.playing || s.hp <= 0) && <div className="game-menu">
      <span className="menu-ornament">◆</span>
      <h2>{s.won ? 'LIBERDADE' : s.hp <= 0 ? 'VOCÊ CAIU' : ready ? 'PAUSADO' : 'GUERREIRO DAS TREVAS'}</h2>
      <p>{s.won ? 'A masmorra ficou para trás.' : s.hp <= 0 ? 'As trevas reclamaram mais um guerreiro.' : ready ? 'As trevas podem esperar.' : 'Encontre a única saída.'}</p>
      <Button variant="secondary" size="lg" onClick={s.won || s.hp <= 0 ? reset : start}>{s.won || s.hp <= 0 ? <RotateCcw /> : <Play />}{s.won || s.hp <= 0 ? 'Jogar novamente' : ready ? 'Continuar' : 'Entrar na masmorra'}</Button>
    </div>}
  </main>;
}