const assert = require('node:assert/strict');

module.exports = function scoreSeemann(midi, sheet) {
  const vowels = new Set('ah eh ih ee aw oo sch uu ar eeh ooe yee yih oee eer ier eye ow euro'.split(' '));
  const notes = [], lines = [], words = [], cues = [];
  const corrections = [];
  const consumed = new Set();
  const hz = pitch => 440 * 2 ** ((pitch - 69) / 12);

  for (const row of sheet.trim().split(/\r?\n/)) {
    const [guide, text, pronunciation, style, focus] = row.split('|').map(field => field.trim());
    const [trackIndex, first, last] = guide.split(' ').map(Number);
    const track = midi.tracks[trackIndex];
    const tokens = text.split(' '), phones = pronunciation.split(' ');
    assert.equal(tokens.length, phones.length, text);
    const line = lines.length;
    const role = style === 'cold' || style === 'alone' ? 'Close' : 'Lead';
    lines.push({ text, role });
    cues.push([style, focus]);
    let cursor = first;
    const timedWords = phones.map((word, wordIndex) => {
      const wordStart = track.notes[cursor][0];
      let wordEnd = wordStart;
      for (const syllable of word.split('/')) {
        const [sounds, carry = '1'] = syllable.split('~');
        const count = Number(carry), phonemes = sounds.split('+');
        const nucleus = phonemes.findIndex(sound => vowels.has(sound));
        assert.ok(nucleus >= 0, syllable);
        for (let segment = 0; segment < count; segment++, cursor++) {
          assert.ok(cursor < last, text);
          const [start, sourceEnd, sourcePitch] = track.notes[cursor];
          const nextStart = track.notes[cursor + 1]?.[0] ?? Infinity;
          const tied = segment > 0, tieNext = segment < count - 1;
          const end = tieNext ? nextStart : Math.min(sourceEnd, nextStart);
          let pitch = sourcePitch;
          // Four verse notes and the first syllable of Feuer contain isolated octave jumps.
          if (trackIndex === 9 && pitch === 45) pitch += 12;
          if (trackIndex === 10 && cursor === 80) pitch -= 12;
          if (pitch !== sourcePitch) corrections.push([trackIndex,cursor,sourcePitch,pitch]);
          // Give Morrow a baritone verse register, rising naturally into the lantern passages.
          if (trackIndex === 9) pitch -= 12;
          const onset = tied ? nucleus : 0;
          const release = tieNext ? nucleus + 1 : phonemes.length;
          const trajectory = Array.from({ length: 17 }, (_, i) => {
            const phase = i / 16;
            const attack = tied ? 0 : -.19 * Math.exp(-phase * 13);
            const fall = tieNext ? 0 : -.20 * phase ** 8;
            return +hz(pitch + attack + fall + .035 * Math.sin(phase * Math.PI)).toFixed(3);
          });
          notes.push({ start, end, midi:pitch, sounds:phonemes.slice(onset,release),
            line, phrase:text, role, trajectory, tied, tieNext,
            level:style === 'cold' ? .84 : trackIndex === 9 ? .99 : 1.09,
            voice:style === 'alone' || style === 'cold' ? 'close' : 'lead' });
          wordEnd = end;
          const identity = `${trackIndex}/${cursor}`;
          assert.ok(!consumed.has(identity), identity);
          consumed.add(identity);
        }
      }
      return [tokens[wordIndex],wordStart,wordEnd];
    });
    assert.equal(cursor,last,text);
    assert.ok(tokens.some(word => word.replace(/[,.!]$/,'') === focus),focus);
    words.push(timedWords);
  }

  assert.equal(consumed.size,midi.tracks[9].notes.length + midi.tracks[10].notes.length);
  notes.sort((a,b) => a.start-b.start);
  for (let i=1; i<notes.length; i++) assert.ok(notes[i].start >= notes[i-1].end - .00001);
  for (let line=1; line<words.length; line++) {
    const first = words[line][0][1], previous = words[line-1].at(-1)[2];
    if (first - previous < .72) continue;
    const length = Math.min(.30,(first-previous)*.20);
    notes.push({start:first-length-.14,end:first-.14,midi:46,sounds:['wardin'],line:null,
      phrase:'',role:'Breath',voice:'close',inhale:true,level:.42});
  }
  notes.sort((a,b) => a.start-b.start);
  const duration = Math.max(...midi.tracks.map(track=>track.duration)) + 1.8;
  const sections = [
    [0,'Open water','cold'], [20.545008,'Komm in mein Boot','sea'],
    [61.635024,'Rising sea','storm'], [75.331696,'Adrift','drift'],
    [102.72504,'The shore','night'], [115.993691,'The lantern','lantern'],
    [169.282305,'Between shores','dusk'], [178.056736,'Der Steuermann','yearning'],
    [205.022077,'Lantern reprise','lantern'], [232.415421,'The night','night'],
    [246.112093,'Alone','alone'], [253.174439,'Kalt','cold'], [265.0,'Ebb','release']
  ].map(([time,name,mood])=>[time,name,name,mood]);
  return { duration,notes,lines,sections,words,cues,corrections,
    bpm:60000000 / midi.tempos[0][1] };
};
