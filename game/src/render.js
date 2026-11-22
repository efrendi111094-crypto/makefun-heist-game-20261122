// Midnight Vault — all canvas drawing. One job: turn game state into the
// picture the judge and the player see: the room, the cones, the loot, the
// alarm meter, the minimap and every screen around the heist.

import {
  TILE, COLS, ROWS, VIEW_W, VIEW_H, PALETTE, clamp, tileOf,
} from './config.js';
import { conePolygon } from './vision.js';
import { VISION_RANGE, VISION_HALF_ANGLE, CAMERA_RANGE, CAMERA_HALF_ANGLE } from './config.js';

const HUD_H = 58;

// ---------- room ----------

function drawFloor(ctx, level, time) {
  const def = level.def;
  for (let ty = 0; ty < ROWS; ty++) {
    for (let tx = 0; tx < COLS; tx++) {
      const carpet = tx >= 2 && tx <= 25 && ty >= 2 && ty <= 15 && (tx + ty) % 5 === 0;
      ctx.fillStyle = carpet ? def.carpet : ((tx + ty) % 2 === 0 ? def.floorA : def.floorB);
      ctx.fillRect(tx * TILE, ty * TILE, TILE, TILE);
    }
  }
  // Vents: a sneaking thief standing on one is invisible to watchers.
  ctx.fillStyle = PALETTE.vent;
  for (const key of level.vents) {
    const [tx, ty] = key.split(',').map(Number);
    ctx.fillRect(tx * TILE + 6, ty * TILE + 6, TILE - 12, TILE - 12);
    ctx.strokeStyle = '#5a6b8c';
    ctx.lineWidth = 2;
    for (let i = 1; i <= 3; i++) {
      ctx.beginPath();
      ctx.moveTo(tx * TILE + 8, ty * TILE + 6 + i * 7);
      ctx.lineTo(tx * TILE + TILE - 8, ty * TILE + 6 + i * 7);
      ctx.stroke();
    }
  }
  // Exit: the getaway van waits here once the vault is cracked.
  const ex = level.exit;
  const pulse = 0.55 + 0.35 * Math.sin(time * 3);
  ctx.fillStyle = `rgba(25, 195, 125, ${level.vault.cracked ? pulse : 0.18})`;
  ctx.fillRect(ex.x - 26, ex.y - 26, 52, 52);
  ctx.strokeStyle = PALETTE.exitVan;
  ctx.lineWidth = 3;
  ctx.strokeRect(ex.x - 26, ex.y - 26, 52, 52);
  ctx.fillStyle = '#0b1f14';
  ctx.font = 'bold 11px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('GETAWAY', ex.x, ex.y + 4);
}

function drawWallsAndProps(ctx, level) {
  for (const r of level.walls) {
    ctx.fillStyle = PALETTE.wall;
    ctx.fillRect(r.x, r.y, r.w, r.h);
    ctx.fillStyle = PALETTE.wallEdge;
    ctx.fillRect(r.x, r.y, r.w, 3);
  }
  for (const r of level.crates) {
    ctx.fillStyle = PALETTE.crate;
    ctx.fillRect(r.x + 3, r.y + 3, r.w - 6, r.h - 6);
    ctx.strokeStyle = PALETTE.crateEdge;
    ctx.lineWidth = 2;
    ctx.strokeRect(r.x + 3, r.y + 3, r.w - 6, r.h - 6);
    ctx.beginPath();
    ctx.moveTo(r.x + 3, r.y + 3);
    ctx.lineTo(r.x + r.w - 3, r.y + r.h - 3);
    ctx.moveTo(r.x + r.w - 3, r.y + 3);
    ctx.lineTo(r.x + 3, r.y + r.h - 3);
    ctx.stroke();
  }
  for (const r of level.desks) {
    ctx.fillStyle = PALETTE.desk;
    ctx.fillRect(r.x + 2, r.y + 6, r.w - 4, r.h - 12);
    ctx.fillStyle = '#6a5486';
    ctx.fillRect(r.x + 2, r.y + 6, r.w - 4, 5);
  }
  for (const r of level.plants) {
    ctx.fillStyle = PALETTE.plant;
    ctx.beginPath();
    ctx.arc(r.x + TILE / 2, r.y + TILE / 2, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PALETTE.plantLeaf;
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      ctx.beginPath();
      ctx.ellipse(
        r.x + TILE / 2 + Math.cos(a) * 7, r.y + TILE / 2 + Math.sin(a) * 7,
        8, 4, a, 0, Math.PI * 2,
      );
      ctx.fill();
    }
  }
}

