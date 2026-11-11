// GLSL sources for the flow-field piece.

// Fullscreen triangle, no attributes needed.
export const fullscreenVert = /* glsl */ `#version 300 es
out vec2 vUv;
void main() {
  vec2 p = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);
  vUv = p;
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

// Ashima / Stefan Gustavson 3D simplex noise (MIT).
const simplex = /* glsl */ `
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x * 34.0) + 10.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
float snoise(vec3 v) {
  const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289(i);
  vec4 p = permute(permute(permute(
            i.z + vec4(0.0, i1.z, i2.z, 1.0))
          + i.y + vec4(0.0, i1.y, i2.y, 1.0))
          + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.5 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
  m = m * m;
  return 105.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}`;

// Dave Hoskins "hash without sine".
const hash = /* glsl */ `
float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
vec2 hash22(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.xx + p3.yz) * p3.zy);
}`;

// Particle simulation: advect along the curl of a scalar potential, plus a
// small down-gradient pull so streams gather into bright filaments.
// Uniform respawning keeps refilling the gaps they leave behind.
export const updateFrag = /* glsl */ `#version 300 es
precision highp float;
uniform sampler2D uPos;
uniform sampler2D uVel;
uniform float uTime;
uniform float uDt;
uniform float uFlowT;
uniform float uScale;
uniform float uSpeed;
uniform float uConverge;
uniform vec2 uAspect;
uniform vec3 uVortex[3];   // xy = centre, z = strength
uniform vec3 uMouse;       // xy = centre, z = strength
layout(location = 0) out vec4 oPos;
layout(location = 1) out vec4 oVel;
${simplex}
${hash}

float bump(vec2 p, vec3 v, float w) {
  vec2 d = p - v.xy;
  return v.z * exp(-dot(d, d) / w);
}

float potential(vec2 p) {
  vec3 q = vec3(p * uScale, uFlowT);
  float n = snoise(q) * 0.8
          + snoise(vec3(p * uScale * 2.13 + 11.7, uFlowT * 1.37)) * 0.17
          + snoise(vec3(p * uScale * 4.71 - 3.1, uFlowT * 1.9)) * 0.03;
  n /= uScale;
  n += bump(p, uVortex[0], 0.22);
  n += bump(p, uVortex[1], 0.16);
  n += bump(p, uVortex[2], 0.30);
  n += bump(p, uMouse, 0.05);
  return n;
}

vec2 field(vec2 p) {
  const float e = 0.0025;
  float dx = potential(p + vec2(e, 0.0)) - potential(p - vec2(e, 0.0));
  float dy = potential(p + vec2(0.0, e)) - potential(p - vec2(0.0, e));
  vec2 grad = vec2(dx, dy) / (2.0 * e);
  return vec2(grad.y, -grad.x) - grad * uConverge;
}

void main() {
  ivec2 ij = ivec2(gl_FragCoord.xy);
  vec4 s = texelFetch(uPos, ij, 0);
  vec4 sv = texelFetch(uVel, ij, 0);

  vec2 p = s.xy;
  float age = s.z + uDt;
  float life = s.w;

  // Midpoint integration keeps streamlines smooth on tight curls.
  vec2 v1 = field(p);
  vec2 v = field(p + v1 * uSpeed * uDt * 0.5);
  v = mix(sv.xy, v, 0.5);
  p += v * uSpeed * uDt;

  vec2 bounds = uAspect * 1.08;
  if (age > life || abs(p.x) > bounds.x || abs(p.y) > bounds.y) {
    vec2 seed = vec2(ij) + fract(uTime * 0.1371) * vec2(531.7, 277.3);
    p = (hash22(seed) * 2.0 - 1.0) * bounds;
    age = 0.0;
    life = mix(4.0, 14.0, pow(hash12(seed + 19.19), 1.5));
    v = field(p);
  }

  oPos = vec4(p, age, life);
  oVel = vec4(v, sv.z, 0.0);
}`;

// Draw each particle as a short line segment (previous → current position).
// Writes two targets:
//   0: rgb = emissive colour, a = surface density (used as a height map)
//   1: xy  = fibre direction as a double-angle vector (so ± headings add up)
export const particleVert = /* glsl */ `#version 300 es
precision highp float;
uniform sampler2D uPos;
uniform sampler2D uVel;
uniform vec2 uAspect;
uniform float uIntensity;
uniform float uDensity;    // per-material multiplier on deposited density
uniform float uStep;       // speed * dt: how far a particle moved this frame
uniform float uHue;
uniform vec3 uPalA, uPalB, uPalC, uPalD;
out vec4 vColor;
out vec4 vFiber;

