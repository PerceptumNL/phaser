import Phaser from 'phaser';

interface LevelCompleteData {
  level: number;
  score: number;
  deliveryScore: number;
  timeBonus: number;
  levelBonus: number;
  stars: number;
  lives?: number;
  combo?: number;
  isGameComplete?: boolean;
}

export class LevelCompleteScene extends Phaser.Scene {
  constructor() {
    super({ key: 'LevelCompleteScene' });
  }

  create(data: LevelCompleteData) {
    const { width, height } = this.scale;

    // Background
    this.cameras.main.setBackgroundColor('#1a1a2e');

    if (data.isGameComplete) {
      // Game complete screen
      this.add.text(width / 2, height / 4, 'GEFELICITEERD!', {
        fontSize: '42px',
        color: '#FFD93D',
        fontFamily: 'Arial Black, Arial',
        fontStyle: 'bold',
      }).setOrigin(0.5);

      this.add.text(width / 2, height / 4 + 50, 'Alle levels voltooid!', {
        fontSize: '20px',
        color: '#ffffff',
        fontFamily: 'Arial',
      }).setOrigin(0.5);
    } else {
      this.add.text(width / 2, height / 4, `Level ${data.level} Voltooid!`, {
        fontSize: '36px',
        color: '#FF6B35',
        fontFamily: 'Arial Black, Arial',
        fontStyle: 'bold',
      }).setOrigin(0.5);
    }

    // Stars
    const starY = height / 4 + (data.isGameComplete ? 90 : 60);
    for (let i = 0; i < 3; i++) {
      const filled = i < data.stars;
      this.add.text(width / 2 - 40 + i * 40, starY, filled ? '★' : '☆', {
        fontSize: '36px',
        color: filled ? '#FFD93D' : '#555555',
      }).setOrigin(0.5);
    }

    // Score breakdown
    const scoreY = starY + 60;
    this.add.text(width / 2, scoreY, `Bezorging: +${data.deliveryScore}`, {
      fontSize: '16px', color: '#95D5B2', fontFamily: 'Arial',
    }).setOrigin(0.5);
    this.add.text(width / 2, scoreY + 25, `Tijdbonus: +${data.timeBonus}`, {
      fontSize: '16px', color: '#87CEEB', fontFamily: 'Arial',
    }).setOrigin(0.5);
    this.add.text(width / 2, scoreY + 50, `Level bonus: +${data.levelBonus}`, {
      fontSize: '16px', color: '#FFD93D', fontFamily: 'Arial',
    }).setOrigin(0.5);

    this.add.text(width / 2, scoreY + 90, `Totaal: ${data.score}`, {
      fontSize: '28px',
      color: '#ffffff',
      fontFamily: 'Arial Black, Arial',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Buttons
    if (data.isGameComplete) {
      // Menu button
      const menuBtn = this.add.rectangle(width / 2, height - 100, 220, 50, 0xff6b35)
        .setInteractive({ useHandCursor: true });
      this.add.text(width / 2, height - 100, 'TERUG NAAR MENU', {
        fontSize: '20px', color: '#ffffff', fontFamily: 'Arial', fontStyle: 'bold',
      }).setOrigin(0.5);
      menuBtn.on('pointerdown', () => this.scene.start('MenuScene'));
      menuBtn.on('pointerover', () => menuBtn.setFillStyle(0xff8f5e));
      menuBtn.on('pointerout', () => menuBtn.setFillStyle(0xff6b35));
    } else {
      // Next level button
      const nextBtn = this.add.rectangle(width / 2, height - 100, 200, 50, 0xff6b35)
        .setInteractive({ useHandCursor: true });
      this.add.text(width / 2, height - 100, 'VOLGEND LEVEL', {
        fontSize: '22px', color: '#ffffff', fontFamily: 'Arial', fontStyle: 'bold',
      }).setOrigin(0.5);
      nextBtn.on('pointerdown', () => {
        this.scene.start('GameScene', {
          level: data.level + 1,
          score: data.score,
          lives: data.lives ?? 3,
          combo: data.combo ?? 0,
        });
      });
      nextBtn.on('pointerover', () => nextBtn.setFillStyle(0xff8f5e));
      nextBtn.on('pointerout', () => nextBtn.setFillStyle(0xff6b35));
    }

    // Save per-level score
    const levelKey = `bb_level${data.level}_best`;
    const currentBest = parseInt(localStorage.getItem(levelKey) || '0');
    if (data.score > currentBest) {
      localStorage.setItem(levelKey, data.score.toString());
    }
    localStorage.setItem(`bb_level${data.level}_stars`, data.stars.toString());
  }
}
