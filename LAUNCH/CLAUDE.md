# LAUNCH — Claude Code Build Brief

## What You're Building

A mobile-first physics game called **LAUNCH**. Single HTML file using Phaser 3 (loaded from CDN). The player is a ball on a platform. Drag back to aim (slingshot mechanic), release to launch. Land on the next platform to survive. Platforms get smaller, further apart, and start moving. Overshoot or undershoot and you fall into the void. Tap to retry.

The core feeling: every launch is a tiny commitment. You aim, you release, you watch the arc, you hold your breath. Every death is clearly your fault. That's what makes you retry.

---

## Technical Stack

- **Single file**: `index.html` containing everything
- **Phaser 3**: Load from CDN `https://cdn.jsdelivr.net/npm/phaser@3.80.1/dist/phaser.min.js`
- **No build tools, no npm, no bundler** — just one HTML file you can open or deploy
- **Target**: Mobile Chrome/Safari, portrait orientation, touch input
- **Deploy target**: Cloudflare Pages (just drag the file into a Pages project)

---

## Game Design Spec

### Core Loop
1. Player ball sits on a platform on the left side of the screen
2. A target platform is visible to the right (and possibly higher or lower)
3. Player touches the ball and drags backward (away from the target) — a trajectory guide appears
4. Release to launch. The ball follows a physics arc.
5. Land on the platform → score a point, camera shifts, new target platform appears
6. Miss the platform → fall into the void → die
7. Platforms get progressively smaller, further away, and start moving

### The Slingshot Mechanic (This Is the Game)
- Touch and hold on or near the ball (generous touch area — 60px radius around the ball center)
- Drag away from the target direction. The further you drag, the more power.
- A dotted trajectory line shows the predicted arc (5-8 dots, fading opacity) — this is critical for the game feeling fair
- The trajectory line should be an approximation, not perfectly accurate — slight inaccuracy at high power keeps it skill-based
- Release to launch
- **Max drag distance**: 150px. Beyond that, no additional power (prevents wild launches)
- **Power mapping**: Linear. Drag distance maps proportionally to launch velocity. Min velocity at 20px drag, max at 150px.
- **Angle**: Determined by the angle from ball center to touch point, then inverted (slingshot). If you drag down-left, the ball launches up-right.
- **Aiming feel**: The drag should feel like pulling back a rubber band. The ball should shift slightly in the drag direction (3-5px max) to sell the tension.

### Physics
- Use Phaser Arcade Physics for simplicity
- Gravity Y: 800 (tweak based on feel — should give a satisfying arc, not floaty, not a bullet)
- Ball is a circle body, radius 15px
- Ball has slight bounce on landing: `bounce: 0.3` — enough to feel physical, not enough to bounce off the platform
- After landing, the ball must come to rest. Apply friction/damping so it doesn't slide off. Use `setDrag(200)` or manually reduce velocity on platform contact.
- Ball rotation: enable, so it visually rolls. Adds to the physics feel even though it doesn't affect gameplay.

### Platforms
- Rectangles with slightly rounded visual corners (draw with Graphics, not Rectangle, for the rounded look)
- Starting platform (first one): generous width, 120px
- Target platforms: start at 100px wide, shrink by 3px per level, minimum 40px
- Platform height/thickness: 16px
- Vertical position: random within a band. Target platform Y should be within ±150px of the current platform Y, clamped so it's never off screen
- Horizontal distance: starts at 200px gap, increases by 10px per level, max 400px
- Platforms are static bodies — they don't move under physics

### Platform Behaviors (Progressive Difficulty)
- **Levels 1-5**: Static platforms. Learning the slingshot.
- **Levels 6-12**: Platforms start being placed at more extreme vertical offsets (higher/lower). Tests angle control.
- **Levels 13-20**: Some platforms move vertically (slow sine wave, amplitude 40px, period 2s). Player must time the release.
- **Levels 21+**: Platforms move faster, some move horizontally (small range, 30px), and gap distances are at max. Pure skill.
- Moving platform speed: `Math.sin(time * 0.002) * amplitude` for smooth oscillation

