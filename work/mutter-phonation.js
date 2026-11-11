// F1–F3 start from the male-speaker medians in Pätzold and Simpson (1997),
// Table 2b. F4 and the visible mouth poses are model targets.
const germanVowels = {
  ah:  ['a', [625, 1270, 2470]],
  eh:  ['ɛ', [498, 1639, 2451]],
  ih:  ['ɪ', [343, 1803, 2483]],
  ee:  ['iː', [290, 1986, 2493]],
  aw:  ['ɔ', [506, 1060, 2415]],
  oo:  ['uː', [309, 961, 2366]],
  sch: ['ə', [370, 1521, 2368]],
  uu:  ['ʊ', [382, 1058, 2363]],
  ar:  ['ɐ', [503, 1372, 2430]],
  eeh: ['eː', [372, 1879, 2486]],
  ooe: ['oː', [380, 907, 2415]],
  yee: ['yː', [310, 1505, 2205]],
  yih: ['ʏ', [374, 1431, 2284]],
  oee: ['øː', [375, 1458, 2220]]
};
const germanDiphthongs = {
  eye: ['aɪ', [594, 1332, 2427], [459, 1636, 2461]],
  ow: ['aʊ', [566, 1059, 2479], [438, 967, 2487]],
  euro: ['ɔʏ', [477, 1046, 2389], [398, 1440, 2311]],
  eer: ['eɐ', germanVowels.eeh[1], germanVowels.ar[1]],
  ier: ['iɐ', germanVowels.ee[1], germanVowels.ar[1]]
};
const vowelGlideStart = .45;

function articulationShape(event, fraction = 0) {
  const shape = soundShape(event.sound);
  if (event.note.referenceMidi == null || event.note.speechLanguage?.startsWith('en')) return shape;
  if (event.glide) {
    const [name, start, end] = germanDiphthongs[event.glide];
    const [from, to] = diphthongs[event.glide].map(soundShape);
    const travel = clamp((fraction - vowelGlideStart) / (1 - vowelGlideStart), 0, 1);
    return { ...shape, name,
      open: mix(from.open, to.open, travel),
      round: mix(from.round, to.round, travel),
      f: [...start.map((value, index) => mix(value, end[index], travel)), mix(from.f[3], to.f[3], travel)]
    };
  }
  const target = germanVowels[event.sound];
  if (!target) return shape;
  const f = [...target[1], shape.f[3]];
  const cry = event.note.cry;
  if (cry && (event.sound === 'uu' || event.sound === 'ar')) {
    // Open the jaw under pressure while preserving the short rounded /ʊ/.
    const lift = event.sound === 'uu' ? [115,66,120,75] : [77,28,80,65];
    return { ...shape, name: target[0], f: f.map((hz,index) => hz + lift[index] * cry),
      open: shape.open + .23 * cry, round: shape.round - .12 * cry };
  }
  return { ...shape, name: target[0], f };
}

// A reduced glottal-flow model with a separate return phase. Longer open
// quotients and smoother returns roll off the high harmonics in soft singing.
const foldProfiles = [
  { open: .73, peak: .455, returnStart: .605, residual: .13 },
  { open: .48, peak: .347, returnStart: .451, residual: .052 }
];

function glottalFlow(phase, profile) {
  const { open, peak, returnStart, residual } = profile;
  if (phase >= open) return 0;
  if (phase < peak) {
    const t = phase / peak;
    return t * t * (3 - 2 * t);
  }
  const returnLength = open - returnStart;
  if (phase >= returnStart) return residual * ((open - phase) / returnLength) ** 2;
  const closingLength = returnStart - peak;
  const t = (phase - peak) / closingLength;
  // Hermite interpolation matches the slope of the short final return.
  const endSlope = -2 * residual * closingLength / returnLength;
  return mix(1, residual, t * t * (3 - 2 * t)) + endSlope * (t ** 3 - t * t);
}

function blendedFlow(phase, closure) {
  return mix(glottalFlow(phase, foldProfiles[0]), glottalFlow(phase, foldProfiles[1]), closure);
}

