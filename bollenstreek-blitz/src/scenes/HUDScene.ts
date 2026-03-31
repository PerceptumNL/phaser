import Phaser from 'phaser';

interface HUDData {
  level: number;
  score: number;
  lives: number;
  combo: number;
}

interface HUDUpdate {
  score: number;
  lives: number;
  combo: number;
  timer: number;
  deliveries: string;
  target: Phaser.Math.Vector2 | null;
  targetType: 'pickup' | 'delivery' | null;
  playerX: number;
  playerY: number;
}

export class HUDScene extends Phaser.Scene {
  private timerText!: Phaser.GameObjects.Text;
  private scoreText!: Phaser.GameObjects.Text;
  private livesText!: Phaser.GameObjects.Text;
  private comboText!: Phaser.GameObjects.Text;
  private deliveryText!: Phaser.GameObjects.Text;
  private directionArrow!: Phaser.GameObjects.Graphics;
  private miniMap!: Phaser.GameObjects.Graphics;
  // levelText created in create()
  private level = 1;
  private timerWarning = false;

  constructor() {
    super({ key: 'HUDScene' });
  }

  init(data: HUDData) {
    this.level = data.level || 1;
  }

  create() {
    // Timer (center top)
    this.timerText = this.add.text(400, 15, '00:00', {
      fontSize: '32px',
      color: '#ffffff',
      fontFamily: 'Arial Black, Arial',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(0.5).setDepth(10);

    // Level indicator
    this.add.text(400, 48, `Level ${this.level}`, {
      fontSize: '12px',
      color: '#FFD93D',
      fontFamily: 'Arial',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5).setDepth(10);

    // Score (top right)
    this.scoreText = this.add.text(780, 15, 'Score: 0', {
      fontSize: '18px',
      color: '#FFD93D',
      fontFamily: 'Arial',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(1, 0).setDepth(10);

    // Combo
    this.comboText = this.add.text(780, 40, '', {
      fontSize: '14px',
      color: '#FF6B35',
      fontFamily: 'Arial',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(1, 0).setDepth(10);

    // Lives (top left) - bike icons
    this.livesText = this.add.text(20, 15, '', {
      fontSize: '20px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 3,
    }).setDepth(10);

    // Delivery info (bottom center)
    this.deliveryText = this.add.text(400, 575, '', {
      fontSize: '14px',
      color: '#ffffff',
      fontFamily: 'Arial',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3,
      backgroundColor: '#00000088',
      padding: { x: 8, y: 4 },
    }).setOrigin(0.5).setDepth(10);

    // Direction arrow
    this.directionArrow = this.add.graphics().setDepth(10);

    // Mini-map (top-right corner, below score)
    this.miniMap = this.add.graphics().setDepth(10);

    // Listen for updates
    this.events.on('update-hud', (data: HUDUpdate) => {
      this.updateDisplay(data);
    });
  }

  private updateDisplay(data: HUDUpdate) {
    // Timer
    const seconds = Math.max(0, Math.floor(data.timer));
    const ms = Math.floor((data.timer % 1) * 100);
    this.timerText.setText(`${seconds.toString().padStart(2, '0')}:${ms.toString().padStart(2, '0')}`);

    // Timer warning (< 10 seconds)
    if (seconds < 10 && data.timer > 0) {
      if (!this.timerWarning) {
        this.timerWarning = true;
      }
      this.timerText.setColor(Math.floor(Date.now() / 300) % 2 === 0 ? '#ff0000' : '#ff6b6b');
      this.timerText.setScale(1 + Math.sin(Date.now() / 200) * 0.05);
    } else {
      this.timerWarning = false;
      this.timerText.setColor('#ffffff');
      this.timerText.setScale(1);
    }

    // Score
    this.scoreText.setText(`Score: ${data.score}`);

    // Combo
    if (data.combo >= 2) {
      const mult = data.combo >= 4 ? '2.5x' : data.combo >= 3 ? '2.0x' : '1.5x';
      this.comboText.setText(`Combo ${mult}!`);
      this.comboText.setAlpha(1);
    } else {
      this.comboText.setAlpha(0);
    }

    // Lives
    this.livesText.setText('🚲'.repeat(data.lives));

    // Delivery info
    if (data.targetType === 'pickup') {
      this.deliveryText.setText(`📦 Ophalen — ${data.deliveries}`);
    } else if (data.targetType === 'delivery') {
      this.deliveryText.setText(`📬 Bezorgen — ${data.deliveries}`);
    } else {
      this.deliveryText.setText('');
    }

    // Direction arrow
    this.directionArrow.clear();
    if (data.target) {
      const dx = data.target.x - data.playerX;
      const dy = data.target.y - data.playerY;
      const angle = Math.atan2(dy, dx);
      const arrowX = 400 + Math.cos(angle) * 60;
      const arrowY = 550 + Math.sin(angle) * 20;

      const color = data.targetType === 'pickup' ? 0xffd93d : 0x95d5b2;
      this.directionArrow.fillStyle(color);
      this.directionArrow.fillTriangle(
        arrowX + Math.cos(angle) * 12,
        arrowY + Math.sin(angle) * 12,
        arrowX + Math.cos(angle - 2.3) * 8,
        arrowY + Math.sin(angle - 2.3) * 8,
        arrowX + Math.cos(angle + 2.3) * 8,
        arrowY + Math.sin(angle + 2.3) * 8,
      );
    }

    // Mini-map
    this.drawMiniMap(data.playerX, data.playerY, data.target);
  }

  private drawMiniMap(playerX: number, playerY: number, target: Phaser.Math.Vector2 | null) {
    this.miniMap.clear();

    const mmX = 700;
    const mmY = 70;
    const mmW = 80;
    const mmH = 60;
    const scaleX = mmW / (40 * 32);
    const scaleY = mmH / (30 * 32);

    // Background
    this.miniMap.fillStyle(0x000000, 0.5);
    this.miniMap.fillRect(mmX, mmY, mmW, mmH);
    this.miniMap.lineStyle(1, 0xffffff, 0.5);
    this.miniMap.strokeRect(mmX, mmY, mmW, mmH);

    // Player dot
    this.miniMap.fillStyle(0xff6b35);
    this.miniMap.fillCircle(mmX + playerX * scaleX, mmY + playerY * scaleY, 3);

    // Target dot
    if (target) {
      this.miniMap.fillStyle(0xffd93d);
      this.miniMap.fillCircle(mmX + target.x * scaleX, mmY + target.y * scaleY, 3);
    }
  }
}
