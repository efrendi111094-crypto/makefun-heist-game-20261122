// Midnight Vault — the five heists. One job: level data only.
// Coordinates are tiles (28 x 18, tile = 40px). The builder below turns a
// definition into pixel rectangles, guard patrols, cameras and loot.
// Walls are [tx, ty, w, h] in tiles; crates / desks / plants are [tx, ty].
// A vent tile hides a sneaking thief from every guard and camera.

import { TILE, tileCenter } from './config.js';

const LEVELS = [
  {
    id: 1,
    name: 'The Gilded Mouse',
    sub: 'Museum of Antiquities — crack the gilded vault, slip out unseen',
    time: 180,
    seed: 101,
    floorA: '#1c2433', floorB: '#202a3d', carpet: '#2a2140',
    walls: [
      [9, 1, 1, 6], [9, 9, 1, 8],
      [18, 1, 1, 5], [18, 8, 1, 9],
      [1, 11, 7, 1], [19, 11, 8, 1],
    ],
    crates: [[4, 8], [5, 8], [22, 8], [13, 12], [14, 12]],
    desks: [[11, 7], [16, 7]],
    plants: [[2, 2], [25, 2], [2, 15], [25, 15]],
    vents: [[13, 8], [14, 8]],
    loot: [
      { tx: 12, ty: 3, kind: 'gold' }, { tx: 15, ty: 3, kind: 'gem' },
      { tx: 4, ty: 4, kind: 'gold' }, { tx: 23, ty: 4, kind: 'gold' },
      { tx: 5, ty: 14, kind: 'gem' }, { tx: 22, ty: 14, kind: 'gold' },
      { tx: 13, ty: 8, kind: 'gold' },
    ],
    guards: [
      { path: [[5, 3], [5, 9], [12, 9], [12, 3]] },
      { path: [[22, 3], [22, 9], [15, 9], [15, 3]] },
      { path: [[4, 14], [22, 14], [22, 16], [4, 16]] },
    ],
    cameras: [
      { tx: 13, ty: 1, angle: Math.PI / 2, sweep: 0.7 },
      { tx: 26, ty: 8, angle: Math.PI, sweep: 0.6 },
    ],
    vault: { tx: 13, ty: 2, value: 300 },
    entry: { tx: 1, ty: 16 },
    exit: { tx: 26, ty: 16 },
  },
  {
    id: 2,
    name: 'First Meridian',
    sub: 'Downtown bank — the vault is downstairs, the cameras never blink',
    time: 180,
    seed: 202,
    floorA: '#1a2230', floorB: '#1f2a3a', carpet: '#233246',
    walls: [
      [9, 3, 1, 6], [9, 11, 1, 6],
      [18, 3, 1, 6], [18, 11, 1, 6],
      [1, 6, 6, 1], [21, 6, 6, 1],
      [10, 13, 3, 1], [15, 13, 3, 1],
    ],
    crates: [[5, 8], [22, 8], [13, 10]],
    desks: [[11, 5], [16, 5], [4, 13], [23, 13]],
    plants: [[2, 16], [25, 16], [2, 2], [25, 2]],
    vents: [[13, 8], [13, 9]],
    loot: [
      { tx: 4, ty: 3, kind: 'gold' }, { tx: 23, ty: 3, kind: 'gold' },
      { tx: 13, ty: 8, kind: 'gem' }, { tx: 5, ty: 10, kind: 'gold' },
      { tx: 22, ty: 10, kind: 'gold' }, { tx: 11, ty: 15, kind: 'gem' },
      { tx: 15, ty: 15, kind: 'gem' }, { tx: 13, ty: 5, kind: 'gold' },
    ],
    guards: [
      { path: [[4, 2], [8, 2], [8, 5], [4, 5]] },
      { path: [[23, 2], [19, 2], [19, 5], [23, 5]] },
      { path: [[6, 12], [12, 12], [12, 16], [6, 16]] },
      { path: [[21, 12], [15, 12], [15, 16], [21, 16]] },
    ],
    cameras: [
      { tx: 13, ty: 1, angle: Math.PI / 2, sweep: 0.7 },
      { tx: 1, ty: 9, angle: 0, sweep: 0.6 },
      { tx: 26, ty: 9, angle: Math.PI, sweep: 0.6 },
    ],
    vault: { tx: 13, ty: 15, value: 400 },
    entry: { tx: 1, ty: 1 },
    exit: { tx: 26, ty: 1 },
  },
  {
    id: 3,
    name: 'Neon Mirage',
    sub: 'Casino floor — chips, cameras and four guards who never sleep',
    time: 165,
    seed: 303,
    floorA: '#221a33', floorB: '#271f3d', carpet: '#3a1f4d',
    walls: [
      [7, 1, 1, 4], [7, 7, 1, 4], [7, 13, 1, 4],
      [20, 1, 1, 4], [20, 7, 1, 4], [20, 13, 1, 4],
      [9, 8, 4, 1], [15, 8, 4, 1],
      [9, 11, 4, 1], [15, 11, 4, 1],
    ],
    crates: [[5, 8], [22, 8], [13, 5], [13, 13]],
    desks: [[4, 5], [23, 5], [4, 12], [23, 12]],
    plants: [[2, 2], [25, 2], [2, 15], [25, 15]],
    vents: [[13, 6], [13, 12]],
    loot: [
      { tx: 3, ty: 3, kind: 'gold' }, { tx: 24, ty: 3, kind: 'gold' },
      { tx: 10, ty: 4, kind: 'gem' }, { tx: 17, ty: 4, kind: 'gem' },
      { tx: 3, ty: 14, kind: 'gold' }, { tx: 24, ty: 14, kind: 'gold' },
      { tx: 11, ty: 9, kind: 'gem' }, { tx: 16, ty: 9, kind: 'gem' },
    ],
    guards: [
      { path: [[3, 2], [6, 2], [6, 6], [3, 6]] },
      { path: [[24, 2], [21, 2], [21, 6], [24, 6]] },
      { path: [[3, 11], [6, 11], [6, 15], [3, 15]] },
      { path: [[24, 11], [21, 11], [21, 15], [24, 15]] },
    ],
    cameras: [
      { tx: 13, ty: 1, angle: Math.PI / 2, sweep: 0.7 },
      { tx: 1, ty: 9, angle: 0, sweep: 0.6 },
      { tx: 26, ty: 9, angle: Math.PI, sweep: 0.6 },
    ],
    vault: { tx: 13, ty: 9, value: 400 },
    entry: { tx: 1, ty: 16 },
    exit: { tx: 26, ty: 16 },
  },
  {
    id: 4,
    name: 'The Ivory Gallery',
    sub: 'White walls, red alarms — five guards between you and the vault',
    time: 165,
    seed: 404,
    floorA: '#232030', floorB: '#282536', carpet: '#402030',
    walls: [
      [6, 1, 1, 7], [6, 10, 1, 7],
      [13, 5, 1, 3], [13, 10, 1, 3],
      [20, 1, 1, 7], [20, 10, 1, 7],
      [8, 13, 5, 1], [15, 13, 5, 1],
    ],
    crates: [[10, 9], [17, 9]],
    desks: [[3, 8], [24, 8], [13, 15]],
    plants: [[2, 2], [25, 2], [2, 15], [25, 15], [13, 6]],
    vents: [[13, 8], [13, 9]],
    loot: [
      { tx: 3, ty: 3, kind: 'gold' }, { tx: 24, ty: 3, kind: 'gold' },
      { tx: 10, ty: 6, kind: 'gem' }, { tx: 17, ty: 6, kind: 'gem' },
      { tx: 10, ty: 12, kind: 'gold' }, { tx: 17, ty: 12, kind: 'gold' },
      { tx: 4, ty: 15, kind: 'gem' }, { tx: 23, ty: 15, kind: 'gem' },
    ],
    guards: [
      { path: [[3, 3], [3, 7], [5, 7], [5, 3]] },
      { path: [[24, 3], [24, 7], [22, 7], [22, 3]] },
      { path: [[10, 5], [17, 5], [17, 7], [10, 7]] },
      { path: [[4, 12], [12, 12], [12, 16], [4, 16]] },
      { path: [[23, 12], [15, 12], [15, 16], [23, 16]] },
    ],
    cameras: [
      { tx: 13, ty: 1, angle: Math.PI / 2, sweep: 0.7 },
      { tx: 1, ty: 9, angle: 0, sweep: 0.6 },
      { tx: 26, ty: 9, angle: Math.PI, sweep: 0.6 },
      { tx: 13, ty: 16, angle: -Math.PI / 2, sweep: 0.6 },
    ],
    vault: { tx: 13, ty: 2, value: 500 },
    entry: { tx: 1, ty: 16 },
    exit: { tx: 26, ty: 16 },
  },
  {
    id: 5,
    name: 'Sky Penthouse',
    sub: 'The final score — the vault sits in a guarded suite, 150 seconds',
    time: 150,
    seed: 505,
    floorA: '#141c2c', floorB: '#182238', carpet: '#2c2438',
    walls: [
      [8, 1, 1, 6], [8, 9, 1, 8],
      [16, 1, 1, 6], [16, 9, 1, 8],
      [17, 5, 2, 1], [22, 5, 5, 1],
      [2, 9, 5, 1], [10, 13, 6, 1],
    ],
    crates: [[12, 7], [20, 15], [5, 15]],
    desks: [[10, 4], [18, 8], [4, 13]],
    plants: [[2, 16], [25, 2], [14, 16], [26, 8]],
    vents: [[12, 8], [18, 7]],
    loot: [
      { tx: 4, ty: 4, kind: 'gold' }, { tx: 12, ty: 3, kind: 'gem' },
      { tx: 24, ty: 3, kind: 'gem' }, { tx: 6, ty: 12, kind: 'gold' },
      { tx: 20, ty: 12, kind: 'gold' }, { tx: 25, ty: 14, kind: 'gem' },
      { tx: 12, ty: 15, kind: 'gold' }, { tx: 20, ty: 7, kind: 'gem' },
    ],
    guards: [
      { path: [[4, 2], [7, 2], [7, 6], [4, 6]] },
      { path: [[12, 2], [15, 2], [15, 6], [12, 6]] },
      { path: [[19, 7], [24, 7], [24, 10], [19, 10]] },
      { path: [[6, 11], [12, 11], [12, 15], [6, 15]] },
      { path: [[19, 13], [24, 13], [24, 16], [19, 16]] },
    ],
    cameras: [
      { tx: 21, ty: 1, angle: Math.PI / 2, sweep: 0.7 },
      { tx: 1, ty: 9, angle: 0, sweep: 0.6 },
      { tx: 26, ty: 9, angle: Math.PI, sweep: 0.6 },
      { tx: 13, ty: 16, angle: -Math.PI / 2, sweep: 0.6 },
    ],
    vault: { tx: 24, ty: 2, value: 600 },
    entry: { tx: 1, ty: 1 },
    exit: { tx: 1, ty: 16 },
  },
];

