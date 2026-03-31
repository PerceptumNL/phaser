import Phaser from 'phaser';
import { Tourist } from '../entities/Tourist';
import { TILE, TILE_SIZE, MAP_COLS, MAP_ROWS, getTileAt, MAP_DATA } from '../utils/MapBuilder';
import { Player } from '../entities/Player';

export class ObstacleManager {
  private scene: Phaser.Scene;
  private player: Player;
  private tourists: Tourist[] = [];
  private vans: Phaser.GameObjects.Container[] = [];
  private windActive = false;
  private windTimer = 0;
  private windDirection = 0;
  private windIndicator: Phaser.GameObjects.Text | null = null;
  private drawbridgeOpen = false;
  private drawbridgeTimer = 0;
  private bridgeTiles: { col: number; row: number }[] = [];
  private bridgeGraphics: Phaser.GameObjects.Graphics | null = null;
  private rainEmitter: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private fogOverlay: Phaser.GameObjects.Graphics | null = null;
  private obstacles: string[];

  constructor(scene: Phaser.Scene, player: Player, obstacles: string[]) {
    this.scene = scene;
    this.player = player;
    this.obstacles = obstacles;
  }

  create() {
    if (this.obstacles.includes('tourists')) {
      this.spawnTourists();
    }
    if (this.obstacles.includes('vans')) {
      this.spawnVans();
    }
    if (this.obstacles.includes('drawbridge')) {
      this.setupDrawbridge();
    }
    if (this.obstacles.includes('rain')) {
      this.setupRain();
    }
  }

  private spawnTourists() {
    // Find road tiles near the boulevard (cols 2-6) and town center
    const spawnPoints: { x: number; y: number }[] = [];
    for (let row = 0; row < MAP_ROWS; row++) {
      for (let col = 0; col < MAP_COLS; col++) {
        const tile = getTileAt(col, row);
        if ((tile === TILE.ROAD || tile === TILE.COBBLESTONE) && Math.random() < 0.03) {
          spawnPoints.push({ x: col, y: row });
        }
      }
    }

    // Spawn 5-8 tourists
    const count = Math.min(spawnPoints.length, 5 + Math.floor(Math.random() * 4));
    for (let i = 0; i < count; i++) {
      const sp = spawnPoints[Math.floor(Math.random() * spawnPoints.length)];
      const tourist = new Tourist(this.scene, sp.x, sp.y);
      this.tourists.push(tourist);
      this.scene.physics.add.collider(this.player, tourist);
    }
  }

  private spawnVans() {
    // Place vans on random road tiles in the town
    const vanSpots: { x: number; y: number }[] = [];
    for (let row = 8; row < 20; row++) {
      for (let col = 8; col < 25; col++) {
        if (getTileAt(col, row) === TILE.ROAD && Math.random() < 0.02) {
          vanSpots.push({ x: col, y: row });
        }
      }
    }

    const count = Math.min(vanSpots.length, 3 + Math.floor(Math.random() * 3));
    for (let i = 0; i < count; i++) {
      const spot = vanSpots[i];
      if (!spot) continue;

      const van = this.scene.add.container(
        spot.x * TILE_SIZE + TILE_SIZE / 2,
        spot.y * TILE_SIZE + TILE_SIZE / 2
      );
      const g = this.scene.add.graphics();
      // Van body
      g.fillStyle(0xffffff);
      g.fillRoundedRect(-12, -8, 24, 16, 3);
      // Van cab
      g.fillStyle(0xdddddd);
      g.fillRect(8, -6, 6, 12);
      van.add(g);

      this.scene.physics.add.existing(van, true);
      (van.body as Phaser.Physics.Arcade.Body).setSize(24, 16);
      (van.body as Phaser.Physics.Arcade.Body).setOffset(-12, -8);

      this.scene.physics.add.collider(this.player, van);
      this.vans.push(van);
    }
  }

  private setupDrawbridge() {
    // Find bridge tiles
    for (let row = 0; row < MAP_ROWS; row++) {
      for (let col = 0; col < MAP_COLS; col++) {
        if (MAP_DATA[row][col] === TILE.BRIDGE) {
          this.bridgeTiles.push({ col, row });
        }
      }
    }

    this.bridgeGraphics = this.scene.add.graphics();
    this.bridgeGraphics.setDepth(5);
  }

