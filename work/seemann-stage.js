const seemannCaptions = seemannTake.lines.map(({text,role},line)=>{
  const words = seemannTake.words[line], [style,focus] = seemannTake.cues[line];
  return {text,role,line,words,style,focus,start:words[0][1],end:words.at(-1)[2]};
});
let seaLantern = 0;
let seaFracture = 0;
const seaSignalCanvas = $('seemannSignal');
const seaSignalInk = seaSignalCanvas.getContext('2d');
const seaFractureCues = [
  [0,0], [58,.02], [61.635,.82], [65,1], [73.5,1],
  [75.332,.62], [80,.51], [89,.60], [99.7,.72],
  [102.7,1], [113.9,1], [115.994,.68], [120,.48],
  [141,.55], [164,.66], [168.64,.82], [170.5,1], [176.3,1],
  [178.057,.71], [182,.58], [198,.67], [203.1,1],
  [205.022,.72], [209.5,.52], [230,.62], [246,.70],
  [253,.78], [261,.91], [264.517,1], [268,1], [280,.82], [287.572,.72]
];

function syncSeemannCues() {
  const sections = score() === seemannSong ? seemannTake.sections : fullTake.sections;
  wardCue.replaceChildren(...sections.map(([time,name],index)=>new Option(timeText(time)+' · '+name,index)));
  wardIndex = -1;
  wardOn = false;
  setWardCaption(null);
  lastStageFrame = '';
  seaLantern = 0;
  seaFracture = 0;
  stage.style.setProperty('--sea-fracture',0);
  delete stage.dataset.fracture;
  seaSignalInk?.clearRect(0,0,seaSignalCanvas.width,seaSignalCanvas.height);
  stageInk?.clearRect(0,0,wardStageCanvas.width,wardStageCanvas.height);
  delete stage.dataset.mood;
  delete stage.dataset.lighting;
  stage.removeAttribute('data-refrain');
  figures.forEach(figure=>{figure.acting=null;figure.foreheadGlow=0;figure.fracture=0;});
}

function seemannAct(time,caption) {
  const still = reducedMotion.matches;
  const reachLine = seemannCaptions[6];
  const hand = reachLine.words.at(-1);
  const reach = still ? Number(time>=hand[1] && time<hand[2])*.58
    : .58*wardEase((time-(hand[1]-1.4))/1.7)*(1-wardEase((time-hand[2])/.95));
  const alone = wardEase((time-246)/6);
  const drift = caption?.style === 'drift' ? -.09 : caption?.style === 'undertow' ? .07 : 0;
  const tick = Math.floor(time*8);
  const twitch = still ? 0 : (moteSeed(tick,8)-.5)*seaFracture;
  return {yaw:(still?0:.018*Math.sin(time*.23))+drift+twitch*.52,
    nod:.035+alone*.04+(caption?.style === 'undertow'?.06:0)+twitch*.28,
    gaze:[(alone?0:drift*.8)+twitch*.68,alone?.03:-.10],
    reach,cover:0,hands:[0,0],staring:alone>.5 || seaFracture>.75};
}

function paintSeemannSignal(time) {
  if (!seaSignalInk) return;
  const ratio = Math.min(devicePixelRatio || 1,1.2);
  const w = Math.max(1,Math.round(headCanvas.clientWidth*ratio));
  const h = Math.max(1,Math.round(headCanvas.clientHeight*ratio));
  if (seaSignalCanvas.width!==w || seaSignalCanvas.height!==h) {
    seaSignalCanvas.width=w;
    seaSignalCanvas.height=h;
  }
  const c = seaSignalInk;
  c.clearRect(0,0,w,h);
  if (score()!==seemannSong || speechRun || mode || reducedMotion.matches || seaFracture<.03) return;
  const tick = Math.floor(time*12);
  const amount = seaFracture;
  const skew = (moteSeed(tick,9)-.5)*w*.047*amount;
  c.imageSmoothingEnabled=false;
  c.globalCompositeOperation='screen';
  c.globalAlpha=.20*amount;
  c.drawImage(headCanvas,skew,2*amount,w,h);
  c.globalAlpha=.12*amount;
  c.drawImage(headCanvas,-skew*.65,-3*amount,w,h);
  for (let strip=0;strip<Math.ceil(18*amount);strip++) {
    const seed = tick*23+strip;
    const y = Math.floor((.13+moteSeed(seed,2)*.69)*h);
    const height = Math.max(2,Math.floor((.005+moteSeed(seed,3)*.028)*h));
    const shift = (moteSeed(seed,4)-.5)*w*.14*amount;
    const sourceY = y/h*headCanvas.height;
    const sourceHeight = height/h*headCanvas.height;
    c.globalAlpha=(.40+moteSeed(seed,5)*.35)*amount;
    c.drawImage(headCanvas,0,sourceY,headCanvas.width,sourceHeight,shift,y,w,height);
  }
  c.globalAlpha=1;
  c.globalCompositeOperation='source-over';
}

