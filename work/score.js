const vowels = {
  ah: { name: 'AH', example: 'father', f: [730, 1160, 2510, 3400], open: .91, round: .14 },
  ae: { name: 'AE', example: 'cat', f: [660, 1720, 2410, 3450], open: .76, round: .03 },
  eh: { name: 'EH', example: 'bed', f: [530, 1840, 2480, 3530], open: .51, round: .03 },
  ih: { name: 'IH', example: 'sit', f: [390, 1990, 2560, 3550], open: .34, round: .05 },
  ee: { name: 'EE', example: 'see', f: [280, 2250, 2970, 3570], open: .29, round: 0 },
  uh: { name: 'UH', example: 'cup', f: [550, 1310, 2460, 3300], open: .62, round: .21 },
  er: { name: 'ER', example: 'bird', f: [440, 1350, 1670, 3030], open: .43, round: .41 },
  aw: { name: 'AW', example: 'law', f: [570, 850, 2410, 3280], open: .69, round: .55 },
  oo: { name: 'OO', example: 'moon', f: [320, 850, 2240, 3130], open: .32, round: .92 },
  sch: { name: 'Ə', example: 'about', f: [460, 1470, 2490, 3420], open: .38, round: .23 }
};
const diphthongs = { ay: ['eh','ee','day'], eye: ['ah','ee','eye'], oh: ['aw','oo','go'], ow: ['ah','oo','now'], oy: ['aw','ee','boy'] };
// Sonorants retain fold vibration. Stops and fricatives use shaped airflow noise.
const consonants = {
  m:  { voiced: .75, f: [260, 1150, 2250, 3150], open: .01 },
  n:  { voiced: .78, f: [300, 1520, 2390, 3400], open: .12 },
  ng: { voiced: .73, f: [300, 1940, 2530, 3480], open: .25 },
  l:  { voiced: .81, f: [420, 1260, 2510, 3500], open: .27 },
  r:  { voiced: .82, f: [370, 1230, 1580, 3210], open: .28, round: .36 },
  w:  { voiced: .78, f: [310, 740, 2250, 3170], open: .24, round: .92 },
  y:  { voiced: .82, f: [300, 2260, 2900, 3600], open: .24 },
  h:  { noise: .20, hz: 1450, open: .44 },
  s:  { noise: .34, hz: 6150, open: .19 },
  z:  { noise: .28, hz: 6100, voiced: .29, open: .19 },
  sh: { noise: .32, hz: 3600, open: .20, round: .46 },
  zh: { noise: .23, hz: 3550, voiced: .28, open: .20, round: .42 },
  f:  { noise: .23, hz: 4750, open: .12 },
  v:  { noise: .19, hz: 4650, voiced: .38, open: .12 },
  th: { noise: .23, hz: 4620, open: .18 },
  dh: { noise: .12, hz: 4190, voiced: .56, open: .18 },
  p:  { noise: .24, hz: 1350, stop: true, open: .01 },
  b:  { noise: .22, hz: 1400, voiced: .2, stop: true, open: .01 },
  t:  { noise: .33, hz: 4600, stop: true, open: .1 },
  d:  { noise: .27, hz: 3760, voiced: .21, stop: true, open: .1 },
  k:  { noise: .30, hz: 2870, stop: true, open: .22 },
  g:  { noise: .24, hz: 2340, voiced: .21, stop: true, open: .21 },
  ch: { noise: .36, hz: 4170, open: .20, round: .35 },
  j:  { noise: .28, hz: 3920, voiced: .31, open: .20, round: .28 }
};
const has = (object, key) => Object.hasOwn(object, key);
const isNucleus = sound => has(vowels, sound) || has(diphthongs, sound) || ['m','n','ng'].includes(sound);

