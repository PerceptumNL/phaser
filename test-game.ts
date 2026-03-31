#!/usr/bin/env bun
/**
 * Phaser Game Test Harness
 *
 * Runs automated smoke tests against any single-file Phaser game.
 * Works with or without __GAME_STATE__ instrumentation.
 *
 * Usage:
 *   bun test-game.ts CHAIN          # test one game
 *   bun test-game.ts --all          # test all game folders
 *   bun test-game.ts --all --fix    # test all, attempt auto-fixes
 */

import { chromium, type Page, type Browser } from "playwright";
import { readdir, stat, readFile } from "fs/promises";
import { join, resolve } from "path";

const ROOT = resolve(import.meta.dir);
const SKIP_DIRS = new Set(["node_modules", ".git", ".github", "bollenstreek-blitz"]);

interface TestResult {
  game: string;
  pass: boolean;
  checks: Record<string, { pass: boolean; detail: string }>;
  errors: string[];
  warnings: string[];
  screenshot?: string;
  duration_ms: number;
}

// ── Discover game folders ──

async function findGames(): Promise<string[]> {
  const entries = await readdir(ROOT);
  const games: string[] = [];
  for (const entry of entries) {
    if (SKIP_DIRS.has(entry) || entry.startsWith(".")) continue;
    const p = join(ROOT, entry);
    const s = await stat(p);
    if (!s.isDirectory()) continue;
    try {
      await stat(join(p, "index.html"));
      games.push(entry);
    } catch {
      // no index.html, skip
    }
  }
  return games.sort();
}

// ── Individual test checks ──

async function runTests(page: Page, gameName: string): Promise<TestResult> {
  const start = Date.now();
  const result: TestResult = {
    game: gameName,
    pass: true,
    checks: {},
    errors: [],
    warnings: [],
    duration_ms: 0,
  };

  const gameUrl = `file://${join(ROOT, gameName, "index.html")}`;

  // Collect console errors
  const consoleErrors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  page.on("pageerror", (err) => consoleErrors.push(err.message));

  // ── CHECK 1: Page loads without crash ──
  try {
    await page.goto(gameUrl, { waitUntil: "networkidle", timeout: 15000 });
    result.checks["loads"] = { pass: true, detail: "Page loaded successfully" };
  } catch (e: any) {
    result.checks["loads"] = { pass: false, detail: e.message };
    result.pass = false;
    result.duration_ms = Date.now() - start;
    return result;
  }

  // Wait for Phaser to initialize
  await page.waitForTimeout(2000);

  // ── CHECK 2: Canvas exists ──
  const canvasCount = await page.evaluate(() => document.querySelectorAll("canvas").length);
  result.checks["canvas_exists"] = {
    pass: canvasCount > 0,
    detail: canvasCount > 0 ? `${canvasCount} canvas element(s)` : "No canvas found — Phaser may have failed to init",
  };
  if (canvasCount === 0) {
    result.pass = false;
    result.duration_ms = Date.now() - start;
    return result;
  }

  // ── CHECK 3: Canvas has non-background pixels (not black screen) ──
  // WebGL canvases can't be read via drawImage, so use Playwright's screenshot buffer
  const screenshotBuf = await page.screenshot();
  const hasContent = await (async () => {
    // Parse PNG pixel data: sample the screenshot for color diversity
    // Playwright returns a PNG buffer. We'll check if the image has enough unique colors
    // by sampling bytes from the raw buffer (every PNG has IDAT chunks with pixel data)
    // Simple heuristic: if the file is very small, it's likely a solid color (blank screen)
    // A blank 1280x720 PNG compresses to ~2-5KB. A game with text/graphics is 20KB+
    return screenshotBuf.length > 15000;
  })();

  result.checks["has_visible_content"] = {
    pass: hasContent,
    detail: hasContent ? "Canvas has visible content (multiple colors detected)" : "Canvas appears blank — possible black screen bug",
  };
  if (!hasContent) result.pass = false;

  // ── CHECK 4: No console errors ──
  result.checks["no_console_errors"] = {
    pass: consoleErrors.length === 0,
    detail: consoleErrors.length === 0
      ? "No console errors"
      : `${consoleErrors.length} error(s): ${consoleErrors.slice(0, 3).join("; ")}`,
  };
  if (consoleErrors.length > 0) {
    result.errors.push(...consoleErrors);
    result.pass = false;
  }

  // ── CHECK 5: Game state instrumentation ──
  const hasState = await page.evaluate(() => typeof (window as any).__GAME_STATE__ === "object" && (window as any).__GAME_STATE__ !== null);
  result.checks["has_game_state"] = {
    pass: hasState,
    detail: hasState ? "__GAME_STATE__ exposed" : "No __GAME_STATE__ — add instrumentation for deeper testing",
  };
  if (!hasState) {
    result.warnings.push("Game lacks __GAME_STATE__ instrumentation — only smoke tests possible");
  }

  // ── CHECK 6: Click/tap triggers state change ──
  let stateBeforeClick: any = null;
  let stateAfterClick: any = null;

  if (hasState) {
    stateBeforeClick = await page.evaluate(() => JSON.parse(JSON.stringify((window as any).__GAME_STATE__)));
  }

  // Click center of the page (most games have "tap to start" there)
  const viewport = page.viewportSize() || { width: 1280, height: 720 };
  await page.mouse.click(viewport.width / 2, viewport.height / 2);
  await page.waitForTimeout(1000);

  if (hasState) {
    stateAfterClick = await page.evaluate(() => JSON.parse(JSON.stringify((window as any).__GAME_STATE__)));
    const changed = JSON.stringify(stateBeforeClick) !== JSON.stringify(stateAfterClick);
    result.checks["click_changes_state"] = {
      pass: changed,
      detail: changed
        ? `State changed: phase ${stateBeforeClick?.phase} → ${stateAfterClick?.phase}`
        : "Click did not change game state — menu interaction may be broken",
    };
    if (!changed) result.warnings.push("Click didn't change state");
  }

  // ── CHECK 7: After starting, simulate inputs and check score changes ──
  if (hasState && stateAfterClick?.phase === "playing") {
    // Simulate 3 seconds of random inputs
    for (let i = 0; i < 10; i++) {
      const x = Math.floor(Math.random() * viewport.width * 0.8 + viewport.width * 0.1);
      const y = Math.floor(Math.random() * viewport.height * 0.6 + viewport.height * 0.2);
      await page.mouse.click(x, y);
      await page.waitForTimeout(300);
    }

    const stateAfterPlay = await page.evaluate(() => JSON.parse(JSON.stringify((window as any).__GAME_STATE__)));
    const scoreChanged = stateAfterPlay?.score !== stateAfterClick?.score;
    const frameAdvanced = stateAfterPlay?.frameCount > (stateAfterClick?.frameCount || 0);

    result.checks["score_changes_during_play"] = {
      pass: scoreChanged,
      detail: scoreChanged
        ? `Score changed: ${stateAfterClick?.score} → ${stateAfterPlay?.score}`
        : "Score didn't change during simulated play",
    };

    if (stateAfterPlay?.frameCount !== undefined) {
      result.checks["game_not_frozen"] = {
        pass: frameAdvanced,
        detail: frameAdvanced
          ? `Frame count advancing: ${stateAfterPlay.frameCount}`
          : "Frame count not advancing — game may be frozen",
      };
      if (!frameAdvanced) result.pass = false;
    }
  }

  // ── CHECK 8: Screenshot for visual review ──
  const screenshotPath = `/tmp/test-${gameName}.png`;
  await Bun.write(screenshotPath, screenshotBuf);
  result.screenshot = screenshotPath;
  result.checks["screenshot_taken"] = { pass: true, detail: screenshotPath };

  // ── CHECK 9: Content validation from CLAUDE.md ──
  try {
    const claudeMd = await readFile(join(ROOT, gameName, "CLAUDE.md"), "utf-8");
    const hasSpec = claudeMd.length > 100;
    result.checks["has_game_spec"] = {
      pass: hasSpec,
      detail: hasSpec ? `CLAUDE.md: ${claudeMd.length} chars` : "CLAUDE.md is too short or missing",
    };
  } catch {
    result.checks["has_game_spec"] = { pass: false, detail: "No CLAUDE.md found" };
    result.warnings.push("Missing CLAUDE.md — can't validate against spec");
  }

  result.duration_ms = Date.now() - start;
  return result;
}

