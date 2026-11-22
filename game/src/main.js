// Midnight Vault — game loop and state machine. One job: own the run.
// States: title → intro → playing ⇄ paused → heistComplete → … → runComplete,
// with busted retries in between. It wires input, guards, cameras, alarm,
// tools, loot, the vault and the getaway into one tick.

import {
  TILE, VIEW_W, VIEW_H, PLAYER_SPEED, SNEAK_SPEED, PLAYER_RADIUS,
  ALARM_MAX, ALARM_DECAY, LOCKDOWN_SECONDS, SMOKE_SECONDS, EMP_SECONDS,
  LOCKPICK_SECONDS, START_LIVES, GHOST_BONUS, TIME_BONUS_PER_SECOND,
  clamp, dist, tileOf, makeRng,
} from './config.js';
import { buildLevel, levelCount } from './levels.js';
import { Guard, guardCatches, moveCircle } from './guards.js';
import { Camera } from './cameras.js';
import { Sfx } from './audio.js';
import { Input } from './input.js';
import {
  drawGame, drawTitle, drawHeistIntro, drawHeistComplete,
  drawBusted, drawRunComplete, drawPaused,
} from './render.js';
import { stageShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

export class Game {
  constructor() {
    this.sfx = new Sfx();
    this.input = new Input(canvas);
    this.input.onFirstGesture = () => {
      this.sfx.ensure();
      this.sfx.startMusic();
    };
    this.state = 'title';
    this.time = 0;
    this.heistIndex = 0;
    this.score = 0;
    this.totalLoot = 0;
    this.lives = START_LIVES;
    this.heistsCleared = 0;
    this.bestScore = 0;
    try {
      this.bestScore = Number(localStorage.getItem('midnight-vault-best') || 0) || 0;
    } catch (e) { /* storage unavailable (file:// in some browsers) */ }
    this.level = null;
    this.guards = [];
    this.cameras = [];
    this.smoke = [];
    this.floaters = [];
    this.player = null;
    this.alarm = 0;
    this.peakAlarm = 0;
    this.lockdown = 0;
    this.lockdownPulse = 0;
    this.timeLeft = 0;
    this.lootCollected = 0;
    this.tools = { smoke: 3, emp: 2 };
    this.scoreAtHeistStart = 0;
    this.lootAtHeistStart = 0;
    this.lastResult = null;
    this.bustedReason = '';
    this.stepTimer = 0;
    this.rng = makeRng(7);
    this._lockdownSeen = 0;
  }

  // ---------- heist setup ----------

  startHeist(index) {
    this.heistIndex = index;
    this.level = buildLevel(index);
    const def = this.level.def;
    this.guards = this.level.guards.map((g) => {
      const guard = new Guard(g, g.waypoints[0].x, g.waypoints[0].y);
      return guard;
    });
    this.cameras = this.level.cameras.map((c) => new Camera(c));
    this.smoke = [];
    this.floaters = [];
    this.alarm = 0;
    this.peakAlarm = 0;
    this.lockdown = 0;
    this.timeLeft = def.time;
    this.lootCollected = 0;
    this.tools = { smoke: 3, emp: 2 };
    this.scoreAtHeistStart = this.score;
    this.lootAtHeistStart = this.totalLoot;
    this.lastResult = null;
    const e = this.level.entry;
    this.player = {
      x: e.x, y: e.y, facing: -Math.PI / 2, sneaking: false,
      onVent: false, hiddenInVent: false, lockpickProgress: 0, moveMarker: null,
      hiddenInSmoke: (clouds) => clouds.some((s) => dist(this.player.x, this.player.y, s.x, s.y) < s.r),
    };
    this.state = 'intro';
  }

  // ---------- tools ----------

  useSmoke() {
    if (this.state !== 'playing' || this.tools.smoke <= 0) return;
    this.tools.smoke -= 1;
    this.smoke.push({ x: this.player.x, y: this.player.y, r: 74, life: SMOKE_SECONDS });
    for (const g of this.guards) {
      if (dist(g.x, g.y, this.player.x, this.player.y) < 130) g.stun(SMOKE_SECONDS);
    }
    this.sfx.smoke();
    this.addFloater(this.player.x, this.player.y - 24, 'SMOKE', '#c8cdd7');
  }

  useEmp() {
    if (this.state !== 'playing' || this.tools.emp <= 0) return;
    this.tools.emp -= 1;
    for (const c of this.cameras) c.disable(EMP_SECONDS);
    this.sfx.emp();
    this.addFloater(this.player.x, this.player.y - 24, 'EMP — cameras down', '#5ee6ff');
  }

  // ---------- alarm ----------

  tripAlarm(amount, source) {
    if (this.state !== 'playing') return;
    this.alarm = clamp(this.alarm + amount, 0, ALARM_MAX);
    this.peakAlarm = Math.max(this.peakAlarm, this.alarm);
    this.sfx.alarmTrip();
    if (source && source.x !== undefined) {
      this.addFloater(source.x, source.y - 26, 'SPOTTED!', '#ff8a80');
    }
    if (this.alarm >= ALARM_MAX && this.lockdown <= 0) {
      this.lockdown = LOCKDOWN_SECONDS;
      this.sfx.startAlarm();
      this.addFloater(this.player.x, this.player.y - 30, 'LOCKDOWN!', '#ff3b30');
    }
  }

  // ---------- scoring ----------

  addFloater(x, y, text, color) {
    this.floaters.push({ x, y, text, color, life: 1.4 });
  }

  completeHeist() {
    const timeBonus = Math.ceil(Math.max(0, this.timeLeft)) * TIME_BONUS_PER_SECOND;
    const ghost = this.peakAlarm < 50;
    const allLoot = this.level.loot.every((l) => l.taken);
    const stars = ghost && allLoot ? 3 : this.peakAlarm < 60 ? 2 : 1;
    const heistScore = this.lootCollected + timeBonus + (ghost ? GHOST_BONUS : 0);
    this.score += timeBonus + (ghost ? GHOST_BONUS : 0);
    this.totalLoot += this.lootCollected;
    this.heistsCleared = Math.max(this.heistsCleared, this.heistIndex + 1);
    this.lastResult = {
      loot: this.lootCollected, timeBonus, ghost, stars, score: heistScore,
    };
    this.sfx.win();
    this.sfx.stopAlarm();
    if (this.score > this.bestScore) {
      this.bestScore = this.score;
      try { localStorage.setItem('midnight-vault-best', String(this.bestScore)); } catch (e) { /* ignore */ }
    }
    this.state = 'heistComplete';
  }

  bust(reason) {
    this.bustedReason = reason;
    this.lives -= 1;
    this.sfx.busted();
    this.sfx.stopAlarm();
    this.state = 'busted';
  }

  // ---------- per-frame update ----------

  update(dt) {
    this.time += dt;
    for (const f of this.floaters) { f.life -= dt; f.y -= 22 * dt; }
    this.floaters = this.floaters.filter((f) => f.life > 0);
    if (this.state !== 'playing') return;

    const p = this.player;
    const level = this.level;

    // Movement: keys win over click-to-move.
    const mv = this.input.moveVector();
    let mx = mv.x;
    let my = mv.y;
    if (mx === 0 && my === 0 && this.input.moveTarget) {
      const t = this.input.moveTarget;
      const d = dist(p.x, p.y, t.x, t.y);
      if (d < 10) {
        this.input.moveTarget = null;
        p.moveMarker = null;
      } else {
        mx = (t.x - p.x) / d;
        my = (t.y - p.y) / d;
      }
    }
    p.sneaking = this.input.sneaking;
    const speed = p.sneaking ? SNEAK_SPEED : PLAYER_SPEED;
    if (mx !== 0 || my !== 0) {
      const moved = moveCircle(p.x, p.y, mx * speed * dt, my * speed * dt, PLAYER_RADIUS, level.solids);
      p.x = moved.x;
      p.y = moved.y;
      p.facing = Math.atan2(my, mx);
      this.stepTimer -= dt;
      if (this.stepTimer <= 0) {
        this.stepTimer = p.sneaking ? 0.5 : 0.34;
        this.sfx.footstep(p.sneaking);
      }
    }

    // Vent hiding: sneaking on a vent tile makes the thief invisible.
    const tile = tileOf(p.x, p.y);
    p.onVent = level.vents.has(tile.tx + ',' + tile.ty);
    p.hiddenInVent = p.onVent && p.sneaking;

    // Loot pickup.
    for (const l of level.loot) {
      if (!l.taken && dist(p.x, p.y, l.x, l.y) < 26) {
        l.taken = true;
        this.lootCollected += l.value;
        this.score += l.value;
        this.addFloater(l.x, l.y - 16, `+$${l.value}`, l.kind === 'gem' ? '#5ee6ff' : '#ffd34d');
        if (l.kind === 'gem') this.sfx.gemPickup(); else this.sfx.pickup();
      }
    }

    // Vault lockpick: hold E beside the vault.
    const v = level.vault;
    const nearVault = dist(p.x, p.y, v.x + TILE / 2, v.y + TILE / 2) < 56;
    if (nearVault && !v.cracked && this.input.down('interact')) {
      p.lockpickProgress += dt / LOCKPICK_SECONDS;
      if (Math.random() < dt * 6) this.sfx.lockpickTick(p.lockpickProgress);
      if (p.lockpickProgress >= 1) {
        v.cracked = true;
        this.lootCollected += v.value;
        this.score += v.value;
        this.addFloater(v.x + TILE / 2, v.y - 12, `VAULT +$${v.value}`, '#ffd34d');
        this.sfx.vaultOpen();
      }
    } else {
      p.lockpickProgress = Math.max(0, p.lockpickProgress - dt * 1.5);
    }

    // Tools.
    if (this.input.wasPressed('smoke')) this.useSmoke();
    if (this.input.wasPressed('emp')) this.useEmp();

    // Clicks: HUD tool buttons first, otherwise set a move target.
    if (this.input.click) {
      const c = this.input.click;
      if (c.x >= 940 && c.x <= 974 && c.y >= 12 && c.y <= 46) this.useSmoke();
      else if (c.x >= 985 && c.x <= 1019 && c.y >= 12 && c.y <= 46) this.useEmp();
      else if (c.y > 70) {
        this.input.moveTarget = { x: c.x, y: c.y };
        p.moveMarker = { x: c.x, y: c.y };
      }
    }

    // Smoke clouds fade.
    for (const s of this.smoke) s.life -= dt;
    this.smoke = this.smoke.filter((s) => s.life > 0);

    // Watchers.
    for (const g of this.guards) {
      g.update(dt, p, level.solids, this.smoke, (src) => this.tripAlarm(25, src));
    }
    for (const c of this.cameras) {
      c.update(dt, p, level.solids, this.smoke, (src) => this.tripAlarm(20, src));
    }

    // Alarm decay, unless the building is in lockdown.
    if (this.lockdown > 0) {
      this.lockdown -= dt;
      this.lockdownPulse -= dt;
      if (this.lockdownPulse <= 0) {
        this.lockdownPulse = 0.4;
        for (const g of this.guards) {
          g.lastSeen = { x: p.x, y: p.y };
          g.chaseTimer = 2;
          if (g.state !== 'chase' && g.state !== 'stunned') g.state = 'chase';
        }
      }
      if (this.lockdown <= 0) {
        this.bust('The lockdown sealed the building — the crew got caught inside.');
        return;
      }
    } else if (this.alarm > 0) {
      this.alarm = Math.max(0, this.alarm - ALARM_DECAY * dt);
      if (this.alarm < 70) this.sfx.stopAlarm();
    }

    // Caught?
    for (const g of this.guards) {
      if (guardCatches(g, p)) {
        this.bust('A guard grabbed you in the hall — the crew left without you.');
        return;
      }
    }

    // Timer.
    this.timeLeft -= dt;
    if (this.timeLeft <= 0) {
      this.bust('Out of time — the response team arrived before the getaway.');
      return;
    }

    // Getaway: vault cracked and the thief reaches the van.
    if (v.cracked && dist(p.x, p.y, level.exit.x, level.exit.y) < 34) {
      this.completeHeist();
    }
  }

  // ---------- state transitions from keys ----------

  handleKeys() {
    const input = this.input;
    if (input.wasPressed('mute')) {
      const muted = this.sfx.toggleMute();
      this.addFloater(VIEW_W / 2, VIEW_H / 2, muted ? 'Muted' : 'Sound on', '#9aa7bd');
    }
    if (this.state === 'title') {
      if (input.wasPressed('confirm') || input.click) {
        this.sfx.click();
        this.startHeist(0);
      }
      return;
    }
    if (this.state === 'intro') {
      if (input.wasPressed('confirm') || input.click) {
        this.sfx.click();
        this.state = 'playing';
      }
      return;
    }
    if (this.state === 'playing') {
      if (input.wasPressed('pause')) {
        this.state = 'paused';
        this.sfx.click();
      }
      return;
    }
    if (this.state === 'paused') {
      if (input.wasPressed('pause') || input.wasPressed('confirm') || input.click) {
        this.state = 'playing';
        this.sfx.click();
      }
      return;
    }
    if (this.state === 'heistComplete') {
      if (input.wasPressed('confirm') || input.click) {
        this.sfx.click();
        if (this.heistIndex + 1 < levelCount()) this.startHeist(this.heistIndex + 1);
        else this.state = 'runComplete';
      }
      return;
    }
    if (this.state === 'busted') {
      if (input.wasPressed('confirm') || input.click) {
        this.sfx.click();
        if (this.lives > 0) {
          // Retry: give the heist's loot back to the house.
          this.score = this.scoreAtHeistStart;
          this.totalLoot = this.lootAtHeistStart;
          this.startHeist(this.heistIndex);
        } else {
          this.lives = START_LIVES;
          this.score = 0;
          this.totalLoot = 0;
          this.heistsCleared = 0;
          this.state = 'title';
        }
      }
      return;
    }
    if (this.state === 'runComplete') {
      if (input.wasPressed('confirm') || input.click) {
        this.sfx.click();
        this.lives = START_LIVES;
        this.score = 0;
        this.totalLoot = 0;
        this.heistsCleared = 0;
        this.state = 'title';
      }
    }
  }

  // ---------- frame ----------

  frame(dt) {
    this.handleKeys();
    this.update(dt);
    ctx.clearRect(0, 0, VIEW_W, VIEW_H);
    if (this.state === 'title') {
      // A live room behind the title, so the first paint already shows the game.
      if (!this.level) this.startHeist(0);
      this.state = 'title';
      drawGame(ctx, this);
      drawTitle(ctx, this);
    } else if (this.state === 'intro') {
      drawGame(ctx, this);
      drawHeistIntro(ctx, this);
    } else if (this.state === 'heistComplete') {
      drawGame(ctx, this);
      drawHeistComplete(ctx, this);
    } else if (this.state === 'busted') {
      drawGame(ctx, this);
      drawBusted(ctx, this);
    } else if (this.state === 'runComplete') {
      drawGame(ctx, this);
      drawRunComplete(ctx, this);
    } else if (this.state === 'paused') {
      drawGame(ctx, this);
      drawPaused(ctx);
    } else {
      drawGame(ctx, this);
    }
    this.input.endFrame();
  }
}

const game = new Game();
window.__vault = game;

// Staged screenshot views (?shot=cover|alert|casino|win) for the maker.
const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
if (shot) stageShot(game, shot);

let last = performance.now();
function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  game.frame(dt);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
