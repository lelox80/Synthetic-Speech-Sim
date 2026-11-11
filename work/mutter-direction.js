const wardVoiceSpace = {
  close: [12800,.97,.37],
  call: [16800,1.11,.78],
  far: [2920,.66,2.75],
  cry: [15800,1.23,.43,3.2],
  cryAnswer: [8600,.98,1.10,2.4],
  whisper: [4850,.72,1.33],
  lead: [14000,1,.88],
  plea: [16000,1.13,.95]
};

function wardVoiceBus(context,input,dry,wet) {
  const filter = context.createBiquadFilter();
  filter.type = 'lowpass';
  filter.Q.value = .22;
  const presence = context.createBiquadFilter();
  presence.type = 'peaking';
  presence.frequency.value = 2580;
  presence.Q.value = .82;
  const focus = context.createGain();
  const room = context.createGain();
  input.connect(filter);
  filter.connect(presence);
  presence.connect(focus).connect(dry);
  presence.connect(room).connect(wet);
  let previous;
  return (voice,at) => {
    const perspective = voice || 'lead';
    if (previous === perspective) return;
    const [cutoff,direct,send,edge = 0] = wardVoiceSpace[perspective];
    if (previous === undefined) {
      filter.frequency.setValueAtTime(cutoff,at);
      presence.gain.setValueAtTime(edge,at);
      focus.gain.setValueAtTime(direct,at);
      room.gain.setValueAtTime(send,at);
    } else {
      filter.frequency.setTargetAtTime(cutoff,at,.031);
      presence.gain.setTargetAtTime(edge,at,.023);
      focus.gain.setTargetAtTime(direct,at,.030);
      room.gain.setTargetAtTime(send,at,.030);
    }
    previous = perspective;
  };
}

const wardEase = t => {
  t = clamp(t,0,1);
  return t * t * (3 - 2*t);
};

function wardForeheadGlow(time, still) {
  const cue = stageShowData.foreheadMarks.find(([start,end]) => time >= start && time < end + (still ? 0 : .32));
  if (!cue) return 0;
  if (still) return 1;
  const [start,end] = cue;
  return wardEase((time - start) / .14) * (1 - wardEase((time - end) / .32));
}

// Yaw, nod and pupil offsets are actor poses on the performance clock.
const wardBlocking = [
  [0,.14,.08,-.18,-.40], [15.7,.20,.16,-.26,-.73],
  [25.8,.10,.11,.03,-.48], [35.6,.24,.18,-.28,-.79],
  [47.93,.20,.18,-.19,-.69], [48.74,-.29,.008,0,.10],
  [51.88,-.29,.018,0,.04], [53.04,-.04,.085,.52,-.25],
  [56.72,-.28,.004,0,.10], [59.70,-.26,.02,0,.04],
  [61.02,-.06,.12,.45,-.34], [64.24,.15,.16,-.20,-.64],
  [78.40,.20,.12,-.29,-.51], [88.00,.11,.085,.06,-.30],
  [95.93,.16,.15,-.18,-.49], [96.73,-.30,.012,0,.12],
  [100.82,-.07,.081,.41,-.29], [104.72,-.29,.002,0,.14],
  [108.80,-.10,.065,.45,-.25], [112.73,-.31,.012,0,.13],
  [116.82,-.11,.076,.40,-.18], [120.71,-.30,.002,0,.14],
  [124.81,-.11,.084,.31,-.17], [128.25,-.23,.03,-.06,.01],
  [139.91,-.15,.07,-.14,-.24], [146.92,.13,.19,-.34,-.72],
  [148.13,-.17,.12,-.18,-.54], [149.43,-.22,.09,-.07,-.34],
  [151.94,-.33,.025,0,0], [155.72,-.33,.025,0,0],
  [157.40,.06,.16,-.12,-.53], [162.85,.09,.18,-.22,-.61],
  [163.99,-.17,.13,-.14,-.61], [168.55,-.18,.14,-.12,-.56],
  [171.95,-.11,.095,-.05,-.32], [176,-.08,.091,-.13,-.29],
  [187.91,-.22,.045,-.11,-.13], [198,-.28,.02,0,.02],
  [207.25,-.19,.06,-.12,-.12], [227.95,-.23,.031,0,.035],
  [234.12,-.29,.017,0,.08], [236.09,-.31,-.031,0,.18],
  [237.50,-.31,-.019,0,.11], [240.00,.04,.14,-.11,-.69]
];

const wardBridgeCover = { lift:146.92, hold:148.13, lower:149.43, clear:151.94, release:155.72 };
const wardCoverCues = [wardBridgeCover, { lift:162.85, hold:163.99, lower:168.55, clear:171.95 }];