vec3 palette(float t) {
  return uPalA + uPalB * cos(6.28318 * (uPalC * t + uPalD));
}

void main() {
  int id = gl_VertexID >> 1;
  bool tail = (gl_VertexID & 1) == 1;
  int w = textureSize(uPos, 0).x;
  ivec2 ij = ivec2(id % w, id / w);
  vec4 s = texelFetch(uPos, ij, 0);
  vec4 sv = texelFetch(uVel, ij, 0);

  vec2 p = tail ? s.xy - sv.xy * uStep : s.xy;
  gl_Position = vec4(p / uAspect, 0.0, 1.0);

  float life01 = clamp(s.z / s.w, 0.0, 1.0);
  float fade = smoothstep(0.0, 0.15, life01) * (1.0 - smoothstep(0.65, 1.0, life01));

  float speed = length(sv.xy);
  float heading = atan(sv.y, sv.x);
  float t = uHue
          + 0.17 * sin(heading + 0.6)
          + 0.38 * tanh(speed * 0.45)
          + 0.05 * sv.z;

  vec3 c = max(palette(t), 0.0);
  float k = tanh(speed * 0.38);
  float glow = 0.3 + 1.1 * pow(k, 1.5);
  float wgt = fade * uIntensity * (tail ? 0.35 : 1.0);

  float dens = wgt * uDensity * (0.55 + 0.45 * k);
  vColor = vec4(c * glow * wgt, dens);
  vFiber = vec4(cos(2.0 * heading), sin(2.0 * heading), 0.0, 0.0) * dens;
}`;

export const particleFrag = /* glsl */ `#version 300 es
precision highp float;
in vec4 vColor;
in vec4 vFiber;
layout(location = 0) out vec4 oColor;
layout(location = 1) out vec4 oFiber;
void main() { oColor = vColor; oFiber = vFiber; }`;

// Multiplicative fade of both trail targets (blend: ZERO, SRC_COLOR).
export const fadeFrag = /* glsl */ `#version 300 es
precision highp float;
uniform float uDecay;
layout(location = 0) out vec4 o0;
layout(location = 1) out vec4 o1;
void main() { o0 = vec4(uDecay); o1 = vec4(uDecay); }`;

// ---------------------------------------------------------------------------
// Composite: interpret the trail buffers as a physical surface and shade it.
//
// Materials (uMatA / uMatB, cross-faded by uMatMix):
//   0 light   – the original emissive look
//   1 glass   – refraction with dispersion, Beer absorption, Fresnel reflection
//   2 wool    – lumpy wrap-lit fibres, Kajiya-Kay sheen, fuzzy rim, crevice AO
//   3 silk    – dyed, with twin anisotropic highlights along the fibres
//   4 chrome  – liquid metal reflecting a procedural studio
//   5 porcelain – glossy glaze over a soft subsurface body
export const compositeFrag = /* glsl */ `#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uTrail;
uniform sampler2D uFiber;
uniform float uExposure;
uniform float uBloom;
uniform float uTime;
uniform float uDpr;
uniform vec2 uRes;
uniform vec3 uBgA;
uniform vec3 uBgB;
uniform int uMatA;
uniform int uMatB;
uniform float uMatMix;
uniform vec4 uPrmA;   // x = height gain, y = bump (css px), z = normal lod, w = spare
uniform vec4 uPrmB;
out vec4 o;
${hash}

