const wireVertex = `#version 300 es
precision highp float;
layout(location=0) in vec3 point;
layout(location=1) in vec3 material;
uniform vec4 rotation;
uniform vec4 seat;
uniform vec4 motion;
uniform vec4 display;
uniform float foldGap;
uniform float nose;
uniform vec3 origin;
uniform vec2 tongue;
uniform vec4 actor;
out float depth;
out float kind;
out float path;
out vec3 sectionPoint;
out vec3 world;
void main() {
  vec3 p = point;
  float flex = material.y;
  if (material.x == 13.) {
    p.x += flex * .032 * sin(display.x * 1.5 + point.y * 2.1 + point.z * 4.);
    p.z += flex * .027 * sin(display.x * 1.1 + point.x * 3. - point.y);
  } else if (flex > .01 && flex <= 1.) {
    float angle = flex * motion.x * .25;
    vec2 arm = p.yz - vec2(-.055, -.078);
    p.yz = vec2(arm.x * cos(angle) - arm.y * sin(angle), arm.x * sin(angle) + arm.y * cos(angle)) + vec2(-.055, -.078);
    if (material.x == 1. && point.y < -.27) p.x *= 1. - motion.y * .23;
  }
  if (flex > 1. && flex < 2.4) {
    float tip = smoothstep(.13, .53, p.z);
    p.y += tongue.x * (.84 + .29 * tip) - .065 * motion.x;
    p.z += tongue.y * (.80 - .23 * tip) - .033 * motion.y;
  }
  if (flex > 2.4 && flex < 3.) p.y -= nose * (flex - 2.4) * .26;
  if (flex >= 3.) p.x += (flex - 4.) * foldGap;
  if (material.x >= 17.) p.y = mix(actor.w,p.y,1. - .89 * actor.z);
  sectionPoint = p;
  p -= origin;
  float cy = cos(rotation.x), sy = sin(rotation.x);
  p = vec3(cy * p.x + sy * p.z, p.y, -sy * p.x + cy * p.z);
  float cp = cos(rotation.y), sp = sin(rotation.y);
  p = vec3(p.x, cp * p.y - sp * p.z, sp * p.y + cp * p.z);
  world = p;
  float perspective = 4.7 / (4.7 - p.z);
  float scale = .535 * seat.z * perspective;
  vec2 position = vec2(p.x / display.y, p.y + .18) * scale + seat.xy;
  gl_Position = vec4(position, -p.z * .26, 1.);
  depth = p.z;
  kind = material.x;
  path = material.z;
  gl_PointSize = (2.0 + seat.z) * display.z;
}`;

