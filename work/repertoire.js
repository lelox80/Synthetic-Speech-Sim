const key = (root, minor = false) => ({ root, scale: minor ? minorScale : majorScale });
Object.assign(songs[0], { key: key(2, true), keyName: 'D minor', group: 'Original', roundBeats: 8 });
Object.assign(songs[1], { key: key(0), keyName: 'C major', group: 'Traditional', roundBeats: 8 });
Object.assign(songs[2], { key: key(5), keyName: 'F major', group: 'Rounds', roundBeats: 6 });

function vocalSong(title, description, group, bpm, keyName, tonalKey, lines, roundBeats = 8) {
  const captions = [];
  const source = lines.flatMap(([caption, line]) => line.trim().split(/\s+/).map(token => {
    const [note, beats, sounds, word] = token.split(':');
    captions.push(caption);
    return `${note} ${beats || 1}${sounds ? ` ${sounds}` : ''}${word ? ` | ${word.replaceAll('_',' ')}` : ''}`;
  })).join('\n');
  return Object.assign(parseScore(title, bpm, source, description, captions), { group, keyName, key: tonalKey, roundBeats });
}

function melody(title, description, group, bpm, keyName, tonalKey, lines, roundBeats = 8) {
  const vowels = ['oo','oh','ah','eh','ah'];
  return vocalSong(title, description, group, bpm, keyName, tonalKey, lines.map((line, index) => [
    '', line.trim().split(/\s+/).map((token, noteIndex) => {
      const [note, beats, sound] = token.split(':');
      return note === '-' ? token : `${note}:${beats || 1}:${sound || (noteIndex === 0 ? `h+${vowels[index % 5]}` : vowels[index % 5])}`;
    }).join(' ')
  ]), roundBeats);
}

