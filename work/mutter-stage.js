const wardStageCanvas = $('wardStage');
const stageInk = wardStageCanvas.getContext('2d');
const stageLighting = {
  cold: { color: [53,93,149], intensity: .38 },
  flood: { color: [49,117,156], intensity: .42 },
  shadow: { color: [67,83,119], intensity: .26 },
  call: { color: [184,15,37], intensity: .61 },
  return: { color: [131,22,48], intensity: .49 },
  blade: { color: [122,34,46], intensity: .39 },
  whisper: { color: [69,101,151], intensity: .28 },
  solo: { color: [93,55,87], intensity: .43 },
  force: { color: [126,41,55], intensity: .49 },
  release: { color: [54,68,108], intensity: .21 }
};
const moteSeed = (i, shift) => ((Math.sin((i + 1) * 117.73 + shift * 194.93) * 41754.33) % 1 + 1) % 1;
const wardMotes = Array.from({ length: 18 }, (_, i) => [moteSeed(i,1),moteSeed(i,2),moteSeed(i,3),moteSeed(i,4)]);
let stageWidth = 0, stageHeight = 0, stageRatio = 1;
let stageColor = stageLighting.cold.color.slice();
let lastStageFrame = '';

new ResizeObserver(([entry]) => {
  stageWidth = entry.contentRect.width;
  stageHeight = entry.contentRect.height;
  stageRatio = Math.min(devicePixelRatio || 1, 1.5);
  wardStageCanvas.width = Math.max(1,Math.round(stageWidth * stageRatio));
  wardStageCanvas.height = Math.max(1,Math.round(stageHeight * stageRatio));
  lastStageFrame = '';
}).observe(wardStageCanvas);

function wardBeat(time) {
  const hits = stageShowData.lights;
  const index = hits.findLastIndex(([start]) => start <= time);
  let impulse = 0;
  for (let i = index; i >= 0 && time - hits[i][0] < .27; i--) {
    const [start, weight] = hits[i];
    impulse = Math.max(impulse, weight * Math.exp((start - time) * 11));
  }
  return impulse;
}

