# CRUSH — Claude Code Build Brief

## What You're Building

A mobile-first tap-to-match game called **CRUSH**. Single HTML file using Phaser 3 (loaded from CDN). Tap a group of 3+ connected same-colored pieces and they all vanish. Bigger groups score exponentially more. Pieces fall, new ones spawn, cascades auto-clear. The skill is patience — do you tap the small cluster now, or wait and hope the board settles into a massive group?

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
- Square grid: 8 columns × 10 rows (slightly wider than CHAIN — more pieces = bigger potential clusters)
- Cell size: `(screenWidth - 2 * margin) / 8` where margin = 12px
- Board vertically centered in upper ~70%

### Pieces
- Same 5 colors as CHAIN (red, blue, green, yellow, purple) with same inner icons for colorblind accessibility
- Rounded squares, `cellSize - 4px`, 2px visual gap
- Random color on spawn

### Core Mechanic: Tap to Clear Clusters

1. Board is static — pieces don't move until you act
2. **Touch/tap** a piece → the game finds ALL connected same-colored pieces (4-directional: up/down/left/right, NOT diagonal — this makes cluster shapes more deliberate and readable)
3. If the connected group is 3+, it's a valid cluster
4. **On tap down (before release)**: Highlight the entire cluster (all pieces in the group scale up 1.1× and brighten). This preview shows the player exactly what they'll clear. Essential for making the game feel fair.
5. **On release**: If still on the same cluster → clear it. If finger moved off → cancel.
6. Cleared pieces vanish, pieces above fall, new pieces spawn at top.
7. **Auto-cascade**: After settling, check for new connected groups of 3+. If any exist... NO, do NOT auto-clear. The player must tap each group intentionally. (Same reasoning as CHAIN — player agency. But revisit if it feels tedious.)

Wait — reconsider. In CRUSH, auto-cascades actually make sense. The game is about choosing WHICH group to tap, and then being rewarded (or surprised) by what the falling pieces create. The cascade is the payoff for a good tap. Without cascades, the game is just "tap, tap, tap" without the satisfying chain reaction.

**Revised decision: YES auto-cascade.** After pieces settle, auto-check for groups of 3+. If found, pause 400ms (let the player see the new group), then auto-clear with cascade multiplier. Repeat until no more groups exist. Cascades are the core satisfaction.

### Cluster Detection (Flood Fill)
```
function getCluster(col, row, color, visited):
    if out of bounds or visited or grid[col][row].color != color:
        return []
    mark as visited
    result = [{col, row}]
    result += getCluster(col+1, row, color, visited)
    result += getCluster(col-1, row, color, visited)
    result += getCluster(col, row+1, color, visited)
    result += getCluster(col, row-1, color, visited)
    return result
```

### Cluster Preview on Touch
- When the player touches a piece, immediately run flood fill to find the cluster
- If cluster size ≥ 3: highlight all pieces in the cluster (scale, brightness, show cluster size number at center)
- If cluster size < 3: dim the touched piece briefly (subtle "nope" feedback). No action.
- If the player slides their finger to a different piece: re-calculate and preview the new cluster. Responsive.
- On release: clear the last previewed cluster (if valid)

### Scoring (Exponential — This Is the Game)
The scoring curve is what creates the "should I wait?" tension:
- **3 pieces**: 30 points
- **4 pieces**: 60 points
- **5 pieces**: 100 points
- **6 pieces**: 150 points
- **7 pieces**: 210 points
- **8 pieces**: 280 points
- **Formula**: `score = pieces × (pieces - 1) × 5`
- This means a 10-piece cluster scores 450, while two 5-piece clusters only score 200 total. Waiting for bigger clusters is ALWAYS better mathematically — but the risk is that new falling pieces might break up the potential big cluster.
- **Cascade multiplier**: Each cascade step multiplies the clear score by the cascade level. First cascade = ×2, second = ×3, etc.
- Display score bottom-center, large

### Game Flow: Move Pressure
- **Move counter**: The player has a limited pool of moves. Every tap that clears a cluster costs 1 move.
- Starting moves: 30
- Earning moves: Clearing a cluster of 7+ earns +1 bonus move. Clearing 10+ earns +2. This rewards the patience strategy.
- Cascades don't cost moves (they're free bonuses).
- When moves reach 0 → game over.
- Display remaining moves prominently (bottom-left, large)

