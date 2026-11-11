const $ = id => document.getElementById(id);
const defaults = { closure: .48, tension: 0, breath: .29, vibrato: .48, space: .29 };
const settings = { ...defaults };
const voicePresets = {
  chamber: defaults,
  cathedral: { ...defaults, closure: .56, vibrato: .62, space: .83, breath: .21 },
  whisper: { ...defaults, closure: .12, vibrato: .21, space: .42, breath: .86 }
};
const parameters = [
  { key: 'closure', label: 'Fold closure', min: 0, max: 1, step: .01, help: 'Shape of the air pulse as the folds close' },
  { key: 'tension', label: 'Pitch shift', min: -5, max: 5, step: .5, help: 'Pitch in semitones relative to the written score' },
  { key: 'breath', label: 'Breath', min: 0, max: 1, step: .01, help: 'Air noise leaking around the vocal folds' },
  { key: 'vibrato', label: 'Vibrato', min: 0, max: 1, step: .01, help: 'Depth of the pitch oscillation' },
  { key: 'space', label: 'Room echo', min: 0, max: 1, step: .01, help: 'Amount of reverberation around the voice' }
];
const timeText = seconds => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
const totalText = seconds => timeText(Math.ceil(seconds));
const setText = (element, value) => { if (element.textContent !== value) element.textContent = value; };
const fillRange = input => input.style.setProperty('--fill', `${100 * (Number(input.value) - Number(input.min)) / (Number(input.max) - Number(input.min))}%`);

const storageKey = 'vesper-custom-score-v1';
const builtinCount = songs.length;
try {
  const saved = JSON.parse(localStorage.getItem(storageKey));
  if (saved) songs.push({ ...parseScore(saved.title, saved.bpm, saved.source), group: 'Custom' });
} catch { /* Local storage can be disabled for files. */ }

let selected = 0;
let offset = 0;
let active = null;
let engine = null;
let starting = false;
let seekContinues = false;
let operation = 0;
let audioError = false;
let headCount = 3;
let parts = [];
let figures = [];
let spotlight = null;
const mutedSingers = new Set();
const castKey = 'vesper-04-cast';
const castState = { models: cast.map((_,index) => index), gear: cast.map(() => true), internals: false };
try {
  const saved = JSON.parse(localStorage.getItem(castKey));
  if (saved) {
    castState.models = castState.models.map((model,index) => Number.isInteger(saved.models?.[index]) && cast[saved.models[index]] ? saved.models[index] : model);
    castState.gear = castState.gear.map((gear,index) => typeof saved.gear?.[index] === 'boolean' ? saved.gear[index] : gear);
    castState.internals = saved.internals === true;
  }
} catch { /* File storage can be disabled. */ }

function saveCast() {
  try { localStorage.setItem(castKey,JSON.stringify(castState)); }
  catch { /* The choices remain active in this window. */ }
}

const score = () => songs[selected];
const performanceDuration = () => parts.at(-1)?.score.duration ?? score().duration;
const position = () => active ? clamp(offset + Math.max(0, engine.context.currentTime - active.start), 0, performanceDuration()) : offset;

function updateTransport() {
  const busy = starting || Boolean(active);
  $('play').disabled = starting;
  setText($('playLabel'), active ? 'Pause' : starting ? 'Starting' : offset && offset < performanceDuration() ? 'Resume' : 'Sing');
  $('playIcon').setAttribute('d', active ? 'M7 5h4v14H7zm6 0h4v14h-4z' : 'M9 5v14l11-7z');
  const liveLabel = headCount > 1 ? `CHOIR ACTIVE / ${headCount}` : 'VOICE ACTIVE';
  setText($('status'), audioError ? 'AUDIO UNAVAILABLE' : active ? liveLabel : busy ? 'OPENING AUDIO' : 'STANDING BY');
  $('status').parentElement.classList.toggle('live', Boolean(active));
}

function stop(keepPosition) {
  if (keepPosition) offset = position();
  operation++;
  if (active) active.stop();
  active = null;
  starting = false;
  updateTransport();
}

async function play() {
  if (active || starting) return;
  if (offset >= performanceDuration() - .015) offset = 0;
  const currentOperation = ++operation;
  starting = true;
  audioError = false;
  updateTransport();
  try {
    if (!engine) {
      const Audio = window.AudioContext || window.webkitAudioContext;
      if (!Audio) throw new Error('Web Audio is unavailable.');
      engine = new VoiceEngine(new Audio({ latencyHint: 'interactive' }));
    }
    await engine.context.resume();
    if (currentOperation !== operation) return;
    active = startChoir(engine, parts, offset, settings);
  } catch (error) {
    if (currentOperation !== operation) return;
    audioError = true;
    console.error(error);
  } finally {
    if (currentOperation === operation) {
      starting = false;
      updateTransport();
    }
  }
}

