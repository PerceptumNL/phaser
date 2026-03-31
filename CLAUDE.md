# Bollenstreek Blitz

## What This Is

A top-down delivery runner game built with Phaser 3. You're a bike courier racing through the Duin- en Bollenstreek region, picking up packages from local businesses and delivering them before time runs out.

**Primary goals:**
1. Fun, polished game that works on mobile and desktop
2. Test case for the Daily Game Factory pipeline (proving Claude Code can ship Phaser games)
3. Marketing potential for Bollenstreek Digitaal — local businesses appear as in-game clients

**Scope: Minimal v1** — one game mode, 5-10 levels, ship fast. No accounts, no social, no leaderboard. Just a URL you can share.

---

## Tech Stack

- **Phaser 3** (via npm: `phaser`)
- **Vite** for dev/build
- **TypeScript** (preferred, JS acceptable)
- **No CSS framework needed** — Phaser handles all rendering
- **Deploy target:** Static site (Cloudflare Pages)

---

## Game Design

### Core Loop

1. Level starts → you see the map, your bike, and the first pickup marker
2. Ride to the pickup location (a local business)
3. Pick up the package (ride over the marker)
4. Delivery destination appears on the map
5. Navigate there before the timer runs out
6. Deliver → score points → next package or level complete
7. Miss the timer → lose a life → 3 lives total

Session length: 2-3 minutes per level.

### The Map

Top-down tile-based map. Each level uses the same base map but with different pickup/delivery locations and increasing obstacles.

**Tile types:**
- Road (bike path) — fast movement
- Sand/beach — slower movement
- Tulip field — cannot cross (walls)
- Water/canal — cannot cross (walls)
- Building — cannot cross (walls)
- Cobblestone (town center) — medium speed

**Map size:** 40x30 tiles, camera follows the player with the map scrolling.

**Map layout concept:** A simplified version of the Noordwijk–Lisse–Katwijk triangle:
- Left side: beach/coast with a boulevard
- Center: town with buildings, narrow streets, a central square
- Right side: tulip fields in colored stripes, open roads between them
- Canals running horizontally dividing the areas
- Bridges at specific points (some may open/close as obstacles in later levels)

For v1, design ONE hand-crafted map. No procedural generation.

### Player (The Courier)