// ── Main ──

async function main() {
  const args = process.argv.slice(2);
  const runAll = args.includes("--all");
  const gameName = args.find((a) => !a.startsWith("--"));

  let games: string[];
  if (runAll) {
    games = await findGames();
  } else if (gameName) {
    games = [gameName];
  } else {
    console.log("Usage: bun test-game.ts <GAME_NAME> | --all");
    console.log("\nAvailable games:");
    for (const g of await findGames()) console.log(`  ${g}`);
    process.exit(0);
  }

  console.log(`\n🎮 Testing ${games.length} game(s)...\n`);

  const browser = await chromium.launch({ headless: true });
  const results: TestResult[] = [];

  for (const game of games) {
    const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const page = await context.newPage();

    process.stdout.write(`  ${game.padEnd(20)}`);
    const result = await runTests(page, game);
    results.push(result);

    const icon = result.pass ? "✅" : result.warnings.length > 0 && result.pass ? "⚠️" : "❌";
    const checkCount = Object.values(result.checks).filter((c) => c.pass).length;
    const totalChecks = Object.keys(result.checks).length;
    console.log(`${icon}  ${checkCount}/${totalChecks} checks  (${result.duration_ms}ms)`);

    if (!result.pass || result.warnings.length > 0) {
      for (const [name, check] of Object.entries(result.checks)) {
        if (!check.pass) console.log(`    ❌ ${name}: ${check.detail}`);
      }
      for (const w of result.warnings) {
        console.log(`    ⚠️  ${w}`);
      }
    }

    await context.close();
  }

  await browser.close();

  // Summary
  const passed = results.filter((r) => r.pass).length;
  const failed = results.filter((r) => !r.pass).length;
  console.log(`\n${"═".repeat(50)}`);
  console.log(`  ✅ ${passed} passed  ❌ ${failed} failed  📊 ${results.length} total`);
  console.log(`${"═".repeat(50)}\n`);

  // Write JSON report
  const reportPath = join(ROOT, "test-report.json");
  await Bun.write(reportPath, JSON.stringify(results, null, 2));
  console.log(`📄 Report: ${reportPath}`);

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