function paintSeemann(time,dt,live,caption) {
  if (!stageInk || !stageWidth || !stageHeight) return;
  const c = stageInk, w = stageWidth, h = stageHeight;
  const reduced = reducedMotion.matches;
  const theme = caption?.style ?? seemannTake.sections[Math.max(0,wardIndex)][3];
  const motion = reduced ? 0 : theme === 'still' ? caption.start : time;
  const lanternTarget = ['lantern','rain','daylight','dusk','ember','still'].includes(theme) ? 1 : .40;
  seaLantern = mix(seaLantern,lanternTarget,reduced?1:1-Math.exp(-dt*2.1));
  const fade = 1-wardEase((time-270)/17.5);
  const storm = theme === 'storm' || theme === 'undertow';
  const beat = live && !reduced ? wardBeat(time,seemannTake.lights) : 0;
  const horizon = h*.64;
  c.setTransform(stageRatio,0,0,stageRatio,0,0);
  c.clearRect(0,0,w,h);

  const halo = c.createRadialGradient(w*.5,h*.48,0,w*.5,h*.48,h*.56);
  halo.addColorStop(0,`rgba(36,81,116,${.13*(1+beat*.10)*fade})`);
  halo.addColorStop(1,'rgba(0,0,0,0)');
  c.fillStyle = halo;
  c.fillRect(0,0,w,h);
  const waterGlow = c.createLinearGradient(0,horizon-8,0,h);
  waterGlow.addColorStop(0,`rgba(33,78,111,${.14*fade})`);
  waterGlow.addColorStop(.35,`rgba(20,47,72,${.10*fade})`);
  waterGlow.addColorStop(1,'rgba(0,0,0,0)');
  c.fillStyle=waterGlow;
  c.fillRect(0,horizon-8,w,h-horizon+8);
  for (let row=0;row<15;row++) {
    const depth = row/14, y = horizon+h*.32*depth*depth;
    c.beginPath();
    for (let point=0;point<=64;point++) {
      const x = w*point/64;
      const swell = Math.sin(point*.23+motion*.31+row*.79)*(1.2+depth*(storm?8:5));
      const ripple = Math.sin(point*.71-motion*.44+row)*(.4+depth*1.2);
      const py = y+swell+ripple;
      if (point) c.lineTo(x,py); else c.moveTo(x,py);
    }
    c.strokeStyle = `rgba(86,152,191,${(.12+depth*.15)*(storm?1.3:1)*(1+beat*.14)*fade})`;
    c.lineWidth = .75+depth*.5;
    c.stroke();
  }

  if (seaLantern>.005) {
    const x = w*.805, y = h*.31, glowSize = h*.32;
    const flicker = reduced?1:.94+.06*Math.sin(motion*3.1)*Math.sin(motion*7.7);
    const glow = c.createRadialGradient(x,y,0,x,y,glowSize);
    glow.addColorStop(0,`rgba(255,192,115,${.46*seaLantern*flicker*fade})`);
    glow.addColorStop(.18,`rgba(197,119,51,${.15*seaLantern*fade})`);
    glow.addColorStop(1,'rgba(0,0,0,0)');
    c.fillStyle = glow;
    c.fillRect(x-glowSize,y-glowSize,glowSize*2,glowSize*2);
    const beam = c.createLinearGradient(x,y,x,horizon);
    beam.addColorStop(0,`rgba(226,164,88,${.11*seaLantern*fade})`);
    beam.addColorStop(1,'rgba(157,105,47,0)');
    c.fillStyle=beam;
    c.beginPath();c.moveTo(x-4,y);c.lineTo(x+w*.055,horizon);c.lineTo(x-w*.055,horizon);c.closePath();c.fill();
    c.strokeStyle = `rgba(195,158,113,${.36*seaLantern*fade})`;
    c.lineWidth = 1.3;
    c.beginPath();
    c.moveTo(x,h*.73); c.lineTo(x,y+h*.018);
    c.moveTo(x-6,y-8); c.lineTo(x+6,y-8); c.lineTo(x+5,y+8); c.lineTo(x-5,y+8); c.closePath();
    c.stroke();
    c.fillStyle = `rgba(255,220,164,${.82*seaLantern*flicker*fade})`;
    c.fillRect(x-2,y-4,4,8);
    for (let row=0;row<20;row++) {
      const depth = row/19;
      const shift = reduced?0:Math.sin(motion*.6+row)*3;
      c.fillStyle = `rgba(225,161,89,${.20*seaLantern*(1-depth*.72)*fade})`;
      c.fillRect(x-4-depth*20+shift,horizon+depth*depth*h*.32,8+depth*40,1+depth*.5);
    }
  }

  if (storm && !reduced) {
    c.strokeStyle = `rgba(123,158,184,${.055*fade})`;
    c.lineWidth = .6;
    for (let i=0;i<18;i++) {
      const x = ((moteSeed(i,5)+motion*.011)%1)*w;
      if (Math.abs(x-w*.5)<w*.18) continue;
      const y = ((moteSeed(i,6)+motion*.21)%1)*h;
      c.beginPath(); c.moveTo(x,y); c.lineTo(x-4,y+9); c.stroke();
    }
  }

  if (theme === 'cold' && time>255) {
    const frost = wardEase((time-255)/9)*fade;
    c.strokeStyle = `rgba(146,175,197,${frost*.10})`;
    for (const side of [-1,1]) {
      const x = w*(side<0?.025:.975);
      for (let twig=0;twig<7;twig++) {
        const y = h*(.17+twig*.095);
        c.beginPath(); c.moveTo(x,y); c.lineTo(x-side*8,y-9); c.lineTo(x-side*18,y-13); c.stroke();
      }
    }
  }
}

