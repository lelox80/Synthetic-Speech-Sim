function sampleCurve(points, time) {
  const next = points.findIndex(([at]) => at > time);
  if (next < 0) return points.at(-1)[1];
  const [a, low] = points[next - 1];
  const [b, high] = points[next];
  return low + (high - low) * (time - a) / (b - a);
}

function cryDelivery(note, strength) {
  const answer = note.role === 'Answer';
  const registerLift = answer ? .56 : .75;
  const contour = note.tied
    ? [[0,0],[.15,.04],[.34,.26],[.60,-.05],[.82,-.38],[1,-.71]]
    : [[0,-.40],[.10,-.57],[.22,.55],[.35,.64],[.55,.22],[.69,.34],[.88,-.11],[1,0]];
  const trajectory = Array.from({ length: 21 }, (_, index) => {
    const phase = index / 20;
    const reference = phase * (note.trajectory.length - 1);
    const a = Math.floor(reference), b = Math.min(a + 1,note.trajectory.length - 1);
    const pitch = note.trajectory[a] + (note.trajectory[b] - note.trajectory[a]) * (reference - a);
    const vowelLift = note.tied ? 0 : .26 * Math.sin(Math.PI * phase);
    const semitones = registerLift + vowelLift + sampleCurve(contour,phase) * strength;
    return +(pitch * 2 ** (semitones / 12)).toFixed(2);
  });
  const delivery = note.tied ? { onset: .043, release: answer ? .048 : .044 }
    : { onset: answer ? .069 : .057 };
  return { cry: strength, delivery, trajectory, voice: answer ? 'cryAnswer' : 'cry' };
}

module.exports = function directMutter(take, wordTiming) {
  const refrains = take.sections.flatMap(([start,name],index) =>
    name.startsWith('Refrain') ? [[start,take.sections[index + 1][0]]] : []);
  const notes = take.notes.map(note => {
    if (note.line === null) return note;
    const words = wordTiming[note.line];
    const [word,start] = words.at(-1);
    const wordIndex = words.findLastIndex(([, time]) => time <= note.start + .00001);
    const currentWord = words[wordIndex]?.[0];
    const sounds = /^(mir|ihr|ihren)[,.!]?$/i.test(currentWord ?? '') && note.sounds.includes('eer')
      ? note.sounds.map(sound => sound === 'eer' ? 'ier' : sound) : note.sounds;
    if (/^Mutter,?$/.test(currentWord ?? '') && note.delivery &&
        refrains.some(([from,to]) => note.start >= from && note.start < to)) {
      const strength = (note.role === 'Answer' ? .72 : .96) + .055 * wordIndex;
      return { ...note, sounds, ...cryDelivery(note,strength) };
    }
    const voice = note.role === 'Answer' ? 'far'
      : note.role === 'Whisper' ? 'whisper'
      : note.phrase.endsWith('Kraft') && word === 'Kraft' && note.start >= start ? 'plea'
      : note.phrase.startsWith('Mutter') ? 'call'
      : note.line < 8 || (note.line >= 12 && note.line < 20) ? 'close'
      : 'lead';
    if (voice !== 'plea') return { ...note, sounds, voice };
    const weight = note.line === 45 ? 1 : .61 + .11 * ((note.line - 39) / 2);
    const trajectory = note.trajectory.map((hz,i,array) => {
      const phase = i / (array.length - 1);
      return +(hz * 2 ** (Math.sin(Math.PI * phase) * .37 * weight / 12)).toFixed(2);
    });
    return { ...note, sounds, voice, trajectory, weight };
  });

  for (const line of [0,8,12,20,28,32,34,38,45]) {
    const start = wordTiming[line][0][1];
    const previous = notes.findLast(note => note.end < start);
    const end = start - .055;
    const begin = Math.max(previous?.end + .03 || 0, start - .62);
    if (end - begin > .14) {
      notes.push({ start:begin, end, midi:52, sounds:['wardin'], phrase:'', line:null, voice:'close', inhale:true });
      notes.sort((a,b) => a.start - b.start);
    }
  }
  return { ...take, notes };
};
