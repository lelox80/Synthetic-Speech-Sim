const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { gzipSync } = require('node:zlib');

const read = name => fs.readFileSync(path.join(__dirname, name), 'utf8');
const output = path.join(__dirname, '../outputs');
let html = fs.readFileSync(path.join(output, 'Morrow-Heirate-Mich-Full.html'), 'utf8');
const take = JSON.parse(read('mutter-performance.json'));
const backing = fs.readFileSync(path.join(__dirname, 'mutter-backing.ogg')).toString('base64');
const stageShow = require('./mutter-stage-data.cjs')(take, JSON.parse(read('mutter-one.json')), read('mutter-lyrics.phones'));
const directedTake = require('./mutter-direction.cjs')(take, stageShow.words);
const englishPronunciations = read('cmudict-source.dict').split(/\r?\n/)
  .map(line => line.split(' #',1)[0].trim()).filter(line => /^[^\s(]+ [A-Z]/.test(line)).join('\n');
const compressedEnglish = gzipSync(englishPronunciations,{level:9}).toString('base64');

function replace(from, to) {
  if (typeof from === 'string' ? !html.includes(from) : !from.test(html)) throw new Error(`Missing template anchor: ${from}`);
  html = html.replace(from, () => to);
}

replace(/(<script id="morrowBackingData" type="application\/octet-stream">)[^<]+<\/script>/,
  `<script id="morrowBackingData" type="application/octet-stream">${backing}</script>`);
replace(/const fullTake = .+;/, `const fullTake = ${JSON.stringify(directedTake)};`);
replace('referenceMidi: note.midi, pitch:', 'referenceMidi: note.midi, referenceStart: note.start, pitch:');
replace('if (!note.sounds.some(isNucleus) || note.sounds.some(sound =>', 'if ((!note.inhale && !note.sounds.some(isNucleus)) || note.sounds.some(sound =>');
replace("diphthongs.eer = ['eeh', 'ar', 'der'];", `diphthongs.eer = ['eeh', 'ar', 'der'];
diphthongs.ier = ['ee', 'ar', 'mir'];
diphthongs.euro = ['aw', 'yih', 'heute'];
consonants.callt = { name: 'T', noise: .23, hz: 4150, stop: true, open: .12 };
consonants.callbreath = { name: 'EXHALE', noise: .084, hz: 1730, open: .19 };
consonants.wardin = { name: 'INHALE', noise: .155, hz: 1340, open: .36, round: .10 };`);
replace('function articulate(note) {\n  if (note.midi === null) return [];', `function articulate(note) {
  if (note.midi === null) return [];
  if (note.inhale) return [{ sound:'wardin', start:note.start, end:note.end, note, sustain:false }];`);
replace('const onsetTime = Math.min(length * .28, onset.length * .067);',
  'const onsetTime = note.delivery?.onset ?? Math.min(length * .28, onset.length * .067);');
replace('const releaseTime = Math.min(length * .26, release.length * .060);',
  'const releaseTime = note.delivery?.release ?? Math.min(length * .26, release.length * .060);');
replace('    add(from, body * .72, true);\n    add(to, body * .28, true);', `    if (note.referenceMidi != null && germanDiphthongs[sound]) {
      add(from, body, true);
      events.at(-1).glide = sound;
    } else {
      add(from, body * .72, true);
      add(to, body * .28, true);
    }`);
replace("title: 'Heirate mich · Full Cut', description: 'Morrow · German vocal and live MIDI arrangement',",
  "title: 'Mutter', description: 'Morrow · German vocal and MIDI backing',");
replace("group: 'Full Cut', key: key(4,true), bpm: 96", "group: 'Stage Cuts', key: key(4,true), bpm: 120");
replace('<option>Full Cut</option>', '<option>Stage Cuts</option>');
replace('<option value="unison">Unison</option>', '<option value="unison" selected>Unison</option>');
replace('const backingLevel = .55;', 'const backingLevel = .47;');
replace("'vesper-morrow-full-cast'", "'vesper-mutter-cast'");
replace("'vesper-morrow-full-score-v1'", "'vesper-mutter-score-v1'");
replace('const defaults = { closure: .75, tension: 0, breath: .29, vibrato: .08, space: .19 };',
  'const defaults = { closure: .72, tension: 0, breath: .28, vibrato: .17, space: .32 };');
replace('const phraseEnd = Math.abs(event.end - note.end) < .00001;',
  'const phraseEnd = !note.tieNext && Math.abs(event.end - note.end) < .00001;');
replace('    gate.connect(mute).connect(dry);\n    direct.connect(this.output);\n    mute.connect(wet).connect(this.space);', `    gate.connect(mute);
    const voiceBus = score.notes.some(note => note.voice) ? wardVoiceBus(ctx,mute,dry,wet) : null;
    if (!voiceBus) {
      mute.connect(dry);
      mute.connect(wet);
    }
    direct.connect(this.output);
    wet.connect(this.space);`);
replace('      if (newNote) {\n        if (!previousNote', '      if (newNote) {\n        voiceBus?.(note.voice,at);\n        if (!previousNote');
replace('voiced.gain.setTargetAtTime(level, at, attack * .42);', `const shapedVowel = note.delivery && event.sustain;
      const cryVowel = note.cry && event.sustain;
      const plea = note.voice === 'plea' && event.sustain;
      const openingLevel = plea ? .69 : shapedVowel ? .76 : 1;
      if (!cryVowel) voiced.gain.setTargetAtTime(level * openingLevel, at, shapedVowel || plea ? Math.min(.024, length * .12) : attack * .42);`);
replace('if (event.sustain && length > .38) {', `if (cryVowel) {
        scheduleCryVowel(voiced.gain, event, level, at, until, fraction);
      } else if (plea) {
        voiced.gain.setTargetAtTime(level * (1.06 + .31 * note.weight), at + length * .26, length * .18);
        voiced.gain.setTargetAtTime(level * .84, at + length * .84, length * .07);
      } else if (shapedVowel) {
        voiced.gain.setTargetAtTime(level * 1.10, at + length * .17, Math.min(.067, length * .16));
        voiced.gain.setTargetAtTime(level * (note.tieNext ? .66 : .32), at + length * .63, Math.min(.086, length * .19));
      } else if (event.sustain && length > .38) {`);
replace('expression.gain.setValueAtTime(note.trajectory ? .27 : .065, at);',
  'expression.gain.setValueAtTime(note.tied ? .68 : note.trajectory ? .33 : .065, at);');
replace(/function glottalFlow\([\s\S]+?(?=function vocalResonances)/, read('mutter-phonation.js') + '\n');
replace('this.waves = [foldWave(context, 0), foldWave(context, 1)];', 'this.waves = foldWaves(context);');
replace('    const aspiration = ctx.createGain();', `    const aspiration = ctx.createGain();
    const breathDrive = ctx.createGain();
    const phraseDrive = ctx.createConstantSource();
    phraseDrive.offset.value = .52 * phrasingDepth;
    const reverseDrive = ctx.createGain();
    reverseDrive.gain.value = -1;
    phraseDrive.connect(reverseDrive);
    breathDrive.gain.value = 1;`);
replace('    const source = ctx.createGain();\n    foldLevels', `    reverseDrive.connect(foldLevels[0].gain);
    phraseDrive.connect(foldLevels[1].gain);
    const source = ctx.createGain();
    foldLevels`);
replace('    tone.connect(voiced).connect(gate);', `    const flutter = score.notes.some(note => note.cry) ? ctx.createOscillator() : null;
    const strain = flutter ? ctx.createGain() : null;
    if (flutter) {
      // Mild periodic amplitude variation adds urgency without flattening the pitch contour.
      const effort = ctx.createGain();
      flutter.frequency.value = 32 + rate * .63;
      strain.gain.value = 0;
      flutter.connect(strain).connect(effort.gain);
      tone.connect(voiced).connect(effort).connect(gate);
    } else tone.connect(voiced).connect(gate);`);
replace('noise.connect(breathFilter).connect(aspiration).connect(source);',
  'noise.connect(breathFilter).connect(aspiration).connect(breathDrive).connect(source);');
replace('    const body = ctx.createBiquadFilter();', '    const oral = ctx.createGain();\n    const body = ctx.createBiquadFilter();');
replace('source.connect(body).connect(bodyLevel).connect(tone);', 'source.connect(body).connect(bodyLevel).connect(oral);');
replace('    source.connect(nasalPole).connect(nasalZero).connect(nasal).connect(gate);',
  `    const oralOpen = ctx.createGain();
    const oralLeak = ctx.createGain();
    oralLeak.gain.value = 0;
    oral.connect(oralOpen).connect(tone);
    oral.connect(nasalZero).connect(oralLeak).connect(tone);
    source.connect(nasalPole).connect(nasal).connect(tone);`);
replace('source.connect(filter).connect(level).connect(tone);', 'source.connect(filter).connect(level).connect(oral);');
replace("      const nasalSound = event.sound === 'm' || event.sound === 'n' || event.sound === 'ng';\n      const shape = soundShape(event.sound);",
  `      const nasalTarget = nasalCavities[event.sound];
      const fraction = clamp((offset - event.start) / (event.end - event.start), 0, 1);
      const shape = articulationShape(event, fraction);
      const [drive, air] = phonationAt(event, fraction);
      const transition = Math.min(.016, length * .24);
      if (strain) {
        const pressure = event.sustain && note.cry ? note.cry * (event.sound === 'uu' ? .185 : .11) : 0;
        strain.gain.setTargetAtTime(pressure,at,.019);
      }
      phraseDrive.offset.setTargetAtTime(drive * phrasingDepth, at, transition);
      breathDrive.gain.setTargetAtTime(air, at, transition);
      if (event.sustain && fraction < .5 && length > .085) {
        const [heldDrive, heldAir] = phonationAt(event, .5);
        phraseDrive.offset.setTargetAtTime(heldDrive * phrasingDepth, until - length * .52, transition);
        breathDrive.gain.setTargetAtTime(heldAir, until - length * .52, transition);
      }
      if (event.sustain && length > .085) {
        const [endDrive, endAir] = phonationAt(event, 1);
        phraseDrive.offset.setTargetAtTime(endDrive * phrasingDepth, until - length * .14, transition);
        breathDrive.gain.setTargetAtTime(endAir, until - length * .14, transition);
      }
      oralOpen.gain.setTargetAtTime(nasalTarget ? .15 : 1, at, transition);
      oralLeak.gain.setTargetAtTime(nasalTarget ? .24 : 0, at, transition);
      nasal.gain.setTargetAtTime(nasalTarget ? .75 : 0, at, transition);
      if (nasalTarget) {
        nasalPole.frequency.setTargetAtTime(nasalTarget[0] * tract, at, transition);
        nasalZero.frequency.setTargetAtTime(nasalTarget[1] * tract, at, transition);
      }`);
replace(`      const resonances = shape.f || previousShape.f;
      vocalResonances(resonances, fundamental, tract).forEach((tuned, index) => {
        if (!previousNote) formants[index].frequency.setValueAtTime(tuned, at);
        else formants[index].frequency.setTargetAtTime(tuned, at, Math.min(.027, length * .29));
      });`, `      const resonances = shape.f || previousShape.f;
      const endFrequencies = event.glide ? vocalResonances(articulationShape(event, 1).f, fundamental, tract) : null;
      vocalResonances(resonances, fundamental, tract).forEach((tuned, index) => {
        const { frequency, Q } = formants[index];
        const width = [82, 138, 220, 410][index] + 30 * air + .14 * fundamental;
        if (event.tractIn) {
          scheduleSpokenFormant(frequency,index,event,tuned,tract,fundamental,at,until,fraction);
        } else if (endFrequencies) {
          const hold = Math.max(0, event.start + vowelGlideStart * (event.end - event.start) - Math.max(offset, event.start));
          if (hold > 0) {
            frequency.setTargetAtTime(tuned, at, transition);
            frequency.setValueAtTime(tuned, at + hold);
          } else frequency.setValueAtTime(tuned, at);
          frequency.linearRampToValueAtTime(endFrequencies[index], until);
        } else if (!previousNote) frequency.setValueAtTime(tuned, at);
        else frequency.setTargetAtTime(tuned, at, transition);
        Q.setTargetAtTime(tuned / width, at, transition);
      });`);
replace('(nasalSound ? .62 : 1)', '(nasalTarget ? .88 : 1)');
replace('const phraseWeight = .88 + .10 * Math.cos(musicalTime * TAU * score.bpm / 240) + .04 * Math.min(2, note.end - note.start);',
  'const phraseWeight = note.speechLanguage ? 1 : .88 + .10 * Math.cos(musicalTime * TAU * score.bpm / 240) + .04 * Math.min(2, note.end - note.start);');
replace('      nasal.gain.setTargetAtTime(nasalSound ? .31 * phraseWeight : 0, at, Math.max(.004, attack * .55));\n', '');
replace('        nasal.gain.setTargetAtTime(0, until - Math.min(.028, length * .32), .008);\n', '');
replace(/      if \(shape.noise\) \{[\s\S]*?      \}\n      previousNote = note;\n      previousShape = shape.f \? shape : previousShape;/,
  `      scheduleFrication(event, shape, frication, consonant.gain, at, until, fraction);
      previousNote = note;
      previousShape = endFrequencies ? articulationShape(event, 1) : shape.f ? shape : previousShape;`);
replace('frequency, tension, vibrato, drift, noise];', 'frequency, tension, vibrato, drift, phraseDrive, noise];\n    if (flutter) generators.push(flutter);');
replace('control(active.foldLevels[0].gain, 1 - settings.closure);', 'control(active.foldLevels[0].gain, 1 - (1 - phrasingDepth) * settings.closure);');
replace('control(active.foldLevels[1].gain, settings.closure);', 'control(active.foldLevels[1].gain, (1 - phrasingDepth) * settings.closure);');
replace('control(active.aspiration.gain, .21 * settings.breath);', 'control(active.aspiration.gain, .34 * settings.breath);');
replace(/function glottalGap\(time, figure, closure\) \{[\s\S]*?\n\}/, `function glottalGap(time, figure) {
  const flow = blendedFlow(displayFoldPhase(time, figure), figure.closure ?? .5);
  return mix(.036, .002 + .027 * flow, figure.energy);
}`);
replace('time * .92) % 1;', 'displayFoldPhase(time, figure)) % 1;');
replace('mix(glottalFlow(phase, 0), glottalFlow(phase, 1), settings.closure)', 'blendedFlow(phase, figure.closure ?? .5)');
replace('    const shape = event ? soundShape(event.sound) : null;', `    const progress = event ? clamp((elapsed - event.start) / (event.end - event.start), 0, 1) : 0;
    const shape = event ? articulationShape(event, progress) : null;
    const drive = event ? phonationAt(event, progress)[0] : .52;
    figure.closure = mix(figure.closure ?? .5, mix(settings.closure, drive, phrasingDepth), speed);`);
replace('    figure.foldGap = glottalGap(drift, figure, settings.closure);', '    figure.foldGap = glottalGap(drift, figure);');
replace("const tipSounds = new Set(['t','d','n','l','th','dh','s','z']);",
  "const tipSounds = new Set(['t','callt','d','n','l','th','dh','s','z']);");
replace("const backSounds = new Set(['k','g','ng']);",
  "const backSounds = new Set(['k','g','ng','kh','germanr']);");
replace('  if (backSounds.has(sound)) return [.089,-.108];',
  '  if (backSounds.has(sound)) return [.089,-.108];\n  if (sound === \'ichch\') return [.113,.077];');
replace('soundShape(leadEvent.sound).name || leadEvent.sound.toUpperCase()', 'articulationShape(leadEvent).name || leadEvent.sound.toUpperCase()');
replace('  const frequencies = leadEvent && soundShape(leadEvent.sound).f;',
  `  const frequencies = leadEvent && articulationShape(leadEvent,
    clamp((t - parts[0].delay - leadEvent.start) / (leadEvent.end - leadEvent.start), 0, 1)).f;`);
replace('vocalResonances(frequencies,hzFor(leadEvent.note.midi))', 'vocalResonances(frequencies, hzFor(leadEvent.note.midi), parts[0].tract)');
replace('      if (note.midi === null) return;\n      const x = width * note.start', '      if (note.midi === null || note.inhale) return;\n      const x = width * note.start');

replace(/const cast = \[\n[\s\S]*?\n\];/, `const cast = [
  { name: 'Morrow', title: 'Ward subject M–01', gear: 'Sensor collar and temple contacts', tint: '#6bafff', accent: '#ff1626', hair: 'shorn', hat: 'ward', skull: 1.005, cheek: 1.023, jaw: .98, chin: .86, nose: .94, eye: 1, eyeHeight: .83, eyeSpacing: .306, neckWidth: 1, hollow: .19, lift: -.014, tilt: .015 },
  { name: 'Selene', title: 'The soprano', gear: 'Drop earrings', tint: '#87d8ff', accent: '#ff7082', hair: 'long', hat: 'earrings', skull: .94, cheek: 1.10, jaw: .77, chin: .85, nose: .77, eye: 1.13, eyeHeight: .87, eyeSpacing: .321, neckWidth: .84, hollow: .04, lift: .019, tilt: .12 },
  { name: 'Ivo', title: 'The archivist', gear: 'Round wire spectacles', tint: '#99b4ff', accent: '#ff8a72', hair: 'temples', hat: 'glasses', skull: 1.07, cheek: 1.02, jaw: 1.07, chin: 1.03, nose: 1.12, eye: .94, eyeHeight: .83, eyeSpacing: .295, neckWidth: .98, hollow: .22, lift: -.026, tilt: -.055 },
  { name: 'Rook', title: 'The radio operator', gear: 'Headset and boom mic', tint: '#619ff6', accent: '#f54858', hair: 'crop', hat: 'headset', skull: 1.025, cheek: 1.08, jaw: 1.18, chin: .99, nose: .94, eye: .98, eyeHeight: .77, eyeSpacing: .311, neckWidth: 1.09, hollow: .11, lift: .006, tilt: -.015 },
  { name: 'Lyra', title: 'The celestial soloist', gear: 'Orbiting diadem', tint: '#b0d0ff', accent: '#ff679d', hair: 'bun', hat: 'halo', skull: .97, cheek: 1.03, jaw: .88, chin: .91, nose: .87, eye: 1.06, eyeHeight: .89, eyeSpacing: .301, neckWidth: .90, hollow: .08, lift: .022, tilt: .079 }
];`);
replace(/function castExterior\([\s\S]*?(?=function castHair)/, read('mutter-morrow-portrait.js') + '\n\n');
replace('function castHair(model,surface,path,loop) {', 'function castHair(model,surface,path,loop,headPoint) {');
replace(/    const angle = u \* mix\(long \? 1\.80[\s\S]*?    return \[x,y,z,0\];/, `    const hairline = mix(long ? .17 : .39,bun ? .79 : swept ? .82 : .73,front);
    const y = mix(1.299,hairline,u);
    const [x,,z] = headPoint(y,a);
    const lift = .027 + .018 * Math.sin(Math.PI*u);
    return [x + lift*Math.sin(a),y+.035,z + lift*Math.cos(a),0];`);
replace('const x = side * .655, y = -.177, z = .151;', 'const x = side * .724 * model.skull, y = -.165, z = -.129;');
replace('path([[x,y+.102,z],[x,y+.023,z+.019],[x,y-.048,z+.021]],15);',
  'path([[x,y+.058,z],[x,y+.023,z+.019],[x,y-.048,z+.021]],15);');
replace('path([[-.102,eyeY + .022,.587],[-.057,eyeY + .062,.662],[.057,eyeY + .062,.662],[.102,eyeY + .022,.587]],15);', `const bridge = eyeX - .161;
    const z = depthAt(eyeX,eyeY) + .179;
    path([[-bridge,eyeY+.022,z],[-.057,eyeY+.062,z+.041],[.057,eyeY+.062,z+.041],[bridge,eyeY+.022,z]],15);`);
replace('(.726 + u * .019)', '(.794 + u * .019)');
replace('(.654 + .101 * u)', '(.699 + .119 * u)');
replace('[side * .758,.128', '[side * .820,.128');
replace('[[.751,.044,-.097]', '[[.811,.044,-.097]');
replace('const structures = [', `${read('mutter-cranial-anatomy.js')}\nconst structures = [`);
replace('const anatomyCallouts = [', `structures.push(...cranialStructures.map(structure => ({ ...structure, color: '#ff7d89' })));
const anatomyCallouts = [`);
replace('function anatomyDetails(line, triangle) {', `anatomyCallouts[1].push(...cranialStructures.map((entry, index) => ({
  ...entry, structure: structures.length - cranialStructures.length + index
})));
function anatomyDetails(line, triangle) {`);
replace('function castGear(model,surface,path,loop,depthAt,eyeX,eyeY) {', `function castGear(model,surface,path,loop,depthAt,eyeX,eyeY) {
  if (model.hat === 'ward') wardRestraint(surface, path, loop, depthAt);`);
replace('uniform vec2 tongue;\nuniform vec4 actor;', 'uniform vec2 tongue;\nuniform vec4 actor;\nuniform vec2 gaze;\nuniform float reach;\nuniform float cover;\nuniform float coverSide;\nuniform float profileFit;\nuniform vec4 orbit;\nuniform vec2 orbitDepth;\nuniform float eyePass;');
replace('  if (material.x >= 17.) p.y = mix(actor.w,p.y,1. - .89 * actor.z);', `  if (material.x == 19.) {
    vec3 center = vec3(sign(p.x) * orbit.x, actor.w, orbitDepth.x);
    vec3 eye = p - center;
    float yaw = gaze.x * .26, pitch = gaze.y * .21;
    eye.xz = vec2(eye.x*cos(yaw) + eye.z*sin(yaw), eye.z*cos(yaw) - eye.x*sin(yaw));
    eye.yz = vec2(eye.y*cos(pitch) + eye.z*sin(pitch), eye.z*cos(pitch) - eye.y*sin(pitch));
    p = eye + center;
  }
  if (material.x == 18.) p.y = mix(actor.w,p.y,1. - .94 * actor.z);
  if (material.x >= 20. && material.x < 22.) {
    p = point;
    float finger = max(material.y,0.);
    float arm = max(-material.y,0.);
    bool shielding = cover > 0.;
    if (!shielding) {
      p.z += mix(.102,.025,reach) * finger;
      p.y -= mix(.054,.012,reach) * finger;
    }
    float room = smoothstep(.68,1.32,display.y);
    float roll = shielding ? mix(-.24,.12,cover) : mix(-.38,.16,reach);
    p.xy = vec2(p.x*cos(roll) - p.y*sin(roll),p.x*sin(roll) + p.y*cos(roll));
    if (shielding) {
      p *= vec3(mix(1.10,1.17,room),1.43,1.04);
      p += vec3(mix(.54,.247,cover),mix(-1.63,-.595,cover),mix(.30,.793,cover));
      p.z -= cover * (.12 * smoothstep(-.13,.56,p.y) + .070 * abs(p.x));
      p.x *= coverSide;
    } else {
      float pitchHand = mix(.56,1.04,reach);
      p.yz = vec2(p.y*cos(pitchHand) - p.z*sin(pitchHand),p.y*sin(pitchHand) + p.z*cos(pitchHand));
      float inward = .24 * reach;
      p.xz = vec2(p.x*cos(inward) - p.z*sin(inward),p.x*sin(inward) + p.z*cos(inward));
      p *= mix(.74,1.,room);
      p += vec3(mix(.67,mix(.52,.78,room),reach),mix(-1.59,-.60,reach),mix(.21,2.06,reach));
      p += vec3(-.29,-.42,-.36) * arm * reach;
    }
  }`);
replace('  sectionPoint = p;\n  p -= origin;', `  sectionPoint = p;
  // Keep the local clipping and blink coordinates in the original anatomical space.
  if (profileFit > .5 && (material.x < 20. || material.x >= 22. || cover > 0.)) {
    // The eye pass shifts each center without stretching the spherical surface.
    float height = eyePass > .5 ? actor.w : p.y;
    float face = smoothstep(-.77,-.14,height) * (1. - smoothstep(.25,1.10,height));
    float jaw = smoothstep(-1.22,-.96,height) * (1. - smoothstep(-.96,-.36,height));
    p.z += min(p.z,0.) * .33 * smoothstep(-.62,.44,p.y);
    p.y += -.105 * face + .130 * jaw;
  }
  p -= origin;`);
replace('uniform uint selected;', `uniform uint selected;
uniform float reach;
uniform float cover;
uniform float foreheadGlow;
uniform vec4 orbit;
uniform vec2 orbitDepth;
uniform vec4 rotation;
uniform float profileFit;
uniform float eyePass;
uniform vec2 eyeCover;
uniform vec2 gaze;`);
replace('void main() {\n  bool glottis', `${read('mutter-stage-eyes.glsl')}
void main() {
  if (eyePass > .5) {
    float behindSocket = sign(sectionPoint.x) * sin(rotation.x);
    float coverAmount = sectionPoint.x < 0. ? eyeCover.x : eyeCover.y;
    float visible = (1. - smoothstep(.68,.97,behindSocket)) * (1. - smoothstep(.54,.99,coverAmount));
    if (visible <= 0.) discard;
    vec4 wire = stageGlobeWire(sectionPoint);
    if (wire.a < .016) discard;
    color = vec4(wire.rgb,wire.a * display.w * visible);
    return;
  }
  bool glottis`);
replace('  if (study.x > .5 && kind > 12.5) discard;', `  bool cranial = kind >= 22. || kind == 17.;
  bool ocular = kind == 26. || kind == 19.;
  bool fullAtlas = study.x < .5;
  bool xray = actor.y > .65;
  if (fullAtlas && ocular) discard;
  bool eyePair = ocular && (selected & (1u << 26u)) != 0u;
  if (study.x > .5 && kind > 12.5 && !cranial && kind != 19.) discard;
  if (section && cranial && !eyePair && sectionPoint.x * study.z < -.017) discard;
  if (section && kind == 19. && !eyePair && sectionPoint.x * study.z < -.017) discard;`);
replace('alpha *= section ? .31 : 1.;', 'alpha *= section ? .31 : fullAtlas ? mix(.37,.57,front) : 1.;');
replace('(.19 + .48 * front) * (section ? .44 : 1.)', '(.19 + .48 * front) * (section ? .44 : fullAtlas ? mix(.40,.60,front) : 1.)');
replace('    hue = tint * .73;\n    alpha = .17 * (1. - actor.z);',
  '    hue = vec3(.88,.20,.28);\n    alpha = section ? .49 : xray ? .40 : mix(.15,.30,front);');
replace('  } else {\n    hue = mix(tint,vec3(.80,1.,.96),.33);', `  } else if (cranial) {
    hue = kind == 22. ? vec3(.89,.29,.35)
      : kind == 23. ? vec3(1.,.19,.29)
      : kind == 26. ? vec3(1.,.46,.47)
      : kind == 27. || kind == 31. ? vec3(1.,.36,.39)
      : vec3(.97,.22,.34);
    alpha = kind == 22. ? .31 : kind == 23. ? .47 : kind == 26. ? .59 : .52;
    if (section) {
      if (kind == 22.) alpha *= selected == 0u ? .47 : 1.;
    } else {
      // Leave both sides intact. Attenuate the far lines to separate the layers.
      float layer = mix(.53,1.,front);
      float clarity = kind == 22. ? .36 : kind == 23. || kind == 25. ? .83 : .64;
      alpha *= layer * (xray ? min(1.0,clarity * 1.37) : clarity);
    }
  } else if (kind >= 20.) {
    if (cover > 0. && study.y > .5) {
      float mask = .74 * smoothstep(.14,.72,cover) * smoothstep(-.14,.36,depth)
        * smoothstep(-1.74,-1.28,sectionPoint.y);
      color = vec4(.009,.017,.039,mask * display.w);
      return;
    }
    hue = tint * (kind < 20.5 ? .84 : 1.);
    float visible = cover > 0. ? smoothstep(.045,.45,cover) : smoothstep(.10,.52,reach);
    alpha = (.29 + .42 * front) * visible * smoothstep(-1.74,-1.28,sectionPoint.y);
  } else {
    hue = mix(tint,vec3(.80,1.,.96),.33);`);
replace('  if (study.y > .5) {\n    vec3 normal', `  if (kind > 1.5 && kind < 12.5) {
      float bright = kind == 6. ? .83 : .41 + .38 * front;
      hue = mix(vec3(.71,.019,.068),vec3(1.,.14,.19),bright);
      if (kind == 3.) {
        hue = vec3(1.,.22,.28);
        alpha *= 1.36;
      } else if (kind == 4.) {
        hue = mix(vec3(.94,.17,.24),vec3(1.,.38,.42), motion.z);
        alpha *= 1.46;
      } else {
        alpha *= kind == 9. ? .96 : 1.19;
      }
  } else if (kind > 13.5 && kind < 16.5) {
    hue = accent * (kind == 15. ? 1. : .76);
  } else if (kind == 13. || ocular) {
    hue = tint;
  }
  if (study.y > .5) {
    vec3 normal`);
replace('float body = kind < 1.5 ? (section ? .11 : .40) : .31;',
  'float body = kind < 1.5 ? (section ? .11 : fullAtlas ? .15 : .40) : .31;');
replace('if (kind > 16.5) body = .51;', `if (kind > 16.5 && kind < 20.) body = .51;
    if (ocular) body = .095;`);
replace('if (kind > 1.5 && kind < 12.5 && !glottis && !section) alpha *= actor.y;',
  `if (kind > 1.5 && kind < 12.5 && fullAtlas) {
    alpha *= mix(.58,.94,front) * (xray ? 1.13 : 1.);
  }`);
replace('  alpha *= display.w;\n  color = vec4(hue, alpha);', `  if (fullAtlas && study.y < .5 && kind < 1.5) {
    alpha *= mix(1., kind < .5 ? 1.28 : 1.17, front);
  }
  if (foreheadGlow > 0. && kind < .5 && sectionPoint.z > .25) {
    vec2 spot = (sectionPoint.xy - vec2(0.,.682)) / vec2(.077,.065);
    float radius = length(spot);
    float irregular = radius + .095 * sin(spot.x * 8. + spot.y * 4.) * sin(spot.y * 7.);
    float ember = 1. - smoothstep(.72,1.03,irregular);
    float halo = 1. - smoothstep(.45,2.45,radius);
    float intensity = foreheadGlow * smoothstep(-.10,.24,depth);
    vec3 hot = mix(vec3(.84,.006,.035),vec3(1.,.23,.22),1. - smoothstep(.04,.65,radius));
    hue = mix(hue,hot,intensity * max(ember,.66 * halo));
    alpha = max(alpha,intensity * (.72 * ember + .23 * halo));
  }
  alpha *= display.w;
  color = vec4(hue, alpha);`);
replace(/  const skinNeck = .*?;\n/, '');
replace('  tube(skinNeck, 0, 18, 2);\n', '');
replace('  const anatomy = upload(collectMesh(wireAnatomy));', `  const anatomy = upload(collectMesh(wireAnatomy));
  const hand = upload(collectMesh((line,triangle) => wardHand(line,triangle,false)));
  const shieldHand = upload(collectMesh((line,triangle) => wardHand(line,triangle,true)));`);
replace('  const exteriors = cast.map(model => upload(collectMesh((line,triangle) => castExterior(model,line,triangle))));', `  const exteriors = cast.map(model => {
    let orbit;
    const mesh = collectMesh((line,triangle) => { orbit = castExterior(model,line,triangle); });
    const eyes = upload(collectMesh((line,triangle) => stageEyeGlobes(triangle,orbit)));
    return { ...upload(mesh), orbit, eyes };
  });`);
replace("'foldGap','tongue','origin'", "'foldGap','tongue','gaze','reach','cover','coverSide','foreheadGlow','orbit','orbitDepth','profileFit','eyePass','eyeCover','origin'");
replace('      gl.uniform4f(uniforms.rotation, yaw + spread, pitch, 0, 0);', `      const acting = mode ? null : figure.acting;
      gl.uniform4f(uniforms.rotation, yaw + spread + (acting?.yaw ?? 0), pitch + (acting?.nod ?? 0), 0, 0);
      gl.uniform2f(uniforms.gaze, acting?.gaze[0] ?? 0, acting?.gaze[1] ?? 0);
      gl.uniform1f(uniforms.reach,acting?.reach ?? 0);
      gl.uniform1f(uniforms.cover,0);
      gl.uniform2f(uniforms.eyeCover,acting?.hands[0] ?? 0,acting?.hands[1] ?? 0);
      gl.uniform1f(uniforms.foreheadGlow,figure.foreheadGlow ?? 0);
      gl.uniform1f(uniforms.profileFit, Number(mode !== 2));
      const orbit = exteriors[figure.model].orbit;
      gl.uniform4f(uniforms.orbit,orbit.eyeX,orbit.eyeWidth,orbit.lidHeight,orbit.tilt);
      gl.uniform2f(uniforms.orbitDepth,orbit.z,orbit.radius);`);
replace('figure.internals ? .76 : .17, blink', 'figure.internals ? .82 : .60, mode || acting?.staring ? 0 : blink');
replace("scope.strokeStyle = '#295464';", "scope.strokeStyle = '#803846';");
replace("scope.strokeStyle = energy > .12 ? '#ff987c' : '#b46d62';", "scope.strokeStyle = energy > .12 ? '#ff5667' : '#ad3c50';");
replace("scope.fillStyle = energy > .12 ? '#ff927044' : '#c7774d30';", "scope.fillStyle = '#ff233c37';");
replace("scope.strokeStyle = energy > .12 ? '#91f6ca' : '#426957';", "scope.strokeStyle = energy > .12 ? '#ff5166' : '#69303d';");
replace('      const meshes = mode === 2 ? [anatomy] : [exteriors[figure.model],anatomy];', `      const meshes = mode === 2 ? [anatomy] : [exteriors[figure.model],anatomy];
      const eyes = !mode ? exteriors[figure.model].eyes : null;`);
replace('        if (mesh.pointVertices) gl.drawArrays(gl.POINTS,mesh.lineVertices,mesh.pointVertices);\n      }\n    });', `        if (mesh.pointVertices) gl.drawArrays(gl.POINTS,mesh.lineVertices,mesh.pointVertices);
      }
      if (eyes) {
        // Resolve the near surface of each globe before placing it over the face wires.
        gl.enable(gl.DEPTH_TEST);
        gl.enable(gl.CULL_FACE);
        gl.clear(gl.DEPTH_BUFFER_BIT);
        gl.blendFuncSeparate(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA,gl.ONE,gl.ONE_MINUS_SRC_ALPHA);
        gl.uniform1f(uniforms.eyePass,1);
        gl.bindVertexArray(eyes.vao);
        gl.drawArrays(gl.TRIANGLES,0,eyes.solidVertices);
        gl.uniform1f(uniforms.eyePass,0);
        gl.blendFuncSeparate(gl.SRC_ALPHA,gl.ONE,gl.ONE,gl.ONE_MINUS_SRC_ALPHA);
        gl.disable(gl.CULL_FACE);
        gl.disable(gl.DEPTH_TEST);
      }
      if (acting?.reach > .05) {
        gl.bindVertexArray(hand.vao);
        gl.uniform3f(uniforms.study,mode,1,side);
        gl.drawArrays(gl.TRIANGLES,hand.lineVertices,hand.solidVertices);
        gl.uniform3f(uniforms.study,mode,0,side);
        gl.drawArrays(gl.LINES,0,hand.lineVertices);
      }
      if (acting?.cover > .045) {
        // Composite both hands over the face before tracing their wires.
        const drawShieldHands = (primitive,first,count) => acting.hands.forEach((strength,i) => {
          if (strength <= .045) return;
          gl.uniform1f(uniforms.cover,strength);
          gl.uniform1f(uniforms.coverSide,i === 0 ? -1 : 1);
          gl.drawArrays(primitive,first,count);
        });
        gl.bindVertexArray(shieldHand.vao);
        gl.blendFuncSeparate(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA,gl.ONE,gl.ONE_MINUS_SRC_ALPHA);
        gl.uniform3f(uniforms.study,mode,1,side);
        drawShieldHands(gl.TRIANGLES,shieldHand.lineVertices,shieldHand.solidVertices);
        gl.blendFuncSeparate(gl.SRC_ALPHA,gl.ONE,gl.ONE,gl.ONE_MINUS_SRC_ALPHA);
        gl.uniform3f(uniforms.study,mode,0,side);
        drawShieldHands(gl.LINES,0,shieldHand.lineVertices);
      }
    });`);
replace('function studyPoint(point, mode, yaw, pitch, width, height) {', 'function studyPoint(point, mode, yaw, pitch, width, height, zoom = 1) {');
replace('  const [sx,sy,scale] = seats[0];', '  const [sx,sy,scale] = seats[0].map(value => value * zoom);');
replace('    const [x,y] = studyPoint(point,mode,yaw,pitch,width,height);', `    const anchor = mode === 1 ? wardHeadFit(point) : point;
    const [x,y] = studyPoint(anchor,mode,yaw,pitch,width,height,projectionZoom);`);
replace('    const chosen = highlighted === structure;', `    const chosen = highlighted === structure;
    const entry = structures[structure];
    const overview = mode !== 1 || entry.overview || [0,2,3,4,7].includes(structure);`);
replace("    group.style.display = compact && !chosen ? 'none' : '';\n    if (compact && !chosen) return;", `    const visible = highlighted < 0 ? !compact && overview : chosen;
    group.style.display = visible ? '' : 'none';
    if (!visible) return;`);
replace('    const tx = width * (side < 0 ? (compact ? .045 : .09) : (compact ? .69 : .75));', `    const tx = width * (side < 0 ? (compact ? .045 : .09) : (compact ? .955 : .91));
    label.setAttribute('text-anchor', side < 0 ? 'start' : 'end');`);
replace('    const end = side < 0 ? Math.min(elbow, tx + label.textContent.length * 6.45) : tx - 7;', `    const textWidth = label.getComputedTextLength();
    const end = side < 0 ? Math.min(elbow, tx + textWidth + 6) : Math.max(elbow, tx - textWidth - 6);`);
replace(`  button.addEventListener('click', () => {
    if (!projection) return;
    if (highlighted === index) { updateHighlight(-1); return; }
    const laryngeal = structure.kinds.some(kind => [4,7,10,11,12].includes(kind));
    if (!mode || mode === 2 && !laryngeal) setView(1);
    updateHighlight(index);
  });
  $('structures').append(button);
});`, `  button.addEventListener('click', () => chooseStructure(highlighted === index ? -1 : index));
  $('structures').append(button);
  $('structurePicker').add(new Option(structure.name, index));
});
$('structurePicker').addEventListener('change', event => chooseStructure(Number(event.target.value)));
function chooseStructure(index) {
  if (!projection) return;
  const structure = structures[index];
  if (structure) {
    const laryngeal = structure.kinds.some(kind => [4,7,10,11,12].includes(kind));
    if (!mode || mode === 2 && !laryngeal) setView(1);
    if (mode === 1 && structure.yaw != null) yaw = structure.yaw * (yaw < 0 ? -1 : 1);
  } else if (mode === 1) {
    yaw = Math.abs(views[mode].yaw) * (yaw < 0 ? -1 : 1);
  }
  updateHighlight(index);
}`);
replace('  highlighted = index;\n  const structure = structures[index];', `  highlighted = index;
  $('structurePicker').value = index;
  const structure = structures[index];`);
replace('const draw = (time, yaw, pitch, figures, mode, selected, spotlight = null) => {', 'const draw = (time, yaw, pitch, figures, mode, selected, spotlight = null, zoom = 1) => {');
replace('      const [x,y,scale] = seats[index];', '      const [x,y,scale] = seats[index].map(value => value * zoom);');
replace('    const [x,y,scale] = seats[spotlight === null ? index : 0];', '    const [x,y,scale] = seats[spotlight === null ? index : 0].map(value => value * projectionZoom);');
replace('let yaw = views[0].yaw;', 'let yaw = views[0].yaw;\nlet projectionZoom = 1;');
replace('figures, mode, mask, spotlight);', 'figures, mode, mask, spotlight, projectionZoom);');
replace("headCanvas.addEventListener('dblclick', () => { yaw = views[mode].yaw; pitch = views[mode].pitch; positionCallouts(); });", `function setProjectionZoom(value) {
  projectionZoom = clamp(value,.62,1.85);
  const percent = Math.round(projectionZoom * 100);
  setText($('dragHint'), percent === 100 ? '' : percent + '%');
  positionLabels();
}
headCanvas.addEventListener('wheel', event => {
  if (!projection || event.ctrlKey || !event.deltaY) return;
  event.preventDefault();
  const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? headCanvas.clientHeight : 1;
  setProjectionZoom(projectionZoom * Math.exp(-clamp(event.deltaY * unit,-180,180) * .0015));
}, { passive:false });
headCanvas.addEventListener('dblclick', () => {
  yaw = views[mode].yaw;
  pitch = views[mode].pitch;
  setProjectionZoom(1);
});`);
replace('<title>VESPER / Morrow / Heirate mich (Full Cut)</title>', '<title>Mutter · Night Stage</title>');
replace('</head>', `<script type="application/octet-stream" id="englishPronunciations">${compressedEnglish}</script>
<script type="text/plain" id="englishPronunciationNotice">CMU Pronouncing Dictionary. https://github.com/cmusphinx/cmudict
The embedded version keeps primary entries and removes comments and alternate spellings.
${read('cmudict-LICENSE.txt')}</script>
</head>`);
replace(/  <header class="masthead">[\s\S]*?<\/header>\n/, '');
replace(/  <footer class="foot">.*?<\/footer>\n/, '');
replace('<p class="eyebrow">VESPER / SCORE</p>', '');
replace(/        <div class="stage-id">.*?<\/div>\n/, '');
replace(/        <div class="field-caption".*?<\/div>\n/, '');
replace('        <div class="stage-views"', `        <select id="structurePicker" aria-label="Highlight head anatomy" title="Highlight head anatomy"><option value="-1">All anatomy</option></select>
        <div class="stage-views"`);
replace('<canvas id="head"', `<div class="ward-bloom" aria-hidden="true"></div><canvas id="wardStage" class="ward-stage" aria-hidden="true"></canvas>${read('mutter-ward.svg')}<canvas id="head" title="Drag to turn. Scroll to zoom. Double-click to reset."`);

const fullscreenButton = html.match(/<button id="expand".*?<\/button>/)[0];
const backingButton = html.match(/<button id="backingToggle".*?<\/button>/)[0];
const exportButton = html.match(/<button id="exportAudio".*?<\/button>/)[0];
const choirControls = html.match(/      <section class="choir module"[\s\S]*?<\/section>\n/)[0];
replace(/        <div class="stage-footer">[\s\S]*?          <\/div>\n        <\/div>/,
  '        <div class="stage-footer"><span id="dragHint"></span></div>');
replace(/(<button type="button" id="larynxView".*?<\/button>)/, html.match(/<button type="button" id="larynxView".*?<\/button>/)[0] + '\n          ' + fullscreenButton);
replace('        ' + exportButton, '        <span class="transport-status" id="status" role="status"></span>');
replace(choirControls, '');
replace('<section class="module desk">', `<details class="module desk" id="controlDrawer">
        <summary>Controls</summary>`);
replace('          <button type="button" id="anatomyTab"', `          <button type="button" id="speechTab" aria-controls="speechPanel" aria-pressed="false">Speak</button>
          <button type="button" id="anatomyTab"`);
replace('        <div class="desk-content" id="anatomyPanel" hidden>', `        <div class="desk-content" id="speechPanel" hidden>
          <form id="speechForm" class="speech-form">
            <label for="speechText">Text to speak</label>
            <textarea id="speechText" rows="4" maxlength="3200" placeholder="Type or paste a line for the singer." required></textarea>
            <div class="speech-fields">
              <label for="speechHead">Singer<select id="speechHead"></select></label>
              <label for="speechVoice">Voice<select id="speechVoice"></select></label>
            </div>
            <div class="speech-speed">
              <label for="speechRate">Speaking speed</label>
              <input id="speechRate" type="number" min="0.5" max="2" step="0.05" value="1.00" inputmode="decimal" aria-describedby="speechRateHint" required>
              <span>×</span>
              <span id="speechRateHint">0.5–2× · applies when you press Speak</span>
            </div>
            <div class="speech-actions">
              <button class="play" id="speechStart" type="submit" disabled>Speak</button>
              <button class="backing-toggle" id="speechStop" type="button" disabled>Stop</button>
              <span id="speechStatus" role="status"></span>
            </div>
          </form>
        </div>
        <div class="desk-content" id="anatomyPanel" hidden>`);
replace('      </section>\n      <section class="module monitor"', `        <div class="hud-drawer-tools">
          ${backingButton}
          ${exportButton.replace('</button>', '<span>Export WAV</span></button>')}
          <span id="exportStatus" role="status"></span>
        </div>
      </details>
      <section class="module monitor"`);
replace('<div id="castRows" class="cast-rows"></div>', choirControls.trim() + '\n          <div id="castRows" class="cast-rows"></div>');
replace('<p class="panel-note">Morrow’s German performance follows the trimmed MIDI arrangement. Use Backing to hear the voice on its own.</p>', '');
replace('<div class="module-title"><h2>Wireframe cast</h2><span>05 PORTRAITS</span></div>', '');
replace('<span>LEAD / 3D</span>', '');
replace('Bring vocal anatomy forward in Ensemble', 'Emphasize anatomy in Ensemble');
replace(/<div class="timehead">.*?<\/div>/,
  '<div class="timehead"><b id="nowPlaying"></b><select id="wardCue" aria-label="Jump to song section" title="Jump to song section"></select><span id="clock">0:00 / 0:00</span></div>');
replace('<div class="monitor-foot"><span id="monitorState">FOLDS AT REST</span><span id="monitorVowel">—</span></div>', '');
replace('<div class="formant-readout"', '<div class="monitor-foot"><span id="monitorVowel">—</span><div class="formant-readout"');
replace('F1 — &nbsp; F2 — &nbsp; F3 —</div>', 'F1 — &nbsp; F2 — &nbsp; F3 —</div></div>');
replace('</style>', `${read('mutter-ward.css')}\n${read('mutter-stage.css')}\n${read('mutter-hud.css')}\n</style>`);
replace(/  \$\('scoreMeta'\)\.textContent = .*?;\n/, '');
replace(/  \$\('fieldIndex'\)\.textContent = .*?;\n  \$\('fieldName'\)\.textContent = .*?;\n/, '');
replace(/  if \(!mode\) setText\(\$\('fieldCaption'\),\s*ensembleCaption\(\)\);\n/g, '');
replace(/  setText\(\$\('fieldCaption'\), .*?;\n/, '');
replace(/const ensembleCaption = \(\) => \{[\s\S]*?\n\};\n/, '');
replace(/  setText\(\$\('stagePitch'\), .*?;\n/, '');
replace(/  setText\(\$\('monitorState'\), .*?;\n/, '');
replace("  $('status').parentElement.classList.toggle('live', Boolean(active));", "  $('status').classList.toggle('failed', audioError);");
replace("  if (next) showPanel('anatomy');", "  if (next) {\n    $('controlDrawer').open = true;\n    showPanel('anatomy');\n  }");
replace("const panelTabs = ['repertoire','cast','voice','anatomy'];", "const panelTabs = ['repertoire','cast','voice','speech','anatomy'];");
replace('function stop(keepPosition) {\n  if (keepPosition)', 'function stop(keepPosition) {\n  stopSpeech();\n  if (keepPosition)');
replace('async function play() {\n  if (active || starting) return;', 'async function play() {\n  if (active || starting) return;\n  stopSpeech();');
replace('  positionLabels();\n  drawNotation();\n}', '  syncSpeechCast();\n  positionLabels();\n  drawNotation();\n}');
replace("scope.strokeStyle = '#183329';", "scope.strokeStyle = '#382128';");
replace("scoreInk.strokeStyle = '#203937';", "scoreInk.strokeStyle = '#382128';");
replace(' - Vesper ${voices', ' - ${voices');
replace("  $('edit').hidden = score() === morrowFull;", `  $('edit').hidden = score() === morrowFull;
  $('wardCue').hidden = score() !== morrowFull;
  document.body.dataset.piece = score() === morrowFull ? 'mutter' : '';`);
replace('  let lyricNote = null;', '  let lyricNote = null;\n  let lyricTime = t;\n  const talk = speechPose(ms);');
replace('    if (!lyricNote && event) lyricNote = event.note;', `    if (!lyricNote && event) {
      lyricNote = event.note;
      lyricTime = elapsed - (event.note.start - (event.note.referenceStart ?? event.note.start));
    }`);
replace('    const shape = event ? articulationShape(event, progress) : null;', `    const speaking = talk?.index === index;
    const shape = speaking ? talk.shape : event ? articulationShape(event, progress) : null;
    const sound = speaking ? talk.sound : event?.sound;`);
replace('figure.hz = voice > .1 ?', 'figure.hz = speaking ? talk.hz : event && voice > .1 ?');
replace('const drive = event ? phonationAt(event, progress)[0] : .52;',
  'const drive = speaking ? talk.drive : event ? phonationAt(event, progress)[0] : .52;');
replace('nasalSounds.has(event?.sound)', 'nasalSounds.has(sound)');
replace('tonguePose(shape,event?.sound)', 'tonguePose(shape,sound)');
replace('    figure.muted = part.muted;', '    figure.muted = !speaking && part.muted;');
replace("Boolean(voice > .1 && !part.muted)", "Boolean(voice > .1 && !figure.muted)");
replace('  if (projection) projection(drift, yaw', '  if (!speechRun) updateWard(t, dt, live, lyricNote, lyricTime);\n  if (projection) projection(drift, yaw');
replace('  drawPulse(drift, figures[0]);', '  drawPulse(drift, figures[talk?.index ?? 0]);');
replace('  const hz = figures[0].hz;', '  const hz = figures[talk?.index ?? 0].hz;');
replace("setText($('monitorVowel'), leadEvent ?", "setText($('monitorVowel'), talk?.sound ? (talk.shape?.name || talk.sound.toUpperCase()) : leadEvent ?");
replace('const frequencies = leadEvent && articulationShape(leadEvent,', 'const frequencies = talk ? talk.shape?.f : leadEvent && articulationShape(leadEvent,');
replace('vocalResonances(frequencies, hzFor(leadEvent.note.midi), parts[0].tract)',
  'vocalResonances(frequencies, talk ? talk.hz || 110 : hzFor(leadEvent.note.midi), talk ? [.98,1.12,.93,1.01,1.06][figures[talk.index].model] : parts[0].tract)');
replace("  setText($('lyric'), lyricNote ? (lyricNote.phrase || lyricNote.lyric) : '');\n", '');

const scene = `
const wardCue = $('wardCue');
const wardLyric = $('lyric');
let wardIndex = -1;
let wardOn = false;
let wardLine = null;
let wardWord = -1;
let wordNodes = [];
const focalWord = (text, caption) => text.replace(/[,.!]$/, '') === caption.focus;
const wardCaptions = fullTake.lines.map(({ text, role }, line) => {
  const words = stageShowData.words[line];
  const [style,focus] = stageShowData.cues[line];
  return { text, role, line, words, style, focus, start: words[0][1], end: words.at(-1)[2] };
});
const sectionLighting = ['cold','cold','call','cold','call','blade','whisper','solo','blade','force','release'];

fullTake.sections.forEach(([time, name], index) => {
  const option = document.createElement('option');
  option.value = index;
  option.textContent = timeText(time) + '  ·  ' + name;
  wardCue.append(option);
});
wardCue.addEventListener('change', () => {
  const wasPlaying = starting || Boolean(active);
  stop(false);
  offset = fullTake.sections[Number(wardCue.value)][0];
  updateTransport();
  if (wasPlaying) play();
});

function setWardCaption(caption, time) {
  const line = caption?.line ?? null;
  if (wardLine !== line) {
    wardLine = line;
    wardWord = -1;
    wordNodes = [];
    wardLyric.dataset.signal = caption?.text ?? '';
    wardLyric.dataset.role = caption?.role ?? '';
    wardLyric.dataset.style = caption?.style ?? '';
    const words = document.createDocumentFragment();
    caption?.words.forEach(([word], index) => {
      if (index) words.append(' ');
      const node = document.createElement('span');
      node.className = 'ward-word';
      if (focalWord(word,caption)) node.classList.add('ward-mark');
      node.textContent = word;
      wordNodes.push(node);
      words.append(node);
    });
    wardLyric.replaceChildren(words);
  }
  if (!caption) return null;
  const currentWord = caption.words.findIndex(([,start,end]) => time >= start && time < end + .026);
  if (currentWord !== wardWord) {
    wordNodes[wardWord]?.classList.remove('sounding');
    wordNodes[currentWord]?.classList.add('sounding');
    wardWord = currentWord;
  }
  const word = caption.words[currentWord];
  const cue = word && focalWord(word[0],caption) ? word[1] : caption.start;
  const age = Math.max(0,time - cue);
  const fade = reducedMotion.matches ? 0 : clamp(1 - age / .38, 0, 1);
  const split = fade * (.63 + .37 * Math.cos(age * 61));
  wardLyric.style.setProperty('--caption-hit',fade.toFixed(3));
  wardLyric.style.setProperty('--caption-split',split.toFixed(3));
  let ripple;
  const river = caption.style === 'flood' ? caption.words.findIndex(([text]) => focalWord(text,caption)) : -1;
  if (river >= 0 && !reducedMotion.matches) {
    const elapsed = time - caption.words[river][1];
    if (elapsed >= 0 && elapsed < 1.28) {
      const origin = wordNodes[river].getBoundingClientRect();
      const field = stage.getBoundingClientRect();
      ripple = { x: origin.left - field.left + origin.width / 2,
        y: origin.bottom - field.top - 2, phase: elapsed / 1.28 };
    }
  }
  const echo = caption.style === 'return' ? { text:caption.text, age:time - caption.start } : null;
  return { fade, ripple, echo };
}

function updateWard(time, dt, live, note, lyricTime) {
  if (score() !== morrowFull) {
    if (wardOn) {
      wardOn = false;
      wardIndex = -1;
      figures.forEach(figure => { figure.acting = null; figure.foreheadGlow = 0; });
      delete stage.dataset.mood;
      delete stage.dataset.lighting;
      stage.removeAttribute('data-refrain');
      setWardCaption(null);
    }
    setText(wardLyric, note?.phrase || note?.lyric || '');
    return;
  }
  if (!wardOn) setText(wardLyric, '');
  wardOn = true;
  const index = fullTake.sections.findLastIndex(([start]) => start <= time);
  const [, , , mood] = fullTake.sections[index];
  if (index !== wardIndex) {
    wardIndex = index;
    wardCue.value = index;
    stage.dataset.mood = mood;
    stage.toggleAttribute('data-refrain', index === 2 || index === 4);
  }
  const sungCaption = wardCaptions[note?.line ?? -1];
  const caption = sungCaption ?? wardCaptions.findLast(line => line.start <= time && time < line.end + .19);
  const emphasis = setWardCaption(caption,sungCaption ? lyricTime : time);
  const theme = caption && caption.style !== 'cold' ? caption.style : sectionLighting[index];
  if (stage.dataset.lighting !== theme) stage.dataset.lighting = theme;
  const beat = live ? wardBeat(time) * (backingEnabled ? 1 : .38) : 0;
  paintWardStage(time, theme, dt, Boolean(live), beat, emphasis);
  const lead = figures[0];
  lead.acting = lead.model === 0 ? wardAct(time, reducedMotion.matches) : null;
  lead.foreheadGlow = lead.model === 0 ? wardForeheadGlow(time, reducedMotion.matches) : 0;
}
`;
replace('showSongs();\nselectSong(0);\nsetView(0);', `const stageShowData = ${JSON.stringify(stageShow)};\n${read('mutter-direction.js')}\n${read('mutter-stage.js')}\n${scene}\n${read('mutter-speech-phrasing.js')}\n${read('mutter-speech.js')}\nshowSongs();\nselectSong(0);\nsetView(0);`);
new vm.Script(html.match(/<script>\s*([\s\S]+)<\/script>/)[1]);
fs.writeFileSync(path.join(output, 'VESPER-Mutter-Night-Stage-Two-Handed-Bridge.html'), html);
