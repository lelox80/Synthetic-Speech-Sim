// Head coordinates: X is lateral, Y superior, Z anterior. The atlas follows
// OpenStax's skull and brain sections and the NEI's cross-section of the eye.
const cranialStructures = [
  { name: 'Skull & orbits', kinds: [22], point: [.40,.95,.09], side: 1, row: .19,
    detail: 'The cranial vault surrounds the brain. The orbits cup the globes, and the skull base meets the first cervical vertebra.' },
  { name: 'Cerebrum', kinds: [23], point: [.27,1.02,-.24], side: -1, row: .20, overview: true,
    detail: 'Two folded hemispheres fill the cranial vault. The longitudinal fissure separates them, and the temporal lobes extend down beside the brainstem.' },
  { name: 'Cerebellum', kinds: [24], point: [.18,.27,-.49], side: -1, row: .39, overview: true,
    detail: 'The finely ridged cerebellum sits below the back of the cerebrum and behind the pons and medulla.' },
  { name: 'Brainstem & cord', kinds: [25], point: [.04,.19,-.26], side: -1, row: .54,
    detail: 'The midbrain leads into the rounded pons, then the tapering medulla. The spinal cord continues down through the cervical canal.' },
  { name: 'Eyeballs', kinds: [26,19], point: [.26,.29,.40], side: 1, row: .29, overview: true, yaw: .64,
    detail: 'Each globe sits inside an orbit. The front corneal dome covers the iris. The lens sits behind it, and the retina lines the back of the globe.' },
  { name: 'Optic nerves', kinds: [27], point: [.11,.27,.11], side: 1, row: .36, yaw: .90,
    detail: 'The optic nerves leave the backs of the globes and run inward to the optic chiasm. The optic tracts continue back from there.' },
  { name: 'Sinuses', kinds: [28], point: [.15,-.06,.34], side: 1, row: .43, yaw: .68,
    detail: 'The frontal, ethmoid, sphenoid and maxillary sinuses are air spaces in the skull. Their openings lead into the nasal cavity.' },
  { name: 'Middle & inner ear', kinds: [29], point: [.47,.10,-.17], side: -1, row: .48, yaw: 1.01,
    detail: 'The ear canal leads to the eardrum and the ossicles. Deeper in the skull, the cochlea coils beside the semicircular canals.' },
  { name: 'Arteries & veins', kinds: [30], point: [.23,-.87,-.07], side: -1, row: .71,
    detail: 'The paired carotids ascend toward the skull base. The vertebral arteries join to form the basilar artery. Jugular veins carry blood back down the neck.' },
  { name: 'Deep brain', kinds: [31], point: [.075,.57,-.21], side: -1, row: .30,
    detail: 'The curved corpus callosum connects the hemispheres above the thalamus. The smaller loops trace the ventricular spaces.' },
  { name: 'Muscles', kinds: [17], point: [.41,-.38,.098], side: 1, row: .55, yaw: .91,
    detail: 'The masseter and temporalis move the jaw. Four rectus muscles run along each orbit. The long neck muscles descend from behind the ears.' }
];

function cranialWire(line) {
  const path = (points, kind, closed = false) => {
    for (let i = 1; i < points.length; i++) line(points[i - 1], points[i], kind);
    if (closed) line(points.at(-1), points[0], kind);
  };
  const loop = (segments, point, kind) =>
    path(Array.from({ length: segments }, (_, i) => point(i * TAU / segments)), kind, true);
  const curve = (points, kind, steps = 36) =>
    path(Array.from({ length: steps + 1 }, (_, i) => cranialSpline(points, i / steps)), kind);
  const ellipsoid = ([x,y,z], [rx,ry,rz], kind, rings = 4, ribs = 6) => {
    const point = (t,a) => [x + rx * Math.sin(t) * Math.cos(a), y + ry * Math.cos(t), z + rz * Math.sin(t) * Math.sin(a)];
    for (let i = 1; i <= rings; i++) loop(28, a => point(Math.PI * i / (rings + 1), a), kind);
    for (let i = 0; i < ribs; i++) {
      path(Array.from({ length: 17 }, (_, j) => point(Math.PI * j / 16, TAU * i / ribs)), kind);
    }
  };
  return { path, loop, curve, ellipsoid };
}

