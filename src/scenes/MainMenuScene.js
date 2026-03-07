export class MainMenuScene extends Phaser.Scene {
  constructor() {
    super('MainMenu');
  }

  create() {
    const { width, height } = this.scale;

    this.add.rectangle(width / 2, height / 2, width, height, 0x1f4f7a);
    this.add.rectangle(width / 2, height * 0.82, width, height * 0.36, 0x0f3048, 0.35);

    this.add.text(width / 2, 82, 'MOSASAURUS AVONTUUR', {
      fontFamily: 'Trebuchet MS',
      fontSize: '44px',
      color: '#e8fbff',
      stroke: '#0a2231',
      strokeThickness: 6
    }).setOrigin(0.5);

    if (this.textures.exists('mosa_sheet')) {
      this.previewTailIndex = 1;
      this.previewMouthOpenUntil = 0;
      this.previewSprite = this.add.sprite(width / 2, 245, 'mosa_sheet', 1).setScale(0.62);

      this.time.addEvent({
        delay: 180,
        loop: true,
        callback: () => {
          const cycle = [0, 1, 2, 1];
          this.previewTailIndex = cycle[Math.floor(this.time.now / 180) % cycle.length];
          const mouthRow = this.time.now < this.previewMouthOpenUntil ? 1 : 0;
          this.previewSprite.setFrame((mouthRow * 3) + this.previewTailIndex);
        }
      });

      this.time.addEvent({
        delay: 2600,
        loop: true,
        callback: () => {
          this.previewMouthOpenUntil = this.time.now + 260;
        }
      });
    } else {
      const previewKey = this.textures.exists('mosa_ref') ? 'mosa_ref' : 'mosa_closed';
      const previewScale = previewKey === 'mosa_ref' ? 0.62 : 1.45;
      this.add.image(width / 2, 245, previewKey).setScale(previewScale);
    }

    this.musicLabel = this.add.text(width / 2, 385, '', {
      fontFamily: 'Trebuchet MS',
      fontSize: '24px',
      color: '#d8f4ff'
    }).setOrigin(0.5);

    this.sfxLabel = this.add.text(width / 2, 418, '', {
      fontFamily: 'Trebuchet MS',
      fontSize: '24px',
      color: '#d8f4ff'
    }).setOrigin(0.5);

    this.add.text(width / 2, 478, 'ENTER/SPATIE of TIK = Start', {
      fontFamily: 'Trebuchet MS',
      fontSize: '28px',
      color: '#fff9cc'
    }).setOrigin(0.5);

    this.add.text(width / 2, 512, 'Pijltjes/WASD = Zwemmen  |  1/2/3 = Quiz', {
      fontFamily: 'Trebuchet MS',
      fontSize: '21px',
      color: '#d8f4ff'
    }).setOrigin(0.5);

    this.add.text(width / 2, 542, 'M = Music  |  N = SFX  |  Spring boven water en blijf ademen!', {
      fontFamily: 'Trebuchet MS',
      fontSize: '18px',
      color: '#b8deee'
    }).setOrigin(0.5);

    this.updateAudioText();

    this.input.keyboard.on('keydown-SPACE', () => this.startGame());
    this.input.keyboard.on('keydown-ENTER', () => this.startGame());
    this.input.keyboard.on('keydown-M', () => {
      this.registry.set('musicOn', !this.registry.get('musicOn'));
      this.updateAudioText();
    });
    this.input.keyboard.on('keydown-N', () => {
      this.registry.set('sfxOn', !this.registry.get('sfxOn'));
      this.updateAudioText();
    });

    this.input.once('pointerdown', () => this.unlockAudio());
    this.input.on('pointerdown', () => this.startGame());
    this.input.keyboard.once('keydown', () => this.unlockAudio());
  }

  unlockAudio() {
    const ctx = this.sound?.context;
    if (ctx?.state === 'suspended') {
      ctx.resume();
    }
  }

  updateAudioText() {
    const music = this.registry.get('musicOn') ? 'On' : 'Off';
    const sfx = this.registry.get('sfxOn') ? 'On' : 'Off';
    this.musicLabel.setText(`Music: ${music}`);
    this.sfxLabel.setText(`SFX: ${sfx}`);
  }

  startGame() {
    this.unlockAudio();
    this.scene.start('Game');
  }
}
