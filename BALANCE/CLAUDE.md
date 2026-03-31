# BALANCE — Claude Code Build Brief

## What You're Building

A mobile-first tilt game called **BALANCE**. Single HTML file using Phaser 3 (loaded from CDN). Your phone is a surface. A ball sits on it. Tilt to roll the ball around, collecting dots that appear in random positions. But holes open up over time. Roll into a hole and you're dead. Stay alive, collect dots, avoid holes.

The magic of this game is physicality. The phone *becomes* the game board. People instinctively hold it flat and tilt carefully, like they're balancing a real marble. That physical engagement is what makes people hand it to each other and say "here, try this." It's social by nature.

---

## Technical Stack

- **Single file**: `index.html` containing everything
- **Phaser 3**: Load from CDN `https://cdn.jsdelivr.net/npm/phaser@3.80.1/dist/phaser.min.js`
- **No build tools, no npm, no bundler** — just one HTML file
- **Target**: Mobile Chrome/Safari, portrait orientation (but works in any orientation since the "surface" is the whole screen), tilt input (with touch fallback)
- **Deploy target**: Cloudflare Pages

---

## Game Design Spec

### Core Loop
1. Ball sits in the center of the phone screen
2. A collectible dot appears at a random position
3. Tilt phone to roll the ball toward the dot
4. Collect it → score +1 → new dot appears → a new hole opens somewhere
5. Holes are permanent and accumulate
6. Ball rolls into a hole → die
7. Ball rolls off screen edge → die (edges are walls — ball bounces off, see below)

The tension builds naturally: more dots collected = more holes = less safe space = more careful tilting = sweaty palms.

### Tilt Controls (Primary)
- DeviceOrientation API, same iOS permission flow as DROP
- `event.gamma` → X-axis tilt (left/right roll)
- `event.beta` → Y-axis tilt (forward/back roll)
- Both axes active simultaneously — the ball rolls in 2D
- Map to acceleration (not velocity) for realistic marble feel:
  ```
  ball.accelerationX = gamma * sensitivityX
  ball.accelerationY = (beta - 45) * sensitivityY
  ```
- **Beta offset of 45°**: People hold phones at roughly 45° from horizontal when looking at the screen. Subtract 45 from beta so that the "neutral" position is the natural holding angle, not flat on a table. This is crucial — without it the ball constantly rolls toward the player.
- Sensitivity: start at 15 for both axes. Tunable.
- Dead zone: ignore values within ±2° of neutral on each axis
- Add light damping/friction so the ball doesn't feel like it's on ice: `ball.setDrag(50)` or equivalent
- Max velocity: 300px/s on each axis. Prevents the ball from becoming uncontrollable.

### Touch Fallback
- If tilt unavailable: the ball accelerates toward the touch point
- Touch and hold anywhere → ball accelerates toward that point
- Release → ball decelerates (drag takes over)
- Intuitive but less fun than tilt — this is the backup, not the primary experience

