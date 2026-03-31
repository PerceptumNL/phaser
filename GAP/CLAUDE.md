# GAP — Claude Code Build Brief

## What You're Building

A mobile-first reflex game called **GAP**. Single HTML file using Phaser 3 (loaded from CDN). The player is a dot. Walls close in from left and right with a gap somewhere. Tap to jump to the gap's height. Walls speed up. Die, see your score, tap to retry. That's the entire game.

The goal is a working prototype with no assets — just colored shapes — that proves whether the core mechanic is fun. Playable on a phone in portrait mode within 30 seconds of opening.

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
1. Player dot sits in the center of the screen
2. A wall (pair of rectangles) approaches from the right side, moving left
3. The wall has a gap at a random Y position
4. Player taps the screen → dot moves vertically to the tap's Y position (smooth tween, not teleport — ~100ms duration)
5. Wall passes through. If the dot is inside the gap, survive. If not, die.
6. Next wall comes. Repeat.
7. Walls get progressively faster and gaps get progressively narrower

### Player
- Simple filled circle, ~20px radius
- Fixed X position (roughly 30% from left edge — gives time to read the gap but not too much)
- Moves only vertically
- Movement: tween to tap Y position. Use `Phaser.Math.Linear` or a tween with `ease: 'Power2'`. Movement should feel snappy, not floaty — 80-120ms duration
- The dot should have a subtle pulsing glow or scale animation while idle, so it feels alive