function cranialSpline(points, t, closed = false) {
  const count = points.length;
  const position = t * (closed ? count : count - 1);
  const index = Math.floor(position);
  const u = position - index;
  const at = i => points[closed ? (i + count) % count : clamp(i, 0, count - 1)];
  const a = at(index - 1), b = at(index), c = at(index + 1), d = at(index + 2);
  return b.map((value, axis) => .5 * (2 * value + (c[axis] - a[axis]) * u
    + (2 * a[axis] - 5 * value + 4 * c[axis] - d[axis]) * u * u
    + (3 * (value - c[axis]) + d[axis] - a[axis]) * u ** 3));
}

function ocularGeometry(model, depthAt, eyeX, eyeY, lidHeight) {
  // One globe is about one sixth of the breadth of the adult head.
  const radius = .110 * Math.sqrt(model.skull);
  return { eyeX, eyeY, radius, lidHeight, tilt: model.tilt, z: depthAt(eyeX, eyeY) - radius * .48 };
}

function stageEyeGlobes(triangle, orbit) {
  const surface = castSurface(() => {},(a,b,c,kind) => triangle(a,c,b,kind));
  const { eyeX, eyeY, radius, z } = orbit;
  for (const side of [-1,1]) {
    surface(22,40,(u,v) => {
      const polar = u * Math.PI, around = v * TAU;
      return [side * eyeX + radius * Math.sin(polar) * Math.cos(around),
        eyeY + radius * Math.sin(polar) * Math.sin(around), z + radius * Math.cos(polar)];
    },26,{ closed: true });
  }
}

function wireEyes(line, triangle, orbit) {
  const { path, loop, curve, ellipsoid } = cranialWire(line);
  const surface = castSurface(line,triangle);
  const { eyeX, eyeY, radius, z } = orbit;
  for (const side of [-1,1]) {
    const x = side * eyeX;
    // The sclera stops at the limbus, where the smaller corneal cap takes over.
    const point = (t,a) => [x + radius * Math.sin(t) * Math.cos(a),
      eyeY + radius * Math.sin(t) * Math.sin(a), z + radius * Math.cos(t)];
    for (const t of [.88,1.24,1.57,1.97,2.36,2.73]) loop(28, a => point(t,a), 26);
    for (let i = 0; i < 10; i++) {
      const a = i * TAU / 10;
      path(Array.from({ length: 18 }, (_, j) => point(mix(.88,Math.PI,j / 17),a)), 26);
    }
    surface(6,28,(u,v) => point(mix(.56,1.45,u),v*TAU),26,{ across: 6, along: 7, closed: true });
    const cap = (r,a) => [x + r * Math.cos(a),eyeY + r * Math.sin(a),
      z + radius * (.847 + .242 * (1 - (r / (radius * .531)) ** 2))];
    surface(5,28,(u,v) => cap(radius*.531*u,v*TAU),26,{ across: 5, along: 28, closed: true });
    const irisPoint = (r,a) => [x + radius*r*Math.cos(a),eyeY + radius*r*Math.sin(a),
      z + radius*(.886 - .095 * (r/.47)**2)];
    surface(2,28,(u,v) => irisPoint(mix(.185,.47,u),v*TAU),19,{ across: 2, along: 4, closed: true });
    ellipsoid([x,eyeY,z + radius * .59],[radius * .39,radius * .39,radius * .19],26,2,4);
    // Sparse inner retinal arcs follow the back wall of the vitreous chamber.
    for (const t of [2.10,2.59]) {
      loop(24, a => [x + radius * .92 * Math.sin(t) * Math.cos(a),eyeY + radius * .92 * Math.sin(t) * Math.sin(a),
        z + radius * .92 * Math.cos(t)],26);
    }
    for (const edge of [-1,1]) {
      curve([[x + side * .019,eyeY + edge * .014,z - radius * .99],
        [x * .88,eyeY + .007 + edge * .013,z - .16],
        [side * .135,.276 + edge * .012,.111],
        [side * .022,.241 + edge * .009,-.033],
        [-side * .070,.263 + edge * .009,-.183],
        [-side * .165,.347 + edge * .008,-.316]],27);
    }
  }
}

