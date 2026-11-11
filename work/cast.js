const cast = [
  { name: 'Morrow', title: 'The night conductor', gear: 'Pinched fedora', tint: '#96efcd', accent: '#e5c089', hair: 'swept', hat: 'fedora', skull: 1, cheek: 1.02, jaw: .99, chin: 1.04, nose: 1.14, eye: .92, lift: .004, tilt: .025 },
  { name: 'Selene', title: 'The soprano', gear: 'Silver drop earrings', tint: '#92dbff', accent: '#d4b3ff', hair: 'long', hat: 'earrings', skull: .94, cheek: 1.10, jaw: .76, chin: .88, nose: .76, eye: 1.13, lift: .019, tilt: .12 },
  { name: 'Ivo', title: 'The archivist', gear: 'Round wire spectacles', tint: '#c7b6ff', accent: '#e3b490', hair: 'temples', hat: 'glasses', skull: 1.07, cheek: 1.04, jaw: 1.21, chin: 1.12, nose: .96, eye: .93, lift: -.026, tilt: -.055 },
  { name: 'Rook', title: 'The radio operator', gear: 'Headset and boom mic', tint: '#f5ca90', accent: '#aeeadd', hair: 'crop', hat: 'headset', skull: .99, cheek: 1.08, jaw: 1.08, chin: .94, nose: .94, eye: .99, lift: .006, tilt: -.015 },
  { name: 'Lyra', title: 'The celestial soloist', gear: 'Orbiting diadem', tint: '#edbde8', accent: '#fbe3ae', hair: 'bun', hat: 'halo', skull: .97, cheek: 1.01, jaw: .88, chin: .91, nose: .87, eye: 1.06, lift: .022, tilt: .079 }
];

const rgb = hex => [1,3,5].map(i => parseInt(hex.slice(i,i + 2),16) / 255);

function castSurface(line, triangle) {
  return (rows, columns, vertex, kind, { skip = () => false, across = 1, along = 1, closed = false } = {}) => {
    const grid = Array.from({ length: rows + 1 }, (_, row) => Array.from({ length: columns + 1 }, (_, col) => vertex(row / rows, col / columns)));
    for (let row = 0; row < rows; row++) for (let col = 0; col < columns; col++) {
      const a = grid[row][col], b = grid[row][col + 1], c = grid[row + 1][col], d = grid[row + 1][col + 1];
      if (!skip(a) && !skip(b) && !skip(c)) triangle(a,b,c,kind);
      if (!skip(b) && !skip(d) && !skip(c)) triangle(b,d,c,kind);
      if ((row % across === 0 || row === 0) && !skip(a) && !skip(b)) line(a,b,kind);
      if ((col % along === 0 || col === 0) && !skip(a) && !skip(c)) line(a,c,kind);
      if (row === rows - 1 && !skip(c) && !skip(d)) line(c,d,kind);
      if (!closed && col === columns - 1 && !skip(b) && !skip(d)) line(b,d,kind);
    }
  };
}

