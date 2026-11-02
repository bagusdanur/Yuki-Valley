// main.js — titik masuk: muat asset, buat game, tangani resize
import { ASSET_FILES } from './config.js';
import { Game } from './game.js';

function loadAssets(files) {
  const entries = Object.entries(files);
  return Promise.all(entries.map(([k, src]) => new Promise(res => {
    const im = new Image();
    im.onload = () => res([k, im]);
    im.onerror = () => res([k, im]);
    im.src = src;
  }))).then(pairs => Object.fromEntries(pairs));
}

const canvas = document.getElementById('cv');
loadAssets(ASSET_FILES).then(assets => {
  const game = new Game(canvas, assets);
  addEventListener('resize', () => game.renderer.resize());
  addEventListener('orientationchange', () => setTimeout(() => game.renderer.resize(), 250));
});
