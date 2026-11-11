const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const output = path.join(__dirname, '../outputs');
let html = fs.readFileSync(path.join(output, 'VESPER-04-Wire-Choir.html'), 'utf8');
const performance = JSON.parse(fs.readFileSync(path.join(__dirname, 'morrow-full-performance.json'), 'utf8'));
const backing = fs.readFileSync(path.join(__dirname, 'morrow-full-backing.ogg')).toString('base64');

function replace(from, to) {
  if (!html.includes(from)) throw new Error(`Missing insertion point: ${from}`);
  html = html.replace(from, () => to);
}

const performanceCode = `
Object.assign(vowels, {
  uu:  { name: 'Ʊ', example: 'Mund', f: [375,1020,2290,3280], open: .32, round: .68 },
  ar:  { name: 'Ɐ', example: 'der', f: [565,1330,2370,3320], open: .45, round: .11 },
  eeh: { name: 'E', example: 'leben', f: [360,2130,2770,3500], open: .32, round: .04 },
  ooe: { name: 'O', example: 'Mond', f: [435,880,2320,3290], open: .44, round: .73 },
  yee: { name: 'Y', example: 'üben', f: [285,1800,2340,3410], open: .24, round: .82 },
  yih: { name: 'ʏ', example: 'küsst', f: [385,1630,2430,3440], open: .32, round: .66 },
  oee: { name: 'Œ', example: 'schön', f: [395,1550,2360,3390], open: .36, round: .69 }
});
diphthongs.eer = ['eeh', 'ar', 'der'];
consonants.ichch = { noise: .40, hz: 3380, open: .16, round: .05 };
consonants.germanr = { voiced: .61, noise: .11, hz: 1100, f: [420,1460,2310,3330], open: .29 };
consonants.kh = { noise: .38, hz: 1560, open: .25, round: .16 };

const fullTake = ${JSON.stringify({ duration: performance.duration, notes: performance.notes })};
const takePitchNames = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const takeNotes = fullTake.notes.map(note => {
  if (!note.sounds.some(isNucleus) || note.sounds.some(sound =>
    !has(vowels,sound) && !has(diphthongs,sound) && !has(consonants,sound))) {
    throw new Error('Invalid German phonemes: ' + note.sounds.join('+'));
  }
  return { ...note, referenceMidi: note.midi, pitch: takePitchNames[note.midi % 12] + (Math.floor(note.midi / 12) - 1) };
});
const morrowFull = {
  title: 'Heirate mich · Full Cut', description: 'Morrow · German vocal and live MIDI arrangement',
  group: 'Full Cut', key: key(4,true), bpm: 96, notes: takeNotes, duration: fullTake.duration,
  events: takeNotes.flatMap(articulate)
};
songs.unshift(morrowFull);

function performancePitch(note, seconds) {
  const curve = note.trajectory;
  if (!curve) return hzFor(note.midi);
  const frame = clamp(seconds / (note.end - note.start), 0, 1) * (curve.length - 1);
  const left = Math.floor(frame);
  const pitch = curve[left] * (curve[Math.min(left + 1, curve.length - 1)] / curve[left]) ** (frame - left);
  return pitch * 2 ** ((note.midi - note.referenceMidi) / 12);
}

const backingLevel = .55;
let backingEnabled = true;
let backingPromise;

function prepareBacking(context, song) {
  if (song !== morrowFull) return null;
  if (!backingPromise) {
    const data = atob(document.getElementById('morrowBackingData').textContent.trim());
    const bytes = Uint8Array.from(data, character => character.charCodeAt(0));
    backingPromise = context.decodeAudioData(bytes.buffer).catch(error => {
      backingPromise = null;
      throw error;
    });
  }
  return backingPromise;
}

function startPerformance(engine, parts, offset, settings, backingBuffer, withBacking = backingEnabled) {
  const playback = startChoir(engine, parts, offset, settings);
  if (!backingBuffer || offset >= backingBuffer.duration) return playback;
  const context = engine.context;
  const source = context.createBufferSource();
  const volume = context.createGain();
  volume.gain.value = withBacking ? backingLevel : 0;
  source.buffer = backingBuffer;
  source.connect(volume).connect(engine.output);
  source.onended = () => { source.disconnect(); volume.disconnect(); };
  source.start(playback.start, offset);
  playback.setBacking = enabled => volume.gain.setTargetAtTime(enabled ? backingLevel : 0, context.currentTime, .018);
  const stopVoices = playback.stop;
  playback.stop = () => {
    stopVoices();
    playback.setBacking(false);
    source.stop(context.currentTime + .07);
  };
  return playback;
}
`;