function paintWardStage(time, theme, dt, live, impulse, caption) {
  if (!stageInk || !stageWidth || !stageHeight) return;
  const reduced = reducedMotion.matches;
  const lighting = stageLighting[theme];
  stageColor = stageColor.map((value, i) => mix(value, lighting.color[i], reduced ? 1 : 1 - Math.exp(-dt * 5.5)));
  const frame = Math.floor(time * 32);
  const motion = reduced ? 0 : frame / 32;
  const dim = reduced ? 0 : impulse;
  const tone = stageColor.map(Math.round).join(',');
  const frameKey = [theme,tone,reduced ? 0 : frame,mode,Number(live),Number(reduced),caption?.echo?.text ?? ''].join('/');
  if (frameKey === lastStageFrame) return;
  lastStageFrame = frameKey;

  const c = stageInk;
  const w = stageWidth, h = stageHeight, x = w * .5;
  const y = h * .485, floor = h * .73;
  const open = lighting.intensity, r = Math.min(h * .36,w * .41);
  const ink = opacity => `rgba(${tone},${clamp(opacity,0,1)})`;
  c.setTransform(stageRatio,0,0,stageRatio,0,0);
  c.clearRect(0,0,w,h);
  const line = (points, color, width = 1) => {
    c.strokeStyle = color;
    c.lineWidth = width;
    c.beginPath();
    points.forEach(([px,py],i) => i ? c.lineTo(px,py) : c.moveTo(px,py));
    c.stroke();
  };
  const polygon = (points, color) => {
    c.fillStyle = color;
    c.beginPath();
    points.forEach(([px,py],i) => i ? c.lineTo(px,py) : c.moveTo(px,py));
    c.closePath();
    c.fill();
  };
  const halo = (px,py,radius,strength) => {
    const glow = c.createRadialGradient(px,py,0,px,py,radius);
    glow.addColorStop(0,ink(strength));
    glow.addColorStop(.52,ink(strength * .24));
    glow.addColorStop(1,ink(0));
    c.fillStyle = glow;
    c.fillRect(px-radius,py-radius,radius*2,radius*2);
  };

  halo(x,y,r * 1.48,(.085 + dim * .025) * open);
  for (const side of [-1,1]) {
    const edge = x + side * w * .51;
    const upright = x + side * w * .335;
    const inner = x + side * r * .91;
    // Faint edges are enough to suggest the walls when the chamber is dark.
    line([[edge,h*.12],[upright,h*.23],[inner,h*.37],[inner,h*.69],[upright,h*.78],[edge,h*.87]],ink(.20 * open));
    line([[upright,h*.23],[upright,h*.78]],ink(.095 * open));
    const fixture = x + side * w * .389;
    const fixtureTop = h * .219;
    const glow = .23 + dim * .08;
    halo(fixture,fixtureTop + h*.055,h*.14,glow * .12 * open);
    c.fillStyle = ink(glow * open);
    c.fillRect(fixture - 1,fixtureTop,2,h * .113);
  }
  if (theme === 'whisper') {
    const shaft = c.createLinearGradient(x,0,x,floor);
    shaft.addColorStop(0,ink(.15));
    shaft.addColorStop(.58,ink(.05));
    shaft.addColorStop(1,ink(0));
    polygon([[x-3,0],[x+3,0],[x+r*.63,floor+h*.06],[x-r*.63,floor+h*.06]],shaft);
  }

  const runway = c.createLinearGradient(0,floor,0,h);
  runway.addColorStop(0,ink(.015));
  runway.addColorStop(1,ink(.035 * open));
  polygon([[0,h],[x-w*.16,floor],[x+w*.16,floor],[w,h]],runway);
  for (let i=-2;i<=2;i++) line([[x+i*w*.062,floor],[x+i*w*.27,h]],ink(.094 * open));
  for (let i=1;i<=3;i++) {
    const t = (i / 3) ** 1.66;
    const half = mix(w*.158,w*.78,t);
    const py = mix(floor,h,t);
    line([[x-half,py],[x+half,py]],ink((.047 + t*.096) * open));
  }
  const spin = motion * .044;
  for (let i=0;i<2;i++) {
    const angle = i * TAU / 2 + spin;
    c.strokeStyle = ink((.15 + dim*.10) * open);
    c.lineWidth = 1.2;
    c.beginPath();
    c.arc(x,y,r * (1.08 + dim*.013),angle,angle+.24);
    c.stroke();
  }
  for (const [u,v,s,phase] of wardMotes) {
    const px = u*w + Math.sin(motion*.54+phase*TAU)*(.016*w);
    const drift = motion * (.006 + s*.014) * (theme === 'flood' ? -1 : 1);
    const py = h * (((v - drift) % 1 + 1) % 1);
    const behindFace = Math.abs(px-x) < r*.43 && Math.abs(py-y) < r;
    if (behindFace) continue;
    c.fillStyle = ink((.05 + s*.13 + dim*.04) * open);
    c.fillRect(px,py,1+s*1.4,1+s*1.4);
  }
  if (caption?.ripple && !reduced) {
    const ripple = caption.ripple;
    for (let wave = 0; wave < 3; wave++) {
      const travel = ripple.phase - wave * .126;
      if (travel <= 0) continue;
      const width = 7 + w * .31 * travel;
      c.strokeStyle = `rgba(115,231,255,${(.51 - .13*wave) * (1 - travel)})`;
      c.lineWidth = 1.6 - .32*wave;
      c.beginPath();
      c.ellipse(ripple.x,ripple.y + h*.047*travel,width,2+width*.20,0,0,TAU);
      c.stroke();
    }
  }
  if (caption?.echo && mode === 0) {
    const age = reduced ? .38 : Math.max(0,caption.echo.age);
    const reveal = Math.min(1,age * 5);
    c.save();
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.font = `italic 500 ${Math.min(26,Math.max(13,w * .031))}px system-ui`;
    for (let layer = 0; layer < 2; layer++) {
      const shift = Math.min(1,age * .48);
      const echoY = h * (.67 - .065*layer - .018*shift);
      c.fillStyle = `rgba(189,153,250,${reveal * (.38 - .15*layer)})`;
      c.fillText(caption.echo.text,x + (layer === 0 ? .18 : -.19)*w,echoY,w * .43);
    }
    c.restore();
  }
}