function selectSong(index) {
  stop(false);
  selected = index;
  offset = 0;
  seekContinues = false;
  $('nowPlaying').textContent = score().title;
  $('nowPlaying').title = score().title;
  $('scoreMeta').textContent = [score().keyName, `${score().bpm} BPM`].filter(Boolean).join(' / ');
  $('songs').querySelectorAll('.song').forEach(button => button.setAttribute('aria-pressed', Number(button.dataset.index) === selected));
  refreshChoir();
  updateTransport();
}

function positionLabels() {
  const seats = formation(spotlight === null ? headCount : 1, headCanvas.clientWidth / Math.max(1, headCanvas.clientHeight));
  Array.from($('singerLabels').children).forEach((label, index) => {
    label.hidden = spotlight !== null && spotlight !== index;
    if (label.hidden) return;
    const [x,y,scale] = seats[spotlight === null ? index : 0];
    label.style.left = `${50 * (1 + x)}%`;
    label.style.top = `${50 * (1 - y + (spotlight === null ? .88 : .81) * scale)}%`;
  });
  positionCallouts();
}

function refreshChoir() {
  parts = choirArrangement(score(), headCount, $('choirMode').value);
  parts.forEach((part,index) => { part.muted = mutedSingers.has(index); });
  $('seek').max = performanceDuration().toFixed(3);
  figures = parts.map((part, index) => figures[index] || {
    jaw: .013, round: .1, energy: 0, hz: 0, nasal: 0, air: false, tongueHeight: 0, tongueFront: 0
  });
  setText($('headCount'), `${headCount} of ${choirVoices.length} heads`);
  $('addHead').disabled = headCount >= choirVoices.length;
  $('removeHead').disabled = headCount <= 1;
  $('stage').classList.toggle('has-choir', headCount > 1);
  syncCast();
  if (spotlight !== null && (spotlight >= headCount || headCount <= 1)) setSpotlight(null);
  showCastRows();
}

function syncCast() {
  parts.forEach((part,index) => {
    const model = castState.models[index];
    const portrait = cast[model];
    part.color = portrait.tint;
    Object.assign(figures[index], { model, tint: rgb(portrait.tint), accent: rgb(portrait.accent), accessories: castState.gear[index], internals: castState.internals });
  });
  $('singerLabels').replaceChildren(...(headCount > 1 ? parts.map((part,index) => {
    const portrait = cast[castState.models[index]];
    const label = document.createElement('button');
    const name = document.createElement('b');
    const role = document.createElement('small');
    label.type = 'button';
    label.style.setProperty('--part', part.color);
    name.textContent = portrait.name.toUpperCase();
    role.textContent = part.name.toUpperCase();
    label.append(name,role);
    const mark = () => {
      label.setAttribute('aria-pressed',part.muted);
      label.setAttribute('aria-label',`Mute ${portrait.name}, ${part.name}`);
      label.title = `${part.muted ? 'Unmute' : 'Mute'} ${portrait.name} (${part.name})`;
    };
    label.addEventListener('click', () => {
      part.muted = !part.muted;
      if (part.muted) mutedSingers.add(index);
      else mutedSingers.delete(index);
      active?.setMuted(index,part.muted);
      mark();
    });
    mark();
    return label;
  }) : []));
  positionLabels();
  if (!mode) setText($('fieldCaption'), ensembleCaption());
  drawNotation();
}

