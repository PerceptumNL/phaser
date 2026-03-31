import Phaser from 'phaser';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MenuScene' });
  }

  create() {
    const { width, height } = this.scale;

    // Title
    this.add.text(width / 2, height / 3 - 30, 'BOLLENSTREEK', {
      fontSize: '48px',
      color: '#FF6B35',
      fontFamily: 'Arial Black, Arial',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(width / 2, height / 3 + 30, 'BLITZ', {
      fontSize: '64px',
      color: '#ffffff',
      fontFamily: 'Arial Black, Arial',
      fontStyle: 'bold',
      stroke: '#FF6B35',
      strokeThickness: 4,
    }).setOrigin(0.5);

    // Subtitle
    this.add.text(width / 2, height / 3 + 80, 'Bezorg pakketten door de Bollenstreek!', {
      fontSize: '16px',
      color: '#E8D5B7',
      fontFamily: 'Arial',
    }).setOrigin(0.5);

    // Play button
    const btnBg = this.add.rectangle(width / 2, height / 2 + 60, 200, 60, 0xff6b35)
      .setInteractive({ useHandCursor: true });
    const btnText = this.add.text(width / 2, height / 2 + 60, 'SPELEN', {
      fontSize: '28px',
      color: '#ffffff',
      fontFamily: 'Arial Black, Arial',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    btnBg.on('pointerover', () => {
      btnBg.setFillStyle(0xff8f5e);
      btnText.setScale(1.05);
    });
    btnBg.on('pointerout', () => {
      btnBg.setFillStyle(0xff6b35);
      btnText.setScale(1);
    });
    btnBg.on('pointerdown', () => {
      this.scene.start('GameScene', { level: 1, score: 0, lives: 3, combo: 0 });
    });

    // High score
    const highScore = localStorage.getItem('bb_highscore') || '0';
    const highLevel = localStorage.getItem('bb_highlevel') || '0';
    if (parseInt(highScore) > 0) {
      this.add.text(width / 2, height - 80, `Highscore: ${highScore}  |  Level: ${highLevel}`, {
        fontSize: '14px',
        color: '#95D5B2',
        fontFamily: 'Arial',
      }).setOrigin(0.5);
    }

    // Controls hint
    this.add.text(width / 2, height - 40, 'Pijltjestoetsen / WASD om te bewegen', {
      fontSize: '12px',
      color: '#8D99AE',
      fontFamily: 'Arial',
    }).setOrigin(0.5);
  }
}