### Why Move Limit Works Here
Without a limit, CRUSH is aimless — there's no reason not to just tap everything. The move limit creates the central tension: every tap must count. Do you clear the small group to reshape the board, or save your move for a bigger payoff? This is the strategic depth.

### Board Refill
- After each clear + cascade sequence, fill empty cells from the top with new random pieces
- Ensure the board always has at least one valid cluster of 3+ after refill (re-roll new piece colors if needed to guarantee this)

### Game Over
- Moves reach 0
- Or: no valid clusters exist on the board AND moves > 0 → reshuffle (animate pieces swapping for 500ms). Costs 1 move. If no valid clusters after reshuffle → game over.
- Show score, best, clusters cleared, largest cluster size
- Tap to retry

### Juice & Feel
- **Cluster preview**: The instant feedback of seeing the whole cluster highlight when you touch one piece is crucial. It answers "what will happen if I tap here?" without the player having to mentally trace connections. Must be < 16ms response time (one frame).
- **Cluster size display**: While previewing (finger down), show the cluster size as a large number overlaid at the cluster's center. "7" feels meaningful when you can see the scoring curve.
- **Exponential score popup**: When clearing a big cluster (7+), the score popup should be larger and use a brighter color (gold at 8+, rainbow at 10+). Visually communicates "that was a big deal."
- **Cascade satisfaction**: Each cascade step should have a brief screen pulse (background briefly brightens 3%), building excitement. By the 3rd cascade, the screen is subtly pulsing with energy.
- **Piece clear animation**: All pieces in the cluster implode toward the cluster's center point simultaneously over 120ms. Then a burst of particles from the center. This is different from CHAIN (which clears pieces individually along the path) — here, the GROUP collapses inward. Emphasizes the cluster as a unit.
- **Big cluster clear**: For clusters of 8+, add a brief shockwave ring expanding from the cluster center (white circle, expands and fades over 200ms).
- **Vibration**: `navigator.vibrate(10)` per piece in cluster (rapid burst). For 8+ cluster: `navigator.vibrate(50)`.
- **Landing thuds**: Subtle `navigator.vibrate(5)` when pieces settle after falling.
- **Cascade vibration**: Each cascade step: `navigator.vibrate(20)`.

---

## UI Spec

### Layout
- Full viewport, portrait
- Top 6%: Moves remaining (left), Score (center)
- Middle 72%: Game board
- Bottom 22%: High score, largest cluster this game

### Start Screen
- Title "CRUSH" — large, centered
- Subtitle: "tap to crush" — smaller
- "tap groups of 3+ · bigger groups score more" instruction
- "30 moves · make them count"
- "tap to start"

### Game Over Screen
- Dark overlay
- Score, best
- Stats: "Moves used: X" / "Largest cluster: Y" / "Cascades: Z"
- "tap to retry"

