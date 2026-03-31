# CHAIN — Claude Code Build Brief

## What You're Building

A mobile-first draw-to-match game called **CHAIN**. Single HTML file using Phaser 3 (loaded from CDN). You draw a line through adjacent same-colored pieces on a grid. Minimum 3 to clear. Longer chains score more. If you draw a closed loop, ALL pieces of that color on the board are cleared. Pieces fall, new ones spawn, cascades happen.

This is one of three match-3 prototypes (CHAIN, CRUSH, RISE) being built in parallel to compare which variant feels best on mobile.

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
- Square grid: 7 columns × 9 rows
- Cell size: `(screenWidth - 2 * margin) / 7` where margin = 16px
- Board vertically centered in the upper ~70% of the screen
- Background behind board: slightly lighter than the main background (#0f0f1a)

### Pieces
- 5 colors:
  - Red (#ef4444) — inner icon: small circle
  - Blue (#3b82f6) — inner icon: small diamond
  - Green (#22c55e) — inner icon: small triangle
  - Yellow (#eab308) — inner icon: small star
  - Purple (#a855f7) — inner icon: small cross
- Shape: rounded square, sized to `cellSize - 4px` (2px visual gap between pieces)
- Inner icon: drawn in a slightly lighter shade of the same color, 30% of piece size, centered. Provides colorblind accessibility.
- Pieces are randomly assigned a color on spawn. Ensure no immediate matches exist on the initial board (no 3+ connected same-color groups at start — or simply allow them and let the player clear them immediately, which feels like a bonus).

### Core Mechanic: Drawing Chains

1. **Touch down** on a piece → that piece is the chain start. It highlights (scale 1.15×, brightness up).
2. **Drag** to an adjacent piece (8-directional: up, down, left, right, and 4 diagonals) of the **same color** → that piece joins the chain. A visible line connects them.
3. Continue dragging through more adjacent same-colored pieces. Each piece can only be added once.
4. **Dragging back** to the previous piece in the chain removes the last piece (undo). Allows correction without lifting finger.
5. **Release finger** → if chain length ≥ 3, clear all pieces in the chain. If < 3, cancel (pieces reset, nothing happens).
6. Cleared pieces vanish, pieces above fall down, new pieces spawn at the top of each column.

### The Loop (Advanced Technique)
- If the chain forms a **closed loop** — meaning the last piece in the chain is adjacent to the first piece, and you drag back to a piece adjacent to the start (the line visually closes) — this triggers a **super clear**: ALL pieces of that color on the entire board are removed, not just the chain.
- Loop detection: when the player drags to a piece that is adjacent to the chain's first piece AND the chain is already ≥ 4 pieces long, the loop closes.
- Visual signal: when a loop is possible (current piece is adjacent to start), the start piece glows brightly and pulses. The chain line color shifts to white. This teaches the player the mechanic exists.
- Loop clear is the big reward — massive score, massive particle burst, massive vibration.

### Adjacency
- 8-directional: a piece at (col, row) is adjacent to all 8 surrounding cells
- This makes chains easier to build than 4-directional (more connections possible)
- Diagonal chains feel natural when drawing with a finger on a grid

### Chain Drawing Visual
- Line between chained pieces: 3px thick, white at 60% opacity, drawn between piece centers
- Each chained piece: scales to 1.15×, subtle brightness increase
- The line follows the order of the chain (so you can see the path you've drawn)
- When hovering over an invalid piece (wrong color, already in chain, not adjacent): nothing happens, chain stays at current state
- When a loop is available: start piece pulses with a bright glow ring

### Gravity / Settling
- When pieces are cleared, pieces above fall down to fill gaps
- Fall: tween with acceleration, 120ms per row dropped, slight bounce on land (squash scale Y 0.85, settle over 80ms)
- New pieces spawn above the top of the board and fall in (same animation)
- After settling, check for any new connected groups of 3+ same-colored pieces that formed. If found: auto-clear after a 300ms pause (cascade). This is NOT a chain draw — it's automatic. Just groups of 3+ connected same-color.
- Wait — important design choice: should cascades auto-clear or should the board only clear through player-drawn chains?
  - **Decision: NO auto-cascade clearing.** Only player-drawn chains clear pieces. This keeps the game purely skill-based and avoids the board randomly solving itself. Cascades are satisfying but they remove player agency in a draw-to-match game. The player should always feel like THEY did it.
  - If playtesting shows the board gets stale without cascades, revisit this.

### Scoring
- **Chain of 3**: 30 points
- **Chain of 4**: 60 points
- **Chain of 5**: 100 points
- **Chain of 6+**: 100 + 50 per additional piece
- **Loop clear**: 200 + (20 × number of pieces cleared on the board). A loop clearing 12 pieces = 440 points.
- Display score bottom-center, large
- High score in localStorage (`chain-best`)

### Game Flow
- **Endless mode**: No levels, no move limit. Play until... when?
- **Stalemate detection**: After each move, check if any valid chain of 3+ exists on the board. If not → reshuffle the board (animate pieces swapping around for 500ms, then settle into new positions where valid chains exist). If 3 reshuffles happen in a row with no player move between them, the game is stuck → game over.
- Alternative: simply never let it reach stalemate by ensuring new pieces always create at least one valid chain. Check during spawn and reroll colors if needed.
- **Soft pressure**: Display a running timer on screen (counts up, not down). No time limit, but seeing the timer creates gentle urgency. Score is the primary metric but time adds a "how fast" secondary challenge.

### Death / Game Over
- Only on board stalemate (no valid chains possible after reshuffles)
- In practice this should be very rare with 5 colors on a 7×9 board
- Show score, best, time played
- Tap to retry

### Juice & Feel
- **Chain drawing is the core feel.** The finger tracing a path through connected pieces must feel smooth and responsive. No lag between drag position and chain extension. Check adjacency every frame, not on discrete tile entry.
- **Piece highlight on chain**: Each piece that joins the chain should pop (brief scale tween 1.0 → 1.2 → 1.15 over 60ms). Makes each addition feel like a click.
- **Chain line**: Smooth, not jagged. Draw as a series of segments between piece centers using Phaser Graphics, updated each frame during the drag.
- **Clear satisfaction**: When the chain clears, all pieces flash white simultaneously (1 frame), then shrink inward to their centers over 100ms. Particles burst from each position (3 tiny circles per piece, piece color, fade over 200ms).
- **Loop clear spectacle**: When a loop triggers, ALL same-colored pieces on the board flash their color brightly, then implode inward toward the center of the loop over 200ms. Big particle burst. Screen shake (4 frames, ±3px). `navigator.vibrate(60)`.
- **Fall sound substitute**: `navigator.vibrate(5)` when pieces land after falling.
- **Score popup**: "+X" at the center of where the chain was, floats up, fades over 400ms. Larger font for bigger chains.

---

## UI Spec

### Layout
- Full viewport, portrait
- Top 8%: Score display
- Middle 70%: Game board
- Bottom 22%: Timer, high score, game info

### Start Screen
- Title "CHAIN" — large, centered
- Subtitle: "draw to match" — smaller
- "drag through same colors · 3 or more to clear" instruction
- "tap to start"

### Game Over Screen
- Dark overlay
- Score, best, time played
- "tap to retry"

### Colors
- Background: very dark (#0a0a14)
- Board background: slightly lighter (#0f0f1a) with a subtle 1px cell grid (#1a1a2a at 15% opacity)
- Pieces: as specified above (red, blue, green, yellow, purple)
- Chain line: white at 60% opacity
- Loop glow: white at 80%, pulsing
- Score text: white at 40% during play, full on game over
- Timer: white at 25% (subtle, not distracting)

### Typography
- System font stack
- Title: 64px bold
- Score: 44px bold
- Timer: 20px
- Popups: 32px bold

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

### Board Data Structure
```javascript
// Grid stored as 2D array
this.grid = []; // grid[col][row] = { color, graphic, icon, col, row }

function createBoard(cols, rows) {
    const grid = [];
    for (let col = 0; col < cols; col++) {
        grid[col] = [];
        for (let row = 0; row < rows; row++) {
            const color = Phaser.Math.Between(0, 4); // 0-4 for 5 colors
            grid[col][row] = {
                color: color,
                col: col,
                row: row,
                graphic: null, // Phaser container with rounded rect + icon
            };
        }
    }
    return grid;
}
```

### Chain Drawing Input
```javascript
this.chain = []; // Array of {col, row} in chain order
this.isDragging = false;

this.input.on('pointerdown', (pointer) => {
    const cell = this.getCellFromPointer(pointer);
    if (!cell) return;
    this.isDragging = true;
    this.chain = [cell];
    this.highlightCell(cell);
});

this.input.on('pointermove', (pointer) => {
    if (!this.isDragging || this.chain.length === 0) return;
    const cell = this.getCellFromPointer(pointer);
    if (!cell) return;

    const last = this.chain[this.chain.length - 1];
    const first = this.chain[0];

    // Check if dragging back (undo last)
    if (this.chain.length >= 2) {
        const prev = this.chain[this.chain.length - 2];
        if (cell.col === prev.col && cell.row === prev.row) {
            this.unhighlightCell(last);
            this.chain.pop();
            this.redrawChainLine();
            return;
        }
    }

    // Check if valid extension
    if (this.isAdjacent(last, cell) &&
        this.grid[cell.col][cell.row].color === this.grid[first.col][first.row].color &&
        !this.isInChain(cell)) {

        this.chain.push(cell);
        this.highlightCell(cell);
        this.redrawChainLine();

        // Check loop possibility
        if (this.chain.length >= 4 && this.isAdjacent(cell, first)) {
            this.showLoopIndicator(first);
        }
    }
});

this.input.on('pointerup', () => {
    if (!this.isDragging) return;
    this.isDragging = false;

    if (this.chain.length >= 3) {
        // Check for loop
        const first = this.chain[0];
        const last = this.chain[this.chain.length - 1];
        const isLoop = this.chain.length >= 4 && this.isAdjacent(last, first);

        if (isLoop) {
            this.clearAllOfColor(this.grid[first.col][first.row].color);
        } else {
            this.clearChain(this.chain);
        }
    }

    this.resetChainVisuals();
    this.chain = [];
});

function isAdjacent(a, b) {
    return Math.abs(a.col - b.col) <= 1 && Math.abs(a.row - b.row) <= 1 &&
           !(a.col === b.col && a.row === b.row);
}

function getCellFromPointer(pointer) {
    const col = Math.floor((pointer.x - this.boardLeft) / this.cellSize);
    const row = Math.floor((pointer.y - this.boardTop) / this.cellSize);
    if (col < 0 || col >= 7 || row < 0 || row >= 9) return null;
    return { col, row };
}
```

### Gravity After Clear
```javascript
function applyGravity() {
    for (let col = 0; col < 7; col++) {
        // Compact: move all non-null cells to the bottom
        const pieces = this.grid[col].filter(cell => cell !== null);
        const emptyCount = 9 - pieces.length;

        // Fill top with new pieces
        for (let i = 0; i < emptyCount; i++) {
            pieces.unshift({
                color: Phaser.Math.Between(0, 4),
                col: col,
                row: i,
                graphic: null
            });
        }

        // Update grid and animate
        for (let row = 0; row < 9; row++) {
            const piece = pieces[row];
            const oldRow = piece.row;
            piece.row = row;
            this.grid[col][row] = piece;

            if (oldRow !== row || piece.graphic === null) {
                // Animate fall from oldRow (or above screen) to new row
                this.animateFall(piece, oldRow, row);
            }
        }
    }
}
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

1. Open on phone, tap to start, board appears
2. Touch a piece and drag through adjacent same-colored pieces — chain line follows your finger
3. Release with 3+ pieces → chain clears with particles and falling
4. Drawing a closed loop clears ALL pieces of that color on the board
5. Pieces fall and new ones spawn to fill gaps
6. Score tracks and persists
7. Drawing the chain feels smooth — no jitter, no missed connections
8. You find yourself scanning the board for long chains and especially for loop opportunities

The finger-tracing feel is everything. If drawing a 7-piece chain feels like tracing a satisfying path and the clear at the end pops — it works.

---

## Iteration Prompts

- "Chain drawing misses connections when I drag fast. Increase hit detection radius on cells to Xpx."
- "I want auto-cascades after pieces fall — if 3+ connected same-color groups form, auto-clear them after Xms delay."
- "The board gets stale. Reduce colors from 5 to 4 to increase match density."
- "I want a move counter instead of a timer — X moves before game over. Turns it into a puzzle."
- "Add combo scoring — chains cleared within X seconds of each other multiply."
- "The loop mechanic is too hard to discover. Add a tutorial hint on the first board showing a possible loop."
- "I want a 'bomb' piece that appears randomly — including it in a chain clears all pieces in a 3×3 area around it."
- "Add a timed mode — 60 seconds, highest score wins."

---

## What NOT to Build Yet

- Power-ups / special pieces
- Timed mode
- Move-limited puzzle mode
- Level progression
- Themes / skins
- Sound
- Analytics