const builtinDefinitions = [
  { title: 'Hollow Signal', description: 'Original · minor incantation', bpm: 82, phrases: [
    ['Out of the dark, I hear you call', `D3 .75 ow+t | Out
F3 .5 uh+v | of
E3 .5 dh+sch | the
D3 1.25 d+ah+r+k | dark
F3 .75 eye | I
A3 1 h+ih+r | hear
G3 .75 y+oo | you
F3 1.5 k+aw+l | call
- 1`],
    ['Out of the dark, I sing it all', `D3 .75 ow+t | Out
F3 .5 uh+v | of
E3 .5 dh+sch | the
D3 1.25 d+ah+r+k | dark
A3 .75 eye | I
C4 1 s+ih+ng | sing
Bb3 .75 ih+t | it
A3 1.5 aw+l | all
- 1`],
    ['Stay while the light is burning low', `A3 1 s+t+ay | Stay
Bb3 .75 w+eye+l | while
A3 .5 dh+sch | the
G3 1.25 l+eye+t | light
F3 .5 ih+z | is
E3 1 b+er+r | burn
F3 .5 n+ih+ng | ing
D3 1.5 l+oh | low
- 1`],
    ['Stay till the echoes let me go', `F3 1 s+t+ay | Stay
G3 .75 t+ih+l | till
A3 .5 dh+ee | the
C4 .75 eh+k | ech
Bb3 .75 oh+z | oes
A3 .75 l+eh+t | let
F3 1 m+ee | me
D3 2.5 g+oh | go`]
  ] },
  { title: 'Twinkle, Twinkle', description: 'Traditional · lullaby', bpm: 105, phrases: [
    ['Twinkle, twinkle, little star', `C4 1 t+w+ih+ng | Twin
C4 1 k+sch+l | kle
G4 1 t+w+ih+ng | twin
G4 1 k+sch+l | kle
A4 1 l+ih+t | lit
A4 1 sch+l | tle
G4 2 s+t+ah+r | star`],
    ['How I wonder what you are', `F4 1 h+ow | How
F4 1 eye | I
E4 1 w+uh+n | won
E4 1 d+er | der
D4 1 w+uh+t | what
D4 1 y+oo | you
C4 2 ah+r | are`],
    ['Up above the world so high', `G4 1 uh+p | Up
G4 1 sch | a
F4 1 b+uh+v | bove
F4 1 dh+sch | the
E4 1 w+er+l+d | world
E4 1 s+oh | so
D4 2 h+eye | high`],
    ['Like a diamond in the sky', `G4 1 l+eye+k | Like
G4 1 sch | a
F4 1 d+eye | dia
F4 1 m+sch+n+d | mond
E4 1 ih+n | in
E4 1 dh+sch | the
D4 2 s+k+eye | sky`],
    ['Twinkle, twinkle, little star', `C4 1 t+w+ih+ng | Twin
C4 1 k+sch+l | kle
G4 1 t+w+ih+ng | twin
G4 1 k+sch+l | kle
A4 1 l+ih+t | lit
A4 1 sch+l | tle
G4 2 s+t+ah+r | star`],
    ['How I wonder what you are', `F4 1 h+ow | How
F4 1 eye | I
E4 1 w+uh+n | won
E4 1 d+er | der
D4 1 w+uh+t | what
D4 1 y+oo | you
C4 2.5 ah+r | are`]
  ] },
  { title: 'Row Your Boat', description: 'Traditional · round', bpm: 118, phrases: [
    ['Row, row, row your boat', `F3 1.5 r+oh | Row
F3 1.5 r+oh | row
F3 1 r+oh | row
G3 .5 y+oo+r | your
A3 1.5 b+oh+t | boat`],
    ['Gently down the stream', `A3 1 j+eh+n | Gen
G3 .5 t+l+ee | tly
A3 1 d+ow+n | down
Bb3 .5 dh+sch | the
C4 3 s+t+r+ee+m | stream`],
    ['Merrily, merrily, merrily, merrily', `F4 .5 m+eh | Mer
F4 .5 r+sch | ri
F4 .5 l+ee | ly
C4 .5 m+eh | mer
C4 .5 r+sch | ri
C4 .5 l+ee | ly
A3 .5 m+eh | mer
A3 .5 r+sch | ri
A3 .5 l+ee | ly
F3 .5 m+eh | mer
F3 .5 r+sch | ri
F3 .5 l+ee | ly`],
    ['Life is but a dream', `C4 1 l+eye+f | Life
Bb3 .5 ih+z | is
A3 1 b+uh+t | but
G3 .5 sch | a
F3 3 d+r+ee+m | dream`]
  ] }
];

