# GROW — Claude Code Build Brief

## What You're Building

A mobile-first single-player blob game called **GROW**. Single HTML file using Phaser 3 (loaded from CDN). You're a blob on an open field. Smaller blobs are food — roll into them to absorb them and grow. Bigger blobs are predators — they hunt you. As you grow, things that were threats become food, and new bigger threats appear. Tilt your phone to move.

This is Agar.io distilled into a solo survival game. The multiplayer politics are gone, but the core thrill remains: the constant size-relative risk assessment, the satisfying *gulp* of absorbing something, the panic of a bigger blob bearing down on you, and the power fantasy of growing from prey into predator.

---

## Technical Stack

- **Single file**: `index.html` containing everything
- **Phaser 3**: Load from CDN `https://cdn.jsdelivr.net/npm/phaser@3.80.1/dist/phaser.min.js`
- **No build tools, no npm, no bundler** — just one HTML file
- **Target**: Mobile Chrome/Safari, portrait orientation, tilt input (with touch fallback)
- **Deploy target**: Cloudflare Pages

---

## Game Design Spec

### Core Loop
1. Player blob starts small (radius 15px) in the center of a large world
2. The world is populated with static food pellets and AI-controlled blobs of various sizes
3. Tilt phone to roll your blob around the world
4. Roll into anything smaller than you → absorb it → you grow
5. Anything bigger than you can absorb you → death
6. Survive and grow as large as possible
7. Score = your mass at death (not a point counter — your size IS your score)

