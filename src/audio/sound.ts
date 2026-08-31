/* Generative sound design — no assets. A low gravitational drone whose
   filter opens as you fall deeper, plus sparse instrument blips. */

class SoundManager {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private droneGain: GainNode | null = null;
  private droneFilter: BiquadFilterNode | null = null;
  private oscs: OscillatorNode[] = [];
  private noiseSrc: AudioBufferSourceNode | null = null;
  private enabled = false;
  private ready = false;

  init() {
    if (this.ready) return;
    try {
      const Ctx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new Ctx();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0;
      this.master.connect(this.ctx.destination);

      // deep drone — two detuned oscillators through a slow-breathing filter
      this.droneFilter = this.ctx.createBiquadFilter();
      this.droneFilter.type = "lowpass";
      this.droneFilter.frequency.value = 140;
      this.droneFilter.Q.value = 1.4;
      this.droneGain = this.ctx.createGain();
      this.droneGain.gain.value = 0.055;
      this.droneFilter.connect(this.droneGain);
      this.droneGain.connect(this.master);

      [41.2, 41.7, 82.6].forEach((f, i) => {
        const o = this.ctx!.createOscillator();
        o.type = i === 2 ? "triangle" : "sine";
        o.frequency.value = f;
        const g = this.ctx!.createGain();
        g.gain.value = i === 2 ? 0.25 : 0.6;
        o.connect(g);
        g.connect(this.droneFilter!);
        o.start();
        this.oscs.push(o);
      });

      // filtered noise bed — the "machine" hiss
      const len = this.ctx.sampleRate * 2;
      const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = buf.getChannelData(0);
      let last = 0;
      for (let i = 0; i < len; i++) {
        const w = Math.random() * 2 - 1;
        last = (last + 0.02 * w) / 1.02;
        data[i] = last * 3.2;
      }
      this.noiseSrc = this.ctx.createBufferSource();
      this.noiseSrc.buffer = buf;
      this.noiseSrc.loop = true;
      const nf = this.ctx.createBiquadFilter();
      nf.type = "bandpass";
      nf.frequency.value = 320;
      nf.Q.value = 0.6;
      const ng = this.ctx.createGain();
      ng.gain.value = 0.012;
      this.noiseSrc.connect(nf);
      nf.connect(ng);
      ng.connect(this.master);
      this.noiseSrc.start();

      this.ready = true;
    } catch {
      this.ready = false;
    }
  }

  setEnabled(on: boolean) {
    this.enabled = on;
    if (!this.ready || !this.ctx || !this.master) return;
    if (on && this.ctx.state === "suspended") this.ctx.resume().catch(() => {});
    const t = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(t);
    this.master.gain.linearRampToValueAtTime(on ? 0.9 : 0, t + 0.8);
  }

  /** continuous update — depth 0 (far) … 1 (horizon) */
  update(depth: number) {
    if (!this.ready || !this.ctx || !this.enabled) return;
    const t = this.ctx.currentTime;
    this.droneFilter?.frequency.setTargetAtTime(120 + depth * 620, t, 0.4);
    this.droneGain?.gain.setTargetAtTime(0.045 + depth * 0.1, t, 0.5);
  }

  click() {
    this.blip(1150, 0.045, 0.05, "square");
  }

  warn() {
    if (!this.ready || !this.ctx || !this.enabled) return;
    this.blip(392, 0.22, 0.07, "sine");
    setTimeout(() => this.blip(311, 0.3, 0.07, "sine"), 240);
  }

  enter() {
    if (!this.ready || !this.ctx || !this.enabled) return;
    this.blip(180, 1.6, 0.06, "sine");
    this.blip(540, 1.2, 0.02, "triangle");
  }

  private blip(freq: number, dur: number, gain: number, type: OscillatorType) {
    if (!this.ready || !this.ctx || !this.master) return;
    try {
      const t = this.ctx.currentTime;
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = type;
      o.frequency.value = freq;
      g.gain.setValueAtTime(gain, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g);
      g.connect(this.master);
      o.start(t);
      o.stop(t + dur + 0.05);
    } catch { /* ignore */ }
  }
}

export const sound = new SoundManager();
