# RISE — Claude Code Build Brief

## What You're Building

A mobile-first survival match-3 game called **RISE**. Single HTML file using Phaser 3 (loaded from CDN). New rows of colored pieces push up from the bottom on a timer. You swap adjacent pieces to make horizontal or vertical lines of 3+, which clears them. If the stack reaches the top, you're dead. The pace accelerates. It's Tetris-meets-match-3: the pressure of a rising tide with the pattern recognition of color matching.

This is one of three match-3 prototypes (CHAIN, CRUSH, RISE) being built in parallel.

---

## Technical Stack

- **Single file**: `index.html` containing everything
- **Phaser 3**: Load from CDN `https://cdn.jsdelivr.net/npm/phaser@3.80.1/dist/phaser.min.js`
- **No build tools, no npm, no bundler** — just one HTML file
- **Target**: Mobile Chrome/Safari, portrait orientation, touch input
- **Deploy target**: Cloudflare Pages

---

## Game Design Spec

### Board
- Square grid: 6 columns × 12 rows (taller than wide — more vertical space for the rising mechanic)
- Cell size: `(screenWidth - 2 * margin) / 6` where margin = 16px
- Board takes up the full playable area. No dead space above or below the grid.
- The grid has a visible "ceiling" at row 0 (top). A warning line: if any piece reaches row 0 → death.

### Pieces
- Same 5 colors as CHAIN/CRUSH with same inner icons
- Rounded squares, `cellSize - 4px`

### Core Mechanic: Swap + Rising Rows

#### Swapping
1. Touch a piece, swipe in a direction (up/down/left/right) → swap with the adjacent piece in that direction
2. Swap is always valid (no "must create a match" restriction). Any two adjacent pieces can be swapped at any time. This is critical — it means the player can reposition pieces strategically even when no immediate match exists. It keeps the game flowing and prevents "stuck" frustration.
3. Swap animation: 80ms, both pieces slide to each other's positions simultaneously
4. After swap: check for matches (lines of 3+ same-colored horizontally or vertically)
5. If match found → clear matched pieces → pieces above fall → check for cascades
6. If no match → pieces stay in their new positions (the swap is NOT undone). This is intentional — it's how Tetris Attack works. Free swapping lets you set up combos.

#### Match Detection
- After every swap, check the entire board for horizontal and vertical lines of 3+ same-colored pieces
- A piece can be part of both a horizontal and vertical match simultaneously (L-shapes, T-shapes, crosses). Clear all matched pieces.
- Match priority: find ALL matches on the board simultaneously, clear them all at once

#### Rising Rows
- New rows push up from the bottom on a timer
- **Rise interval**: starts at 8 seconds. Decreases by 0.3 seconds per row pushed, minimum 2 seconds.
- **Rise mechanic**: ALL existing pieces shift up by one row. A new row of random colored pieces appears at the bottom (row 11).
- The new row should be generated without any pre-existing matches of 3+ (re-roll colors to prevent free matches from spawning).
- **Visual countdown**: A thin progress bar at the very bottom of the board fills from left to right over the rise interval. When full → new row pushes. This gives the player constant awareness of timing.
- **Rise pause on match**: When the player clears a match, the rise timer pauses for 1 second. Cascades extend the pause (each cascade step adds another 1 second). This rewards active play — keep matching and you buy time.
- **Manual rise**: The player can swipe UP from below the board to force an early rise. Why? Because the new row might contain a useful color. Risk/reward: you get a fresh row but everything moves closer to the ceiling.

#### Death
- Any piece occupies row 0 (the ceiling) after a rise AND no matches are being processed → death
- Brief grace: if a rise pushes pieces to row 0 but a match is currently cascading, wait until cascades resolve. If the cascade clears enough space, survive.
- Death visual: the ceiling flashes red, pieces in the top row flash, screen darkens

### Gravity
- After pieces are cleared, pieces above fall down to fill gaps
- Fall animation: 100ms per row, slight acceleration, squash on landing
- After settling → check for new matches (cascade). Each cascade adds +1 second to rise pause.
- New pieces do NOT spawn from the top (unlike CHAIN and CRUSH). Empty cells at the top of a column simply stay empty — they create breathing room. The only new pieces come from rising rows at the bottom. This is the key difference: in RISE, clearing pieces creates SPACE, which is the most valuable resource.

