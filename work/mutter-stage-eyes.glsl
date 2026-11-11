float eyeWire(float distanceToLine, float scale) {
  float width = clamp(scale, .004, .24);
  return 1. - smoothstep(.24 * width, 1.15 * width, distanceToLine);
}

vec4 stageGlobeWire(vec3 point) {
  vec3 center = vec3(sign(point.x) * orbit.x, actor.w, orbitDepth.x);
  vec3 n = normalize(point - center);
  vec3 look = normalize(vec3(gaze.x * .31 - .035 * sign(point.x), gaze.y * .26, 1.));
  float radial = length(cross(n,look));
  float frontOfEye = step(0.,dot(n,look));

  float cy = cos(rotation.x), sy = sin(rotation.x);
  float cp = cos(rotation.y), sp = sin(rotation.y);
  vec3 viewNormal = vec3(cy*n.x + sy*n.z,n.y,-sy*n.x + cy*n.z);
  viewNormal = vec3(viewNormal.x,cp*viewNormal.y - sp*viewNormal.z,sp*viewNormal.y + cp*viewNormal.z);
  vec3 view = normalize(vec3(0.,0.,4.7) - world);
  float rim = 1. - smoothstep(.14,.34,dot(viewNormal,view));

  float lat = asin(clamp(n.y,-1.,1.)) * 2.55;
  float lon = atan(n.x,n.z) * 1.592;
  float latWire = eyeWire(abs(fract(lat+.5)-.5),fwidth(lat));
  float lonWire = eyeWire(abs(fract(lon+.5)-.5),fwidth(lon));
  lonWire *= 1. - smoothstep(.87,.98,abs(n.y));
  float irisArea = frontOfEye * (1. - smoothstep(.49,.52,radial));
  float globeGrid = max(latWire,lonWire) * (1. - .98*irisArea);

  float bandWidth = fwidth(radial);
  float irisRings = frontOfEye * max(eyeWire(abs(radial-.50),bandWidth), eyeWire(abs(radial-.194),bandWidth));
  vec3 right = normalize(cross(vec3(0.,1.,0.),look));
  float angle = atan(dot(n,cross(look,right)),dot(n,right)) * 1.592;
  float spokes = eyeWire(abs(fract(angle+.5)-.5),fwidth(angle));
  spokes *= irisArea * smoothstep(.215,.28,radial);

  float alpha = max(rim * .96,max(globeGrid * .76,max(irisRings * .93,spokes * .54)));
  vec3 blue = tint * mix(.84,1.,max(rim,irisRings));
  return vec4(blue,alpha * (1. - .35*actor.z));
}
