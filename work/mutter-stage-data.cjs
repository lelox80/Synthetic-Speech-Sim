const assert = require('node:assert/strict');
const cues = require('./mutter-cues.cjs');

module.exports = function stageData(take, midi, pronunciation) {
  const syllables = new Map(pronunciation.split(/\r?\n/).filter(row => row.includes('|')).map(row => {
    const [line, sounds] = row.split('|').map(part => part.trim());
    return [line, sounds.split(/\s+/).map(word => word.split('/').length)];
  }));
  const words = take.lines.map(({text}, line) => {
    const tokens = text.split(' ');
    const counts = syllables.get(text) ?? (text.endsWith('Kraft') ? tokens.map(() => 1) : tokens.map(() => 2));
    const notes = take.notes.filter(note => note.line === line);
    let cursor = 0;
    assert.equal(tokens.length, counts.length, text);
    const timed = tokens.map((word, index) => {
      const start = notes[cursor].start;
      for (let i = 0; i < counts[index]; i++) {
        cursor++;
        // A carried vowel keeps the same syllable. The joined call still has two.
        while (notes[cursor]?.tied && !notes[cursor].delivery) cursor++;
      }
      return [word, start, notes[cursor - 1].end];
    });
    assert.equal(cursor, notes.length, text);
    return timed;
  });
  const kit = midi.tracks.find(track => track.text.some(([,kind,text]) => kind === 3 && text === 'Drums'));
  const lights = kit.notes.filter(([, ,pitch]) => [35,38,49,57].includes(pitch)).map(([start,,pitch,velocity]) => [
    +start.toFixed(4), (pitch === 35 ? .88 : pitch === 38 ? .63 : 1) * velocity / 127
  ]);
  assert.equal(cues.length, words.length);
  cues.forEach(([,focus],i) => assert.ok(words[i].some(([word]) => word.replace(/[,.!]$/, '') === focus), `Missing cue ${focus}`));
  const foreheadMarks = words.flatMap((line,i) => {
    const birthmark = line.find(([word]) => word === 'Muttermal');
    if (!birthmark) return [];
    const next = words[i + 1] || [];
    const messers = next.findIndex(([word],j) => word === 'Messers' && next[j + 1]?.[0] === 'Kuss');
    assert.ok(messers >= 0, 'Missing Messers Kuss after Muttermal');
    return [[birthmark[1],next[messers + 1][2]]];
  });
  return { words, lights, cues, foreheadMarks };
};
