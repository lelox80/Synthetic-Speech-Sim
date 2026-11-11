const choirVoices = [
  { name: 'Lead', color: '#a2ffda', degree: 0, tract: 1, cents: 0, rate: 5.15, delay: 0, level: 1 },
  { name: 'Upper', color: '#8fe1ff', range: [3,9], target: 5, tract: 1.09, cents: 4, rate: 5.6, delay: .019, level: .83 },
  { name: 'Bass', color: '#bfafff', range: [-19,-7], target: -13, tract: .85, cents: -5, rate: 4.72, delay: .029, level: .98 },
  { name: 'Inner', color: '#f5c78d', range: [-10,-2], target: -5, tract: .96, cents: -3, rate: 5.37, delay: .013, level: .76 },
  { name: 'Descant', color: '#f0b8df', range: [9,17], target: 12, tract: 1.19, cents: 6, rate: 5.81, delay: .024, level: .64 }
];

const pitchClass = midi => ((midi % 12) + 12) % 12;
const majorScale = [0, 2, 4, 5, 7, 9, 11];
const minorScale = [0, 2, 3, 5, 7, 8, 10];

function inferKey(notes) {
  const voiced = notes.filter(note => note.midi !== null);
  const ending = pitchClass(voiced.at(-1).midi);
  const weights = Array(12).fill(0);
  voiced.forEach(note => { weights[pitchClass(note.midi)] += note.end - note.start; });
  let best;
  for (let root = 0; root < 12; root++) {
    for (const scale of [majorScale, minorScale]) {
      const fit = scale.reduce((sum, step) => sum + weights[(root + step) % 12], 0);
      const rank = fit + .19 * weights[root] + (root === ending ? .29 : 0);
      if (!best || rank > best.rank) best = { root, scale, rank };
    }
  }
  return best;
}

function harmonize(song, voices) {
  const { root, scale } = song.key || inferKey(song.notes);
  const chords = scale.map((_, degree) => [0,2,4].map(step => pitchClass(root + scale[(degree + step) % 7])));
  const previous = Array(voices.length).fill(null);
  let priorChord = -1;
  return song.notes.map(note => {
    const lead = note.midi;
    if (lead === null) return voices.map(() => null);
    let best;
    chords.forEach((chord, degree) => {
      const principal = chord.includes(pitchClass(lead));
      let cost = [0,.60,1.02,.13,.20,.30,1.68][degree] + (principal ? 0 : 5.3) + (priorChord === degree ? -.43 : 0);
      if (lead % 12 === root && note.end > song.duration - 1.2) cost -= degree === 0 ? 2.2 : 0;
      const pitches = [lead];
      voices.slice(1).forEach((voice, index) => {
        const from = lead + voice.range[0], to = lead + voice.range[1];
        const preferred = clamp(lead + voice.target, 36, 86);
        const last = previous[index + 1] ?? preferred;
        const candidates = [];
        for (let midi = from; midi <= to; midi++) {
          if (midi < 31 || midi > 90 || !chord.includes(pitchClass(midi))) continue;
          const doubled = pitches.filter(pitch => pitchClass(pitch) === pitchClass(midi)).length;
          const motion = Math.abs(midi - last);
          const bassRoot = index === 1 && pitchClass(midi) === chord[0];
          candidates.push([midi, .12 * Math.abs(midi - preferred) + .14 * motion + .12 * Math.max(0,motion - 5) + .35 * doubled - (bassRoot ? .8 : 0)]);
        }
        const [midi, rank] = candidates.sort((a,b) => a[1] - b[1])[0] || [lead + (voice.target < 0 ? -12 : 12), 2];
        pitches.push(midi);
        cost += rank;
      });
      if (!best || cost < best.cost) best = { cost, degree, pitches };
    });
    priorChord = best.degree;
    best.pitches.forEach((midi, index) => { previous[index] = midi; });
    return best.pitches;
  });
}

function choirArrangement(song, count, mode) {
  const voices = choirVoices.slice(0, count);
  const harmony = mode === 'harmony' && count > 1 ? harmonize(song, voices) : null;
  return voices.map((voice, index) => {
    if (!index) return { ...voice, score: song };
    if (mode === 'unison') return { ...voice, name: `Voice ${index + 1}`, score: song };
    const entry = mode === 'round' ? (song.roundBeats || 8) * 60 / song.bpm * index : 0;
    const shifted = new Map(song.notes.map((note, i) => [note, {
      ...note, start: note.start + entry, end: note.end + entry,
      midi: harmony ? harmony[i][index] : note.midi
    }]));
    const score = {
      ...song, duration: song.duration + entry, notes: [...shifted.values()],
      events: song.events.map(event => ({ ...event, start: event.start + entry, end: event.end + entry, note: shifted.get(event.note) }))
    };
    return { ...voice, name: entry ? `Entry ${index + 1}` : voice.name, score };
  });
}

const stereoSeats = [
  [0], [-.42, .42], [0, -.65, .65], [-.18, -.67, .24, .70], [0, -.71, .71, -.36, .36]
];

function startChoir(engine, parts, offset, settings) {
  const start = engine.context.currentTime + .052;
  const voices = [];
  try {
    for (const [index, part] of parts.entries()) {
      if (offset >= part.score.duration) continue;
      const voice = engine.start(part.score, offset, settings, {
        start: start + part.delay,
        pan: stereoSeats[parts.length - 1][index],
        level: part.level / parts.length ** .49,
        tract: part.tract,
        cents: part.cents,
        rate: part.rate,
        muted: part.muted
      });
      voice.index = index;
      voices.push(voice);
    }
  } catch (error) {
    voices.forEach(voice => voice.stop());
    throw error;
  }
  return {
    start, voices,
    stop: () => voices.forEach(voice => voice.stop()),
    adjust: settings => voices.forEach(voice => engine.adjust(voice, settings)),
    setMuted: (index, muted) => voices.find(voice => voice.index === index)?.setMuted(muted)
  };
}
