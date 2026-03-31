import Phaser from 'phaser';
import { TILE_SIZE } from '../utils/MapBuilder';

export class Marker extends Phaser.GameObjects.Container {
  public businessId: string;
  public markerType: 'pickup' | 'delivery';
  private glow: Phaser.GameObjects.Graphics;
  private pulseTime = 0;

  constructor(
    scene: Phaser.Scene,
    tileX: number,
    tileY: number,
    icon: string,
    _name: string,
    businessId: string,
    type: 'pickup' | 'delivery'
  ) {
    const x = tileX * TILE_SIZE + TILE_SIZE / 2;
    const y = tileY * TILE_SIZE + TILE_SIZE / 2;
    super(scene, x, y);

    this.businessId = businessId;
    this.markerType = type;

    scene.add.existing(this);

    // Glow ring
    this.glow = scene.add.graphics();
    this.add(this.glow);

    // Icon text
    const iconText = scene.add.text(0, -2, icon, {
      fontSize: '20px',
    }).setOrigin(0.5);
    this.add(iconText);

    // Label below
    const label = scene.add.text(0, 18, type === 'pickup' ? 'OPHALEN' : 'BEZORGEN', {
      fontSize: '8px',
      color: type === 'pickup' ? '#FFD93D' : '#95D5B2',
      fontFamily: 'Arial',
      fontStyle: 'bold',
      backgroundColor: '#00000088',
      padding: { x: 2, y: 1 },
    }).setOrigin(0.5);
    this.add(label);

    this.drawGlow();
  }

  private drawGlow() {
    const g = this.glow;
    g.clear();
    const color = this.markerType === 'pickup' ? 0xffd93d : 0x95d5b2;
    const radius = 16 + Math.sin(this.pulseTime) * 3;
    g.lineStyle(2, color, 0.8);
    g.strokeCircle(0, 0, radius);
    g.fillStyle(color, 0.15);
    g.fillCircle(0, 0, radius);
  }

  preUpdate(time: number, _delta: number) {
    this.pulseTime = time / 300;
    this.drawGlow();
  }
}
