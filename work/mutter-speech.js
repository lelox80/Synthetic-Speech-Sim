const speechEngine = window.speechSynthesis;
const speechForm = $('speechForm');
const speechText = $('speechText');
const speechHead = $('speechHead');
const speechVoice = $('speechVoice');
const speechRate = $('speechRate');
const speechStatus = $('speechStatus');
const builtInSpeech = [
  { name:'Simulated English', lang:'en-US', voiceURI:'stage-en', builtIn:true },
  { name:'Simulated German', lang:'de-DE', voiceURI:'stage-de', builtIn:true }
];
let speechVoices = [];
let speechRun = null;

function syncSpeechVoices() {
  const chosen = speechVoice.value;
  const native = window.SpeechSynthesisUtterance
    ? speechEngine?.getVoices().filter(voice => voice.localService) ?? [] : [];
  const local = window.AudioContext || window.webkitAudioContext ? builtInSpeech : [];
  speechVoices = [...native,...local];
  speechVoice.replaceChildren(...speechVoices.map(voice =>
    new Option(voice.name + ' · ' + voice.lang,voice.voiceURI)));
  const preferred = speechVoices.find(voice => voice.voiceURI === chosen)
    || local.find(voice => voice.lang.slice(0,2) === navigator.language.slice(0,2))
    || local[0]
    || speechVoices.find(voice => voice.default)
    || speechVoices.find(voice => voice.lang === navigator.language)
    || speechVoices[0];
  if (preferred) speechVoice.value = preferred.voiceURI;
  else speechVoice.add(new Option('No system voices available',''));
  speechVoice.disabled = !preferred;
  $('speechStart').disabled = !preferred;
  if (!speechRun) {
    setText(speechStatus, preferred ? '' : 'Speech is unavailable in this browser.');
  }
}

function syncSpeechCast() {
  const chosen = Number(speechHead.value);
  if (speechRun && figures[speechRun.index]?.model !== speechRun.model) stopSpeech();
  speechHead.replaceChildren(...figures.map((figure,index) =>
    new Option(cast[figure.model].name + (figures.length > 1 ? ' · ' + parts[index].name : ''),index)));
  speechHead.value = Math.min(chosen,figures.length-1);
}

function speechChunks(text) {
  const chunks = [];
  let remaining = text.trim();
  while (remaining.length > 240) {
    const sample = remaining.slice(0,240);
    const sentence = [...sample.matchAll(/[.!?…]\s|\n/gu)].at(-1);
    const space = sample.search(/\s\S*$/u);
    let cut = sentence?.index >= 65 ? sentence.index+1 : space >= 40 ? space : sample.length;
    if (/[\uD800-\uDBFF]/.test(remaining[cut-1])) cut--;
    chunks.push(remaining.slice(0,cut).trim());
    remaining = remaining.slice(cut).trimStart();
  }
  if (remaining) chunks.push(remaining);
  return chunks;
}

async function speakBuiltIn(run,text) {
  const Audio = window.AudioContext || window.webkitAudioContext;
  try {
    if (!engine) engine = new VoiceEngine(new Audio({latencyHint:'interactive'}));
    await engine.context.resume();
    if (run.voice.lang.startsWith('en')) await loadEnglishLexicon();
    if (speechRun !== run) return;
    run.units = speechUnits(text,run.voice.lang,run.rate);
    const spoken = builtInSpeechScore(run.units,run.model,run.voice.lang);
    if (!spoken.events.length) { speakNext(run); return; }
    run.playback = engine.start(spoken,0,{ ...settings, closure:.64, vibrato:0, tension:0, space:.07 },
      { tract:[.98,1.12,.93,1.01,1.06][run.model] });
    run.timer = setTimeout(() => {
      if (speechRun !== run) return;
      run.playback = null;
      run.spoken = null;
      speakNext(run);
    },(spoken.duration+.11)*1000);
    run.spoken = spoken;
    setText(speechStatus,cast[run.model].name + ' is speaking with simulated vocal folds.');
  } catch {
    finishSpeech(run,'The built-in voice could not start. Try a system voice.');
  }
}

function finishSpeech(run, message, cancel = false) {
  if (speechRun !== run) return;
  speechRun = null;
  clearTimeout(run.timer);
  if (cancel) {
    run.playback?.stop();
    if (run.utterance) speechEngine.cancel();
  }
  $('speechStop').disabled = true;
  setText(speechStatus,message);
}

