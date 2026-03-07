export class GameOverScene extends Phaser.Scene {
  constructor() {
    super('GameOver');
  }

  init(data) {
    this.lastScore = data.lastScore ?? 0;
    this.bestScore = data.bestScore ?? 0;
    this.reason = data.reason ?? 'Game over';
  }

  create() {
    const { width, height } = this.scale;

    this.add.rectangle(width / 2, height / 2, width, height, 0x0f2d40);
    this.add.rectangle(width / 2, height / 2, width * 0.8, 280, 0x184962, 0.95).setStrokeStyle(4, 0xa2e8ff);

    this.add.text(width / 2, height / 2 - 88, 'GAME OVER', {
      fontFamily: 'Trebuchet MS',
      fontSize: '54px',
      color: '#ffd6d6',
      stroke: '#491616',
      strokeThickness: 6
    }).setOrigin(0.5);

    this.add.text(width / 2, height / 2 - 38, this.reason, {
      fontFamily: 'Trebuchet MS',
      fontSize: '24px',
      color: '#ffe8b8'
    }).setOrigin(0.5);

    this.add.text(width / 2, height / 2 + 4, `Jouw score: ${this.lastScore}`, {
      fontFamily: 'Trebuchet MS',
      fontSize: '30px',
      color: '#f3fbff'
    }).setOrigin(0.5);

    this.add.text(width / 2, height / 2 + 44, `Beste score: ${this.bestScore}`, {
      fontFamily: 'Trebuchet MS',
      fontSize: '28px',
      color: '#d0f0ff'
    }).setOrigin(0.5);

    this.add.text(width / 2, height / 2 + 98, 'ENTER/SPATIE of TIK = Opnieuw   |   ESC = Menu', {
      fontFamily: 'Trebuchet MS',
      fontSize: '22px',
      color: '#fff6bd'
    }).setOrigin(0.5);

    this.input.keyboard.on('keydown-SPACE', () => this.scene.start('Game'));
    this.input.keyboard.on('keydown-ENTER', () => this.scene.start('Game'));
    this.input.keyboard.on('keydown-ESC', () => this.scene.start('MainMenu'));
    this.input.on('pointerdown', () => this.scene.start('Game'));
  }
}
