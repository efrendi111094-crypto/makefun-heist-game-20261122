// Midnight Vault — shared constants, palette and small math helpers.
// One job: every number the rest of the game agrees on lives here.

export const TILE = 40;
export const COLS = 28;
export const ROWS = 18;
export const VIEW_W = COLS * TILE; // 1120
export const VIEW_H = ROWS * TILE; // 720

export const PLAYER_SPEED = 178; // px per second, walking
export const SNEAK_SPEED = 108; // px per second, sneaking
export const PLAYER_RADIUS = 13;

export const GUARD_SPEED = 92;
export const GUARD_CHASE_SPEED = 148;
export const GUARD_RADIUS = 13;
export const VISION_RANGE = 185;
export const VISION_HALF_ANGLE = 0.62; // ~71 degrees total cone
export const CAMERA_RANGE = 205;
export const CAMERA_HALF_ANGLE = 0.5;

export const ALARM_MAX = 100;
export const ALARM_DECAY = 1.6; // per second while unseen
export const LOCKDOWN_SECONDS = 12;
export const SMOKE_SECONDS = 4;
export const EMP_SECONDS = 6;
export const LOCKPICK_SECONDS = 2.0;

export const START_LIVES = 3;
export const GHOST_BONUS = 500;
export const TIME_BONUS_PER_SECOND = 10;

// Cohesive noir-neon look: dark floors, gold loot, red danger, teal safety.
export const PALETTE = {
  floorA: '#1c2433',
  floorB: '#202a3d',
  carpet: '#2a2140',
  wall: '#0d1117',
  wallEdge: '#3d4b63',
  crate: '#6b4f2a',
  crateEdge: '#8a6a3c',
  desk: '#4a3a5e',
  plant: '#1f5c38',
  plantLeaf: '#2f8f4f',
  vent: '#39465e',
  lootGold: '#ffd34d',
  lootGem: '#5ee6ff',
  vaultBody: '#8f9bb0',
  vaultDoor: '#5b6a84',
  exitVan: '#19c37d',
  thief: '#e8e6df',
  thiefHood: '#232a38',
  guard: '#e5484d',
  guardSuit: '#7a1f24',
  cone: 'rgba(229, 72, 77, 0.30)',
  coneSuspicious: 'rgba(255, 176, 32, 0.42)',
  coneChase: 'rgba(255, 60, 60, 0.5)',
  cameraCone: 'rgba(94, 230, 255, 0.22)',
  smoke: 'rgba(200, 205, 215, 0.55)',
  hudBg: 'rgba(8, 11, 18, 0.86)',
  hudText: '#eef2f8',
  hudDim: '#9aa7bd',
  alarmLow: '#19c37d',
  alarmMid: '#ffb020',
  alarmHigh: '#ff3b30',
};

export function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function dist(x1, y1, x2, y2) {
  return Math.hypot(x2 - x1, y2 - y1);
}

// Shortest signed angle difference, in (-PI, PI].
export function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d <= -Math.PI) d += Math.PI * 2;
  return d;
}

// Deterministic seeded random (mulberry32). Gameplay never uses Math.random,
// so a staged screenshot and a live play of the same seed look identical.
export function makeRng(seed) {
  let s = seed >>> 0;
  return function rng() {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Tile centre in pixels.
export function tileCenter(tx, ty) {
  return { x: tx * TILE + TILE / 2, y: ty * TILE + TILE / 2 };
}

export function tileOf(px, py) {
  return { tx: Math.floor(px / TILE), ty: Math.floor(py / TILE) };
}