function stopSpeech() {
  if (speechRun) finishSpeech(speechRun,'',true);
}

function speakNext(run) {
  if (speechRun !== run) return;
  const text = run.chunks[run.chunk++];
  if (!text) {
    finishSpeech(run,'Finished.');
    return;
  }
  if (run.voice.builtIn) {
    speakBuiltIn(run,text);
    return;
  }
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.voice = run.voice;
  utterance.lang = run.voice.lang;
  utterance.rate = run.rate;
  run.units = speechUnits(text,utterance.lang,run.rate);
  run.utterance = utterance;
  run.started = null;
  run.sync = 0;
  utterance.onstart = () => {
    if (speechRun !== run || run.utterance !== utterance) return;
    run.started = performance.now();
    setText(speechStatus,cast[run.model].name + ' is speaking.');
  };
  utterance.onboundary = event => {
    if (speechRun !== run || run.utterance !== utterance || event.name === 'sentence') return;
    const unit = run.units.find(unit => unit.char >= event.charIndex);
    if (!unit) return;
    run.started = performance.now();
    run.sync = unit.start;
  };
  utterance.onend = () => {
    if (run.utterance === utterance) speakNext(run);
  };
  const useFallback = () => {
    if (speechRun !== run || run.utterance !== utterance) return;
    const fallback = speechVoices.find(voice => voice.builtIn && voice.lang.slice(0,2) === run.voice.lang.slice(0,2));
    if (!fallback) {
      finishSpeech(run,'This system voice could not speak the text. Try another voice.');
      return;
    }
    run.voice = fallback;
    run.utterance = null;
    run.started = null;
    run.chunk--;
    speechVoice.value = fallback.voiceURI;
    speakNext(run);
  };
  utterance.onerror = useFallback;
  try {
    speechEngine.speak(utterance);
  } catch {
    useFallback();
  }
}

function speechPose(ms) {
  const run = speechRun;
  if (!run || !run.playback && run.started === null) return null;
  const seconds = run.playback ? engine.context.currentTime-run.playback.start
    : run.sync + Math.max(0,ms-run.started)/1000;
  if (seconds < 0) return null;
  const unit = run.units.find(entry => entry.end > seconds);
  const sound = unit ? unit.sound : !run.playback && Math.sin(seconds*19) > .2 ? 'sch' : null;
  const event = sound && run.spoken?.events.find(entry => entry.start <= seconds && entry.end > seconds);
  const fraction = event ? clamp((seconds-event.start)/(event.end-event.start),0,1) : 0;
  const shape = event ? articulationShape(event,fraction) : sound ? soundShape(sound) : null;
  const voiced = (shape?.voiced ?? (shape?.f ? 1 : 0)) > .1;
  return { index:run.index, sound, shape,
    hz:event && voiced ? Math.round(performancePitch(event.note,seconds-event.start)) : 0,
    drive:event ? phonationAt(event,fraction)[0] : .52 };
}

speechForm.addEventListener('submit', event => {
  event.preventDefault();
  const text = speechText.value.trim();
  if (!text) {
    speechText.focus();
    setText(speechStatus,'Enter some text first.');
    return;
  }
  const voice = speechVoices.find(voice => voice.voiceURI === speechVoice.value);
  const index = Number(speechHead.value);
  if (!voice || !figures[index]) return;
  stopSpeech();
  stop(true);
  if (mode && index !== 0) setView(0);
  if (spotlight !== null && spotlight !== index) setSpotlight(null);
  setWardCaption(null);
  setText(wardLyric,'');
  figures.forEach(figure => { figure.acting = null; figure.foreheadGlow = 0; });
  const run = { index, model:figures[index].model, voice, rate:clamp(speechRate.valueAsNumber || 1,.5,2),
    chunks:speechChunks(text), chunk:0, started:null };
  speechRun = run;
  $('speechStop').disabled = false;
  setText(speechStatus,'Starting speech…');
  speakNext(run);
});
$('speechStop').addEventListener('click',stopSpeech);
$('speechTab').addEventListener('click',syncSpeechVoices);
speechEngine?.addEventListener('voiceschanged',syncSpeechVoices);
syncSpeechVoices();