function wardAct(time, still) {
  const handStart = stageShowData.words.at(-1).at(-1)[1];
  const handEnd = stageShowData.words.at(-1).at(-1)[2];
  const cue = wardCoverCues.find(({lift,clear}) => time >= lift && time < clear);
  const staring = time >= wardBridgeCover.clear && time <= wardBridgeCover.release;
  if (still) {
    const cover = cue && time >= cue.hold && time < cue.lower ? 1 : 0;
    return {
      yaw:staring ? -.33 : 0, nod:staring ? .025 : 0, gaze:[0,0],
      reach:time >= handStart && time < handEnd ? 1 : 0,
      cover, hands:[cover,cover], staring
    };
  }
  const last = wardBlocking.findLastIndex(([at]) => at <= time);
  const pose = wardBlocking[last];
  const next = wardBlocking[last + 1] || pose;
  const beat = next === pose ? 0 : wardEase((time - pose[0]) / (next[0] - pose[0]));
  const reaching = wardEase((time - (handStart - .40)) / .76) * (1 - wardEase((time - handEnd + .18) / 1.09));
  const shield = (rise,drop) => wardEase((time-rise)/(cue.hold-rise)) * (1 - wardEase((time-drop)/(cue.clear-drop)));
  const hands = cue ? [shield(cue.lift + .10,cue.lower + .14),shield(cue.lift,cue.lower)] : [0,0];
  const values = pose.slice(1).map((value,i) => mix(value,next[i+1],beat));
  return { yaw:values[0], nod:values[1], gaze:values.slice(2), reach:reaching, cover:Math.max(...hands), hands, staring };
}

function wardHand(line,triangle,shielding = false) {
  const surface = castSurface(line,triangle);
  const sleeve = rings => {
    surface(rings.length - 1,12,(u,v) => {
      const index = Math.round(u * (rings.length - 1));
      const [x,y,z,width,depth,flex = 0] = rings[index];
      const before = rings[Math.max(0,index - 1)];
      const after = rings[Math.min(rings.length - 1,index + 1)];
      const slope = Math.atan2(after[2] - before[2], after[1] - before[1]);
      const angle = v * TAU;
      const cross = depth * Math.sin(angle);
      return [x + width * Math.cos(angle),y - cross * Math.sin(slope),z + cross * Math.cos(slope),flex];
    },20,{ along:2, closed:true });
  };
  sleeve(shielding ? [[.405,-1.02,-.29,.152,.100,-1],[.292,-.75,-.216,.144,.094,-.82],
    [.165,-.50,-.133,.128,.083,-.56],[.073,-.27,-.066,.102,.071,-.29],
    [.019,-.085,-.015,.085,.053,-.08],[.008,.00,0,.101,.057]] :
    [[-.29,-.97,-.25,.138,.085,-1],[-.21,-.74,-.19,.135,.092,-.82],[-.14,-.51,-.13,.122,.084,-.56],
      [-.06,-.28,-.065,.099,.075,-.29],[0,-.09,-.012,.086,.053,-.08],[.008,.00,0,.101,.057]]);
  sleeve([[.008,.00,0,.101,.057],[.014,.075,.018,.143,.063],[.027,.17,.024,.171,.059],
    [.043,.26,.012,.169,.047],[.043,.325,.016,.139,.035]]);

  // The bridge hands flatten against the forehead. The reaching hand stays curled.
  const digits = shielding ? [[-.075,.448,.047,.50],[.015,.512,.047,.46],[.102,.465,.043,.54],[.181,.365,.036,.68]]
    : [[-.063,.437,.041,.82],[.026,.510,.045,.68],[.112,.446,.041,.88],[.180,.344,.033,1.03]];
  for (const [x,length,width,curl] of digits) {
    const spread = x * (shielding ? .10 : .19);
    let y = .281, z = .014;
    const rings = [[x,y,z,width,.031,0]];
    for (const [segment, angle, taper, flex] of [[.17,.12,1,.10],[.33,.32,.89,.33],[.29,.76,.73,.65],[.16,1.10,.58,.88],[.05,1.24,.25,1]]) {
      y += length * segment * Math.cos(angle * curl);
      z += length * segment * Math.sin(angle * curl) * (shielding ? -.43 : 1);
      rings.push([x + spread * flex,y,z,width*taper,width*taper*.72,flex]);
    }
    sleeve(rings);
  }
  sleeve(shielding ? [[-.081,.062,-.017,.054,.043,.02],[-.145,.108,-.027,.051,.037,.08],
    [-.182,.153,-.046,.041,.031,.30],[-.184,.202,-.072,.033,.024,.48],
    [-.171,.249,-.090,.025,.018,.65],[-.159,.267,-.098,.012,.012,.70]] :
    [[-.081,.071,.004,.057,.045,.02],[-.150,.112,.041,.055,.040,.08],[-.201,.171,.088,.046,.037,.30],
      [-.222,.223,.139,.035,.028,.48],[-.218,.270,.179,.026,.020,.65],[-.205,.294,.198,.012,.012,.70]]);

  if (shielding) {
    for (const x of [-.065,.008,.083,.150]) {
      line([x*.52,.023,.060],[x*.83,.155,.084],21);
      line([x*.83,.155,.084],[x,.284,.055],21);
    }
    return;
  }
  // The palm's tendons give the mesh a readable front face.
  line([-.064,.035,.061],[-.087,.194,.083],21);
  line([-.087,.194,.083],[.027,.246,.066],21);
  line([.027,.246,.066],[.142,.204,.059],21);
  line([-.083,.137,.073],[.014,.119,.079],21);
  line([.014,.119,.079],[.138,.154,.063],21);
}