function showCastRows() {
  $('castRows').replaceChildren(...parts.map((part,index) => {
    const row = document.createElement('div');
    const role = document.createElement('span');
    const select = document.createElement('select');
    const label = document.createElement('label');
    const gear = document.createElement('input');
    const focus = document.createElement('button');
    const detail = document.createElement('small');
    row.className = 'cast-row';
    role.className = 'cast-part';
    role.textContent = `${String(index + 1).padStart(2,'0')} / ${part.name}`;
    select.setAttribute('aria-label',`Portrait for ${part.name}`);
    cast.forEach((portrait,i) => select.add(new Option(portrait.name,i)));
    select.value = castState.models[index];
    gear.type = 'checkbox';
    gear.checked = castState.gear[index];
    label.className = 'gear-control';
    label.append(gear,document.createTextNode('Gear'));
    focus.type = 'button';
    focus.className = 'portrait-focus';
    focus.textContent = spotlight === index ? 'Show all' : 'Focus';
    focus.setAttribute('aria-label',`Focus portrait for ${part.name}`);
    focus.setAttribute('aria-pressed',spotlight === index);
    focus.disabled = headCount === 1;
    focus.addEventListener('click',() => setSpotlight(spotlight === index ? null : index));
    const describe = () => {
      const portrait = cast[castState.models[index]];
      row.style.setProperty('--portrait',portrait.tint);
      gear.setAttribute('aria-label',`Show ${portrait.name}'s ${portrait.gear.toLowerCase()}`);
      detail.textContent = `${portrait.title} · ${portrait.gear}`;
    };
    select.addEventListener('change', () => {
      castState.models[index] = Number(select.value);
      syncCast();
      describe();
      saveCast();
    });
    gear.addEventListener('change', () => {
      castState.gear[index] = gear.checked;
      figures[index].accessories = gear.checked;
      saveCast();
    });
    describe();
    row.append(role,select,label,focus,detail);
    return row;
  }));
}
$('showInternals').checked = castState.internals;
$('showInternals').addEventListener('change', event => {
  castState.internals = event.target.checked;
  figures.forEach(figure => { figure.internals = castState.internals; });
  saveCast();
});

function setSpotlight(index) {
  spotlight = index;
  stage.classList.toggle('is-spotlight', index !== null);
  $('castRows').querySelectorAll('.portrait-focus').forEach((button,i) => {
    button.setAttribute('aria-pressed',i === index);
    button.textContent = i === index ? 'Show all' : 'Focus';
  });
  positionLabels();
  if (!mode) setText($('fieldCaption'),ensembleCaption());
}

function changeChoir(count) {
  const restart = Boolean(active) || starting;
  if (restart) stop(true);
  headCount = clamp(count, 1, choirVoices.length);
  mutedSingers.forEach(index => { if (index >= headCount || headCount === 1) mutedSingers.delete(index); });
  refreshChoir();
  const canResume = offset < performanceDuration() - .015;
  offset = Math.min(offset, performanceDuration());
  updateTransport();
  if (restart && canResume) play();
}
$('addHead').addEventListener('click', () => changeChoir(headCount + 1));
$('removeHead').addEventListener('click', () => changeChoir(headCount - 1));
$('choirMode').addEventListener('change', () => changeChoir(headCount));

function showSongs() {
  const filter = $('songFilter').value;
  const rows = songs.flatMap((song, i) => {
    if (filter !== 'all' && filter !== song.group) return [];
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'song';
    button.dataset.index = i;
    button.setAttribute('aria-pressed', selected === i);
    const index = document.createElement('span');
    index.textContent = String(i + 1).padStart(2, '0');
    const details = document.createElement('span');
    const title = document.createElement('b');
    const description = document.createElement('small');
    title.textContent = song.title;
    description.textContent = song.description;
    details.append(title, description);
    const duration = document.createElement('span');
    duration.textContent = totalText(song.duration);
    button.append(index, details, duration);
    button.addEventListener('click', () => selectSong(i));
    return [button];
  });
  $('songs').replaceChildren(...rows);
  if (!rows.length) {
    const message = document.createElement('p');
    message.className = 'empty-library';
    message.textContent = 'Load a score in the editor to add it here.';
    $('songs').append(message);
  }
  setText($('songCount'), `${rows.length} ${rows.length === 1 ? 'PIECE' : 'PIECES'}`);
}
$('songFilter').addEventListener('change', showSongs);

function updateKnob(key, value) {
  const input = $(`control-${key}`);
  const output = $(`read-${key}`);
  input.value = value;
  output.value = key === 'tension' ? `${value > 0 ? '+' : ''}${value.toFixed(1)} st` : `${Math.round(value * 100)}%`;
  fillRange(input);
}
for (const parameter of parameters) {
  const { key, label, min, max, step, help } = parameter;
  const row = document.createElement('div');
  row.className = 'knob';
  row.title = help;
  row.innerHTML = `<label for="control-${key}">${label}<output id="read-${key}" for="control-${key}"></output></label><input id="control-${key}" type="range" min="${min}" max="${max}" step="${step}">`;
  $('controls').append(row);
  updateKnob(key, settings[key]);
  $(`control-${key}`).addEventListener('input', event => {
    settings[key] = Number(event.target.value);
    updateKnob(key, settings[key]);
    setPresetMarker('');
    if (active) active.adjust(settings);
  });
}
function setPresetMarker(name) {
  $('voicePresets').querySelectorAll('button').forEach(button => button.setAttribute('aria-pressed', button.dataset.preset === name));
}
function setVoicePreset(name) {
  Object.assign(settings, voicePresets[name]);
  parameters.forEach(({ key }) => updateKnob(key, settings[key]));
  if (active) active.adjust(settings);
  setPresetMarker(name);
}
$('voicePresets').querySelectorAll('button').forEach(button => button.addEventListener('click', () => setVoicePreset(button.dataset.preset)));
$('reset').addEventListener('click', () => setVoicePreset('chamber'));
setPresetMarker('chamber');