const vec3 V = vec3(0.0, 0.0, 1.0);   // towards the viewer

vec3 aces(vec3 x) {
  return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0);
}
float luma(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }

// ---- surface reconstruction
float heightAt(vec2 uv, float lod, float gain) {
  return 1.0 - exp(-textureLod(uTrail, uv, lod).a * gain);
}

vec3 normalAt(vec2 uv, float lod, float gain, float bumpPx) {
  vec2 px = max(exp2(lod), 1.0) / uRes;
  float hx = heightAt(uv + vec2(px.x, 0.0), lod, gain) - heightAt(uv - vec2(px.x, 0.0), lod, gain);
  float hy = heightAt(uv + vec2(0.0, px.y), lod, gain) - heightAt(uv - vec2(0.0, px.y), lod, gain);
  // slope per css pixel → tilt
  vec2 g = vec2(hx / (2.0 * px.x * uRes.x), hy / (2.0 * px.y * uRes.y)) * uDpr;
  return normalize(vec3(-g * bumpPx, 1.0));
}

// Dominant fibre tangent (screen space) and how aligned the fibres are.
vec3 fibreAt(vec2 uv, float lod) {
  vec2 f = textureLod(uFiber, uv, lod).xy;
  float d = textureLod(uTrail, uv, lod).a;
  float a = 0.5 * atan(f.y, f.x);
  return vec3(cos(a), sin(a), clamp(length(f) / max(d, 1e-5), 0.0, 1.0));
}

// Saturated dye colour carried by the particles.
vec3 dyeAt(vec2 uv, float lod) {
  vec3 c = textureLod(uTrail, uv, lod).rgb;
  return c / max(max(c.r, max(c.g, c.b)), 1e-5);
}

// ---- lighting environment: a slowly drifting photo studio
// Sky above a soft horizon (set a little below centre so flat surfaces
// reflect the lit wall), a dark floor, a key softbox, a strip light and a
// warm floor bounce. Slightly tinted by the current palette.
vec3 env(vec3 d) {
  float t = uTime * 0.025;
  vec3 tint = 0.75 + 0.5 * normalize(uBgA + 0.01);
  float y = d.y + 0.28;
  vec3 sky = mix(vec3(0.16), vec3(0.62, 0.64, 0.68), smoothstep(0.0, 1.0, y)) * tint;
  vec3 floor_ = mix(vec3(0.06), vec3(0.015), smoothstep(0.0, -0.7, y));
  vec3 c = mix(floor_, sky, smoothstep(-0.02, 0.06, y));
  vec2 a = d.xy - vec2(-0.42 + 0.18 * sin(t), 0.52 + 0.08 * cos(t * 1.3));
  float key = smoothstep(0.30, 0.12, max(abs(a.x) * 0.8, abs(a.y) * 1.3));
  c += key * vec3(1.0, 0.96, 0.9) * 3.2;
  float strip = smoothstep(0.07, 0.015, abs(d.x - 0.68 - 0.12 * sin(t * 1.7)))
              * smoothstep(-0.9, 0.3, d.y);
  c += strip * vec3(0.8, 0.88, 1.0) * 2.2;
  c += vec3(1.0, 0.75, 0.55) * 0.12 * smoothstep(-0.2, -0.9, d.y);
  return c;
}

const vec3 L_KEY = normalize(vec3(-0.55, 0.6, 0.6));
const vec3 L_RIM = normalize(vec3(0.75, -0.25, 0.45));

