import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { DeliveryManager } from '../systems/DeliveryManager';
import { ObstacleManager } from '../systems/ObstacleManager';
import { ScoreManager } from '../systems/ScoreManager';
import { LEVELS } from '../config/levels';
import {
  MAP_DATA, MAP_COLS, MAP_ROWS, TILE_SIZE,
  TILE_COLORS, TILE, WALL_TILES, getTulipColor,
} from '../utils/MapBuilder';

interface GameData {
  level: number;
  score: number;
  lives: number;
  combo: number;
}

export class GameScene extends Phaser.Scene {
  private player!: Player;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: Record<string, Phaser.Input.Keyboard.Key>;
  private deliveryManager!: DeliveryManager;
  private obstacleManager!: ObstacleManager;
  private scoreManager!: ScoreManager;
  private levelIndex = 0;
  private deliveryTimer = 0;
  private timerActive = false;
  private countdownActive = false;
  private countdownText!: Phaser.GameObjects.Text;
  private levelIntroOverlay!: Phaser.GameObjects.Container;
  private wallLayer!: Phaser.Physics.Arcade.StaticGroup;
  private joystickForce = { x: 0, y: 0 };
  private joystickBase: Phaser.GameObjects.Graphics | null = null;
  private joystickThumb: Phaser.GameObjects.Graphics | null = null;
  private joystickActive = false;
  private joystickOrigin = { x: 0, y: 0 };
  private particleGraphics!: Phaser.GameObjects.Graphics;
  private particles: Array<{ x: number; y: number; vx: number; vy: number; life: number; color: number }> = [];

  constructor() {
    super({ key: 'GameScene' });
  }

  init(data: GameData) {
    this.levelIndex = (data.level || 1) - 1;
    this.scoreManager = new ScoreManager(data.score || 0, data.lives || 3, data.combo || 0);
  }

  create() {
    const levelConfig = LEVELS[this.levelIndex];
    if (!levelConfig) {
      // Game complete!
      this.scoreManager.saveHighScore(10);
      this.scene.stop('HUDScene');
      this.scene.start('LevelCompleteScene', {
        level: 10,
        score: this.scoreManager.score,
        deliveryScore: 0,
        timeBonus: 0,
        levelBonus: 500,
        stars: 3,
        isGameComplete: true,
      });
      return;
    }

    // Build tilemap
    this.buildMap();

    // Create wall collision bodies
    this.createWalls();

    // Player - start at town center area
    this.player = new Player(this, 18 * TILE_SIZE + 16, 14 * TILE_SIZE + 16);
    this.physics.add.collider(this.player, this.wallLayer);

    // Camera
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.setBounds(0, 0, MAP_COLS * TILE_SIZE, MAP_ROWS * TILE_SIZE);
    this.physics.world.setBounds(0, 0, MAP_COLS * TILE_SIZE, MAP_ROWS * TILE_SIZE);

    // Input
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = {
      W: this.input.keyboard!.addKey('W'),
      A: this.input.keyboard!.addKey('A'),
      S: this.input.keyboard!.addKey('S'),
      D: this.input.keyboard!.addKey('D'),
    };

    // Mobile joystick
    this.setupJoystick();

    // Delivery system
    this.deliveryManager = new DeliveryManager(this, this.player, levelConfig.deliveries);

    // Listen for delivery complete
    this.events.on('delivery-complete', () => {
      this.handleDeliveryComplete();
    });

    // Obstacles
    this.obstacleManager = new ObstacleManager(this, this.player, levelConfig.obstacles);
    this.obstacleManager.create();

    // Particle system
    this.particleGraphics = this.add.graphics().setDepth(50);

    // Start HUD
    this.scene.launch('HUDScene', {
      level: this.levelIndex + 1,
      score: this.scoreManager.score,
      lives: this.scoreManager.lives,
      combo: this.scoreManager.combo,
    });

    // Show level intro
    this.showLevelIntro(levelConfig.description);
  }

