import type { EqPresetId, EqSettings } from "../types/music";

export interface EqBandMeta {
  index: 0 | 1 | 2 | 3 | 4;
  freq: number;
  label: string;
  shortLabel: string;
  type: BiquadFilterType;
}

export const EQ_BAND_META: readonly EqBandMeta[] = [
  { index: 0, freq: 60, label: "60 Hz", shortLabel: "60", type: "lowshelf" },
  { index: 1, freq: 230, label: "230 Hz", shortLabel: "230", type: "peaking" },
  { index: 2, freq: 910, label: "910 Hz", shortLabel: "910", type: "peaking" },
  { index: 3, freq: 3600, label: "3.6 kHz", shortLabel: "3.6k", type: "peaking" },
  { index: 4, freq: 14000, label: "14 kHz", shortLabel: "14k", type: "highshelf" },
] as const;

export const EQ_PRESETS: Record<
  Exclude<EqPresetId, "custom">,
  { label: string; desc: string; bands: [number, number, number, number, number]; bassBoost: number }
> = {
  flat: {
    label: "Flat",
    desc: "Netral sesuai mastering studio asli",
    bands: [0, 0, 0, 0, 0],
    bassBoost: 0,
  },
  bass: {
    label: "Bass Boost",
    desc: "Sub-bass dalam & punchy untuk EDM / Hip-Hop",
    bands: [6, 4, 0, 1, 2],
    bassBoost: 5,
  },
  vocal: {
    label: "Vocal Clear",
    desc: "Vokal jernih di depan instrumen",
    bands: [-2, 1, 4, 3, 1],
    bassBoost: 0,
  },
  acoustic: {
    label: "Acoustic",
    desc: "Hangat & natural untuk gitar dan instrumen live",
    bands: [3, 2, 1, 3, 4],
    bassBoost: 1,
  },
  electronic: {
    label: "Electronic",
    desc: "Kurva V dinamis dengan high berkilau",
    bands: [5, 2, -1, 3, 5],
    bassBoost: 3,
  },
  latenight: {
    label: "Late Night",
    desc: "Lembut, seimbang, nyaman di volume rendah",
    bands: [3, 1, 0, -1, -2],
    bassBoost: 2,
  },
};

export const DEFAULT_EQ_SETTINGS: EqSettings = {
  enabled: false,
  preset: "flat",
  bands: [0, 0, 0, 0, 0],
  bassBoost: 0,
};

/**
 * Convert semitone shift (-12..+12) to playback frequency multiplier (0.5x..2.0x)
 */
export function semitonesToRatio(semitones: number): number {
  return Math.pow(2, semitones / 12);
}

/**
 * Real Web Audio API DSP graph for local HTML5 audio / direct audio streams.
 * Provides 5-band BiquadFilterNode EQ, Bass Boost shelf, Soft Limiter,
 * Pitch-preserving toggle, and real-time AnalyserNode FFT output.
 */
export class WebAudioDspGraph {
  private ctx: AudioContext | null = null;
  private source: MediaElementAudioSourceNode | null = null;
  private filters: BiquadFilterNode[] = [];
  private bassNode: BiquadFilterNode | null = null;
  private preamp: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private analyser: AnalyserNode | null = null;
  private connectedEl: HTMLMediaElement | null = null;
  private freqBins: Uint8Array<ArrayBuffer> | null = null;

  connectElement(el: HTMLMediaElement, eq: EqSettings): void {
    if (typeof window === "undefined") return;
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    if (!this.ctx) {
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === "suspended") {
      void this.ctx.resume();
    }

    if (this.connectedEl === el) {
      this.applyEq(eq);
      return;
    }

    this.connectedEl = el;
    this.source = this.ctx.createMediaElementSource(el);
    this.preamp = this.ctx.createGain();
    this.bassNode = this.ctx.createBiquadFilter();
    this.bassNode.type = "lowshelf";
    this.bassNode.frequency.value = 80;

    this.filters = EQ_BAND_META.map((meta) => {
      const f = this.ctx!.createBiquadFilter();
      f.type = meta.type;
      f.frequency.value = meta.freq;
      f.Q.value = 1.1;
      f.gain.value = 0;
      return f;
    });

    this.compressor = this.ctx.createDynamicsCompressor();
    this.compressor.threshold.value = -10;
    this.compressor.knee.value = 18;
    this.compressor.ratio.value = 4;
    this.compressor.attack.value = 0.005;
    this.compressor.release.value = 0.16;

    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 128;
    this.analyser.smoothingTimeConstant = 0.78;
    this.freqBins = new Uint8Array(new ArrayBuffer(this.analyser.frequencyBinCount));

    let chain: AudioNode = this.source;
    chain.connect(this.preamp);
    chain = this.preamp;
    chain.connect(this.bassNode);
    chain = this.bassNode;
    for (const f of this.filters) {
      chain.connect(f);
      chain = f;
    }
    chain.connect(this.compressor);
    this.compressor.connect(this.analyser);
    this.analyser.connect(this.ctx.destination);

    this.applyEq(eq);
  }

  applyEq(eq: EqSettings): void {
    if (!this.ctx || this.filters.length !== 5) return;
    const now = this.ctx.currentTime;
    const active = eq.enabled;
    let maxGain = 0;

    this.filters.forEach((filter, i) => {
      const target = active ? Math.max(-12, Math.min(12, eq.bands[i] ?? 0)) : 0;
      if (target > maxGain) maxGain = target;
      filter.gain.setTargetAtTime(target, now, 0.04);
    });

    const bassTarget = active ? Math.max(0, Math.min(12, eq.bassBoost ?? 0)) : 0;
    this.bassNode?.gain.setTargetAtTime(bassTarget, now, 0.04);

    // Subtle anti-clipping headroom attenuation when high positive boost is applied
    const headroomDb = active ? -Math.min(5, Math.max(0, (maxGain + bassTarget * 0.5) * 0.35)) : 0;
    const linearGain = Math.pow(10, headroomDb / 20);
    this.preamp?.gain.setTargetAtTime(linearGain, now, 0.05);
  }

  /**
   * Applies pitch & playback speed on an HTMLAudioElement when running in Web Audio local mode.
   */
  applyPitchAndSpeed(el: HTMLMediaElement, speed: number, pitchSemitones: number): void {
    const pitchRatio = semitonesToRatio(pitchSemitones);
    const combined = Math.max(0.25, Math.min(3.0, speed * pitchRatio));
    const media = el as HTMLMediaElement & {
      preservesPitch?: boolean;
      mozPreservesPitch?: boolean;
      webkitPreservesPitch?: boolean;
    };
    const preserve = Math.abs(pitchSemitones) < 0.05;
    media.preservesPitch = preserve;
    media.mozPreservesPitch = preserve;
    media.webkitPreservesPitch = preserve;
    el.playbackRate = combined;
  }

  getFrequencyData(): Uint8Array | null {
    if (!this.analyser || !this.freqBins) return null;
    this.analyser.getByteFrequencyData(this.freqBins);
    return this.freqBins;
  }

  destroy(): void {
    try {
      this.source?.disconnect();
      this.preamp?.disconnect();
      this.bassNode?.disconnect();
      this.filters.forEach((f) => f.disconnect());
      this.compressor?.disconnect();
      this.analyser?.disconnect();
      void this.ctx?.close();
    } catch {
      // ignore cleanup errors
    }
    this.ctx = null;
    this.connectedEl = null;
    this.filters = [];
  }
}

export const sharedAudioDsp = new WebAudioDspGraph();