songs.push(
  melody('Glass Cathedral', 'Original · wordless processional', 'Original', 70, 'E minor', key(4, true), [
    'E3:1.5 G3:.5 B3:1 D4:1 E4:2 D4:1 B3:1',
    'C4:1.5 B3:.5 G3:1 A3:1 B3:2 G3:1 F#3:1',
    'E3:1.5 G3:.5 B3:1 E4:1 G4:2 F#4:1 E4:1',
    'D4:1 B3:1 C4:1.5 A3:.5 B3:1 G3:1 E3:3:oo'
  ]),
  vocalSong('Mouth of the Night', 'Original · nocturne with lyrics', 'Original', 76, 'A minor', key(9, true), [
    ['Under the floor, under the stone', 'A3:.75:uh+n:Un C4:.75:d+er:der B3:.5:dh+sch:the A3:1.5:f+l+aw+r:floor E3:.75:uh+n:un G3:.75:d+er:der A3:.5:dh+sch:the C4:1.5:s+t+oh+n:stone -:.5'],
    ['Something is breathing, even alone', 'C4:1:s+uh+m:Some B3:.5:th+ih+ng:thing A3:.5:ih+z:is G3:1:b+r+ee:breath A3:.5:dh+ih+ng:ing C4:.75:ee:E B3:.75:v+sch+n:ven A3:.5:sch:a E3:2:l+oh+n:lone -:.5'],
    ['I put my ear to the mouth of the night', 'A3:.5:eye:I C4:.5:p+oo+t:put E4:.75:m+eye:my D4:1:ee+r:ear C4:.5:t+oo:to B3:.5:dh+sch:the A3:1:m+ow+th:mouth C4:.5:uh+v:of B3:.5:dh+sch:the G3:1.5:n+eye+t:night -:.75'],
    ['And it sang my name without any light', 'A3:.5:ae+n+d:And B3:.5:ih+t:it C4:1:s+ae+ng:sang D4:.5:m+eye:my E4:1.25:n+ay+m:name D4:.5:w+ih:with C4:.75:dh+ow+t:out B3:.5:eh+n:a G3:.5:ee:ny A3:2.5:l+eye+t:light']
  ]),
  melody('Afterlight', 'Original · luminous wordless study', 'Original', 96, 'D major', key(2), [
    'D4:1 F#4:1 A4:1 B4:1 A4:2 F#4:1 E4:1',
    'G4:1 A4:1 B4:1 D5:1 C#5:1.5 B4:.5 A4:2',
    'F#4:.5 A4:.5 B4:1 F#4:1 E4:1 D4:2 A3:2',
    'G4:1 F#4:1 E4:1 A4:1 F#4:1 E4:1 D4:3:oh'
  ]),
  vocalSong('Frère Jacques', 'Traditional French · four-beat entrances', 'Rounds', 110, 'C major', key(0), [
    ['Frère Jacques, Frère Jacques', 'C4:1:f+r+eh:Frè D4:1:r+sch:re E4:1:zh+ah:Jac C4:1:k+sch:ques C4:1:f+r+eh:Frè D4:1:r+sch:re E4:1:zh+ah:Jac C4:1:k+sch:ques'],
    ['Dormez-vous ? Dormez-vous ?', 'E4:1:d+aw+r:Dor F4:1:m+ay:mez G4:2:v+oo:vous E4:1:d+aw+r:Dor F4:1:m+ay:mez G4:2:v+oo:vous'],
    ['Sonnez les matines, sonnez les matines', 'G4:.5:s+aw:Son A4:.5:n+ay:nez G4:.5:l+ay:les F4:.5:m+ah:ma E4:1:t+ee:ti C4:1:n+sch:nes G4:.5:s+aw:son A4:.5:n+ay:nez G4:.5:l+ay:les F4:.5:m+ah:ma E4:1:t+ee:ti C4:1:n+sch:nes'],
    ['Ding, dang, dong', 'C4:1:d+ih+ng:Ding G3:1:d+ae+ng:dang C4:2:d+aw+ng:dong C4:1:d+ih+ng:Ding G3:1:d+ae+ng:dang C4:2:d+aw+ng:dong']
  ], 4),
  melody('Mirror Canon', 'Original · eight-beat entrances', 'Rounds', 104, 'C major', key(0), [
    'C4 E4 B3 G3 A3 C4 A3 B3',
    'E4 G4 D4 B3 C4 E4 C4 D4',
    'G3 C4 G3 D4 E4 A3 F3 G3',
    'C4 G3 B3 G3 C4 E4 A3 D4 C4:2:oo'
  ], 8),
  vocalSong('Amazing Grace', 'Traditional · first verse', 'Traditional', 94, 'G major', key(7), [
    ['Amazing grace, how sweet the sound', 'D3:1:sch:A G3:2:m+ay:ma B3:.5:z+ih+ng:zing G3:.5:ng A3:2:g+r+ay+s:grace G3:1:h+ow:how E3:2:s+w+ee+t:sweet D3:1:dh+sch:the D3:2:s+ow+n+d:sound'],
    ['That saved a wretch like me', 'D3:1:dh+ae+t:That G3:2:s+ay+v+d:saved B3:.5:sch:a G3:.5:sch B3:2:r+eh+ch:wretch B3:1:l+eye+k:like D4:3:m+ee:me'],
    ['I once was lost, but now am found', 'B3:1:eye:I D4:2:w+uh+n+s:once B3:.5:w+uh:was G3:.5:uh+z A3:2:l+aw+s+t:lost G3:1:b+uh+t:but E3:2:n+ow:now D3:1:ae+m:am D3:2:f+ow+n+d:found'],
    ['Was blind, but now I see', 'D3:1:w+uh+z:Was G3:2:b+l+eye+n+d:blind B3:.5:b+uh:but G3:.5:uh+t A3:2:n+ow:now G3:1:eye:I G3:3:s+ee:see']
  ], 8),
  melody('Scarborough Fair', 'Traditional · Dorian air', 'Traditional', 99, 'D Dorian', { root: 2, scale: [0,2,3,5,7,9,10] }, [
    'D4:1 D4:1 A4:1 A4:1 E4:1 F4:.5 E4:.5 D4:2',
    'A4:1 C5:1 D5:2 C5:1 A4:1 G4:1 F4:1 E4:1 D4:2',
    'D4:1 E4:1 F4:1 G4:1 A4:2 G4:1 F4:1 E4:2',
    'D4:1 A4:1 G4:1 F4:1 E4:1 D4:3:oo'
  ]),
  melody('Greensleeves', 'Traditional · minor ballad', 'Traditional', 118, 'A minor', key(9, true), [
    'A3 C4:2 D4 E4:1.5 F4:.5 E4 D4:2 B3 G3:1.5 A3:.5 B3 C4:2 A3 A3:1.5 G#3:.5 A3 B3:2 G#3 E3:2 A3',
    'C4:2 D4 E4:1.5 F4:.5 E4 D4:2 B3 G3:1.5 A3:.5 B3 C4:1.5 B3:.5 A3 G#3:1.5 F#3:.5 G#3 A3:3',
    'G4:3 G4:1.5 F4:.5 E4 D4:2 B3 G3:1.5 A3:.5 B3 C4:2 A3 A3:1.5 G#3:.5 A3 B3:2 G#3 E3:3',
    'G4:3 G4:1.5 F4:.5 E4 D4:2 B3 G3:1.5 A3:.5 B3 C4:1.5 B3:.5 A3 G#3:1.5 F#3:.5 G#3 A3:3:oo'
  ], 12),
  vocalSong('Silent Night', 'Franz Xaver Gruber · first verse', 'Traditional', 112, 'C major', key(0), [
    ['Silent night, holy night', 'G4:1.5:s+eye:Si A4:.5:l+sch+n:lent G4:1:n+eye:night E4:3:eye+t G4:1.5:h+oh:Ho A4:.5:l+ee:ly G4:1:n+eye:night E4:3:eye+t'],
    ['All is calm, all is bright', 'D5:2:aw+l:All D5:1:ih+z:is B4:3:k+ah+m:calm C5:2:aw+l:all C5:1:ih+z:is G4:3:b+r+eye+t:bright'],
    ['Round yon virgin, mother and child', 'A4:2:r+ow+n+d:Round A4:1:y+ah+n:yon C5:1.5:v+er:vir B4:.5:j+ih+n:gin A4:1:m+uh:mo G4:1.5:dh+er:ther A4:.5:ae+n+d:and G4:1:ch+eye:child E4:3:eye+l+d'],
    ['Holy infant so tender and mild', 'A4:2:h+oh:Ho A4:1:l+ee:ly C5:1.5:ih+n:in B4:.5:f+sch+n+t:fant A4:1:s+oh:so G4:1.5:t+eh+n:ten A4:.5:d+er:der G4:1:ae+n+d:and E4:3:m+eye+l+d:mild'],
    ['Sleep in heavenly peace', 'D5:2:s+l+ee+p:Sleep D5:1:ih+n:in F5:1.5:h+eh+v:hea D5:.5:sch+n:ven B4:1:l+ee:ly C5:4:p+ee+s:peace'],
    ['Sleep in heavenly peace', 'C5:1.5:s+l+ee+p:Sleep G4:.5:ih+n:in E4:1:h+eh+v:hea G4:1.5:sch+n:ven F4:.5:l+ee:ly D4:1:p+ee:peace C4:4:ee+s']
  ], 12),
  melody('Ode to Joy', 'Ludwig van Beethoven · theme', 'Classical', 113, 'D major', key(2), [
    'F#4 F#4 G4 A4 A4 G4 F#4 E4 D4 D4 E4 F#4 F#4:1.5 E4:.5 E4:2',
    'F#4 F#4 G4 A4 A4 G4 F#4 E4 D4 D4 E4 F#4 E4:1.5 D4:.5 D4:2',
    'E4 E4 F#4 D4 E4 F#4:.5 G4:.5 F#4 D4 E4 F#4:.5 G4:.5 F#4 E4 D4 E4 A3:2',
    'F#4 F#4 G4 A4 A4 G4 F#4 E4 D4 D4 E4 F#4 E4:1.5 D4:.5 D4:2:ah'
  ], 16),
  vocalSong('Dies Irae', 'Gregorian chant · Latin incipit', 'Classical', 83, 'D minor', key(2,true), [
    ['Dies irae, dies illa', 'F3:1:d+ee:Di E3:1:eh+s:es F3:1:ee:i D3:1:r+eh:rae E3:1:d+ee:di C3:1:eh+s:es D3:1:ee+l:il D3:2:l+ah:la -:1'],
    ['Solvet saeclum in favilla', 'F3:1:s+aw+l:Sol G3:1:v+eh+t:vet F3:1:s+eh:sae E3:1:k+l+oo+m:clum F3:1:ih+n:in D3:1:f+ah:fa E3:1:v+ee+l:vil D3:2:l+ah:la -:1'],
    ['Teste David cum Sibylla', 'E3:1:t+eh+s:Tes F3:1:t+eh:te E3:1:d+ah:Da D3:1:v+ee+d:vid C3:1:k+oo+m:cum D3:1:s+ee:Si E3:1:b+ee+l:byl D3:3:l+ah:la']
  ]),
  melody('Brahms’ Lullaby', 'Johannes Brahms · cradle melody', 'Classical', 104, 'F major', key(5), [
    'A3:.5 A3:.5 C4:2 A3:.5 A3:.5 C4:2 A3:.5 C4:.5 F4 D4 C4 Bb3 Bb3 A3 G3 A3:2',
    'F3:.5 F3:.5 F4 D4 Bb3 C4 A3 F3 Bb3 C4 D4 C4:2',
    'F3:.5 F3:.5 F4 D4 Bb3 C4 A3 F3 Bb3 A3 G3 F3:3:oo'
  ], 12)
);
