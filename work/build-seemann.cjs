const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const read = name => fs.readFileSync(path.join(__dirname,name),'utf8');
const output = path.join(__dirname,'../outputs');
let html = fs.readFileSync(path.join(output,'VESPER-Mutter-Night-Stage-Two-Handed-Bridge.html'),'utf8');
const take = require('./seemann-score.cjs')(JSON.parse(read('seemann-midi.json')),read('seemann-lyrics.phones'));
const backing = fs.readFileSync(path.join(__dirname,'seemann-backing.ogg')).toString('base64');

function replace(from,to) {
  if (!html.includes(from)) throw Error('Missing Seemann insertion point ' + from);
  html = html.replace(from,()=>to);
}

replace('<title>Mutter · Night Stage</title>','<title>Seemann · Synthetic Speech Sim</title>');
replace('</style>',read('seemann-stage.css') + '\n</style>');
replace('<div class="scanlines"', '<canvas id="seemannSignal" class="seemann-signal" aria-hidden="true"></canvas>\n        <div class="scanlines"');
replace('uniform float eyePass;', 'uniform float eyePass;\nuniform vec3 fracture;\nuniform float headGrip;');
replace('uniform vec2 eyeCover;', 'uniform vec2 eyeCover;\nuniform vec3 fracture;\nuniform float headGrip;');
replace("'foreheadGlow','orbit'", "'foreheadGlow','fracture','headGrip','orbit'");
replace('      gl.uniform2f(uniforms.eyeCover,acting?.hands[0] ?? 0,acting?.hands[1] ?? 0);',
  '      gl.uniform2f(uniforms.eyeCover,acting?.headGrip ? 0 : acting?.hands[0] ?? 0,acting?.headGrip ? 0 : acting?.hands[1] ?? 0);');
replace('      gl.uniform1f(uniforms.foreheadGlow,figure.foreheadGlow ?? 0);', `      gl.uniform1f(uniforms.foreheadGlow,figure.foreheadGlow ?? 0);
      gl.uniform3f(uniforms.fracture,mode || speechRun ? 0 : figure.fracture ?? 0,
        figure.fractureTime ?? 0,figure.model);
      gl.uniform1f(uniforms.headGrip,acting?.headGrip ?? 0);`);
replace('    p.xy = vec2(p.x*cos(roll) - p.y*sin(roll),p.x*sin(roll) + p.y*cos(roll));',
  `    if (shielding && headGrip > .5) roll = mix(.14,-.10,cover);
    p.xy = vec2(p.x*cos(roll) - p.y*sin(roll),p.x*sin(roll) + p.y*cos(roll));`);
replace('    if (shielding) {\n      p *= vec3', `    if (shielding && headGrip > .5) {
      vec3 hand = p;
      p = vec3(hand.z * 1.10,hand.y * 1.28,-hand.x * 1.08);
      p.x += mix(.90,.56,cover) + arm * .70;
      p.y += mix(-1.93,-.10,cover);
      p.z += mix(.25,.15,cover);
      p.x *= coverSide;
    } else if (shielding) {
      p *= vec3`);
replace('  p -= origin;', `  if (fracture.x > .01 && (material.x < 20. || material.x >= 22.)) {
    float tick = floor(fracture.y * 11.);
    float band = floor(p.y * 13.);
    float noise = fract(sin(band * 43.71 + tick * 17.37 + fracture.z * 9.1) * 43758.5453);
    float slice = step(.58, noise);
    float direction = sin(band * 3.7 + tick * 2.3);
    p.x += fracture.x * slice * direction * (.12 + .42 * noise);
    p.y += fracture.x * slice * sin(tick + band * 1.7) * .035;
    p.z += fracture.x * slice * cos(band * 2.9 + tick) * .075;
  }
  p -= origin;`);
replace('  alpha *= display.w;', `  float damagedRow = floor(gl_FragCoord.y / 13.);
  float dropout = fract(sin(damagedRow * 17.13 + floor(fracture.y * 9.) * 4.7) * 13758.17);
  float damage = kind >= 20. && kind < 22. ? 0. : fracture.x;
  alpha *= 1. - damage * .83 * step(.76,dropout);
  alpha *= display.w;`);
replace('  drawPulse(drift, figures[talk?.index ?? 0]);',
  '  paintSeemannSignal(t);\n  drawPulse(drift, figures[talk?.index ?? 0]);');
replace('<script>\n',`<script id="seemannBackingData" type="application/octet-stream">${backing}</script>\n<script>\n`);
replace('const $ = id => document.getElementById(id);',`const seemannTake = ${JSON.stringify(take)};
const seemannSong = {
  title:'Seemann', description:'Morrow · A song between shores', group:'Stage Cuts',
  key:key(1,true), bpm:seemannTake.bpm, duration:seemannTake.duration,
  notes:seemannTake.notes.map(note=>({ ...note, referenceMidi:note.midi, referenceStart:note.start,
    pitch:takePitchNames[note.midi % 12] + (Math.floor(note.midi / 12)-1) }))
};
seemannSong.events = seemannSong.notes.flatMap(articulate);
songs.unshift(seemannSong);
let seemannBackingPromise;

const $ = id => document.getElementById(id);`);
replace('function prepareBacking(context, song) {',`function prepareBacking(context, song) {
  if (song === seemannSong) {
    if (!seemannBackingPromise) {
      const bytes = Uint8Array.from(atob($('seemannBackingData').textContent.trim()),byte=>byte.charCodeAt(0));
      seemannBackingPromise = context.decodeAudioData(bytes.buffer).catch(error=>{
        seemannBackingPromise = null;
        throw error;
      });
    }
    return seemannBackingPromise;
  }`);
replace("  $('backingToggle').hidden = score() !== morrowFull;","  $('backingToggle').hidden = score() !== morrowFull && score() !== seemannSong;");
replace("  $('edit').hidden = score() === morrowFull;","  $('edit').hidden = score() === morrowFull || score() === seemannSong;");
replace("  $('wardCue').hidden = score() !== morrowFull;","  $('wardCue').hidden = score() !== morrowFull && score() !== seemannSong;");
replace("  document.body.dataset.piece = score() === morrowFull ? 'mutter' : '';",
  "  document.body.dataset.piece = score() === seemannSong ? 'seemann' : score() === morrowFull ? 'mutter' : '';");
replace('  refreshChoir();\n  updateTransport();\n}', '  refreshChoir();\n  syncSeemannCues();\n  updateTransport();\n}');
replace('  offset = fullTake.sections[Number(wardCue.value)][0];',
  '  offset = (score() === seemannSong ? seemannTake : fullTake).sections[Number(wardCue.value)][0];');
replace('function updateWard(time, dt, live, note, lyricTime) {',`function updateWard(time, dt, live, note, lyricTime) {
  if (score() === seemannSong) {
    updateSeemann(time,dt,live,note,lyricTime);
    return;
  }`);
replace('function wardBeat(time) {\n  const hits = stageShowData.lights;',
  'function wardBeat(time, hits = stageShowData.lights) {');
replace('showSongs();\nselectSong(0);\nsetView(0);',`${read('seemann-stage.js')}\nshowSongs();\nselectSong(0);\nsetView(0);`);
new vm.Script(html.match(/<script>\s*([\s\S]+)<\/script>/)[1]);
fs.writeFileSync(path.join(output,'Morrow-Seemann.html'),html);
console.log(`Built Seemann with ${take.lines.length} lyric lines and ${take.notes.length} vocal events.`);
