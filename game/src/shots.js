// Midnight Vault — staged screenshot views. One job: pose one honest frame
// of the real game for each screenshot the maker takes (?shot=...).
// Every view is live game state: real guards, real cones, real HUD — nothing
// is drawn for the camera that the game itself does not draw.

import { tileCenter } from './config.js';

// Put the player on a tile and face a direction.
function posePlayer(game, tx, ty, facing, sneaking = false) {
  const c = tileCenter(tx, ty);
  game.player.x = c.x;
  game.player.y = c.y;
  game.player.facing = facing;
  game.player.sneaking = sneaking;
}

// Put a guard on a tile, facing a direction, in a given mood.
function poseGuard(game, index, tx, ty, facing, state = 'patrol', suspicion = 0) {
  const g = game.guards[index];
  if (!g) return;
  const c = tileCenter(tx, ty);
  g.x = c.x;
  g.y = c.y;
  g.facing = facing;
  g.state = state;
  g.suspicion = suspicion;
  if (state === 'chase') {
    g.lastSeen = { x: game.player.x, y: game.player.y };
    g.chaseTimer = 6;
  }
}

function takeLoot(game, count) {
  let taken = 0;
  for (const l of game.level.loot) {
    if (taken >= count) break;
    l.taken = true;
    taken += 1;
    game.lootCollected += l.value;
    game.score += l.value;
  }
}

export function stageShot(game, name) {
  if (name === 'cover') {
    // Museum, mid-heist: the thief crouches behind a crate as a guard's cone
    // sweeps past, the vault glinting at the top, alarm amber at 35%.
    game.startHeist(0);
    takeLoot(game, 2);
    posePlayer(game, 12, 13, -Math.PI / 2, true);
    poseGuard(game, 0, 12, 10, Math.PI / 2, 'suspicious', 55);
    poseGuard(game, 1, 20, 6, Math.PI, 'patrol', 10);
    poseGuard(game, 2, 8, 15, 0, 'patrol', 0);
    game.alarm = 35;
    game.peakAlarm = 35;
    game.timeLeft = 143;
    game.state = 'playing';
  } else if (name === 'alert') {
    // The chase: alarm at 85%, a guard sprinting at the thief, who is
    // cutting for the getaway with the vault already cracked.
    game.startHeist(0);
    takeLoot(game, 4);
    game.level.vault.cracked = true;
    game.lootCollected += game.level.vault.value;
    game.score += game.level.vault.value;
    posePlayer(game, 16, 14, Math.PI / 4, false);
    poseGuard(game, 0, 14, 12, Math.PI / 3, 'chase', 100);
    poseGuard(game, 1, 22, 10, Math.PI, 'suspicious', 70);
    poseGuard(game, 2, 6, 16, 0, 'patrol', 20);
    game.alarm = 85;
    game.peakAlarm = 85;
    game.timeLeft = 96;
    game.state = 'playing';
  } else if (name === 'casino') {
    // Heist 3, the Neon Mirage: the thief crosses the casino floor between
    // two sweeping camera cones, chips on the tables, vault ahead.
    game.startHeist(2);
    takeLoot(game, 3);
    posePlayer(game, 13, 12, -Math.PI / 2, true);
    poseGuard(game, 0, 5, 4, Math.PI / 2, 'patrol', 15);
    poseGuard(game, 1, 22, 4, Math.PI / 2, 'patrol', 0);
    poseGuard(game, 2, 4, 13, 0, 'suspicious', 40);
    poseGuard(game, 3, 22, 13, Math.PI, 'patrol', 0);
    game.alarm = 22;
    game.peakAlarm = 22;
    game.timeLeft = 121;
    game.state = 'playing';
  } else if (name === 'win') {
    // The payoff screen: three stars, ghost bonus, clean getaway.
    game.startHeist(0);
    takeLoot(game, 7);
    game.level.vault.cracked = true;
    game.lootCollected += game.level.vault.value;
    game.score += game.level.vault.value;
    posePlayer(game, 25, 16, Math.PI, false);
    game.lastResult = {
      loot: game.lootCollected, timeBonus: 620, ghost: true, stars: 3,
      score: game.lootCollected + 620 + 500,
    };
    game.score += 620 + 500;
    game.heistsCleared = 1;
    game.alarm = 12;
    game.peakAlarm = 30;
    game.timeLeft = 62;
    game.state = 'heistComplete';
  }
}
