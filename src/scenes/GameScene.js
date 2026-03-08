import { OCEAN_FACTS } from '../data/facts.js';
import { QUIZ_QUESTIONS } from '../data/quiz.js';

export class GameScene extends Phaser.Scene {
  constructor() {
    super('Game');
  }

  create() {
    const { width, height } = this.scale;

    this.difficultyConfig = {
      baseSpeed: 240,
      maxSpeed: 860,
      speedStep: 72,
      rampPeriodSec: 12,
      spawnIntervalStart: 1320,
      spawnIntervalMin: 280,
      startGraceMs: 3000,
      startGraceSpawnMultiplier: 1.45
    };

    this.airConfig = {
      airMax: 100,
      airDrainRate: 6,
      airRecoverRate: 30
    };

    this.quizConfig = {
      bonusPoints: 50,
      spawnChance: 0.035,
      spawnCooldownMs: 30000,
      resumeGraceMs: 1000
    };

    this.spawnTables = {
      prey: [
        { key: 'fish', points: 10, spawnWeight: 0.52, hitRadius: 14, zone: 'water' },
        { key: 'squid', points: 15, spawnWeight: 0.28, hitRadius: 15, zone: 'water' },
        { key: 'ptero', points: 20, spawnWeight: 0.20, hitRadius: 13, zone: 'air' }
      ],
      obstacle: [
        { key: 'rock', spawnWeight: 0.58, hitRadius: 17, damageType: 'solid' },
        { key: 'coral', spawnWeight: 0.42, hitRadius: 16, damageType: 'sharp' }
      ]
    };

    this.elapsedMs = 0;
    this.worldSpeed = this.difficultyConfig.baseSpeed;
    this.speedLevel = 1;

    this.score = 0;
    this.bestScore = Number(localStorage.getItem('mosasaur_best_score') || 0);
    this.survivalAccumulator = 0;

    this.airCurrent = this.airConfig.airMax;
    this.waterLineY = 108;
    this.isUnderwater = true;
    this.surfaceBreathBuffer = 28;
    this.isJumping = false;
    this.jumpVy = 0;
    this.jumpGravity = 940;
    this.resumeGraceUntil = 0;

    this.isRunning = true;
    this.isPausedForQuiz = false;
    this.isPausedGame = false;
    this.currentQuiz = null;
    this.quizSpawnBlockedUntil = this.quizConfig.spawnCooldownMs;
    this.biteOpenUntil = 0;
    this.isBiteAnticipating = false;
    this.diveTrailStart = 0;
    this.diveTrailUntil = 0;
    this.nextTrailEmitAt = 0;
    this.lowAirBeepAt = 0;

    this.factIndex = 0;
    this.factIntervalMs = 30000;
    this.factDurationMs = 3200;
    this.quizDeck = [];

    this.setupBackground(width, height);
    this.setupPlayer(height);
    this.setupGroups();
    this.setupUI(width, height);
    this.setupFacts(width, height);
    this.setupQuizOverlay(width, height);
    this.setupInput();
    this.setupAudio();

    this.spawnTimer = this.time.addEvent({
      delay: this.currentSpawnDelay(),
      loop: true,
      callback: this.spawnEntity,
      callbackScope: this
    });

    this.factTimer = this.time.addEvent({
      delay: this.factIntervalMs,
      loop: true,
      callback: this.showNextFact,
      callbackScope: this
    });
  }

  setupBackground(width, height) {
    this.add.rectangle(width / 2, height / 2, width, height, 0x14557f);
    this.add.rectangle(width / 2, height * 0.8, width, height * 0.40, 0x0c3351, 0.38);

    // Water surface line + glow band
    this.surfaceGlow = this.add.rectangle(width / 2, this.waterLineY - 8, width, 18, 0xb7efff, 0.24).setDepth(8);
    this.surfaceLine = this.add.rectangle(width / 2, this.waterLineY, width, 3, 0xd8f8ff, 0.95).setDepth(9);

    this.bubbleLayers = [
      this.createBubbleLayer(24, 0.22, 0.25, 0.45, 0.6),
      this.createBubbleLayer(18, 0.42, 0.35, 0.7, 0.82),
      this.createBubbleLayer(12, 0.62, 0.48, 1.0, 1.3)
    ];
  }

  createBubbleLayer(count, speedFactor, alpha, minScale, maxScale) {
    const layer = [];
    const { width, height } = this.scale;
    for (let i = 0; i < count; i += 1) {
      const bubble = this.add.image(
        Phaser.Math.Between(20, width + 30),
        Phaser.Math.Between(this.waterLineY + 12, height - 18),
        'bubble'
      );
      bubble.setAlpha(alpha * Phaser.Math.FloatBetween(0.7, 1));
      bubble.setScale(Phaser.Math.FloatBetween(minScale, maxScale));
      bubble.depth = 1;
      layer.push({ bubble, speedFactor });
    }
    return layer;
  }

