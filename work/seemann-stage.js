const seemannCaptions = seemannTake.lines.map(({text,role},line)=>{
  const words = seemannTake.words[line], [style,focus] = seemannTake.cues[line];
  return {text,role,line,words,style,focus,start:words[0][1],end:words.at(-1)[2]};
});
let seaLantern = 0;

function syncSeemannCues() {
  const sections = score() === seemannSong ? seemannTake.sections : fullTake.sections;
  wardCue.replaceChildren(...sections.map(([time,name],index)=>new Option(timeText(time)+' · '+name,index)));
  wardIndex = -1;
  wardOn = false;
  setWardCaption(null);
  lastStageFrame = '';
  seaLantern = 0;
  stageInk?.clearRect(0,0,wardStageCanvas.width,wardStageCanvas.height);
  delete stage.dataset.mood;
  delete stage.dataset.lighting;
  stage.removeAttribute('data-refrain');
  figures.forEach(figure=>{figure.acting=null;figure.foreheadGlow=0;});
}

function seemannAct(time,caption) {
  const still = reducedMotion.matches;
  const reachLine = seemannCaptions[6];
  const hand = reachLine.words.at(-1);
  const reach = still ? Number(time>=hand[1] && time<hand[2])*.58
    : .58*wardEase((time-(hand[1]-1.4))/1.7)*(1-wardEase((time-hand[2])/.95));
  const alone = wardEase((time-246)/6);
  const drift = caption?.style === 'drift' ? -.09 : caption?.style === 'undertow' ? .07 : 0;
  return {yaw:(still?0:.018*Math.sin(time*.23))+drift,
    nod:.035+alone*.04+(caption?.style === 'undertow'?.06:0),
    gaze:[alone?0:drift*.8,alone?.03:-.10],reach,cover:0,hands:[0,0],staring:alone>.5};
}

function paintSeemann(time,dt,live,caption) {
  if (!stageInk || !stageWidth || !stageHeight) return;
  const c = stageInk, w = stageWidth, h = stageHeight;
  const reduced = reducedMotion.matches;
  const theme = caption?.style ?? seemannTake.sections[Math.max(0,wardIndex)][3];
  const motion = reduced ? 0 : theme === 'still' ? caption.start : time;
  const lanternTarget = ['lantern','rain','daylight','dusk','ember','still'].includes(theme) ? 1 : 0;
  seaLantern = mix(seaLantern,lanternTarget,reduced?1:1-Math.exp(-dt*2.1));
  const fade = 1-wardEase((time-270)/17.5);
  const storm = theme === 'storm' || theme === 'undertow';
  const beat = live && !reduced ? wardBeat(time,seemannTake.lights) : 0;
  const horizon = h*.64;
  c.setTransform(stageRatio,0,0,stageRatio,0,0);
  c.clearRect(0,0,w,h);

  const halo = c.createRadialGradient(w*.5,h*.48,0,w*.5,h*.48,h*.56);
  halo.addColorStop(0,`rgba(28,62,95,${.045*(1+beat*.10)*fade})`);
  halo.addColorStop(1,'rgba(0,0,0,0)');
  c.fillStyle = halo;
  c.fillRect(0,0,w,h);
  for (let row=0;row<9;row++) {
    const depth = row/8, y = horizon+h*.30*depth*depth;
    c.beginPath();
    for (let point=0;point<=64;point++) {
      const x = w*point/64;
      const swell = Math.sin(point*.23+motion*.31+row*.79)*(.8+depth*2.4);
      const ripple = Math.sin(point*.71-motion*.44+row)*(.3+depth*.7);
      const py = y+swell+ripple;
      if (point) c.lineTo(x,py); else c.moveTo(x,py);
    }
    c.strokeStyle = `rgba(72,118,148,${(.040+depth*.045)*(storm?1.4:1)*(1+beat*.10)*fade})`;
    c.lineWidth = .7;
    c.stroke();
  }

  if (seaLantern>.005) {
    const x = w*.805, y = h*.31, glowSize = h*.22;
    const flicker = reduced?1:.96+.04*Math.sin(motion*3.1)*Math.sin(motion*7.7);
    const glow = c.createRadialGradient(x,y,0,x,y,glowSize);
    glow.addColorStop(0,`rgba(235,173,96,${.14*seaLantern*flicker*fade})`);
    glow.addColorStop(.18,`rgba(168,100,43,${.040*seaLantern*fade})`);
    glow.addColorStop(1,'rgba(0,0,0,0)');
    c.fillStyle = glow;
    c.fillRect(x-glowSize,y-glowSize,glowSize*2,glowSize*2);
    c.strokeStyle = `rgba(174,141,100,${.15*seaLantern*fade})`;
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(x,h*.73); c.lineTo(x,y+h*.018);
    c.moveTo(x-4,y-5); c.lineTo(x+4,y-5); c.lineTo(x+3,y+5); c.lineTo(x-3,y+5); c.closePath();
    c.stroke();
    c.fillStyle = `rgba(255,213,155,${.37*seaLantern*flicker*fade})`;
    c.fillRect(x-1,y-2,2,4);
    for (let row=0;row<12;row++) {
      const depth = row/11;
      const shift = reduced?0:Math.sin(motion*.6+row)*3;
      c.fillStyle = `rgba(176,122,66,${.045*seaLantern*(1-depth)*fade})`;
      c.fillRect(x-3-depth*13+shift,horizon+depth*depth*h*.3,6+depth*26,.7);
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
  setWardCaption(caption,sung?lyricTime:time);
  stage.dataset.lighting=caption?.style ?? seemannTake.sections[index][3];
  paintSeemann(time,dt,live,caption);
  figures.forEach((figure,index)=>{
    figure.foreheadGlow=0;
    figure.acting=index===0 ? seemannAct(time,caption) : null;
  });
}