function castExterior(model, line, triangle) {
  const surface = castSurface(line,triangle);
  const path = (points, kind, loop = false) => {
    for (let i = 1; i < points.length; i++) line(points[i - 1],points[i],kind);
    if (loop) line(points.at(-1),points[0],kind);
  };
  const loop = (count, point) => Array.from({ length: count },(_,i) => point(i / count * TAU));
  const heights = [
    [-.997,.052,.125,.315],[-.956,.182,.254,.274],[-.867,.290,.342,.201],[-.745,.384,.404,.137],
    [-.582,.471,.466,.078],[-.405,.508,.519,.031],[-.231,.554,.557,-.006],[-.047,.603,.572,-.036],
    [.151,.640,.586,-.073],[.350,.638,.592,-.092],[.534,.648,.607,-.107],[.730,.638,.592,-.121],
    [.919,.578,.539,-.119],[1.077,.479,.434,-.112],[1.196,.335,.303,-.083],[1.264,.178,.175,-.063],[1.299,.008,.012,-.052]
  ];
  const bell = (x,y,x0,y0,w,h) => Math.exp(-(((x - x0) / w) ** 2 + ((y - y0) / h) ** 2));
  const profile = y => {
    const row = heights.findIndex(entry => entry[0] >= y);
    const b = heights[row < 0 ? heights.length - 1 : row];
    const a = heights[Math.max(0,(row < 0 ? heights.length - 1 : row) - 1)];
    const t = b === a ? 0 : clamp((y - a[0]) / (b[0] - a[0]),0,1);
    const lower = 1 - clamp((y + .65) / .72,0,1);
    const width = mix(a[1],b[1],t) * mix(model.skull,model.jaw,lower) * (1 + (model.cheek - 1) * Math.exp(-((y + .03) ** 2) / .12));
    return [width,mix(a[2],b[2],t),mix(a[3],b[3],t)];
  };
  const noseWarp = (x,y) => model.nose * (
    .113 * bell(x,y,0,.163,.079,.292) + .236 * bell(x,y,0,-.067,.102,.105) + .061 * bell(Math.abs(x),y,.103,-.114,.059,.069)
  );
  const relief = (x,y) => {
    const ax = Math.abs(x);
    return noseWarp(x,y) + .104 * model.cheek * bell(ax,y,.413,-.007,.192,.148)
      - .051 * bell(ax,y,.395,-.294,.133,.164) - .073 * bell(ax,y,.264,.300 + model.lift,.172,.104)
      + .056 * bell(ax,y,.276,.432 + model.lift,.182,.077) + .079 * bell(x,y,0,-.349,.267,.135)
      + .107 * model.chin * bell(x,y,0,-.816,.234,.130);
  };
  const depthAt = (x,y) => {
    const [width,depth,z] = profile(y);
    const face = Math.sqrt(Math.max(0,1 - (x / Math.max(.001,width)) ** 2));
    return z + face ** .67 * depth + relief(x,y) * clamp((face - .03) / .63,0,1);
  };
  const point = (x,y,raise = 0,flex = 0) => [x,y,depthAt(x,y) + raise,flex];
  const eyeX = .268 * model.skull;
  const eyeY = .301 + model.lift;
  const eyeWidth = .143 * model.eye;
  const mouthWidth = .228 * (model.jaw * .52 + .48);
  const mouthY = -.406;
  const jawFlex = y => clamp((-y - .30) / .58,0,1) ** .74;
  const cut = ([x,y,z]) => {
    if (z < .27) return false;
    const dx = Math.abs(x) - eyeX;
    const eye = (dx / (eyeWidth * .89)) ** 2 + ((y - eyeY - dx * model.tilt) / (.059 * model.eye)) ** 2;
    const mouth = (x / (mouthWidth * .92)) ** 2 + ((y - mouthY) / .074) ** 2;
    return eye < 1 || mouth < 1;
  };
  surface(33,46,(u,v) => {
    const y = mix(1.299,-.997,u);
    const a = v * TAU;
    const [width,depth,z] = profile(y);
    const x = width * Math.sin(a);
    const front = Math.cos(a);
    const facial = front > 0 ? front ** .67 * depth + relief(x,y) * clamp((front - .03) / .63,0,1) : front * depth;
    return [x,y,z + facial,jawFlex(y)];
  },0,{ across: 2, along: 2, closed: true, skip: cut });

  for (const side of [-1,1]) {
    const eyeContour = (a, size, raise = .010) => {
      const dx = Math.cos(a) * eyeWidth * size;
      const dy = Math.sin(a) * .055 * model.eye * size * (Math.sin(a) > 0 ? 1 : .74);
      return point(side * (eyeX + dx),eyeY + dx * model.tilt + dy,raise);
    };
    path(loop(24,a => eyeContour(a,1,.025)),18,true);
    path(loop(24,a => eyeContour(a,1.23,.012)).slice(0,13),1);
    surface(6,22,(u,v) => {
      const a = TAU * v, dx = Math.cos(a) * eyeWidth * u;
      const dy = Math.sin(a) * .048 * model.eye * u;
      return point(side * (eyeX + dx),eyeY + dx * model.tilt + dy,.022 + .041 * (1 - u * u));
    },17,{ across: 6, along: 22, closed: true });
    const pupil = a => point(side * eyeX + .044 * Math.cos(a),eyeY + .045 * Math.sin(a),.070);
    path(loop(21,pupil),19,true);
    path(loop(15,a => point(side * eyeX + .022 * Math.cos(a),eyeY + .023 * Math.sin(a),.073)),19,true);
    const catchlight = point(side * eyeX - .014,eyeY + .016,.076);
    line([catchlight[0]-.009,catchlight[1],catchlight[2]],[catchlight[0]+.009,catchlight[1],catchlight[2]],19);
    const brow = Array.from({ length: 15 },(_,i) => {
      const t = i / 14, dx = (t - .5) * .334;
      return point(side * (eyeX + dx),eyeY + .104 + .037 * Math.sin(Math.PI * t) + dx * model.tilt,.017);
    });
    path(brow,1);
    path(brow.map(([x,y,z]) => [x,y+.017,z-.011]),1);
    path(Array.from({ length: 11 },(_,i) => {
      const t = i / 10, x = side * (.053 + .088 * t), y = -.113 - .032 * Math.sin(t * Math.PI);
      return point(x,y,.014);
    }),1);
    path([[side*.063,.197,depthAt(side*.063,.197) + .005],point(side*.063,.107,.012),point(side*.091,.012,.015),point(side*.124,-.109,.009)],1);

    const earX = side * (.607 * model.skull);
    surface(8,18,(u,v) => {
      const a = TAU * v, fullness = Math.sin(u * Math.PI / 2);
      return [earX + side * (.076 * fullness * Math.cos(a) + .044 * u),.088 + .224 * fullness * Math.sin(a),-.132 - .071 * Math.sin(a) * fullness - .038 * u];
    },1,{ across: 3, along: 4, closed: true });
    path(loop(17,a => [earX + side * (.049 + .034 * Math.cos(a)), .106 + .141 * Math.sin(a), -.132 - .048 * Math.sin(a)]),1,true);
  }

  const lip = (t, top, edge) => {
    const u = t * 2 - 1;
    const x = u * mouthWidth;
    const taper = Math.sqrt(Math.max(0,1 - u*u));
    const cupid = .015 * Math.cos((Math.abs(u) - .28) * Math.PI * 2.1);
    const y = mouthY + taper * (top ? edge * (.041 + cupid) : -edge * .055) + .008 * u*u;
    return point(x,y,.022 + .030 * taper * (1 - .35 * edge),top ? .05 : mix(.12,1,taper));
  };
  surface(4,24,(u,v) => lip(v,true,u),1,{ across: 3, along: 4 });
  surface(4,24,(u,v) => lip(v,false,u),1,{ across: 3, along: 4 });
  path(Array.from({ length: 25 },(_,i) => lip(i / 24,false,.88)),1);

  castHair(model,surface,path,loop);
  castGear(model,surface,path,loop,depthAt,eyeX,eyeY);
}