  setupPlayer(height) {
    this.usingSheet2 = this.textures.exists('mosa_sheet2_clean');
    this.usingSheet = this.usingSheet2 || this.textures.exists('mosa_sheet');
    const closedKey = this.textures.exists('mosa_ref') ? 'mosa_ref' : 'mosa_closed';
    const openKey = this.textures.exists('mosa_ref_open') ? 'mosa_ref_open' : 'mosa_open';

    this.playerClosedKey = closedKey;
    this.playerOpenKey = openKey;
    this.tailFrameCol = 1;
    this.tail = null;

    if (this.usingSheet) {
      const sheetKey = this.usingSheet2 ? 'mosa_sheet2_clean' : 'mosa_sheet';
      this.player = this.physics.add.sprite(190, height / 2, sheetKey, 1);
      const frame = this.textures.getFrame(sheetKey, 1);
      const fw = frame?.width ?? 500;
      const fh = frame?.height ?? 220;
      this.playerScale = this.usingSheet2 ? (220 / fw) : 0.44;
      this.player.setScale(this.playerScale);

      if (this.usingSheet2) {
        const bodyW = fw * 0.44;
        const bodyH = fh * 0.25;
        this.player.body.setSize(bodyW, bodyH, true);
        this.player.body.setOffset((fw - bodyW) * 0.5, (fh * 0.50) - (bodyH * 0.2));

        this.mouthOffset = new Phaser.Math.Vector2(fw * 0.40, fh * 0.04);
        this.bodyHitOffset = new Phaser.Math.Vector2(0, fh * 0.05);
        this.bodyHitRadius = 23;
        this.biteRadius = 13;
      } else {
        this.player.body.setSize(238, 48, true);
        this.player.body.setOffset(162, 58);
        this.mouthOffset = new Phaser.Math.Vector2(236, -2);
        this.bodyHitOffset = new Phaser.Math.Vector2(8, 10);
        this.bodyHitRadius = 22;
        this.biteRadius = 12;
      }
    } else {
      this.player = this.physics.add.image(190, height / 2, this.playerClosedKey);
      const useReferenceImage = closedKey === 'mosa_ref';
      this.playerScale = useReferenceImage ? 0.32 : 1.12;
      this.player.setScale(this.playerScale);
      this.player.body.setSize(132, 42, true);
      this.player.body.setOffset(26, 18);

      this.tail = this.add.image(this.player.x - (70 * this.playerScale), this.player.y + (2 * this.playerScale), 'mosa_tail')
        .setScale(this.playerScale * 1.05)
        .setDepth(5)
        .setOrigin(0.9, 0.5);

      this.mouthOffset = new Phaser.Math.Vector2(86, -2);
      this.bodyHitOffset = new Phaser.Math.Vector2(18, 4);
      this.bodyHitRadius = 24;
      this.biteRadius = 16;
    }

    this.player.setDepth(6);
    this.player.body.allowGravity = false;
    this.player.setImmovable(true);

    this.verticalInput = 0;
  }

  setupGroups() {
    this.preyGroup = this.physics.add.group({ allowGravity: false, immovable: true });
    this.obstacleGroup = this.physics.add.group({ allowGravity: false, immovable: true });
    this.quizGroup = this.physics.add.group({ allowGravity: false, immovable: true });
  }

  setupUI(width, height) {
    const strong = {
      fontFamily: 'Trebuchet MS',
      fontSize: '27px',
      color: '#eaffff',
      stroke: '#0a1f2e',
      strokeThickness: 4
    };

    this.scoreText = this.add.text(16, 12, 'Score: 0', strong).setDepth(30);
    this.bestText = this.add.text(16, 45, `Beste: ${this.bestScore}`, {
      ...strong,
      fontSize: '23px',
      color: '#c8ecff'
    }).setDepth(30);

    this.levelText = this.add.text(16, 74, 'Snelheid: Lv1', {
      ...strong,
      fontSize: '21px',
      color: '#fff7b8'
    }).setDepth(30);

    this.helpText = this.add.text(width - 14, 10, 'Pijltjes/WASD of touch: zwem  |  ESC: menu', {
      fontFamily: 'Trebuchet MS',
      fontSize: '17px',
      color: '#cdeafa'
    }).setOrigin(1, 0).setDepth(30);

    this.airLabel = this.add.text(width - 14, 36, 'Lucht', {
      fontFamily: 'Trebuchet MS',
      fontSize: '15px',
      color: '#daf4ff'
    }).setOrigin(1, 0).setDepth(30);

    this.airBarBg = this.add.rectangle(width - 194, 72, 180, 14, 0x0f2533, 0.9)
      .setOrigin(0, 0.5)
      .setDepth(30)
      .setStrokeStyle(2, 0x8fdfff);
    this.airBarFill = this.add.rectangle(width - 192, 72, 176, 10, 0x62e6ff, 1)
      .setOrigin(0, 0.5)
      .setDepth(31);
    this.airWarningText = this.add.text(width / 2, 28, 'LUCHT BIJNA OP!', {
      fontFamily: 'Trebuchet MS',
      fontSize: '28px',
      color: '#ffb6b6',
      stroke: '#5b1010',
      strokeThickness: 5
    }).setOrigin(0.5).setDepth(31).setVisible(false);
    this.dangerOverlay = this.add.rectangle(width / 2, height / 2, width, height, 0x7a1212, 0)
      .setDepth(29);

    this.debugText = this.add.text(width - 12, height - 14, '', {
      fontFamily: 'monospace',
      fontSize: '13px',
      color: '#d8f3ff'
    }).setOrigin(1, 1).setDepth(30).setAlpha(0.5);

    this.pauseText = this.add.text(width / 2, height / 2, 'PAUZE\nSpatie = hervatten', {
      fontFamily: 'Trebuchet MS',
      fontSize: '42px',
      color: '#e8fbff',
      align: 'center',
      stroke: '#0a2231',
      strokeThickness: 6
    }).setOrigin(0.5).setDepth(48).setVisible(false);
  }

