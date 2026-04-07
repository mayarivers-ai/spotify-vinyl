export type VinylCondition = 'mint' | 'used' | 'worn'

const GAIN_BY_CONDITION: Record<VinylCondition, number> = {
  mint: 0.18,
  used: 0.35,
  worn: 0.65,
}

export class VinylAudioEngine {
  private ctx: AudioContext | null = null
  private crackleSource: AudioBufferSourceNode | null = null
  private crackleGain: GainNode | null = null
  private masterGain: GainNode | null = null
  private initialized = false

  async init(): Promise<void> {
    if (this.initialized) return
    this.ctx = new AudioContext()
    this.masterGain = this.ctx.createGain()
    this.masterGain.gain.value = 0.8
    this.masterGain.connect(this.ctx.destination)
    this.initialized = true
  }

  private ensureCtx(): AudioContext {
    if (!this.ctx || !this.initialized) throw new Error('AudioEngine not initialized')
    return this.ctx
  }

  // ── Vinyl crackle ────────────────────────────────────────────────────────

  startCrackle(condition: VinylCondition = 'used', _intensity = 1, fadeInMs = 800): void {
    const ctx = this.ensureCtx()
    this.stopCrackle()

    this.crackleGain = ctx.createGain()
    this.crackleGain.gain.value = 0
    this.crackleGain.connect(this.masterGain!)

    this.crackleSource = this.buildVinylNoise(ctx, this.crackleGain, condition)

    const targetGain = GAIN_BY_CONDITION[condition]
    this.crackleGain.gain.linearRampToValueAtTime(
      targetGain,
      ctx.currentTime + fadeInMs / 1000
    )
  }

  stopCrackle(): void {
    if (this.crackleSource) {
      try { this.crackleSource.stop() } catch { /* already stopped */ }
      this.crackleSource = null
    }
    this.crackleGain = null
  }

  fadeOut(durationMs: number): void {
    if (!this.crackleGain || !this.ctx) return
    this.crackleGain.gain.setTargetAtTime(0, this.ctx.currentTime, durationMs / 3000)
    setTimeout(() => this.stopCrackle(), durationMs + 100)
  }

  private buildVinylNoise(
    ctx: AudioContext,
    destination: AudioNode,
    condition: VinylCondition
  ): AudioBufferSourceNode {
    // 10 seconds of realistic vinyl surface noise
    const duration = 10
    const sr = ctx.sampleRate
    const bufSize = sr * duration
    const buf = ctx.createBuffer(1, bufSize, sr)
    const data = buf.getChannelData(0)

    // Density of events per condition
    const popDensity  = condition === 'mint' ? 0.8  : condition === 'used' ? 2.5  : 5.0
    const tickDensity = condition === 'mint' ? 1.5  : condition === 'used' ? 4.0  : 8.0
    const hissLevel   = condition === 'mint' ? 0.008 : condition === 'used' ? 0.014 : 0.022

    // Continuous background hiss
    for (let i = 0; i < bufSize; i++) {
      data[i] = (Math.random() * 2 - 1) * hissLevel
    }

    // Soft pops: shaped noise bursts
    const numPops = Math.floor(duration * popDensity)
    for (let p = 0; p < numPops; p++) {
      const pos = Math.floor(Math.random() * bufSize)
      const len = Math.floor(sr * (0.004 + Math.random() * 0.018))
      const amp = 0.06 + Math.random() * 0.18
      for (let i = 0; i < len && pos + i < bufSize; i++) {
        const t = i / len
        const env = Math.sin(Math.PI * t) * Math.exp(-t * 4)
        data[pos + i] += (Math.random() * 2 - 1) * env * amp
      }
    }

    // Sharp ticks: single-sample transients
    const numTicks = Math.floor(duration * tickDensity)
    for (let t = 0; t < numTicks; t++) {
      const pos = Math.floor(Math.random() * bufSize)
      const amp = 0.08 + Math.random() * 0.22
      data[pos] += (Math.random() > 0.5 ? 1 : -1) * amp
      if (pos + 1 < bufSize) data[pos + 1] += (Math.random() * 2 - 1) * amp * 0.3
    }

    // Chain: bandpass (records roll off lows/highs) + high-shelf cut
    const bandpass = ctx.createBiquadFilter()
    bandpass.type = 'bandpass'
    bandpass.frequency.value = 1400
    bandpass.Q.value = 0.25

    const shelf = ctx.createBiquadFilter()
    shelf.type = 'highshelf'
    shelf.frequency.value = 7000
    shelf.gain.value = -10

    const source = ctx.createBufferSource()
    source.buffer = buf
    source.loop = true
    source.connect(bandpass)
    bandpass.connect(shelf)
    shelf.connect(destination)
    source.start()

    return source
  }

  // ── One-shot sounds ────────────────────────────────────────────────────