function castHair(model,surface,path,loop) {
  const long = model.hair === 'long';
  const swept = model.hair === 'swept';
  const bun = model.hair === 'bun';
  if (model.hair === 'temples') {
    for (const side of [-1,1]) for (let i = 0; i < 7; i++) {
      const t = i / 6;
      path(Array.from({ length: 14 },(_,j) => {
        const u = j / 13;
        return [side * (.621 + .027 * Math.sin(Math.PI * u) + .015 * t),.25 + t * .30 - .10 * u,-.061 - .37 * u];
      }),13);
    }
    return;
  }
  surface(16,42,(u,v) => {
    const a = TAU * v;
    const front = .5 + .5 * Math.cos(a);
    const angle = u * mix(long ? 1.80 : 1.62,swept ? .97 : 1.13,front);
    const crest = .082 * Math.sin(a * 2.0 + .55) * Math.sin(u * Math.PI);
    const x = .672 * model.skull * Math.sin(angle) * Math.sin(a) + crest * front;
    const y = .515 + (.857 + (bun ? .03 : 0)) * Math.cos(angle) - .077 * Math.sin(a) * front * u;
    const z = -.107 + .657 * Math.cos(a) * Math.sin(angle);
    return [x,y,z,0];
  },13,{ across: 5, along: swept ? 2 : 3, closed: true });

  if (long) {
    for (const side of [-1,1]) for (let section = 0; section < 7; section++) {
      const layer = section / 6;
      const length = mix(2.49,3.0,Math.sin((layer * .82 + .11) * Math.PI));
      surface(26,7,(u,v) => {
        const cross = (v - .5) * 2;
        const rise = 1.17 - .34 * layer + .035 * side;
        const sweep = Math.sin(u * Math.PI * 2.45 + layer * 2.8 + side * .55) * (.030 + .047 * u);
        const fullness = Math.sin(u * Math.PI) ** .74;
        const width = (.046 + .026 * layer) * (1 - u ** 5) + .006;
        const span = .275 + layer * .234 + .407 * Math.sin(u * Math.PI * .61) ** .78;
        const root = 1 - Math.min(1,u / .19) ** .67;
        const x = side * (span + sweep + cross * width - .043 * u ** 3 - (.071 + .019 * layer) * root);
        const y = rise - u * length + .034 * Math.sin(cross * Math.PI) * fullness;
        const z = mix(.367,-.581,layer) + .073 * Math.sin(u * 4.2 + layer * 1.2) - .084 * u + .094 * (1 - cross*cross) * fullness - .098 * root * (1 - layer);
        return [x,y,z,u * u];
      },13,{ across: 8, along: 2 });
    }
    path(Array.from({ length: 18 },(_,i) => {
      const t = i / 17;
      return [-.087 + .119 * t,.888 + .476 * Math.sin(t * Math.PI * .54),.505 - .521 * t];
    }),13);
  }
  if (bun) {
    surface(12,24,(u,v) => {
      const a = u * Math.PI, b = v * TAU + .80 * u;
      return [.235 * Math.sin(a) * Math.cos(b),1.193 + .275 * Math.cos(a),-.596 + .214 * Math.sin(a) * Math.sin(b)];
    },13,{ across: 4, along: 3, closed: true });
  }
  for (const side of [-1,1]) {
    if (long) continue;
    path(loop(20,a => [side * (.538 + .057 * Math.cos(a)),.59 + .159 * Math.sin(a),-.210 + .167 * Math.cos(a)]),13);
  }
}

