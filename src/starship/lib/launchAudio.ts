/**
 * Sons de la séquence de lancement, entièrement synthétisés (aucun fichier) :
 * bips du compte à rebours, grondement des moteurs, et annonces vocales
 * lues par la synthèse vocale du navigateur, en français.
 */

type Ctx = AudioContext;

let ctx: Ctx | null = null;
let master: GainNode | null = null;
let rumbleGain: GainNode | null = null;
let rumbleNodes: AudioScheduledSourceNode[] = [];
let muted = false;

const AudioCtor = (): typeof AudioContext | null =>
  typeof window === 'undefined' ? null : window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext ?? null;

/** À appeler pendant un geste de l'utilisateur (clic) : les navigateurs bloquent le son sinon. */
export function unlockAudio(): boolean {
  const Ctor = AudioCtor();
  if (!Ctor) return false;
  try {
    if (!ctx) {
      ctx = new Ctor();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : 0.9;
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -14;
      comp.ratio.value = 6;
      master.connect(comp).connect(ctx.destination);
    }
    void ctx.resume();
    // Réveille aussi la synthèse vocale (Safari et Chrome l'exigent après un geste).
    if (typeof speechSynthesis !== 'undefined') speechSynthesis.getVoices();
    return true;
  } catch {
    return false;
  }
}

export const audioReady = (): boolean => !!ctx && ctx.state === 'running';

export function setMuted(value: boolean): void {
  muted = value;
  if (ctx && master) master.gain.setTargetAtTime(value ? 0 : 0.9, ctx.currentTime, 0.05);
  if (value && typeof speechSynthesis !== 'undefined') speechSynthesis.cancel();
}

/** Bip électronique du compte à rebours. */
export function beep(frequency = 880, duration = 0.14, volume = 0.22): void {
  if (!ctx || !master || muted) return;
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.value = frequency;
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(volume, t + 0.01);
  g.gain.setValueAtTime(volume, t + duration - 0.03);
  g.gain.linearRampToValueAtTime(0, t + duration);
  osc.connect(g).connect(master);
  osc.start(t);
  osc.stop(t + duration + 0.02);
}

function noiseBuffer(c: Ctx, seconds: number, brown: boolean): AudioBuffer {
  const len = Math.floor(c.sampleRate * seconds);
  const buf = c.createBuffer(2, len, c.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = buf.getChannelData(ch);
    let last = 0;
    for (let i = 0; i < len; i++) {
      const white = Math.random() * 2 - 1;
      if (brown) {
        last = (last + 0.02 * white) / 1.02;
        data[i] = last * 3.5;
      } else {
        data[i] = white;
      }
    }
  }
  return buf;
}

/** Démarre le grondement des moteurs (silencieux tant que `setRumble` ne le monte pas). */
function ensureRumble(): void {
  if (!ctx || !master || rumbleGain) return;
  const c = ctx;
  rumbleGain = c.createGain();
  rumbleGain.gain.value = 0;
  rumbleGain.connect(master);

  // Grave continu : bruit brun filtré.
  const low = c.createBufferSource();
  low.buffer = noiseBuffer(c, 4, true);
  low.loop = true;
  const lowpass = c.createBiquadFilter();
  lowpass.type = 'lowpass';
  lowpass.frequency.value = 220;
  const lowGain = c.createGain();
  lowGain.gain.value = 1.4;
  low.connect(lowpass).connect(lowGain).connect(rumbleGain);

  // Crépitement : bruit blanc en bande, modulé par un LFO irrégulier.
  const crackle = c.createBufferSource();
  crackle.buffer = noiseBuffer(c, 3, false);
  crackle.loop = true;
  const band = c.createBiquadFilter();
  band.type = 'bandpass';
  band.frequency.value = 700;
  band.Q.value = 0.7;
  const crackleGain = c.createGain();
  crackleGain.gain.value = 0.18;
  const lfo = c.createOscillator();
  lfo.type = 'square';
  lfo.frequency.value = 13;
  const lfoDepth = c.createGain();
  lfoDepth.gain.value = 0.12;
  lfo.connect(lfoDepth).connect(crackleGain.gain);
  crackle.connect(band).connect(crackleGain).connect(rumbleGain);

  // Infra-grave qui fait vibrer la pièce.
  const sub = c.createOscillator();
  sub.type = 'sawtooth';
  sub.frequency.value = 34;
  const subFilter = c.createBiquadFilter();
  subFilter.type = 'lowpass';
  subFilter.frequency.value = 90;
  const subGain = c.createGain();
  subGain.gain.value = 0.35;
  sub.connect(subFilter).connect(subGain).connect(rumbleGain);

  rumbleNodes = [low, crackle, lfo, sub];
  rumbleNodes.forEach((n) => n.start());
}

/** Niveau du grondement (0..1), atteint en `seconds` secondes. */
export function setRumble(level: number, seconds = 1): void {
  if (!ctx || muted) {
    if (ctx && rumbleGain) rumbleGain.gain.setTargetAtTime(0, ctx.currentTime, 0.1);
    return;
  }
  ensureRumble();
  if (!rumbleGain) return;
  const g = rumbleGain.gain;
  g.cancelScheduledValues(ctx.currentTime);
  g.setValueAtTime(g.value, ctx.currentTime);
  g.linearRampToValueAtTime(Math.max(0, Math.min(1, level)) * 0.8, ctx.currentTime + Math.max(0.05, seconds));
}

function frenchVoice(): SpeechSynthesisVoice | undefined {
  const voices = speechSynthesis.getVoices();
  return voices.find((v) => v.lang === 'fr-FR' && /google|thomas|amélie|amelie|audrey|denise|henri/i.test(v.name)) ?? voices.find((v) => v.lang.toLowerCase().startsWith('fr'));
}

/** Annonce vocale. `interrupt` coupe l'annonce précédente (utile pour le décompte). */
export function speak(text: string, { interrupt = false, rate = 1.05, pitch = 0.95 } = {}): void {
  if (muted || typeof speechSynthesis === 'undefined' || typeof SpeechSynthesisUtterance === 'undefined') return;
  try {
    if (interrupt) speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'fr-FR';
    const voice = frenchVoice();
    if (voice) u.voice = voice;
    u.rate = rate;
    u.pitch = pitch;
    u.volume = 1;
    speechSynthesis.speak(u);
  } catch {
    /* synthèse vocale indisponible : la séquence continue en silence */
  }
}

/** Coupe tout : voix, grondement et bips. */
export function stopAudio(): void {
  if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel();
  if (ctx && rumbleGain) {
    rumbleGain.gain.cancelScheduledValues(ctx.currentTime);
    rumbleGain.gain.setTargetAtTime(0, ctx.currentTime, 0.15);
  }
}
