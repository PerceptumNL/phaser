// Tile types
export const TILE = {
  ROAD: 0,
  BUILDING: 1,
  TULIP: 2,
  WATER: 3,
  SAND: 4,
  COBBLESTONE: 5,
  GRASS: 6,
  BRIDGE: 7,
} as const;

export const TILE_COLORS: Record<number, number> = {
  [TILE.ROAD]: 0x8d99ae,
  [TILE.BUILDING]: 0xe8d5b7,
  [TILE.TULIP]: 0xff6b6b,
  [TILE.WATER]: 0x5390d9,
  [TILE.SAND]: 0xf4d35e,
  [TILE.COBBLESTONE]: 0xb0a090,
  [TILE.GRASS]: 0x95d5b2,
  [TILE.BRIDGE]: 0x8b7355,
};

export const TILE_SPEED: Record<number, number> = {
  [TILE.ROAD]: 1.0,
  [TILE.BUILDING]: 0,
  [TILE.TULIP]: 0,
  [TILE.WATER]: 0,
  [TILE.SAND]: 0.5,
  [TILE.COBBLESTONE]: 0.8,
  [TILE.GRASS]: 0.7,
  [TILE.BRIDGE]: 1.0,
};

export const WALL_TILES: number[] = [TILE.BUILDING, TILE.TULIP, TILE.WATER];

export const TILE_SIZE = 32;
export const MAP_COLS = 40;
export const MAP_ROWS = 30;

// Tulip colors for variety
const TULIP_COLORS = [0xff6b6b, 0xffd93d, 0xff8fa3, 0xc77dff];

// Hand-crafted map: left=coast/beach, center=town, right=tulip fields
// 0=road, 1=building, 2=tulip, 3=water, 4=sand, 5=cobblestone, 6=grass, 7=bridge
export const MAP_DATA: number[][] = generateMap();

function generateMap(): number[][] {
  const map: number[][] = [];

  for (let row = 0; row < MAP_ROWS; row++) {
    const r: number[] = [];
    for (let col = 0; col < MAP_COLS; col++) {
      r.push(getTile(col, row));
    }
    map.push(r);
  }
  return map;
}

function getTile(col: number, row: number): number {
  // Beach/sand strip (cols 0-2)
  if (col <= 2) {
    if (row === 0 || row === MAP_ROWS - 1) return TILE.SAND;
    // Boulevard road at col 2
    if (col === 2) return TILE.ROAD;
    return TILE.SAND;
  }

  // Coast road (col 3)
  if (col === 3) return TILE.ROAD;

  // Coastal buildings (cols 4-6)
  if (col >= 4 && col <= 6) {
    // Roads between buildings
    if (row % 4 === 0) return TILE.ROAD;
    if (col === 5 && (row % 8 < 2)) return TILE.ROAD;
    return TILE.BUILDING;
  }

  // Main vertical road west (col 7)
  if (col === 7) return TILE.ROAD;

  // Canal 1 (row 7) - runs from col 4 to col 36
  if (row === 7 && col >= 4 && col <= 36) {
    if (col === 7 || col === 15 || col === 25) return TILE.BRIDGE; // Bridge points
    return TILE.WATER;
  }

  // Canal 2 (row 20) - runs from col 4 to col 36
  if (row === 20 && col >= 4 && col <= 36) {
    if (col === 7 || col === 15 || col === 25) return TILE.BRIDGE;
    return TILE.WATER;
  }

  // Town center (cols 8-24, rows 8-19)
  if (col >= 8 && col <= 24 && row >= 8 && row <= 19) {
    return getTownTile(col, row);
  }

  // Town south (cols 8-24, rows 21-28)
  if (col >= 8 && col <= 24 && row >= 21 && row <= 28) {
    return getTownTile(col, row);
  }

  // Main vertical road east (col 25)
  if (col === 25) return TILE.ROAD;

  // Horizontal connecting roads
  if (row === 0 || row === MAP_ROWS - 1) return TILE.ROAD;
  if (row === 14 && col >= 7 && col <= 25) return TILE.ROAD;

  // Tulip fields (cols 26-39)
  if (col >= 26) {
    // Farm roads
    if (col === 30 || col === 35) return TILE.ROAD;
    if (row % 5 === 0 && col >= 26) return TILE.ROAD;
    // Tulip stripes
    return TILE.TULIP;
  }

  // Grass areas (rows 0-6 between town and fields)
  if (row < 7 && col >= 8 && col <= 24) {
    if (row === 3) return TILE.ROAD; // Horizontal road
    if (col === 15) return TILE.ROAD; // Vertical road
    return TILE.GRASS;
  }

  // Default grass
  return TILE.GRASS;
}

function getTownTile(col: number, row: number): number {
  // Central square (cobblestone)
  if (col >= 16 && col <= 22 && row >= 12 && row <= 16) {
    return TILE.COBBLESTONE;
  }

  // Town road grid
  if (row === 10 || row === 14 || row === 18 || row === 24) return TILE.ROAD;
  if (col === 10 || col === 15 || col === 20 || col === 24) return TILE.ROAD;

  // Park (grass)
  if (col >= 11 && col <= 13 && row >= 22 && row <= 23) return TILE.GRASS;

  // Buildings fill the blocks
  return TILE.BUILDING;
}

export function getTileAt(col: number, row: number): number {
  if (col < 0 || col >= MAP_COLS || row < 0 || row >= MAP_ROWS) return TILE.BUILDING;
  return MAP_DATA[row][col];
}

export function getTulipColor(col: number, row: number): number {
  return TULIP_COLORS[(row + col) % TULIP_COLORS.length];
}

export function isWalkable(col: number, row: number): boolean {
  const tile = getTileAt(col, row);
  return !WALL_TILES.includes(tile);
}