function castGear(model,surface,path,loop,depthAt,eyeX,eyeY) {
  if (model.hat === 'fedora') {
    const hatPoint = (a, width, depth, y) => [width * Math.sin(a),y - .075 * Math.cos(a) + .039 * Math.cos(a * 2),-.083 + depth * Math.cos(a)];
    const brim = (u,a) => {
      const p = hatPoint(a,mix(.493,.867,u),mix(.478,.733,u),1.160);
      p[1] += .071 * u * u * (Math.sin(a) ** 2 - .44) - .027 * u * Math.max(0,Math.cos(a));
      return p;
    };
    surface(6,48,(u,v) => {
      return brim(u,v * TAU);
    },14,{ across: 3, along: 4, closed: true });
    path(loop(48,a => brim(1,a)),15,true);
    const crown = (u,a) => {
      const pin = Math.exp(-((Math.sin(a) / .42) ** 2)) * Math.max(0,Math.cos(a));
      const p = hatPoint(a,mix(.510,.411,u) * (1 - .091 * pin * u),mix(.489,.377,u),1.164 + .485 * u);
      p[1] -= .042 * pin * u;
      return p;
    };
    surface(11,44,(u,v) => crown(u,v * TAU),14,{ across: 3, along: 4, closed: true });
    surface(7,32,(u,v) => {
      const [x,y,z] = crown(1,v * TAU);
      return [x * u,y - .083 * (1 - u) - .024 * Math.cos(v * TAU * 2) * (1 - u),mix(-.083,z,u)];
    },14,{ across: 3, along: 4, closed: true });
    surface(4,44,(u,v) => {
      const [x,y,z] = crown(.08 + .16 * u,v * TAU);
      return [x * 1.018,y,(z + .083) * 1.018 - .083];
    },15,{ across: 2, along: 8, closed: true });
    path([[.352,1.258,.244],[.412,1.285,.200],[.386,1.326,.219],[.352,1.258,.244]],15);
  }
  if (model.hat === 'glasses') {
    for (const side of [-1,1]) {
      const centerX = side * eyeX;
      const centerZ = depthAt(centerX,eyeY) + .122;
      const rim = (a,r,depth = 0) => {
        const dx = r * Math.cos(a);
        return [centerX + dx,eyeY + .94 * r * Math.sin(a),centerZ - side * dx * .34 + depth];
      };
      path(loop(32,a => rim(a,.163,.002)),15,true);
      path(loop(32,a => rim(a,.174,.015)),15,true);
      surface(3,30,(u,v) => rim(v * TAU,.156 * u,.005),16,{ across: 3, along: 30, closed: true });
      const end = rim(side < 0 ? Math.PI : 0,.169,.015);
      path([end,[side*.507,eyeY + .003,end[2] - .093],[side*.637,eyeY - .042,-.078],[side*.655,eyeY - .109,-.204]],15);
      path([[side*.090,eyeY-.003,centerZ + .071],[side*.109,eyeY-.064,centerZ + .049],[side*.125,eyeY-.078,centerZ+.008]],15);
    }
    path([[-.102,eyeY + .022,.587],[-.057,eyeY + .062,.662],[.057,eyeY + .062,.662],[.102,eyeY + .022,.587]],15);
  }
  if (model.hat === 'earrings') for (const side of [-1,1]) {
    const x = side * .655, y = -.177, z = .151;
    path([[x,y+.102,z],[x,y+.023,z+.019],[x,y-.048,z+.021]],15);
    path(loop(16,a => [x + .041 * Math.cos(a),y - .101 + .090 * Math.sin(a),z + .027 + side * .021 * Math.cos(a)]),15,true);
    path([[x,y-.153,z+.032],[x-.031,y-.218,z+.017],[x,y-.266,z+.042],[x+.031,y-.218,z+.044]],15,true);
  }
  if (model.hat === 'headset') {
    surface(9,24,(u,v) => {
      const a = mix(-1.18,1.18,v);
      return [Math.sin(a) * (.726 + u * .019),.616 + Math.cos(a) * (.714 + u * .021),-.253 + u * .127];
    },14,{ across: 3, along: 3 });
    for (const side of [-1,1]) {
      surface(6,25,(u,v) => {
        const a = TAU * v;
        return [side * (.654 + .101 * u),.128 + (.172 - .021 * u) * Math.cos(a),-.124 + (.149 - .021 * u) * Math.sin(a)];
      },14,{ across: 2, along: 5, closed: true });
      path(loop(25,a => [side * .758,.128 + .144 * Math.cos(a),-.124 + .119 * Math.sin(a)]),15,true);
    }
    path([[.751,.044,-.097],[.702,-.126,.197],[.579,-.257,.432],[.386,-.351,.575],[.242,-.377,.624]],15);
    surface(7,12,(u,v) => {
      const a = TAU * v;
      return [mix(.200,.278,u),-.378 + .022 * Math.cos(a),.627 + .026 * Math.sin(a)];
    },14,{ across: 3, along: 3, closed: true });
  }
  if (model.hat === 'halo') {
    const ring = (a,r) => [.755 * Math.sin(a) * r,1.100 + .346 * Math.cos(a) * r + .115 * Math.sin(a),-.418 - .346 * Math.cos(a) * r];
    path(loop(58,a => ring(a,1.06)),15,true);
    path(loop(58,a => ring(a,.92)),15,true);
    for (let i = 0; i < 12; i++) {
      const a = i / 12 * TAU;
      path([ring(a,.93),ring(a,1.16),ring(a+.085,1.03),ring(a,.93)],15);
    }
    path([[-.24,.907,.330],[-.128,.865,.451],[0,.828,.496],[.128,.865,.451],[.24,.907,.330]],15);
    path([[0,.871,.489],[-.053,.825,.513],[0,.754,.531],[.053,.825,.513]],15,true);
  }
}