const wireFragment = `#version 300 es
precision highp float;
in float depth;
in float kind;
in float path;
in vec3 sectionPoint;
in vec3 world;
uniform vec3 tint;
uniform vec3 accent;
uniform vec4 display;
uniform vec4 motion;
uniform vec4 actor;
uniform float nose;
uniform vec3 study;
uniform uint selected;
out vec4 color;
void main() {
  bool glottis = study.x > 1.5;
  bool section = study.x > .5 && !glottis;
  if (study.x > .5 && kind > 12.5) discard;
  if (actor.x < .5 && kind > 13.5 && kind < 16.5) discard;
  if (glottis && (kind < 1.5 || (kind > 2.5 && kind < 3.5) || (kind > 4.5 && kind < 5.5) || (kind > 7.5 && kind < 9.5) || sectionPoint.y > -.644 || sectionPoint.y < -1.377)) discard;
  if (section && kind < 1.5 && sectionPoint.x * study.z < -.016) discard;
  if (section && kind > 4.5 && kind < 5.5 && sectionPoint.x * study.z < -.027) discard;
  float front = smoothstep(-.48, .68, depth);
  vec3 hue = tint;
  float alpha = mix(.067, .48, front);
  if (kind < .5) {
    alpha *= section ? .31 : 1.;
  } else if (kind < 1.5) {
    alpha = (.19 + .48 * front) * (section ? .44 : 1.);
  } else if (kind < 2.5) {
    hue = vec3(.40, .78, .98);
    alpha = .33 + .17 * front;
  } else if (kind < 3.5) {
    hue = vec3(1., .64, .38);
    alpha = .48 + .18 * front;
  } else if (kind < 4.5) {
    hue = mix(vec3(1., .40, .36), vec3(1., .73, .56), motion.z);
    alpha = .67 + .29 * motion.z;
  } else if (kind < 5.5) {
    hue = vec3(.61, .63, 1.);
    alpha = .36 + .14 * front;
  } else if (kind < 6.5) {
    float location = fract(path);
    float branch = floor(path);
    float flow = max(motion.z, motion.w < 0. ? .43 : 0.);
    float open = branch < .5 ? 1. : branch < 1.5 ? 1. - nose * .88 : .16 + nose * .84;
    float sweep = pow(.5 + .5 * cos(6.28318 * (location * 2.6 - display.x * 1.55)), 6.);
    float dot = 1. - smoothstep(.18, .50, distance(gl_PointCoord, vec2(.5)));
    hue = vec3(.74, .95, 1.);
    alpha = dot * sweep * flow * open;
  } else if (kind < 7.5) {
    hue = vec3(.44, .91, .77);
    alpha = .39 + .19 * front;
  } else if (kind < 8.5) {
    hue = vec3(.96, .79, .51);
    alpha = .46 + .18 * front;
  } else if (kind < 9.5) {
    hue = vec3(.80, .94, .83);
    alpha = .49 + .21 * front;
  } else if (kind < 10.5) {
    hue = vec3(.89, .86, .40);
    alpha = .55 + .15 * front;
  } else if (kind < 11.5) {
    hue = vec3(.59, .90, .77);
    alpha = .45 + .15 * front;
  } else if (kind < 12.5) {
    hue = vec3(.88, .40, .52);
    alpha = .44 + .11 * front;
  } else if (kind < 13.5) {
    hue = mix(tint,accent,.62);
    alpha = mix(.14,.51,front);
  } else if (kind < 14.5) {
    hue = mix(tint,accent,.38);
    alpha = .23 + .33 * front;
  } else if (kind < 15.5) {
    hue = accent;
    alpha = .47 + .45 * front;
  } else if (kind < 16.5) {
    hue = mix(tint,accent,.18);
    alpha = study.y > .5 ? .095 : .07;
  } else if (kind < 17.5) {
    hue = tint * .73;
    alpha = .17 * (1. - actor.z);
  } else if (kind < 18.5) {
    hue = tint;
    alpha = .52 + .20 * front;
  } else {
    hue = mix(tint,vec3(.80,1.,.96),.33);
    alpha = (.67 + .20 * front) * (1. - actor.z);
  }
  if (study.y > .5) {
    vec3 normal = normalize(cross(dFdx(world), dFdy(world)));
    float key = abs(dot(normal, normalize(vec3(-.48,.63,.60))));
    float rim = pow(1. - abs(normal.z), 2.0);
    hue = mix(hue * .45, hue, key * .72 + rim * .28);
    float body = kind < 1.5 ? (section ? .11 : .40) : .31;
    if (kind > 12.5 && kind < 14.5) body = .29;
    if (kind > 16.5) body = .51;
    alpha *= body;
    alpha *= .54 + .46 * key;
  } else if (kind < 1.5 && !section) {
    float shimmer = .90 + .10 * sin(sectionPoint.y * 82. - display.x * 2.);
    alpha *= shimmer;
  }
  if (selected != 0u && kind > 1.5) {
    uint bit = 1u << uint(kind + .5);
    alpha *= (selected & bit) != 0u ? 1.45 : .20;
  }
  if (kind > 1.5 && kind < 12.5 && !glottis && !section) alpha *= actor.y;
  if (study.x < .5 && kind < 1.5) alpha *= .90 + .15 * motion.z;
  alpha *= display.w;
  color = vec4(hue, alpha);
}`;

function foldVertices(side) {
  return [
    [side * .134,-1.083,-.121], [side * .136,-1.083,.058], [side * .064,-1.084,.141],
    [side * .007,-1.085,.158], [side * .008,-1.098,.083,4 + side * .29],
    [side * .013,-1.104,-.023,4 + side * .70], [side * .028,-1.094,-.109,4 + side]
  ];
}

function glottalGap(time, figure, closure) {
  const phase = .5 + .5 * Math.cos(time * (18 + figure.hz * .019));
  return mix(.036, (.005 + .020 * phase) * (1 - .40 * closure), figure.energy);
}

function collectMesh(build) {
  const vertices = [];
  const solids = [];
  const particles = [];
  const put = (p, kind, flow = 0, target = vertices) => target.push(p[0], p[1], p[2], kind, p[3] || 0, flow);
  const line = (a, b, kind) => { put(a, kind); put(b, kind); };
  const triangle = (a,b,c,kind) => { put(a,kind,0,solids); put(b,kind,0,solids); put(c,kind,0,solids); };
  build(line,triangle,(point,flow) => put(point,6,flow,particles));
  return { data: new Float32Array(vertices.concat(particles,solids)), lineVertices: vertices.length / 6, pointVertices: particles.length / 6, solidVertices: solids.length / 6 };
}

