import { BootScene } from './scenes/BootScene.js';
import { MainMenuScene } from './scenes/MainMenuScene.js';
import { GameScene } from './scenes/GameScene.js';
import { GameOverScene } from './scenes/GameOverScene.js';

const config = {
  type: Phaser.AUTO,
  parent: 'game-root',
  width: 1024,
  height: 576,
  backgroundColor: '#123b59',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 },
      debug: false
    }
  },
  scene: [BootScene, MainMenuScene, GameScene, GameOverScene]
};

new Phaser.Game(config);

function createFullscreenHelper() {
  const root = document.getElementById('game-root');
  if (!root) return;

  const ua = navigator.userAgent || '';
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isInStandalone = window.matchMedia('(display-mode: standalone)').matches || !!window.navigator.standalone;

  const btn = document.createElement('button');
  btn.id = isIOS ? 'ios-install-hint' : 'fullscreen-btn';
  btn.type = 'button';
  btn.textContent = isIOS ? 'iPhone: Deel -> Zet op beginscherm' : 'Ga fullscreen';
  document.body.appendChild(btn);

  const isMobileLike = () => window.matchMedia('(pointer: coarse)').matches || window.innerWidth <= 900;
  const isLandscape = () => window.innerWidth > window.innerHeight;
  const canFullscreen = () => !!(root.requestFullscreen || root.webkitRequestFullscreen);
  const isFullscreen = () => !!(document.fullscreenElement || document.webkitFullscreenElement);

  const requestFs = async () => {
    if (!canFullscreen()) return;
    try {
      if (root.requestFullscreen) {
        await root.requestFullscreen();
      } else if (root.webkitRequestFullscreen) {
        root.webkitRequestFullscreen();
      }
    } catch (_err) {
      // User gesture / browser policy can block this. Button stays visible.
    }
  };

  const syncButton = () => {
    if (isIOS) {
      const showIOSHint = isMobileLike() && !isInStandalone;
      btn.style.display = showIOSHint ? 'block' : 'none';
      return;
    }
    const show = isMobileLike() && isLandscape() && !isFullscreen() && canFullscreen();
    btn.style.display = show ? 'block' : 'none';
  };

  if (!isIOS) {
    btn.addEventListener('click', requestFs);
  }
  window.addEventListener('resize', syncButton);
  window.addEventListener('orientationchange', syncButton);
  document.addEventListener('fullscreenchange', syncButton);
  document.addEventListener('webkitfullscreenchange', syncButton);

  document.addEventListener('pointerdown', () => {
    if (isMobileLike() && isLandscape() && !isFullscreen()) {
      requestFs();
    }
  }, { once: true });

  syncButton();
}

createFullscreenHelper();