### Scoring
- **3 match**: 30 points
- **4 match**: 80 points (bonus for longer lines)
- **5 match**: 150 points
- **6 match**: 250 points
- **L/T/cross shapes**: Score each line separately. An L made of 3+3 sharing one piece = 30+30 = 60 points
- **Cascade multiplier**: ×2 for first cascade, ×3 for second, etc. Applied to each cascade clear.
- **Survival bonus**: +10 points per row that rises (you get points just for staying alive)
- Display score top-center
- High score in localStorage (`rise-best`)

### Difficulty Curve
- **Rows 1-5**: Slow rise (8-6.5 second interval). Learning swaps and matches.
- **Rows 6-15**: Moderate (6.5-3.5 second interval). Player must actively manage board height.
- **Rows 16-25**: Fast (3.5-2.5 second interval). Board management becomes frantic.
- **Rows 25+**: Near minimum interval (2-2 seconds). Survival mode. Every swap matters.
- The curve is continuous and driven by the per-row interval reduction.

### Danger Warning
- When any piece is in row 1 (one row below the ceiling): the top area of the board glows red with a pulsing animation. Warning.
- When a piece is in row 0: final warning flash. If the cascade doesn't clear it, death.
- The warning creates the central tension: you FEEL the stack getting dangerously high.