function wireAnatomy(line, triangle, particle) {
  const path = (points, kind, closed = false) => {
    for (let i = 1; i < points.length; i++) line(points[i - 1], points[i], kind);
    if (closed) line(points.at(-1), points[0], kind);
  };
  const ring = (segments, vertex) => Array.from({ length: segments }, (_, index) => vertex(index * TAU / segments, index));

  // Each cross-section is perpendicular to its route in the sagittal plane.
  function tube(route, kind, count = 12, ribs = 2, flex = 0) {
    let last;
    route.forEach(([y,z,rx,ry], index) => {
      const a = route[Math.max(0,index - 1)], b = route[Math.min(route.length - 1,index + 1)];
      const dy = b[0] - a[0], dz = b[1] - a[1], distance = Math.hypot(dy,dz);
      const section = ring(count, angle => [Math.cos(angle) * rx, y + Math.sin(angle) * ry * dz / distance, z - Math.sin(angle) * ry * dy / distance, flex]);
      path(section, kind, true);
      if (last) section.forEach((point, j) => { if (j % ribs === 0) line(point, last[j], kind); });
      last = section;
    });
  }
  const skinNeck = [[-1.68,-.16,.26,.26],[-1.54,-.145,.265,.263],[-1.35,-.14,.25,.23],[-1.16,-.15,.25,.235],[-.96,-.16,.29,.29],[-.77,-.18,.33,.32]];
  const windpipe = [[-1.69,-.04,.111,.112],[-1.60,-.033,.113,.114],[-1.51,-.024,.118,.118],[-1.42,-.016,.116,.124],[-1.33,-.01,.122,.127],[-1.24,-.003,.123,.132],[-1.19,0,.135,.139]];
  const throat = [[-1.01,-.021,.138,.142],[-.85,-.106,.133,.144],[-.69,-.168,.145,.149],[-.52,-.205,.159,.139],[-.39,-.191,.163,.139],[-.315,-.125,.175,.121]];
  const mouth = [[-.39,-.19,.165,.13],[-.34,-.04,.217,.138],[-.331,.144,.244,.14],[-.332,.323,.230,.122],[-.36,.46,.186,.087],[-.401,.581,.139,.028]];
  const nose = [[-.44,-.211,.097,.076],[-.30,-.216,.104,.088],[-.14,-.181,.108,.088],[-.028,-.064,.137,.089],[.010,.102,.145,.098],[.015,.246,.138,.093],[-.016,.42,.106,.070],[-.072,.607,.086,.037]];
  tube(skinNeck, 0, 18, 2);
  tube(throat, 2, 16, 4);
  tube(mouth, 2, 12, 4);
  tube(nose, 5, 12, 4);
  for (const sign of [-1, 1]) {
    const fold = foldVertices(sign);
    path(fold, 4, true);
  }
  anatomyDetails(line,triangle);

  const airflow = (route, branch) => route.slice(1).forEach(([y,z], index) => {
    for (let i = 0; i < 6; i++) {
      const t = i / 6;
      const phase = (index + t) / (route.length - 1) * .94;
      particle([.022 * Math.sin(phase * TAU * 4), mix(route[index][0], y, t), mix(route[index][1], z, t)],branch + phase);
    }
  });
  airflow([...windpipe, ...throat.slice(0, 5)], 0);
  airflow(mouth, 1);
  airflow(nose, 2);
}

function formation(count, aspect) {
  if (count === 1) return [[0, -.004, Math.min(.86, aspect / .62)]];
  if (count > 2 && aspect < 1.13) {
    const s = Math.min(.412, aspect * .51);
    const upper = s * .91;
    if (count === 3) return [[0,-.39,s], [-.45,.36,upper], [.45,.36,upper]];
    if (count === 4) return [[-.42,-.39,s], [-.45,.36,upper], [.45,.36,upper], [.42,-.39,s]];
    return [[-.40,-.39,s], [-.63,.36,upper], [.63,.36,upper], [0,.36,upper], [.40,-.39,s]];
  }
  const columns = [[-.40,.40], [0,-.56,.56], [-.24,-.69,.24,.69], [0,-.74,.74,-.37,.37]][count - 2];
  const s = Math.min([.81,.75,.66,.60][count - 2], aspect * 2.02 / count);
  return columns.map((x,i) => [x, i === 0 ? .010 : .043, i === 0 ? s : s * .93]);
}

function studyGeometry(mode, count, aspect) {
  if (mode === 2) return { origin: [0,-1.075,.022], seats: [[0,-.18,Math.min(3.25, aspect * 4.65)]] };
  if (mode === 1) return { origin: [0,-.007,0], seats: [[0,.048,Math.min(1.05, aspect / .52)]] };
  return { origin: [0,0,0], seats: formation(count,aspect) };
}