### Colors
- Background: very dark (#0a0a14)
- Board background: (#0f0f1a) with subtle grid lines (#1a1a2a at 12%)
- Pieces: same 5 colors as CHAIN
- Cluster highlight: pieces brighten, subtle white outer glow
- Cluster size number: white, bold, centered on cluster
- Score popup: white for normal, gold (#ffd700) for 8+, animated rainbow for 10+
- Moves remaining: white at 60%, turns red (#ef4444) when ≤ 5
- Cascade multiplier text: yellow-gold, large

### Typography
- System font stack
- Title: 64px bold
- Score: 44px bold
- Moves: 36px bold
- Cluster size preview: 48px bold
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

### Board: 2D Array
```javascript
this.grid = []; // grid[col][row] = { color, graphic, col, row }
// 8 cols × 10 rows
```

### Cluster Detection
```javascript
function getCluster(startCol, startRow) {
    const color = this.grid[startCol][startRow].color;
    const visited = new Set();
    const cluster = [];
    const stack = [{ col: startCol, row: startRow }];

    while (stack.length > 0) {
        const { col, row } = stack.pop();
        const key = `${col},${row}`;
        if (visited.has(key)) continue;
        if (col < 0 || col >= 8 || row < 0 || row >= 10) continue;
        if (!this.grid[col][row] || this.grid[col][row].color !== color) continue;

        visited.add(key);
        cluster.push({ col, row });

        stack.push({ col: col + 1, row });
        stack.push({ col: col - 1, row });
        stack.push({ col, row: row + 1 });
        stack.push({ col, row: row - 1 });
    }

    return cluster;
}
```

### Touch → Preview → Clear Flow
```javascript
let previewedCluster = null;

this.input.on('pointerdown', (pointer) => {
    const cell = this.getCellFromPointer(pointer);
    if (!cell) return;
    const cluster = this.getCluster(cell.col, cell.row);
    if (cluster.length >= 3) {
        previewedCluster = cluster;
        this.highlightCluster(cluster);
        this.showClusterSize(cluster);
    } else {
        previewedCluster = null;
        this.dimCell(cell); // Brief "nope"
    }
});

this.input.on('pointermove', (pointer) => {
    const cell = this.getCellFromPointer(pointer);
    if (!cell) { this.clearPreview(); previewedCluster = null; return; }
    const cluster = this.getCluster(cell.col, cell.row);
    if (cluster.length >= 3 && !this.sameCluster(cluster, previewedCluster)) {
        this.clearPreview();
        previewedCluster = cluster;
        this.highlightCluster(cluster);
        this.showClusterSize(cluster);
    }
});

this.input.on('pointerup', () => {
    if (previewedCluster && previewedCluster.length >= 3) {
        this.clearCluster(previewedCluster);
        this.moves--;
        this.checkBonusMoves(previewedCluster.length);
        // After clear animation completes: applyGravity → spawnNew → checkCascade
    }
    this.clearPreview();
    previewedCluster = null;
});
```

### Cascade Loop
```javascript
async function clearAndCascade(cluster, cascadeLevel = 1) {
    // Score
    const baseScore = cluster.length * (cluster.length - 1) * 5;
    const score = baseScore * cascadeLevel;
    this.score += score;
    this.showScorePopup(score, cluster, cascadeLevel);

    // Animate clear
    await this.animateClearCluster(cluster);

    // Gravity
    await this.applyGravity();

    // Spawn new pieces
    await this.spawnNewPieces();

    // Check for new clusters (auto-cascade)
    await this.delay(400); // Let player see the new board

    const newClusters = this.findAllClusters(); // Find all groups of 3+
    if (newClusters.length > 0) {
        // Clear the largest one (or all of them?)
        // Decision: clear ALL valid clusters simultaneously in a cascade step
        for (const c of newClusters) {
            await this.clearAndCascade(c, cascadeLevel + 1);
        }
    }
}
```

Note: clearing all cascade clusters simultaneously is simpler and more spectacular. Each cascade step clears everything available, then gravity drops everything, then check again.

### Viewport
```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
```
```css
html, body { margin:0; padding:0; overflow:hidden; touch-action:none; overscroll-behavior:none; position:fixed; width:100%; height:100%; }
```

---

## Definition of Done

1. Open on phone, tap to start, board appears with colored pieces
2. Touch a piece → its connected same-color cluster highlights with size number
3. Release → cluster clears with implosion animation and particles
4. Pieces fall, new ones spawn, cascades auto-trigger
5. Bigger clusters score exponentially more (you can feel the difference between tapping 3 vs tapping 8)
6. Move counter decreases. Game ends at 0.
7. High score persists
8. You find yourself staring at the board, finger hovering, thinking "if I tap THIS one, maybe those two groups merge into one big one..." — the hesitation IS the game

---

## Iteration Prompts

- "Clusters feel too small. Reduce colors from 5 to 4 to increase average cluster size."
- "30 moves is too [many/few]. Change to X."
- "I want the scoring to be even more exponential — change formula to pieces² × 5."
- "Cascade auto-clearing feels random. Show the cascade cluster highlighted for Xms before clearing so I can see what happened."
- "Add a 'shuffle' button that costs 2 moves but reshuffles the entire board."
- "I want a 'target score' mode — reach X points within Y moves to advance to the next level."
- "Add 'stone' pieces that can't be matched but fall with gravity. Clearing adjacent groups removes them."
- "I want the board to shake slightly when a 10+ cluster is cleared — sell the impact."
- "Show a 'biggest cluster' indicator that tracks my personal best cluster size across games."

---

## What NOT to Build Yet

- Special piece types (stones, bombs)
- Level progression / target score mode
- Shuffle button
- Themes / skins
- Sound
- Timed mode
- Analytics
