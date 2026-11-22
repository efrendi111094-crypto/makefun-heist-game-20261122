// Midnight Vault — guard AI. One job: patrol, notice, chase, give up.
// A guard walks its waypoint loop, pauses to look around at each stop, and
// grows suspicious when the thief crosses its cone. Full suspicion trips the
// alarm and starts a chase; losing sight for a while returns it to patrol.

import {
  GUARD_SPEED, GUARD_CHASE_SPEED, VISION_RANGE, VISION_HALF_ANGLE,
  angleDiff, clamp, dist, lerp,
} from './config.js';
import { canSee, noticeRate } from './vision.js';

export const SUSPICION_FULL = 100;
const SUSPICION_GAIN = 95; // per second at full notice rate
const SUSPICION_FADE = 26; // per second while the thief is unseen
const CHASE_MEMORY = 6; // seconds a guard hunts the last seen spot
const PAUSE_AT_WAYPOINT = 1.1; // seconds spent looking around

export class Guard {
  constructor(def, x, y) {
    this.waypoints = def.waypoints;
    this.x = x;
    this.y = y;
    this.targetIndex = 1 % this.waypoints.length;
    this.facing = 0;
    this.state = 'patrol'; // patrol | suspicious | chase | stunned
    this.suspicion = 0;
    this.pauseTimer = 0;
    this.lookAngle = 0;
    this.chaseTimer = 0;
    this.lastSeen = null;
    this.stunTimer = 0;
    this.caughtFlash = 0;
    // Face the first leg of the patrol.
    const t = this.waypoints[this.targetIndex];
    this.facing = Math.atan2(t.y - y, t.x - x);
  }

  // Blind the guard for a while (smoke bomb). Suspicion melts while blind.
  stun(seconds) {
    this.stunTimer = Math.max(this.stunTimer, seconds);
    this.state = 'stunned';
    this.suspicion = Math.max(0, this.suspicion - 40);
  }

  update(dt, player, solids, smokeClouds, onAlarmTrip) {
    if (this.stunTimer > 0) {
      this.stunTimer -= dt;
      this.suspicion = Math.max(0, this.suspicion - 30 * dt);
      if (this.stunTimer <= 0) this.state = this.suspicion > 50 ? 'suspicious' : 'patrol';
      return;
    }

    const inSmoke = smokeClouds.some((s) => dist(this.x, this.y, s.x, s.y) < s.r + 14);
    const playerHidden = player.hiddenInSmoke(smokeClouds) || player.hiddenInVent;
    const sees = !inSmoke && !playerHidden && canSee(
      this.x, this.y, this.facing, VISION_HALF_ANGLE, VISION_RANGE,
      player.x, player.y, solids,
    );

    if (sees) {
      const d = dist(this.x, this.y, player.x, player.y);
      this.suspicion = clamp(
        this.suspicion + SUSPICION_GAIN * noticeRate(d, player.sneaking, player.onVent) * dt,
        0, SUSPICION_FULL,
      );
      this.lastSeen = { x: player.x, y: player.y };
      this.chaseTimer = CHASE_MEMORY;
      if (this.suspicion >= SUSPICION_FULL && this.state !== 'chase') {
        this.state = 'chase';
        this.caughtFlash = 0.5;
        onAlarmTrip(this);
      }
    } else {
      this.suspicion = clamp(this.suspicion - SUSPICION_FADE * dt, 0, SUSPICION_FULL);
      if (this.state === 'suspicious' && this.suspicion <= 0) this.state = 'patrol';
    }

    if (this.state === 'chase') {
      this.chaseTimer -= dt;
      const target = this.lastSeen || this.waypoints[this.targetIndex];
      this.moveToward(target.x, target.y, GUARD_CHASE_SPEED * dt, solids);
      this.facing = Math.atan2(target.y - this.y, target.x - this.x);
      if (this.chaseTimer <= 0) {
        this.state = this.suspicion > 40 ? 'suspicious' : 'patrol';
        this.pickNearestWaypoint();
      }
    } else if (this.state === 'suspicious') {
      // Stand and scan toward the last seen spot, then resume the patrol.
      if (this.lastSeen) {
        const want = Math.atan2(this.lastSeen.y - this.y, this.lastSeen.x - this.x);
        this.facing += clamp(angleDiff(want, this.facing), -2.4 * dt, 2.4 * dt);
      }
    } else {
      this.patrol(dt, solids);
    }
    if (this.caughtFlash > 0) this.caughtFlash -= dt;
  }

  patrol(dt, solids) {
    if (this.pauseTimer > 0) {
      this.pauseTimer -= dt;
      // Look around while paused: slow sweep left and right.
      this.lookAngle += dt * 1.4;
      this.facing += Math.sin(this.lookAngle) * 0.9 * dt;
      return;
    }
    const t = this.waypoints[this.targetIndex];
    const d = dist(this.x, this.y, t.x, t.y);
    if (d < 6) {
      this.targetIndex = (this.targetIndex + 1) % this.waypoints.length;
      this.pauseTimer = PAUSE_AT_WAYPOINT;
      this.lookAngle = 0;
      return;
    }
    this.moveToward(t.x, t.y, GUARD_SPEED * dt, solids);
    const want = Math.atan2(t.y - this.y, t.x - this.x);
    this.facing += clamp(angleDiff(want, this.facing), -3.2 * dt, 3.2 * dt);
  }

  moveToward(tx, ty, step, solids) {
    const dx = tx - this.x;
    const dy = ty - this.y;
    const d = Math.hypot(dx, dy);
    if (d < 0.001) return;
    const nx = this.x + (dx / d) * Math.min(step, d);
    const ny = this.y + (dy / d) * Math.min(step, d);
    // Axis-separated slide so guards glide along walls instead of sticking.
    if (!hitsSolid(nx, this.y, 13, solids)) this.x = nx;
    if (!hitsSolid(this.x, ny, 13, solids)) this.y = ny;
  }

  pickNearestWaypoint() {
    let best = 0;
    let bestD = Infinity;
    this.waypoints.forEach((w, i) => {
      const d = dist(this.x, this.y, w.x, w.y);
      if (d < bestD) { bestD = d; best = i; }
    });
    this.targetIndex = best;
  }
}

export function hitsSolid(x, y, radius, solids) {
  for (const r of solids) {
    const cx = clamp(x, r.x, r.x + r.w);
    const cy = clamp(y, r.y, r.y + r.h);
    if (dist(x, y, cx, cy) < radius) return true;
  }
  return false;
}

// Move a circle through the room with wall sliding; returns the new position.
export function moveCircle(x, y, dx, dy, radius, solids) {
  const nx = x + dx;
  const ny = y + dy;
  let outX = x;
  let outY = y;
  if (!hitsSolid(nx, y, radius, solids)) outX = nx;
  if (!hitsSolid(outX, ny, radius, solids)) outY = ny;
  return { x: outX, y: outY };
}

// True when the player is close enough to a guard to be grabbed.
export function guardCatches(guard, player) {
  return dist(guard.x, guard.y, player.x, player.y) < 24 && guard.state === 'chase';
}

export { lerp };