// Studio backdrop seen *through* or *behind* the material.
// amount > 0 adds fine light bars so refraction has something to bend.
vec3 backdrop(vec2 uv, float amount) {
  vec2 p = (uv - 0.5) * vec2(uRes.x / uRes.y, 1.0);
  float r = length(p);
  vec3 c = mix(uBgB, uBgA, smoothstep(1.1, 0.0, r));
  float ph = (p.x * 0.8 + p.y) * 13.0 + uTime * 0.04;
  float bars = smoothstep(0.93, 0.985, 0.5 + 0.5 * sin(ph))
             + 0.4 * smoothstep(0.95, 0.995, 0.5 + 0.5 * sin(ph * 2.7 + 1.7));
  vec3 lightCol = 0.55 + 0.45 * normalize(uBgA + 0.02);
  c += amount * (bars * 0.16 + 0.04 * smoothstep(1.0, 0.0, r)) * lightCol;
  return c;
}

float kajiya(vec3 T, vec3 H, float e) {
  float th = dot(T, H);
  return pow(sqrt(max(0.0, 1.0 - th * th)), e);
}

vec3 tangentOnSurface(vec2 t2, vec3 n) {
  vec3 T = vec3(t2, 0.0);
  return normalize(T - n * dot(T, n) + 1e-5);
}

// ---- materials ---------------------------------------------------------

vec3 matLight(vec2 uv) {
  vec3 hdr = texture(uTrail, uv).rgb;
  vec3 glow = textureLod(uTrail, uv, 2.5).rgb * 0.55
            + textureLod(uTrail, uv, 4.5).rgb * 0.45
            + textureLod(uTrail, uv, 6.5).rgb * 0.40;
  hdr += glow * uBloom;
  vec3 col = aces(hdr * uExposure);
  return col + backdrop(uv, 0.0) * (1.0 - luma(col));
}

// Glass is photographed against a lightbox: a bright, soft sweep with a few
// fine dark lines. Edges then show as dark refracted outlines + highlights.
vec3 lightbox(vec2 uv) {
  vec2 p = (uv - 0.5) * vec2(uRes.x / uRes.y, 1.0);
  vec3 tone = 0.75 + 0.25 * normalize(uBgA + 0.02);
  vec3 c = mix(vec3(0.16), vec3(0.62), smoothstep(-0.6, 0.55, p.y + 0.15 * p.x)) * tone;
  c *= 1.0 - 0.35 * smoothstep(0.3, 1.2, length(p));
  float ph = (p.x * 0.8 + p.y) * 11.0 + uTime * 0.04;
  float lines = smoothstep(0.982, 0.998, 0.5 + 0.5 * sin(ph))
              + 0.5 * smoothstep(0.99, 0.999, 0.5 + 0.5 * sin(ph * 3.0 + 2.1));
  c *= 1.0 - 0.55 * lines;
  return c;
}

vec3 matGlass(vec2 uv, vec4 prm) {
  float h = heightAt(uv, 1.0, prm.x);
  float body = smoothstep(0.04, 0.25, h);   // only real thickness bends light
  vec3 n = normalAt(uv, prm.z, prm.x, prm.y);
  vec3 nf = normalAt(uv, 0.5, prm.x, prm.y * 0.15);   // drawn-glass striations
  n = normalize(mix(V, normalize(n + (nf - V) * 0.4), body));

  // refraction with dispersion: each channel bends a little differently
  vec2 off = n.xy * (0.06 + 0.08 * h);
  vec3 refr;
  refr.r = lightbox(uv - off * 1.00).r;
  refr.g = lightbox(uv - off * 1.08).g;
  refr.b = lightbox(uv - off * 1.17).b;

  vec3 tint = mix(vec3(1.0), dyeAt(uv, 2.5), 0.6);
  vec3 absorb = exp(-h * 1.6 * (1.0 - tint + 0.05));

  float cosV = max(n.z, 0.0);
  float fres = (0.04 + 0.96 * pow(1.0 - cosV, 4.0)) * body;
  vec3 refl = env(reflect(-V, n));

  vec3 col = mix(refr * absorb, refl, fres);
  // steep walls bend the backlight away → dark outlines, like real glass
  col *= 1.0 - 0.6 * smoothstep(0.25, 0.85, 1.0 - cosV) * body;
  vec3 H = normalize(L_KEY + V);
  col += vec3(1.0, 0.97, 0.92) * pow(max(dot(n, H), 0.0), 220.0) * 3.0 * body;
  return aces(col * uExposure * 1.35);
}

