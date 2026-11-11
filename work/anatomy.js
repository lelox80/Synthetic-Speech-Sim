const structures = [
  { name: 'Airway', color: '#76cae8', kinds: [2], detail: 'Air rises through the trachea, crosses the glottis, then travels through the pharynx to the mouth or nose.' },
  { name: 'Nasal cavity', color: '#a8a6ff', kinds: [5], detail: 'The septum divides the two passages. Curved conchae project from their side walls. The soft palate controls access from below.' },
  { name: 'Tongue', color: '#f3a878', kinds: [3], detail: 'The tongue changes height and front-to-back position for each vowel. Its tip rises for sounds such as T, D, N and L.' },
  { name: 'Palate', color: '#f6d79f', kinds: [8], detail: 'The hard palate forms the roof of the mouth. The soft palate lowers for nasal sounds, opening the route into the nose.' },
  { name: 'Teeth & jaw', color: '#d1e9cf', kinds: [9], detail: 'Upper teeth stay fixed. The lower dental arch follows the mandible as it pivots near the ears.' },
  { name: 'Laryngeal cartilage', color: '#85d9c0', kinds: [7,11], detail: 'The thyroid shield sits above the cricoid ring. Paired arytenoids at the back move the folds. The hyoid supports the larynx from above.' },
  { name: 'Epiglottis', color: '#d5d67f', kinds: [10], detail: 'This leaf-shaped cartilage sits behind the tongue. It stays raised during singing and helps cover the airway during swallowing.' },
  { name: 'Vocal folds', color: '#ff8a85', kinds: [4,12], detail: 'The true folds meet at the front and attach to the arytenoids at the back. The thicker false folds sit above them.' }
];

const anatomyCallouts = [
  [],
  [
    { name: 'Nasal conchae', structure: 1, point: [.035,.028,.082], side: -1, row: .36 },
    { name: 'Soft palate', structure: 3, point: [.018,-.252,-.209], side: -1, row: .48 },
    { name: 'Tongue', structure: 2, point: [.08,-.405,.098], side: -1, row: .61 },
    { name: 'Tracheal rings', structure: 0, point: [.08,-1.493,.070], side: -1, row: .80 },
    { name: 'Hard palate', structure: 3, point: [.016,-.167,.361], side: 1, row: .38 },
    { name: 'Dental arch', structure: 4, point: [.135,-.331,.482], side: 1, row: .49 },
    { name: 'Epiglottis', structure: 6, point: [.018,-.760,-.017], side: 1, row: .61 },
    { name: 'True folds', structure: 7, point: [.038,-1.094,.085], side: 1, row: .74 }
  ],
  [
    { name: 'Arytenoid', structure: 5, point: [-.106,-1.031,-.119], side: -1, row: .35 },
    { name: 'Vestibular fold', structure: 7, point: [-.09,-1.019,.029], side: -1, row: .53 },
    { name: 'Cricoid ring', structure: 5, point: [-.094,-1.202,.099], side: -1, row: .70 },
    { name: 'Epiglottis', structure: 6, point: [.024,-.765,-.017], side: 1, row: .30 },
    { name: 'True vocal fold', structure: 7, point: [.054,-1.087,.045], side: 1, row: .47 },
    { name: 'Thyroid lamina', structure: 5, point: [.107,-1.106,.093], side: 1, row: .63 }
  ]
];

