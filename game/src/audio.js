// Midnight Vault — synthesized sound. One job: every blip, alarm and jingle,
// made with WebAudio oscillators so the game ships zero audio files.
// Nothing plays until the first key press or click (browser autoplay rules).

export class Sfx {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.alarmNodes = null;
    this.musicTimer = null;
    this.musicStep = 0;
  }

  ensure() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.muted) this.stopAlarm();
    return this.muted;
  }

  // One short tone: frequency slide, gain envelope, done.
  tone(freqA, freqB, seconds, type = 'sine', volume = 0.14, when = 0) {
    if (this.muted || !this.ctx) return;
    const t0 = this.ctx.currentTime + when;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freqA, t0);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, freqB), t0 + seconds);
    gain.gain.setValueAtTime(volume, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + seconds);
    osc.connect(gain).connect(this.ctx.destination);
    osc.start(t0);
    osc.stop(t0 + seconds + 0.02);
  }

  footstep(sneaking) {
    this.tone(sneaking ? 90 : 140, 70, 0.06, 'triangle', sneaking ? 0.03 : 0.05);
  }

  pickup() {
    this.tone(880, 1320, 0.12, 'sine', 0.12);
    this.tone(1320, 1760, 0.1, 'sine', 0.08, 0.07);
  }

  gemPickup() {
    this.tone(1046, 1568, 0.14, 'triangle', 0.12);
    this.tone(1568, 2093, 0.12, 'sine', 0.09, 0.08);
  }

  spotted() {
    this.tone(220, 440, 0.25, 'square', 0.07);
  }

  alarmTrip() {
    this.tone(660, 330, 0.4, 'sawtooth', 0.09);
    this.tone(660, 330, 0.4, 'sawtooth', 0.09, 0.25);
  }

  lockpickTick(progress) {
    this.tone(300 + progress * 500, 300 + progress * 500, 0.05, 'square', 0.05);
  }

  vaultOpen() {
    [523, 659, 784, 1046].forEach((f, i) => this.tone(f, f, 0.16, 'triangle', 0.1, i * 0.09));
  }

  smoke() {
    this.tone(400, 90, 0.35, 'sine', 0.08);
  }

  emp() {
    this.tone(1200, 120, 0.4, 'sawtooth', 0.07);
  }

  busted() {
    [392, 311, 233, 175].forEach((f, i) => this.tone(f, f * 0.94, 0.28, 'sawtooth', 0.1, i * 0.16));
  }

  win() {
    [523, 659, 784, 1046, 1318].forEach((f, i) => this.tone(f, f, 0.22, 'triangle', 0.11, i * 0.11));
  }

  click() {
    this.tone(700, 500, 0.05, 'square', 0.05);
  }

  // Two-tone wail while the alarm is high; start/stop with the alarm level.
  startAlarm() {
    if (this.muted || !this.ctx || this.alarmNodes) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.value = 520;
    lfo.type = 'sine';
    lfo.frequency.value = 1.6;
    lfoGain.gain.value = 180;
    lfo.connect(lfoGain).connect(osc.frequency);
    gain.gain.value = 0.035;
    osc.connect(gain).connect(this.ctx.destination);
    osc.start();
    lfo.start();
    this.alarmNodes = { osc, lfo, gain };
  }

  stopAlarm() {
    if (!this.alarmNodes) return;
    try {
      this.alarmNodes.osc.stop();
      this.alarmNodes.lfo.stop();
    } catch (e) { /* already stopped */ }
    this.alarmNodes = null;
  }

  // A quiet bass pulse that keeps the tension up while playing. The notes
  // walk a minor line; the tempo is slow so it never gets annoying.
  startMusic() {
    if (this.muted || !this.ctx || this.musicTimer) return;
    const bass = [55, 0, 65.4, 0, 49, 0, 58.3, 0, 55, 0, 65.4, 0, 73.4, 65.4, 58.3, 49];
    this.musicStep = 0;
    this.musicTimer = setInterval(() => {
      if (this.muted || !this.ctx) return;
      const f = bass[this.musicStep % bass.length];
      this.musicStep += 1;
      if (f > 0) this.tone(f, f, 0.42, 'triangle', 0.05);
    }, 340);
  }

  stopMusic() {
    if (this.musicTimer) {
      clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }
}
