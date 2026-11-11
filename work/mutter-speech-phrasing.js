const speechPhones = {
  a:'ah', e:'eh', i:'ee', o:'aw', u:'oo', y:'ih',
  ä:'eh', ö:'oee', ü:'yee', ai:'eye', ei:'eye', au:'ow', eu:'euro',
  sch:'sh', sh:'sh', ch:'ichch', th:'th', ng:'ng', ph:'f', ß:'s',
  m:'m', n:'n', p:'p', b:'b', f:'f', v:'v', w:'w',
  t:'t', d:'d', k:'k', g:'g', s:'s', z:'z', l:'l', r:'r', h:'h'
};

const speechWords = {
  en: {
    a:'sch', again:'sch g eh n', am:'ae m', and:'ae n d', are:'ah r', at:'ae t',
    can:'k ae n', evening:'ee v n ih ng', from:'f r uh m', good:'g uu d',
    have:'h ae v', hello:'h sch l oh', here:'h ih r', i:'eye', is:'ih z', it:'ih t',
    my:'m eye', name:'n ay m', night:'n eye t', of:'sch v', one:'w uh n', please:'p l ee z',
    say:'s ay', sing:'s ih ng', speak:'s p ee k', stage:'s t ay j',
    test:'t eh s t', text:'t eh k s t', the:'dh sch', this:'dh ih s', to:'t oo',
    voice:'v oy s', we:'w ee', welcome:'w eh l k sch m', what:'w uh t', with:'w ih th',
    you:'y oo', your:'y aw r'
  },
  de: {
    abend:'ah b sch n t', auf:'ow f', danke:'d ah ng k sch', den:'d eeh n', der:'d eer', die:'d ee',
    ein:'eye n', eine:'eye n sch', guten:'g oo t sch n', hallo:'h ah l ooe',
    hier:'h ier', ich:'ih ichch', ist:'ih s t', mutter:'m uu t ar',
    nicht:'n ih ichch t', schön:'sh oee n', sie:'z ee', spreche:'sh p germanr eh ichch sch',
    stimme:'sh t ih m sch', und:'uu n t', video:'v ee d eeh ooe', wiedersehen:'v ee d ar z eeh sch n', wir:'v ier'
  }
};
const speechDigits = {
  en:['z ee r oh','w uh n','t oo','th r ee','f aw r','f eye v','s ih k s','s eh v sch n','ay t','n eye n'],
  de:['n uu l','eye n s','t s v eye','d germanr eye','f ier','f yih n f','z eh k s','z ee b sch n','ah kh t','n euro n']
};

const englishPhones = {
  AA:'ah', AE:'ae', AH:'uh', AO:'aw', AW:'ow', AY:'eye', EH:'eh', ER:'er', EY:'ay',
  IH:'ih', IY:'ee', OW:'oh', OY:'oy', UH:'uu', UW:'oo',
  B:'b', CH:'ch', D:'d', DH:'dh', F:'f', G:'g', HH:'h', JH:'j', K:'k', L:'l', M:'m',
  N:'n', NG:'ng', P:'p', R:'r', S:'s', SH:'sh', T:'t', TH:'th', V:'v', W:'w', Y:'y', Z:'z', ZH:'zh'
};
const weakSpeechWords = {
  en:new Set('a an and as at but by for from in is it of on or that the to was were with you your'.split(' ')),
  de:new Set('am an auf das dem den der des die ein eine im in ist mit ob oder und von zu zum zur'.split(' '))
};
const spokenEnglishGlides = {
  ay:['eeh','ih'], eye:['ah','ih'], oh:['ooe','uu'], ow:['ah','uu'], oy:['aw','ih']
};
let englishLexicon = null;
let englishLexiconPromise;

function loadEnglishLexicon() {
  if (!englishLexiconPromise) {
    englishLexiconPromise = (async () => {
      if (typeof DecompressionStream !== 'function') return;
      const compressed = Uint8Array.from(atob($('englishPronunciations').textContent.trim()), byte => byte.charCodeAt(0));
      const text = await new Response(new Blob([compressed]).stream().pipeThrough(new DecompressionStream('gzip'))).text();
      englishLexicon = new Map(text.trimEnd().split('\n').map(line => {
        const space = line.indexOf(' ');
        return [line.slice(0,space),line.slice(space+1)];
      }));
    })().catch(() => {});
  }
  return englishLexiconPromise;
}

