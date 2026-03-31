# Game Testing

## Quick Start

```bash
bun test-game.ts CHAIN          # test one game
bun test-game.ts --all          # test all games
```

## What It Tests (Smoke Tests — no instrumentation needed)

| Check | What it catches | Example bug |
|-------|----------------|-------------|
| Page loads | Broken HTML, missing CDN | Script tag typo |
| Canvas exists | Phaser init failure | Bad config |
| Visible content | Black screen bugs | CHAIN rendering issue |
| No console errors | JS runtime errors | Undefined variables |
| Screenshot | Visual review artifact | Layout problems |
| CLAUDE.md exists | Missing game spec | Unbuildable game |

## Deep Tests (require `__GAME_STATE__` instrumentation)

| Check | What it catches |
|-------|----------------|
| Click changes state | Broken menu/start interaction |
| Score changes during play | Scoring system not wired up |
| Game not frozen | Infinite loop, stuck state |

## Adding Instrumentation to a Game

Add this block inside your Phaser scene's `update()` method:

```javascript
// Expose state for automated testing
window.__GAME_STATE__ = {
    phase: this.state,           // 'menu' | 'playing' | 'dead' | 'paused'
    score: this.score,           // current score
    level: this.level || null,   // current level (if applicable)
    lives: this.lives || null,   // remaining lives (if applicable)
    frameCount: this.game.loop.frame,  // for freeze detection
    time: this.gameTime || 0,    // session play time in seconds
};
```

**Rules:**
- `phase` is required — must be one of: `menu`, `playing`, `dead`, `paused`
- `score` is required — numeric
- `frameCount` is required — use `this.game.loop.frame`
- Other fields: expose if the game has them, `null` if not
- Expose at the END of `update()` so it reflects current frame

## Manual Test Extraction

Each CLAUDE.md contains testable assertions. Extract them as a checklist:

**Example from CHAIN/CLAUDE.md:**
- [ ] Chain of 3 scores 30 points
- [ ] Chain of 4 scores 60 points  
- [ ] Chain of 5 scores 100 points
- [ ] Loop clears ALL same-color pieces on board
- [ ] Drag back undoes last chain link
- [ ] Board reshuffles when no valid chains exist

**Example from BALANCE/CLAUDE.md:**
- [ ] Ball responds to device tilt
- [ ] Collecting dots increases score
- [ ] Falling in holes kills the player
- [ ] Holes appear over time

These are human-play checklists. The `__GAME_STATE__` instrumentation lets some of these be automated (score assertions, state transitions).

## Pipeline Integration

This test harness implements the same checks as `100-games/steps/06-test.md`:
- Phase 1 (Instrument) → `__GAME_STATE__` pattern above
- Phase 2 (Simulate) → `test-game.ts` pointer simulation
- Phase 3 (Measure) → JSON report output
- Phase 4 (Diagnose) → planned: `--fix` flag for auto-fixes

The `test-report.json` output matches the structure expected by the 100-games pipeline.