function drawLootAndVault(ctx, level, time) {
  for (const l of level.loot) {
    if (l.taken) continue;
    const bob = Math.sin(time * 2.4 + l.bob) * 3;
    ctx.save();
    ctx.translate(l.x, l.y + bob);
    ctx.fillStyle = l.kind === 'gem' ? PALETTE.lootGem : PALETTE.lootGold;
    ctx.shadowColor = ctx.fillStyle;
    ctx.shadowBlur = 12;
    if (l.kind === 'gem') {
      ctx.beginPath();
      ctx.moveTo(0, -11);
      ctx.lineTo(8, 0);
      ctx.lineTo(0, 11);
      ctx.lineTo(-8, 0);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.arc(0, 0, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#8a6a1c';
      ctx.font = 'bold 11px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('$', 0, 4);
    }
    ctx.restore();
  }
  // The vault: the heist's target. Hold E beside it to crack it open.
  const v = level.vault;
  ctx.fillStyle = PALETTE.vaultBody;
  ctx.fillRect(v.x - 2, v.y - 2, v.w + 4, v.h + 4);
  ctx.fillStyle = v.cracked ? '#2f8f4f' : PALETTE.vaultDoor;
  ctx.fillRect(v.x + 5, v.y + 5, v.w - 10, v.h - 10);
  ctx.strokeStyle = '#d7dee9';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(v.x + TILE / 2, v.y + TILE / 2, 9, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(v.x + TILE / 2, v.y + TILE / 2);
  ctx.lineTo(v.x + TILE / 2 + 7, v.y + TILE / 2 - 4);
  ctx.stroke();
  ctx.fillStyle = '#eef2f8';
  ctx.font = 'bold 10px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(v.cracked ? 'OPEN' : 'VAULT', v.x + TILE / 2, v.y + TILE + 12);
}

// ---------- watchers ----------

function drawCone(ctx, ox, oy, facing, halfAngle, range, solids, fill) {
  const pts = conePolygon(ox, oy, facing, halfAngle, range, solids);
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.closePath();
  ctx.fill();
}

function drawGuards(ctx, guards, solids) {
  for (const g of guards) {
    const fill = g.state === 'chase'
      ? PALETTE.coneChase
      : g.suspicion > 45
        ? PALETTE.coneSuspicious
        : PALETTE.cone;
    if (g.state !== 'stunned') {
      drawCone(ctx, g.x, g.y, g.facing, VISION_HALF_ANGLE, VISION_RANGE, solids, fill);
    }
    // Body: a guard in a dark suit with a red cap, facing its patrol.
    ctx.save();
    ctx.translate(g.x, g.y);
    ctx.rotate(g.facing);
    ctx.fillStyle = PALETTE.guardSuit;
    ctx.beginPath();
    ctx.arc(0, 0, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PALETTE.guard;
    ctx.beginPath();
    ctx.arc(5, 0, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffd34d';
    ctx.fillRect(10, -2, 6, 4);
    ctx.restore();
    // Suspicion "?" above the head, growing with the meter.
    if (g.suspicion > 5 && g.state !== 'chase') {
      ctx.fillStyle = g.suspicion > 45 ? '#ffb020' : '#eef2f8';
      ctx.font = `bold ${14 + Math.round(g.suspicion / 12)}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(g.suspicion > 45 ? '!' : '?', g.x, g.y - 20);
    }
    if (g.state === 'chase') {
      ctx.fillStyle = '#ff3b30';
      ctx.font = 'bold 16px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('!', g.x, g.y - 20);
    }
    if (g.state === 'stunned') {
      ctx.fillStyle = '#eef2f8';
      ctx.font = 'bold 13px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('~ z z ~', g.x, g.y - 20);
    }
  }
}

function drawCameras(ctx, cameras, solids) {
  for (const c of cameras) {
    if (!c.disabled) {
      const hot = c.alert > 0.45;
      drawCone(
        ctx, c.x, c.y, c.angle, CAMERA_HALF_ANGLE, CAMERA_RANGE, solids,
        hot ? 'rgba(255, 176, 32, 0.4)' : PALETTE.cameraCone,
      );
    }
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.rotate(c.angle);
    ctx.fillStyle = c.disabled ? '#5a6b8c' : '#39465e';
    ctx.fillRect(-4, -6, 18, 12);
    ctx.fillStyle = c.disabled ? '#333' : (c.alert > 0.45 ? '#ff3b30' : '#ff5a52');
    ctx.beginPath();
    ctx.arc(14, 0, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function drawPlayer(ctx, player, time) {
  const p = player;
  ctx.save();
  ctx.translate(p.x, p.y);
  // Shadow ring while sneaking: the thief is harder to spot, and it shows.
  if (p.sneaking) {
    ctx.strokeStyle = 'rgba(94, 230, 255, 0.7)';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.arc(0, 0, 18, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  if (p.hiddenInVent) {
    ctx.globalAlpha = 0.45;
  }
  ctx.rotate(p.facing);
  ctx.fillStyle = PALETTE.thiefHood;
  ctx.beginPath();
  ctx.arc(0, 0, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = PALETTE.thief;
  ctx.beginPath();
  ctx.arc(4, 0, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#232a38';
  ctx.beginPath();
  ctx.moveTo(12, -5);
  ctx.lineTo(20, 0);
  ctx.lineTo(12, 5);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  // Lockpick progress ring around the thief.
  if (p.lockpickProgress > 0 && p.lockpickProgress < 1) {
    ctx.strokeStyle = '#ffd34d';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 20, -Math.PI / 2, -Math.PI / 2 + p.lockpickProgress * Math.PI * 2);
    ctx.stroke();
  }
  // Click-to-move marker.
  if (p.moveMarker) {
    ctx.strokeStyle = 'rgba(238, 242, 248, 0.8)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(p.moveMarker.x, p.moveMarker.y, 6 + Math.sin(time * 6) * 2, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawSmoke(ctx, smokeClouds) {
  for (const s of smokeClouds) {
    ctx.fillStyle = PALETTE.smoke;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(s.x - s.r * 0.4, s.y + s.r * 0.25, s.r * 0.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(s.x + s.r * 0.4, s.y - s.r * 0.25, s.r * 0.55, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawFloaters(ctx, floaters) {
  ctx.textAlign = 'center';
  for (const f of floaters) {
    ctx.globalAlpha = clamp(f.life, 0, 1);
    ctx.fillStyle = f.color;
    ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.fillText(f.text, f.x, f.y);
  }
  ctx.globalAlpha = 1;
}

// ---------- HUD ----------

function alarmColor(alarm) {
  if (alarm >= 70) return PALETTE.alarmHigh;
  if (alarm >= 40) return PALETTE.alarmMid;
  return PALETTE.alarmLow;
}

export function drawHUD(ctx, g) {
  const level = g.level;
  ctx.fillStyle = PALETTE.hudBg;
  ctx.fillRect(0, 0, VIEW_W, HUD_H);
  ctx.fillStyle = '#2c3a52';
  ctx.fillRect(0, HUD_H - 2, VIEW_W, 2);

  ctx.textAlign = 'left';
  ctx.fillStyle = PALETTE.hudText;
  ctx.font = 'bold 17px system-ui, sans-serif';
  ctx.fillText(`${g.heistIndex + 1}. ${level.def.name}`, 14, 24);
  ctx.fillStyle = PALETTE.hudDim;
  ctx.font = '12px system-ui, sans-serif';
  ctx.fillText(level.def.sub, 14, 42);

  // Timer.
  const t = Math.max(0, Math.ceil(g.timeLeft));
  const mm = Math.floor(t / 60);
  const ss = String(t % 60).padStart(2, '0');
  ctx.fillStyle = t <= 30 ? '#ff3b30' : PALETTE.hudText;
  ctx.font = 'bold 20px system-ui, monospace';
  ctx.fillText(`${mm}:${ss}`, 470, 26);

  // Loot.
  ctx.fillStyle = PALETTE.lootGold;
  ctx.font = 'bold 16px system-ui, sans-serif';
  ctx.fillText(`$${g.lootCollected}`, 560, 25);
  ctx.fillStyle = PALETTE.hudDim;
  ctx.font = '12px system-ui, sans-serif';
  ctx.fillText(`vault $${level.vault.value}${level.vault.cracked ? ' ✓' : ''}`, 560, 43);

  // Alarm meter.
  const ax = 700;
  const aw = 190;
  ctx.fillStyle = PALETTE.hudDim;
  ctx.font = 'bold 11px system-ui, sans-serif';
  ctx.fillText('ALARM', ax, 16);
  ctx.fillStyle = '#131a26';
  ctx.fillRect(ax, 22, aw, 16);
  ctx.fillStyle = alarmColor(g.alarm);
  ctx.fillRect(ax, 22, aw * clamp(g.alarm / 100, 0, 1), 16);
  ctx.strokeStyle = '#3d4b63';
  ctx.lineWidth = 1;
  ctx.strokeRect(ax, 22, aw, 16);
  ctx.fillStyle = PALETTE.hudText;
  ctx.font = 'bold 12px system-ui, sans-serif';
  ctx.fillText(`${Math.round(g.alarm)}%`, ax + aw + 8, 35);
  if (g.lockdown > 0) {
    ctx.fillStyle = '#ff3b30';
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.fillText(`LOCKDOWN ${Math.ceil(g.lockdown)}s — RUN!`, ax, 52);
  }

  // Tools (clickable buttons, also Q / R).
  drawToolButton(ctx, 940, 12, 34, 34, 'Q', `Smoke ×${g.tools.smoke}`, g.tools.smoke > 0);
  drawToolButton(ctx, 985, 12, 34, 34, 'R', `EMP ×${g.tools.emp}`, g.tools.emp > 0);

  // Lives.
  ctx.fillStyle = '#ff5a52';
  ctx.font = '16px system-ui, sans-serif';
  let hearts = '';
  for (let i = 0; i < g.lives; i++) hearts += '♥ ';
  ctx.fillText(hearts, 1035, 27);
  ctx.fillStyle = PALETTE.hudDim;
  ctx.font = '11px system-ui, sans-serif';
  ctx.fillText(`score ${g.score}`, 1035, 45);

  // Objective line under the bar.
  ctx.fillStyle = 'rgba(238, 242, 248, 0.85)';
  ctx.font = '13px system-ui, sans-serif';
  ctx.textAlign = 'center';
  const objective = level.vault.cracked
    ? 'Vault cracked — get to the GETAWAY van!'
    : 'Hold E beside the VAULT to crack it — grab loot, stay out of the cones';
  ctx.fillText(objective, VIEW_W / 2, HUD_H + 18);
  ctx.textAlign = 'left';
}

function drawToolButton(ctx, x, y, w, h, key, label, enabled) {
  ctx.fillStyle = enabled ? '#2c3a52' : '#1a2230';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = enabled ? '#5a6b8c' : '#2c3a52';
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, w, h);
  ctx.fillStyle = enabled ? PALETTE.hudText : PALETTE.hudDim;
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(key, x + w / 2, y + 15);
  ctx.font = '9px system-ui, sans-serif';
  ctx.fillText(label, x + w / 2, y + 28);
  ctx.textAlign = 'left';
}

// ---------- minimap ----------

export function drawMinimap(ctx, g) {
  const level = g.level;
  const mw = 150;
  const mh = 96;
  const mx = VIEW_W - mw - 12;
  const my = VIEW_H - mh - 12;
  const sx = mw / VIEW_W;
  const sy = mh / VIEW_H;
  ctx.fillStyle = 'rgba(8, 11, 18, 0.85)';
  ctx.fillRect(mx, my, mw, mh);
  ctx.strokeStyle = '#3d4b63';
  ctx.strokeRect(mx, my, mw, mh);
  for (const r of level.walls) {
    ctx.fillStyle = '#5a6b8c';
    ctx.fillRect(mx + r.x * sx, my + r.y * sy, Math.max(1, r.w * sx), Math.max(1, r.h * sy));
  }
  for (const l of level.loot) {
    if (l.taken) continue;
    ctx.fillStyle = PALETTE.lootGold;
    ctx.fillRect(mx + l.x * sx - 2, my + l.y * sy - 2, 4, 4);
  }
  ctx.fillStyle = PALETTE.exitVan;
  ctx.fillRect(mx + level.exit.x * sx - 3, my + level.exit.y * sy - 3, 6, 6);
  for (const cam of g.cameras) {
    ctx.fillStyle = '#5ee6ff';
    ctx.fillRect(mx + cam.x * sx - 2, my + cam.y * sy - 2, 4, 4);
  }
  for (const gd of g.guards) {
    ctx.fillStyle = '#ff5a52';
    ctx.beginPath();
    ctx.arc(mx + gd.x * sx, my + gd.y * sy, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(mx + g.player.x * sx, my + g.player.y * sy, 3.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = PALETTE.hudDim;
  ctx.font = '10px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('MAP', mx + 4, my + 11);
}

// ---------- screens ----------

function dim(ctx, alpha = 0.72) {
  ctx.fillStyle = `rgba(6, 9, 15, ${alpha})`;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
}

function bigTitle(ctx, text, y, size = 54) {
  ctx.textAlign = 'center';
  ctx.font = `bold ${size}px system-ui, sans-serif`;
  ctx.fillStyle = '#0d1117';
  ctx.fillText(text, VIEW_W / 2 + 3, y + 3);
  const grad = ctx.createLinearGradient(0, y - size, 0, y);
  grad.addColorStop(0, '#ffe27a');
  grad.addColorStop(1, '#ffb020');
  ctx.fillStyle = grad;
  ctx.fillText(text, VIEW_W / 2, y);
  ctx.textAlign = 'left';
}

function centerText(ctx, text, y, size = 17, color = '#eef2f8') {
  ctx.textAlign = 'center';
  ctx.fillStyle = color;
  ctx.font = `${size}px system-ui, sans-serif`;
  ctx.fillText(text, VIEW_W / 2, y);
  ctx.textAlign = 'left';
}

export function drawTitle(ctx, g) {
  dim(ctx, 0.45);
  bigTitle(ctx, 'MIDNIGHT VAULT', 150, 58);
  centerText(ctx, 'Five heists. One crew. Zero witnesses.', 190, 19, '#ffd34d');
  centerText(ctx, 'Steal the vault loot, dodge the cones, and reach the getaway van.', 232, 16);
  centerText(ctx, 'WASD / arrows — move      Shift — sneak      Q — smoke bomb      R — EMP', 272, 15, '#9aa7bd');
  centerText(ctx, 'Hold E by the vault to crack it      Click the floor to walk there      P — pause      M — mute', 296, 15, '#9aa7bd');
  centerText(ctx, 'Vents hide a sneaking thief. Cameras feed the alarm. At 100% — lockdown.', 320, 15, '#9aa7bd');
  centerText(ctx, 'Press ENTER or click to start the first heist', 380, 17, '#19c37d');
  centerText(ctx, `Best run so far: $${g.bestScore}  ·  ${g.heistsCleared} heists cleared`, 420, 14, '#9aa7bd');
  drawHeistCards(ctx, g);
}

function drawHeistCards(ctx, g) {
  const names = ['1 · Gilded Mouse', '2 · First Meridian', '3 · Neon Mirage', '4 · Ivory Gallery', '5 · Sky Penthouse'];
  const w = 190;
  const gap = 14;
  const total = names.length * w + (names.length - 1) * gap;
  let x = (VIEW_W - total) / 2;
  const y = 470;
  ctx.font = 'bold 14px system-ui, sans-serif';
  names.forEach((n, i) => {
    const done = i < g.heistsCleared;
    ctx.fillStyle = done ? '#1d3a2a' : '#1a2230';
    ctx.fillRect(x, y, w, 64);
    ctx.strokeStyle = done ? '#19c37d' : '#3d4b63';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, w, 64);
    ctx.fillStyle = done ? '#19c37d' : '#eef2f8';
    ctx.textAlign = 'center';
    ctx.fillText(n, x + w / 2, y + 28);
    ctx.font = '12px system-ui, sans-serif';
    ctx.fillStyle = '#9aa7bd';
    ctx.fillText(done ? 'CLEARED ✓' : '—', x + w / 2, y + 48);
    ctx.font = 'bold 14px system-ui, sans-serif';
    x += w + gap;
  });
  ctx.textAlign = 'left';
}

export function drawHeistIntro(ctx, g) {
  dim(ctx, 0.55);
  const def = g.level.def;
  bigTitle(ctx, `HEIST ${g.heistIndex + 1}: ${def.name.toUpperCase()}`, 250, 40);
  centerText(ctx, def.sub, 292, 17, '#ffd34d');
  centerText(ctx, `Vault $${def.vault.value}  ·  ${g.level.guards.length} guards  ·  ${g.level.cameras.length} cameras  ·  ${def.time}s on the clock`, 340, 16);
  centerText(ctx, 'Press ENTER to go in', 400, 17, '#19c37d');
}

export function drawHeistComplete(ctx, g) {
  dim(ctx, 0.6);
  bigTitle(ctx, 'CLEAN GETAWAY!', 200, 46);
  const r = g.lastResult;
  centerText(ctx, `${g.level.def.name} — vault cracked, crew out before the sirens`, 248, 17, '#ffd34d');
  centerText(ctx, `Loot $${r.loot}  +  time bonus $${r.timeBonus}${r.ghost ? '  +  ghost bonus $500' : ''}`, 300, 17);
  centerText(ctx, `Heist score: $${r.score}      Total: $${g.score}`, 332, 17);
  const stars = '★'.repeat(r.stars) + '☆'.repeat(3 - r.stars);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd34d';
  ctx.font = '44px system-ui, sans-serif';
  ctx.fillText(stars, VIEW_W / 2, 400);
  ctx.textAlign = 'left';
  centerText(ctx, g.heistIndex + 1 < 5 ? 'Press ENTER for the next heist' : 'Press ENTER for the final score', 460, 17, '#19c37d');
}

export function drawBusted(ctx, g) {
  dim(ctx, 0.62);
  bigTitle(ctx, 'BUSTED!', 220, 52);
  centerText(ctx, g.bustedReason, 272, 18, '#ff8a80');
  centerText(ctx, `Lives left: ${'♥ '.repeat(Math.max(0, g.lives)) || 'none'}`, 312, 16);
  centerText(
    ctx,
    g.lives > 0 ? 'Press ENTER to retry this heist' : 'Press ENTER to start the run over',
    370, 17, '#19c37d',
  );
}

export function drawRunComplete(ctx, g) {
  dim(ctx, 0.6);
  bigTitle(ctx, 'THE CREW RETIRES', 200, 46);
  centerText(ctx, `All 5 heists cleared — total score $${g.score}`, 250, 18, '#ffd34d');
  centerText(ctx, `Best run: $${g.bestScore}  ·  Loot stolen: $${g.totalLoot}`, 292, 16);
  centerText(ctx, 'Midnight Vault — thanks for playing. Press ENTER to run it back.', 350, 16, '#9aa7bd');
}

export function drawPaused(ctx) {
  dim(ctx, 0.5);
  bigTitle(ctx, 'PAUSED', 300, 44);
  centerText(ctx, 'Press P to keep stealing', 350, 17, '#9aa7bd');
}

// The full in-play frame: room, cones, actors, HUD and minimap.
export function drawGame(ctx, g) {
  drawFloor(ctx, g.level, g.time);
  drawWallsAndProps(ctx, g.level);
  drawLootAndVault(ctx, g.level, g.time);
  drawCameras(ctx, g.cameras, g.level.solids);
  drawGuards(ctx, g.guards, g.level.solids);
  drawSmoke(ctx, g.smoke);
  drawPlayer(ctx, g.player, g.time);
  drawFloaters(ctx, g.floaters);
  drawHUD(ctx, g);
  drawMinimap(ctx, g);
}