- Top-down bike sprite, 8-directional movement
- Input: arrow keys / WASD on desktop, virtual joystick on mobile
- Physics: slight momentum (doesn't stop instantly), affected by surface type
- Speed varies by surface: road = 1.0x, cobblestone = 0.8x, sand = 0.5x
- Collision with walls stops movement

### Obstacles (introduced per level)

| Level | New obstacle | Behavior |
|-------|-------------|----------|
| 1-2 | None | Learn the map, simple deliveries |
| 3 | Tourists | Slow-moving NPCs on the boulevard, block your path |
| 4 | Wind gusts | Periodic lateral push (arrow indicator before it hits) |
| 5 | Drawbridge | Bridge over canal opens/closes on a timer |
| 6 | Delivery van | Parked vans blocking narrow streets (find alternate route) |
| 7 | Rain | Reduced visibility (fog effect), slippery controls |
| 8+ | Combinations | Multiple obstacle types simultaneously |

### Scoring

- **Base delivery score:** 100 points
- **Time bonus:** +10 per second remaining on timer
- **Combo bonus:** consecutive deliveries without losing a life = 1.5x, 2x, 2.5x multiplier
- **Level clear bonus:** 500 points

### Levels (5-10 for v1)

Each level defines:
- Number of deliveries required to complete (2-5)
- Time per delivery in seconds (starts generous, gets tighter)
- Which obstacles are active
- Which businesses appear as pickup/delivery points

```
Level 1: 2 deliveries, 45s each, no obstacles
Level 2: 2 deliveries, 40s each, no obstacles
Level 3: 3 deliveries, 40s each, tourists
Level 4: 3 deliveries, 35s each, tourists + wind
Level 5: 3 deliveries, 35s each, tourists + drawbridge
Level 6: 4 deliveries, 30s each, tourists + vans
Level 7: 4 deliveries, 30s each, rain + wind
Level 8: 4 deliveries, 25s each, all obstacles
Level 9: 5 deliveries, 25s each, all obstacles (harder placement)
Level 10: 5 deliveries, 20s each, all obstacles, boss level
```

### Businesses (Pickup/Delivery Points)

These are the "characters" of the game. Each has a name, icon, and map location.

```js
const BUSINESSES = [
  { id: "bloemen", name: "Bloemen van Dijk", icon: "tulip", area: "fields" },
  { id: "hotel", name: "Hotel Zeezicht", icon: "bed", area: "boulevard" },
  { id: "viswinkel", name: "Verse Vis Katwijk", icon: "fish", area: "coast" },
  { id: "bakker", name: "Bakkerij de Bollenstreek", icon: "bread", area: "center" },
  { id: "fietsenmaker", name: "Fietshoek Noordwijk", icon: "wrench", area: "center" },
  { id: "strandtent", name: "Strandpaviljoen Zuid", icon: "umbrella", area: "beach" },
  { id: "kaaswinkel", name: "Kaas & Meer", icon: "cheese", area: "center" },
  { id: "surfschool", name: "Surfschool de Kust", icon: "wave", area: "coast" },
];
```

For v1 these are fictional. In a future version, real local businesses could sponsor/replace them.

---

## Visual Direction

### Aesthetic: Cheerful Dutch Pixel Art

Not dark/neon — this is a sunny coastal Dutch town. Think: colorful, clean pixel art with a warm palette.

**Color palette:**
- Sky/water: `#87CEEB` (light blue)
- Tulip fields: stripes of `#FF6B6B` (red), `#FFD93D` (yellow), `#FF8FA3` (pink), `#C77DFF` (purple)
- Sand/beach: `#F4D35E`
- Roads: `#8D99AE` (cool gray)
- Buildings: `#E8D5B7` (warm beige) with `#D4A574` (terracotta) roofs
- Grass/parks: `#95D5B2`
- Water/canals: `#5390D9`
- UI accent: `#FF6B35` (Dutch orange)

**Tile size:** 32x32 pixels

**Sprite style:** Simple, charming, 16x16 or 32x32 character sprites. The bike courier should have a visible delivery bag on the back. Tourists are colorful blobs with cameras.

### UI

- **HUD (always visible):** Timer (prominent, center-top), Score (top-right), Lives as bike icons (top-left), Current delivery info (bottom — pickup name + arrow pointing to destination)
- **Mini-map:** Small overview in corner showing full map with player dot and destination marker
- **Level intro:** Quick overlay — "Level 3: Tourists on the boulevard!" with a 3-2-1 countdown
- **Level complete:** Score summary, star rating (1-3 based on time bonus), "Next Level" button
- **Game over:** Final score, "Try Again" button

### Animations & Juice

- Bike wheels spin during movement
- Package pickup: brief scale-up "pop" + particle burst
- Delivery complete: confetti particles + screen flash
- Timer warning: HUD timer turns red + pulses when < 10 seconds
- Wind gusts: visible particle streaks across screen before push
- Tourist bumps: small bounce-back + "!" speech bubble

---

## Technical Architecture

### Project Structure

```
bollenstreek-blitz/
├── CLAUDE.md                  ← this file
├── package.json
├── vite.config.ts
├── index.html
├── public/
│   └── assets/               ← all game assets
│       ├── sprites/
│       ├── tiles/
│       ├── ui/
│       └── audio/
└── src/
    ├── main.ts               ← Phaser game config + boot
    ├── config/
    │   ├── levels.ts          ← level definitions
    │   └── businesses.ts      ← business data
    ├── scenes/
    │   ├── BootScene.ts       ← asset loading
    │   ├── MenuScene.ts       ← title screen
    │   ├── GameScene.ts       ← main gameplay
    │   ├── HUDScene.ts        ← overlay UI (runs parallel to GameScene)
    │   ├── LevelCompleteScene.ts
    │   └── GameOverScene.ts
    ├── entities/
    │   ├── Player.ts          ← bike courier
    │   ├── Tourist.ts         ← obstacle NPC
    │   └── Marker.ts          ← pickup/delivery point
    ├── systems/
    │   ├── DeliveryManager.ts ← handles pickup/delivery logic
    │   ├── ObstacleManager.ts ← spawns/manages obstacles per level
    │   ├── WindSystem.ts      ← wind gust logic
    │   └── ScoreManager.ts    ← scoring + combo tracking
    └── utils/
        └── MapBuilder.ts      ← tilemap construction
```

### Phaser Configuration

```ts
const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  parent: "game-container",
  backgroundColor: "#87CEEB",
  physics: {
    default: "arcade",
    arcade: { debug: false }
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [BootScene, MenuScene, GameScene, HUDScene, LevelCompleteScene, GameOverScene],
};
```

### Asset Strategy for v1

**Do NOT spend time on elaborate pixel art.** Use simple geometric shapes and Phaser's built-in graphics drawing for v1:

- **Tiles:** Generated programmatically (colored rectangles with simple borders/patterns)
- **Player:** Simple drawn sprite (circle body + triangle for direction + rectangle for bag)
- **Tourists:** Colored circles with smaller circle heads
- **Business markers:** Colored circles with emoji-style icons (drawn with Phaser text)
- **Obstacles:** Simple shapes with clear color coding

This keeps the build fast. Art can be upgraded later without changing any game logic.

### Mobile Controls

Use a virtual joystick plugin or build a simple one:
- Left thumb: movement joystick (bottom-left quadrant)
- Touch-based, shows on mobile only
- Desktop: arrow keys / WASD

Recommended: `phaser3-rex-plugins` has a virtual joystick, or build a minimal custom one with Phaser's input pointer tracking.

### Tilemap

For v1, define the map as a 2D array in code (no Tiled editor needed):

```ts
// 0=road, 1=building, 2=tulip, 3=water, 4=sand, 5=cobblestone, 6=grass, 7=bridge
const MAP: number[][] = [
  // 40 columns × 30 rows
  // ... hand-designed
];
```

Camera follows the player with `this.cameras.main.startFollow(player)` and appropriate bounds.

### State Persistence

`localStorage` for:
- Highest level reached
- High score
- Per-level best score and star rating

No backend needed for v1.

---

## Build Order (for Claude Code)

Build in this exact sequence. Each step should be testable before moving to the next.

### Step 1: Scaffold + Boot
- `npm create vite@latest` with TypeScript
- Install Phaser 3
- Create BootScene that shows "Loading..." text
- Create MenuScene with title text and a "Play" button (Phaser text object)
- Verify: game boots, shows menu, button is clickable

### Step 2: Map + Player Movement
- Define the tile map as a 2D array
- Render tiles as colored rectangles in GameScene
- Create player as a simple drawn shape
- Add arrow key movement with arcade physics
- Add collision with wall tiles
- Add camera follow
- Verify: player moves around the map, can't walk through walls, camera scrolls

### Step 3: Pickup/Delivery System
- Create Marker class (pickup and delivery points)
- Create DeliveryManager
- On level start: show first pickup marker
- Player overlaps pickup → package collected → show delivery marker
- Player overlaps delivery → delivery complete → score awarded
- Add timer per delivery
- Verify: can complete a full pickup-delivery cycle with timer

### Step 4: Level Flow
- Define level configs (deliveries, time, obstacles)
- Level intro overlay with countdown
- Level complete scene with score + stars
- Game over scene
- Level progression (complete → next level)
- Lives system (3 lives, lose one per failed delivery)
- Verify: can play through levels 1-3 with progression

### Step 5: Obstacles
- Tourist NPCs (simple pathfinding along roads)
- Wind system (periodic gusts with visual indicator)
- Drawbridge (opens/closes on timer, blocks path when open)
- Parked vans (static obstacles on roads)
- Rain effect (particle overlay + reduced visibility)
- Verify: each obstacle type works independently

### Step 6: HUD + Juice
- HUD scene overlay (timer, score, lives, delivery info)
- Direction arrow pointing to current target
- Mini-map
- Particle effects (pickup pop, delivery confetti, wind streaks)
- Screen shake on collisions
- Timer warning animation
- Sound effects (if time permits — simple generated beeps/boops)
- Verify: game feels polished and responsive

### Step 7: Mobile + Deploy
- Virtual joystick for touch input
- Test at various screen sizes (Phaser Scale.FIT handles most of this)
- Build for production (`vite build`)
- Deploy to Cloudflare Pages
- Verify: playable on phone via shared URL

---

## Acceptance Criteria for v1

- [ ] Game loads in < 3 seconds
- [ ] Playable on mobile (iOS Safari, Chrome Android) with touch controls
- [ ] Playable on desktop with keyboard
- [ ] 8-10 levels with increasing difficulty
- [ ] At least 3 distinct obstacle types working
- [ ] Score tracking with localStorage persistence
- [ ] No crashes or soft-locks during normal play
- [ ] Level complete + game over screens work correctly
- [ ] Fun to play for at least 10 minutes (the real test)