function foldWaves(context) {
  const samples = 512;
  const slopes = foldProfiles.map(profile => Array.from({ length: samples }, (_, sample) => {
    const before = ((sample + samples - 1) % samples) / samples;
    const after = ((sample + 1) % samples) / samples;
    return glottalFlow(after, profile) - glottalFlow(before, profile);
  }));
  // Both waves share a pressure scale, so a firmer closure adds energy.
  const peak = Math.max(...slopes.flat().map(Math.abs));
  return slopes.map(slope => {
    const real = new Float32Array(97);
    const imaginary = new Float32Array(real.length);
    for (let harmonic = 1; harmonic < real.length; harmonic++) {
      for (let sample = 0; sample < samples; sample++) {
        const angle = TAU * harmonic * sample / samples;
        const pressure = slope[sample] * 2 / (samples * peak);
        real[harmonic] += pressure * Math.cos(angle);
        imaginary[harmonic] += pressure * Math.sin(angle);
      }
    }
    return context.createPeriodicWave(real, imaginary, { disableNormalization: true });
  });
}

const phrasePhonation = {
  whisper: [.07, 1.95],
  far: [.24, 1.28],
  close: [.36, 1.13],
  lead: [.53, .94],
  call: [.74, .80],
  cry: [.99, .58],
  cryAnswer: [.91, .69],
  plea: [.91, .67]
};
const phrasingDepth = .42;

function phonationAt(event, fraction = 0) {
  const [drive, air] = phrasePhonation[event.note.voice] || [.52, 1];
  const stress = event.sustain ? Math.sin(Math.PI * fraction) : 0;
  return [clamp(drive + .15 * stress - (event.sustain ? 0 : .15), 0, 1), air + .24 * (1 - stress)];
}

function scheduleCryVowel(param, event, level, at, until, fraction) {
  const call = event.sound === 'uu';
  const contour = call
    ? [[0,.72],[.14,1.26],[.36,1.17],[.58,1.22],[.81,1.02],[1,.87]]
    : [[0,.70],[.18,1.16],[.47,1.09],[.75,.86],[1,.53]];
  const next = contour.findIndex(([phase]) => phase > fraction);
  if (next < 1) return;
  const [before, lower] = contour[next - 1];
  const [after, upper] = contour[next];
  const duration = event.end - event.start;
  param.setTargetAtTime(level * mix(lower,upper,(fraction-before)/(after-before)),at,.008);
  for (const [phase,value] of contour.slice(next)) {
    param.setTargetAtTime(level * value,Math.min(until,at + (phase-fraction)*duration),call ? .022 : .014);
  }
}

const nasalCavities = {
  m: [275, 980],
  n: [290, 1440],
  ng: [305, 2050]
};
const noiseSharpness = {
  s: 1.55, z: 1.55, sh: 1.24, ichch: 1.06, kh: .86,
  f: .64, v: .64, wardin: .68, callbreath: .68
};

function scheduleFrication(event, shape, filter, gain, at, until, fraction) {
  if (!shape.noise) return;
  filter.frequency.setValueAtTime(event.breathCenter ?? shape.hz, at);
  filter.Q.setValueAtTime(noiseSharpness[event.sound] ?? .86, at);
  const clearStop = event.note.cry && event.sound === 'callt';
  const weight = clearStop ? 1.10 + .29 * event.note.cry
    : event.note.role === 'Answer' ? .69 : event.note.voice === 'close' && !event.note.inhale ? 1.13 : 1;
  const amount = shape.noise * weight;
  const duration = event.end - event.start;
  const contour = clearStop ? [[.43, 0], [.51, 1], [.74, .38], [1, 0]]
    : shape.stop ? [[.43, 0], [.56, 1], [.74, .32], [1, 0]]
    : [[0, 0], [event.note.inhale ? .68 : .25, 1], [.78, .65], [1, 0]];
  const next = contour.findIndex(([progress]) => progress > fraction);
  if (next < 0) return;
  const [from, low] = contour[next - 1] || [0, 0];
  const [to, high] = contour[next];
  gain.setValueAtTime(amount * mix(low, high, (fraction - from) / (to - from)), at);
  for (const [progress, value] of contour.slice(next)) {
    gain.linearRampToValueAtTime(amount * value, Math.min(until, at + (progress - fraction) * duration));
  }
}

function displayFoldPhase(time, figure) {
  // Slow the cycle down for the display. Audio still runs at the sung F0.
  return time * (2.8 + (figure.hz || 0) * .009) % 1;
}
