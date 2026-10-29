#version 300 es
// 3D-иконки «Мосдевелопмент Право»: SDF-сцена, raymarching, GGX, мягкие тени, AO.
// Палитра: бордовая эмаль #762F40 / #542531, песочное золото #C4A477, фарфор #F8F3EE.
precision highp float;
uniform vec2 uRes;
uniform float uYaw;
uniform float uPitch;
uniform float uZoom;
uniform float uGround;
uniform sampler2D uGlyph;
const float GLYPH_RANGE = 0.125;
out vec4 frag;

#define PI 3.14159265
#define M_ENAMEL 1.0
#define M_GOLD 2.0
#define M_CREAM 3.0
#define M_DEEP 4.0
#define M_INK 5.0
#define M_GLASS 6.0

mat2 rot(float a) { float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }
float sdBox(vec3 p, vec3 b) { vec3 q = abs(p) - b; return length(max(q, 0.)) + min(max(q.x, max(q.y, q.z)), 0.); }
float sdRBox(vec3 p, vec3 b, float r) { return sdBox(p, b - r) - r; }
float sdSphere(vec3 p, float r) { return length(p) - r; }
// цилиндр вдоль Y, скруглённые кромки rr
float sdRCyl(vec3 p, float r, float h, float rr) {
  vec2 d = vec2(length(p.xz) - r + rr, abs(p.y) - h + rr);
  return min(max(d.x, d.y), 0.) + length(max(d, 0.)) - rr;
}
float sdTorus(vec3 p, vec2 t) { vec2 q = vec2(length(p.xz) - t.x, p.y); return length(q) - t.y; }
float sdCapsule(vec3 p, vec3 a, vec3 b, float r) {
  vec3 pa = p - a, ba = b - a; float h = clamp(dot(pa, ba) / dot(ba, ba), 0., 1.);
  return length(pa - ba * h) - r;
}
// 2D
float sd2Box(vec2 p, vec2 b) { vec2 d = abs(p) - b; return length(max(d, 0.)) + min(max(d.x, d.y), 0.); }
float sd2RBox(vec2 p, vec2 b, float r) { return sd2Box(p, b - r) - r; }
float sd2Seg(vec2 p, vec2 a, vec2 b) { vec2 pa = p - a, ba = b - a; float h = clamp(dot(pa, ba) / dot(ba, ba), 0., 1.); return length(pa - ba * h); }
float sd2Tri(vec2 p, vec2 p0, vec2 p1, vec2 p2) {
  vec2 e0 = p1 - p0, e1 = p2 - p1, e2 = p0 - p2;
  vec2 v0 = p - p0, v1 = p - p1, v2 = p - p2;
  vec2 pq0 = v0 - e0 * clamp(dot(v0, e0) / dot(e0, e0), 0., 1.);
  vec2 pq1 = v1 - e1 * clamp(dot(v1, e1) / dot(e1, e1), 0., 1.);
  vec2 pq2 = v2 - e2 * clamp(dot(v2, e2) / dot(e2, e2), 0., 1.);
  float s = sign(e0.x * e2.y - e0.y * e2.x);
  vec2 d = min(min(vec2(dot(pq0, pq0), s * (v0.x * e0.y - v0.y * e0.x)),
                   vec2(dot(pq1, pq1), s * (v1.x * e1.y - v1.y * e1.x))),
                   vec2(dot(pq2, pq2), s * (v2.x * e2.y - v2.y * e2.x)));
  return -sqrt(d.x) * sign(d.y);
}
float sd2Heart(vec2 p) {
  p.x = abs(p.x);
  if (p.y + p.x > 1.) return sqrt(dot(p - vec2(.25, .75), p - vec2(.25, .75))) - sqrt(2.) / 4.;
  return sqrt(min(dot(p - vec2(0, 1), p - vec2(0, 1)), dot(p - .5 * max(p.x + p.y, 0.), p - .5 * max(p.x + p.y, 0.)))) * sign(p.x - p.y);
}
float sd2Star5(vec2 p, float r, float rf) {
  const vec2 k1 = vec2(0.809016994375, -0.587785252292);
  const vec2 k2 = vec2(-k1.x, k1.y);
  p.x = abs(p.x);
  p -= 2. * max(dot(k1, p), 0.) * k1;
  p -= 2. * max(dot(k2, p), 0.) * k2;
  p.x = abs(p.x);
  p.y -= r;
  vec2 ba = rf * vec2(-k1.y, k1.x) - vec2(0, 1);
  float h = clamp(dot(p, ba) / dot(ba, ba), 0., r);
  return length(p - ba * h) * sign(p.y * ba.x - p.x * ba.y);
}
// дуга: sc = (sin, cos) половины раскрыва, ra — радиус, rb — толщина
float sd2Arc(vec2 p, vec2 sc, float ra, float rb) {
  p.x = abs(p.x);
  return ((sc.y * p.x > sc.x * p.y) ? length(p - sc * ra) : abs(length(p) - ra)) - rb;
}
// бикубическая выборка (B-сплайн) через 4 билинейные: гладкие нормали без «лесенки»
vec4 cubic(float v) {
  vec4 n = vec4(1.0, 2.0, 3.0, 4.0) - v; vec4 s = n * n * n;
  float x = s.x, y = s.y - 4.0 * s.x, z = s.z - 4.0 * s.y + 6.0 * s.x, w = 6.0 - x - y - z;
  return vec4(x, y, z, w) * (1.0 / 6.0);
}
float textureBicubic(sampler2D t, vec2 uv) {
  vec2 ts = vec2(textureSize(t, 0)); vec2 inv = 1.0 / ts;
  uv = uv * ts - 0.5; vec2 f = fract(uv); uv -= f;
  vec4 xc = cubic(f.x), yc = cubic(f.y);
  vec4 c = uv.xxyy + vec2(-0.5, 1.5).xyxy;
  vec4 s = vec4(xc.xz + xc.yw, yc.xz + yc.yw);
  vec4 off = c + vec4(xc.yw, yc.yw) / s;
  off *= inv.xxyy;
  float s0 = texture(t, off.xz).r, s1 = texture(t, off.yz).r, s2 = texture(t, off.xw).r, s3 = texture(t, off.yw).r;
  float sx = s.x / (s.x + s.y), sy = s.z / (s.z + s.w);
  return mix(mix(s3, s2, sx), mix(s1, s0, sx), sy);
}
// глиф из SDF-текстуры: p — координаты, size — сторона квадрата, в который вписан глиф
float sd2Glyph(vec2 p, float size) {
  vec2 uv = p / size + 0.5;
  vec2 o = max(abs(p / size) - 0.5, 0.);
  float outside = length(o) * size;
  float d = textureBicubic(uGlyph, clamp(uv, 0.002, 0.998)) * size;
  return outside > 0. ? outside + GLYPH_RANGE * size : d;
}
// выдавливание 2D-фигуры вдоль Z с полутолщиной h и скруглением r
float extrude(vec3 p, float d2, float h, float r) {
  vec2 w = vec2(d2 + r, abs(p.z) - h + r);
  return min(max(w.x, w.y), 0.) + length(max(w, 0.)) - r;
}
float smin(float a, float b, float k) { float h = clamp(.5 + .5 * (b - a) / k, 0., 1.); return mix(b, a, h) - k * h * (1. - h); }
vec2 U(vec2 a, float d, float m) { return d < a.x ? vec2(d, m) : a; }