function anatomyDetails(line, triangle) {
  const surface = (rows, columns, vertex, kind, { wrap = false, grid = 2 } = {}) => {
    const points = Array.from({ length: rows + 1 }, (_, row) => Array.from({ length: columns + 1 }, (_, col) => vertex(row / rows, col / columns)));
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < columns; col++) {
        const a = points[row][col], b = points[row][col + 1], c = points[row + 1][col], d = points[row + 1][col + 1];
        triangle(a,b,c,kind); triangle(b,d,c,kind);
        if (col % grid === 0 || (!wrap && col === 0)) line(a,c,kind);
        if (row % grid === 0 || row === 0) line(a,b,kind);
        if (row === rows - 1) line(c,d,kind);
        if (!wrap && col === columns - 1) line(b,d,kind);
      }
    }
  };
  const ellipsoid = (center, size, kind, flex = 0, rows = 7, columns = 12) => surface(rows, columns, (u,v) => {
    const latitude = Math.PI * u, angle = TAU * v;
    return [center[0] + size[0] * Math.sin(latitude) * Math.cos(angle), center[1] + size[1] * Math.cos(latitude), center[2] + size[2] * Math.sin(latitude) * Math.sin(angle), flex];
  }, kind, { wrap: true, grid: 3 });

  // Tracheal cartilage is open posteriorly. The cricoid above it is a complete ring.
  for (let i = 0; i < 9; i++) {
    const y = -1.73 + i * .061;
    const width = .103 + i * .003;
    surface(5, 22, (u,v) => {
      const a = (v - .5) * 5.10, b = TAU * u;
      const r = width + .011 * Math.cos(b);
      return [r * Math.sin(a), y + .013 * Math.sin(b), -.035 + i * .004 + r * Math.cos(a)];
    }, 2, { grid: 5 });
  }
  surface(8, 28, (u,v) => {
    const a = TAU * v;
    const back = (.5 - .5 * Math.cos(a)) ** 2;
    const radius = .136 + .013 * Math.sin(Math.PI * u);
    return [radius * Math.sin(a), -1.235 + u * (.042 + .065 * back), .015 + radius * Math.cos(a)];
  }, 7, { wrap: true, grid: 4 });

  // Paired thyroid laminae join at the anterior prominence and leave the back open.
  for (const side of [-1,1]) {
    surface(9, 13, (u,v) => {
      const y = mix(-1.183, -1.012 + .046 * Math.sin(v * 1.3), u) - .025 * Math.sin(v * Math.PI);
      return [side * (.018 + .178 * Math.sin(v * 1.5)), y, .205 - .345 * v + .026 * Math.sin(u * Math.PI)];
    }, 7, { grid: 3 });
    ellipsoid([side * .103,-1.068,-.112], [.037,.055,.041], 7, 4 + side * .26);
  }
  surface(5, 26, (u,v) => {
    const a = (v - .5) * 4.8;
    return [( .196 + .014 * Math.cos(u * TAU)) * Math.sin(a), -.887 + .015 * Math.sin(u * TAU) + .030 * Math.abs(Math.sin(a / 2)), -.038 + .194 * Math.cos(a)];
  }, 11, { grid: 5 });

  for (const side of [-1,1]) {
    const edge = foldVertices(side);
    // A raised medial edge and a shallow inferior surface suggest the fold body.
    const belly = [side * .069, -1.105, .027, 4 + side * .13];
    const underside = [side * .067, -1.135, .018, 4 + side * .14];
    edge.forEach((a, i) => {
      const b = edge[(i + 1) % edge.length];
      triangle(a,b,belly,4);
      triangle(b,a,underside,4);
      if (i % 2 === 0) line(a,belly,4);
    });
    surface(6, 14, (u,v) => {
      const arc = Math.sin(v * Math.PI);
      return [side * (.106 - .043 * arc + .029 * Math.cos(u * TAU)), -1.035 + .017 * Math.sin(u * TAU) - .014 * arc, mix(-.131,.165,v)];
    }, 12, { grid: 4 });
  }

  // Epiglottic petiole is low and anterior. The free leaf curves back above it.
  surface(14, 13, (u,v) => {
    const side = v * 2 - 1;
    const width = .022 + .115 * Math.sin(Math.PI * u) ** .67;
    return [side * width, -.997 + .328 * u - .040 * side * side * u, .092 - .159 * u + .055 * Math.sin(u * Math.PI) + .026 * side * side];
  }, 10, { grid: 3 });

  // Oral roof and mobile velum meet above the rear of the tongue.
  surface(14, 14, (u,v) => {
    const side = v * 2 - 1;
    const width = .208 - .067 * u * u;
    const arch = Math.sqrt(Math.max(0, 1 - side * side));
    return [width * side, -.258 + .099 * arch + .014 * Math.cos(u * 21) * arch * u, -.105 + .635 * u];
  }, 8, { grid: 3 });
  surface(9, 12, (u,v) => {
    const side = v * 2 - 1;
    return [side * (.202 - .153 * u), -.183 - .126 * u - .049 * side * side + .011 * Math.cos(u * Math.PI), -.105 - .142 * u, 2.42 + .51 * u];
  }, 8, { grid: 3 });
  ellipsoid([0,-.325,-.231],[.022,.047,.025],8,2.9);

  // Nasal septum and three progressively smaller curved shelves on each side.
  surface(10, 12, (u,v) => {
    const contour = Math.sin(Math.PI * v) ** .75;
    return [0, -.077 + contour * mix(.010,.202,u), -.164 + .76 * v];
  }, 5, { grid: 4 });
  for (const side of [-1,1]) for (let level = 0; level < 3; level++) {
    surface(6, 14, (u,v) => {
      const extent = Math.sin(Math.PI * v) ** .55;
      const curl = u * Math.PI * 1.14;
      const shell = (.116 - .012 * level) * extent;
      return [side * (.017 + shell * (.69 + .29 * Math.cos(curl))), -.072 + .052 * level + .026 * Math.sin(curl) * extent, -.122 + v * (.624 - .071 * level)];
    }, 5, { grid: 4 });
  }

  // Individual crowns follow fixed upper and articulated lower dental arches.
  for (const lower of [false,true]) for (let i = 0; i < 14; i++) {
    const a = mix(-1.65,1.65,i / 13);
    const front = Math.cos(a);
    const x = (.215 + .017 * Number(lower)) * Math.sin(a);
    const z = .308 + .244 * front;
    const y = (lower ? -.442 : -.319) - .017 * (1 - front);
    ellipsoid([x,y,z],[.026 + .013 * (1 - front),.025,.027 + .011 * (1 - front)],9,Number(lower),4,8);
  }
  for (const side of [-1,1]) {
    surface(7, 12, (u,v) => {
      const angle = Math.PI * v * .52;
      return [side * (.486 * Math.sin(angle) + .024), -.860 + .446 * v ** 2 + .073 * Math.sin(u * Math.PI), .548 - .595 * v - .082 * u, 1];
    }, 9, { grid: 3 });
  }

  // The tongue has a convex dorsum and a tapered tip. Tip and body deform independently.
  surface(17, 22, (u,v) => {
    const angle = TAU * v;
    const span = Math.sin(Math.PI * u) ** .57;
    const x = .188 * span * Math.cos(angle);
    const y = -.505 + .090 * u + .119 * span * Math.sin(angle) - .047 * Math.max(0, .28 - u);
    return [x,y,-.222 + .750 * u,2.02 + .31 * u];
  }, 3, { wrap: true, grid: 3 });
}
