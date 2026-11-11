const TAU = Math.PI * 2;
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const mix = (a, b, t) => a + (b - a) * t;

// The open folds pass a rounded pulse of air. Closing them faster adds upper harmonics.
// The derivative of airflow approximates the pressure radiated at the mouth.
function glottalFlow(phase, closure) {
  const open = mix(.79, .48, closure);
  const peak = open * mix(.60, .79, closure);
  if (phase < peak) return .5 - .5 * Math.cos(Math.PI * phase / peak);
  if (phase < open) return .5 + .5 * Math.cos(Math.PI * (phase - peak) / (open - peak));
  return 0;
}

function foldWave(context, closure) {
  const samples = 256;
  const real = new Float32Array(49);
  const imaginary = new Float32Array(real.length);
  const flow = Array.from({ length: samples }, (_, n) => glottalFlow(n / samples, closure));
  for (let n = 0; n < samples; n++) {
    const slope = flow[(n + 1) % samples] - flow[(n + samples - 1) % samples];
    for (let harmonic = 1; harmonic < real.length; harmonic++) {
      const angle = TAU * harmonic * n / samples;
      real[harmonic] += slope * Math.cos(angle);
      imaginary[harmonic] += slope * Math.sin(angle);
    }
  }
  return context.createPeriodicWave(real, imaginary);
}

function vocalResonances(values, fundamental, tract = 1) {
  return values.map((value, index) => index === 0 ? Math.max(fundamental * .96, value * tract) : value * tract);
}

