# HOP — Claude Code Build Brief

## What You're Building

A mobile-first lane-hopping game called **HOP**. Single HTML file using Phaser 3 (loaded from CDN). Classic Frogger mechanics stripped to their essence: you're a square at the bottom of the screen. Tap to hop one lane forward. Lanes have obstacles sliding across at different speeds and directions. Reach the top to score. Get hit and you're dead.

Abstract visual language — no frogs, no cars, no logs. Colored shapes on a dark grid. The theme and characters come later. Right now we're testing whether the hop timing and lane reading feel right.

---

## Technical Stack

- **Single file**: `index.html` containing everything
- **Phaser 3**: Load from CDN `https://cdn.jsdelivr.net/npm/phaser@3.80.1/dist/phaser.min.js`
- **No build tools, no npm, no bundler** — just one HTML file
- **Target**: Mobile Chrome/Safari, portrait orientation, tap/swipe input
- **Deploy target**: Cloudflare Pages

---

## Game Design Spec

### Core Loop
1. Player square sits in a safe zone at the bottom of the screen
2. Above: rows of lanes, each with obstacles (rectangles) sliding left or right
3. Tap the top half of the screen to hop forward one lane
4. Tap the bottom half to hop backward one lane
5. Swipe left/right to sidestep within a lane
6. Reach the safe zone at the top → score +1 → field resets with harder lanes → player starts at bottom again
7. Get hit by an obstacle → die

### The Field
- Portrait orientation. The screen is divided into a grid.
- **Lane structure** (bottom to top):
  - **Safe zone** (bottom): 1 row. Player starts here. No obstacles. Colored slightly differently.
  - **Obstacle lanes**: 5 lanes at start. Each lane is one row tall.
  - **Rest lane** (middle): 1 safe row halfway through. No obstacles. Brief respite. Only appears when total lanes ≥ 8.
  - **More obstacle lanes**: Additional lanes above the rest point.
  - **Goal zone** (top): 1 row. Reaching this scores a point.
- **Row height**: Calculate dynamically: `screenHeight / (totalLanes + 2)`. The +2 accounts for the start and goal zones. Aim for roughly 50-60px per row on a typical phone.
- **Grid columns**: The horizontal space is divided into a grid of columns, each as wide as a row is tall (square cells). Roughly 6-8 columns depending on phone width. The player snaps to column positions when sidestepping.
- Total lanes increases with each successful crossing: start at 5, add 1 per crossing, max 10.