  setupFacts(width, _height) {
    const panelWidth = Math.min(460, Math.max(300, width * 0.42));
    const panelX = (panelWidth / 2) + 18;
    const panelY = 86;

    this.factPanel = this.add.rectangle(panelX, panelY, panelWidth, 34, 0x102534, 0.88)
      .setStrokeStyle(2, 0x9be0ff)
      .setDepth(40)
      .setVisible(false);

    this.factTitle = this.add.text(panelX - (panelWidth / 2) + 10, panelY - 10, '', {
      fontFamily: 'Trebuchet MS',
      fontSize: '13px',
      color: '#dff7ff'
    }).setDepth(41).setVisible(false);

    this.factBody = this.add.text(panelX - (panelWidth / 2) + 10, panelY - 10, '', {
      fontFamily: 'Trebuchet MS',
      fontSize: '13px',
      color: '#c4e6f5',
      wordWrap: { width: panelWidth - 18, useAdvancedWrap: true },
      maxLines: 1
    }).setDepth(41).setVisible(false);
  }

  setupQuizOverlay(width, height) {
    this.quizOverlay = this.add.rectangle(width / 2, height / 2, width, height, 0x04121d, 0.72).setDepth(50).setVisible(false);
    this.quizBox = this.add.rectangle(width / 2, height / 2, width * 0.8, 280, 0x17394f, 0.98)
      .setStrokeStyle(3, 0xb4ecff)
      .setDepth(51)
      .setVisible(false);

    this.quizTitle = this.add.text(width / 2, height / 2 - 102, 'QUIZ BONUS', {
      fontFamily: 'Trebuchet MS',
      fontSize: '34px',
      color: '#fff6bf',
      stroke: '#604a18',
      strokeThickness: 5
    }).setOrigin(0.5).setDepth(52).setVisible(false);

    this.quizQuestionText = this.add.text(width / 2, height / 2 - 54, '', {
      fontFamily: 'Trebuchet MS',
      fontSize: '24px',
      color: '#e5f8ff',
      align: 'center',
      wordWrap: { width: width * 0.72 }
    }).setOrigin(0.5, 0).setDepth(52).setVisible(false);

    this.quizFeedbackText = this.add.text(width / 2, height / 2 + 146, '', {
      fontFamily: 'Trebuchet MS',
      fontSize: '20px',
      color: '#fff6bd',
      align: 'center',
      wordWrap: { width: width * 0.72 }
    }).setOrigin(0.5, 0).setDepth(52).setVisible(false);

    this.quizOptionButtons = [];
    this.quizOptionLabels = [];
    for (let i = 0; i < 3; i += 1) {
      const y = (height / 2) + 18 + (i * 44);
      const btn = this.add.rectangle(width / 2, y, width * 0.68, 36, 0x22566f, 0.82)
        .setStrokeStyle(2, 0x9adfff)
        .setDepth(51)
        .setVisible(false)
        .setInteractive({ useHandCursor: true });
      btn.on('pointerdown', () => this.answerQuiz(i));
      this.quizOptionButtons.push(btn);

      const label = this.add.text(width / 2, y, '', {
        fontFamily: 'Trebuchet MS',
        fontSize: '20px',
        color: '#cef0ff',
        align: 'center'
      }).setOrigin(0.5).setDepth(52).setVisible(false);
      this.quizOptionLabels.push(label);
    }
  }