const togglePlayback = () => active ? stop(true) : play();
$('play').addEventListener('click', togglePlayback);
$('rewind').addEventListener('click', () => {
  const restart = Boolean(active) || starting;
  stop(false);
  offset = 0;
  updateTransport();
  if (restart) play();
});
$('seek').addEventListener('input', event => {
  seekContinues ||= Boolean(active) || starting;
  stop(false);
  offset = Number(event.target.value);
  fillRange(event.target);
  updateTransport();
});
const finishSeek = () => {
  if (seekContinues) play();
  seekContinues = false;
};
$('seek').addEventListener('change', finishSeek);
$('seek').addEventListener('pointercancel', finishSeek);
document.addEventListener('keydown', event => {
  if (event.code === 'Space' && !event.repeat && event.target === document.body && !$('editor').open) {
    event.preventDefault();
    togglePlayback();
  }
});

$('edit').addEventListener('click', () => {
  $('scoreName').value = selected >= builtinCount ? score().title : `${score().title} (edit)`;
  $('scoreTempo').value = score().bpm;
  $('scoreText').value = score().source;
  $('scoreError').hidden = true;
  $('editor').showModal();
});
for (const id of ['closeEditor', 'cancelEditor']) $(id).addEventListener('click', () => $('editor').close());
const scoreFromEditor = () => parseScore($('scoreName').value, Number($('scoreTempo').value), $('scoreText').value);
const scoreFileData = ({ title, bpm, source }) => ({ title, bpm, source });
function showScoreError(error) {
  $('scoreError').textContent = error.message;
  $('scoreError').hidden = false;
}
function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
const filenameFor = title => title.replace(/[<>:"/\\|?*]/g, '-');
$('downloadScore').addEventListener('click', () => {
  try {
    const draft = scoreFromEditor();
    downloadBlob(new Blob([JSON.stringify(scoreFileData(draft), null, 2)], { type: 'application/json' }), `${filenameFor(draft.title)}.vesper`);
    $('scoreError').hidden = true;
  } catch (error) { showScoreError(error); }
});
$('importScore').addEventListener('click', () => $('scoreFile').click());
$('scoreFile').addEventListener('change', async event => {
  const file = event.target.files[0];
  event.target.value = '';
  if (!file) return;
  try {
    if (file.size > 100000) throw new Error('This score file is too large.');
    const data = JSON.parse(await file.text());
    if (typeof data?.title !== 'string' || typeof data.source !== 'string') throw new Error('This file is missing a score title or notes.');
    const draft = parseScore(data.title, data.bpm, data.source);
    $('scoreName').value = draft.title;
    $('scoreTempo').value = draft.bpm;
    $('scoreText').value = draft.source;
    $('scoreError').hidden = true;
  } catch (error) { showScoreError(error); }
});
$('scoreForm').addEventListener('submit', event => {
  event.preventDefault();
  try {
    const custom = { ...scoreFromEditor(), group: 'Custom' };
    songs[builtinCount] = custom;
    try { localStorage.setItem(storageKey, JSON.stringify(scoreFileData(custom))); }
    catch { /* The custom score remains usable for this session. */ }
    $('songFilter').value = 'Custom';
    showSongs();
    selectSong(builtinCount);
    $('editor').close();
  } catch (error) {
    showScoreError(error);
  }
});
$('phonemeGuide').textContent = `Vowels: ${Object.entries(vowels).map(([name, shape]) => `${name} (${shape.example})`).concat(Object.entries(diphthongs).map(([name, [, , example]]) => `${name} (${example})`)).join(', ')}. Consonants: ${Object.keys(consonants).join(', ')}. Use th for “thin” and dh for “then.”`;

const headCanvas = $('head');
const stage = $('stage');
const views = [
  { id: 'ensembleView', name: 'ensemble', title: 'PROJECTION FIELD', caption: 'Select a singer’s label to mute them', yaw: .33, pitch: -.025 },
  { id: 'cutaway', name: 'section', title: 'SAGITTAL SECTION', caption: 'Lead singer · near side cut away', yaw: 1.21, pitch: -.07 },
  { id: 'larynxView', name: 'glottis', title: 'LARYNGEAL STUDY', caption: 'Superior view · front below', yaw: .14, pitch: 1.31 }
];
const overlay = $('anatomyOverlay');
const svg = tag => document.createElementNS('http://www.w3.org/2000/svg',tag);
const calloutElements = anatomyCallouts.map(list => list.map(callout => {
  const group = svg('g'), trace = svg('polyline'), dot = svg('circle'), label = svg('text');
  label.textContent = callout.name;
  group.style.setProperty('--callout',structures[callout.structure].color);
  dot.setAttribute('r','2');
  group.append(trace,dot,label);
  return { ...callout, group, trace, dot, label };
}));
let mode = 0;
let highlighted = -1;
let mask = 0;
let yaw = views[0].yaw;
let pitch = views[0].pitch;
const panelTabs = ['repertoire','cast','voice','anatomy'];
const ensembleCaption = () => {
  if (spotlight !== null) {
    const model = cast[castState.models[spotlight]];
    return `${model.name} · ${model.title}`;
  }
  return headCount > 1 ? views[0].caption : `${cast[castState.models[0]].name} · solo wireframe performance`;
};
function showPanel(panel) {
  panelTabs.forEach(tab => {
    $(`${tab}Tab`).setAttribute('aria-pressed', tab === panel);
    $(`${tab}Panel`).hidden = tab !== panel;
  });
}
panelTabs.forEach(tab => $(`${tab}Tab`).addEventListener('click', () => {
  if (tab === 'cast' && mode) setView(0);
  showPanel(tab);
}));

function positionCallouts() {
  if (!mode) return;
  const width = headCanvas.clientWidth, height = headCanvas.clientHeight;
  if (!width || !height) return;
  overlay.setAttribute('viewBox',`0 0 ${width} ${height}`);
  calloutElements[mode].forEach(({ group, trace, dot, label, structure, point, side, row }) => {
    const chosen = highlighted === structure;
    const compact = width < 515;
    group.style.display = compact && !chosen ? 'none' : '';
    if (compact && !chosen) return;
    group.classList.toggle('dim', highlighted >= 0 && !chosen);
    group.classList.toggle('chosen', chosen);
    const [x,y] = studyPoint(point,mode,yaw,pitch,width,height);
    const tx = width * (side < 0 ? (compact ? .045 : .09) : (compact ? .69 : .75));
    const elbow = width * (side < 0 ? .325 : .687);
    const ty = height * row;
    const end = side < 0 ? Math.min(elbow, tx + label.textContent.length * 6.45) : tx - 7;
    trace.setAttribute('points',`${x},${y} ${elbow},${ty} ${end},${ty}`);
    dot.setAttribute('cx',x); dot.setAttribute('cy',y);
    label.setAttribute('x',tx); label.setAttribute('y',ty + 4);
  });
}

function updateHighlight(index) {
  highlighted = index;
  const structure = structures[index];
  mask = structure ? structure.kinds.reduce((bits, kind) => bits | (1 << kind), 0) : 0;
  $('structures').querySelectorAll('button').forEach((button, i) => button.setAttribute('aria-pressed', i === index));
  setText($('structureDetail'), structure ? structure.detail : 'Select a structure to isolate it. The model follows the lead singer’s phonemes during playback.');
  setText($('fieldCaption'), structure?.name || (mode ? views[mode].caption : ensembleCaption()));
  positionCallouts();
}
function setView(next) {
  mode = next;
  if (spotlight !== null) setSpotlight(null);
  const view = views[next];
  yaw = view.yaw;
  pitch = view.pitch;
  stage.dataset.view = view.name;
  $('singerLabels').hidden = next !== 0;
  $('fieldIndex').textContent = `0${next + 1}`;
  $('fieldName').textContent = view.title;
  overlay.replaceChildren(...calloutElements[next].map(({ group }) => group));
  views.forEach(({ id }, index) => $(id).setAttribute('aria-pressed', index === next));
  if (next) showPanel('anatomy');
  else if (!$('anatomyPanel').hidden) showPanel('repertoire');
  updateHighlight(-1);
}
views.forEach(({ id }, index) => $(id).addEventListener('click', () => setView(index)));
structures.forEach((structure, index) => {
  const button = document.createElement('button');
  const marker = document.createElement('i');
  marker.setAttribute('aria-hidden', 'true');
  button.className = 'structure';
  button.type = 'button';
  button.setAttribute('aria-pressed', 'false');
  button.style.setProperty('--anatomy', structure.color);
  button.append(marker, document.createTextNode(structure.name));
  button.addEventListener('click', () => {
    if (!projection) return;
    if (highlighted === index) { updateHighlight(-1); return; }
    const laryngeal = structure.kinds.some(kind => [4,7,10,11,12].includes(kind));
    if (!mode || mode === 2 && !laryngeal) setView(1);
    updateHighlight(index);
  });
  $('structures').append(button);
});

new ResizeObserver(positionLabels).observe(headCanvas);
let projection;
try { projection = createProjection(headCanvas); }
catch (error) {
  console.warn(error.message);
  $('stageError').hidden = false;
  $('dragHint').hidden = true;
  views.slice(1).forEach(({ id }) => { $(id).disabled = true; });
}
headCanvas.addEventListener('webglcontextlost', event => {
  event.preventDefault();
  projection?.dispose();
  projection = null;
  $('stageError').hidden = false;
  views.slice(1).forEach(({ id }) => { $(id).disabled = true; });
});
headCanvas.addEventListener('webglcontextrestored', () => {
  try {
    projection = createProjection(headCanvas);
    $('stageError').hidden = true;
    views.slice(1).forEach(({ id }) => { $(id).disabled = false; });
  } catch (error) { console.warn(error.message); }
});
let drag = null;
headCanvas.addEventListener('pointerdown', event => {
  if (!event.isPrimary || event.button !== 0) return;
  headCanvas.setPointerCapture(event.pointerId);
  drag = { x: event.clientX, y: event.clientY, yaw, pitch };
});
headCanvas.addEventListener('pointermove', event => {
  if (!drag || !event.isPrimary) return;
  yaw = clamp(drag.yaw + (event.clientX - drag.x) * .008, -1.55, 1.55);
  pitch = clamp(drag.pitch + (event.clientY - drag.y) * .006, mode === 2 ? .68 : -.39, mode === 2 ? 1.57 : .38);
  positionCallouts();
});
headCanvas.addEventListener('lostpointercapture', () => { drag = null; });
headCanvas.addEventListener('dblclick', () => { yaw = views[mode].yaw; pitch = views[mode].pitch; positionCallouts(); });
function setProjectionLabel() {
  const label = document.fullscreenElement || stage.classList.contains('expanded') ? 'Exit fullscreen' : 'Fullscreen projection';
  $('expand').setAttribute('aria-label', label);
  $('expand').title = label;
}
function expandInWindow(open) {
  stage.classList.toggle('expanded', open);
  document.body.classList.toggle('projection-open', open);
  setProjectionLabel();
}
$('expand').addEventListener('click', async () => {
  if (stage.classList.contains('expanded')) expandInWindow(false);
  else if (document.fullscreenElement) await document.exitFullscreen();
  else if (document.fullscreenEnabled) {
    try { await stage.requestFullscreen(); }
    catch { expandInWindow(true); }
  } else expandInWindow(true);
});
document.addEventListener('fullscreenchange', setProjectionLabel);
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && stage.classList.contains('expanded')) expandInWindow(false);
});