function parseScore(title, bpm, source, description = 'Custom · user score', phrases = []) {
  title = title.trim();
  if (!title || title.length > 48) throw new Error('Give the song a title of up to 48 characters.');
  if (!Number.isFinite(bpm) || bpm < 40 || bpm > 210) throw new Error('Tempo must be between 40 and 210 BPM.');
  if (source.length > 24000) throw new Error('Score is too long. Keep it under 24,000 characters.');
  const notes = [];
  let duration = 0;
  source.split(/\r?\n/).forEach((line, index) => {
    const [entry, ...words] = line.split('|');
    if (!entry.trim() || entry.trim().startsWith('//')) return;
    const error = message => { throw new Error(`Line ${index + 1}: ${message}`); };
    const [pitch, beats, phonemes, ...extra] = entry.trim().split(/\s+/);
    const name = pitch.match(/^([A-Ga-g])([#b]?)([2-5])$/);
    const rest = pitch === '-';
    if ((!name && !rest) || extra.length) error('Use a note like A3 or Bb4, or - for a rest.');
    const length = Number(beats);
    if (!Number.isFinite(length) || length < .25 || length > 16) error('Beats must be between 0.25 and 16.');
    const sounds = rest ? [] : (phonemes || '').toLowerCase().split('+');
    if (!rest && (sounds.length > 8 || sounds.some(sound => !has(vowels, sound) && !has(diphthongs, sound) && !has(consonants, sound)))) {
      error('Use up to eight sounds from the phoneme guide, joined by +.');
    }
    if (!rest && !sounds.some(isNucleus)) error('Include a vowel or a hum (m, n, ng) to carry the note.');
    const midi = rest ? null : 12 * (1 + Number(name[3])) + ({ C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 })[name[1].toUpperCase()] + (name[2] === '#' ? 1 : name[2] === 'b' ? -1 : 0);
    const seconds = length * 60 / bpm;
    notes.push({ pitch, midi, sounds, start: duration, end: duration + seconds, lyric: words.join('|').trim().slice(0, 90), phrase: phrases[index] || '' });
    duration += seconds;
    if (notes.length > 360 || duration > 240) error('Scores can contain up to 360 notes and last up to four minutes.');
  });
  if (!notes.some(note => note.midi !== null)) throw new Error('Add at least one sung note.');
  return { title, bpm, source, description, notes, duration, events: notes.flatMap(articulate) };
}

function articulate(note) {
  if (note.midi === null) return [];
  const length = note.end - note.start;
  const firstVowel = note.sounds.findIndex(sound => has(vowels, sound) || has(diphthongs, sound));
  const nucleus = firstVowel < 0 ? note.sounds.findIndex(isNucleus) : firstVowel;
  const onset = note.sounds.slice(0, nucleus);
  const release = note.sounds.slice(nucleus + 1);
  const onsetTime = Math.min(length * .28, onset.length * .067);
  const releaseTime = Math.min(length * .26, release.length * .060);
  let time = note.start;
  const events = [];
  const add = (sound, seconds, sustain = false) => {
    events.push({ sound, start: time, end: time + seconds, note, sustain });
    time += seconds;
  };
  onset.forEach(sound => add(sound, onsetTime / onset.length));
  const sound = note.sounds[nucleus];
  const body = length - onsetTime - releaseTime;
  if (has(diphthongs, sound)) {
    const [from, to] = diphthongs[sound];
    add(from, body * .72, true);
    add(to, body * .28, true);
  } else {
    add(sound, body, true);
  }
  release.forEach(sound => add(sound, releaseTime / release.length));
  return events;
}

const songs = builtinDefinitions.map(({ title, description, bpm, phrases }) => parseScore(
  title, bpm, phrases.map(([, score]) => score).join('\n'), description,
  phrases.flatMap(([lyric, score]) => score.split('\n').map(() => lyric))
));
const hzFor = midi => 440 * 2 ** ((midi - 69) / 12);
const soundShape = sound => vowels[sound] || consonants[sound];
