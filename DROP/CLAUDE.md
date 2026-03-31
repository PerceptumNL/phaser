# DROP — Claude Code Build Brief

## What You're Building

A mobile-first endless faller called **DROP**. Single HTML file using Phaser 3 (loaded from CDN). The player character falls downward continuously. Tilt your phone left/right to steer through gaps in horizontal platforms below. Miss a gap and you splat. Fall speed increases gradually. Portrait mode, one-handed, tilt-controlled.

The inversion is what makes it interesting — most runners go sideways, this goes down. Tilting your phone to steer downward feels physically intuitive because gravity is pulling in the same direction you're moving. It's the kind of game you play standing on a train with one hand on the railing.

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
1. Player ball starts at the top of the screen
2. Ball falls downward continuously (gravity, not tweened — must feel physical)
3. Horizontal platforms scroll upward (relative to the falling ball)
4. Each platform has a gap the ball can fit through
5. Tilt phone left/right to steer the ball horizontally into the gap
6. Pass through → survive, score +1
7. Hit the platform → splat → die
8. Fall speed increases over time

### Tilt Controls (Primary)
- Use the browser DeviceOrientation API
- `event.gamma` gives left/right tilt in degrees (-90 to 90)
- Map gamma to horizontal velocity: `ball.velocityX = gamma * sensitivityMultiplier`
- Sensitivity multiplier: start at 8. This means a 10° tilt moves the ball at 80px/s. Tunable.
- Dead zone: ignore gamma values between -3 and 3 degrees (prevents drift when phone is "flat")
- Clamp horizontal speed to ±400px/s so extreme tilting doesn't make control impossible
- **iOS permission**: iOS 13+ requires explicit user permission for DeviceOrientation. On the start screen, the first tap must call `DeviceOrientationEvent.requestPermission()`. Handle the promise. If denied, fall back to touch controls. This is mandatory — the game won't work on iPhone without it.

```javascript
// iOS permission flow
if (typeof DeviceOrientationEvent.requestPermission === 'function') {
    DeviceOrientationEvent.requestPermission()
        .then(response => {
            if (response === 'granted') {
                window.addEventListener('deviceorientation', handleOrientation);
            } else {
                enableTouchFallback();
            }
        })
        .catch(() => enableTouchFallback());
} else {
    // Android or older iOS — just listen
    window.addEventListener('deviceorientation', handleOrientation);
}
```

### Touch Fallback (Secondary)
- For devices where tilt isn't available or permission denied
- Touch left half of screen → move left
- Touch right half → move right
- The further from center the touch is, the faster the movement (proportional)
- Show a subtle left/right indicator on screen when in touch mode
- Auto-detect: if no deviceorientation events fire within 1 second of game start, switch to touch mode

### The Ball (Player)
- Circle, radius 12px
- Falls downward with constant acceleration (not freefall — controlled fall)
- Base fall speed: 2px/frame, increasing by 0.02px/frame per platform passed
- Max fall speed: 8px/frame (cap so it never becomes literally unreactable)
- Horizontal movement via tilt (see above)
- Ball wraps horizontally: if it goes off the left edge, it appears on the right edge (and vice versa). This is important — it prevents "stuck in corner" deaths and adds a strategic element where you can wrap around to reach a gap on the far side.
- Ball has a small downward-pointing motion trail (3 afterimages, decreasing opacity)

### Platforms
- Full-width horizontal bars with one gap
- Platform thickness: 12px
- Gap width: starts at 80px, shrinks by 1px per 5 platforms passed, minimum 40px
- Gap position: random X, but constrained so the gap is always fully on screen (gap edges at least 20px from screen edges)
- Platform spacing (vertical distance between platforms): starts at 250px, decreases to minimum 150px over 30 platforms. Closer platforms = less reaction time.
- Platforms scroll upward as the ball falls (or equivalently, the camera follows the ball down)
- Destroy platforms once they've scrolled above the visible area + 100px buffer

### Gap Placement Rules
- The gap must never require the ball to move more than 70% of screen width from the previous gap position. This prevents impossible-feeling sequences where the gap jumps from far-left to far-right with insufficient time.
- Track the previous gap's X center. New gap X must be within `screenWidth * 0.7` of the previous gap X. If the random placement violates this, re-roll.
- This rule ensures every death is fair — the player always had enough time to reach the gap if they reacted.

