# SHATTER — Claude Code Build Brief

## What You're Building

A mobile-first breakout game called **SHATTER**. Single HTML file using Phaser 3 (loaded from CDN). Classic paddle-and-ball breakout, but with dense brick layouts divided by internal barriers (walls that don't break). The ball gets trapped in pockets, ricocheting and destroying everything within that section. Break through a gap into the next section and the chaos spreads. Extra balls spawn as you break bricks, turning the late game into a hypnotic multi-ball spectacle.

The satisfaction loop: aim your first shot, work the paddle, break into a pocket, watch the ball go berserk inside it, earn more balls, watch the whole field crumble. It's half skill, half ASMR.

---

## Technical Stack

- **Single file**: `index.html` containing everything
- **Phaser 3**: Load from CDN `https://cdn.jsdelivr.net/npm/phaser@3.80.1/dist/phaser.min.js`
- **No build tools, no npm, no bundler** — just one HTML file
- **Target**: Mobile Chrome/Safari, portrait orientation, touch input (paddle control)
- **Deploy target**: Cloudflare Pages

---

## Game Design Spec

### Core Loop
1. Player controls a paddle at the bottom of the screen
2. Ball launches upward into a dense field of bricks divided by barrier walls
3. Ball bounces off bricks (destroying them), barriers (permanent), walls, and paddle
4. Every 10 bricks destroyed, a new ball spawns
5. Clear all bricks to complete the level
6. Lose all balls (none left on screen, none in reserve) → die
7. New level generates a new, harder field layout

### The Field

Portrait orientation. The upper ~75% of the screen is the brick field. The lower ~25% is the paddle zone.

#### Bricks
- Small rectangles arranged in a grid
- Brick size: `fieldWidth / gridColumns` wide, 12-16px tall
- Grid: 10 columns × 15-20 rows (dense — the screen should feel packed)
- Not every cell has a brick — the layout is shaped by the generation algorithm
- **Brick HP**: Most bricks die in 1 hit. Some bricks take 2-3 hits (visually distinct — see colors). Higher HP bricks become more common in later levels.
- When destroyed: brief flash, then the brick shrinks to nothing over 80ms. Satisfying pop.

#### Barriers (The Key Feature)
- Barrier walls are lines/thin rectangles that divide the brick field into sections (pockets)
- Barriers do NOT break. The ball bounces off them like walls.
- Each barrier has **one or two small gaps** (1-2 brick widths wide). These gaps are how the ball eventually escapes from one pocket into the next.
- Barriers are primarily horizontal (dividing the field into horizontal bands), with occasional vertical barriers within a band (creating smaller sub-pockets).
- A ball trapped in a pocket bounces rapidly between the barrier, the surrounding bricks, and other barriers — destroying everything in that pocket. This is the satisfying part.
- When all bricks in a pocket are destroyed, the ball has nothing to bounce off except the barriers and must find the gap to escape into the next pocket.

#### Barrier Layout Generation
```
Level generation algorithm:

1. Fill the grid with bricks (full density minus random 5-10% empty cells for variety)

2. Place 2-4 horizontal barriers across the full width:
   - Evenly-ish spaced vertically (divide field height into sections)
   - Each barrier has 1-2 gaps, each gap 1-2 bricks wide
   - Gaps are placed randomly but never at the very edge (at least 2 cells from each side)
   - Adjacent barriers should not have gaps directly aligned vertically (force the ball to travel horizontally to find the next gap)

3. Optionally place 1-2 vertical barriers within larger pockets:
   - Span from one horizontal barrier to another (or to field edge)
   - Each has 1 gap
   - Creates sub-pockets that require even more precise ball routing

4. The bottom-most section (closest to the paddle) should have the widest gaps — easiest to break out of first. Upper sections have narrower gaps — harder to penetrate.

5. No pocket should be fully sealed (every pocket must be reachable via gap connections from the paddle zone). Validate this during generation.
```

#### Field Dimensions
- Field top: 5% from screen top (leave room for score)
- Field bottom: 25% from screen bottom (paddle zone)
- Field left/right: 2% margin from screen edges
- Bricks fill this space on the grid

### The Paddle
- Rectangle at the bottom of the screen
- Width: 70px (roughly 18-20% of screen width). Shrinks by 3px per level, minimum 45px.
- Height: 12px
- Position: fixed Y, roughly 85% down the screen (above the very bottom to leave space for thumb)
- **Touch control**: Paddle follows the player's finger X position. Touch anywhere on screen, paddle moves to that X. Smooth, no acceleration — direct 1:1 mapping with a slight smoothing lerp (0.3) so it doesn't jitter.
- Paddle cannot leave the screen (clamp to field edges)
- **Ball launch**: At the start of each level (and when a new ball spawns), the ball sits on the paddle. Tap to launch. Launch angle: slightly randomized between 70-110° (mostly upward, with slight left/right bias). The player can position the paddle before tapping to influence the general direction.

### The Ball(s)
- Small circle, radius 5px
- Starting speed: 4px/frame. Increases by 0.1 per level, max 6px/frame.
- Ball physics: simple reflection-based bouncing (angle of incidence = angle of reflection) against bricks, barriers, walls, and paddle
- **Paddle deflection angle**: The ball's horizontal direction after hitting the paddle depends on WHERE it hits. Center = straight up. Edge = sharp angle. This gives the player directional control.
  ```
  // On paddle hit:
  const hitPoint = (ball.x - paddle.x) / (paddle.width / 2); // -1 to 1
  const angle = hitPoint * 60; // ±60° from vertical
  // Convert to velocity
  ball.vx = Math.sin(angle * Math.PI / 180) * ball.speed;
  ball.vy = -Math.cos(angle * Math.PI / 180) * ball.speed;
  ```
- **Minimum vertical speed**: Ensure `|vy|` is always at least `speed * 0.3`. Prevents the ball from getting stuck bouncing horizontally forever.
- **Anti-stuck**: If the ball bounces more than 30 times without hitting a brick or the paddle, nudge its angle by 5° randomly. Prevents infinite loops in empty pockets.

### Multi-Ball System
- **Spawn trigger**: Every 10 bricks destroyed, a new ball spawns
- **Spawn location**: New ball appears on the paddle (if the paddle exists) and auto-launches after a 500ms delay. If the paddle is busy (another ball is sitting on it), the new ball spawns at the center of the field moving downward — the player must catch it with the paddle or it's lost.
- **Ball tracking**: Display active ball count on HUD
- **Ball loss**: A ball is lost when it falls below the paddle. If other balls remain active, the game continues. Only when ALL balls are gone does the player die.
- **Max simultaneous balls**: 8. Beyond that, new ball spawns are queued until a ball is lost. (Performance guard.)
- **Multi-ball feel**: Each ball is independent. They bounce off each other? No — balls pass through each other. Simpler physics, and it looks cooler when multiple balls are criss-crossing through the same pocket.

### Brick Destruction
- 1-hit bricks: Most common. One hit → destroyed.
- 2-hit bricks: Introduced at level 2. First hit cracks them (visual change), second hit destroys.
- 3-hit bricks: Introduced at level 4. Two visual stages before destruction.
- **Destruction animation**: Brick flashes white for 1 frame, then shrinks to center point over 80ms and disappears. Quick and punchy.
- **Particle burst**: On destroy, 3-4 tiny particles (same color as brick) fly outward briefly (150ms, fade). Subtle but satisfying, especially when many bricks break in rapid succession.
- **Hit sound substitute**: Since no audio in prototype, a very brief screen vibration on each brick break: `navigator.vibrate(8)`. At multi-ball speeds with rapid breaks, this creates a buzzing sensation. If it's too much, only vibrate on every 3rd break.
- **Brick break counter**: Internal counter tracks total bricks broken. Triggers multi-ball spawns.

### Barriers
- Visually distinct from bricks — they're metallic/permanent-looking
- Thickness: 4px (thicker than a brick border, thinner than a brick)
- Color: bright silver/steel (#8890a0) with a 1px highlight on top edge (#a0a8b8). Must read as "this doesn't break."
- Gap in barrier: simply an absence — the barrier line stops and restarts, with the gap visible as background color showing through
- Ball bounces off barriers identically to walls (perfect reflection)
- Barriers don't take damage, don't flash, don't react. They're architecture, not enemies.

### Walls (Screen Edges)
- Top wall: ball bounces off the top of the field
- Left/right walls: ball bounces off the side margins
- Bottom: NO wall. Ball falls past the paddle → ball lost.

### Level Progression
- **Level 1**: 2 horizontal barriers, wide gaps (2 brick widths), no vertical barriers, all 1-hit bricks. Learning the mechanic.
- **Level 2**: 3 horizontal barriers, mix of 1-wide and 2-wide gaps. 20% 2-hit bricks. One vertical barrier.
- **Level 3**: 3 horizontal barriers, mostly 1-wide gaps. 30% 2-hit bricks. Two vertical barriers.
- **Level 4**: 4 horizontal barriers. Introduce 3-hit bricks (10%). Gaps getting narrow. Two vertical barriers with sub-pockets.
- **Level 5+**: Max complexity. 4 horizontal barriers, 2-3 vertical barriers, narrow gaps, 40% multi-hit bricks. Ball speed increasing.
- Each level generates a fresh layout procedurally within these constraints.

### Scoring
- +1 per brick hit (not per brick destroyed — hits on multi-hit bricks still count)
- +5 bonus per pocket cleared (all bricks in a section destroyed)
- +50 bonus per level completed
- Multiplier: consecutive hits without the ball touching the paddle increase a multiplier (1×, 2×, 3×, max 5×). Resets when ball hits paddle. This rewards balls that get trapped in pockets and chain-destroy bricks — exactly the behavior we want to feel satisfying.
- Display score top-left, multiplier top-right (when >1×)
- High score in localStorage (`shatter-best`)

### Death
- Last ball falls below paddle
- All remaining bricks freeze in place
- Screen darkens
- "SHATTERED" text (or just score display)
- Show score, best, level reached
- Tap to retry from level 1

### Juice & Feel (This Is the Game)

The visual and haptic feedback is what makes breakout games go viral on Instagram. Every element below matters:

- **Brick destruction cascade**: When multiple bricks break in rapid succession (common when ball is trapped in a pocket), each break triggers particles. The screen fills with tiny colored particles flying everywhere. This is the spectacle.
- **Screen shake on pocket clear**: When all bricks in a barrier-enclosed section are destroyed, brief satisfying screen shake (4 frames, ±3px) and a flash of light from the now-empty pocket area.
- **Multiplier visual**: When multiplier is 3× or higher, the ball gets a trailing afterimage (3 copies, decreasing opacity). At 5×, the trail is longer (5 copies) and shifts color toward white. The ball looks like it's on fire.
- **Ball speed-up during combos**: While the multiplier is active, the ball moves 10% faster per multiplier level. Resets when hitting paddle. Makes trapped-ball sequences feel increasingly frantic.
- **Barrier gap glow**: The gaps in barriers have a very subtle glow/highlight (thin bright line along gap edges at 15% opacity). Helps the player (and spectators) understand the structure.
- **Multi-ball visual**: Each ball has a slightly different hue (shift by 30° on the color wheel per ball). When many balls are active, the field becomes a rainbow of bouncing dots. Visually spectacular.
- **Brick color variety**: Bricks should be colorful. Each row or section has a different color from a warm-to-cool gradient (bottom rows warm/red, top rows cool/blue). Creates visual structure and makes the destruction pattern visible — you can see which areas are cleared by the color gaps.
- **Impact flash**: On each brick hit, the brick flashes full white for 1 frame before the destruction animation. Even for multi-hit bricks, the flash confirms the hit.
- **Paddle catch glow**: When the ball hits the paddle, brief white flash on the paddle surface (50ms). Confirms the save.
- **Vibration pattern**: 
  - Brick hit: `navigator.vibrate(8)` (only every 3rd hit to prevent buzz overload)
  - Pocket clear: `navigator.vibrate(40)`
  - Ball lost: `navigator.vibrate(80)`
  - Death: `navigator.vibrate([60, 40, 60])`
  - Multi-ball spawn: `navigator.vibrate(20)`

---

## UI Spec

### Layout (Portrait, Mobile)
- Full viewport canvas, `Phaser.Scale.RESIZE`
- Upper 75%: brick field (including barriers)
- Lower 25%: paddle zone (open space for the ball to travel and the paddle to move)
- Score HUD overlaid at the very top

### Start Screen
- Title "SHATTER" — large, centered, bold
- Animated preview: a ball bouncing inside a small pocket of bricks, destroying them one by one (looping demo built from game objects)
- "touch to control paddle · break all bricks" instruction
- "tap to start" pulsing

### Death Screen
- Semi-transparent dark overlay
- "Score: X"
- "Best: Y"
- "Level reached: Z"
- "NEW BEST" flash if applicable
- "tap to retry" pulsing
- Tap → restart from level 1

### Level Complete Transition
- All remaining particles settle
- "LEVEL X CLEAR" text, large, centered, fades in
- "+50" score bonus floats up
- 1 second pause
- New level generates, ball resets on paddle
- Field builds in: bricks appear row by row from top to bottom over 400ms (visual treat, shows the player the new layout)

### HUD During Gameplay
- Score: top-left, 36px, white at 40% opacity
- Multiplier (when >1×): top-right, 36px, yellow-gold, pulsing slightly when 3×+
- Ball count: bottom-left, small, "×3" style indicator showing active balls
- Level: top-center, 20px, white at 25% opacity, "LVL 2"
- Bricks remaining: not shown (clutters HUD — the player can see the field)

### Colors
- Background: very dark (#080810)
- Paddle: clean white (#e8e8f0) with subtle top highlight
- Ball(s): bright white (#ffffff) as base, shifted per ball when multi-ball active
- **Brick colors** (gradient by row, top to bottom):
  - Top rows: cool blue (#3b82f6)
  - Upper-mid: teal (#14b8a6)
  - Mid: green (#22c55e)
  - Lower-mid: yellow (#eab308)
  - Bottom rows: warm orange-red (#ef4444)
  - Multi-hit bricks: same base color but with visible border rings (2-hit: 1 ring, 3-hit: 2 rings) to indicate toughness
  - Cracked state (after first hit on multi-hit): hairline crack pattern drawn across the brick (2-3 lines, darker version of brick color)
- **Barriers**: silver-steel (#8890a0) with bright top edge (#a0a8b8). Distinct from bricks.
- **Barrier gaps**: background color shows through, with subtle bright edge highlight (#ffffff at 12%)
- Field margins: barely visible border (#151520)
- Particles: same color as the destroyed brick
- Score: white at 40%
- Multiplier: gold (#ffd700) when active
- Level complete text: white

### Typography
- System font stack: `-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`
- Title: 72px bold
- Score: 36px bold
- Multiplier: 36px bold
- Level indicator: 20px
- Death screen: 36px
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
    backgroundColor: '#080810',
    scene: [GameScene],
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false,
            checkCollision: {
                up: true, left: true, right: true, down: false // Bottom is open
            }
        }
    }
};
```

### Custom Ball Physics (Not Arcade)
Arcade physics can work for basic collision, but for tight breakout-style bouncing with reliable reflections, manual ball movement is more predictable:

```javascript
// Ball structure
const ball = {
    x: 0, y: 0,
    vx: 0, vy: 0,
    speed: 4,
    radius: 5,
    graphic: null, // Phaser Arc or Circle
    active: true,
    multiplierHits: 0 // Hits since last paddle contact
};

// In update() — move ball manually each frame
function updateBall(ball, delta) {
    ball.x += ball.vx;
    ball.y += ball.vy;

    // Wall reflections
    const fieldLeft = FIELD_MARGIN;
    const fieldRight = screenWidth - FIELD_MARGIN;
    const fieldTop = FIELD_TOP;

    if (ball.x - ball.radius < fieldLeft) {
        ball.x = fieldLeft + ball.radius;
        ball.vx = Math.abs(ball.vx);
    }
    if (ball.x + ball.radius > fieldRight) {
        ball.x = fieldRight - ball.radius;
        ball.vx = -Math.abs(ball.vx);
    }
    if (ball.y - ball.radius < fieldTop) {
        ball.y = fieldTop + ball.radius;
        ball.vy = Math.abs(ball.vy);
    }

    // Bottom — ball lost
    if (ball.y > screenHeight + ball.radius) {
        ball.active = false;
        return;
    }

    // Paddle collision
    if (ball.vy > 0 && ballHitsPaddle(ball)) {
        reflectOffPaddle(ball);
        ball.multiplierHits = 0; // Reset multiplier
    }

    // Brick collisions
    checkBrickCollisions(ball);

    // Barrier collisions
    checkBarrierCollisions(ball);

    // Enforce minimum vertical speed
    if (Math.abs(ball.vy) < ball.speed * 0.3) {
        ball.vy = ball.vy > 0 ? ball.speed * 0.3 : -ball.speed * 0.3;
    }
}
```

### Brick Collision
```javascript
function checkBrickCollisions(ball) {
    for (const brick of activeBricks) {
        if (!brick.alive) continue;

        // AABB vs circle collision
        const closestX = Phaser.Math.Clamp(ball.x, brick.x, brick.x + brick.width);
        const closestY = Phaser.Math.Clamp(ball.y, brick.y, brick.y + brick.height);
        const distX = ball.x - closestX;
        const distY = ball.y - closestY;

        if (distX * distX + distY * distY < ball.radius * ball.radius) {
            // Determine reflection direction
            const overlapX = ball.radius - Math.abs(distX);
            const overlapY = ball.radius - Math.abs(distY);

            if (overlapX < overlapY) {
                ball.vx = -ball.vx;
            } else {
                ball.vy = -ball.vy;
            }

            // Damage brick
            brick.hp--;
            ball.multiplierHits++;
            if (brick.hp <= 0) {
                destroyBrick(brick);
                bricksDestroyed++;
                checkMultiBallSpawn();
                checkPocketClear(brick.pocket);
            } else {
                crackBrick(brick);
            }

            // Score
            const multiplier = Math.min(Math.floor(ball.multiplierHits / 5) + 1, 5);
            score += 1 * multiplier;

            // Only process one brick collision per frame per ball
            return;
        }
    }
}
```

### Barrier Collision
```javascript
function checkBarrierCollisions(ball) {
    for (const barrier of barriers) {
        // Each barrier is a thin rectangle (or set of segments with gaps)
        for (const segment of barrier.segments) {
            const closestX = Phaser.Math.Clamp(ball.x, segment.x, segment.x + segment.width);
            const closestY = Phaser.Math.Clamp(ball.y, segment.y, segment.y + segment.height);
            const distX = ball.x - closestX;
            const distY = ball.y - closestY;

            if (distX * distX + distY * distY < ball.radius * ball.radius) {
                // Reflect based on barrier orientation
                if (barrier.orientation === 'horizontal') {
                    ball.vy = -ball.vy;
                    // Push ball out of barrier
                    ball.y += ball.vy > 0 ? ball.radius : -ball.radius;
                } else {
                    ball.vx = -ball.vx;
                    ball.x += ball.vx > 0 ? ball.radius : -ball.radius;
                }
                return; // One barrier collision per frame
            }
        }
    }
}
```

### Level Generation
```javascript
function generateLevel(levelNum) {
    const bricks = [];
    const barriers = [];
    const gridCols = 10;
    const gridRows = Math.min(15 + levelNum, 22);
    const brickWidth = fieldWidth / gridCols;
    const brickHeight = 14;

    // 1. Decide barrier count and positions
    const barrierCount = Math.min(2 + Math.floor(levelNum / 2), 5);
    const sectionHeight = gridRows / (barrierCount + 1);

    const barrierRows = [];
    for (let i = 1; i <= barrierCount; i++) {
        barrierRows.push(Math.round(sectionHeight * i));
    }

    // 2. Create barriers with gaps
    let lastGapCol = -1;
    for (const row of barrierRows) {
        const gapCount = levelNum <= 2 ? 2 : 1;
        const gapWidth = levelNum <= 2 ? 2 : Math.max(1, 2 - Math.floor(levelNum / 4));
        const gaps = [];

        for (let g = 0; g < gapCount; g++) {
            let gapCol;
            do {
                gapCol = Phaser.Math.Between(2, gridCols - 2 - gapWidth);
            } while (lastGapCol >= 0 && Math.abs(gapCol - lastGapCol) < 2);
            gaps.push({ col: gapCol, width: gapWidth });
            lastGapCol = gapCol;
        }

        // Create barrier segments (full width minus gaps)
        const segments = createBarrierSegments(row, gaps, gridCols, brickWidth, brickHeight);
        barriers.push({
            row: row,
            orientation: 'horizontal',
            segments: segments,
            gaps: gaps
        });
    }

    // 3. Optionally add vertical barriers within pockets
    if (levelNum >= 2) {
        const vertCount = Math.min(Math.floor(levelNum / 2), 3);
        for (let v = 0; v < vertCount; v++) {
            // Pick a pocket (section between two horizontal barriers)
            // Place a vertical barrier with one gap
            // ... (similar to horizontal but rotated)
        }
    }

    // 4. Fill grid with bricks, leaving barrier rows empty
    for (let row = 0; row < gridRows; row++) {
        if (barrierRows.includes(row)) continue; // Don't place bricks on barrier rows

        for (let col = 0; col < gridCols; col++) {
            // Random empty cells (5-10%)
            if (Math.random() < 0.07) continue;

            // Determine HP
            let hp = 1;
            if (levelNum >= 2 && Math.random() < 0.2) hp = 2;
            if (levelNum >= 4 && Math.random() < 0.1) hp = 3;

            // Determine which pocket this brick belongs to
            const pocket = getPocketForRow(row, barrierRows);

            bricks.push({
                x: FIELD_LEFT + col * brickWidth,
                y: FIELD_TOP + row * brickHeight,
                width: brickWidth - 2, // 1px gap between bricks
                height: brickHeight - 2,
                hp: hp,
                maxHp: hp,
                alive: true,
                pocket: pocket,
                row: row,
                col: col,
                color: getColorForRow(row, gridRows)
            });
        }
    }

    // 5. Assign pocket IDs and validate connectivity
    // Every pocket must be reachable from the paddle zone via connected gaps
    validatePocketConnectivity(barriers);

    return { bricks, barriers };
}
```

### Brick Color Gradient
```javascript
function getColorForRow(row, totalRows) {
    // Gradient from warm (bottom) to cool (top)
    const colors = [
        0xef4444, // red
        0xf97316, // orange
        0xeab308, // yellow
        0x22c55e, // green
        0x14b8a6, // teal
        0x3b82f6, // blue
        0x8b5cf6, // violet
    ];
    const index = Math.floor((row / totalRows) * colors.length);
    return colors[Phaser.Math.Clamp(index, 0, colors.length - 1)];
}
```

### Multi-Ball Spawn
```javascript
let totalBricksDestroyed = 0;
let nextBallThreshold = 10;
const MAX_ACTIVE_BALLS = 8;

function checkMultiBallSpawn() {
    totalBricksDestroyed++;
    if (totalBricksDestroyed >= nextBallThreshold) {
        nextBallThreshold += 10;

        if (activeBalls.length < MAX_ACTIVE_BALLS) {
            spawnNewBall();
        }
    }
}

function spawnNewBall() {
    const ball = createBall();

    // If paddle is free, place ball on paddle
    if (!ballOnPaddle) {
        ball.x = paddle.x + paddle.width / 2;
        ball.y = paddle.y - ball.radius - 2;
        ball.vx = 0;
        ball.vy = 0;
        ballOnPaddle = ball;

        // Auto-launch after 500ms
        setTimeout(() => {
            if (ballOnPaddle === ball) {
                launchBall(ball);
            }
        }, 500);
    } else {
        // Spawn in center field, moving downward
        ball.x = screenWidth / 2;
        ball.y = FIELD_TOP + fieldHeight / 2;
        const angle = Phaser.Math.Between(60, 120) * Math.PI / 180;
        ball.vx = Math.sin(angle) * ball.speed * (Math.random() > 0.5 ? 1 : -1);
        ball.vy = Math.cos(angle) * ball.speed; // Moving downward
    }

    activeBalls.push(ball);
}
```

### Paddle Touch Control
```javascript
this.input.on('pointermove', (pointer) => {
    if (!pointer.isDown) return;
    // Smooth follow
    const targetX = pointer.x - paddle.width / 2;
    paddle.x = Phaser.Math.Linear(paddle.x, targetX, 0.3);
    paddle.x = Phaser.Math.Clamp(paddle.x, FIELD_LEFT, FIELD_RIGHT - paddle.width);
});

this.input.on('pointerdown', (pointer) => {
    // Launch ball if one is sitting on paddle
    if (ballOnPaddle) {
        launchBall(ballOnPaddle);
        ballOnPaddle = null;
    }
    // Also start paddle tracking
    const targetX = pointer.x - paddle.width / 2;
    paddle.x = targetX;
    paddle.x = Phaser.Math.Clamp(paddle.x, FIELD_LEFT, FIELD_RIGHT - paddle.width);
});
```

### Pocket Clear Detection
```javascript
function checkPocketClear(pocketId) {
    const pocketBricks = activeBricks.filter(b => b.pocket === pocketId && b.alive);
    if (pocketBricks.length === 0) {
        // Pocket cleared!
        score += 5;
        screenShake(4, 3);
        flashPocketArea(pocketId);
        navigator.vibrate && navigator.vibrate(40);
    }
}
```

### Anti-Stuck Mechanism
```javascript
// Track consecutive bounces without hitting a brick or paddle
let bouncesWithoutHit = 0;

// In wall/barrier reflection code:
bouncesWithoutHit++;
if (bouncesWithoutHit > 30) {
    // Nudge angle
    const nudge = (Math.random() - 0.5) * 0.2; // Small random angle change
    const currentAngle = Math.atan2(ball.vy, ball.vx);
    const newAngle = currentAngle + nudge;
    ball.vx = Math.cos(newAngle) * ball.speed;
    ball.vy = Math.sin(newAngle) * ball.speed;
    bouncesWithoutHit = 0;
}

// Reset on brick or paddle hit:
bouncesWithoutHit = 0;
```

### Viewport Meta Tag
```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
```
```css
html, body {
    margin: 0;
    padding: 0;
    overflow: hidden;
    touch-action: none;
    overscroll-behavior: none;
    position: fixed;
    width: 100%;
    height: 100%;
}
```

### Performance Considerations
This game can have a lot of moving objects simultaneously: up to 8 balls, 150+ bricks, dozens of particles. Optimization matters:
- **Brick rendering**: Use a single Graphics object or RenderTexture for all bricks. Only redraw when a brick state changes (destroyed or cracked). Don't redraw every frame.
- **Particle management**: Set a hard cap of 50 simultaneous particles. Reuse/pool particle objects. Each particle lives max 200ms.
- **Collision optimization**: Only check ball-brick collisions for bricks in the ball's current grid region (spatial hashing). Don't check every ball against every brick every frame.
- **Ball updates**: Manual position updates are cheap. 8 balls is fine.
- **Render order**: Background → grid → barriers → bricks → balls → particles → HUD. Use Phaser depth sorting.
- Target 30fps minimum with 8 balls and full particle effects on mid-range phone.

---

## Definition of Done

1. You can open it on your phone and play immediately
2. Paddle follows your finger smoothly
3. Ball bounces correctly off paddle, bricks, barriers, and walls
4. Bricks break with satisfying visual pop and particles
5. Barriers don't break and divide the field into visible pockets
6. Ball gets trapped in pockets and destroys everything inside (this is the moment)
7. Gaps in barriers allow the ball to escape to new sections
8. New balls spawn every 10 bricks, up to 8 active
9. Multi-hit bricks show visual damage states
10. Clearing all bricks advances to a harder level
11. High score persists
12. You catch yourself just watching the balls bounce around a pocket, not even moving the paddle, and smiling

That last one is the Instagram test. If the trapped-ball-in-a-pocket sequence is visually satisfying enough that you'd show someone the screen, the game works.

---

## Iteration Prompts

- "The ball feels too [fast/slow]. Change base speed to X and per-level increment to Y."
- "Paddle is too [wide/narrow]. Change starting width to Xpx and per-level shrink to Ypx."
- "Barrier gaps are too [easy/hard] to thread. Change gap width to X bricks at level Y."
- "Multi-ball spawning is too [fast/slow]. Change threshold to every X bricks."
- "I want power-ups dropping from destroyed bricks — wider paddle, fireball (breaks through barriers for 5 seconds), slow motion, extra ball."
- "Add a 'mega ball' power-up that's 3× normal size and breaks through 2-hit bricks in one hit."
- "The pocket clear animation isn't dramatic enough. Add a shockwave ring that expands from the pocket center."
- "I want the multiplier to trigger visual changes: at 3× the background subtly pulses, at 5× screen edges glow."
- "Add pre-designed puzzle levels that I can hand-craft alongside the procedural ones."
- "I want a 'sandbox mode' where the ball never falls — just infinite bouncing for the ASMR satisfaction."
- "Let the player draw barrier placements before the level starts (player-designed puzzles)."
- "Add brick types: explosive bricks (destroy all adjacent bricks), steel bricks (indestructible, like barriers but single-cell)."
- "Performance is bad with 8 balls. Reduce max balls to X, batch render particles, optimize collision checks."
- "I want the camera to briefly zoom into a pocket when a ball enters it for the first time — then zoom back out."
- "Add a combo counter that shows rapid-fire numbers as bricks break: '12... 13... 14...' floating near the action."

---

## Future Layout Modes (Not V1)

### Pre-Designed Puzzle Levels
- Hand-crafted barrier and brick layouts with specific solutions
- Could be loaded from a JSON level file
- Mix into the procedural rotation (every 3rd level is a designed puzzle)

### Player-Placed Barriers
- Before the level starts, the player gets 2-3 barrier pieces to place on the field
- Drag and drop, snap to grid
- Strategic: place barriers to create pockets that maximize chain reactions
- Launch ball after placement

Both of these can be added as modes alongside the procedural generation once the core game is proven fun.

---

## What NOT to Build Yet

- Power-ups
- Sound effects / music
- Puzzle levels (hand-designed)
- Player-placed barriers
- Sandbox/zen mode
- Explosive or special brick types
- Camera zoom effects
- Combo counter display
- Level select
- Social sharing
- Analytics
- Landscape support

The only question: **does the ball-trapped-in-a-pocket moment feel satisfying?** When the ball squeezes through a barrier gap and starts ricocheting wildly inside a dense pocket of bricks, destroying them rapidly — if that visual makes you lean in and watch — the game works. The paddle, the scoring, the progression are all scaffolding around that one moment of spectacle.