function wireCranium(model, line, orbit) {
  const { path, loop, curve, ellipsoid } = cranialWire(line);
  const width = model.skull;
  const cortexWidth = 1.12;
  const hemisphere = [
    [1.191,-.18],[1.157,.064],[1.045,.254],[.886,.377],[.685,.422],[.516,.366],
    [.472,.230],[.343,.129],[.222,-.030],[.234,-.236],[.321,-.397],
    [.391,-.520],[.493,-.644],[.688,-.668],[.892,-.585],[1.078,-.413]
  ];
  const outline = Array.from({ length: 90 }, (_, i) => cranialSpline(hemisphere,i / 90,true));
  const center = [.720,-.125];
  const gyri = [
    [[1.061,.117],[1.002,.129],[.975,.198],[.915,.190],[.901,.242],[.827,.278],[.76,.324]],
    [[1.127,-.054],[1.056,-.038],[1.025,.038],[.96,.037],[.912,.111],[.855,.089],[.800,.17],[.725,.194],[.692,.291]],
    [[1.140,-.190],[1.058,-.172],[1.026,-.080],[.956,-.093],[.882,-.010],[.815,-.017],[.770,.074],[.692,.061],[.624,.180],[.602,.299]],
    [[1.102,-.343],[1.017,-.308],[.964,-.232],[.875,-.241],[.842,-.158],[.757,-.151],[.726,-.074],[.637,-.069],[.570,.053],[.537,.189]],
    [[.994,-.444],[.938,-.361],[.852,-.344],[.805,-.271],[.725,-.284],[.694,-.211],[.606,-.191],[.570,-.084],[.483,.003],[.422,.091]],
    [[.882,-.538],[.824,-.464],[.749,-.461],[.699,-.396],[.604,-.374],[.563,-.295],[.505,-.251],[.464,-.141],[.392,-.099],[.348,-.024]],
    [[.774,-.583],[.686,-.534],[.626,-.494],[.551,-.510],[.490,-.449],[.444,-.351],[.372,-.303],[.339,-.210],[.291,-.168]],
    [[.642,-.598],[.574,-.582],[.503,-.565],[.465,-.494],[.414,-.475]],
    [[.974,.142],[.875,.058],[.814,.075],[.743,.005],[.669,.006],[.636,-.056]],
    [[.861,-.183],[.936,-.196],[.983,-.275],[1.068,-.266]],
    [[.692,-.329],[.624,-.291],[.598,-.231],[.536,-.233],[.483,-.301],[.414,-.270]]
  ];
  const cross = ([y,z],[v,w]) => y * w - z * v;
  const corticalDepth = ([y,z]) => {
    const ray = [y - center[0],z - center[1]];
    for (let i = 0; i < outline.length; i++) {
      const a = outline[i], b = outline[(i + 1) % outline.length];
      const edge = [b[0] - a[0],b[1] - a[1]];
      const start = [a[0] - center[0],a[1] - center[1]];
      const denominator = cross(ray,edge);
      if (Math.abs(denominator) < .000001) continue;
      const distance = cross(start,edge) / denominator;
      const along = cross(start,ray) / denominator;
      if (distance > 0 && along >= 0 && along <= 1) {
        const radial = clamp(1 / distance,0,.997);
        return .022 + .514 * Math.sqrt(1 - radial * radial) - .10 * Math.max(0,(.48-y)/.29);
      }
    }
    return .536;
  };
  const corticalTracks = gyri.map(track => Array.from({ length: 53 }, (_, i) => {
    const [y,z] = cranialSpline(track,i / 52);
    return [corticalDepth([y,z]),y,z];
  }));
  for (const side of [-1,1]) {
    // The medial faces are nearly flat. The temporal pole is lower and narrower.
    const cortex = (u,t) => {
      const [y,z] = cranialSpline(hemisphere,t,true);
      const span = Math.sqrt(Math.max(0,1 - u * u));
      const ridge = .012 * Math.sin(t * TAU * 17 + 3 * u) * Math.sin(Math.PI * u);
      return [side * width * cortexWidth * (.022 + u * (.52 - .095 * Math.max(0,(.49-y)/.27)) + ridge),
        .720 + (y - .720) * span, -.125 + (z + .125) * span];
    };
    for (const u of [0,.42,.70,.89,.967]) {
      loop(76, angle => cortex(u, angle / TAU),23);
    }
    corticalTracks.forEach(track => path(track.map(([x,y,z]) => [side * width * cortexWidth * x,y,z]),23));

    const cerebellarCenter = [side * .155 * width,.268,-.496];
    ellipsoid(cerebellarCenter,[.174 * width,.136,.183],24,6,5);
    for (const turn of [-.66,-.44,-.22,.02,.25,.48,.68]) {
      const contour = Math.sqrt(1 - turn * turn);
      curve([[-.16,.00,.00],[-.095,.032,-.084],[.01,.043,-.153],[.106,.028,-.101],[.164,-.018,-.023]]
        .map(([x,y,z]) => [cerebellarCenter[0] + side * x * width * contour,.268 + .13 * turn + y * contour,
          -.496 + z * contour]),24,24);
    }

    const x = side * orbit.eyeX, z = orbit.z;
    const orbitRim = (a, scale = 1) => [x + .148 * scale * Math.cos(a),
      orbit.eyeY + .122 * scale * Math.sin(a),z + .045 + .052 * side * Math.cos(a)];
    loop(34, a => orbitRim(a),22);
    loop(30, a => [x * .73 + .080 * Math.cos(a),orbit.eyeY + .014 + .078 * Math.sin(a),z - .142],22);
    for (let i = 0; i < 8; i++) {
      const a = i * TAU / 8;
      curve([orbitRim(a),[x * .89 + .130 * Math.cos(a),orbit.eyeY + .101 * Math.sin(a),z - .025],
        [x * .62 + .033 * Math.cos(a),orbit.eyeY + .020 + .035 * Math.sin(a),z - .251]],22,12);
    }
    curve([[side * .10,.368,.475],[side * .15,.16,.423],[side * .29,-.09,.350],
      [side * .49,-.064,.240],[side * .55,.076,-.066],[side * .49,.093,-.29]],22);

    // Sparse fibers trace the two main jaw muscles and the oblique neck strap.
    for (const fiber of [-1,-.5,0,.5,1]) {
      curve([[side * .480,.004,.104 + .095 * fiber,0],[side * .455,-.228,.117 + .087 * fiber,.28],
        [side * .405,-.492,.143 + .055 * fiber,.64],[side * .352,-.611,.153 + .046 * fiber,1]],17,18);
      curve([[side * (.461 + .056 * fiber),.605,-.049 + .165 * fiber,0],
        [side * (.510 + .036 * fiber),.394,.016 + .111 * fiber,0],
        [side * .469,.155,.131 + .063 * fiber,.15],[side * .414,-.122,.195 + .025 * fiber,.66]],17,20);
      curve([[side * .445,-.067,-.241 + .036 * fiber,0],[side * .290,-.650,-.221 + .061 * fiber,0],
        [side * .217,-1.134,-.090 + .052 * fiber,0],[side * .141,-1.671,.045 + .039 * fiber,0]],17,22);
    }
    for (const angle of [0,Math.PI/2,Math.PI,3*Math.PI/2]) {
      for (const edge of [-1,1]) {
        curve([[x * .58,orbit.eyeY + .015,z - .230],
          [x * .82 + .105 * Math.cos(angle),orbit.eyeY + .102 * Math.sin(angle) + edge * .009,z - .086],
          [x + .104 * Math.cos(angle),orbit.eyeY + .104 * Math.sin(angle) + edge * .010,z + .022]],17,14);
      }
    }

    const sinuses = [
      [[side * .088,.490,.400],[.065,.104,.054]],
      [[side * .210,-.045,.300],[.101,.125,.108]],
      [[side * .077,.138,.204],[.043,.064,.050]],
      [[side * .062,.166,.112],[.037,.042,.040]],
      [[side * .053,.107,.018],[.047,.052,.050]]
    ];
    sinuses.forEach(([center,size]) => ellipsoid(center,size,28,3,5));
    curve([[side*.087,.407,.385],[side*.076,.226,.325],[side*.059,.123,.245]],28,16);
    curve([[side*.194,-.032,.280],[side*.123,.026,.292],[side*.084,.010,.233]],28,16);

    const earX = width * .48;
    for (const edge of [-1,1]) {
      curve([[side * .704 * width,.087 + edge * .032,-.091],
        [side * .591 * width,.095 + edge * .029,-.135],[side * earX,.104 + edge * .024,-.164]],29,16);
    }
    ellipsoid([side * earX,.105,-.167],[.016,.034,.030],29,2,5);
    curve([[side * earX,.116,-.167],[side * .442 * width,.157,-.183],[side * .414 * width,.134,-.191],
      [side * .394 * width,.124,-.199]],29,12);
    path(Array.from({ length: 56 }, (_, j) => {
      const t = j / 55, a = 2.45 * TAU * t, r = mix(.044,.006,t);
      return [side * (.378 * width - .034 * t + r * Math.cos(a)), .095 + r * Math.sin(a), -.176 + .027 * t];
    }),29);
    for (const twist of [0,1.08,2.16]) {
      loop(28, a => [side * (.412 * width + .042 * Math.cos(a) * Math.cos(twist)),
        .159 + .045 * Math.sin(a),-.245 + .042 * Math.cos(a) * Math.sin(twist)],29);
    }

    for (const edge of [-1,1]) {
      curve([[side * (.173 + edge * .018),-1.63,.027],[side * (.203 + edge * .020),-1.10,-.041],
        [side * (.211 + edge * .020),-.645,-.152],[side * (.236 + edge * .013),-.294,-.236],
        [side * (.192 + edge * .012),.037,-.190],[side * (.127 + edge * .010),.224,-.134],
        [side * (.081 + edge * .008),.296,-.168]],30);
      curve([[side * (.222 + edge * .014),-1.60,-.102],[side * (.234 + edge * .014),-1.05,-.132],
        [side * (.253 + edge * .014),-.55,-.198],[side * (.272 + edge * .013),-.161,-.273],
        [side * (.297 + edge * .010),.094,-.349]],30);
      curve([[side * (.103 + edge * .007),-1.44,-.267],[side * (.111 + edge * .007),-.748,-.301],
        [side * (.120 + edge * .007),-.213,-.401],[side * (.072 + edge * .007),.055,-.372],
        [edge * .007,.246,-.238]],30);
    }

    curve([[side * .046,.56,.142],[side * .051,.698,.124],[side * .058,.737,-.104],
      [side * .050,.710,-.338],[side * .037,.590,-.380]],31);
    curve([[side * .043,.52,.112],[side * .045,.648,.084],[side * .062,.686,-.105],
      [side * .060,.655,-.322],[side * .040,.566,-.356]],31);
    ellipsoid([side * .087,.494,-.221],[.070,.073,.102],31,3,5);
    curve([[side * .082,.624,.054],[side * .103,.638,-.126],[side * .116,.570,-.286],
      [side * .097,.432,-.266],[side * .100,.358,-.148]],31);
  }

  // Inner calvaria, including the sagittal seam and the narrowing skull base.
  const skullRings = [
    [.245,.605,.564,-.090],[.421,.642,.580,-.105],[.619,.655,.600,-.113],
    [.827,.627,.570,-.113],[1.003,.549,.512,-.117],[1.127,.450,.424,-.104],
    [1.211,.351,.336,-.093],[1.257,.214,.206,-.071]
  ];
  const skull = ([y,x,z,center],a) => {
    const front = Math.cos(a);
    const occiput = .046 * Math.exp(-((y - .674) ** 2) / .106);
    return [width * x * Math.sin(a), y, center + (z + (front < 0 ? occiput : 0)) * front];
  };
  for (const ring of skullRings) loop(36, a => skull(ring,a),22);
  for (let i = 0; i < 12; i++) {
    const a = i * TAU / 12;
    curve(skullRings.map(ring => skull(ring,a)),22);
  }
  loop(24, a => [.144 * Math.sin(a),-.090 + .030 * Math.cos(a),-.333 + .146 * Math.cos(a)],22);
  for (let i = 0; i < 6; i++) {
    const y = -.275 - i * .231, z = -.337 + i * .014;
    loop(16, a => [(.133 + i * .007) * Math.sin(a),y + .022 * Math.cos(a),z + .083 * Math.cos(a)],22);
    loop(16, a => [(.131 + i * .007) * Math.sin(a),y - .066 + .018 * Math.cos(a),z + .078 * Math.cos(a)],22);
    path([[-.119,y-.037,z-.026],[0,y-.060,z-.147],[.119,y-.037,z-.026]],22);
  }
  ellipsoid([0,.364,-.215],[.099,.113,.115],25,3,6);
  ellipsoid([0,.215,-.260],[.105,.116,.124],25,4,7);
  ellipsoid([0,.064,-.318],[.072,.123,.081],25,3,6);
  const cord = [[-.020,-.331,.062],[-.213,-.339,.052],[-.41,-.337,.046],
    [-.74,-.316,.046],[-1.11,-.299,.045],[-1.60,-.257,.043]];
  for (const [y,z,r] of cord) loop(14, a => [r * Math.cos(a),y,z + .83 * r * Math.sin(a)],25);
  for (let i = 0; i < 6; i++) {
    const a = i * TAU / 6;
    curve(cord.map(([y,z,r]) => [r * Math.cos(a),y,z + .83 * r * Math.sin(a)]),25);
  }
}
