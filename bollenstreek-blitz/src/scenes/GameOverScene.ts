import Phaser from 'phaser';

interface GameOverData {
  score: number;
  level: number;
}

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameOverScene' });
  }

  create(data: GameOverData) {
    const { width, height } = this.scale;

    this.cameras.main.setBackgroundColor('#1a1a2e');

    // Game Over text
    this.add.text(width / 2, height / 3, 'GAME OVER', {
      fontSize: '52px',
      color: '#ff6b6b',
      fontFamily: 'Arial Black, Arial',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Score
    this.add.text(width / 2, height / 3 + 70, `Score: ${data.score}`, {
      fontSize: '28px',
      color: '#ffffff',
      fontFamily: 'Arial',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(width / 2, height / 3 + 105, `Level bereikt: ${data.level}`, {
      fontSize: '18px',
      color: '#8D99AE',
      fontFamily: 'Arial',
    }).setOrigin(0.5);

    // High score
    const highScore = localStorage.getItem('bb_highscore') || '0';
    this.add.text(width / 2, height / 3 + 140, `Highscore: ${highScore}`, {
      fontSize: '16px',
      color: '#FFD93D',
      fontFamily: 'Arial',
    }).setOrigin(0.5);

    // Retry button
    const retryBtn = this.add.rectangle(width / 2, height - 140, 200, 50, 0xff6b35)
      .setInteractive({ useHandCursor: true });
    this.add.text(width / 2, height - 140, 'OPNIEUW', {
      fontSize: '24px', color: '#ffffff', fontFamily: 'Arial', fontStyle: 'bold',
    }).setOrigin(0.5);
    retryBtn.on('pointerdown', () => {
      this.scene.start('GameScene', { level: 1, score: 0, lives: 3, combo: 0 });
    });
    retryBtn.on('pointerover', () => retryBtn.setFillStyle(0xff8f5e));
    retryBtn.on('pointerout', () => retryBtn.setFillStyle(0xff6b35));

    // Menu button
    const menuBtn = this.add.rectangle(width / 2, height - 75, 200, 50, 0x5390d9)
      .setInteractive({ useHandCursor: true });
    this.add.text(width / 2, height - 75, 'MENU', {
      fontSize: '24px', color: '#ffffff', fontFamily: 'Arial', fontStyle: 'bold',
    }).setOrigin(0.5);
    menuBtn.on('pointerdown', () => this.scene.start('MenuScene'));
    menuBtn.on('pointerover', () => menuBtn.setFillStyle(0x6ba8e8));
    menuBtn.on('pointerout', () => menuBtn.setFillStyle(0x5390d9));
  }
}