  setupInput() {
    this.upKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.UP);
    this.downKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN);
    this.wKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
    this.sKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S);

    this.key1 = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ONE);
    this.key2 = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.TWO);
    this.key3 = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.THREE);
    this.touchControlId = -1;
    this.touchVerticalInput = 0;

    const unlock = () => this.unlockAudio();
    this.input.once('pointerdown', unlock);
    this.input.keyboard.once('keydown', unlock);

    this.input.on('pointerdown', (pointer) => {
      if (!this.isRunning || this.isPausedForQuiz) return;
      this.touchControlId = pointer.id;
      this.updateTouchInput(pointer);
    });
    this.input.on('pointermove', (pointer) => {
      if (!this.isRunning || this.isPausedForQuiz) return;
      if (this.touchControlId !== pointer.id) return;
      this.updateTouchInput(pointer);
    });
    this.input.on('pointerup', (pointer) => {
      if (this.touchControlId !== pointer.id) return;
      this.touchControlId = -1;
      this.touchVerticalInput = 0;
    });

    this.input.keyboard.on('keydown-ESC', () => {
      if (!this.isRunning || this.isPausedForQuiz) return;
      this.scene.start('MainMenu');
    });
    this.input.keyboard.on('keydown-SPACE', () => {
      if (!this.isRunning || this.isPausedForQuiz) return;
      this.isPausedGame = !this.isPausedGame;
      this.pauseText.setVisible(this.isPausedGame);
      this.setAudioPaused(this.isPausedGame);
    });
  }

  setAudioPaused(paused) {
    if (!this.audioCtx || !this.audioMasterGain) return;
    const now = this.audioCtx.currentTime;
    this.audioMasterGain.gain.cancelScheduledValues(now);
    this.audioMasterGain.gain.setTargetAtTime(paused ? 0.0001 : 1, now, 0.03);
  }

  updateTouchInput(pointer) {
    const dy = pointer.worldY - this.player.y;
    if (Math.abs(dy) < 18) {
      this.touchVerticalInput = 0;
      return;
    }
    this.touchVerticalInput = dy < 0 ? 1 : -1;
  }

  setupAudio() {
    this.audioCtx = this.sound?.context || null;
    this.audioMasterGain = null;
    if (this.audioCtx) {
      this.audioMasterGain = this.audioCtx.createGain();
      this.audioMasterGain.gain.setValueAtTime(1, this.audioCtx.currentTime);
      this.audioMasterGain.connect(this.audioCtx.destination);
    }

    this.musicEvent = this.time.addEvent({
      delay: 400,
      loop: true,
      callback: () => {
        if (this.isPausedGame) return;
        if (!this.registry.get('musicOn')) return;
        const melody = [174, 196, 220, 246, 262, 246, 220, 196];
        const note = melody[Math.floor(this.time.now / 400) % melody.length];
        this.playTone(note, 0.28, 'triangle', 0.03);
      }
    });
  }

  unlockAudio() {
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  update(_time, delta) {
    if (!this.isRunning) {
      return;
    }

    if (this.isPausedGame) {
      this.updateDebug();
      return;
    }

    this.elapsedMs += delta;
    this.updateDifficulty();

    if (this.isPausedForQuiz) {
      this.handleQuizInput();
      this.updateDebug();
      return;
    }

    this.updatePlayerMovement(delta);
    this.updateTailAnimation();
    this.updateMouthSprite();
    this.updateEntities(delta);
    this.updateBubbles(delta);
    this.updateDiveTrail();
    this.updateScore(delta);
    this.updateAir(delta);

    this.spawnTimer.delay = this.currentSpawnDelay();
    this.handleQuizInput();
    this.updateDebug();
  }

  updateDifficulty() {
    const cfg = this.difficultyConfig;
    const step = Math.floor(this.elapsedMs / (cfg.rampPeriodSec * 1000));
    this.worldSpeed = Math.min(cfg.maxSpeed, cfg.baseSpeed + (step * cfg.speedStep));
    this.speedLevel = step + 1;
    this.levelText.setText(`Snelheid: Lv${this.speedLevel} (${Math.round(this.worldSpeed)})`);
  }

  updatePlayerMovement(delta) {
    const dt = delta / 1000;
    const upPressed = this.upKey.isDown || this.wKey.isDown;
    const downPressed = this.downKey.isDown || this.sKey.isDown;

    this.verticalInput = 0;
    if (upPressed) this.verticalInput += 1;
    if (downPressed) this.verticalInput -= 1;
    if (this.touchControlId !== -1) {
      this.verticalInput = this.touchVerticalInput;
    }

    const swimSpeed = 320;
    const minY = this.waterLineY - 95;
    const maxY = this.scale.height - 64;

    if (!this.isJumping) {
      this.player.y += -this.verticalInput * swimSpeed * dt;

      if (this.player.y <= this.waterLineY - 5) {
        this.isJumping = true;
        this.jumpVy = -410;
        this.airCurrent = this.airConfig.airMax;
        this.createSplash(this.player.x + (28 * this.playerScale), this.waterLineY, 1.2, 'exit');
      }
    } else {
      this.jumpVy += this.jumpGravity * dt;
      this.player.y += this.jumpVy * dt;

      if (this.player.y >= this.waterLineY + 4) {
        this.player.y = this.waterLineY + 4;
        this.isJumping = false;
        this.jumpVy = 0;
        this.createSplash(this.player.x + (24 * this.playerScale), this.waterLineY, 2.4, 'entry');
        this.createDiveBubbleTrail(2600);
      }
    }

    this.player.y = Phaser.Math.Clamp(this.player.y, minY, maxY);

    const jumpTilt = this.isJumping ? Phaser.Math.Clamp((this.jumpVy / 430) * 26, -22, 24) : 0;
    const swimTilt = this.isJumping ? 0 : (-this.verticalInput * 12);
    const targetAngle = this.isJumping ? jumpTilt : swimTilt;
    this.player.angle = Phaser.Math.Linear(this.player.angle, targetAngle, this.isJumping ? 0.1 : 0.15);

    this.isUnderwater = this.player.y > (this.waterLineY + this.surfaceBreathBuffer);
  }

  updateTailAnimation() {
    const speedNorm = Phaser.Math.Clamp((this.worldSpeed - this.difficultyConfig.baseSpeed) / (this.difficultyConfig.maxSpeed - this.difficultyConfig.baseSpeed), 0, 1);
    const freq = 0.006 + speedNorm * 0.004;
    const baseAmp = 7 + speedNorm * 6;
    const amp = this.isJumping ? baseAmp * 0.35 : baseAmp;
    const wave = Math.sin(this.time.now * freq);
    const wag = wave * amp;

    if (wave < -0.33) {
      this.tailFrameCol = 0;
    } else if (wave > 0.33) {
      this.tailFrameCol = 2;
    } else {
      this.tailFrameCol = 1;
    }

    if (this.usingSheet || !this.tail) {
      return;
    }

    const ang = Phaser.Math.DegToRad(this.player.angle);
    const backOffset = new Phaser.Math.Vector2(-77 * this.playerScale, 1 * this.playerScale);
    const x = this.player.x + (backOffset.x * Math.cos(ang) - backOffset.y * Math.sin(ang));
    const y = this.player.y + (backOffset.x * Math.sin(ang) + backOffset.y * Math.cos(ang));

    this.tail.x = x;
    this.tail.y = y;
    this.tail.angle = this.player.angle + wag;
  }

  updateMouthSprite() {
    const mouthOpen = (this.time.now < this.biteOpenUntil || this.isBiteAnticipating) ? 1 : 0;
    if (this.usingSheet) {
      this.player.setFrame((mouthOpen * 3) + this.tailFrameCol);
      return;
    }
    this.player.setTexture(mouthOpen ? this.playerOpenKey : this.playerClosedKey);
  }

  updateEntities(delta) {
    const shift = this.worldSpeed * (delta / 1000);

    const moveAndCull = (obj) => {
      if (!obj || !obj.active) return;
      obj.x -= shift;
      if (obj.x < -120) obj.destroy();
    };

    this.preyGroup.children.iterate(moveAndCull);
    this.obstacleGroup.children.iterate(moveAndCull);
    this.quizGroup.children.iterate(moveAndCull);

    if (this.time.now >= this.resumeGraceUntil) {
      this.checkObstacleHits();
    }
    this.checkMouthEats();
    this.checkQuizPickup();
  }

  updateBubbles(delta) {
    const dt = delta / 1000;
    const width = this.scale.width;
    const height = this.scale.height;

    this.bubbleLayers.forEach((layer) => {
      layer.forEach((entry) => {
        entry.bubble.x -= this.worldSpeed * entry.speedFactor * dt;
        if (entry.bubble.x < -18) {
          entry.bubble.x = width + Phaser.Math.Between(8, 70);
          entry.bubble.y = Phaser.Math.Between(this.waterLineY + 12, height - 18);
        }
      });
    });
  }

  updateScore(delta) {
    this.survivalAccumulator += delta / 1000;

    if (this.survivalAccumulator >= 1) {
      const whole = Math.floor(this.survivalAccumulator);
      this.survivalAccumulator -= whole;
      this.score += whole;
      this.scoreText.setText(`Score: ${this.score}`);
    }
  }

  updateAir(delta) {
    const dt = delta / 1000;

    if (this.isUnderwater) {
      this.airCurrent -= this.airConfig.airDrainRate * dt;
    } else {
      this.airCurrent += this.airConfig.airRecoverRate * dt;
    }

    this.airCurrent = Phaser.Math.Clamp(this.airCurrent, 0, this.airConfig.airMax);

    const ratio = this.airCurrent / this.airConfig.airMax;
    this.airBarFill.width = 176 * ratio;
    this.airBarFill.fillColor = ratio < 0.25 ? 0xff7a7a : (ratio < 0.55 ? 0xffd26b : 0x62e6ff);
    const lowAir = ratio < 0.25;
    this.airWarningText.setVisible(lowAir);
    if (lowAir) {
      this.airWarningText.alpha = 0.55 + Math.abs(Math.sin(this.time.now * 0.01)) * 0.45;
      this.dangerOverlay.setAlpha(0.05 + Math.abs(Math.sin(this.time.now * 0.012)) * 0.08);
      if (this.registry.get('sfxOn') && this.time.now >= this.lowAirBeepAt) {
        this.playTone(520, 0.08, 'square', 0.06);
        this.lowAirBeepAt = this.time.now + 950;
      }
    } else {
      this.dangerOverlay.setAlpha(0);
      this.lowAirBeepAt = 0;
    }

    if (this.airCurrent <= 0) {
      this.triggerGameOver('Geen lucht meer');
    }
  }

  spawnEntity() {
    if (!this.isRunning || this.isPausedForQuiz || this.isPausedGame) {
      return;
    }

    const spawnX = this.scale.width + 80;
    const waterLanes = [
      this.waterLineY + 35,
      this.waterLineY + 85,
      this.waterLineY + 140,
      this.waterLineY + 200,
      this.waterLineY + 260,
      this.waterLineY + 320
    ];
    const airLanes = [
      this.waterLineY - 22,
      this.waterLineY - 48,
      this.waterLineY - 74
    ];

    const cfg = this.difficultyConfig;
    const inEarlyGrace = this.elapsedMs < cfg.startGraceMs;

    if (!inEarlyGrace && this.time.now > this.quizSpawnBlockedUntil && Math.random() < this.quizConfig.spawnChance) {
      const quizY = Phaser.Utils.Array.GetRandom(waterLanes);
      const quizOrb = this.quizGroup.create(spawnX, quizY, 'quiz_orb');
      quizOrb.setScale(0.95);
      quizOrb.entityDef = { key: 'quiz_orb', hitRadius: 20 };
      this.quizSpawnBlockedUntil = this.time.now + this.quizConfig.spawnCooldownMs;
      return;
    }

    const preyBias = inEarlyGrace ? 0.62 : 0.48;
    const spawnPrey = Math.random() < preyBias;

    if (spawnPrey) {
      const preyDef = this.pickWeighted(this.spawnTables.prey, 'spawnWeight');
      const y = preyDef.zone === 'air'
        ? Phaser.Utils.Array.GetRandom(airLanes)
        : Phaser.Utils.Array.GetRandom(waterLanes);
      const prey = this.preyGroup.create(spawnX, y, preyDef.key);
      if (preyDef.key === 'fish') prey.setScale(0.82);
      if (preyDef.key === 'squid') prey.setScale(0.92);
      if (preyDef.key === 'ptero') prey.setScale(0.9);
      prey.entityDef = preyDef;
      return;
    }

    const obstacleDef = this.pickWeighted(this.spawnTables.obstacle, 'spawnWeight');
    const y = Phaser.Utils.Array.GetRandom(waterLanes);
    const obstacle = this.obstacleGroup.create(spawnX, y, obstacleDef.key);
    obstacle.setScale(obstacleDef.key === 'rock' ? 0.92 : 1.0);
    obstacle.entityDef = obstacleDef;
  }

  currentSpawnDelay() {
    const cfg = this.difficultyConfig;
    const progress = Phaser.Math.Clamp(
      (this.worldSpeed - cfg.baseSpeed) / (cfg.maxSpeed - cfg.baseSpeed),
      0,
      1
    );

    let delay = Phaser.Math.Linear(cfg.spawnIntervalStart, cfg.spawnIntervalMin, progress);
    if (this.elapsedMs < cfg.startGraceMs) {
      delay *= cfg.startGraceSpawnMultiplier;
    }

    return Math.max(cfg.spawnIntervalMin, Math.round(delay));
  }

  pickWeighted(items, field) {
    const total = items.reduce((sum, item) => sum + item[field], 0);
    let roll = Math.random() * total;

    for (const item of items) {
      roll -= item[field];
      if (roll <= 0) {
        return item;
      }
    }

    return items[items.length - 1];
  }

  getMouthWorldPoint() {
    const angle = Phaser.Math.DegToRad(this.player.angle);
    const ox = this.mouthOffset.x * this.playerScale;
    const oy = this.mouthOffset.y * this.playerScale;

    return new Phaser.Math.Vector2(
      this.player.x + (ox * Math.cos(angle) - oy * Math.sin(angle)),
      this.player.y + (ox * Math.sin(angle) + oy * Math.cos(angle))
    );
  }

  getBodyWorldPoint() {
    const angle = Phaser.Math.DegToRad(this.player.angle);
    const ox = this.bodyHitOffset.x * this.playerScale;
    const oy = this.bodyHitOffset.y * this.playerScale;

    return new Phaser.Math.Vector2(
      this.player.x + (ox * Math.cos(angle) - oy * Math.sin(angle)),
      this.player.y + (ox * Math.sin(angle) + oy * Math.cos(angle))
    );
  }

  checkObstacleHits() {
    const body = this.getBodyWorldPoint();

    this.obstacleGroup.children.iterate((obj) => {
      if (!obj || !obj.active || !this.isRunning) return;
      const radius = obj.entityDef?.hitRadius ?? 16;
      const hitR = this.bodyHitRadius + radius;
      const distSq = Phaser.Math.Distance.Squared(body.x, body.y, obj.x, obj.y);

      if (distSq <= hitR * hitR) {
        this.triggerGameOver('Geraakt door obstakel', obj);
      }
    });
  }

  checkMouthEats() {
    const mouth = this.getMouthWorldPoint();
    let anticipating = false;

    this.preyGroup.children.iterate((prey) => {
      if (!prey || !prey.active || !this.isRunning) return;

      const radius = prey.entityDef?.hitRadius ?? 12;
      const hitR = this.biteRadius + radius;
      const distSq = Phaser.Math.Distance.Squared(mouth.x, mouth.y, prey.x, prey.y);
      const anticipateR = hitR + 34;
      if (distSq <= anticipateR * anticipateR) {
        anticipating = true;
      }
      const nearBodyDistSq = Phaser.Math.Distance.Squared(this.player.x, this.player.y, prey.x, prey.y);
      const bodyCatchR = 28 + radius;

      if (distSq <= hitR * hitR || nearBodyDistSq <= bodyCatchR * bodyCatchR) {
        this.consumePrey(prey);
      }
    });

    this.isBiteAnticipating = anticipating;
  }

  checkQuizPickup() {
    const mouth = this.getMouthWorldPoint();

    this.quizGroup.children.iterate((orb) => {
      if (!orb || !orb.active || !this.isRunning || this.isPausedForQuiz) return;

      const hitR = this.biteRadius + (orb.entityDef?.hitRadius ?? 20);
      const distSq = Phaser.Math.Distance.Squared(mouth.x, mouth.y, orb.x, orb.y);
      const nearBodyDistSq = Phaser.Math.Distance.Squared(this.player.x, this.player.y, orb.x, orb.y);
      const bodyCatchR = 36;

      if (distSq <= hitR * hitR || nearBodyDistSq <= bodyCatchR * bodyCatchR) {
        orb.destroy();
        this.startQuiz();
      }
    });
  }

  consumePrey(prey) {
    if (!prey?.active || !this.isRunning) return;

    const points = prey.entityDef?.points ?? 10;
    prey.destroy();
    this.score += points;
    this.scoreText.setText(`Score: ${this.score}`);
    this.showScorePopup(this.player.x + 22, this.player.y - 18, `+${points}`, points >= 20 ? '#ffd27a' : '#c8f6ff');

    this.biteOpenUntil = this.time.now + 220;
    if (this.registry.get('sfxOn')) {
      this.playTone(760, 0.06, 'square', 0.055);
      this.time.delayedCall(30, () => this.playTone(980, 0.06, 'square', 0.05));
    }
  }

  startQuiz() {
    this.isPausedForQuiz = true;
    if (this.quizDeck.length === 0) {
      this.refillQuizDeck();
    }
    this.currentQuiz = this.quizDeck.pop();

    this.quizOverlay.setVisible(true);
    this.quizBox.setVisible(true);
    this.quizTitle.setVisible(true);
    this.quizQuestionText.setVisible(true);
    this.quizFeedbackText.setVisible(true);

    this.quizQuestionText.setText(this.currentQuiz.question);
    this.quizOptionButtons.forEach((btn) => btn.setVisible(true));
    this.quizOptionLabels.forEach((label, i) => {
      label.setText(`${i + 1}) ${this.currentQuiz.options[i]}`);
      label.setVisible(true);
    });
    this.quizFeedbackText.setText('Kies 1, 2 of 3');

    if (this.registry.get('sfxOn')) {
      this.playTone(480, 0.08, 'triangle', 0.05);
    }
  }

  refillQuizDeck() {
    this.quizDeck = [...QUIZ_QUESTIONS];
    Phaser.Utils.Array.Shuffle(this.quizDeck);
  }

  handleQuizInput() {
    if (!this.isPausedForQuiz || !this.currentQuiz) return;

    let selected = -1;
    if (Phaser.Input.Keyboard.JustDown(this.key1)) selected = 0;
    if (Phaser.Input.Keyboard.JustDown(this.key2)) selected = 1;
    if (Phaser.Input.Keyboard.JustDown(this.key3)) selected = 2;
    if (selected !== -1) {
      this.answerQuiz(selected);
    }
  }

  answerQuiz(selected) {
    if (!this.isPausedForQuiz || !this.currentQuiz) return;
    const correct = selected === this.currentQuiz.correctIndex;
    if (correct) {
      this.score += this.quizConfig.bonusPoints;
      this.scoreText.setText(`Score: ${this.score}`);
      this.showScorePopup(this.scale.width / 2, this.scale.height / 2 - 120, `+${this.quizConfig.bonusPoints}`, '#fff6a8');
      this.quizFeedbackText.setText(`Goed! +${this.quizConfig.bonusPoints} bonuspunten. ${this.currentQuiz.explanation}`);
      if (this.registry.get('sfxOn')) {
        this.playTone(540, 0.09, 'triangle', 0.05);
        this.time.delayedCall(70, () => this.playTone(740, 0.09, 'triangle', 0.05));
      }
    } else {
      this.quizFeedbackText.setText(`Bijna! ${this.currentQuiz.explanation}`);
      if (this.registry.get('sfxOn')) {
        this.playTone(190, 0.13, 'sawtooth', 0.055);
      }
    }

    this.time.delayedCall(1300, () => {
      this.endQuiz();
    });
  }

  endQuiz() {
    this.isPausedForQuiz = false;
    this.currentQuiz = null;

    this.quizOverlay.setVisible(false);
    this.quizBox.setVisible(false);
    this.quizTitle.setVisible(false);
    this.quizQuestionText.setVisible(false);
    this.quizFeedbackText.setVisible(false);
    this.quizOptionButtons.forEach((btn) => btn.setVisible(false));
    this.quizOptionLabels.forEach((label) => label.setVisible(false));

    this.resumeGraceUntil = this.time.now + this.quizConfig.resumeGraceMs;
  }

  triggerGameOver(reason = 'Game over', obstacle = null) {
    if (!this.isRunning) return;

    this.isRunning = false;
    if (obstacle?.active) {
      obstacle.setTint(0xff5e5e);
    }

    if (this.registry.get('sfxOn')) {
      this.playTone(140, 0.18, 'sawtooth', 0.08);
    }

    if (this.score > this.bestScore) {
      this.bestScore = this.score;
      localStorage.setItem('mosasaur_best_score', String(this.bestScore));
    }

    this.time.delayedCall(360, () => {
      this.scene.start('GameOver', {
        lastScore: this.score,
        bestScore: this.bestScore,
        reason
      });
    });
  }

  showNextFact() {
    if (!this.isRunning || this.isPausedForQuiz || this.isPausedGame) return;

    const fact = OCEAN_FACTS[this.factIndex % OCEAN_FACTS.length];
    this.factIndex += 1;

    this.factTitle.setText('');
    this.factBody.setText(`Wist je? ${fact.body}`);
    this.factPanel.setVisible(true);
    this.factTitle.setVisible(true);
    this.factBody.setVisible(true);

    this.time.delayedCall(this.factDurationMs, () => {
      if (!this.scene.isActive('Game')) return;
      this.factPanel.setVisible(false);
      this.factTitle.setVisible(false);
      this.factBody.setVisible(false);
    });
  }

  updateDebug() {
    const mouth = this.getMouthWorldPoint();
    this.debugText.setText(
      `spd ${Math.round(this.worldSpeed)} lv${this.speedLevel} | air ${Math.round(this.airCurrent)} | jump ${this.isJumping ? 'Y' : 'N'} | mouth ${Math.round(mouth.x)},${Math.round(mouth.y)}`
    );
  }

  showScorePopup(x, y, label, color) {
    const popup = this.add.text(x, y, label, {
      fontFamily: 'Trebuchet MS',
      fontSize: '28px',
      color,
      stroke: '#092033',
      strokeThickness: 4
    }).setOrigin(0.5).setDepth(45);

    this.tweens.add({
      targets: popup,
      y: y - 36,
      alpha: 0,
      duration: 620,
      ease: 'Sine.easeOut',
      onComplete: () => popup.destroy()
    });
  }

  createSplash(x, y, strength = 1, mode = 'exit') {
    const entryBoost = mode === 'entry' ? 1.45 : 1.0;
    const s = strength * entryBoost;
    const count = Math.round(30 + (24 * s));
    for (let i = 0; i < count; i += 1) {
      const drop = this.add.image(
        x + Phaser.Math.Between(-56, 56),
        y + Phaser.Math.Between(-8, 8),
        'splash_dot'
      )
        .setDepth(12)
        .setAlpha(Phaser.Math.FloatBetween(0.62, 1))
        .setScale(Phaser.Math.FloatBetween(1.4, 3.4));
      const dx = Phaser.Math.FloatBetween(-180, 180) * s;
      const dy = Phaser.Math.FloatBetween(-240, -70) * s;
      this.tweens.add({
        targets: drop,
        x: drop.x + dx * 0.34,
        y: drop.y + dy * 0.34,
        alpha: 0,
        duration: Phaser.Math.Between(420, 760),
        ease: 'Quad.easeOut',
        onComplete: () => drop.destroy()
      });
    }
  }

  createDiveBubbleTrail(durationMs = 2400) {
    this.diveTrailStart = this.time.now;
    this.diveTrailUntil = this.time.now + durationMs;
    this.nextTrailEmitAt = this.time.now;
  }

  updateDiveTrail() {
    if (this.time.now >= this.diveTrailUntil) return;
    if (this.isJumping) return;
    if (!this.isUnderwater) return;
    if (this.time.now < this.nextTrailEmitAt) return;

    const totalDur = Math.max(1, this.diveTrailUntil - this.diveTrailStart);
    const remaining = Phaser.Math.Clamp((this.diveTrailUntil - this.time.now) / totalDur, 0, 1);
    const intensity = 0.35 + (0.65 * remaining);
    this.emitTrailBurst(intensity);
    this.nextTrailEmitAt = this.time.now + 45;
  }

  emitTrailBurst(intensity) {
    const p = this.getTrailWorldPoint();
    const ang = Phaser.Math.DegToRad(this.player.angle);
    const bx = -Math.cos(ang);
    const by = -Math.sin(ang);
    const burst = Math.round(2 + (5 * intensity));

    for (let i = 0; i < burst; i += 1) {
      const bubble = this.add.image(
        p.x + Phaser.Math.Between(-12, 12),
        p.y + Phaser.Math.Between(-8, 8),
        'bubble'
      )
        .setDepth(11)
        .setAlpha(Phaser.Math.FloatBetween(0.28, 0.9) * (0.45 + (0.55 * intensity)))
        .setScale(Phaser.Math.FloatBetween(0.85, 2.2) * (0.5 + (0.7 * intensity)));

      const backDist = Phaser.Math.Between(40, 120) * (0.55 + (0.55 * intensity));
      const sink = Phaser.Math.Between(8, 44) * (0.5 + (0.5 * intensity));
      this.tweens.add({
        targets: bubble,
        x: bubble.x + (bx * backDist) - Phaser.Math.Between(8, 20),
        y: bubble.y + (by * backDist * 0.25) + sink,
        alpha: 0,
        duration: Phaser.Math.Between(580, 1050),
        ease: 'Sine.easeOut',
        onComplete: () => bubble.destroy()
      });
    }
  }

  getTrailWorldPoint() {
    const angle = Phaser.Math.DegToRad(this.player.angle);
    const frameW = this.player?.frame?.width ?? 300;
    const backX = this.usingSheet ? -(frameW * 0.34) : -72;
    const backY = this.usingSheet ? 8 : 2;
    const ox = backX * this.playerScale;
    const oy = backY * this.playerScale;
    return new Phaser.Math.Vector2(
      this.player.x + (ox * Math.cos(angle) - oy * Math.sin(angle)),
      this.player.y + (ox * Math.sin(angle) + oy * Math.cos(angle))
    );
  }

  playTone(freq, durationSec, type = 'sine', volume = 0.02) {
    if (!this.audioCtx) return;
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }

    const t0 = this.audioCtx.currentTime;
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    gain.gain.setValueAtTime(Math.max(0.0001, volume), t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + durationSec);

    osc.connect(gain);
    if (this.audioMasterGain) {
      gain.connect(this.audioMasterGain);
    } else {
      gain.connect(this.audioCtx.destination);
    }
    osc.start(t0);
    osc.stop(t0 + durationSec);
  }
}
