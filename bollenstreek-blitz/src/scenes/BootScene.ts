import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  create() {
    const { width, height } = this.scale;

    this.add.text(width / 2, height / 2 - 40, 'BOLLENSTREEK BLITZ', {
      fontSize: '32px',
      color: '#FF6B35',
      fontFamily: 'Arial Black, Arial',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(width / 2, height / 2 + 10, 'Laden...', {
      fontSize: '18px',
      color: '#ffffff',
      fontFamily: 'Arial',
    }).setOrigin(0.5);

    // No assets to load for v1, go straight to menu
    this.time.delayedCall(500, () => {
      this.scene.start('MenuScene');
    });
  }
}