replace('const $ = id => document.getElementById(id);', performanceCode + '\nconst $ = id => document.getElementById(id);');
replace('        frequency.offset.setTargetAtTime(fundamental, at, .016);', `        if (note.trajectory) {
          const duration = note.end - note.start;
          const elapsed = Math.max(0, offset - note.start);
          const steps = note.trajectory.length - 1;
          frequency.offset.setValueAtTime(performancePitch(note, elapsed), at);
          for (let step = 1; step <= steps; step++) {
            const sample = duration * step / steps;
            const time = Math.min(duration - .001, sample) - elapsed;
            if (time > 0) frequency.offset.exponentialRampToValueAtTime(performancePitch(note, sample), at + time);
          }
        } else frequency.offset.setTargetAtTime(fundamental, at, .016);`);
replace('const level = (shape.voiced ?? (shape.f ? 1 : 0)) * .78 * phraseWeight * (nasalSound ? .62 : 1);',
  'const level = (shape.voiced ?? (shape.f ? 1 : 0)) * .78 * phraseWeight * (nasalSound ? .62 : 1) * (note.level ?? 1);');
replace('const attack = Math.min(newNote ? .024 : .015, length * .31);',
  'const attack = Math.min(note.trajectory ? .012 : newNote ? .024 : .015, length * .31);');
replace('expression.gain.setValueAtTime(.065, at);', 'expression.gain.setValueAtTime(note.trajectory ? .27 : .065, at);');
replace('const phraseEnd = Math.abs(event.end - note.end) < .00001;', 'const phraseEnd = Math.abs(event.end - note.end) < .00001;');
replace('Math.round(hzFor(event.note.midi + settings.tension))',
  'Math.round(performancePitch(event.note, elapsed - event.note.start) * 2 ** (settings.tension / 12))');

replace('    active = startChoir(engine, parts, offset, settings);', `    const accompaniment = await prepareBacking(engine.context, parts[0].score);
    if (currentOperation !== operation) return;
    active = startPerformance(engine, parts, offset, settings, accompaniment);`);
replace('async function renderPerformance(arrangement, controls, rate = 44100) {',
  'async function renderPerformance(arrangement, controls, rate = 44100, withBacking = backingEnabled) {');
replace('  startChoir(new VoiceEngine(context),arrangement,0,controls);', `  const accompaniment = withBacking ? await prepareBacking(context, arrangement[0].score) : null;
  startPerformance(new VoiceEngine(context), arrangement, 0, controls, accompaniment, withBacking);`);
replace("  $('nowPlaying').title = score().title;", `  $('nowPlaying').title = score().title;
  $('backingToggle').hidden = score() !== morrowFull;
  $('edit').hidden = score() === morrowFull;`);
replace("$('songFilter').addEventListener('change', showSongs);", `$('songFilter').addEventListener('change', showSongs);
$('backingToggle').addEventListener('click', () => {
  backingEnabled = !backingEnabled;
  $('backingToggle').setAttribute('aria-pressed', backingEnabled);
  setText($('backingToggle'), backingEnabled ? 'Backing on' : 'Backing off');
  active?.setBacking?.(backingEnabled);
});`);

replace('let headCount = 3;', 'let headCount = 1;');
replace('3 of 5 heads', '1 of 5 heads');
replace("'vesper-04-cast'", "'vesper-morrow-full-cast'");
replace("'vesper-custom-score-v1'", "'vesper-morrow-full-score-v1'");
replace('const defaults = { closure: .48, tension: 0, breath: .29, vibrato: .48, space: .29 };',
  'const defaults = { closure: .75, tension: 0, breath: .29, vibrato: .08, space: .19 };');
replace('<title>VESPER 04 / The Wire Choir</title>', '<title>VESPER / Morrow / Heirate mich (Full Cut)</title>');
replace('<p>THE WIRE CHOIR</p>', '<p>MORROW / FULL PERFORMANCE</p>');
replace('VESPER 04 / THE WIRE CHOIR</span>', 'VESPER 04 / MORROW FULL CUT</span>');
replace('Bring vocal anatomy forward in Ensemble</label>', 'Bring vocal anatomy forward in Ensemble</label><p class="panel-note">Morrow’s German performance follows the trimmed MIDI arrangement. Use Backing to hear the voice on its own.</p>');
replace('<option value="all">All pieces</option>', '<option value="all">All pieces</option><option>Full Cut</option>');
replace('<div class="stage-tools">', '<div class="stage-tools"><button id="backingToggle" class="backing-toggle" type="button" aria-pressed="true" title="Include MIDI backing in playback and WAV export">Backing on</button>');
replace('</style>', `
.backing-toggle { white-space: nowrap; border: 1px solid var(--line); border-radius: 6px; background: #0d1718; color: #b6ccc3; padding: 6px 8px; font: 10px var(--mono); }
.backing-toggle[aria-pressed="true"] { color: var(--mint); border-color: #44675e; }
.backing-toggle:hover { border-color: #70aa93; }
</style>`);

new vm.Script(html.match(/<script>\s*([\s\S]+)<\/script>/)[1]);
replace('<script>\n', `<script id="morrowBackingData" type="application/octet-stream">${backing}</script>\n<script>\n`);
fs.writeFileSync(path.join(output, 'Morrow-Heirate-Mich-Full.html'), html);