function wordPhones(word, language) {
  const token = word.toLowerCase().replaceAll('’',"'");
  const german = language === 'de';
  const dictionary = !german && englishLexicon?.get(token);
  if (dictionary) return dictionary.split(' ').map(phone => {
    const stress = Number(phone.at(-1)) || 0;
    const key = phone.replace(/[012]$/,'');
    return { sound:phone === 'AH0' ? 'sch' : englishPhones[key], stress };
  });

  const known = Object.hasOwn(speechWords[language],token) ? speechWords[language][token] : null;
  let phones;
  if (known) phones = known.split(' ');
  else if (/^\d+$/.test(token)) phones = Array.from(token, digit => speechDigits[language][digit]).join(' ').split(' ');
  else {
    const letters = token.match(german
      ? /tsch|sch|ch|pf|ng|nk|ei|ie|ai|au|eu|äu|qu|ph|ck|tz|ss|[aeiouäöü]h(?=[^a-zäöü]|$)|aa|ee|oo|\p{L}|\p{N}/gu
      : /tion|igh|sh|ch|th|ng|ph|ee|ea|oo|ou|ow|ai|ay|oy|oi|er|ir|ur|ck|qu|\p{L}|\p{N}/gu) ?? [];
    const pairs = german
      ? {tsch:'ch', pf:'p f', nk:'ng k', ie:'ee', äu:'euro', qu:'k v', ck:'k', tz:'t s', ss:'s',
        z:'t s', w:'v', v:'f', j:'y', r:'germanr'}
      : {tion:'sh sch n', igh:'eye', ee:'ee', ea:'ee', oo:'oo', ou:'ow', ow:'ow', ai:'ay', ay:'ay',
        oy:'oy', oi:'oy', er:'er', ir:'er', ur:'er', ck:'k', qu:'k w', ch:'ch', x:'k s', j:'j'};
    const shortVowels = {a:'ah',e:'eh',i:'ih',o:'aw',u:'uu',ä:'eh',ö:'oee',ü:'yih'};
    const longVowels = {a:'ah',e:'eeh',i:'ee',o:'ooe',u:'oo',ä:'eh',ö:'oee',ü:'yee'};
    phones = letters.flatMap((letter,i) => {
      const previous = letters[i-1] ?? '', next = letters[i+1] ?? '', following = letters[i+2] ?? '';
      if (letter === previous) return [];
      if (!german && letter === 'e' && !next && i >= 2) return [];
      if (!german && letter === 'c') return /^[eiy]/.test(next) ? ['s'] : ['k'];
      if (german) {
        if (letter === 'h' && /^[aeiouäöü]$/.test(previous)) return [];
        if (letter === 'r' && !next && previous === 'e' && i > 1) return [];
        if (letter === 'g' && !next && previous === 'i') return ['ichch'];
        if (letter === 'ch') return [/[aou](?:h)?$/.test(previous) ? 'kh' : 'ichch'];
        if (letter === 's' && i === 0 && /^[pt]/.test(next)) return ['sh'];
        if (letter === 's' && /^[aeiouäöü]/.test(next)) return ['z'];
        if (!next && /^[bdg]$/.test(letter)) return [{b:'p',d:'t',g:'k'}[letter]];
        if (letter === 'e' && i > 0 && (!next || /^[nmlr]$/.test(next) && !following)) return [next === 'r' ? 'ar' : 'sch'];
        if (Object.hasOwn(shortVowels,letter[0]) && (letter.length === 1 || /^[aeiouäöü]h$|^(aa|ee|oo)$/.test(letter))) {
          const open = letter.length > 1 || next === 'h' || !next || /^[aeiouäöü]/.test(following) && next.length === 1;
          return [(open ? longVowels : shortVowels)[letter[0]]];
        }
      }
      return (pairs[letter] ?? speechPhones[letter] ?? 'sch').split(' ');
    });
  }
  const stress = phones.findIndex((phone,i) => (has(vowels,phone) || has(diphthongs,phone)) &&
    phone !== 'sch' && !(german && i === 1 && /^(be|ge|ver|ent)/.test(token) && phones.length > 3));
  return phones.map((sound,i) => ({ sound, stress:Number(i === stress) }));
}

