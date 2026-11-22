// Midnight Vault — security cameras. One job: sweep a cone back and forth
// and spot the thief. A camera never chases; it feeds the alarm instead, and
// an EMP pulse shuts every camera down for a few seconds.

import { CAMERA_RANGE, CAMERA_HALF_ANGLE, clamp, dist } from './config.js';
import { canSee, noticeRate } from './vision.js';

const CAMERA_GAIN = 120; // suspicion per second at full notice rate

export class Camera {
  constructor(def) {
    this.x = def.x;
    this.y = def.y;
    this.baseAngle = def.baseAngle;
    this.sweep = def.sweep;
    this.phase = def.phase || 0;
    this.time = this.phase * 1.7;
    this.angle = this.baseAngle;
    this.disabledTimer = 0;
    this.alert = 0; // 0..1, how hot this camera's feed is right now
    this.tripped = false;
  }

  disable(seconds) {
    this.disabledTimer = Math.max(this.disabledTimer, seconds);
    this.alert = 0;
  }

  get disabled() {
    return this.disabledTimer > 0;
  }

  update(dt, player, solids, smokeClouds, onAlarmTrip) {
    if (this.disabledTimer > 0) {
      this.disabledTimer -= dt;
      return;
    }
    // Slow pendulum sweep around the base angle.
    this.time += dt;
    this.angle = this.baseAngle + Math.sin(this.time * 0.55) * this.sweep;

    const playerHidden = player.hiddenInSmoke(smokeClouds) || player.hiddenInVent;
    const sees = !playerHidden && canSee(
      this.x, this.y, this.angle, CAMERA_HALF_ANGLE, CAMERA_RANGE,
      player.x, player.y, solids,
    );
    if (sees) {
      const d = dist(this.x, this.y, player.x, player.y);
      this.alert = clamp(this.alert + CAMERA_GAIN * noticeRate(d, player.sneaking, player.onVent) * dt / 100, 0, 1);
      if (this.alert >= 1 && !this.tripped) {
        this.tripped = true;
        onAlarmTrip(this);
      }
    } else {
      this.alert = clamp(this.alert - 0.35 * dt, 0, 1);
      if (this.alert < 0.4) this.tripped = false;
    }
  }
}