vec3 matWool(vec2 uv, vec4 prm) {
  float h = heightAt(uv, 0.5, prm.x);
  float hBlur = heightAt(uv, 4.0, prm.x);
  vec3 n = normalAt(uv, prm.z, prm.x, prm.y);
  vec3 nf = normalAt(uv, 0.0, prm.x, prm.y * 0.4);
  // fuzz: tiny random tilts per pixel read as loose hairs
  vec2 fz = hash22(floor(gl_FragCoord.xy / max(uDpr, 1.0))) - 0.5;
  n = normalize(n + (nf - V) * 0.7 + vec3(fz * 0.35, 0.0));
  vec3 fb = fibreAt(uv, 0.5);
  vec3 T = tangentOnSurface(fb.xy, n);

  vec3 dye = dyeAt(uv, 2.5);
  vec3 albedo = mix(vec3(0.84, 0.8, 0.74), dye, 0.45) * 0.85;

  float wrap = max(0.0, (dot(n, L_KEY) + 0.7) / 1.7);
  float kkD = mix(1.0, kajiya(T, L_KEY, 1.0), 0.5);
  float diff = wrap * kkD;
  float rim = pow(1.0 - n.z, 1.6) * max(0.0, dot(n, L_RIM) + 0.4);
  vec3 H = normalize(L_KEY + V);
  float sheen = kajiya(T, H, 10.0) * 0.07;
  float ao = clamp(0.3 + 1.5 * (h - hBlur * 0.85), 0.2, 1.0);

  vec3 col = albedo * (diff * 1.0 + 0.1) * ao
           + albedo * rim * 0.8
           + vec3(1.0, 0.97, 0.92) * sheen * ao;
  float cover = smoothstep(0.02, 0.35, h);
  vec3 bg = backdrop(uv, 0.0) * (1.0 - 0.6 * hBlur);  // contact shadow on the backdrop
  return aces(mix(bg, col, cover) * uExposure * 1.25);
}

// Silk: one continuous sheet. The height field becomes draped folds; the
// fibre field steers an anisotropic sheen, falling back to a soft isotropic
// gloss wherever the fibres disagree (so the highlight never snaps).
vec3 matSilk(vec2 uv, vec4 prm) {
  vec3 n = normalAt(uv, prm.z, prm.x, prm.y);              // broad folds
  vec3 nm = normalAt(uv, prm.z - 1.5, prm.x, prm.y * 0.25); // smaller ripples
  n = normalize(n + (nm - V) * 0.6);
  vec3 fb = fibreAt(uv, 3.0);
  vec3 T = tangentOnSurface(fb.xy, n);
  float aniso = smoothstep(0.3, 0.75, fb.z);

  vec3 dye = dyeAt(uv, 5.0);
  dye = mix(vec3(luma(dye)), dye, 0.8) * 0.32 + 0.015;

  vec3 H = normalize(L_KEY + V);
  vec3 H2 = normalize(L_RIM + V);
  float nh = max(dot(n, H), 0.0);
  float spec1 = mix(pow(nh, 30.0), kajiya(T, H, 50.0), aniso);
  float spec2 = mix(pow(nh, 6.0) * 0.6, kajiya(T, H, 10.0), aniso);
  float spec3 = mix(pow(max(dot(n, H2), 0.0), 20.0), kajiya(T, H2, 24.0), aniso);

  float diff = 0.15 + 0.85 * max(dot(n, L_KEY), 0.0);
  vec3 col = dye * diff
           + vec3(1.0, 0.97, 0.94) * spec1 * 0.45
           + dye * 3.0 * spec2 * 0.5
           + vec3(0.75, 0.85, 1.0) * spec3 * 0.18;
  // deep folds fall into shadow
  float ao = clamp(0.55 + 2.0 * (heightAt(uv, 2.5, prm.x) - heightAt(uv, 5.5, prm.x)), 0.3, 1.0);
  return aces(col * ao * uExposure * 1.3);
}