class VoiceEngine {
  constructor(context) {
    this.context = context;
    this.waves = [foldWave(context, 0), foldWave(context, 1)];
    this.noise = context.createBuffer(1, context.sampleRate * 3, context.sampleRate);
    const samples = this.noise.getChannelData(0);
    let seed = 16381;
    const random = () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 4294967296 * 2 - 1;
    };
    for (let i = 0; i < samples.length; i++) samples[i] = random();
    this.output = context.createDynamicsCompressor();
    this.output.threshold.value = -15;
    this.output.ratio.value = 3.2;
    this.output.attack.value = .007;
    this.output.release.value = .15;
    this.output.connect(context.destination);
    this.space = context.createConvolver();
    const impulse = context.createBuffer(2, Math.round(context.sampleRate * 1.65), context.sampleRate);
    for (let channel = 0; channel < 2; channel++) {
      const data = impulse.getChannelData(channel);
      for (let i = 0; i < data.length; i++) {
        const t = i / context.sampleRate;
        data[i] = random() * Math.min(1, t * 46) * Math.exp(-t * 4.0);
      }
      data[Math.round(context.sampleRate * (.032 + channel * .011))] += 1.4;
    }
    this.space.buffer = impulse;
    this.space.connect(this.output);
  }

  start(score, offset, settings, options = {}) {
    const ctx = this.context;
    const { start = ctx.currentTime + .032, level = 1, pan = 0, tract = 1, cents = 0, rate = 5.15, muted = false } = options;
    const end = start + score.duration - offset;
    const dry = ctx.createGain();
    let direct = dry;
    if (pan) {
      direct = ctx.createStereoPanner();
      direct.pan.value = pan;
      dry.connect(direct);
    }
    const wet = ctx.createGain();
    const gate = ctx.createGain();
    const mute = ctx.createGain();
    mute.gain.value = muted ? 0 : 1;
    const tone = ctx.createGain();
    const nasal = ctx.createGain();
    const voiced = ctx.createGain();
    const aspiration = ctx.createGain();
    const consonant = ctx.createGain();
    const frequency = ctx.createConstantSource();
    const tension = ctx.createConstantSource();
    const vibrato = ctx.createOscillator();
    const depth = ctx.createGain();
    const expression = ctx.createGain();
    const drift = ctx.createOscillator();
    const driftDepth = ctx.createGain();
    const noise = ctx.createBufferSource();
    const oscillators = [];
    const foldLevels = [];
    gate.connect(mute).connect(dry);
    direct.connect(this.output);
    mute.connect(wet).connect(this.space);
    tone.connect(voiced).connect(gate);
    [voiced, consonant, expression, nasal].forEach(node => { node.gain.value = 0; });
    gate.gain.setValueAtTime(0, start);
    gate.gain.linearRampToValueAtTime(level, start + .022);
    gate.gain.setTargetAtTime(0, end, .024);
    vibrato.frequency.value = rate;
    vibrato.connect(expression).connect(depth);
    drift.frequency.value = .83;
    driftDepth.gain.value = 5.4;
    drift.connect(driftDepth);
    this.waves.forEach(wave => {
      const osc = ctx.createOscillator();
      const level = ctx.createGain();
      osc.setPeriodicWave(wave);
      osc.frequency.value = 0;
      frequency.connect(osc.frequency);
      tension.connect(osc.detune);
      depth.connect(osc.detune);
      driftDepth.connect(osc.detune);
      osc.connect(level);
      oscillators.push(osc);
      foldLevels.push(level);
    });
    const source = ctx.createGain();
    foldLevels.forEach(level => level.connect(source));
    noise.buffer = this.noise;
    noise.loop = true;
    const breathFilter = ctx.createBiquadFilter();
    breathFilter.type = 'highpass';
    breathFilter.frequency.value = 380;
    noise.connect(breathFilter).connect(aspiration).connect(source);
    const frication = ctx.createBiquadFilter();
    frication.type = 'bandpass';
    frication.Q.value = .86;
    noise.connect(frication).connect(consonant).connect(gate);
    const body = ctx.createBiquadFilter();
    body.type = 'lowpass';
    body.frequency.value = 610;
    const bodyLevel = ctx.createGain();
    bodyLevel.gain.value = .16;
    source.connect(body).connect(bodyLevel).connect(tone);
    const nasalPole = ctx.createBiquadFilter();
    nasalPole.type = 'bandpass';
    nasalPole.frequency.value = 300 * tract;
    nasalPole.Q.value = 2.1;
    const nasalZero = ctx.createBiquadFilter();
    nasalZero.type = 'notch';
    nasalZero.frequency.value = 960 * tract;
    nasalZero.Q.value = 1.6;
    source.connect(nasalPole).connect(nasalZero).connect(nasal).connect(gate);
    const formants = [1.0, .70, .42, .22].map((gain, index) => {
      const filter = ctx.createBiquadFilter();
      const level = ctx.createGain();
      filter.type = 'bandpass';
      filter.frequency.value = vowels.ah.f[index];
      filter.Q.value = [4.0, 6.0, 7.8, 8.2][index];
      level.gain.value = gain;
      source.connect(filter).connect(level).connect(tone);
      return filter;
    });

    let previousNote = null;
    let previousShape = vowels.ah;
    for (const event of score.events) {
      if (event.end <= offset) continue;
      const at = start + Math.max(0, event.start - offset);
      const until = start + event.end - offset;
      const length = until - at;
      const { note } = event;
      const newNote = note !== previousNote;
      const nasalSound = event.sound === 'm' || event.sound === 'n' || event.sound === 'ng';
      const shape = soundShape(event.sound);
      const fundamental = hzFor(note.midi);
      if (newNote) {
        if (!previousNote || note.start - previousNote.end > .05) {
          frequency.offset.setValueAtTime(fundamental * .982, at);
        }
        frequency.offset.setTargetAtTime(fundamental, at, .016);
        expression.gain.setValueAtTime(.065, at);
        const held = note.end - Math.max(event.start, offset);
        expression.gain.setTargetAtTime(Math.min(1,.52 + held * .59), at + Math.min(.066, held * .28), .17);
      }
      const resonances = shape.f || previousShape.f;
      vocalResonances(resonances, fundamental, tract).forEach((tuned, index) => {
        if (!previousNote) formants[index].frequency.setValueAtTime(tuned, at);
        else formants[index].frequency.setTargetAtTime(tuned, at, Math.min(.027, length * .29));
      });
      const musicalTime = Math.max(0, note.start - (score.notes[0]?.start || 0));
      const phraseWeight = .88 + .10 * Math.cos(musicalTime * TAU * score.bpm / 240) + .04 * Math.min(2, note.end - note.start);
      const level = (shape.voiced ?? (shape.f ? 1 : 0)) * .78 * phraseWeight * (nasalSound ? .62 : 1);
      const attack = Math.min(newNote ? .024 : .015, length * .31);
      const phraseEnd = Math.abs(event.end - note.end) < .00001;
      voiced.gain.setTargetAtTime(level, at, attack * .42);
      nasal.gain.setTargetAtTime(nasalSound ? .31 * phraseWeight : 0, at, Math.max(.004, attack * .55));
      if (event.sustain && length > .38) {
        const swell = at + length * .34;
        voiced.gain.setTargetAtTime(level * 1.12, swell, Math.min(.13, length * .12));
        voiced.gain.setTargetAtTime(level * .83, at + length * .74, Math.min(.12,length * .10));
      }
      if (phraseEnd) {
        voiced.gain.setTargetAtTime(0, until - Math.min(.032, length * .32), .008);
        nasal.gain.setTargetAtTime(0, until - Math.min(.028, length * .32), .008);
      }
      if (shape.noise) {
        const burst = shape.stop ? at + length * .44 : at;
        frication.frequency.setValueAtTime(shape.hz, burst);
        consonant.gain.setValueAtTime(0, at);
        consonant.gain.linearRampToValueAtTime(shape.noise, burst + length * .20);
        consonant.gain.linearRampToValueAtTime(0, until);
      }
      previousNote = note;
      previousShape = shape.f ? shape : previousShape;
    }

    const active = { start, dry, wet, gate, foldLevels, aspiration, depth, tension, cents };
    this.adjust(active, settings, true);
    const generators = [...oscillators, frequency, tension, vibrato, drift, noise];
    generators.forEach(node => { node.start(start); node.stop(end + .12); });
    noise.onended = () => { direct.disconnect(); wet.disconnect(); };
    active.stop = () => {
      const now = ctx.currentTime;
      gate.gain.cancelScheduledValues(now);
      gate.gain.setTargetAtTime(0, now, .009);
      generators.forEach(node => node.stop(now + .05));
    };
    active.setMuted = muted => mute.gain.setTargetAtTime(muted ? 0 : 1,ctx.currentTime,.026);
    return active;
  }

  adjust(active, settings, initialize = false) {
    const at = this.context.currentTime;
    const control = (param, value) => {
      if (initialize) param.setValueAtTime(value, at);
      else param.setTargetAtTime(value, at, .035);
    };
    control(active.foldLevels[0].gain, 1 - settings.closure);
    control(active.foldLevels[1].gain, settings.closure);
    control(active.tension.offset, settings.tension * 100 + active.cents);
    control(active.aspiration.gain, .21 * settings.breath);
    control(active.depth.gain, settings.vibrato * 76);
    control(active.wet.gain, settings.space * .83);
    control(active.dry.gain, 1 - settings.space * .15);
  }
}