### The Ball (Player)
- Circle, radius 14px
- Physics body: circle, with bounce 0.5 against walls (slight bounce off edges feels physical)
- Drag: 40 (so it slows down when phone is level — shouldn't slide forever)
- Max velocity: 300 on each axis
- Rolling visual: the ball should have a visible marker (a small dot or line on its surface) that rotates based on movement direction. This sells the marble-on-a-surface illusion.
- Subtle shadow beneath the ball, offset 2px down and right, 30% opacity black. Makes it feel like it's sitting on a surface.

### Screen Edges (Walls)
- The ball bounces off all four screen edges
- Bounce factor: 0.4 (dampened, not a superball)
- Edges should feel solid — the ball doesn't partially clip through
- Implement as four static physics bodies (thin rectangles) along each screen edge
- Visual: no visible wall graphics. The edge of the phone IS the wall. This reinforces the "phone is the surface" metaphor.

### Collectible Dots
- Small glowing circle, radius 8px
- Color: gold/yellow (#ffd700) with a subtle pulse animation (scale 1.0 → 1.15 → 1.0, 800ms loop)
- Spawn at random position, at least 40px from any screen edge and at least 50px from any existing hole center
- Only one collectible dot exists at a time (collect it, next one appears)
- Collection detection: overlap between ball and dot (generous radius — 30px combined detection radius)
- On collection: dot bursts (quick scale up + fade, 150ms), score +1, new dot appears, new hole opens

### Holes
- Circles, radius starts at 22px
- Visual: dark void — very dark circle (#050510) with a subtle dark radial gradient edge that fades into the surface color. Should look like an actual hole in the surface.
- Optional: very subtle inner shadow ring (1px darker ring at edge) for depth perception
- Holes are static — they don't move (in the base game)
- A new hole appears each time a dot is collected, starting from the 2nd collection (first collection is free)
- Hole placement rules:
  - At least 60px from the ball's current position (don't spawn on the player)
  - At least 50px from the current collectible dot (don't block the immediate target)
  - At least 40px from any screen edge
  - At least 35px from any other hole center (prevent overlapping holes that create invisible mega-holes)
  - If no valid position found after 20 attempts, skip spawning this hole (safety valve — shouldn't happen often)
- Holes are permanent for the duration of the run. They accumulate.

### Hole Collision
- Ball center enters a hole's radius → death
- Use circle-circle overlap: `distance(ball, hole) < hole.radius - forgiveness`
- Forgiveness margin: 4px (ball can clip the edge slightly without dying)
- Important: the ball should visually "fall into" the hole on death (see death sequence), so the collision radius should feel slightly smaller than the visual hole. The player should feel like they genuinely went in, not that they touched the rim.

### Death Sequence
- Ball gets sucked into the hole: tween position toward hole center over 200ms while scaling down to 0.3 and fading alpha to 0
- Subtle "drain" effect: brief clockwise rotation tween on the ball during the suck-in (like water going down a drain)
- Screen darkens slightly during the suck-in
- After suck-in completes: screen shake (3 frames, ±2px)
- Dark overlay with score
- Tap to retry
- On restart: all holes cleared, fresh surface

### Scoring
- +1 per dot collected
- Display top-center, semi-transparent
- High score in localStorage (`balance-best`)
- Milestones: every 5 dots, brief pulse on the score text

### Difficulty Curve
The difficulty is emergent, not scripted. More dots = more holes = less space. This is elegant because:
- **Dots 1-5**: Plenty of space. Player learns tilt control and marble feel.
- **Dots 6-10**: Holes starting to constrain movement. Player plans paths.
- **Dots 11-15**: Navigating between holes requires care. Tension building.
- **Dots 16-20**: Screen getting crowded. Every roll is a risk.
- **Dots 20+**: Very little safe space. Survival is an achievement. A score of 25+ should feel elite.

Optional escalation (for iteration, not V1):
- After dot 15, holes could slowly grow by 0.5px radius every 3 seconds
- After dot 20, some holes could slowly drift (random direction, 10px/s)

### Juice & Feel
- **Surface texture**: The background shouldn't be flat black. Add a very subtle noise texture or fine grid pattern (draw with Graphics, very low opacity) to sell the "surface" feel. The ball is rolling ON something.
- **Ball shadow**: Moves slightly with tilt — as you tilt left, shadow shifts right (opposite direction, 1-2px max). Subtle parallax that reinforces the 3D illusion.
- **Collection burst**: Gold particles (6-8 tiny circles) explode outward from collected dot, fade over 300ms. Satisfying.
- **Hole appearance**: New holes don't just pop in. They "open" — scale from 0 to full size over 400ms with an easing curve (Power2.easeOut). A brief dark ripple ring expands from the hole center (think: a pebble dropped in dark water).
- **Near miss**: If the ball passes within 8px of a hole edge without dying, the hole "wobbles" briefly (subtle scale pulse) and the phone vibrates: `navigator.vibrate(30)`. The player knows they got lucky.
- **Dot spawn**: New collectible dot fades in over 200ms with a brief upward float (spawns 10px below final position, floats up). Draws the eye.
- **Progressive tension**: As holes accumulate, the background could get very subtly darker or the surface grid could become slightly more visible — subconscious pressure cues.
- **Ball momentum visible**: When rolling fast, a very subtle motion blur (2 trailing afterimages, 20% opacity each, offset in the opposite direction of movement).

---

## UI Spec

### Layout (Portrait, Mobile)
- Full viewport canvas, `Phaser.Scale.RESIZE`
- The entire screen is the playing surface — no header, no footer, no margins
- Score overlaid on top, semi-transparent enough to not interfere

### Start Screen
- Title "BALANCE" — large, centered, bold
- Below: a simple animation — a ball rolling back and forth on the screen, with one hole visible (built from game objects, not assets)
- "tilt to roll · collect dots · avoid holes" instruction
- "tap to start" pulsing
- First tap triggers iOS DeviceOrientation permission (same as DROP)
- If touch fallback: "touch to guide the ball"

### Death/Retry Screen
- Semi-transparent dark overlay
- "Score: X" centered
- "Best: Y" if applicable
- "NEW BEST" flash if applicable
- Brief display of the hole layout you died on (visible through the overlay for a moment) — lets the player see how far they got
- "tap to retry" pulsing
- Tap → instant restart, clean surface

### HUD During Gameplay
- Score: top-center, 48px, white at 30% opacity (even more transparent than other games because the surface needs to feel uncluttered)
- Control mode: tiny "TILT" or "TOUCH" indicator bottom-left, 12px, 20% opacity. Confirms input is active. Disappears after 3 seconds.
- Nothing else.

### Colors
- Background/surface: very dark gray (#0e0e18) with a subtle fine grid pattern (#151525 lines, 1px, at 10% opacity, every 30px) — makes the surface feel tactile
- Player ball: silver-white (#e0e0f0) with a slight metallic feel (subtle radial gradient from light top-left to darker bottom-right). Distinct from the other three games' ball colors.
- Ball marker (for rotation): small dot on the ball surface, slightly darker (#a0a0b0)
- Ball shadow: black at 25% opacity
- Collectible dot: warm gold (#ffd700) with glow
- Holes: very dark void (#050510) with darker-than-background gradient edge
- Score text: white, 30% opacity
- Collection particles: gold
- Near miss wobble: hole briefly lightens to (#101030)

### Typography
- System font stack: `-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`
- Title: 72px bold
- Score: 48px bold
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
    backgroundColor: '#0e0e18',
    scene: [GameScene],
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 }, // No gravity — tilt provides all movement
            debug: false
        }
    }
};
```

### Tilt Handler
```javascript
let currentGamma = 0;  // left/right
let currentBeta = 0;   // forward/back

function handleOrientation(event) {
    currentGamma = event.gamma || 0;
    currentBeta = event.beta || 0;
}

// In update()
const deadZone = 2;
const sensitivity = 15;
const betaOffset = 45; // Natural phone holding angle

let ax = 0, ay = 0;
const adjustedBeta = currentBeta - betaOffset;

if (Math.abs(currentGamma) > deadZone) {
    ax = currentGamma * sensitivity;
}
if (Math.abs(adjustedBeta) > deadZone) {
    ay = adjustedBeta * sensitivity;
}

this.ball.body.setAcceleration(ax, ay);
```

### Wall Boundaries
```javascript
// Create invisible walls at screen edges
const wallThickness = 10;
const w = this.scale.width;
const h = this.scale.height;

// Top
this.physics.add.staticBody().setPosition(w/2, -wallThickness/2).setSize(w, wallThickness);
// Bottom
this.physics.add.staticBody().setPosition(w/2, h + wallThickness/2).setSize(w, wallThickness);
// Left
this.physics.add.staticBody().setPosition(-wallThickness/2, h/2).setSize(wallThickness, h);
// Right
this.physics.add.staticBody().setPosition(w + wallThickness/2, h/2).setSize(wallThickness, h);

// Set ball bounce
this.ball.setBounce(0.4);
this.ball.setDrag(40);
this.ball.setMaxVelocity(300, 300);
```

### Hole Collision Check (per frame)
```javascript
// In update() — manual check for tighter control than physics overlap
for (const hole of this.holes) {
    const dist = Phaser.Math.Distance.Between(this.ball.x, this.ball.y, hole.x, hole.y);
    if (dist < hole.radius - 4) { // 4px forgiveness
        this.die(hole);
        return;
    }
}
```

### Dot Spawn With Constraints
```javascript
spawnDot() {
    const margin = 40;
    const holeMinDist = 50;
    const maxAttempts = 20;

    for (let i = 0; i < maxAttempts; i++) {
        const x = Phaser.Math.Between(margin, this.scale.width - margin);
        const y = Phaser.Math.Between(margin, this.scale.height - margin);

        let valid = true;
        for (const hole of this.holes) {
            if (Phaser.Math.Distance.Between(x, y, hole.x, hole.y) < holeMinDist) {
                valid = false;
                break;
            }
        }
        if (valid) {
            this.createDotAt(x, y);
            return;
        }
    }
    // Fallback: place it anyway (rare edge case)
    this.createDotAt(
        Phaser.Math.Between(margin, this.scale.width - margin),
        Phaser.Math.Between(margin, this.scale.height - margin)
    );
}
```

### Surface Grid (Background Texture)
```javascript
// Draw a subtle grid in create()
const graphics = this.add.graphics();
graphics.lineStyle(1, 0x151525, 0.1);
const gridSize = 30;
for (let x = 0; x < this.scale.width; x += gridSize) {
    graphics.moveTo(x, 0);
    graphics.lineTo(x, this.scale.height);
}
for (let y = 0; y < this.scale.height; y += gridSize) {
    graphics.moveTo(0, y);
    graphics.lineTo(this.scale.width, y);
}
graphics.strokePath();
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
2. Tilting the phone rolls the ball smoothly in all directions
3. The ball feels like a marble — momentum, drag, wall bounces all feel physical
4. Collecting a dot creates a new hole and spawns the next dot
5. Rolling into a hole triggers the suck-in death animation and shows the score
6. Holes accumulate visually and create an increasingly dangerous surface
7. High score persists
8. You find yourself holding the phone flat and carefully tilting like you're balancing a real object
9. Someone watching you play says "let me try"

Point 9 is the real metric. BALANCE is a spectator-friendly game — watching someone tilt and wobble their phone is inherently entertaining.

---

## Iteration Prompts

- "The ball slides too much / not enough. Change drag to X and max velocity to Y."
- "Neutral tilt position is wrong — the ball drifts [toward me / away from me]. Change betaOffset to X degrees."
- "Tilt is too [sensitive/sluggish]. Change sensitivity to X for both axes."
- "Holes are too [big/small]. Change base radius to Xpx."
- "The ball falls into holes too easily. Increase forgiveness margin to Xpx."
- "I want holes to slowly grow after they appear — add 0.5px radius growth every X seconds."
- "After score 15, I want some holes to slowly drift in a random direction at Xpx/s."
- "Add a shield power-up that occasionally spawns — collecting it makes you immune to the next hole collision."
- "Add a magnet power-up that pulls the ball toward the next collectible dot for 3 seconds."
- "I want the surface grid to subtly ripple outward from the ball position as it rolls — like a disturbance on water."
- "Add a 2-player mode: two balls, two colors, first to collect 15 dots wins. Same phone, different corners."
- "The wall bounce feels [too bouncy / too dead]. Change bounce to X."
- "I want a trail of gold dust behind the ball when it's carrying a collection streak of 5+."

---

## What NOT to Build Yet

- Sound effects
- Multiple game modes (2-player is a great V2)
- Leaderboards
- Power-ups (shield, magnet — good V2)
- Moving holes
- Growing holes
- Cosmetics / ball skins
- Landscape-specific layout
- Social sharing
- Analytics
- Obstacle types beyond holes

The only question: **does the phone feel like a surface with a marble on it?** If someone tilts the phone and the ball responds in a way that makes them adjust their grip and hold it more carefully, the core is right. Everything else is layered on top of that sensation.