const pulse = $('pulse');
const scope = pulse.getContext('2d');
function resizePulse() {
  const ratio = Math.min(devicePixelRatio || 1, 2);
  pulse.width = Math.round(pulse.clientWidth * ratio);
  pulse.height = Math.round(pulse.clientHeight * ratio);
  scope.setTransform(ratio, 0, 0, ratio, 0, 0);
}
new ResizeObserver(resizePulse).observe(pulse);
resizePulse();
const foldOutlines = [-1, 1].map(foldVertices);
function drawPulse(time, figure) {
  const w = pulse.clientWidth, h = pulse.clientHeight;
  const split = Math.round(w * .34);
  const energy = figure.energy;
  scope.clearRect(0, 0, w, h);
  scope.strokeStyle = '#183329';
  scope.beginPath();
  for (let i = 0; i < 8; i++) {
    const x = split + (w - split) * i / 8 + .5;
    scope.moveTo(x, 0); scope.lineTo(x, h);
  }
  for (let i = 1; i < 4; i++) { scope.moveTo(split, h * i / 4); scope.lineTo(w, h * i / 4); }
  scope.stroke();
  scope.font = '8px monospace';
  scope.textAlign = 'center';
  scope.fillStyle = '#9eaa9e';
  scope.fillText('FOLDS / TOP', split / 2, 12);
  const modelScale = Math.min(split * 2.50, (h - 17) * 2.7);
  const centerY = (h + 17) / 2;
  scope.strokeStyle = '#295464';
  scope.beginPath();
  scope.ellipse(split / 2, centerY, modelScale * .18, modelScale * .17, 0, 0, TAU);
  scope.stroke();
  scope.strokeStyle = energy > .12 ? '#ff987c' : '#b46d62';
  scope.fillStyle = energy > .12 ? '#ff927044' : '#c7774d30';
  for (const outline of foldOutlines) {
    scope.beginPath();
    outline.forEach(([x, ,z, flex = 4], index) => {
      const px = split / 2 + (x + (flex - 4) * figure.foldGap) * modelScale;
      const py = centerY - (z - .025) * modelScale;
      if (index) scope.lineTo(px, py);
      else scope.moveTo(px, py);
    });
    scope.closePath();
    scope.fill();
    scope.stroke();
  }
  scope.strokeStyle = energy > .12 ? '#91f6ca' : '#426957';
  scope.lineWidth = 1.4;
  scope.beginPath();
  for (let x = split; x <= w; x++) {
    const phase = ((x - split) / Math.max(w - split, 1) * 3.75 + time * .92) % 1;
    const airflow = mix(glottalFlow(phase, 0), glottalFlow(phase, 1), settings.closure);
    const y = h * (.73 - airflow * energy * .58);
    if (x === split) scope.moveTo(x, y);
    else scope.lineTo(x, y);
  }
  scope.stroke();
  scope.lineWidth = 1;
}

