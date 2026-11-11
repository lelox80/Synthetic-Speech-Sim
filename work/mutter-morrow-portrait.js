// Sagittal samples of the broader vault and the stepped mandibular outline.
const wardHeadProfile = [
  [-.997,.115,.158,.314],[-.971,.272,.233,.253],[-.903,.385,.313,.188],
  [-.821,.456,.366,.136],[-.720,.515,.418,.088],[-.581,.557,.468,.047],
  [-.409,.596,.513,.022],[-.230,.638,.548,-.008],[-.047,.682,.579,-.038],
  [.146,.704,.610,-.072],[.342,.713,.628,-.095],[.538,.721,.649,-.109],
  [.735,.715,.645,-.119],[.925,.685,.608,-.121],[1.074,.612,.541,-.117],
  [1.169,.523,.447,-.103],[1.242,.389,.337,-.085],[1.279,.235,.222,-.072],
  [1.295,.093,.093,-.062],[1.299,.008,.012,-.057]
];

function castExterior(model, line, triangle) {
  const surface = castSurface(line,triangle);
  const path = (points, kind, closed = false) => {
    for (let i = 1; i < points.length; i++) line(points[i - 1],points[i],kind);
    if (closed) line(points.at(-1),points[0],kind);
  };
  const loop = (count, vertex) => Array.from({ length: count },(_,i) => vertex(i / count * TAU));
  const bell = (x,y,x0,y0,w,h) => Math.exp(-(((x-x0)/w)**2 + ((y-y0)/h)**2));
  const profile = y => {
    const last = wardHeadProfile.length - 1;
    const index = wardHeadProfile.findIndex(([height]) => height >= y);
    const b = wardHeadProfile[index < 0 ? last : index];
    const a = wardHeadProfile[Math.max(0,(index < 0 ? last : index) - 1)];
    const t = b === a ? 0 : clamp((y-a[0])/(b[0]-a[0]),0,1);
    const lower = 1 - clamp((y+.65)/.72,0,1);
    const cheek = 1 + (model.cheek-1) * Math.exp(-((y+.03)**2)/.12);
    return [mix(a[1],b[1],t) * mix(model.skull,model.jaw,lower) * cheek,
      mix(a[2],b[2],t),mix(a[3],b[3],t)];
  };
  const eyeX = model.eyeSpacing * model.skull;
  const eyeY = .301 + model.lift;
  const eyeWidth = .108 * Math.sqrt(model.skull) * clamp(model.eye,.94,1.07);
  const eyeHeight = model.eye * model.eyeHeight;
  const mouthWidth = .228 * (model.jaw*.52 + .48);
  const mouthY = -.406;
  const jawFlex = y => clamp((-y-.30)/.58,0,1)**.74;
  const relief = (x,y) => {
    const ax = Math.abs(x);
    const nose = model.nose * (.113*bell(x,y,0,.163,.079,.292) + .236*bell(x,y,0,-.067,.102,.105)
      + .061*bell(ax,y,.103,-.114,.059,.069));
    return nose + .104 * model.cheek * bell(ax,y,.413,-.007,.192,.148)
      - (.051 + .090 * model.hollow) * bell(ax,y,.395,-.294,.133,.164)
      - .073 * bell(ax,y,eyeX,eyeY,.172,.104) + .056 * bell(ax,y,eyeX+.012,eyeY+.131,.182,.077)
      + .079 * bell(x,y,0,-.349,.267,.135) + .107 * model.chin * bell(x,y,0,-.816,.234,.130);
  };
  const frontDepth = (x,y,depth,front) => front**.67 * depth + relief(x,y) * clamp((front-.03)/.63,0,1);
  const depthAt = (x,y) => {
    const [width,depth,z] = profile(y);
    return z + frontDepth(x,y,depth,Math.sqrt(Math.max(0,1-(x/Math.max(.001,width))**2)));
  };
  const point = (x,y,raise = 0,flex = 0) => [x,y,depthAt(x,y)+raise,flex];
  const orbit = { ...ocularGeometry(model,depthAt,eyeX,eyeY,.055*eyeHeight),eyeWidth };

  const cut = ([x,y,z]) => {
    if (z < .27) return false;
    const dx = Math.abs(x)-eyeX;
    const eye = (dx/(eyeWidth*.89))**2 + ((y-eyeY-dx*model.tilt)/(.062*eyeHeight))**2;
    const mouth = (x/(mouthWidth*.92))**2 + ((y-mouthY)/.074)**2;
    return eye < 1 || mouth < 1;
  };
  const headSurface = castSurface((a,b,kind) => {
    const [x,y,z] = a.map((value,axis) => (value+b[axis])/2);
    const socket = ((Math.abs(x)-eyeX)/.222)**2 + ((y-eyeY)/.163)**2;
    const lips = (x/(mouthWidth*1.49))**2 + ((y-mouthY)/.130)**2;
    const nose = Math.abs(x)<.154 && y>-.157 && y<.34;
    if (z<.28 || socket>1 && lips>1 && !nose) line(a,b,kind);
  },triangle);
  const rows = wardHeadProfile.slice().reverse().flatMap(([y],i,heights) =>
    i < heights.length - 1 ? [y,(y+heights[i+1][0])/2] : [y]);
  const neckLine = a => -.997 + .355*(.5-.5*Math.cos(a));
  const headPoint = (y,a) => {
    const [width,depth,z] = profile(y);
    const x = width * Math.sin(a), front = Math.cos(a);
    return [x,y,z + (front>0 ? frontDepth(x,y,depth,front) : front*depth),jawFlex(y)];
  };
  headSurface(rows.length-1,46,(u,v) => {
    const a = v*TAU, row = rows[Math.round(u*(rows.length-1))];
    const y = row < -.409 ? mix(-.409,neckLine(a),(-.409-row)/.588) : row;
    return headPoint(y,a);
  },0,{ across:2, along:2, closed:true, skip:cut });

  surface(12,46,(u,v) => {
    const a = v*TAU, front = Math.cos(a), lateral = Math.sin(a);
    const [x,y,z,flex] = headPoint(neckLine(a),a);
    const taper = Math.sin(Math.PI*u);
    return [mix(x,.449*model.neckWidth*lateral,u)-.058*lateral*taper,
      mix(y,-1.693-.047*front,u),mix(z,-.203+.302*front,u)-.143*Math.max(0,front)*taper,
      flex*(1-u)**3];
  },0,{ across:2, along:2, closed:true });
  for (const side of [-1,1]) wardOuterEar(side,surface,path,loop,model.skull);
  wardFaceTopology(point,path,orbit,mouthWidth,mouthY,jawFlex);
  if (model.hair === 'shorn') wardScalp(profile,depthAt,path);
  else castHair(model,surface,path,loop,headPoint);
  castGear(model,surface,path,loop,depthAt,eyeX,eyeY);
  wireCranium(model,line,orbit);
  wireEyes(line,triangle,orbit);
  return orbit;
}

