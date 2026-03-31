export class ScoreManager {
  score: number;
  combo: number;
  lives: number;

  constructor(score = 0, lives = 3, combo = 0) {
    this.score = score;
    this.lives = lives;
    this.combo = combo;
  }

  addDeliveryScore(secondsRemaining: number): number {
    const base = 100;
    const timeBonus = Math.max(0, Math.floor(secondsRemaining)) * 10;
    const multiplier = this.getComboMultiplier();
    const total = Math.floor((base + timeBonus) * multiplier);
    this.score += total;
    this.combo++;
    return total;
  }

  addLevelBonus(): number {
    this.score += 500;
    return 500;
  }

  getComboMultiplier(): number {
    if (this.combo >= 4) return 2.5;
    if (this.combo >= 3) return 2.0;
    if (this.combo >= 2) return 1.5;
    return 1.0;
  }

  loseLife() {
    this.lives--;
    this.combo = 0;
  }

  isGameOver(): boolean {
    return this.lives <= 0;
  }

  saveHighScore(level: number) {
    const currentHigh = parseInt(localStorage.getItem('bb_highscore') || '0');
    if (this.score > currentHigh) {
      localStorage.setItem('bb_highscore', this.score.toString());
    }
    const currentLevel = parseInt(localStorage.getItem('bb_highlevel') || '0');
    if (level > currentLevel) {
      localStorage.setItem('bb_highlevel', level.toString());
    }
  }
}