function tileRect(tx, ty, w, h) {
  return { x: tx * TILE, y: ty * TILE, w: w * TILE, h: h * TILE };
}

// Builds a playable level: pixel rects for walls and solid props, loot with
// values, guard patrol waypoints in pixels, cameras, vault, entry and exit.
export function buildLevel(index) {
  const def = LEVELS[index];
  const walls = [];
  // Outer border, so definitions only list interior walls.
  walls.push(tileRect(0, 0, 28, 1), tileRect(0, 17, 28, 1));
  walls.push(tileRect(0, 0, 1, 18), tileRect(27, 0, 1, 18));
  for (const w of def.walls) walls.push(tileRect(w[0], w[1], w[2], w[3]));

  const solids = [...walls];
  const crates = def.crates.map(([tx, ty]) => tileRect(tx, ty, 1, 1));
  const desks = def.desks.map(([tx, ty]) => tileRect(tx, ty, 1, 1));
  const plants = def.plants.map(([tx, ty]) => tileRect(tx, ty, 1, 1));
  solids.push(...crates, ...desks, ...plants);
  const vaultRect = tileRect(def.vault.tx, def.vault.ty, 1, 1);
  solids.push(vaultRect);

  const vents = new Set(def.vents.map(([tx, ty]) => tx + ',' + ty));
  const loot = def.loot.map((l) => ({
    ...tileCenter(l.tx, l.ty),
    tx: l.tx, ty: l.ty, kind: l.kind,
    value: l.kind === 'gem' ? 150 : 100,
    taken: false, bob: (l.tx * 7 + l.ty * 13) % 10,
  }));
  const guards = def.guards.map((g) => ({
    waypoints: g.path.map(([tx, ty]) => tileCenter(tx, ty)),
  }));
  const cameras = def.cameras.map((c) => ({
    ...tileCenter(c.tx, c.ty), tx: c.tx, ty: c.ty,
    baseAngle: c.angle, sweep: c.sweep, phase: (c.tx * 3 + c.ty * 5) % 6,
  }));
  const entry = tileCenter(def.entry.tx, def.entry.ty);
  const exit = tileCenter(def.exit.tx, def.exit.ty);
  const vault = { ...tileCenter(def.vault.tx, def.vault.ty), ...vaultRect, value: def.vault.value, cracked: false };

  return {
    def, walls, solids, crates, desks, plants, vents, loot, guards, cameras,
    entry, exit, vault,
  };
}

export function levelCount() {
  return LEVELS.length;
}

export function levelSummary() {
  return LEVELS.map((l) => ({
    id: l.id, name: l.name,
    guards: l.guards.length, cameras: l.cameras.length, loot: l.loot.length,
  }));
}