// Повторяющиеся детали
// лист бумаги в плоскости XY, толщина t, со строками (возвращает лист; строки — отдельно)
float paper(vec3 p, vec2 size, float t) { return sdRBox(p, vec3(size, t), 0.03); }
float lines(vec3 p, vec2 size, float t, float n, float gap) {
  float d = 1e9;
  for (float i = 0.; i < 6.; i++) {
    if (i >= n) break;
    float y = size.y - 0.32 - i * gap;
    float w = (i == n - 1.) ? size.x * 0.45 : size.x * 0.72;
    d = min(d, sdRBox(p - vec3(-size.x * 0.72 + w, y, t), vec3(w, 0.035, 0.018), 0.017));
  }
  return d;
}

vec2 map(vec3 p) {
  vec2 r = vec2(1e9, 0.);
  /*ICON*/
  return r;
}

vec3 calcNormal(vec3 p) {
  const float h = 0.0006;
  const vec2 k = vec2(1, -1);
  return normalize(k.xyy * map(p + k.xyy * h).x + k.yyx * map(p + k.yyx * h).x +
                   k.yxy * map(p + k.yxy * h).x + k.xxx * map(p + k.xxx * h).x);
}

float softShadow(vec3 ro, vec3 rd, float k) {
  float res = 1., t = 0.02;
  for (int i = 0; i < 70; i++) {
    float h = map(ro + rd * t).x;
    res = min(res, k * h / t);
    t += clamp(h, 0.01, 0.2);
    if (res < 0.002 || t > 6.) break;
  }
  return clamp(res, 0., 1.);
}

float calcAO(vec3 p, vec3 n) {
  float occ = 0., sca = 1.;
  for (int i = 0; i < 5; i++) {
    float h = 0.015 + 0.09 * float(i);
    occ += (h - map(p + n * h).x) * sca;
    sca *= 0.82;
  }
  return clamp(1. - 2.2 * occ, 0., 1.);
}

vec3 srgb2lin(vec3 c) { return pow(c, vec3(2.2)); }

// Студийное окружение: тёплый верх, бордовый низ и софтбокс для бликов на металле
vec3 env(vec3 d) {
  float y = d.y;
  vec3 top = vec3(1.0, 0.93, 0.86);
  vec3 hor = vec3(0.72, 0.56, 0.52);
  vec3 bot = vec3(0.16, 0.05, 0.07);
  vec3 c = y > 0. ? mix(hor, top, pow(y, 0.6)) : mix(hor, bot, pow(-y, 0.5));
  vec3 sb = normalize(vec3(-0.55, 0.75, 0.45));
  c += vec3(2.6, 2.4, 2.2) * pow(max(dot(d, sb), 0.), 60.);
  vec3 sb2 = normalize(vec3(0.85, 0.35, 0.25));
  c += vec3(0.9, 0.7, 0.6) * pow(max(dot(d, sb2), 0.), 30.);
  return c;
}