### The Player
- Square shape, sized to fit one grid cell (minus 6px padding so it doesn't touch the edges)
- Color: bright white (#f0f0f0) with a subtle inner border
- Starts centered horizontally in the bottom safe zone
- **Hop animation**: The player doesn't teleport between lanes. It hops — a quick tween (120ms) with a slight vertical arc (rise 8px at midpoint then land). Think of the original Frogger hop. This arc is what makes it feel like hopping rather than sliding.
- **Sidestep animation**: Horizontal tween, 100ms, no arc. Snappy lateral slide.
- **Cannot move while a hop/sidestep is in progress** — inputs during animation are queued (max 1 queued input). This prevents spam-tapping through lanes, which would remove all the timing skill.
- **Squash on land**: Brief squash-stretch when landing (scale Y 0.8, scale X 1.2, settle back over 80ms). Sells the physical hop.

### Input
- **Tap top half of screen**: Hop forward (up one lane)
- **Tap bottom half of screen**: Hop backward (down one lane)
- **Swipe left**: Sidestep left one column
- **Swipe right**: Sidestep right one column
- Swipe detection: pointer moves > 30px horizontally with < 15px vertical movement within 200ms = swipe. Everything else = tap.
- **Cannot hop backward from the starting safe zone** (already at bottom)
- **Cannot hop forward from the goal zone** (you've already scored — this triggers the crossing completion)
- No diagonal movement. Grid-locked. Horizontal OR vertical, never both simultaneously.

### Obstacle Lanes
Each lane has:
- **Direction**: Left-to-right or right-to-left. Alternates by default (lane 1 goes right, lane 2 goes left, etc.)
- **Speed**: Varies per lane. Range: 1-4 px/frame. Different lanes have different speeds.
- **Obstacle density**: How many obstacles are in the lane and how they're spaced
- **Obstacle width**: 1-3 grid cells wide. Wider obstacles are harder to time around.

#### Two Lane Types

**Danger lanes** (equivalent to Frogger's road):
- Obstacles slide across. Gaps between obstacles.
- Getting hit by an obstacle = death.
- The player stands in the lane between obstacles, timing their entry and exit.
- Obstacles wrap around — when one exits the right edge, it reappears on the left (and vice versa). Continuous stream.

**Ride lanes** (equivalent to Frogger's river):
- Moving platforms slide across. Gaps between platforms are deadly void.
- The player MUST be standing on a platform to survive. Standing in the gap = death.
- When standing on a platform, the player moves with it (carried along).
- If a platform carries the player off-screen, the player wraps with it (appears on the opposite side). This matches Frogger behavior and prevents unavoidable deaths.
- Ride lanes are visually distinct from danger lanes (see colors).

#### Lane Configuration Per Crossing

Crossing 1 (5 lanes): All danger lanes. Slow speeds (1-2px/frame). Wide gaps. Tutorial feel.

Crossing 2 (6 lanes): All danger lanes. Slightly faster. Narrower gaps.

Crossing 3 (7 lanes): Introduce 2 ride lanes in the mix. Player must learn to hop onto moving platforms.

Crossing 4 (8 lanes): Rest lane appears in the middle. Mix of danger and ride lanes. Moderate speeds.

Crossing 5+ (9-10 lanes): Full mix. Higher speeds. Narrower gaps/platforms. The real challenge.

Lane configurations should be procedurally generated within these constraints, not hand-designed.

#### Lane Generation
```
For each lane:
1. Pick type: danger or ride (weighted by crossing number)
2. Pick direction: alternating, with occasional doubles for surprise
3. Pick speed: Phaser.Math.Between(minSpeed, maxSpeed) based on crossing number
4. Pick obstacle count and spacing:
   - Danger lane: 2-4 obstacles, evenly-ish spaced with gaps of 2-4 cells
   - Ride lane: 2-3 platforms, each 2-4 cells wide, with gaps of 1-3 cells
5. Pick obstacle width: 1-3 cells for danger, 2-4 cells for ride
```

### Collision / Death

**Danger lane hit detection**:
- Each frame, check if the player's grid cell overlaps with any obstacle's current position in the same lane
- Use rectangular overlap: player bounds vs obstacle bounds
- Forgiveness: shrink the player's hitbox by 4px on each side. Close calls should survive.

**Ride lane void detection**:
- Each frame, if the player is in a ride lane, check if the player's position overlaps with ANY platform in that lane
- If NOT overlapping any platform → death (fell into the void)
- Forgiveness: expand the platform hitbox by 4px on each side. Landing near the edge should count.
- Check is only active 50ms after landing in the ride lane (grace period for the hop transition)

**Carried by platform**:
- When the player is on a ride lane platform, add the platform's velocity to the player's position each frame
- If carried to screen edge: wrap player to opposite side (same as the platform wrapping)

### Death Sequence
- Player flashes red, brief flatten animation (scale Y to 0.2 over 100ms) for danger lane hits
- Player fades down and shrinks for ride lane falls (sinks into the void, 200ms)
- Screen shake (3 frames, ±2px)
- 200ms pause
- Dark overlay with score
- Tap to retry

### Scoring
- +1 per successful crossing (reaching the goal zone)
- Display top-center, semi-transparent
- High score in localStorage (`hop-best`)
- Current crossing number also shown (e.g., "Crossing 4") — gives context for progression

### Difficulty Curve
Driven by crossing number:
- **Crossing 1-2**: Slow, all danger lanes, wide gaps. Player learns hop timing.
- **Crossing 3-4**: Ride lanes introduced. Player learns platform hopping.
- **Crossing 5-6**: Mix of both, rest lane in the middle, moderate speed.
- **Crossing 7-9**: Speeds increasing, gaps tightening, more ride lanes.
- **Crossing 10+**: Max lanes (10), high speeds, tight spacing. Expert territory.

Speed range per crossing: `minSpeed = 1 + crossing * 0.15`, `maxSpeed = 2 + crossing * 0.2`, capped at min 1 max 4.

### Juice & Feel
- **Hop arc**: The slight vertical rise during the forward hop is essential. Without it, movement feels like a grid slide, not a hop. The 8px rise + 120ms duration should feel bouncy and deliberate.
- **Landing squash**: Brief squash-stretch on every landing. Makes each hop feel weighty.
- **Lane entry flash**: When the player enters a new lane, the lane briefly brightens by 5% for 100ms. Confirms you've moved.
- **Near miss (danger lane)**: If an obstacle passes within 6px of the player without hitting, brief white flash on the player outline. `navigator.vibrate(25)`.
- **Platform stick**: When landing on a ride lane platform, a tiny "connection" visual — brief circle pulse at the player's feet. Confirms you're locked onto the platform.
- **Crossing completion**: When reaching the goal zone:
  - Brief celebration: player pulses scale 1.0 → 1.3 → 1.0
  - Score "+1" floats up from player position
  - All lanes briefly flash and then reconfigure (new layout slides in from the top over 300ms, or instant reset with a brief white flash transition)
  - 500ms pause before new crossing starts (player placed back at bottom)
- **Obstacle shadows**: Each obstacle has a small shadow beneath it (3px offset down, 20% opacity dark). Adds depth without cluttering.
- **Urgency**: Optional — after 15 seconds in a crossing, the bottom safe zone starts slowly shrinking upward (1px/second), gently pushing the player to commit. Prevents camping.
- **Vibration**: `navigator.vibrate(15)` on each hop. `navigator.vibrate([50, 30, 50])` on death.

---

## UI Spec

### Layout (Portrait, Mobile)
- Full viewport canvas, `Phaser.Scale.RESIZE`
- Game field fills the screen — no dead space
- Grid is the visual framework: faint cell outlines define the play space

### Grid Visual
- Cell borders: very faint (#151525 at 10% opacity), 1px
- Gives the player spatial awareness of the grid without being distracting
- Safe zones (start and goal): slightly different background color from the lanes
- Rest lane: same safe color as start/goal zones

### Start Screen
- Title "HOP" — large, centered, bold
- Animated preview: a square hopping through a few lanes (looping, built from game objects)
- "tap to hop · swipe to sidestep" instruction
- "tap to start" pulsing
- On tap → first crossing begins

### Death/Retry Screen
- Semi-transparent dark overlay
- "Crossings: X" (score)
- "Best: Y" if applicable
- "NEW BEST" flash
- "Died on crossing Z" — tells you how far into the current attempt you got
- "tap to retry" pulsing
- Tap → instant restart at crossing 1

### HUD During Gameplay
- Score (crossings completed): top-center, 44px, white at 30% opacity
- Current crossing number: top-right, smaller, 20px, white at 20% opacity (e.g., "C4")
- Nothing else. The grid IS the interface.

### Colors
- Background: very dark (#0a0a14)
- Grid lines: (#151525) at 10% opacity
- Safe zones (start, goal, rest): (#0d1a0d) — very slightly green-tinted dark. Subtle "safe" feeling.
- **Danger lanes background**: (#120a0a) — very slightly red-tinted dark. Subtle threat.
- **Ride lanes background**: (#0a0a16) — very slightly blue-tinted dark. Subtle "water" energy without literally being water.
- **Danger lane obstacles**: Warm red-orange (#d94040) — reads as "threat" instantly
- **Ride lane platforms**: Cool blue (#3070c0) — reads as "safe to stand on"
- **Ride lane gaps (void)**: The ride lane background itself, which is darker/bluer — absence of platform = danger
- Player: bright white (#f0f0f0) — maximum contrast against all lane types
- Player on ride platform: player gets a very subtle blue tint (#d8d8f0) while riding — visual confirmation of platform connection
- Score text: white, 30% opacity
- Crossing completion flash: white
- Near miss flash: white outline on player

### Typography
- System font stack: `-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`
- Title: 72px bold
- Score: 44px bold
- Crossing indicator: 20px
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
    backgroundColor: '#0a0a14',
    scene: [GameScene],
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false
        }
    }
};
```

### Grid Calculation
```javascript
calculateGrid() {
    const totalRows = this.laneCount + 2; // +2 for start and goal zones
    if (this.hasRestLane) totalRows++; // +1 for rest lane

    this.cellSize = Math.floor(this.scale.height / totalRows);
    this.columns = Math.floor(this.scale.width / this.cellSize);

    // Center the grid if screen width isn't perfectly divisible
    this.gridOffsetX = (this.scale.width - this.columns * this.cellSize) / 2;

    // Player size
    this.playerSize = this.cellSize - 6; // 3px padding each side
}
```

### Player Movement
```javascript
// Player state
this.playerRow = 0;    // 0 = start zone, increases upward
this.playerCol = Math.floor(this.columns / 2); // Start centered
this.isMoving = false;
this.queuedInput = null;

hopForward() {
    if (this.isMoving) {
        this.queuedInput = 'forward';
        return;
    }
    if (this.playerRow >= this.totalRows - 1) return; // Already at goal

    this.isMoving = true;
    this.playerRow++;

    const targetY = this.getRowY(this.playerRow);
    const currentX = this.player.x;

    // Hop arc tween
    this.tweens.add({
        targets: this.player,
        y: targetY,
        duration: 120,
        ease: 'Sine.easeOut',
        onUpdate: (tween) => {
            // Add arc: peak at 50% progress
            const progress = tween.progress;
            const arc = Math.sin(progress * Math.PI) * 8;
            this.player.y = targetY + (this.getRowY(this.playerRow - 1) - targetY) * (1 - progress) - arc;
        },
        onComplete: () => {
            this.player.y = targetY;
            this.landingSquash();
            this.isMoving = false;
            this.checkLaneState(); // Check if in danger or on ride platform
            this.processQueue();
        }
    });
}

hopBackward() {
    if (this.isMoving) {
        this.queuedInput = 'backward';
        return;
    }
    if (this.playerRow <= 0) return; // Already at start

    this.isMoving = true;
    this.playerRow--;

    // Same tween pattern as hopForward, but direction reversed
    // ... (similar to above)
}

sidestep(direction) { // direction: -1 (left) or 1 (right)
    if (this.isMoving) {
        this.queuedInput = direction > 0 ? 'right' : 'left';
        return;
    }
    const newCol = this.playerCol + direction;
    if (newCol < 0 || newCol >= this.columns) return; // Can't leave grid

    this.isMoving = true;
    this.playerCol = newCol;

    this.tweens.add({
        targets: this.player,
        x: this.getColX(this.playerCol),
        duration: 100,
        ease: 'Power2',
        onComplete: () => {
            this.isMoving = false;
            this.processQueue();
        }
    });
}

processQueue() {
    if (!this.queuedInput) return;
    const input = this.queuedInput;
    this.queuedInput = null;
    switch (input) {
        case 'forward': this.hopForward(); break;
        case 'backward': this.hopBackward(); break;
        case 'left': this.sidestep(-1); break;
        case 'right': this.sidestep(1); break;
    }
}
```

### Input Detection
```javascript
let pointerDownPos = null;
let pointerDownTime = 0;

this.input.on('pointerdown', (pointer) => {
    pointerDownPos = { x: pointer.x, y: pointer.y };
    pointerDownTime = Date.now();
});

this.input.on('pointerup', (pointer) => {
    if (!pointerDownPos) return;

    const dx = pointer.x - pointerDownPos.x;
    const dy = pointer.y - pointerDownPos.y;
    const elapsed = Date.now() - pointerDownTime;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    if (absDx > 30 && absDy < 15 && elapsed < 200) {
        // Swipe detected
        this.sidestep(dx > 0 ? 1 : -1);
    } else {
        // Tap detected — check which half of screen
        if (pointer.y < this.scale.height * 0.5) {
            this.hopForward();
        } else {
            this.hopBackward();
        }
    }

    pointerDownPos = null;
});
```

### Obstacle / Platform Management
```javascript
class Lane {
    constructor(scene, rowIndex, config) {
        this.scene = scene;
        this.rowIndex = rowIndex;
        this.type = config.type;       // 'danger' or 'ride'
        this.direction = config.direction; // 1 (right) or -1 (left)
        this.speed = config.speed;     // px per frame
        this.obstacles = [];           // Array of { x, width, graphic }
    }

    generate(cellSize, screenWidth, columns) {
        // Create obstacles/platforms based on type
        const count = this.type === 'danger'
            ? Phaser.Math.Between(2, 4)
            : Phaser.Math.Between(2, 3);

        const cellWidth = cellSize;
        let currentX = Phaser.Math.Between(0, cellWidth * 2);

        for (let i = 0; i < count; i++) {
            const widthInCells = this.type === 'danger'
                ? Phaser.Math.Between(1, 3)
                : Phaser.Math.Between(2, 4);
            const width = widthInCells * cellWidth;
            const gap = Phaser.Math.Between(2, 4) * cellWidth;

            this.obstacles.push({
                x: currentX,
                width: width,
                graphic: null // Create Phaser rectangle here
            });

            currentX += width + gap;
        }
    }

    update() {
        for (const obs of this.obstacles) {
            obs.x += this.speed * this.direction;
            obs.graphic.x = obs.x;

            // Wrap around
            const screenW = this.scene.scale.width;
            if (this.direction === 1 && obs.x > screenW + obs.width) {
                obs.x = -obs.width;
            } else if (this.direction === -1 && obs.x < -obs.width) {
                obs.x = screenW + obs.width;
            }
        }
    }

    // Check if a position is "safe" in this lane
    isPositionSafe(x, width) {
        for (const obs of this.obstacles) {
            const overlap = x < obs.x + obs.width && x + width > obs.x;
            if (this.type === 'danger' && overlap) return false;  // Hit by obstacle
            if (this.type === 'ride' && overlap) return true;     // On a platform
        }
        return this.type === 'danger' ? true : false; // Danger: safe if no overlap. Ride: dead if no overlap.
    }

    // Get the platform the player is on (for ride lanes, to apply movement)
    getPlatformAt(x, width) {
        for (const obs of this.obstacles) {
            if (x < obs.x + obs.width && x + width > obs.x) return obs;
        }
        return null;
    }
}
```

### Ride Lane Carrying
```javascript
// In update(), if player is in a ride lane:
if (currentLane && currentLane.type === 'ride') {
    const platform = currentLane.getPlatformAt(this.player.x - this.playerSize/2, this.playerSize);
    if (platform) {
        // Carry the player
        this.player.x += currentLane.speed * currentLane.direction;

        // Wrap player with platform
        if (this.player.x > this.scale.width + this.playerSize) {
            this.player.x = -this.playerSize;
        } else if (this.player.x < -this.playerSize) {
            this.player.x = this.scale.width + this.playerSize;
        }

        // Update playerCol to nearest column
        this.playerCol = Math.round((this.player.x - this.gridOffsetX) / this.cellSize);
    } else if (this.rideLaneGracePeriod <= 0) {
        // Not on any platform — death
        this.die('void');
    }
}
```

### Crossing Completion
```javascript
completeCrossing() {
    this.score++;
    this.crossingNumber++;

    // Celebration
    this.tweens.add({
        targets: this.player,
        scaleX: 1.3, scaleY: 1.3,
        yoyo: true,
        duration: 150,
        ease: 'Sine.easeInOut'
    });

    // Show +1
    this.showFloatingText('+1', this.player.x, this.player.y);

    // After 500ms, reset field with new harder layout
    this.time.delayedCall(500, () => {
        this.generateField(this.crossingNumber);
        this.playerRow = 0;
        this.playerCol = Math.floor(this.columns / 2);
        this.player.x = this.getColX(this.playerCol);
        this.player.y = this.getRowY(0);
    });
}
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

---

## Definition of Done

1. You can open it on your phone and play immediately
2. Tapping top/bottom hops forward/backward with a visible arc
3. Swiping left/right sidesteps within the lane
4. Danger lane obstacles slide across and kill on contact
5. Ride lane platforms carry the player and gaps kill
6. Reaching the top scores a point and generates a harder field
7. Input queuing works — tapping during a hop queues the next move
8. High score persists
9. You find yourself reading the lane patterns and timing your hops — waiting, waiting, GO
10. The moment you hop onto a ride platform and it carries you feels like you CAUGHT something

That last point is the Frogger magic. The ride lanes aren't just obstacles to avoid — they're vehicles to catch. That shift from "dodge" to "catch" between lane types is what gives the game its rhythm.

---

## Iteration Prompts

- "The hop feels too [slow/fast]. Change hop duration to Xms and arc height to Ypx."
- "Sidestep swipe detection is unreliable. Change swipe threshold to Xpx and max vertical to Ypx."
- "I'm accidentally hopping backward when I mean to swipe. Change the tap/swipe boundary — require taps to be in the top 40% for forward and bottom 30% for backward, with a dead zone in the middle."
- "Danger lane obstacles are too [fast/slow] at crossing N. Adjust speed range to X-Y."
- "Ride lane platforms are too [narrow/wide]. Adjust platform width range to X-Y cells."
- "I want the player to be able to hold their position in ride lanes — tap-and-hold on the same lane to not hop, just ride."
- "Add a timer per crossing. If you don't reach the goal in X seconds, the bottom row starts filling with danger."
- "Add collectible bonus dots in dangerous positions (middle of a busy lane) for +2 score."
- "I want a 'double hop' — tap twice quickly to hop two lanes in one motion (higher arc, riskier)."
- "Add lane-specific visual effects — danger lanes have subtle red particles drifting, ride lanes have subtle blue particles."
- "The grid feels cramped with 10 lanes. Switch to scrolling: only show 6-7 lanes at a time, camera follows the player upward, total lanes can be 15+."
- "Add a 'turbo lane' — one lane per crossing that moves 2× speed but has wider gaps. High risk, easy to cross if you time it."
- "I want themed skins I can swap in later: 'Frogger' (frog + cars + logs), 'Space' (ship + asteroids + platforms), 'City' (person + taxis + buses)."

---

## What NOT to Build Yet

- Character themes / skins
- Sound effects
- Double hop mechanic
- Timer pressure
- Bonus collectibles
- Scrolling field (camera follows upward)
- Multiple difficulty modes
- Landscape support
- Social sharing
- Analytics
- Turbo lanes

The only question: **does the hop-and-time rhythm emerge?** If you find yourself watching lane patterns, waiting for the gap, and committing with a decisive tap — and if landing on a ride platform and being carried across feels like catching a bus — the core works. Everything else layers on top of that rhythm.