### Walls
- Each wall is two rectangles: one from top of screen to gap-top, one from gap-bottom to bottom of screen
- Gap height: starts at 120px, minimum 60px (shrinks by ~2px per wall survived)
- Gap Y position: random, but always fully on screen (gap can't clip top or bottom)
- Wall X movement: starts at speed 3px/frame, increases by 0.05px/frame per wall survived
- Wall thickness: 30px
- New wall spawns when the previous wall's right edge is ~60% across the screen (so walls overlap at higher speeds — adds pressure)
- Color: walls should feel like obstacles — dark, solid, contrasting with background

### Collision
- Check when wall's X range overlaps with player dot's X range
- At that moment, check if player dot's Y center is within the gap (gap-top + margin to gap-bottom - margin, margin ~5px for forgiveness)
- If outside gap → death
- Be generous with hitboxes. Feeling unfairly killed destroys the one-more-try urge. Better to occasionally let a close call survive.

### Death
- Brief screen shake (4-6 frames, ±3px offset)
- Dot turns red, brief expand-then-fade animation
- Walls freeze
- After 300ms pause, show score overlay (see UI section)
- No long death animation — the restart friction must be near zero

### Scoring
- +1 per wall survived
- Display current score top-center, large font, semi-transparent so it doesn't distract
- High score persisted in localStorage
- On death screen: show "Score: X" and "Best: Y"

### Difficulty Curve
- Walls 1-5: Tutorial feel. Slow, wide gaps. Player builds confidence.
- Walls 6-15: Moderate. Gaps narrowing, speed increasing. Player starts concentrating.
- Walls 16-30: Challenging. Gaps getting tight. Speed forces quick decisions.
- Walls 30+: Expert. Minimum gap size, high speed. Survival is tense.
- The curve should be continuous (no sudden jumps), driven by the per-wall increments on speed and gap size
- Cap minimum gap at 60px and maximum speed at 8px/frame so it never becomes literally impossible

### Juice & Feel (Important)
This is what separates "meh" from addictive:
- **Screen shake on death** (mentioned above)
- **Score popup**: When surviving a wall, briefly flash "+1" near the dot, small, white, fades up and out over 400ms
- **Near miss**: If the dot survives but was within 10px of the wall edge, flash the screen border briefly (white flash, 100ms) — acknowledges the close call without punishing. Optional: vibrate using `navigator.vibrate(50)` if available
- **Speed lines**: At higher speeds (wall 15+), add subtle horizontal lines moving across the background to sell the feeling of increasing speed
- **Dot trail**: A very short motion trail (2-3 afterimages with decreasing opacity) when the dot moves vertically
- **Wall approach sound**: Not required for prototype, but if you want to add it, a rising tone as the wall approaches creates tension. Use Web Audio API, not audio files.

---

## UI Spec

### Layout (Portrait, Mobile)
- Game canvas fills the full viewport (`window.innerWidth` × `window.innerHeight`)
- Use `Phaser.Scale.RESIZE` scale mode so it adapts to any phone
- Background: dark (#0a0a0f or similar very dark blue-black)
- No UI chrome during gameplay except the score counter

### Start Screen
- Game title "GAP" — large, centered, bold
- "tap to start" below, pulsing opacity
- No menus, no options, no settings. Tap anywhere → game begins
- First wall should have a generous delay (1-2 seconds) so the player orients

### Death/Retry Screen
- Semi-transparent dark overlay
- "Score: X" centered
- "Best: Y" below it (only show if best > 0 and differs from current)
- "tap to retry" pulsing below
- Tap anywhere → restart instantly. Zero friction.
- If new high score, flash "NEW BEST" in an accent color

### Colors
- Background: very dark, almost black, with a subtle gradient or vignette
- Player dot: bright cyan or electric blue (#00e5ff range) — must pop against dark bg
- Walls: muted dark gray (#1a1a2e) with a slightly lighter edge so you can read the gap
- Gap: the absence of wall — the background shows through
- Score text: white, 40-50% opacity during gameplay
- Death screen text: white, full opacity
- Accent (near miss flash, new best): warm yellow or orange

### Typography
- Use system font stack for the prototype: `-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`
- Title: 72px bold
- Score during gameplay: 48px bold
- Death screen scores: 36px
- "tap to" prompts: 20px, lighter weight

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
    backgroundColor: '#0a0a0f',
    scene: [GameScene],
    physics: {
        default: 'arcade',
        arcade: { debug: false }
    }
};
```

### Scenes
Keep it to one scene (`GameScene`) with internal states: `'start'`, `'playing'`, `'dead'`. Don't overcomplicate with multiple scenes for a prototype.

### Touch Input
```javascript
this.input.on('pointerdown', (pointer) => {
    // pointer.y is where the player tapped
});
```
Make sure the game calls `this.scale.refresh()` on resize and handles orientation changes.

### Viewport Meta Tag
```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
```
Also prevent pull-to-refresh and overscroll:
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

### Performance
- Use `Phaser.GameObjects.Rectangle` for walls (no sprites needed)
- Use `Phaser.GameObjects.Arc` for the player dot
- Destroy walls after they pass off-screen left
- Object pool walls if you want to be thorough, but for a prototype it's fine to create/destroy
- Target 60fps. Test on a real phone, not just desktop DevTools mobile simulation.

### localStorage for High Score
```javascript
const best = parseInt(localStorage.getItem('gap-best') || '0');
localStorage.setItem('gap-best', Math.max(score, best));
```

---

## File Structure

Just one file:
```
index.html
```

That's it. Everything inline. CSS in a `<style>` tag, JS in a `<script>` tag after loading Phaser from CDN.

---

## Definition of Done

The prototype is done when:
1. You can open it on your phone and play immediately
2. Tapping moves the dot to where you tapped
3. Walls come from the right with gaps, and speed up over time
4. Hitting a wall kills you, shows your score, tap restarts
5. High score persists between sessions
6. It feels snappy — no input lag, no jank, deaths feel fair
7. You've played it 5+ times in a row without thinking about it

That last one is the real test.

---

## Iteration Prompts

After the first build, here are follow-up prompts to give Claude Code based on playtesting:

- "The dot movement feels [floaty/sluggish/too fast]. Change the tween duration to Xms and use [ease type]."
- "The gap is too [easy/hard] at wall N. Adjust the starting gap to Xpx and the shrink rate to Xpx per wall."
- "Deaths feel unfair. Increase the hitbox forgiveness margin to Xpx."
- "I want walls to come from alternating sides (left and right) after wall 20."
- "Add a combo system — surviving 5 walls in a row without moving gives a bonus."
- "Add a subtle background color shift as the score increases (dark blue → dark red at high scores)."
- "The near-miss detection isn't triggering. Debug by temporarily drawing the margin zone."

---

## What NOT to Build Yet

- Sound effects
- Multiple game modes
- Leaderboards
- Animations beyond what's specified
- Settings/options
- Landscape support
- Social sharing
- Analytics

All of these are valid later. None of them matter until the core mechanic is proven fun.