  private buildMap() {
    const graphics = this.add.graphics();

    for (let row = 0; row < MAP_ROWS; row++) {
      for (let col = 0; col < MAP_COLS; col++) {
        const tile = MAP_DATA[row][col];
        const x = col * TILE_SIZE;
        const y = row * TILE_SIZE;

        if (tile === TILE.TULIP) {
          graphics.fillStyle(getTulipColor(col, row));
        } else {
          graphics.fillStyle(TILE_COLORS[tile] ?? 0x95d5b2);
        }
        graphics.fillRect(x, y, TILE_SIZE, TILE_SIZE);

        // Tile borders for buildings
        if (tile === TILE.BUILDING) {
          // Roof line
          graphics.fillStyle(0xd4a574);
          graphics.fillRect(x + 2, y, TILE_SIZE - 4, 6);
          // Window
          graphics.fillStyle(0x87ceeb);
          graphics.fillRect(x + 8, y + 10, 6, 6);
          graphics.fillRect(x + 18, y + 10, 6, 6);
        }

        // Road markings
        if (tile === TILE.ROAD) {
          graphics.fillStyle(0xa0aabb, 0.3);
          if (col % 3 === 0) {
            graphics.fillRect(x + 14, y, 4, TILE_SIZE);
          }
        }

        // Cobblestone texture
        if (tile === TILE.COBBLESTONE) {
          graphics.fillStyle(0xc0b090, 0.3);
          for (let dx = 0; dx < TILE_SIZE; dx += 8) {
            for (let dy = 0; dy < TILE_SIZE; dy += 8) {
              graphics.fillRect(x + dx + 1, y + dy + 1, 6, 6);
            }
          }
        }

        // Water waves
        if (tile === TILE.WATER) {
          graphics.lineStyle(1, 0x7ab8e8, 0.4);
          graphics.lineBetween(x + 4, y + 10, x + 12, y + 8);
          graphics.lineBetween(x + 16, y + 20, x + 28, y + 18);
        }

        // Bridge planks
        if (tile === TILE.BRIDGE) {
          graphics.lineStyle(1, 0x6b5b3a);
          for (let dy = 4; dy < TILE_SIZE; dy += 6) {
            graphics.lineBetween(x, y + dy, x + TILE_SIZE, y + dy);
          }
        }

        // Tulip details
        if (tile === TILE.TULIP) {
          graphics.fillStyle(0x2d8a4e, 0.5);
          graphics.fillRect(x + 6, y + 20, 2, 10);
          graphics.fillRect(x + 22, y + 18, 2, 12);
        }

        // Sand texture
        if (tile === TILE.SAND) {
          graphics.fillStyle(0xe8c84e, 0.2);
          graphics.fillCircle(x + 8, y + 12, 2);
          graphics.fillCircle(x + 22, y + 8, 1);
          graphics.fillCircle(x + 16, y + 24, 2);
        }
      }
    }
  }

  private createWalls() {
    this.wallLayer = this.physics.add.staticGroup();

    for (let row = 0; row < MAP_ROWS; row++) {
      for (let col = 0; col < MAP_COLS; col++) {
        const tile = MAP_DATA[row][col];
        if (WALL_TILES.includes(tile)) {
          const wall = this.add.rectangle(
            col * TILE_SIZE + TILE_SIZE / 2,
            row * TILE_SIZE + TILE_SIZE / 2,
            TILE_SIZE, TILE_SIZE
          );
          wall.setVisible(false);
          this.wallLayer.add(wall);
        }
      }
    }
  }