### World
- Large playfield: 3000 × 3000px (much larger than the screen — requires camera follow)
- Visible area: roughly the phone viewport (360-420px wide typically)
- World boundary: hard edges. Blob bounces softly off world edges (bounce 0.2).
- Boundary visual: subtle grid pattern across the whole field (like Agar.io's grid). Lines every 40px, very low opacity (#1a1a2e at 8% opacity on dark background). This grid gives spatial orientation — without it, movement in open space feels directionless.
- World edge: visible border line (1px, slightly brighter than grid, #2a2a4e). Player can see they're approaching the edge.

### The Player Blob
- Starts at mass 20, which corresponds to radius 15px
- **Mass-to-radius formula**: `radius = Math.sqrt(mass) * 3.5` — this means growth is visually diminishing (doubling mass doesn't double size). Same as Agar.io. This is important: early growth feels dramatic, late growth feels earned.
- Color: vibrant teal (#00e5c8) with a slightly darker border ring and a subtle inner highlight (radial gradient from lighter center to edge color). Must look like a blob, not a flat circle.
- Eyes: two small white circles with dark pupils, positioned in the upper third of the blob, spaced proportionally to radius. Eyes look in the direction of movement (pupils shift 2-3px toward velocity direction). This tiny detail makes the blob feel alive and gives directional feedback.
- Movement: tilt-controlled (same DeviceOrientation setup as DROP and BALANCE)
- **Speed inversely proportional to size**: `maxSpeed = 250 / Math.sqrt(mass / 20)` — you start fast and nimble, and get slower as you grow. At very large sizes, you're a lumbering giant. This creates natural tension: big things are scary but slow, small things are safe but fast.
- Blob wobble: slight jelly deformation when changing direction or absorbing. Scale X and Y oscillate briefly (±5%, 200ms settle). Makes it feel gelatinous.

### Tilt Controls
- Same DeviceOrientation API pattern as DROP and BALANCE
- `gamma` → X movement, `beta - 45` → Y movement (45° offset for natural phone holding)
- Map to velocity (not acceleration, unlike BALANCE) for more direct control: `blob.velocityX = gamma * sensitivity * speedMultiplier`
- Sensitivity: 6
- Dead zone: ±3°
- Speed multiplier decreases with mass (see formula above)
- The blob should feel responsive but weighty — slight easing on velocity changes (lerp current velocity toward target velocity at rate 0.15 per frame). Bigger blobs lerp slower (0.08) for that heavy feeling.

### Touch Fallback
- Touch and hold → blob moves toward touch point
- Speed proportional to distance from blob center to touch point (up to max speed)
- Works but less immersive than tilt

### Food Pellets (Static)
- Tiny colored circles, radius 3-4px
- Randomly distributed across the world at game start: 300 pellets
- Each pellet grants +1 mass when absorbed
- Colors: randomized from a bright palette (reds, greens, blues, yellows, pinks — variety makes the field look alive)
- Respawn: when a pellet is eaten, a new one spawns at a random position elsewhere in the world after 2 seconds. Total pellet count stays roughly constant.
- No physics body needed — just position. Check overlap with player blob each frame.

### AI Blobs
- 15-20 AI blobs in the world at all times
- Each has a random color (distinct from player's teal — avoid similar hues)
- Each has eyes (same as player — pupils track their movement direction)
- Mass range at game start: distributed across a spectrum. Some smaller than the player (mass 8-15), some similar (mass 15-30), some larger (mass 30-80), a few much larger (mass 80-200).
- **Mass-to-radius uses the same formula as the player**
- AI blobs have names displayed above them (randomly picked from a list of 50 funny/generic names — "Bob", "Blobby", "Sir Chomps", "xx_Destroyer_xx", "Mom", "Jeff", "BigGuy", "Tiny", "Kevin", etc.) This small detail makes them feel like characters, not obstacles.

### AI Behavior
Keep it simple but believable:

**State machine with 3 states:**

1. **Wander** (default): Move in a random direction. Change direction every 2-5 seconds (random interval). Speed based on their mass (same formula as player). This is the idle state.

2. **Hunt**: If the AI blob detects a smaller blob (player or other AI) within a detection radius of `their_radius * 5`, and the target is at least 20% smaller by mass, switch to Hunt. Move toward the target. Hunting speed: 110% of normal wander speed (they get a small burst when chasing — creates tension).

3. **Flee**: If the AI blob detects a larger blob (player or other AI) within a detection radius of `their_radius * 4`, and the threat is at least 20% larger by mass, switch to Flee. Move directly away from the threat. Flee speed: 120% of normal wander speed (panic burst).

**Priority**: Flee overrides Hunt. Self-preservation first.

**AI-vs-AI interaction**: AI blobs can eat each other using the same rules as player eating. This means the ecosystem is dynamic — some AI blobs grow, some get eaten. The world feels alive even when the player isn't interacting.

**Respawn**: When an AI blob is eaten (by player or by another AI), spawn a new small AI blob (mass 10-20) at a random position at least 500px from the player after 3 seconds. This keeps the world populated.

### Eating / Absorption Mechanic
- **Rule**: Blob A can eat Blob B if:
  - Blob A's mass is at least 1.2× Blob B's mass (20% bigger requirement — prevents same-size eating)
  - Blob A's circle overlaps with Blob B's center point (A's edge reaches B's center — generous, feels like engulfing)
- **On eat**:
  - Eater gains the eaten blob's mass (instantly)
  - Eater's radius updates via the formula
  - Eaten blob: quick shrink-into-eater animation (200ms tween toward eater's center, scale to 0, then destroy)
  - Eater does a brief "gulp" wobble (expand 10%, contract to normal, 200ms)
  - Score updates
- **Player eating a food pellet**: Same as above but simpler animation (pellet just disappears with a tiny pop)

### Camera
- Follows the player blob, centered
- **Zoom scales with size**: As the player grows, the camera zooms out to show more of the world. This is critical — without it, a large blob fills the screen and the game becomes unplayable.
- `camera.zoom = Math.max(1.5 / Math.sqrt(mass / 20), 0.4)` — starts zoomed in (seeing detail around a small blob), gradually pulls out. Minimum zoom 0.4 (never so far you can see the whole world).
- Zoom changes should be smooth (lerp toward target zoom at rate 0.02 per frame — gradual, not jarring).
- Camera bounds: clamp to world edges so you never see beyond the border.

### Minimap
- Small square in the bottom-right corner, 80×80px, 50% opacity background
- Shows the entire world in miniature
- Player position: bright teal dot
- AI blobs: colored dots scaled roughly by their size (but with a minimum visible size)
- Large blobs visible, small ones may not be — that's fine, it's for orientation
- Helps the player navigate the large world and spot clusters of food or avoid big threats

### Death
- When an AI blob eats the player:
  - Player blob gets sucked toward the eater (same shrink-into animation, 300ms)
  - Screen desaturates briefly
  - Camera holds position for 500ms (you watch the blob that ate you continue moving)
  - Dark overlay fades in
  - Score screen

### Scoring
- **Score = peak mass reached** (not mass at death — if you hit mass 500 and then get eaten at mass 480, your score is 500)
- Display current mass top-center, semi-transparent
- On death: "Mass: X" and "Best: Y"
- High score in localStorage (`grow-best`)
- **Size milestones**: At mass 50, 100, 200, 500, 1000 — brief celebratory text ("GROWING!", "BIG!", "HUGE!", "MASSIVE!", "LEGENDARY!") that fades in and out over 800ms

### Difficulty / Progression
There's no scripted difficulty curve. The emergent dynamics create natural progression:
- **Early game** (mass 20-50): You're small, fast, vulnerable. Many things can eat you. You eat pellets and the smallest AI blobs. Movement is frantic — dodge threats, grab food.
- **Mid game** (mass 50-200): You can eat medium AI blobs. Some threats remain. You start feeling powerful but slower. Strategic: choose targets wisely.
- **Late game** (mass 200+): You're a predator. Most AI blobs are food. But you're slow, and a few mega-blobs still threaten you. The challenge shifts from survival to hunting.
- **End game** (mass 500+): You dominate the field. Very slow. The risk is complacency — a slightly smaller blob that grew while you weren't watching can suddenly threaten you. Eventually a mega-blob corners you against a wall.

The AI ecosystem self-balances: as the player eats AI blobs, new small ones spawn. Some of those grow by eating each other. The world stays populated and dynamic.

### Juice & Feel
- **Blob wobble on direction change**: Brief squash-stretch deformation (scale perpendicular to movement direction). Makes blobs feel gelatinous.
- **Absorption animation**: Eaten blob shrinks toward eater's center. Eater briefly bulges, then settles. Satisfying visual weight gain.
- **Gulp vibration**: `navigator.vibrate(25)` when eating an AI blob. `navigator.vibrate(10)` for pellets (lighter). `navigator.vibrate([80, 40, 80])` on death.
- **Size-relative perception**: Small blobs that are food should have a subtle glow/highlight rim. Blobs that are threats should have a subtle dark aura or be slightly dimmed. This helps instant readability without explicit UI. The visual distinction activates when the size difference exceeds the 1.2× threshold.
  - Food (you can eat): thin bright outline ring at 20% opacity
  - Threat (can eat you): subtle dark shadow aura
  - Neutral (too close in size to eat either way): no decoration
- **Eye tracking**: All blobs' pupils point toward their movement direction. A hunting blob's pupils point at its target. This gives you advance warning — "that blob is looking at me."
- **Camera zoom smoothing**: Continuous gentle zoom adjustment as you grow. Never jarring.
- **World grid parallax**: The background grid scrolling gives strong motion feedback, especially important for tilt controls where you need spatial grounding.
- **Eating streak**: If you eat 3+ blobs within 5 seconds, brief "FEEDING FRENZY" text flash. Rewards aggressive play.

---

## UI Spec

### Layout (Portrait, Mobile)
- Full viewport canvas, `Phaser.Scale.RESIZE`
- Game world much larger than viewport (3000×3000)
- Camera follows player with zoom

### Start Screen
- Title "GROW" — large, centered, bold
- Animated background: a few blobs of various sizes drifting around, occasionally eating each other (attract screen using the game's own AI logic — very cool if achievable, otherwise just floating blobs)
- "tilt to move · eat smaller · avoid bigger" instruction
- "tap to start" pulsing
- First tap: iOS DeviceOrientation permission flow

### Death Screen
- Semi-transparent dark overlay
- "Peak Mass: X" (the score)
- "Best: Y" if applicable
- "NEW BEST" accent flash
- "You were eaten by [AI blob name]" — personal touch, makes you want revenge
- "tap to retry" pulsing
- Tap → instant restart with fresh world

### HUD During Gameplay
- Current mass: top-center, 44px, white at 30% opacity
- Minimap: bottom-right, 80×80px
- Nothing else. The blobs ARE the UI — their relative sizes tell you everything.

### Colors
- Background: very dark navy (#080814)
- Grid: (#151528) at 8% opacity
- World border: (#2a2a4e) at 40% opacity
- Player blob: teal (#00e5c8) with lighter center gradient (#40ffd8)
- Player eyes: white sclera, dark (#1a1a2e) pupils
- AI blob colors: randomly assigned from a curated palette that avoids teal:
  - Coral (#ff6b6b)
  - Violet (#a855f7)
  - Hot pink (#f472b6)
  - Lime (#84cc16)
  - Amber (#f59e0b)
  - Sky blue (#38bdf8)
  - Rose (#fb7185)
  - Emerald (#34d399)
  - Orange (#fb923c)
  - Indigo (#818cf8)
- Food pellets: random bright colors from a similar palette, smaller and fully saturated
- Name labels: white, 60% opacity, 12px above blob
- Score text: white, 30% opacity
- Milestone text: white, full opacity, large
- Minimap background: (#0a0a1a) at 50% opacity
- Minimap player dot: bright teal
- Minimap AI dots: their respective colors

### Typography
- System font stack: `-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`
- Title: 72px bold
- Mass during gameplay: 44px bold
- Death screen: 36px
- AI names: 11px (scales slightly with blob size, max 14px)
- Instructions: 18px
- Milestone text: 48px bold

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
    backgroundColor: '#080814',
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

### World Setup
```javascript
// Set world bounds
this.physics.world.setBounds(0, 0, 3000, 3000);
this.cameras.main.setBounds(0, 0, 3000, 3000);

// Draw grid
const graphics = this.add.graphics();
graphics.lineStyle(1, 0x151528, 0.08);
for (let x = 0; x <= 3000; x += 40) {
    graphics.moveTo(x, 0);
    graphics.lineTo(x, 3000);
}
for (let y = 0; y <= 3000; y += 40) {
    graphics.moveTo(0, y);
    graphics.lineTo(3000, y);
}
graphics.strokePath();

// Draw border
graphics.lineStyle(2, 0x2a2a4e, 0.4);
graphics.strokeRect(0, 0, 3000, 3000);
```

### Blob Class/Structure
```javascript
// Each blob (player and AI) needs:
const blob = {
    x: 0, y: 0,
    mass: 20,
    color: 0x00e5c8,
    name: 'Player',
    velocityX: 0, velocityY: 0,
    state: 'wander', // AI only: 'wander', 'hunt', 'flee'
    target: null,     // AI only: reference to hunt/flee target
    directionChangeTimer: 0, // AI only
    graphic: null,    // Phaser Graphics object or Container
    nameText: null,   // Phaser Text object
    eyeLeft: null,    // Eye graphics
    eyeRight: null,
};

function getRadius(mass) {
    return Math.sqrt(mass) * 3.5;
}

function getMaxSpeed(mass) {
    return 250 / Math.sqrt(mass / 20);
}

function getZoom(mass) {
    return Math.max(1.5 / Math.sqrt(mass / 20), 0.4);
}
```

### Blob Rendering
```javascript
// Each blob is a Graphics object redrawn when mass changes significantly
function drawBlob(graphics, radius, color) {
    graphics.clear();

    // Main body with gradient effect (center lighter)
    graphics.fillStyle(color, 1);
    graphics.fillCircle(0, 0, radius);

    // Lighter center highlight
    const lighterColor = Phaser.Display.Color.ValueToColor(color).lighten(30).color;
    graphics.fillStyle(lighterColor, 0.3);
    graphics.fillCircle(-radius * 0.2, -radius * 0.2, radius * 0.5);

    // Border ring
    const darkerColor = Phaser.Display.Color.ValueToColor(color).darken(20).color;
    graphics.lineStyle(2, darkerColor, 0.5);
    graphics.strokeCircle(0, 0, radius);
}

// Eyes positioned relative to blob center
function drawEyes(blob, velocityX, velocityY) {
    const r = getRadius(blob.mass);
    const eyeOffset = r * 0.3;
    const eyeRadius = Math.max(r * 0.15, 3);
    const pupilRadius = eyeRadius * 0.5;

    // Calculate pupil offset based on velocity direction
    const speed = Math.sqrt(velocityX * velocityX + velocityY * velocityY);
    let pupilOffsetX = 0, pupilOffsetY = 0;
    if (speed > 5) {
        const angle = Math.atan2(velocityY, velocityX);
        pupilOffsetX = Math.cos(angle) * pupilRadius * 0.6;
        pupilOffsetY = Math.sin(angle) * pupilRadius * 0.6;
    }
    // Draw white sclera, then dark pupil at offset position
}
```

### AI State Machine
```javascript
function updateAI(aiBlob, allBlobs, player, delta) {
    const radius = getRadius(aiBlob.mass);
    const detectRange = radius * 5;
    const fleeRange = radius * 4;

    // Check for threats (flee priority)
    let nearestThreat = null;
    let nearestThreatDist = Infinity;

    // Check for prey (hunt)
    let nearestPrey = null;
    let nearestPreyDist = Infinity;

    const allTargets = [...allBlobs, player];
    for (const other of allTargets) {
        if (other === aiBlob || other.dead) continue;
        const dist = Phaser.Math.Distance.Between(aiBlob.x, aiBlob.y, other.x, other.y);

        // Is it a threat?
        if (other.mass > aiBlob.mass * 1.2 && dist < fleeRange) {
            if (dist < nearestThreatDist) {
                nearestThreat = other;
                nearestThreatDist = dist;
            }
        }
        // Is it prey?
        if (aiBlob.mass > other.mass * 1.2 && dist < detectRange) {
            if (dist < nearestPreyDist) {
                nearestPrey = other;
                nearestPreyDist = dist;
            }
        }
    }

    // State transitions (flee > hunt > wander)
    if (nearestThreat) {
        aiBlob.state = 'flee';
        aiBlob.target = nearestThreat;
    } else if (nearestPrey) {
        aiBlob.state = 'hunt';
        aiBlob.target = nearestPrey;
    } else {
        aiBlob.state = 'wander';
    }

    // Execute state
    const maxSpeed = getMaxSpeed(aiBlob.mass);
    switch (aiBlob.state) {
        case 'flee':
            const fleeAngle = Math.atan2(aiBlob.y - aiBlob.target.y, aiBlob.x - aiBlob.target.x);
            aiBlob.velocityX = Math.cos(fleeAngle) * maxSpeed * 1.2;
            aiBlob.velocityY = Math.sin(fleeAngle) * maxSpeed * 1.2;
            break;
        case 'hunt':
            const huntAngle = Math.atan2(aiBlob.target.y - aiBlob.y, aiBlob.target.x - aiBlob.x);
            aiBlob.velocityX = Math.cos(huntAngle) * maxSpeed * 1.1;
            aiBlob.velocityY = Math.sin(huntAngle) * maxSpeed * 1.1;
            break;
        case 'wander':
            aiBlob.directionChangeTimer -= delta;
            if (aiBlob.directionChangeTimer <= 0) {
                const angle = Math.random() * Math.PI * 2;
                aiBlob.velocityX = Math.cos(angle) * maxSpeed * 0.6;
                aiBlob.velocityY = Math.sin(angle) * maxSpeed * 0.6;
                aiBlob.directionChangeTimer = 2000 + Math.random() * 3000;
            }
            break;
    }
}
```

### Eating Check
```javascript
function checkEating(blobA, blobB) {
    if (blobA.mass < blobB.mass * 1.2) return false;
    const dist = Phaser.Math.Distance.Between(blobA.x, blobA.y, blobB.x, blobB.y);
    const radiusA = getRadius(blobA.mass);
    // A eats B when A's edge reaches B's center
    return dist < radiusA;
}
```

### Camera Zoom
```javascript
// In update()
const targetZoom = Math.max(1.5 / Math.sqrt(this.player.mass / 20), 0.4);
this.cameras.main.zoom = Phaser.Math.Linear(this.cameras.main.zoom, targetZoom, 0.02);
this.cameras.main.startFollow(this.playerContainer, true, 0.1, 0.1);
```

### Minimap
```javascript
// Create a separate camera for the minimap
const minimapSize = 80;
const minimap = this.cameras.add(
    this.scale.width - minimapSize - 10,
    this.scale.height - minimapSize - 10,
    minimapSize, minimapSize
);
minimap.setZoom(minimapSize / 3000);
minimap.setScroll(0, 0);
minimap.setBackgroundColor(0x0a0a1a);
minimap.setAlpha(0.5);
// The minimap camera sees the same game objects, just zoomed way out
```

### AI Name List
```javascript
const AI_NAMES = [
    'Bob', 'Blobby', 'Sir Chomps', 'Tiny', 'BigGuy', 'Jeff',
    'Mom', 'Kevin', 'Nom Nom', 'Chonk', 'xx_Pro_xx', 'Squishy',
    'Hungry', 'The Blob', 'Globby', 'Munch', 'Thicc', 'Slim',
    'Chomp Jr', 'Bubble', 'Goliath', 'Pebble', 'Mega', 'Micro',
    'Snack', 'Gulp', 'Wobble', 'Jelly', 'Sphere', 'Orb',
    'Pac', 'Gloop', 'Splat', 'Bouncy', 'Rolly', 'Fatty',
    'Speedy', 'Slowpoke', 'Ninja', 'Tank', 'Ghost', 'Shadow',
    'Fluffy', 'Grumpy', 'Lucky', 'Dizzy', 'Spike', 'Marble',
    'Donut', 'Pickle'
];
```

### Tilt Controls (same pattern as DROP/BALANCE)
```javascript
let currentGamma = 0;
let currentBeta = 0;

function handleOrientation(event) {
    currentGamma = event.gamma || 0;
    currentBeta = event.beta || 0;
}

// In update()
const deadZone = 3;
const sensitivity = 6;
const betaOffset = 45;
const maxSpeed = getMaxSpeed(this.player.mass);

let targetVX = 0, targetVY = 0;
const adjustedBeta = currentBeta - betaOffset;

if (Math.abs(currentGamma) > deadZone) {
    targetVX = Phaser.Math.Clamp(currentGamma * sensitivity, -1, 1) * maxSpeed;
}
if (Math.abs(adjustedBeta) > deadZone) {
    targetVY = Phaser.Math.Clamp(adjustedBeta * sensitivity, -1, 1) * maxSpeed;
}

// Lerp for weight feel — heavier blobs lerp slower
const lerpRate = Math.max(0.15 - (this.player.mass / 5000), 0.04);
this.player.velocityX = Phaser.Math.Linear(this.player.velocityX, targetVX, lerpRate);
this.player.velocityY = Phaser.Math.Linear(this.player.velocityY, targetVY, lerpRate);
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
This game has the highest object count of all five prototypes. Watch for:
- **Pellet rendering**: 300 pellets as individual game objects may lag on low-end phones. Consider using a single Graphics object to batch-draw all pellets, or a RenderTexture. Only redraw the pellet layer when pellets change.
- **AI updates**: 15-20 AI blobs running state machines every frame. Keep the distance checks efficient — skip detailed AI for blobs far off-screen (> 1000px from player).
- **Blob rendering**: Redraw blob graphics only when mass changes by more than 5% (not every frame).
- **Collision checks**: Only check eating between blobs that are within plausible range (pre-filter by distance before doing circle overlap math).
- Target 30fps minimum on a mid-range phone. 60fps preferred.

---

## Definition of Done

1. You can open it on your phone and play immediately
2. Tilting moves your blob smoothly around the world
3. Rolling into smaller blobs/pellets absorbs them and you visibly grow
4. AI blobs wander, hunt, flee, and eat each other independently
5. Getting eaten by a bigger blob triggers death and shows your peak mass
6. Camera zooms out as you grow
7. Minimap shows world overview
8. High score persists
9. You feel the shift from "hunted" to "hunter" as you grow — and it feels powerful
10. You get eaten by something called "Sir Chomps" and immediately want revenge

---

## Iteration Prompts

- "Movement feels too [sluggish/twitchy] at mass X. Change sensitivity to Y and lerp rate to Z."
- "I'm too slow when big. Change the speed formula denominator to X."
- "AI blobs are too [aggressive/passive]. Change hunt detection range to X× radius and flee range to Y× radius."
- "The 1.2× mass threshold for eating feels [too strict/too generous]. Change to X×."
- "Camera zoom pulls out too [fast/slow]. Change the zoom formula to X."
- "I want a split mechanic — double tap to split your blob into two halves that move apart, then slowly merge back together after 5 seconds."
- "Add a speed boost — shake the phone to get a 2-second burst of speed, costs 10% of your mass."
- "I want ejecting mass — hold with two fingers to shoot a small blob forward. Costs mass but can be used to bait AI."
- "The world feels empty. Increase pellet count to X and AI count to Y."
- "AI names should include my family's names: Levi, Pelé, Tjalle."
- "Add a 'virus' obstacle — large green spiky circle that's stationary. If a blob bigger than mass 150 touches it, it splits into multiple pieces. Smaller blobs pass through safely."
- "Add a leaderboard HUD showing the top 5 blobs by mass (including AI names) — updates live."
- "I want the background color to shift based on my size — dark blue when small, dark green when medium, dark red when large."
- "Performance is bad. Reduce pellet count, increase pellet mass value to compensate. Batch-render pellets."

---

## What NOT to Build Yet

- Split mechanic
- Mass ejection
- Viruses / obstacles
- Speed boost
- Multiplayer
- Skins / cosmetics
- Leaderboard HUD (the live top-5 — good V2 feature)
- Sound effects
- Different game modes
- Teams
- Social sharing
- Analytics

The only question: **do you feel the predator/prey shift?** When you start small and scared, then grow to the point where the blob that was chasing you is now running from you — if that moment lands, the game works. Everything else is seasoning.