float ggx(float NoH, float a) { float a2 = a * a; float d = NoH * NoH * (a2 - 1.) + 1.; return a2 / (PI * d * d); }

vec3 shade(vec3 p, vec3 rd, float m) {
  vec3 n = calcNormal(p);
  vec3 alb; float rough; float metal = 0.;
  if (m == M_ENAMEL) { alb = srgb2lin(vec3(0.36, 0.13, 0.18)); rough = 0.3; }
  else if (m == M_GOLD) { alb = srgb2lin(vec3(0.89, 0.76, 0.55)); rough = 0.26; metal = 1.; }
  else if (m == M_CREAM) { alb = srgb2lin(vec3(0.973, 0.953, 0.933)); rough = 0.55; }
  else if (m == M_DEEP) { alb = srgb2lin(vec3(0.27, 0.105, 0.145)); rough = 0.34; }
  else if (m == M_INK) { alb = srgb2lin(vec3(0.33, 0.20, 0.24)); rough = 0.6; }
  else { alb = srgb2lin(vec3(0.80, 0.86, 0.92)); rough = 0.05; }
  float ao = calcAO(p, n);
  vec3 v = -rd;
  vec3 f0 = mix(vec3(0.045), alb, metal);
  float NoV = max(dot(n, v), 1e-3);
  vec3 F = f0 + (1. - f0) * pow(1. - NoV, 5.);
  vec3 col = vec3(0.);
  // источники: ключевой, заполняющий, контровой
  vec3 L[3]; vec3 C[3];
  L[0] = normalize(vec3(-0.6, 0.95, 0.55)); C[0] = vec3(2.5, 2.35, 2.2);
  L[1] = normalize(vec3(0.9, 0.35, 0.35)); C[1] = vec3(0.55, 0.42, 0.40);
  L[2] = normalize(vec3(0.25, 0.55, -1.0)); C[2] = vec3(1.1, 0.9, 0.8);
  for (int i = 0; i < 3; i++) {
    float NoL = max(dot(n, L[i]), 0.);
    if (NoL <= 0.) continue;
    float sh = i == 0 ? softShadow(p + n * 0.003, L[i], 10.) : 1.;
    vec3 h = normalize(L[i] + v);
    float D = ggx(max(dot(n, h), 0.), rough * rough);
    vec3 spec = D * F * 0.25 / max(NoV, 0.2);
    vec3 diff = alb * (1. - metal) / PI;
    col += (diff + spec) * C[i] * NoL * sh * PI;
  }
  // окружение: рассеянное + отражения
  vec3 refl = reflect(rd, n);
  col += alb * (1. - metal) * env(n) * 0.35 * ao;
  float envSpec = mix(1., 0.35, rough);
  col += env(refl) * F * envSpec * ao * (metal > 0.5 ? 1.0 : 0.55);
  return col;
}

vec3 aces(vec3 x) { return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0., 1.); }

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
  vec3 ta = vec3(0.0, -0.05, 0.0);
  vec3 ro = ta + 9.0 * vec3(cos(uPitch) * sin(uYaw), sin(uPitch), cos(uPitch) * cos(uYaw));
  vec3 ww = normalize(ta - ro);
  vec3 uu = normalize(cross(ww, vec3(0, 1, 0)));
  vec3 vv = cross(uu, ww);
  vec3 rd = normalize(uv.x * uu + uv.y * vv + uZoom * ww);

  float t = 0.; vec2 h = vec2(0.); bool hit = false;
  for (int i = 0; i < 220; i++) {
    vec3 pos = ro + rd * t;
    h = map(pos);
    if (h.x < 0.0007 * t) { hit = true; break; }
    t += h.x * 0.9;
    if (t > 20.) break;
  }
  if (hit) {
    vec3 c = shade(ro + rd * t, rd, h.y);
    c = aces(c * 0.9);
    frag = vec4(pow(c, vec3(1. / 2.2)), 1.);
    return;
  }
  // невидимая плоскость пола ловит мягкую тень
  float tp = (uGround - ro.y) / rd.y;
  if (rd.y < 0. && tp > 0.) {
    vec3 pp = ro + rd * tp;
    float sh = softShadow(pp + vec3(0, 0.001, 0), normalize(vec3(-0.6, 0.95, 0.55)), 6.);
    float occ = 0.;
    for (int i = 0; i < 4; i++) { float hh = 0.06 + 0.12 * float(i); occ += max(0., hh - map(pp + vec3(0, hh, 0)).x) / hh; }
    float a = clamp((1. - sh) * 0.32 + occ * 0.16, 0., 0.6);
    // тень плавно затухает к краям кадра — без видимого прямоугольника
    a *= 1. - smoothstep(0.9, 1.75, length(pp.xz));
    a *= 1. - smoothstep(0.32, 0.48, max(abs(uv.x), abs(uv.y)));
    vec3 sc = vec3(0.20, 0.08, 0.10);
    frag = vec4(sc * a, a);
    return;
  }
  frag = vec4(0.);
}