### Juice & Feel
- **Swap snappiness**: The 80ms swap must feel instant. Touch → swipe → pieces are in their new positions. No wind-up, no delay.
- **Match clear**: Matched pieces flash white (1 frame), then shrink and fade over 100ms. Particles burst (3 per piece, piece color, 150ms).
- **Cascade chain**: Each cascade step has a brief pause (300ms) where the new match flashes before clearing. Lets the player see the chain reaction building. Each step has a slightly louder vibration.
- **Rise animation**: The entire board slides up over 300ms (smooth tween). New row slides in from below the visible area. Should feel like the ground is pushing up — steady, relentless, unstoppable.
- **Progress bar urgency**: The rise timer bar changes color as it fills: green (#22c55e) → yellow (#eab308) → red (#ef4444) in the last 20%. Visual urgency.
- **Space creation**: When pieces are cleared at the top of a column, the empty space should feel like RELIEF. Perhaps a brief subtle lightening of the empty cells (very faint glow, 200ms fade). Communicates "you bought yourself room."
- **Danger pulse**: When pieces are in row 1, the board edges pulse red at 10% opacity. Heartbeat rhythm (pulse every 800ms). Creates physical anxiety.
- **Vibration**: 
  - Match clear: `navigator.vibrate(10)` per piece
  - Cascade: `navigator.vibrate(25)` per step
  - Rise: `navigator.vibrate(15)` (the ground shifting)
  - Danger state: `navigator.vibrate(5)` on each danger pulse
  - Death: `navigator.vibrate([80, 40, 80, 40, 80])`

---

## UI Spec

### Layout
- Full viewport, portrait
- Top 5%: Score
- Middle 80%: Game board (tall grid fills most of the screen)
- Bottom 15%: Rise progress bar, rows survived counter

### Start Screen
- Title "RISE" — large, centered
- Subtitle: "don't let it overflow" — smaller
- "swap pieces · match 3+ · clear space" instruction
- "tap to start"
- After tap: board fills with initial 5-6 rows of pieces from the bottom (the upper rows start empty). Rise timer begins.

### Initial Board State
- On game start, pre-fill the bottom 5 rows with random pieces (no pre-existing matches)
- Rows 5-11 are empty (breathing room)
- First rise happens after the full initial interval (8 seconds). Gives the player time to orient.

### Game Over Screen
- Dark overlay with red tint at the top
- Score, best
- "Rows survived: X"
- "Longest cascade: Y"
- "tap to retry"

### HUD
- Score: top-center, 40px, white at 35% opacity
- Rows survived: bottom-right, 20px, white at 25%
- Rise progress bar: full width at the very bottom of the board, 6px tall, color-changing (green → yellow → red)
- Danger indicator: board edges glow red when pieces are in row 1

### Colors
- Background: very dark (#0a0a14)
- Board background: (#0e0e1a)
- Board grid lines: (#1a1a2a at 12%)
- Ceiling line (row 0 boundary): red (#ef4444) at 30% opacity, pulses when danger
- Pieces: same 5 colors as CHAIN/CRUSH
- Empty cells (cleared space): very subtle lighter tint (#12121e) — reads as "safe space"
- Progress bar: green → yellow → red gradient based on fill
- Score: white at 35%
- Danger pulse: red (#ef4444) at 10% opacity on board edges

### Typography
- System font stack
- Title: 64px bold
- Score: 40px bold
- Rows survived: 20px
- Game over: 36px
- Instructions: 18px

---

## Implementation Notes

### Phaser Config
```javascript
const config = {
    type: Phaser.AUTO,
    scale: {
        mode: Phaser.Scale.RESIZE,
        parent: 'game',
        width: '100%',
        height: '100%',
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    backgroundColor: '#0a0a14',
    scene: [GameScene],
    physics: { default: 'arcade', arcade: { gravity: { y: 0 }, debug: false } }
};
```

### Board: 2D Array
```javascript
// grid[col][row] = { color, graphic } or null (empty cell)
// 6 cols × 12 rows
// Row 0 = ceiling (death zone), Row 11 = bottom
this.grid = [];
for (let col = 0; col < 6; col++) {
    this.grid[col] = new Array(12).fill(null);
}
```

### Swap Input
```javascript
let swipeStart = null;

this.input.on('pointerdown', (pointer) => {
    const cell = this.getCellFromPointer(pointer);
    if (!cell || !this.grid[cell.col][cell.row]) return;
    swipeStart = { x: pointer.x, y: pointer.y, col: cell.col, row: cell.row };
});

this.input.on('pointerup', (pointer) => {
    if (!swipeStart) return;

    const dx = pointer.x - swipeStart.x;
    const dy = pointer.y - swipeStart.y;

    // Determine swipe direction (must exceed 15px threshold)
    let targetCol = swipeStart.col;
    let targetRow = swipeStart.row;

    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 15) {
        targetCol += dx > 0 ? 1 : -1; // Horizontal swipe
    } else if (Math.abs(dy) > 15) {
        targetRow += dy > 0 ? 1 : -1; // Vertical swipe
    } else {
        swipeStart = null;
        return; // Too small, ignore
    }

    // Validate target
    if (targetCol < 0 || targetCol >= 6 || targetRow < 0 || targetRow >= 12) {
        swipeStart = null;
        return;
    }

    // Both cells must have pieces (can't swap with empty)
    if (!this.grid[targetCol][targetRow]) {
        swipeStart = null;
        return;
    }

    // Perform swap
    this.swapPieces(swipeStart.col, swipeStart.row, targetCol, targetRow);
    swipeStart = null;
});
```

### Match Detection
```javascript
function findAllMatches() {
    const matched = new Set(); // Store "col,row" strings

    // Horizontal matches
    for (let row = 0; row < 12; row++) {
        for (let col = 0; col <= 6 - 3; col++) {
            if (!this.grid[col][row]) continue;
            const color = this.grid[col][row].color;
            let length = 1;
            while (col + length < 6 && this.grid[col + length][row] &&
                   this.grid[col + length][row].color === color) {
                length++;
            }
            if (length >= 3) {
                for (let i = 0; i < length; i++) {
                    matched.add(`${col + i},${row}`);
                }
            }
        }
    }

    // Vertical matches
    for (let col = 0; col < 6; col++) {
        for (let row = 0; row <= 12 - 3; row++) {
            if (!this.grid[col][row]) continue;
            const color = this.grid[col][row].color;
            let length = 1;
            while (row + length < 12 && this.grid[col][row + length] &&
                   this.grid[col][row + length].color === color) {
                length++;
            }
            if (length >= 3) {
                for (let i = 0; i < length; i++) {
                    matched.add(`${col},${row + i}`);
                }
            }
        }
    }

    return [...matched].map(key => {
        const [c, r] = key.split(',').map(Number);
        return { col: c, row: r };
    });
}
```

### Rising Row
```javascript
this.riseTimer = 0;
this.riseInterval = 8000; // ms
this.risePaused = 0; // pause timer in ms
this.rowsSurvived = 0;

// In update(time, delta)
if (this.risePaused > 0) {
    this.risePaused -= delta;
} else {
    this.riseTimer += delta;
    if (this.riseTimer >= this.riseInterval) {
        this.riseTimer = 0;
        this.pushRise();
    }
}

// Update progress bar
this.progressBar.scaleX = this.risePaused > 0 ? 0 : (this.riseTimer / this.riseInterval);

function pushRise() {
    // Check death: if any piece exists in row 0
    for (let col = 0; col < 6; col++) {
        if (this.grid[col][0] !== null) {
            this.die();
            return;
        }
    }

    // Shift everything up by one row
    for (let col = 0; col < 6; col++) {
        for (let row = 0; row < 11; row++) {
            this.grid[col][row] = this.grid[col][row + 1];
            if (this.grid[col][row]) {
                this.grid[col][row].row = row;
                // Animate piece moving up one cell
                this.tweens.add({
                    targets: this.grid[col][row].graphic,
                    y: this.getRowY(row),
                    duration: 300,
                    ease: 'Sine.easeInOut'
                });
            }
        }

        // Generate new piece at bottom (row 11)
        const color = this.getRandomColorNoMatch(col, 11);
        this.grid[col][11] = this.createPiece(col, 11, color);
    }

    this.rowsSurvived++;
    this.score += 10; // Survival bonus

    // Decrease interval
    this.riseInterval = Math.max(this.riseInterval - 300, 2000);

    // Check danger state
    this.updateDangerIndicator();
}

function getRandomColorNoMatch(col, row) {
    // Pick a color that doesn't create a 3+ match at this position
    const attempts = 20;
    for (let i = 0; i < attempts; i++) {
        const color = Phaser.Math.Between(0, 4);
        // Check horizontal neighbors
        // Check vertical neighbors
        // If no 3+ match would form, return this color
        if (!wouldCreateMatch(col, row, color)) return color;
    }
    return Phaser.Math.Between(0, 4); // Fallback
}
```

### Cascade with Rise Pause
```javascript
async function processMatches(cascadeLevel = 0) {
    const matches = this.findAllMatches();
    if (matches.length === 0) return;

    // Pause rise timer
    this.risePaused += 1000; // +1 second per cascade step

    // Score
    const matchScore = this.calculateMatchScore(matches, cascadeLevel);
    this.score += matchScore;

    // Clear with animation
    await this.animateClear(matches);

    // Gravity
    await this.applyGravity();

    // Brief pause to show new board state
    await this.delay(300);

    // Recursive cascade check
    await this.processMatches(cascadeLevel + 1);
}
```

### Manual Rise (Swipe Up from Below Board)
```javascript
this.input.on('pointerup', (pointer) => {
    // Detect swipe up from below the board
    if (swipeStart && swipeStart.y > this.boardBottom &&
        pointer.y < swipeStart.y - 30) {
        this.pushRise();
        this.riseTimer = 0; // Reset timer since we just rose
        swipeStart = null;
        return;
    }
    // ... normal swap handling
});
```

### Viewport
```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
```
```css
html, body { margin:0; padding:0; overflow:hidden; touch-action:none; overscroll-behavior:none; position:fixed; width:100%; height:100%; }
```

---

## Definition of Done

1. Open on phone, tap to start, board with 5 pre-filled bottom rows appears
2. Swipe to swap any two adjacent pieces — swap is immediate and always works
3. Lines of 3+ same-colored pieces clear automatically with particles
4. Pieces fall to fill gaps (no new pieces from top — empty space stays empty)
5. New rows push up from the bottom on a timer (progress bar shows countdown)
6. Matching pauses the rise timer briefly
7. Stack reaching the ceiling triggers game over
8. Rise speed increases over time — pressure builds
9. High score persists
10. You feel the Tetris panic — the stack is getting high, you're scanning desperately for a match, the progress bar is filling, you find a 4-match just in time and the pause gives you a moment to breathe

That moment of relief when a cascade buys you time against the rising tide — that's the game. If you feel your heart rate increase as the stack approaches the ceiling, RISE works.

---

## Iteration Prompts

- "The swap feels too [slow/fast]. Change swap animation to Xms."
- "Rise speed starts too [fast/slow]. Change initial interval to Xms and decrement to Yms per row."
- "I need more breathing room. Start with only X rows pre-filled instead of 5."
- "Rise pause on match is too [short/long]. Change to Xms per cascade step."
- "I want a 'speed up' button instead of swipe-up for manual rise — place a button below the board."
- "Add garbage rows — every 30 seconds, a row with random gaps pushes up. Forces the player to clear specific columns."
- "I want the board to flash the danger color earlier — start warning at row 2 instead of row 1."
- "Add chain scoring — if I clear a match within 2 seconds of the previous match (active combo, not cascade), multiply the score."
- "I want a preview of the next rising row visible below the board (like Tetris next piece). Helps planning."
- "Add a 'freeze' power-up that occasionally appears as a special piece — matching it freezes the rise timer for 5 seconds."
- "The grid feels too narrow. Switch to 7 columns × 11 rows."

---

## What NOT to Build Yet

- Power-ups (freeze, bomb, etc.)
- Garbage rows
- Next-row preview
- Active combo scoring
- Difficulty modes (easy/hard)
- Themes / skins
- Sound
- Level progression
- Analytics