function wardHeadFit([x,y,z]) {
  // These same offsets are applied after articulation in the wire vertex shader.
  const ease = (low,high,value) => {
    const t = clamp((value-low)/(high-low),0,1);
    return t*t*(3-2*t);
  };
  const face = ease(-.77,-.14,y) * (1 - ease(.25,1.10,y));
  const jaw = ease(-1.22,-.96,y) * (1 - ease(-.96,-.36,y));
  const rear = .33 * ease(-.62,.44,y);
  return [x,y - .105 * face + .130 * jaw,z + Math.min(z,0) * rear];
}

function wardFaceTopology(point, path, orbit, mouthWidth, mouthY, jawFlex) {
  const stitch = (rings, kinds) => {
    rings.forEach((ring,i) => path(ring,kinds[i],true));
    for (let row = 1; row < rings.length; row++) {
      rings[row].forEach((vertex,i) => path([rings[row - 1][i],vertex],kinds[row]));
    }
    return rings.at(-1);
  };
  const skin = (x,y,lift = .006) => point(x,y,lift,jawFlex(y));
  const faceRuns = (runs, side) => runs.forEach(run => path(run.map(([x,y]) => skin(side*x,y)),0));

  // The lid opening, vermilion and nostril rims are closed rings. The next
  // rings share those vertices and turn into brow, cheek and jaw patches.
  const lidWidths = [-1,-.84,-.57,-.29,0,.29,.57,.84,1];
  const lidOutline = [...lidWidths.map(s => [s,1]), ...lidWidths.slice(1,-1).reverse().map(s => [s,-1])];
  const orbitalRim = [
    [.095,.295],[.128,.371],[.174,.420],[.228,.443],[.302,.447],[.370,.440],[.433,.411],[.488,.365],[.533,.296],
    [.490,.224],[.437,.185],[.373,.160],[.309,.148],[.246,.158],[.187,.188],[.131,.235]
  ];
  const lipWidths = [-1,-.81,-.60,-.38,-.18,0,.18,.38,.60,.81,1];
  const lipOutline = [...lipWidths.map(s => [s,1]), ...lipWidths.slice(1,-1).reverse().map(s => [s,-1])];
  const mouth = stitch([0,.34,.70,1].map((row) => lipOutline.map(([s,edge]) => {
    const arch = Math.max(0,1-s*s) ** .70;
    const upper = edge > 0;
    const bow = upper ? .010 * (Math.exp(-(((Math.abs(s)-.27) / .16) ** 2)) - .40 * Math.exp(-((s / .14) ** 2))) : 0;
    const height = upper ? mix(.028,.120,row) : mix(.033,.126,row);
    const x = s * mouthWidth * mix(.98,1.47,row);
    const y = mouthY + edge * arch * height + (1-row*.48) * bow + .011*s*s;
    const lift = mix(.044,.004,row) + .013 * arch * Math.sin(Math.PI * row);
    const flex = mix(upper ? .07 : mix(.10,1,arch),jawFlex(y),row);
    return point(x,y,lift,flex);
  })),[1,1,1,0]);

  for (const side of [-1,1]) {
    const eye = stitch([0,.20,.50,1].map((row) => lidOutline.map(([s,edge],i) => {
      const arch = Math.max(0,1-s*s) ** .78;
      const dx = orbit.eyeWidth*s;
      const lidY = orbit.lidHeight * arch * (edge > 0 ? 1-.14*s : -.77-.06*s);
      const rimX = orbitalRim[i][0] + orbit.eyeX - .30753;
      const rimY = orbitalRim[i][1] + orbit.eyeY - .287;
      const x = mix(orbit.eyeX+dx,rimX,row);
      const y = mix(orbit.eyeY+dx*orbit.tilt+lidY,rimY,row);
      const globe = orbit.z + Math.sqrt(Math.max(0,orbit.radius**2-dx**2-lidY**2));
      const p = skin(side*x,y);
      p[2] = mix(Math.max(p[2],globe+.006),p[2],Math.min(1,row*2));
      return p;
    })),[18,1,0,0]);

    const nostril = [
      [.037,-.124],[.055,-.144],[.082,-.153],[.114,-.146],[.131,-.129],
      [.119,-.113],[.091,-.107],[.060,-.113]
    ];
    const ala = stitch([0,.48,1].map(row => nostril.map(([x,y],i) => {
      const tx = .084 + (x-.084)*(1+.53*row);
      const ty = -.126 + (y+.126)*(1+1.25*row) + .022*row;
      return skin(side*tx,ty,mix(.016,.009,row) + (i >= 5 ? .013 * Math.sin(Math.PI*row) : 0));
    })),[1,1,0]);

    // The paired nose rails make the bridge and tip a single surface network.
    const noseRows = [
      [.360,.038,.078,.126],[.255,.033,.072,.105],[.152,.037,.077,.113],
      [.064,.041,.085,.118],[-.014,.046,.096,.133],[-.068,.049,.105,.152],[-.111,.037,.076,.151]
    ].map(([y,...widths]) => [skin(0,y),...widths.map((x,j) => skin(side*x,y+(j === 2 ? -.029 : -.009)))]);
    noseRows.forEach((row,i) => {
      path(row,i > 3 ? 1 : 0);
      if (i) row.forEach((p,j) => { if (side === 1 || j) path([noseRows[i-1][j],p],j < 2 ? 1 : 0); });
    });
    path([noseRows.at(-2)[3],ala[5],ala[4],ala[3]],0);
    path([noseRows.at(-1)[1],ala[0],skin(side*.044,-.213),skin(side*.063,-.271),mouth[side === 1 ? 6 : 4]],0);
    path([eye[0],noseRows[1][3],noseRows[2][3]],0);
    path([eye[15],skin(side*.131,.152),noseRows[3][3],noseRows[4][3]],0);
    path([eye[13],skin(side*.215,.071),skin(side*.202,-.019),ala[6]],0);

    const corner = side === 1 ? 10 : 0;
    path([ala[4],skin(side*.192,-.190),skin(side*.242,-.251),mouth[corner]],0);
    path([eye[11],skin(side*.340,.056),skin(side*.330,-.064),skin(side*.346,-.222),mouth[corner]],0);
    path([eye[9],skin(side*.494,.136),skin(side*.472,.017),skin(side*.480,-.131),skin(side*.446,-.284),
      skin(side*.407,-.394),skin(side*.372,-.515),skin(side*.309,-.622)],0);
    faceRuns([
      [[.103,.580],[.106,.477],[.095,.295]], [[.238,.581],[.228,.443]],
      [[.389,.583],[.370,.440]], [[.505,.573],[.488,.365]],
      [[.592,.347],[.533,.296],[.558,.180],[.572,.076]],
      [[.407,-.394],[.333,-.397]], [[.372,-.515],[.284,-.514],[.216,-.544]],
      [[.309,-.622],[.218,-.622],[.121,-.643],[0,-.647]]
    ],side);
  }
  path([mouth[15],skin(0,-.602),skin(0,-.647)],0);
}

