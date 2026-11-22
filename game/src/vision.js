// Midnight Vault — line of sight and vision-cone math. One job: answer
// "can this watcher see that point?" and draw the cone it sees through.
// Walls and solid props block sight; smoke clouds and vents hide the thief.

import { VISION_RANGE, clamp } from './config.js';

// Segment vs axis-aligned rectangle: true when the segment touches the rect.
export function segmentHitsRect(x1, y1, x2, y2, r) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  let tMin = 0;
  let tMax = 1;
  if (Math.abs(dx) < 1e-9) {
    if (x1 < r.x || x1 > r.x + r.w) return false;
  } else {
    let t1 = (r.x - x1) / dx;
    let t2 = (r.x + r.w - x1) / dx;
    if (t1 > t2) [t1, t2] = [t2, t1];
    tMin = Math.max(tMin, t1);
    tMax = Math.min(tMax, t2);
    if (tMin > tMax) return false;
  }
  if (Math.abs(dy) < 1e-9) {
    if (y1 < r.y || y1 > r.y + r.h) return false;
  } else {
    let t1 = (r.y - y1) / dy;
    let t2 = (r.y + r.h - y1) / dy;
    if (t1 > t2) [t1, t2] = [t2, t1];
    tMin = Math.max(tMin, t1);
    tMax = Math.min(tMax, t2);
    if (tMin > tMax) return false;
  }
  return true;
}

// True when nothing solid stands between the two points.
export function lineOfSight(x1, y1, x2, y2, solids) {
  for (const r of solids) {
    if (segmentHitsRect(x1, y1, x2, y2, r)) return false;
  }
  return true;
}

// Distance along a ray to the nearest solid, capped at maxDist.
export function rayDistance(ox, oy, angle, maxDist, solids) {
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  let best = maxDist;
  for (const r of solids) {
    // Slab test, but keep the nearest entry distance.
    let tMin = 0;
    let tMax = best;
    let ok = true;
    if (Math.abs(dx) < 1e-9) {
      if (ox < r.x || ox > r.x + r.w) ok = false;
    } else {
      let t1 = (r.x - ox) / dx;
      let t2 = (r.x + r.w - ox) / dx;
      if (t1 > t2) [t1, t2] = [t2, t1];
      tMin = Math.max(tMin, t1);
      tMax = Math.min(tMax, t2);
      if (tMin > tMax) ok = false;
    }
    if (ok) {
      if (Math.abs(dy) < 1e-9) {
        if (oy < r.y || oy > r.y + r.h) ok = false;
      } else {
        let t1 = (r.y - oy) / dy;
        let t2 = (r.y + r.h - oy) / dy;
        if (t1 > t2) [t1, t2] = [t2, t1];
        tMin = Math.max(tMin, t1);
        tMax = Math.min(tMax, t2);
        if (tMin > tMax) ok = false;
      }
    }
    if (ok && tMin < best && tMin >= 0) best = tMin;
  }
  return best;
}

// Visibility polygon for a cone: cast rays across the cone and clip each at
// the nearest wall, so the drawn cone hugs the room like real sight does.
export function conePolygon(ox, oy, facing, halfAngle, range, solids, rays = 26) {
  const pts = [{ x: ox, y: oy }];
  for (let i = 0; i <= rays; i++) {
    const a = facing - halfAngle + (2 * halfAngle * i) / rays;
    const d = rayDistance(ox, oy, a, range, solids);
    pts.push({ x: ox + Math.cos(a) * d, y: oy + Math.sin(a) * d });
  }
  return pts;
}

// Can a watcher at (ox, oy) facing `facing` with `halfAngle` and `range`
// see the point (px, py)? Range, angle and a clear line of sight must agree.
export function canSee(ox, oy, facing, halfAngle, range, px, py, solids) {
  const dx = px - ox;
  const dy = py - oy;
  const d = Math.hypot(dx, dy);
  if (d > range) return false;
  if (d < 1) return true;
  const ang = Math.atan2(dy, dx);
  let diff = ang - facing;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff <= -Math.PI) diff += Math.PI * 2;
  if (Math.abs(diff) > halfAngle) return false;
  return lineOfSight(ox, oy, px, py, solids);
}

// How strongly a watcher notices the thief: 1.0 up close or running in the
// open, down to 0.25 far away and sneaking. Vents hide a sneaking thief.
export function noticeRate(d, sneaking, onVent) {
  if (onVent && sneaking) return 0;
  const near = clamp(1 - d / (VISION_RANGE * 1.15), 0.2, 1);
  return near * (sneaking ? 0.55 : 1);
}