function studyPoint(point, mode, yaw, pitch, width, height) {
  const aspect = width / height;
  const { origin, seats } = studyGeometry(mode,1,aspect);
  let [x,y,z] = point.map((value,index) => value - origin[index]);
  [x,z] = [Math.cos(yaw) * x + Math.sin(yaw) * z, -Math.sin(yaw) * x + Math.cos(yaw) * z];
  [y,z] = [Math.cos(pitch) * y - Math.sin(pitch) * z, Math.sin(pitch) * y + Math.cos(pitch) * z];
  const [sx,sy,scale] = seats[0];
  const factor = .535 * scale * 4.7 / (4.7 - z);
  return [width * (1 + sx + x / aspect * factor) / 2,height * (1 - sy - (y + .18) * factor) / 2];
}

function createProjection(canvas) {
  const gl = canvas.getContext('webgl2', { alpha: true, antialias: true, premultipliedAlpha: true });
  if (!gl) throw new Error('WebGL 2 is unavailable.');
  function compile(type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader));
    return shader;
  }
  const vertex = compile(gl.VERTEX_SHADER, wireVertex);
  const fragment = compile(gl.FRAGMENT_SHADER, wireFragment);
  const program = gl.createProgram();
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
  gl.useProgram(program);
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);
  function upload({ data, ...counts }) {
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    [0,1].forEach(index => {
      gl.enableVertexAttribArray(index);
      gl.vertexAttribPointer(index,3,gl.FLOAT,false,24,12 * index);
    });
    return { vao, ...counts };
  }
  const anatomy = upload(collectMesh(wireAnatomy));
  const exteriors = cast.map(model => upload(collectMesh((line,triangle) => castExterior(model,line,triangle))));
  gl.clearColor(0, 0, 0, 0);
  gl.enable(gl.BLEND);
  gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  const uniforms = Object.fromEntries(['rotation','seat','motion','display','tint','accent','actor','nose','foldGap','tongue','origin','study','selected'].map(key => [key, gl.getUniformLocation(program, key)]));
  let w = 0, h = 0, ratio = 1;
  function resize() {
    ratio = Math.min(Math.max(devicePixelRatio || 1, 1.32), 1.65);
    w = Math.max(1, Math.round(canvas.clientWidth * ratio));
    h = Math.max(1, Math.round(canvas.clientHeight * ratio));
    canvas.width = w;
    canvas.height = h;
    gl.viewport(0, 0, w, h);
  }
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  resize();
  const draw = (time, yaw, pitch, figures, mode, selected, spotlight = null) => {
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform1ui(uniforms.selected, selected);
    const section = mode === 1;
    const visible = mode ? figures.slice(0,1) : spotlight === null ? figures : [figures[spotlight]];
    const { origin, seats } = studyGeometry(mode,visible.length,w / h);
    gl.uniform3fv(uniforms.origin,origin);
    visible.forEach((figure, index) => {
      const [x,y,scale] = seats[index];
      const spread = visible.length > 1 ? -.40 * x : 0;
      const model = cast[figure.model];
      const blinkTime = (time + 1.31 + figure.model * .41) % (5.8 + figure.model * .33);
      const blink = time ? Math.exp(-(((blinkTime - 4.1) / .093) ** 2)) : 0;
      gl.uniform4f(uniforms.display, time, w / h, ratio, figure.muted && !mode ? .43 : 1);
      gl.uniform4f(uniforms.rotation, yaw + spread, pitch, 0, 0);
      gl.uniform4f(uniforms.seat, x, y + (mode ? 0 : .010 * Math.sin(time * 1.4 + index)), scale, 0);
      gl.uniform4f(uniforms.motion, figure.jaw, figure.round, figure.energy, figure.air ? -1 : figure.hz);
      gl.uniform3fv(uniforms.tint, figure.tint);
      gl.uniform3fv(uniforms.accent, figure.accent);
      gl.uniform4f(uniforms.actor, Number(figure.accessories), figure.internals ? .76 : .17, blink, .301 + model.lift);
      gl.uniform1f(uniforms.nose, figure.nasal);
      gl.uniform1f(uniforms.foldGap, figure.foldGap);
      gl.uniform2f(uniforms.tongue, figure.tongueHeight, figure.tongueFront);
      const meshes = mode === 2 ? [anatomy] : [exteriors[figure.model],anatomy];
      const side = section && yaw < 0 ? -1 : 1;
      gl.uniform3f(uniforms.study,mode,1,side);
      for (const mesh of meshes) {
        gl.bindVertexArray(mesh.vao);
        gl.drawArrays(gl.TRIANGLES,mesh.lineVertices + mesh.pointVertices,mesh.solidVertices);
      }
      gl.uniform3f(uniforms.study,mode,0,side);
      for (const mesh of meshes) {
        gl.bindVertexArray(mesh.vao);
        gl.drawArrays(gl.LINES,0,mesh.lineVertices);
        if (mesh.pointVertices) gl.drawArrays(gl.POINTS,mesh.lineVertices,mesh.pointVertices);
      }
    });
  };
  draw.dispose = () => observer.disconnect();
  return draw;
}