function wardOuterEar(side, surface, path, loop, skull) {
  const ear = (a,r) => {
    const h = Math.sin(a);
    const x = .688 + (.082 + .040 * Math.cos(a) + .034 * h) * r;
    const y = .081 + (h > 0 ? .220 : .196) * h * r;
    const z = -.171 + (.106 * Math.cos(a) - .054 * h) * r;
    return [side*x*skull,y,z];
  };
  surface(5,28,(u,v) => ear(v*TAU,u),1,{ across: 5, along: 7, closed: true });
  path(loop(28,a => ear(a,1)),1,true);
  path(loop(24,a => ear(a,.75)),1,true);
  path(loop(18,a => ear(a,.42)).slice(2,15),1);
  path([[.700,.094,-.081],[.722,.054,-.099],[.705,.025,-.125],[.702,.050,-.147]]
    .map(([x,y,z]) => [side*x*skull,y,z]),1);
}

function wardScalp(profile, depthAt, path) {
  // Short tracks follow the scalp instead of adding a separate hair shell.
  const scalp = (y,a) => {
    const [width,depth,center] = profile(y);
    const x = width * Math.sin(a);
    const front = Math.cos(a);
    const z = front > 0 ? depthAt(x,y) : center + front * depth;
    return [x + .009 * Math.sin(a),y + .005,z + .009 * front];
  };
  for (let row = 0; row < 13; row++) {
    const y = .51 + row * .058;
    const steps = Math.round(mix(66,26,row / 12));
    for (let i = 0; i < steps; i++) {
      const a = (i + .39 * (row % 2)) / steps * TAU;
      const crown = .59 + .27 * Math.max(0,Math.cos(a)) + .026 * Math.cos(a * 3);
      if (y < crown) continue;
      const jitter = Math.sin(row * 1.71 + i * 2.73);
      path([scalp(y + .009 * jitter,a),scalp(y + .021 + .006 * jitter,a + .012)],0);
    }
  }
  const seam = [[-.495,.559],[-.474,.600],[-.467,.641],[-.430,.704],[-.422,.755]];
  const raised = ([x,y], z = .013) => [x,y,depthAt(x,y) + z];
  path(seam.map(point => raised(point)),1);
  for (const [x,y] of seam.slice(1,-1)) {
    path([raised([x-.017,y+.005]),raised([x+.017,y-.007])],1);
  }
}

