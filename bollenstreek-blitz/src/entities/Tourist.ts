import Phaser from 'phaser';
import { TILE_SIZE, getTileAt, TILE, MAP_COLS, MAP_ROWS } from '../utils/MapBuilder';

const TOURIST_SPEED = 30;
const TOURIST_COLORS = [0xe74c3c, 0x3498db, 0x2ecc71, 0xf39c12, 0x9b59b6];

export class Tourist extends Phaser.GameObjects.Container {
  declare body: Phaser.Physics.Arcade.Body;
  private moveTimer = 0;
  private direction: { x: number; y: number } = { x: 1, y: 0 };
  private gfx: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, tileX: number, tileY: number) {
    const x = tileX * TILE_SIZE + TILE_SIZE / 2;
    const y = tileY * TILE_SIZE + TILE_SIZE / 2;
    super(scene, x, y);

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.body.setSize(16, 16);
    this.body.setOffset(-8, -8);
    this.body.setImmovable(true);

    const color = TOURIST_COLORS[Math.floor(Math.random() * TOURIST_COLORS.length)];

    this.gfx = scene.add.graphics();
    this.add(this.gfx);

    // Body
    this.gfx.fillStyle(color);
    this.gfx.fillCircle(0, 2, 7);
    // Head
    this.gfx.fillStyle(0xffeaa7);
    this.gfx.fillCircle(0, -5, 5);
    // Camera
    this.gfx.fillStyle(0x333333);
    this.gfx.fillRect(3, -6, 5, 3);

    // Pick initial direction
    this.pickDirection();
  }

  private pickDirection() {
    // Walk along road tiles
    const directions = [
      { x: 1, y: 0 }, { x: -1, y: 0 },
      { x: 0, y: 1 }, { x: 0, y: -1 },
    ];

    const currentCol = Math.floor(this.x / TILE_SIZE);
    const currentRow = Math.floor(this.y / TILE_SIZE);

    // Filter to walkable road tiles
    const valid = directions.filter(d => {
      const nc = currentCol + d.x;
      const nr = currentRow + d.y;
      if (nc < 0 || nc >= MAP_COLS || nr < 0 || nr >= MAP_ROWS) return false;
      const tile = getTileAt(nc, nr);
      return tile === TILE.ROAD || tile === TILE.COBBLESTONE || tile === TILE.BRIDGE;
    });

    if (valid.length > 0) {
      this.direction = valid[Math.floor(Math.random() * valid.length)];
    }
  }

  update(_time: number, delta: number) {
    this.moveTimer += delta;

    // Change direction periodically
    if (this.moveTimer > 2000 + Math.random() * 3000) {
      this.moveTimer = 0;
      this.pickDirection();
    }

    // Check if next position is walkable
    const nextCol = Math.floor((this.x + this.direction.x * TILE_SIZE * 0.6) / TILE_SIZE);
    const nextRow = Math.floor((this.y + this.direction.y * TILE_SIZE * 0.6) / TILE_SIZE);
    const nextTile = getTileAt(nextCol, nextRow);

    if (nextTile === TILE.ROAD || nextTile === TILE.COBBLESTONE || nextTile === TILE.BRIDGE) {
      this.body.setVelocity(
        this.direction.x * TOURIST_SPEED,
        this.direction.y * TOURIST_SPEED
      );
    } else {
      this.body.setVelocity(0, 0);
      this.pickDirection();
    }
  }
}