  /** Electric snap when the turntable powers on */
  playElectricPop(): void {
    const ctx = this.ctx
    if (!ctx || !this.masterGain) return
    const now = ctx.currentTime

    // Sharp noise burst – like a static discharge
    const len = Math.floor(ctx.sampleRate * 0.055)
    const buf = ctx.createBuffer(1, len, ctx.sampleRate)
    const d = buf.getChannelData(0)
    for (let i = 0; i < len; i++) {
      d[i] = (Math.random() * 2 - 1) * Math.exp(-i / len * 90)
    }

    const gain = ctx.createGain()
    gain.gain.value = 0.55

    const bp = ctx.createBiquadFilter()
    bp.type = 'bandpass'
    bp.frequency.value = 3200
    bp.Q.value = 4

    const src = ctx.createBufferSource()
    src.buffer = buf
    src.connect(bp)
    bp.connect(gain)
    gain.connect(this.masterGain)
    src.start(now)

    // Tiny follow-up hum
    const osc = ctx.createOscillator()
    const oscGain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.value = 60
    oscGain.gain.setValueAtTime(0.08, now + 0.02)
    oscGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18)
    osc.connect(oscGain)
    oscGain.connect(this.masterGain)
    osc.start(now + 0.02)
    osc.stop(now + 0.18)
  }

  /** Needle touching the record surface */
  playNeedleDrop(): void {
    const ctx = this.ctx
    if (!ctx || !this.masterGain) return
    const now = ctx.currentTime

    // Soft scratch
    const scratchLen = Math.floor(ctx.sampleRate * 0.12)
    const buf = ctx.createBuffer(1, scratchLen, ctx.sampleRate)
    const d = buf.getChannelData(0)
    for (let i = 0; i < scratchLen; i++) {
      const t = i / scratchLen
      d[i] = (Math.random() * 2 - 1) * Math.sin(Math.PI * t) * 0.4
    }

    const scratchGain = ctx.createGain()
    scratchGain.gain.value = 0.5
    const scratchFilter = ctx.createBiquadFilter()
    scratchFilter.type = 'bandpass'
    scratchFilter.frequency.value = 2800
    scratchFilter.Q.value = 2

    const src = ctx.createBufferSource()
    src.buffer = buf
    src.connect(scratchFilter)
    scratchFilter.connect(scratchGain)
    scratchGain.connect(this.masterGain)
    src.start(now)

    // Thud as needle settles
    const osc = ctx.createOscillator()
    const thudGain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(120, now + 0.08)
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.22)
    thudGain.gain.setValueAtTime(0.22, now + 0.08)
    thudGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.28)
    osc.connect(thudGain)
    thudGain.connect(this.masterGain)
    osc.start(now + 0.08)
    osc.stop(now + 0.3)
  }

  /** Needle lifting off the record */
  playNeedleLift(): void {
    const ctx = this.ctx
    if (!ctx || !this.masterGain) return
    const now = ctx.currentTime

    // Short upward scratch (reverse feel)
    const len = Math.floor(ctx.sampleRate * 0.08)
    const buf = ctx.createBuffer(1, len, ctx.sampleRate)
    const d = buf.getChannelData(0)
    for (let i = 0; i < len; i++) {
      const t = i / len
      d[i] = (Math.random() * 2 - 1) * (1 - t) * 0.35
    }

    const filter = ctx.createBiquadFilter()
    filter.type = 'bandpass'
    filter.frequency.value = 3500
    filter.Q.value = 3

    const gain = ctx.createGain()
    gain.gain.value = 0.45

    const src = ctx.createBufferSource()
    src.buffer = buf
    src.connect(filter)
    filter.connect(gain)
    gain.connect(this.masterGain)
    src.start(now)
  }

  /** Two footsteps on a wooden floor */
  playFootsteps(steps = 2): void {
    const ctx = this.ctx
    if (!ctx || !this.masterGain) return

    for (let s = 0; s < steps; s++) {
      const t0 = ctx.currentTime + s * 0.44

      // Low thud oscillator
      const osc = ctx.createOscillator()
      const oscGain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(85 + Math.random() * 15, t0)
      osc.frequency.exponentialRampToValueAtTime(38, t0 + 0.12)
      oscGain.gain.setValueAtTime(0.22, t0)
      oscGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.2)

      // Noise slap
      const nLen = Math.floor(ctx.sampleRate * 0.04)
      const nBuf = ctx.createBuffer(1, nLen, ctx.sampleRate)
      const nd = nBuf.getChannelData(0)
      for (let i = 0; i < nLen; i++) {
        nd[i] = (Math.random() * 2 - 1) * Math.exp(-i / nLen * 18)
      }
      const noiseGain = ctx.createGain()
      noiseGain.gain.value = 0.09
      const noiseFilter = ctx.createBiquadFilter()
      noiseFilter.type = 'lowpass'
      noiseFilter.frequency.value = 320

      const nSrc = ctx.createBufferSource()
      nSrc.buffer = nBuf

      osc.connect(oscGain)
      nSrc.connect(noiseGain)
      noiseGain.connect(noiseFilter)
      noiseFilter.connect(this.masterGain)
      oscGain.connect(this.masterGain)

      osc.start(t0); osc.stop(t0 + 0.22)
      nSrc.start(t0)
    }
  }

  /** Flip sound: lift + drop sequence */
  playFlipSound(): void {
    this.playNeedleLift()
    setTimeout(() => this.playNeedleDrop(), 2200)
  }

  setMasterVolume(volume: number): void {
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(
        Math.max(0, Math.min(1, volume)),
        this.ctx.currentTime,
        0.05
      )
    }
  }

  suspend(): void { this.ctx?.suspend() }
  resume(): void  { this.ctx?.resume()  }

  destroy(): void {
    this.stopCrackle()
    this.ctx?.close()
    this.ctx = null
    this.initialized = false
  }
}
