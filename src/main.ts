// Entry point: build the game, the picture and the UI, then run the frame loop. Progress autosaves.
import './style.css';
import { Game } from './game';
import { loadLocal, saveLocal } from './save';
import { newGame } from './sim/state';
import { App } from './ui/app';
import { Audio } from './ui/audio';
import { Scene } from './ui/scene';

const canvas = document.getElementById('scene') as HTMLCanvasElement;
const uiRoot = document.getElementById('ui')!;

const saved = loadLocal();
const game = new Game(saved ?? newGame((Date.now() % 1000000) + 1));
const scene = new Scene(canvas);
const audio = new Audio();
const app = new App(uiRoot, game, scene, audio);
window.addEventListener('resize', () => scene.resize());
window.visualViewport?.addEventListener('resize', () => scene.resize());

if (!saved) app.hud.toast(window.matchMedia('(pointer: coarse)').matches ? 'Welcome! Tap to cast, then press and hold to reel.' : 'Welcome! Press Space or click to cast, then hold to reel.', 'good');

let last = performance.now();
function frame(now: number): void {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  game.advance(dt);
  const fs = game.state.fishing;
  scene.draw(game.state, dt, fs?.phase === 'reel' && fs.holding ? 1 : 0);
  app.frame();
  app.hud.render();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

setInterval(() => saveLocal(game.state), 15000);
window.addEventListener('pagehide', () => saveLocal(game.state));

// Debug handles for the browser console.
Object.assign(window, { game, scene, app });