const notation = $('notation');
const scoreInk = notation.getContext('2d');
function drawNotation() {
  if (!parts.length) return;
  const ratio = Math.min(devicePixelRatio || 1, 2);
  const width = notation.clientWidth, height = notation.clientHeight;
  notation.width = Math.max(1, Math.round(width * ratio));
  notation.height = Math.max(1, Math.round(height * ratio));
  scoreInk.setTransform(ratio,0,0,ratio,0,0);
  const total = performanceDuration();
  const used = parts.flatMap(part => part.score.notes.filter(note => note.midi !== null).map(note => note.midi));
  const bottom = Math.min(...used) - 2, top = Math.max(...used) + 2;
  scoreInk.strokeStyle = '#203937';
  scoreInk.beginPath();
  for (let i = 1; i < 8; i++) { const x = width * i / 8; scoreInk.moveTo(x,0); scoreInk.lineTo(x,height); }
  for (let i = 1; i < 4; i++) { const y = height * i / 4; scoreInk.moveTo(0,y); scoreInk.lineTo(width,y); }
  scoreInk.stroke();
  [...parts].reverse().forEach(part => {
    scoreInk.globalAlpha = part === parts[0] ? .95 : .55;
    scoreInk.fillStyle = part.color;
    part.score.notes.forEach(note => {
      if (note.midi === null) return;
      const x = width * note.start / total;
      const y = (top - note.midi) / (top - bottom) * height;
      const spread = part === parts[0] ? 2.6 : 1.8;
      scoreInk.fillRect(x,y - spread / 2,Math.max(1,width * (note.end - note.start) / total - .6),spread);
    });
  });
  scoreInk.globalAlpha = 1;
}
new ResizeObserver(drawNotation).observe(notation);