function updateSeemann(time,dt,live,note,lyricTime) {
  const index = Math.max(0,seemannTake.sections.findLastIndex(([start])=>start<=time));
  if (wardIndex!==index) {
    wardIndex=index;
    wardCue.value=index;
    stage.dataset.mood=seemannTake.sections[index][3];
    stage.removeAttribute('data-refrain');
  }
  const sung = seemannCaptions[note?.line ?? -1];
  const caption = sung ?? seemannCaptions.findLast(line=>line.start<=time && time<line.end+.20);
  const cue = Math.max(0,seaFractureCues.findLastIndex(([start])=>start<=time));
  const [begin,from] = seaFractureCues[cue];
  const [end,to] = seaFractureCues[cue+1] ?? seaFractureCues[cue];
  const transition = wardEase((time-begin)/Math.max(.001,end-begin));
  seaFracture = reducedMotion.matches ? 0 : mix(from,to,transition);
  stage.style.setProperty('--sea-fracture',seaFracture.toFixed(3));
  stage.dataset.fracture=seaFracture>.80?'rupture':seaFracture>.35?'unstable':'clear';
  setWardCaption(caption,sung?lyricTime:time);
  stage.dataset.lighting=caption?.style ?? seemannTake.sections[index][3];
  paintSeemann(time,dt,live,caption);
  figures.forEach((figure,index)=>{
    figure.foreheadGlow=0;
    figure.fracture=seaFracture*(index===0?1:.78);
    figure.fractureTime=time;
    figure.acting=index===0 ? seemannAct(time,caption) : null;
  });
}
