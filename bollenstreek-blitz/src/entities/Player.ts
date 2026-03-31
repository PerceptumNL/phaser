import Phaser from 'phaser';
import { TILE_SIZE, getTileAt, TILE_SPEED } from '../utils/MapBuilder';

const BASE_SPEED = 200;

export class Player extends Phaser.GameObjects.Container {
  declare body: Phaser.Physics.Arcade.Body;
  private hasPackage = false;
  private bikeBody: Phaser.GameObjects.Graphics;
  private wheelAngle = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.body.setSize(20, 20);
    this.body.setOffset(-10, -10);
    this.body.setCollideWorldBounds(true);

    // Draw bike sprite
    this.bikeBody = scene.add.graphics();
    this.add(this.bikeBody);
    this.drawBike(0);
  }

  private drawBike(angle: number) {
    const g = this.bikeBody;
    g.clear();

    // Bike body
    g.fillStyle(0x333333);
    g.fillCircle(0, 0, 8);

    // Direction indicator
    const dx = Math.cos(angle) * 10;
    const dy = Math.sin(angle) * 10;
    g.fillStyle(0xff6b35);
    g.fillTriangle(dx, dy, dx - 4 * Math.cos(angle - 0.8), dy - 4 * Math.sin(angle - 0.8), dx - 4 * Math.cos(angle + 0.8), dy - 4 * Math.sin(angle + 0.8));

    // Wheels
    this.wheelAngle += 0.3;
    g.fillStyle(0x555555);
    g.fillCircle(-Math.cos(angle) * 6, -Math.sin(angle) * 6, 3);
    g.fillCircle(Math.cos(angle) * 6, Math.sin(angle) * 6, 3);

    // Package on back
    if (this.hasPackage) {
      g.fillStyle(0xd4a574);
      g.fillRect(-Math.cos(angle) * 10 - 4, -Math.sin(angle) * 10 - 4, 8, 8);
    }

    // Rider
    g.fillStyle(0xff6b35);
    g.fillCircle(0, -2, 4);
  }

  setHasPackage(val: boolean) {
    this.hasPackage = val;
  }

  getSpeedMultiplier(): number {
    const col = Math.floor(this.x / TILE_SIZE);
    const row = Math.floor(this.y / TILE_SIZE);
    const tile = getTileAt(col, row);
    return TILE_SPEED[tile] ?? 1.0;
  }

  update(cursors: Phaser.Types.Input.Keyboard.CursorKeys, wasd: Record<string, Phaser.Input.Keyboard.Key>, joystickForce?: { x: number; y: number }) {
    let vx = 0;
    let vy = 0;

    if (joystickForce && (joystickForce.x !== 0 || joystickForce.y !== 0)) {
      vx = joystickForce.x;
      vy = joystickForce.y;
    } else {
      if (cursors.left.isDown || wasd.A.isDown) vx = -1;
      if (cursors.right.isDown || wasd.D.isDown) vx = 1;
      if (cursors.up.isDown || wasd.W.isDown) vy = -1;
      if (cursors.down.isDown || wasd.S.isDown) vy = 1;
    }

    // Normalize diagonal
    if (vx !== 0 && vy !== 0) {
      const len = Math.sqrt(vx * vx + vy * vy);
      vx /= len;
      vy /= len;
    }

    const speed = BASE_SPEED * this.getSpeedMultiplier();
    this.body.setVelocity(vx * speed, vy * speed);

    // Apply slight momentum (drag)
    this.body.setDrag(600, 600);

    // Draw bike facing movement direction
    if (vx !== 0 || vy !== 0) {
      const angle = Math.atan2(vy, vx);
      this.drawBike(angle);
    }
  }
}