function waveFile(buffer) {
  const rate = buffer.sampleRate, channels = buffer.numberOfChannels, frames = buffer.length;
  const wave = new DataView(new ArrayBuffer(44 + frames * channels * 2));
  const ascii = (start, label) => [...label].forEach((char,index) => wave.setUint8(start + index,char.charCodeAt(0)));
  const u32 = (i,v) => wave.setUint32(i,v,true);
  const u16 = (i,v) => wave.setUint16(i,v,true);
  ascii(0,'RIFF'); u32(4,wave.byteLength - 8); ascii(8,'WAVE');
  ascii(12,'fmt '); u32(16,16); u16(20,1); u16(22,channels);
  u32(24,rate); u32(28,rate * channels * 2); u16(32,channels * 2); u16(34,16);
  ascii(36,'data'); u32(40,wave.byteLength - 44);
  for (let channel = 0; channel < channels; channel++) {
    const samples = buffer.getChannelData(channel);
    for (let i = 0; i < frames; i++) {
      wave.setInt16(44 + (i * channels + channel) * 2,Math.round(clamp(samples[i],-1,1) * 32767),true);
    }
  }
  return new Blob([wave.buffer],{ type: 'audio/wav' });
}
async function renderPerformance(arrangement, controls, rate = 44100) {
  const OfflineAudio = window.OfflineAudioContext || window.webkitOfflineAudioContext;
  const length = Math.ceil((arrangement.at(-1).score.duration + 1.85) * rate);
  const context = new OfflineAudio(2,length,rate);
  startChoir(new VoiceEngine(context),arrangement,0,controls);
  return context.startRendering();
}
$('exportAudio').addEventListener('click', async () => {
  const button = $('exportAudio');
  const name = filenameFor(score().title);
  const voices = headCount;
  button.disabled = true;
  setText($('exportStatus'), 'RENDERING WAV…');
  try {
    const result = await renderPerformance(parts, { ...settings });
    downloadBlob(waveFile(result), `${name} - Vesper ${voices === 1 ? 'Solo' : 'Choir'}.wav`);
    setText($('exportStatus'), 'WAV READY');
  } catch (error) {
    console.error(error);
    setText($('exportStatus'), 'WAV EXPORT FAILED');
  } finally {
    button.disabled = false;
  }
});