  private setupRain() {
    // Create rain particles
    // We'll use a simple graphics-based approach
    this.fogOverlay = this.scene.add.graphics();
    this.fogOverlay.setScrollFactor(0);
    this.fogOverlay.setDepth(100);
  }

  update(time: number, delta: number) {
    // Update tourists
    for (const tourist of this.tourists) {
      tourist.update(time, delta);
    }

    // Wind system
    if (this.obstacles.includes('wind')) {
      this.updateWind(time, delta);
    }

    // Drawbridge
    if (this.obstacles.includes('drawbridge')) {
      this.updateDrawbridge(time, delta);
    }

    // Rain
    if (this.obstacles.includes('rain')) {
      this.updateRain();
    }
  }

  private updateWind(time: number, delta: number) {
    this.windTimer += delta;

    // Wind gust every 8 seconds, lasting 2 seconds
    const cycle = this.windTimer % 8000;

    if (cycle < 1000 && !this.windActive) {
      // Warning phase - show indicator
      this.windDirection = Math.random() > 0.5 ? 1 : -1;

      if (!this.windIndicator) {
        this.windIndicator = this.scene.add.text(400, 50, '', {
          fontSize: '24px',
          color: '#87CEEB',
          fontFamily: 'Arial',
          stroke: '#ffffff',
          strokeThickness: 2,
        }).setOrigin(0.5).setScrollFactor(0).setDepth(200);
      }
      this.windIndicator.setText(this.windDirection > 0 ? 'WIND >>>' : '<<< WIND');
      this.windIndicator.setAlpha(Math.sin(time / 100) * 0.5 + 0.5);
    } else if (cycle >= 1000 && cycle < 3000) {
      // Active wind
      this.windActive = true;
      const pushForce = this.windDirection * 80;
      this.player.body.setVelocityX(this.player.body.velocity.x + pushForce * (delta / 1000));

      if (this.windIndicator) {
        this.windIndicator.setAlpha(1);
      }
    } else {
      this.windActive = false;
      if (this.windIndicator) {
        this.windIndicator.setAlpha(0);
      }
    }
  }

  private updateDrawbridge(_time: number, delta: number) {
    this.drawbridgeTimer += delta;

    // Toggle every 6 seconds
    const shouldBeOpen = Math.floor(this.drawbridgeTimer / 6000) % 2 === 1;

    if (shouldBeOpen !== this.drawbridgeOpen) {
      this.drawbridgeOpen = shouldBeOpen;

      // Update bridge tiles - when open, they become water (impassable)
      for (const bt of this.bridgeTiles) {
        MAP_DATA[bt.row][bt.col] = this.drawbridgeOpen ? TILE.WATER : TILE.BRIDGE;
      }
    }

    // Draw bridge state
    if (this.bridgeGraphics) {
      this.bridgeGraphics.clear();
      if (this.drawbridgeOpen) {
        for (const bt of this.bridgeTiles) {
          this.bridgeGraphics.fillStyle(0x5390d9);
          this.bridgeGraphics.fillRect(bt.col * TILE_SIZE, bt.row * TILE_SIZE, TILE_SIZE, TILE_SIZE);
          // Warning stripes
          this.bridgeGraphics.lineStyle(2, 0xff0000);
          this.bridgeGraphics.strokeRect(bt.col * TILE_SIZE, bt.row * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        }
      }
    }
  }

  private updateRain() {
    if (!this.fogOverlay) return;

    this.fogOverlay.clear();
    // Semi-transparent fog overlay - reduces visibility
    this.fogOverlay.fillStyle(0x667788, 0.3);
    this.fogOverlay.fillRect(0, 0, 800, 600);

    // Rain drops (draw relative to camera/screen)
    this.fogOverlay.lineStyle(1, 0xaabbcc, 0.4);
    for (let i = 0; i < 60; i++) {
      const x = Math.random() * 800;
      const y = Math.random() * 600;
      this.fogOverlay.lineBetween(x, y, x - 2, y + 8);
    }
  }

  destroy() {
    for (const t of this.tourists) t.destroy();
    for (const v of this.vans) v.destroy();
    this.bridgeGraphics?.destroy();
    this.windIndicator?.destroy();
    this.fogOverlay?.destroy();
    this.rainEmitter?.destroy();

    // Restore bridge tiles
    for (const bt of this.bridgeTiles) {
      MAP_DATA[bt.row][bt.col] = TILE.BRIDGE;
    }
  }
}