### Collision
- Check when ball Y overlaps with platform Y (ball bottom edge meets platform top edge)
- At that moment, check if ball center X is within the gap (gap-left + margin to gap-right - margin)
- Forgiveness margin: 6px on each side (so the ball can clip the edge slightly and still pass)
- If ball center is outside the gap → death
- If ball center is inside the gap → pass through, score +1

### Death
- Ball squashes flat against the platform (scale Y to 0.3, scale X to 1.8, over 100ms)
- Brief red flash on the ball
- Screen shake (3 frames, ±2px)
- Everything freezes for 200ms
- Dark overlay with score
- Tap to retry

### Scoring
- +1 per platform passed
- Display top-center, semi-transparent
- High score in localStorage (`drop-best`)
- Every 10 platforms survived, brief "10!" / "20!" / "30!" milestone flash

### Difficulty Curve
- **Platforms 1-5**: Wide gaps (80px), slow fall, generous spacing. Player learns tilt.
- **Platforms 6-15**: Gaps start narrowing. Fall speed noticeable. Player concentrates.
- **Platforms 16-25**: Gaps tighter (60px range), platforms closer together, speed building.
- **Platforms 25-40**: Approaching minimum gap size and spacing. High tension.
- **Platforms 40+**: Everything at maximum difficulty. Survival is an achievement.
- The curve is continuous — no sudden jumps. Each variable (gap width, fall speed, platform spacing) changes independently at its own rate.

### Juice & Feel
- **Tilt responsiveness**: The ball must respond instantly to tilt — no smoothing, no easing on horizontal movement. Tilt games feel terrible with input lag. Raw gamma → velocity, every frame.
- **Speed lines**: Vertical lines in the background, moving downward, increasing in density and speed as fall speed increases. Sells the feeling of acceleration.
- **Gap highlight**: The gap in the next approaching platform glows subtly (thin line of light along the gap edges). Helps readability at speed.
- **Pass-through flash**: When the ball passes through a gap, a brief horizontal light streak across the gap (white, 100ms fade). Confirms the pass.
- **Screen edge wrap effect**: When the ball wraps from one side to the other, leave a brief ghost afterimage at the exit edge. Makes the wrap feel intentional, not glitchy.
- **Platform color progression**: Platforms start as cool gray. As difficulty increases, they shift toward a darker, more threatening tone (deep red-gray at max difficulty). Subconscious pressure.
- **Vibration**: `navigator.vibrate(20)` on each platform pass. `navigator.vibrate([50, 30, 50])` on death.
- **Squash/stretch on tilt**: Very subtle — when the ball is moving horizontally fast, stretch it slightly in the movement direction (1.1x horizontal, 0.95x vertical). Sells the responsiveness.

---

## UI Spec