const nasalSounds = new Set(['m','n','ng']);
const tipSounds = new Set(['t','d','n','l','th','dh','s','z']);
const backSounds = new Set(['k','g','ng']);
function tonguePose(shape, sound) {
  if (!shape) return [0,0];
  if (tipSounds.has(sound)) return [.143,.038];
  if (backSounds.has(sound)) return [.089,-.108];
  const f = shape.f || vowels.sch.f;
  return [clamp((535 - f[0]) / 2500,-.083,.121),clamp((f[1] - 1420) / 8100,-.100,.108)];
}

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
let previousFrame = 0;
function frame(ms) {
  const time = ms / 1000;
  const dt = clamp((ms - previousFrame) / 1000, 0, .1);
  previousFrame = ms;
  const t = position();
  const duration = performanceDuration();
  if (active && t >= duration - .001) {
    // The scheduled source and its room tail finish on the audio clock.
    active = null;
    offset = duration;
    updateTransport();
  }
  const live = active && engine.context.currentTime >= active.start;
  const speed = 1 - Math.exp(-dt * 22);
  const drift = reducedMotion.matches ? 0 : time;
  let leadEvent = null;
  let lyricNote = null;
  figures.forEach((figure, index) => {
    const part = parts[index];
    const elapsed = t - part.delay;
    const event = live ? part.score.events.find(sound => sound.start <= elapsed && sound.end > elapsed) : null;
    if (!index) leadEvent = event;
    if (!lyricNote && event) lyricNote = event.note;
    const shape = event ? soundShape(event.sound) : null;
    const voice = shape ? (shape.voiced ?? (shape.f ? 1 : 0)) : 0;
    figure.jaw = mix(figure.jaw, shape?.open ?? .013, speed);
    figure.round = mix(figure.round, shape?.round ?? .10, speed);
    figure.energy = mix(figure.energy, voice * (.88 + .10 * Math.sin(drift * 19 + index)), speed);
    figure.hz = voice > .1 ? Math.round(hzFor(event.note.midi + settings.tension)) : 0;
    figure.nasal = mix(figure.nasal, Number(nasalSounds.has(event?.sound)), speed);
    figure.air = Boolean(shape?.noise);
    figure.muted = part.muted;
    figure.foldGap = glottalGap(drift, figure, settings.closure);
    const [tongueHeight,tongueFront] = tonguePose(shape,event?.sound);
    figure.tongueHeight = mix(figure.tongueHeight,tongueHeight,speed);
    figure.tongueFront = mix(figure.tongueFront,tongueFront,speed);
    $('singerLabels').children[index]?.classList.toggle('voiced',Boolean(voice > .1 && !part.muted));
  });
  if (projection) projection(drift, yaw + (mode ? 0 : .055 * Math.sin(drift * .77)), pitch + (mode ? 0 : .018 * Math.sin(drift * 1.3)), figures, mode, mask, spotlight);
  const hz = figures[0].hz;
  drawPulse(drift, figures[0]);
  setText($('stagePitch'), hz ? `${leadEvent.note.pitch} / ${hz} Hz` : '—');
  setText($('monitorHz'), hz ? `${hz} Hz` : '— Hz');
  setText($('monitorState'), hz ? 'FOLDS VIBRATING' : leadEvent ? 'AIR ONLY' : 'FOLDS AT REST');
  setText($('monitorVowel'), leadEvent ? (soundShape(leadEvent.sound).name || leadEvent.sound.toUpperCase()) : '—');
  const frequencies = leadEvent && soundShape(leadEvent.sound).f;
  const formants = frequencies ? vocalResonances(frequencies,hzFor(leadEvent.note.midi)).slice(0,3).map(Math.round) : ['—','—','—'];
  setText($('formantReadout'), formants.map((formant,index) => `F${index + 1} ${formant}`).join('  ·  '));
  setText($('lyric'), lyricNote ? (lyricNote.phrase || lyricNote.lyric) : '');
  setText($('clock'), `${t >= duration - .001 ? totalText(duration) : timeText(t)} / ${totalText(duration)}`);
  $('seek').value = t;
  $('scoreTimeline').style.setProperty('--playhead',`${Math.min(99.8,t / duration * 100)}%`);
  requestAnimationFrame(frame);
}

showSongs();
selectSong(0);
setView(0);
requestAnimationFrame(frame);