  private setupJoystick() {
    // Only show on touch devices
    if (!this.sys.game.device.input.touch) return;

    this.joystickBase = this.add.graphics()
      .setScrollFactor(0)
      .setDepth(200)
      .setAlpha(0.3);

    this.joystickThumb = this.add.graphics()
      .setScrollFactor(0)
      .setDepth(201)
      .setAlpha(0.5);

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.x < 300 && pointer.y > 300) {
        this.joystickActive = true;
        this.joystickOrigin = { x: pointer.x, y: pointer.y };
        this.drawJoystick(pointer.x, pointer.y, pointer.x, pointer.y);
      }
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!this.joystickActive) return;
      const dx = pointer.x - this.joystickOrigin.x;
      const dy = pointer.y - this.joystickOrigin.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const maxDist = 50;

      if (dist > 0) {
        const clampedDist = Math.min(dist, maxDist);
        this.joystickForce.x = (dx / dist) * (clampedDist / maxDist);
        this.joystickForce.y = (dy / dist) * (clampedDist / maxDist);
      }

      const thumbX = this.joystickOrigin.x + (dx / Math.max(dist, 1)) * Math.min(dist, maxDist);
      const thumbY = this.joystickOrigin.y + (dy / Math.max(dist, 1)) * Math.min(dist, maxDist);
      this.drawJoystick(this.joystickOrigin.x, this.joystickOrigin.y, thumbX, thumbY);
    });

    this.input.on('pointerup', () => {
      this.joystickActive = false;
      this.joystickForce = { x: 0, y: 0 };
      this.joystickBase?.clear();
      this.joystickThumb?.clear();
    });
  }

  private drawJoystick(baseX: number, baseY: number, thumbX: number, thumbY: number) {
    if (!this.joystickBase || !this.joystickThumb) return;

    this.joystickBase.clear();
    this.joystickBase.lineStyle(3, 0xffffff);
    this.joystickBase.strokeCircle(baseX, baseY, 50);
    this.joystickBase.fillStyle(0xffffff, 0.1);
    this.joystickBase.fillCircle(baseX, baseY, 50);

    this.joystickThumb.clear();
    this.joystickThumb.fillStyle(0xff6b35);
    this.joystickThumb.fillCircle(thumbX, thumbY, 20);
  }

  private showLevelIntro(description: string) {
    this.countdownActive = true;
    this.timerActive = false;

    this.levelIntroOverlay = this.add.container(0, 0).setScrollFactor(0).setDepth(300);

    // Dark overlay
    const bg = this.add.graphics();
    bg.fillStyle(0x000000, 0.7);
    bg.fillRect(0, 0, 800, 600);
    this.levelIntroOverlay.add(bg);

    // Level text
    const levelText = this.add.text(400, 200, `Level ${this.levelIndex + 1}`, {
      fontSize: '48px',
      color: '#FF6B35',
      fontFamily: 'Arial Black, Arial',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.levelIntroOverlay.add(levelText);

    const descText = this.add.text(400, 260, description, {
      fontSize: '20px',
      color: '#ffffff',
      fontFamily: 'Arial',
    }).setOrigin(0.5);
    this.levelIntroOverlay.add(descText);

    this.countdownText = this.add.text(400, 350, '3', {
      fontSize: '72px',
      color: '#FFD93D',
      fontFamily: 'Arial Black, Arial',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.levelIntroOverlay.add(this.countdownText);

    let count = 3;
    this.time.addEvent({
      delay: 800,
      callback: () => {
        count--;
        if (count > 0) {
          this.countdownText.setText(count.toString());
          this.tweens.add({
            targets: this.countdownText,
            scale: { from: 1.5, to: 1 },
            duration: 300,
          });
        } else {
          this.countdownText.setText('GO!');
          this.tweens.add({
            targets: this.countdownText,
            scale: { from: 2, to: 0 },
            alpha: { from: 1, to: 0 },
            duration: 400,
            onComplete: () => {
              this.levelIntroOverlay.destroy();
              this.countdownActive = false;
              this.startDeliveries();
            },
          });
        }
      },
      repeat: 2,
    });
  }

  private startDeliveries() {
    this.deliveryManager.start();
    this.startDeliveryTimer();
  }

  private startDeliveryTimer() {
    const levelConfig = LEVELS[this.levelIndex];
    this.deliveryTimer = levelConfig.timePerDelivery;
    this.timerActive = true;
  }

  private handleDeliveryComplete() {
    this.timerActive = false;
    const secondsRemaining = this.deliveryTimer;
    const points = this.scoreManager.addDeliveryScore(secondsRemaining);

    // Spawn particles at player location
    this.spawnConfetti(this.player.x, this.player.y);

    // Camera flash
    this.cameras.main.flash(200, 255, 215, 0);

    // Update HUD
    this.updateHUD();

    if (this.deliveryManager.isLevelComplete()) {
      // Level complete!
      const levelBonus = this.scoreManager.addLevelBonus();
      this.scoreManager.saveHighScore(this.levelIndex + 1);

      this.time.delayedCall(1000, () => {
        this.scene.stop('HUDScene');
        this.scene.start('LevelCompleteScene', {
          level: this.levelIndex + 1,
          score: this.scoreManager.score,
          deliveryScore: points,
          timeBonus: Math.floor(secondsRemaining) * 10,
          levelBonus,
          stars: this.calculateStars(secondsRemaining),
          lives: this.scoreManager.lives,
          combo: this.scoreManager.combo,
          isGameComplete: this.levelIndex + 1 >= LEVELS.length,
        });
      });
    } else {
      // Next delivery
      this.time.delayedCall(500, () => {
        this.deliveryManager.startNextDelivery();
        this.startDeliveryTimer();
      });
    }
  }

  private calculateStars(timeRemaining: number): number {
    const levelConfig = LEVELS[this.levelIndex];
    const ratio = timeRemaining / levelConfig.timePerDelivery;
    if (ratio > 0.6) return 3;
    if (ratio > 0.3) return 2;
    return 1;
  }

  private handleTimerExpired() {
    this.timerActive = false;
    this.scoreManager.loseLife();
    this.updateHUD();

    // Screen shake
    this.cameras.main.shake(300, 0.01);

    if (this.scoreManager.isGameOver()) {
      this.scoreManager.saveHighScore(this.levelIndex + 1);
      this.time.delayedCall(500, () => {
        this.scene.stop('HUDScene');
        this.scene.start('GameOverScene', {
          score: this.scoreManager.score,
          level: this.levelIndex + 1,
        });
      });
    } else {
      // Continue with next delivery (same level)
      this.time.delayedCall(1000, () => {
        if (!this.deliveryManager.isLevelComplete()) {
          this.deliveryManager.startNextDelivery();
          this.startDeliveryTimer();
        }
      });
    }
  }

  private updateHUD() {
    this.scene.get('HUDScene').events.emit('update-hud', {
      score: this.scoreManager.score,
      lives: this.scoreManager.lives,
      combo: this.scoreManager.combo,
      timer: this.deliveryTimer,
      deliveries: `${this.deliveryManager.getDeliveriesCompleted()}/${this.deliveryManager.getDeliveriesRequired()}`,
      target: this.deliveryManager.getCurrentTarget(),
      targetType: this.deliveryManager.getCurrentTargetType(),
      playerX: this.player.x,
      playerY: this.player.y,
    });
  }

  private spawnConfetti(x: number, y: number) {
    const colors = [0xff6b35, 0xffd93d, 0x95d5b2, 0xff6b6b, 0x5390d9];
    for (let i = 0; i < 20; i++) {
      this.particles.push({
        x, y,
        vx: (Math.random() - 0.5) * 200,
        vy: (Math.random() - 0.5) * 200 - 100,
        life: 1,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }
  }

  spawnPickupEffect(x: number, y: number) {
    const color = 0xffd93d;
    for (let i = 0; i < 10; i++) {
      const angle = (i / 10) * Math.PI * 2;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * 100,
        vy: Math.sin(angle) * 100,
        life: 0.8,
        color,
      });
    }
  }

  update(_time: number, delta: number) {
    if (this.countdownActive) return;

    const dt = delta / 1000;

    // Player movement
    this.player.update(this.cursors, this.wasd, this.joystickActive ? this.joystickForce : undefined);

    // Timer countdown
    if (this.timerActive) {
      this.deliveryTimer -= dt;
      if (this.deliveryTimer <= 0) {
        this.deliveryTimer = 0;
        this.handleTimerExpired();
      }
    }

    // Check pickup/delivery proximity
    this.deliveryManager.update();

    // Obstacles
    this.obstacleManager.update(_time, delta);

    // Update HUD
    this.updateHUD();

    // Update particles
    this.particleGraphics.clear();
    this.particles = this.particles.filter(p => {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 200 * dt; // gravity
      p.life -= dt * 1.5;

      if (p.life <= 0) return false;

      this.particleGraphics.fillStyle(p.color, p.life);
      this.particleGraphics.fillRect(p.x - 2, p.y - 2, 4, 4);
      return true;
    });
  }

  shutdown() {
    this.deliveryManager?.destroy();
    this.obstacleManager?.destroy();
  }
}