### Layout (Portrait, Mobile)
- Full viewport canvas, `Phaser.Scale.RESIZE`
- Background: very dark charcoal (#0c0c14) — darker than typical so the gap highlights and speed lines read clearly
- Game world scrolls downward infinitely (camera follows ball)

### Start Screen
- Title "DROP" — large, centered, bold
- Below: a simple animated preview — a ball falling and tilting through a gap (looping, built from game objects)
- "tilt to steer · fall through the gaps" instruction
- "tap to start" pulsing
- **Important**: The first tap triggers the iOS DeviceOrientation permission request. The game only starts after permission is granted (or fallback is activated). Show "allowing motion controls..." briefly during the permission flow.
- If touch fallback activates, change instruction to "touch left/right to steer"

### Death/Retry Screen
- Semi-transparent dark overlay
- "Score: X" centered
- "Best: Y" if applicable
- "NEW BEST" flash if applicable
- "tap to retry" pulsing
- Tap → instant restart

### HUD During Gameplay
- Score: top-center, 48px, white at 35% opacity
- Tilt mode indicator: tiny icon top-left (tilted phone icon or "TILT" text, very subtle) — confirms the tilt is active. If in touch fallback, show "TOUCH" instead.
- Nothing else on screen. The game is the UI.

### Colors
- Background: very dark charcoal (#0c0c14)
- Speed lines: white at 5-10% opacity (subtle, atmospheric)
- Player ball: bright green (#39ff14) — high visibility against dark bg, distinct from GAP's cyan and LAUNCH's orange
- Ball trail: same green, fading
- Platforms: cool dark gray (#1e1e32) at start, shifting toward (#2a1520) at high difficulty
- Gap edges glow: soft white (#ffffff) at 15% opacity
- Pass-through flash: white
- Score text: white, 35% opacity during play
- Milestone flash: white, full opacity, large
- Death overlay: standard dark + white text

### Typography
- System font stack: `-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`
- Title: 72px bold
- Score: 48px bold
- Death screen: 36px
- Instructions: 18px
- Milestone popups: 56px bold

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
    backgroundColor: '#0c0c14',
    scene: [GameScene],
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 }, // We control fall speed manually for tighter control
            debug: false
        }
    }
};
```

Note: gravity is 0 in the physics config because we manually control the ball's downward velocity. This gives us precise control over the fall speed curve rather than fighting with acceleration.

### Manual Fall Speed
```javascript
// In update()
this.fallSpeed = Math.min(this.baseFallSpeed + this.platformsPassed * 0.02, this.maxFallSpeed);
this.ball.y += this.fallSpeed;
// Move camera to follow
this.cameras.main.scrollY = this.ball.y - this.scale.height * 0.3; // Ball stays in upper 30% of view
```

### Tilt Handler
```javascript
let currentGamma = 0;
function handleOrientation(event) {
    currentGamma = event.gamma || 0;
}

// In update()
const deadZone = 3;
const sensitivity = 8;
const maxHSpeed = 400;
let hSpeed = 0;
if (Math.abs(currentGamma) > deadZone) {
    hSpeed = Phaser.Math.Clamp(currentGamma * sensitivity, -maxHSpeed, maxHSpeed);
}
this.ball.x += hSpeed * (delta / 1000); // delta in ms from update

// Screen wrapping
if (this.ball.x < 0) this.ball.x = this.scale.width;
if (this.ball.x > this.scale.width) this.ball.x = 0;
```

### Platform Generation
```javascript
generatePlatform(yPosition) {
    const screenW = this.scale.width;
    const gapWidth = Math.max(80 - Math.floor(this.platformsPassed / 5), 40);

    // Constrain gap position relative to previous gap
    let gapX;
    const maxShift = screenW * 0.7;
    do {
        gapX = Phaser.Math.Between(20 + gapWidth/2, screenW - 20 - gapWidth/2);
    } while (this.lastGapX !== null && Math.abs(gapX - this.lastGapX) > maxShift);

    this.lastGapX = gapX;

    // Draw two rectangles: left of gap, right of gap
    const leftWidth = gapX - gapWidth / 2;
    const rightStart = gapX + gapWidth / 2;
    const rightWidth = screenW - rightStart;

    // Create static bodies for both parts
    // Store gap info for collision checking
    return { y: yPosition, gapX: gapX, gapWidth: gapWidth, leftWidth, rightStart, rightWidth };
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
2. Tilting your phone steers the ball left/right with no perceptible lag
3. iOS permission prompt works correctly on first tap
4. Touch fallback activates automatically if tilt is unavailable
5. Platforms scroll up with gaps, and fall speed increases
6. Hitting a platform kills you, shows score, tap restarts
7. Screen wrapping works cleanly on both edges
8. High score persists
9. Playing it makes your body lean — you physically tilt trying to steer

That last point is the tilt game test. If people's bodies move with the phone, the controls are right.

---

## Iteration Prompts

- "Tilt is too [sensitive/sluggish]. Change sensitivity to X and dead zone to Y degrees."
- "The ball drifts when the phone is flat. Increase dead zone to X degrees."
- "I can't reach gaps in time. Increase max horizontal speed to X and/or widen the gap constraint to X% of screen width."
- "Falls feel too [fast/slow] at platform N. Adjust base fall speed to X and increment to Y per platform."
- "Screen wrapping is confusing. Add a ghost trail of Xms at the exit edge."
- "I want obstacles inside the gaps at high levels — small moving blocks that force you to time your pass-through."
- "Add collectible dots floating in some gaps that give +1 bonus score."
- "The gap highlight isn't visible enough. Increase glow opacity to X% and width to Ypx."
- "Add a 'zen mode' — constant speed, no difficulty increase, just meditative falling. Selectable from start screen."
- "I want the ball color to shift through a spectrum as score increases (green → blue → purple → pink)."
- "Platforms should occasionally have TWO gaps — one real, one narrower and riskier for +3 bonus."

---

## What NOT to Build Yet

- Sound / music
- Multiple game modes (zen mode is a good V2 feature)
- Leaderboards
- Cosmetics / skins
- Landscape support
- Obstacle variants inside gaps
- Collectibles
- Social sharing
- Analytics

The only question: **does tilting to fall feel natural?** If someone picks up the phone and instinctively tilts without reading instructions, the controls are right.
