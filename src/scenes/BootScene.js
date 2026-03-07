export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload() {
    this.load.spritesheet('mosa_sheet', 'assets/mosasaurus_sheet.png', {
      frameWidth: 560,
      frameHeight: 150
    });
  }

  create() {
    this.createTextures();

    if (this.registry.get('musicOn') === undefined) {
      this.registry.set('musicOn', true);
    }
    if (this.registry.get('sfxOn') === undefined) {
      this.registry.set('sfxOn', true);
    }

    this.scene.start('MainMenu');
  }

  createTextures() {
    const g = this.make.graphics({ x: 0, y: 0, add: false });

    // Rock obstacle
    g.clear();
    g.fillStyle(0x72665d, 1);
    g.fillCircle(30, 28, 18);
    g.fillStyle(0x8a7d74, 1);
    g.fillCircle(21, 30, 14);
    g.fillStyle(0x5a514b, 1);
    g.fillCircle(39, 25, 11);
    g.generateTexture('rock', 64, 64);

    // Coral obstacle
    g.clear();
    g.fillStyle(0xbb4f7d, 1);
    g.fillRect(22, 30, 8, 28);
    g.fillRect(32, 24, 8, 34);
    g.fillRect(12, 38, 8, 20);
    g.fillRect(42, 36, 8, 22);
    g.fillStyle(0xd26d9a, 1);
    g.fillCircle(26, 30, 7);
    g.fillCircle(36, 24, 7);
    g.fillCircle(16, 38, 6);
    g.fillCircle(46, 36, 6);
    g.generateTexture('coral', 64, 64);

    // Fish prey
    g.clear();
    g.fillStyle(0xf8be48, 1);
    g.fillEllipse(28, 20, 34, 18);
    g.fillStyle(0xffdd90, 1);
    g.fillEllipse(24, 17, 16, 8);
    g.fillStyle(0xe48d21, 1);
    g.fillTriangle(44, 20, 60, 10, 60, 30);
    g.fillStyle(0x1f1f1f, 1);
    g.fillCircle(18, 19, 2);
    g.generateTexture('fish', 64, 40);

    // Squid prey
    g.clear();
    g.fillStyle(0xaa84ff, 1);
    g.fillEllipse(26, 18, 24, 22);
    g.fillStyle(0x8f6de0, 1);
    for (let i = 0; i < 6; i += 1) {
      g.fillRect(14 + i * 4, 24, 2, 14 + (i % 2) * 6);
    }
    g.fillStyle(0xffffff, 1);
    g.fillCircle(22, 16, 2);
    g.fillCircle(30, 16, 2);
    g.fillStyle(0x252525, 1);
    g.fillCircle(22, 16, 1);
    g.fillCircle(30, 16, 1);
    g.generateTexture('squid', 56, 46);

    // Flying prey (pterosaur style dino)
    g.clear();
    g.fillStyle(0x9a7f5f, 1);
    g.fillEllipse(28, 18, 24, 11);
    g.fillStyle(0x86694a, 1);
    g.fillTriangle(22, 17, 5, 4, 18, 19);
    g.fillTriangle(33, 17, 50, 4, 37, 19);
    g.fillStyle(0xb8a181, 1);
    g.fillTriangle(37, 18, 52, 16, 37, 21);
    g.fillStyle(0x5c4731, 1);
    g.fillCircle(34, 17, 1.5);
    g.generateTexture('ptero', 56, 34);

    // Quiz orb with question mark
    g.clear();
    g.fillStyle(0x6be8ff, 1);
    g.fillCircle(20, 20, 13);
    g.fillStyle(0xbdf5ff, 1);
    g.fillCircle(16, 16, 5);
    g.lineStyle(3, 0x0d5f6d, 1);
    g.strokeCircle(20, 20, 15);
    g.fillStyle(0x0d5f6d, 1);
    g.fillRect(19, 11, 3, 3);
    g.fillRect(22, 14, 3, 3);
    g.fillRect(21, 17, 3, 3);
    g.fillRect(20, 20, 3, 3);
    g.fillStyle(0x0d5f6d, 1);
    g.fillCircle(22, 27, 2);
    g.generateTexture('quiz_orb', 44, 44);

    // Tail fin overlay (animated separately)
    g.clear();
    g.fillStyle(0x157a6d, 1);
    g.fillTriangle(58, 28, 4, 52, 18, 28);
    g.fillTriangle(58, 26, 4, 2, 15, 24);
    g.fillStyle(0x1a9484, 1);
    g.fillTriangle(48, 27, 10, 45, 20, 27);
    g.fillTriangle(48, 25, 10, 8, 18, 24);
    g.generateTexture('mosa_tail', 64, 56);

    // Fallback closed mosasaurus (long tapered body + sharp snout)
    g.clear();
    g.fillStyle(0x136f62, 1);
    g.fillPoints([
      { x: 31, y: 33 }, { x: 10, y: 43 }, { x: 18, y: 31 },
      { x: 8, y: 11 }, { x: 30, y: 20 }, { x: 56, y: 17 },
      { x: 93, y: 13 }, { x: 132, y: 11 }, { x: 158, y: 14 },
      { x: 175, y: 18 }, { x: 158, y: 20 }, { x: 132, y: 23 },
      { x: 95, y: 27 }, { x: 59, y: 31 }, { x: 33, y: 36 }
    ], true);
    g.fillStyle(0x1f9788, 1);
    g.fillEllipse(82, 22, 105, 18);
    g.fillEllipse(126, 19, 76, 14);
    g.fillStyle(0xdbf3eb, 1);
    g.fillEllipse(106, 27, 95, 9);
    g.fillStyle(0x0d1320, 1);
    g.fillCircle(146, 16, 2);
    g.generateTexture('mosa_closed', 186, 58);

    // Fallback open mosasaurus
    g.clear();
    g.fillStyle(0x136f62, 1);
    g.fillPoints([
      { x: 31, y: 33 }, { x: 10, y: 43 }, { x: 18, y: 31 },
      { x: 8, y: 11 }, { x: 30, y: 20 }, { x: 56, y: 17 },
      { x: 93, y: 13 }, { x: 132, y: 11 }, { x: 158, y: 14 },
      { x: 176, y: 12 }, { x: 158, y: 20 }, { x: 132, y: 23 },
      { x: 95, y: 27 }, { x: 59, y: 31 }, { x: 33, y: 36 }
    ], true);
    g.fillStyle(0x1f9788, 1);
    g.fillEllipse(82, 22, 105, 18);
    g.fillEllipse(126, 19, 76, 14);
    g.fillStyle(0xdbf3eb, 1);
    g.fillEllipse(106, 27, 95, 9);
    g.fillStyle(0x0f6055, 1);
    g.fillTriangle(158, 18, 176, 12, 161, 20);
    g.fillTriangle(158, 21, 176, 28, 161, 23);
    g.fillStyle(0x212a33, 1);
    g.fillTriangle(161, 20, 175, 17, 175, 24);
    g.fillStyle(0xf5f2e8, 1);
    for (let x = 163; x <= 174; x += 3) {
      g.fillRect(x, 17, 2, 2);
      g.fillRect(x, 24, 2, 2);
    }
    g.fillStyle(0x0d1320, 1);
    g.fillCircle(146, 16, 2);
    g.generateTexture('mosa_open', 186, 58);

    // Bubble texture
    g.clear();
    g.fillStyle(0xd6f4ff, 0.6);
    g.fillCircle(7, 7, 6);
    g.generateTexture('bubble', 14, 14);

    g.destroy();
  }
}