function speechUnits(text, language, rate = 1) {
  const lang = language.toLowerCase().startsWith('de') ? 'de' : 'en';
  const tokens = [...text.matchAll(/[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*|[^\s]/gu)];
  const units = [];
  let time = 0, phraseStart = 0;
  const add = (sound,char,duration,stress = 0) => {
    units.push({ char,start:time,end:time+duration,sound,stress });
    time += duration;
  };
  const closePhrase = punctuation => {
    const phrase = units.slice(phraseStart).filter(unit=>unit.sound);
    const first = phrase[0]?.start ?? time;
    const last = phrase.at(-1)?.end ?? time;
    const focus = (phrase.findLast(unit=>unit.stress > .4) ?? phrase.at(-1))?.start ?? time;
    phrase.forEach(unit => {
      const span = Math.max(.1,last-first);
      unit.phrasePosition = (unit.start-first)/span;
      unit.ending = clamp((unit.end-focus)/Math.max(.12,last-focus),0,1);
      unit.cadence = punctuation === '?' ? 'rise' : /[.!…]/u.test(punctuation) ? 'fall' : 'continue';
    });
    phraseStart = units.length;
  };
  for (let index=0;index<tokens.length;index++) {
    const token = tokens[index], word = token[0];
    if (!/^[\p{L}\p{N}]/u.test(word)) {
      if (/[.!?…,:;]/u.test(word)) {
        closePhrase(word);
        add(null,token.index,/[.!?…]/u.test(word) ? .30 : .16);
      }
      continue;
    }
    const weak = weakSpeechWords[lang].has(word.toLowerCase());
    const final = !tokens[index+1] || /[.!?…,:;]/u.test(tokens[index+1][0]);
    const phones = wordPhones(word,lang);
    const lastVowel = phones.findLastIndex(({sound}) => has(vowels,sound) || has(diphthongs,sound));
    for (const [i,phone] of phones.entries()) {
      let sound = phone.sound;
      const accent = weak ? 0 : phone.stress === 2 ? .62 : phone.stress;
      if (lang === 'en' && weak && sound === 'ae' && !final) sound = 'sch';
      const glide = (lang === 'en' && spokenEnglishGlides[sound]) || diphthongs[sound];
      const lengthen = final && i === lastVowel ? .045 : 0;
      if (glide) {
        add(glide[0],token.index,.080 + accent*.050 + lengthen*.68,accent);
        add(glide[1],token.index,.045 + lengthen*.32,accent*.34);
      } else if (has(vowels,sound)) {
        add(sound,token.index,(sound === 'sch' ? .055 : .088) + .050*accent + lengthen,accent);
      } else {
        const shape = soundShape(sound);
        add(sound,token.index,shape.stop ? .054 : shape.noise ? .077 : .065);
      }
    }
  }
  closePhrase('.');
  for (const unit of units) {
    unit.pitchTime = unit.start;
    unit.start /= rate;
    unit.end /= rate;
  }
  return units;
}

function builtInSpeechScore(units, model, language) {
  const base = [45,55,43,48,52][model];
  const duration = units.at(-1)?.end ?? 0;
  const pitch = unit => {
    const ending = unit.cadence === 'rise' ? 3.8*unit.ending : unit.cadence === 'fall' ? -2.4*unit.ending : -.65*unit.ending;
    return base + 1.35 - 1.65*unit.phrasePosition + 2.05*unit.stress + ending + .24*Math.sin((unit.pitchTime ?? unit.start)*11.7);
  };
  const events = units.flatMap((unit,i) => {
    if (!unit.sound) return [];
    const previous = units[i-1], next = units[i+1];
    const target = pitch(unit);
    const entry = previous?.sound ? mix(pitch(previous),target,.56) : target-.30;
    const exit = next?.sound ? mix(target,pitch(next),.56) : target-.40;
    const sustain = has(vowels,unit.sound);
    const note = { start:unit.start,end:unit.end,midi:target,referenceMidi:target,
      trajectory:[hzFor(entry),hzFor(target),hzFor(exit)], tied:Boolean(previous?.sound), tieNext:Boolean(next?.sound),
      level:sustain ? .88 + .30*unit.stress : .92, voice:'close', speechLanguage:language };
    return [{ ...unit,note,sustain }];
  });
  const targets = events.map(event=>articulationShape(event).f);
  events.forEach((event,i) => {
    const target = targets[i];
    const before = event.note.tied ? targets[i-1] : null;
    const after = event.note.tieNext ? targets[i+1] : null;
    if (event.sound === 'h' && after) event.breathCenter = mix(after[0],after[1],.44);
    if (!target) return;
    event.tractIn = before ? target.map((hz,j)=>mix(before[j],hz,.56)) : target;
    event.tractOut = after ? target.map((hz,j)=>mix(hz,after[j],.56)) : target;
  });
  return { bpm:118,duration,notes:events.map(event=>event.note),events };
}

function scheduleSpokenFormant(param,index,event,tuned,tract,fundamental,at,until,fraction) {
  const scale = value => index === 0 ? Math.max(fundamental*.96,value*tract) : value*tract;
  const points = [[0,scale(event.tractIn[index])],[.27,tuned],[.75,tuned],[1,scale(event.tractOut[index])]];
  const next = points.findIndex(([phase])=>phase>fraction);
  if (next < 1) return;
  const [a,low] = points[next-1], [b,high] = points[next];
  param.setValueAtTime(mix(low,high,(fraction-a)/(b-a)),at);
  for (const [phase,hz] of points.slice(next)) {
    param.linearRampToValueAtTime(hz,Math.min(until,at + (phase-fraction)*(event.end-event.start)));
  }
}