vec3 matChrome(vec2 uv, vec4 prm) {
  float h = heightAt(uv, prm.z, prm.x);
  vec3 n = normalAt(uv, prm.z, prm.x, prm.y);
  vec3 dye = dyeAt(uv, 4.0);
  vec3 f0 = mix(vec3(0.92, 0.92, 0.9), dye, 0.12);
  float cosV = max(n.z, 0.0);
  vec3 fres = f0 + (1.0 - f0) * pow(1.0 - cosV, 5.0);
  vec3 col = env(reflect(-V, n)) * fres;
  // pooled metal with a clean meniscus edge and a contact shadow around it
  float hs = heightAt(uv, prm.z + 2.0, prm.x);
  float cover = smoothstep(0.19, 0.24, hs);
  col *= 0.6 + 0.4 * smoothstep(0.17, 0.4, hs);
  vec3 bg = backdrop(uv, 0.0) * (1.0 - 0.7 * heightAt(uv, 4.5, prm.x));
  return aces(mix(bg, col, cover) * uExposure);
}

vec3 matPorcelain(vec2 uv, vec4 prm) {
  float h = heightAt(uv, 1.0, prm.x);
  float hBlur = heightAt(uv, 4.0, prm.x);
  vec3 n = normalAt(uv, prm.z, prm.x, prm.y);
  vec3 dye = dyeAt(uv, 3.0);
  vec3 body = mix(vec3(0.93, 0.92, 0.89), dye, 0.22);

  float diff = max(0.0, (dot(n, L_KEY) + 0.35) / 1.35);
  // subsurface: thin edges glow warmer
  vec3 sss = vec3(1.0, 0.75, 0.6) * (1.0 - h) * 0.25;
  float ao = clamp(0.5 + 1.2 * (h - hBlur * 0.8), 0.35, 1.0);
  vec3 col = body * (diff * 0.85 + 0.15) * ao + sss * body;

  float fres = 0.05 + 0.95 * pow(1.0 - max(n.z, 0.0), 5.0);
  col = mix(col, env(reflect(-V, n)), fres);
  vec3 H = normalize(L_KEY + V);
  col += pow(max(dot(n, H), 0.0), 220.0) * 2.0;

  float cover = smoothstep(0.05, 0.3, h);
  vec3 bg = backdrop(uv, 0.3) * (1.0 - 0.55 * hBlur);
  return aces(mix(bg, col, cover) * uExposure);
}

vec3 shade(int m, vec2 uv, vec4 prm) {
  if (m == 1) return matGlass(uv, prm);
  if (m == 2) return matWool(uv, prm);
  if (m == 3) return matSilk(uv, prm);
  if (m == 4) return matChrome(uv, prm);
  if (m == 5) return matPorcelain(uv, prm);
  return matLight(uv);
}

void main() {
  vec3 col = shade(uMatA, vUv, uPrmA);
  if (uMatMix > 0.001) col = mix(col, shade(uMatB, vUv, uPrmB), uMatMix);

  col = max(mix(vec3(luma(col)), col, 1.1), 0.0);
  vec2 d = (vUv - 0.5) * vec2(uRes.x / uRes.y, 1.0);
  col *= 1.0 - 0.5 * smoothstep(0.35, 1.25, length(d));
  col = pow(col, vec3(1.0 / 1.08));
  col += (hash12(gl_FragCoord.xy + fract(uTime * 7.31) * 1000.0) - 0.5) * 0.02;
  o = vec4(col, 1.0);
}`;