### Camera
- Camera follows the player ball horizontally with a slight lead (offset toward the right so you can see where you're going)
- When the ball lands on a new platform, smoothly pan the camera to center on the new resting position over 300ms
- Camera should never show empty space below the platforms — set a world bound or tint the bottom area
- Vertical camera: follow the ball Y loosely, with some slack so small hops don't jerk the view

### Landing Detection
- Ball overlaps with platform from above (ball velocity Y > 0, ball bottom edge within 20px above platform top edge)
- On successful land: ball stops, sticks to platform. Brief settle animation.
- Be generous — if the ball clips the edge of the platform even slightly, count it as landed. Unfair deaths kill the retry urge.
- If the ball lands but is rolling and goes over the edge: that counts as a death. The player had their chance.

### Falling / Death
- If ball Y goes below the lowest visible platform by 200px → death
- If ball X goes beyond the target platform's right edge by 300px (overshot) → death
- Death trigger: ball falls into the void below

### Death Sequence
- Ball shrinks and fades as it falls (tween scale to 0.3, alpha to 0 over 500ms)
- Brief screen shake (lighter than GAP — 3 frames, ±2px)
- Dark overlay fades in
- Show score, best, retry prompt
- Tap → instant restart. Zero friction.

### Scoring
- +1 per successful platform landing
- Bonus: "Perfect" landing if the ball lands within the center 30% of the platform → flash "PERFECT" text, score +2 instead of +1
- Display current score top-center, semi-transparent
- High score in localStorage (`launch-best`)

### Juice & Feel
- **Trajectory dots**: 6 dots along predicted arc, decreasing opacity and size. Appear on drag, disappear on release.
- **Launch burst**: Small particle burst (4-6 tiny circles) from the launch point on release, in the opposite direction of travel. Fades in 200ms.
- **Landing impact**: Brief squash on the ball (scale to 1.3x wide, 0.7x tall, then bounce back over 150ms). Tiny dust particles (2-3 circles) at the landing point.
- **Platform glow**: The target platform has a subtle pulse glow (border or shadow) so the player always knows where to aim. Turns off once landed.
- **Near miss**: If the ball lands within 5px of the platform edge, flash "CLOSE!" text briefly. Acknowledges the tension.
- **Stretch on flight**: While airborne, ball stretches slightly in the direction of travel (subtle, 1.1x on the velocity axis). Makes it feel fast.
- **Power indicator**: As drag distance increases, the trajectory dots spread further apart and shift color from white to yellow to orange-red at max power. Communicates power without numbers.
- **Vibration**: `navigator.vibrate(30)` on launch, `navigator.vibrate(15)` on land, if available.

---

## UI Spec

### Layout (Portrait, Mobile)
- Game canvas fills full viewport (`window.innerWidth` × `window.innerHeight`)
- `Phaser.Scale.RESIZE` scale mode
- Background: deep dark navy (#08081a) with a subtle vertical gradient getting slightly lighter toward the top (suggests sky)
- Platforms sit in the lower 70% of the screen. Upper 30% is open sky area for high arcs.

### Start Screen
- Game title "LAUNCH" — large, centered, bold
- Simple illustration: a ball on a platform with a dotted arc to another platform (built from game objects, not an image)
- "drag to aim · release to fly" instruction text below
- "tap to start" pulsing
- On tap → first platform appears with the ball, generous first target platform

### Death/Retry Screen
- Semi-transparent dark overlay
- "Score: X" centered
- "Best: Y" below (if different and best > 0)
- "NEW BEST" accent flash if applicable
- "tap to retry" pulsing
- Tap → instant restart

### Colors
- Background: deep navy gradient (#08081a bottom to #0f1128 top)
- Player ball: warm orange (#ff6b35) — needs to pop against the dark and be visible mid-arc
- Ball trail: same orange, fading opacity
- Platforms: solid cool gray (#2a2a4a) with a 1px lighter top edge (#3d3d6b) for readability
- Target platform glow: soft cyan (#00e5ff) at low opacity, pulsing
- Trajectory dots: white → yellow → orange-red based on power
- Score text: white, 40% opacity during gameplay
- "PERFECT" text: gold (#ffd700)
- "CLOSE!" text: cyan (#00e5ff)
- Death screen: white text, full opacity

### Typography
- System font stack: `-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`
- Title: 72px bold
- Score during gameplay: 48px bold
- Death screen scores: 36px
- Instruction / prompt text: 18px, lighter weight
- "PERFECT" / "CLOSE!" popups: 28px bold

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
    backgroundColor: '#08081a',
    scene: [GameScene],
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 800 },
            debug: false
        }
    }
};
```

### Slingshot Input
```javascript
// On pointerdown near the ball
this.input.on('pointerdown', (pointer) => {
    if (Phaser.Math.Distance.Between(pointer.x, pointer.y, ball.x, ball.y) < 60) {
        this.isDragging = true;
        this.dragStart = { x: pointer.x, y: pointer.y };
    }
});

// On pointermove — update trajectory preview
this.input.on('pointermove', (pointer) => {
    if (!this.isDragging) return;
    const dx = this.dragStart.x - pointer.x;
    const dy = this.dragStart.y - pointer.y;
    const distance = Math.min(Math.sqrt(dx*dx + dy*dy), 150);
    const angle = Math.atan2(dy, dx);
    // Invert for slingshot: launch direction is opposite of drag
    const launchAngle = angle; // drag left → launch right (already correct since dx is start-current)
    const power = distance / 150; // 0 to 1
    this.drawTrajectory(ball.x, ball.y, launchAngle, power);
});

// On pointerup — launch
this.input.on('pointerup', (pointer) => {
    if (!this.isDragging) return;
    this.isDragging = false;
    // Calculate and apply velocity
    const dx = this.dragStart.x - pointer.x;
    const dy = this.dragStart.y - pointer.y;
    const distance = Math.min(Math.sqrt(dx*dx + dy*dy), 150);
    if (distance < 20) return; // Too short, cancel
    const maxVelocity = 600;
    const power = distance / 150;
    const angle = Math.atan2(dy, dx);
    ball.body.setVelocity(
        Math.cos(angle) * maxVelocity * power,
        Math.sin(angle) * maxVelocity * power
    );
    this.clearTrajectory();
});
```

### Trajectory Preview
```javascript
drawTrajectory(startX, startY, angle, power) {
    this.clearTrajectory();
    const maxVel = 600;
    const vx = Math.cos(angle) * maxVel * power;
    const vy = Math.sin(angle) * maxVel * power;
    const gravity = 800;
    const dots = 7;
    const timeStep = 0.08; // seconds between dots

    for (let i = 1; i <= dots; i++) {
        const t = i * timeStep;
        const x = startX + vx * t;
        const y = startY + vy * t + 0.5 * gravity * t * t;
        const alpha = 1 - (i / dots) * 0.7;
        const radius = 4 - (i / dots) * 2;
        // Draw dot at (x, y) with given alpha and radius
        const dot = this.add.circle(x, y, radius, 0xffffff, alpha);
        this.trajectoryDots.push(dot);
    }
}
```

### Platform Generation
```javascript
generateNextPlatform(currentX, currentY, level) {
    const gapX = Math.min(200 + level * 10, 400);
    const width = Math.max(100 - level * 3, 40);
    const offsetY = Phaser.Math.Between(-150, 150);
    const newX = currentX + gapX + width / 2;
    const newY = Phaser.Math.Clamp(currentY + offsetY, 100, this.scale.height - 100);

    const platform = this.physics.add.staticBody();
    // Draw platform rectangle at (newX, newY) with given width
    return { x: newX, y: newY, width: width, body: platform };
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

### Camera Follow
```javascript
// Smooth follow on X with lead
this.cameras.main.startFollow(ball, true, 0.1, 0.05, -100, 0);
// The -100 offsetX gives forward visibility
```

---

## Definition of Done

The prototype is done when:
1. You can open it on your phone and play immediately
2. Dragging back from the ball shows a trajectory preview
3. Releasing launches the ball along the previewed arc
4. Landing on a platform scores a point and generates a new target
5. Missing a platform results in death, score shown, tap to retry
6. Platforms get smaller and further apart as score increases
7. Moving platforms appear after level 12
8. The slingshot feels precise — you feel in control of every launch
9. You catch yourself thinking "I can definitely make that one" after dying

---

## Iteration Prompts

After the first build, use these based on playtesting:

- "The arc feels too [floaty/fast]. Change gravity to X and max velocity to Y."
- "I can't reach distant platforms. Increase max drag distance to Xpx and max velocity to Y."
- "Landing feels slippery — the ball slides off. Increase drag to X and reduce bounce to Y."
- "The trajectory preview is too [accurate/inaccurate]. Adjust the timeStep to X or add random offset of ±Ypx to each dot."
- "Platforms are too [easy/hard] to land on at level N. Adjust starting width to Xpx and shrink rate to Ypx per level."
- "Moving platforms are too unpredictable. Slow the sine period to Xs and reduce amplitude to Ypx."
- "I want a wind mechanic after level 25 — a constant horizontal force that the player can see (particles drifting) and must compensate for."
- "Add a 'sticky' platform type that stops the ball instantly on contact — appears randomly from level 15+."
- "The camera is too jerky / too loose. Adjust lerp to X for horizontal and Y for vertical."
- "I want the background to shift from night to sunrise as the score increases (deep navy → warm amber at score 50)."
- "Add a 'crumbling' platform that breaks 1.5 seconds after landing — forces the player to launch quickly."

---

## What NOT to Build Yet

- Sound effects
- Multiple game modes
- Leaderboards
- Character selection / cosmetics
- Landscape support
- Social sharing
- Analytics
- Wind mechanics (save for iteration)
- Power-ups

The only question that matters right now: **does the slingshot feel good?** Everything else comes after that answer is yes.