function wardRestraint(surface, path, loop, depthAt) {
  // The cuff wraps around the neck with an open notch over the throat.
  const cuff = (u,a,lift = 0) => {
    const front = Math.cos(a);
    const flange = Math.abs(2 * u - 1) ** 4;
    return [(.405 + .095 * u + .036 * flange + lift) * Math.sin(a),
      -1.135 - .404 * u - .114 * Math.max(0,front) + .040 * Math.abs(Math.sin(a)),
      -.137 + (.316 + .066 * u + .025 * flange + lift) * front];
  };
  const opening = .48;
  const around = v => mix(opening,TAU - opening,v);
  const arc = (segments, point) => Array.from({length: segments + 1},(_,i) => point(around(i / segments)));
  surface(8,42,(u,v) => cuff(u,around(v)),14,{ across: 4, along: 7 });
  for (const u of [0,.21,.79,1]) path(arc(42,a => cuff(u,a,.007)),u === 0 || u === 1 ? 15 : 14);
  for (const side of [-1,1]) {
    const a = side * opening;
    const cheek = (u,v) => cuff(u,a + side * v * .23,.018 + .010 * Math.sin(v * Math.PI));
    surface(7,4,cheek,14,{ across: 3, along: 2 });
    path([cheek(0,0),cheek(.44,0),cheek(1,0),cheek(1,1),cheek(0,1)],15,true);
    for (let row = 0; row < 3; row++) {
      const u = .31 + .19 * row;
      path([cuff(u,a + side * .27,.028),cuff(u,a + side * .49,.028)],15);
    }

    // The temple pads sit outside the brow and have separate insulated leads.
    const pad = (angle,radius = 1,raise = .026) => {
      const x = side * (.480 + .071 * radius * Math.cos(angle) - .018 * radius * Math.sin(angle));
      const y = .585 + .087 * radius * Math.sin(angle);
      return [x,y,depthAt(x,y) + raise];
    };
    surface(3,12,(u,v) => pad(v * TAU,u,.018 + .021 * (1 - u)),14,{ across: 2, along: 4, closed: true });
    path(loop(6,a => pad(a,1.02,.028)),15,true);
    path(loop(14,a => pad(a,.47,.046)),15,true);
    path([pad(0,.26,.047),pad(Math.PI,.26,.047)],15);
    const port = pad(-.57,1.01,.036);
    const route = [port,[side*.613,.411,depthAt(side*.613,.411)+.020],[side*.707,.230,.075],
      [side*.765,.055,-.153],[side*.727,-.314,-.285],[side*.560,-.706,-.285],
      [side*.450,-.947,-.217],cuff(.21,side*1.66,.024)];
    path(route,14);
    path(route.map(([x,y,z],i) => [x + side * (i ? .021 : .008),y-.011,z-.014]),15);
    for (const [x,y,z] of route.slice(3,-1)) {
      path([[x-side*.018,y+.016,z+.013],[x+side*.027,y-.016,z-.017]],14);
    }
  }

  // Engraved subject number on the front half of the cuff.
  const tag = (x,y) => cuff(mix(.39,.73,y),mix(.55,.90,x),.029);
  const plate = [[0,0],[.86,0],[1,.16],[1,1],[0,1]];
  path(plate.map(([x,y]) => tag(x,y)),15,true);
  path([[.18,.24],[.39,.24],[.39,.77],[.18,.77]].map(([x,y]) => tag(x,y)),15,true);
  path([[.57,.35],[.69,.24],[.69,.77],[.84,.77]].map(([x,y]) => tag(x,y)),15);
}
