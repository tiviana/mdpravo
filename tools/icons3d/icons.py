"""SDF-модели 3D-иконок. Каждая модель — фрагмент GLSL, который дополняет `r` через U(r, d, MAT).

Координаты: Y вверх, пол на y = -1. Объект укладывается примерно в куб [-1.1, 1.1].
Материалы: M_ENAMEL (бордовая эмаль), M_DEEP (тёмный бордовый), M_GOLD (песочное золото),
M_CREAM (фарфор/бумага), M_INK (строки), M_GLASS (стекло лупы).
"""

# Повторно используемые детали ------------------------------------------------
DOC = """
  // документ: лист со строками
  {{ vec3 q = (p - vec3({x}, {y}, {z})); q.xz *= rot({ry}); q.yz *= rot({rx});
    r = U(r, paper(q, vec2({w}, {h}), 0.05), M_CREAM);
    r = U(r, lines(q, vec2({w}, {h}), 0.05, {n}, 0.24), M_INK); }}
"""


def doc(x=0, y=0, z=0, w=0.62, h=0.8, n=4, rx=0, ry=0):
    f = lambda v: f"{float(v):.4f}"
    return DOC.format(x=f(x), y=f(y), z=f(z), w=f(w), h=f(h), n=f(n), rx=f(rx), ry=f(ry))


COIN = """
  {{ vec3 q = p - vec3({x}, {y}, {z});
    float c = sdRCyl(q, 0.42, 0.075, 0.03);
    c = max(c, -sdRCyl(q - vec3(0, 0.075, 0), 0.32, 0.02, 0.01));
    r = U(r, c, M_GOLD); }}
"""


def coin(x, y, z):
    f = lambda v: f"{float(v):.4f}"
    return COIN.format(x=f(x), y=f(y), z=f(z))


import os as _os

_HERE = _os.path.dirname(_os.path.abspath(__file__))
LORA = "/usr/share/fonts/truetype/google-fonts/Lora-Variable.ttf"
ONEST = _os.path.join(_HERE, "../brand/src-fonts/Onest.ttf")

# Глифы для иконок: имя → (символ, шрифт, насыщенность)
GLYPHS = {
    "criminal-law": ("§", LORA, 700),
    "debt-collection": ("₽", ONEST, 700),
}

ICONS = {}

# ── Направления ────────────────────────────────────────────────────────────
ICONS["criminal-law"] = """
  // эмалевая плашка с золотым параграфом § (глиф Lora Bold)
  vec3 q = p - vec3(0, 0.05, 0);
  r = U(r, sdRBox(q, vec3(0.92, 0.92, 0.16), 0.22), M_ENAMEL);
  float sect = sd2Glyph(q.xy, 1.6);
  r = U(r, extrude(q - vec3(0, 0, 0.2), sect, 0.07, 0.02), M_GOLD);
  r = U(r, sdRCyl(p - vec3(0, -0.98, 0), 1.0, 0.03, 0.02), M_DEEP);
"""

ICONS["public-authorities"] = """
  // портик: ступени, колонны, архитрав, золотой фронтон (как в логотипе)
  r = U(r, sdRBox(p - vec3(0, -0.93, 0), vec3(1.05, 0.07, 0.62), 0.03), M_DEEP);
  r = U(r, sdRBox(p - vec3(0, -0.8, 0), vec3(0.95, 0.06, 0.55), 0.03), M_ENAMEL);
  for (float i = 0.; i < 4.; i++) {
    float x = -0.66 + i * 0.44;
    r = U(r, sdRCyl(p - vec3(x, -0.18, 0.1), 0.12, 0.56, 0.02), M_CREAM);
    r = U(r, sdRBox(p - vec3(x, 0.4, 0.1), vec3(0.17, 0.035, 0.17), 0.015), M_CREAM);
  }
  r = U(r, sdRBox(p - vec3(0, 0.5, 0.05), vec3(0.95, 0.09, 0.5), 0.03), M_ENAMEL);
  vec3 q = p - vec3(0, 0.6, 0.05);
  float tri = sd2Tri(q.xy, vec2(-1.0, 0.0), vec2(1.0, 0.0), vec2(0.0, 0.5));
  r = U(r, extrude(q, tri, 0.48, 0.03), M_GOLD);
"""

ICONS["real-estate-construction"] = """
  // два корпуса со стеклом и золотыми карнизами
  vec3 a = p - vec3(-0.35, -0.2, 0);
  float b1 = sdRBox(a, vec3(0.42, 0.8, 0.42), 0.05);
  vec3 g = a; g.y = mod(g.y + 0.1, 0.32) - 0.16; g.x = abs(g.x);
  float win = sdBox(g - vec3(0.2, 0, 0.42), vec3(0.11, 0.08, 0.05));
  win = max(win, abs(a.y + 0.05) - 0.62);
  r = U(r, max(b1, -win), M_ENAMEL);
  r = U(r, max(sdBox(a - vec3(0, 0, 0.38), vec3(0.41, 0.79, 0.02)), win + 0.012), M_GLASS);
  r = U(r, sdRBox(a - vec3(0, 0.82, 0), vec3(0.46, 0.04, 0.46), 0.02), M_GOLD);
  vec3 c = p - vec3(0.5, -0.45, 0.15);
  r = U(r, sdRBox(c, vec3(0.36, 0.55, 0.36), 0.05), M_CREAM);
  vec3 g2 = c; g2.y = mod(g2.y + 0.1, 0.3) - 0.15; g2.x = abs(g2.x);
  float w2 = max(sdBox(g2 - vec3(0.15, 0, 0.36), vec3(0.09, 0.07, 0.03)), abs(c.y + 0.02) - 0.42);
  r = U(r, w2, M_DEEP);
  r = U(r, sdRBox(c - vec3(0, 0.57, 0), vec3(0.4, 0.035, 0.4), 0.02), M_GOLD);
"""

ICONS["debt-collection"] = (
    "  // стопка монет и расписка\n"
    + doc(x=-0.32, y=0.05, z=-0.25, w=0.55, h=0.75, n=4, ry=0.25)
    + coin(0.35, -0.9, 0.25)
    + coin(0.37, -0.74, 0.25)
    + coin(0.33, -0.58, 0.25)
    + coin(0.36, -0.42, 0.25)
    + coin(0.34, -0.26, 0.25)
    + """
  { vec3 q = p - vec3(0.34, -0.26 + 0.07, 0.25);
    float rub = sd2Glyph(vec2(q.x, -q.z), 0.42);
    r = U(r, extrude(q.xzy - vec3(0, 0, 0.02), rub, 0.03, 0.008), M_DEEP); }
"""
    + """
  r = U(r, sdRCyl(p - vec3(0.36, -1.0, 0.25), 0.5, 0.02, 0.015), M_DEEP);
"""
)

ICONS["land-disputes"] = """
  // сложенная карта и золотая метка
  for (float i = 0.; i < 3.; i++) {
    vec3 q = p - vec3(-0.66 + i * 0.66, -0.88, 0.05);
    q.xy *= rot((mod(i, 2.) < 0.5 ? 1. : -1.) * 0.14);
    r = U(r, sdRBox(q, vec3(0.32, 0.03, 0.75), 0.02), mod(i, 2.) < 0.5 ? M_CREAM : M_ENAMEL);
  }
  vec3 q = p - vec3(0.05, 0.12, 0.1);
  float head = sdSphere(q - vec3(0, 0.35, 0), 0.42);
  vec2 cs = vec2(length(q.xz), q.y + 0.85);
  float cone = max(dot(normalize(vec2(1.0, -0.36)), cs - vec2(0., 0.)) , -q.y - 0.85);
  float pin = smin(head, max(cone, q.y - 0.35), 0.18);
  r = U(r, pin, M_GOLD);
  r = U(r, sdSphere(q - vec3(0, 0.38, 0.33), 0.15), M_ENAMEL);
"""

ICONS["housing-disputes"] = """
  // дом и золотой ключ
  vec3 h = p - vec3(-0.18, -0.38, -0.1);
  r = U(r, sdRBox(h, vec3(0.62, 0.55, 0.55), 0.06), M_CREAM);
  vec3 rf = h - vec3(0, 0.55, 0);
  float roof = extrude(rf.zyx, sd2Tri(rf.zy, vec2(-0.72, 0.0), vec2(0.72, 0.0), vec2(0.0, 0.55)), 0.7, 0.04);
  r = U(r, roof, M_ENAMEL);
  r = U(r, sdRBox(h - vec3(0, -0.2, 0.55), vec3(0.17, 0.32, 0.04), 0.03), M_DEEP);
  vec3 w = h - vec3(0.62, 0.05, 0); w.z = abs(w.z) - 0.25;
  r = U(r, sdRBox(w, vec3(0.03, 0.14, 0.12), 0.02), M_GLASS);
  vec3 k = p - vec3(0.62, -0.62, 0.62); k.xy *= rot(-0.5); k.yz *= rot(0.25);
  float ring = sdTorus(k.xzy - vec3(0, 0, 0), vec2(0.2, 0.065));
  float shaft = sdRBox(k - vec3(0.55, 0, 0), vec3(0.38, 0.06, 0.05), 0.02);
  float teeth = sdRBox(k - vec3(0.72, -0.12, 0), vec3(0.05, 0.1, 0.045), 0.015);
  teeth = min(teeth, sdRBox(k - vec3(0.86, -0.1, 0), vec3(0.04, 0.08, 0.045), 0.015));
  r = U(r, min(min(ring, shaft), teeth), M_GOLD);
"""

ICONS["labor-law"] = """
  // портфель
  vec3 q = p - vec3(0, -0.35, 0);
  r = U(r, sdRBox(q, vec3(0.95, 0.62, 0.38), 0.14), M_ENAMEL);
  r = U(r, sdRBox(q - vec3(0, 0.12, 0), vec3(0.97, 0.035, 0.4), 0.02), M_DEEP);
  vec3 hnd = q - vec3(0, 0.72, 0);
  float handle = max(sdTorus(hnd.xzy, vec2(0.3, 0.07)), -hnd.y);
  r = U(r, handle, M_DEEP);
  r = U(r, sdRBox(q - vec3(0, 0.12, 0.4), vec3(0.16, 0.12, 0.05), 0.03), M_GOLD);
  vec3 f = q - vec3(0, -0.62, 0); f.x = abs(f.x) - 0.7;
  r = U(r, sdRCyl(f, 0.06, 0.05, 0.02), M_GOLD);
"""

ICONS["personal-data"] = """
  // щит с замком
  vec3 q = p - vec3(0, 0.0, 0);
  vec2 s = q.xy;
  float shield = sd2Box(s - vec2(0, 0.35), vec2(0.72, 0.55));
  float tip = sd2Tri(s, vec2(-0.72, -0.2), vec2(0.72, -0.2), vec2(0.0, -1.0));
  float sh2 = smin(shield, tip, 0.35);
  r = U(r, extrude(q, sh2, 0.16, 0.05), M_ENAMEL);
  r = U(r, extrude(q - vec3(0, 0, 0.17), abs(sh2 + 0.06) - 0.03, 0.02, 0.012), M_GOLD);
  vec3 l = q - vec3(0, 0.05, 0.3);
  r = U(r, sdRBox(l, vec3(0.3, 0.24, 0.1), 0.06), M_GOLD);
  vec3 sk = l - vec3(0, 0.26, 0);
  r = U(r, max(sdTorus(sk.xzy, vec2(0.19, 0.055)), -sk.y), M_GOLD);
  r = U(r, sdRBox(l - vec3(0, -0.02, 0.1), vec3(0.04, 0.09, 0.02), 0.015), M_DEEP);
"""

ICONS["consumer-protection"] = """
  // пакет покупок и золотой щит с галочкой
  vec3 q = p - vec3(-0.15, -0.35, 0);
  r = U(r, sdRBox(q, vec3(0.62, 0.65, 0.32), 0.07), M_ENAMEL);
  vec3 h2 = q - vec3(0, 0.65, 0);
  float handle = max(sdTorus(h2.xzy, vec2(0.28, 0.045)), -h2.y);
  r = U(r, handle, M_DEEP);
  vec3 sq = p - vec3(0.55, -0.5, 0.45);
  float shield = smin(sd2Box(sq.xy - vec2(0, 0.12), vec2(0.36, 0.28)), sd2Tri(sq.xy, vec2(-0.36, -0.05), vec2(0.36, -0.05), vec2(0.0, -0.5)), 0.2);
  r = U(r, extrude(sq, shield, 0.1, 0.04), M_GOLD);
  float tick = min(sd2Seg(sq.xy, vec2(-0.16, 0.0), vec2(-0.04, -0.13)), sd2Seg(sq.xy, vec2(-0.04, -0.13), vec2(0.18, 0.15))) - 0.05;
  r = U(r, extrude(sq - vec3(0, 0, 0.11), tick, 0.03, 0.015), M_DEEP);
"""

ICONS["family-disputes"] = """
  // две фигуры и золотое сердце
  vec3 a = p - vec3(-0.42, -0.3, -0.1);
  r = U(r, sdSphere(a - vec3(0, 0.62, 0), 0.24), M_ENAMEL);
  r = U(r, sdRBox(a - vec3(0, -0.15, 0), vec3(0.32, 0.45, 0.22), 0.2), M_ENAMEL);
  vec3 b = p - vec3(0.38, -0.42, -0.1);
  r = U(r, sdSphere(b - vec3(0, 0.45, 0), 0.2), M_CREAM);
  r = U(r, sdRBox(b - vec3(0, -0.2, 0), vec3(0.27, 0.36, 0.2), 0.18), M_CREAM);
  vec3 h = p - vec3(0.0, -0.45, 0.42);
  float heart = sd2Heart((h.xy + vec2(0, 0.42)) / 0.65) * 0.65;
  r = U(r, extrude(h, heart, 0.12, 0.08), M_GOLD);
  r = U(r, sdRCyl(p - vec3(0, -1.0, 0), 0.95, 0.02, 0.015), M_DEEP);
"""

ICONS["inheritance-disputes"] = """
  // свиток с золотой печатью и лентой
  vec3 q = p - vec3(0, 0, 0); q.xy *= rot(0.0);
  r = U(r, paper(q - vec3(0, 0.05, 0), vec2(0.6, 0.78), 0.04), M_CREAM);
  r = U(r, lines(q - vec3(0, 0.05, 0), vec2(0.6, 0.78), 0.04, 4., 0.22), M_INK);
  r = U(r, sdRCyl((q - vec3(0, 0.86, 0.06)).yxz, 0.13, 0.68, 0.06), M_CREAM);
  r = U(r, sdRCyl((q - vec3(0, -0.78, 0.06)).yxz, 0.13, 0.68, 0.06), M_CREAM);
  vec3 s = q - vec3(0.35, -0.48, 0.16);
  float rib = min(sdRBox((s - vec3(-0.1, -0.3, -0.03)) * vec3(1,1,1), vec3(0.07, 0.22, 0.015), 0.01),
                  sdRBox(s - vec3(0.1, -0.3, -0.03), vec3(0.07, 0.22, 0.015), 0.01));
  r = U(r, rib, M_ENAMEL);
  vec3 sc = s.xzy;
  float seal = sdRCyl(sc, 0.28, 0.06, 0.03);
  float ang = atan(s.y, s.x);
  seal -= 0.012 * smoothstep(0.2, 0.28, length(s.xy)) * sin(ang * 16.);
  r = U(r, seal, M_GOLD);
  r = U(r, sdRCyl(sc - vec3(0, 0.06, 0), 0.15, 0.02, 0.01), M_DEEP);
"""

ICONS["digital-law"] = """
  // монитор с кодом и золотой замок
  vec3 q = p - vec3(-0.12, 0.05, -0.15);
  r = U(r, sdRBox(q, vec3(0.88, 0.58, 0.07), 0.05), M_DEEP);
  r = U(r, sdRBox(q - vec3(0, 0, 0.06), vec3(0.78, 0.48, 0.02), 0.02), M_ENAMEL);
  vec2 s = q.xy;
  float code = min(min(sd2Seg(s, vec2(-0.42, 0.0), vec2(-0.26, 0.14)), sd2Seg(s, vec2(-0.42, 0.0), vec2(-0.26, -0.14))),
                   min(sd2Seg(s, vec2(0.42, 0.0), vec2(0.26, 0.14)), sd2Seg(s, vec2(0.42, 0.0), vec2(0.26, -0.14))));
  code = min(code, sd2Seg(s, vec2(0.08, 0.2), vec2(-0.08, -0.2))) - 0.035;
  r = U(r, extrude(q - vec3(0, 0, 0.09), code, 0.02, 0.012), M_GOLD);
  r = U(r, sdRBox(q - vec3(0, -0.72, 0), vec3(0.08, 0.16, 0.05), 0.03), M_DEEP);
  r = U(r, sdRBox(q - vec3(0, -0.9, 0.05), vec3(0.38, 0.04, 0.22), 0.03), M_DEEP);
  vec3 l = p - vec3(0.62, -0.55, 0.45);
  r = U(r, sdRBox(l, vec3(0.26, 0.21, 0.12), 0.06), M_GOLD);
  vec3 sk = l - vec3(0, 0.22, 0);
  r = U(r, max(sdTorus(sk.xzy, vec2(0.16, 0.05)), -sk.y), M_GOLD);
  r = U(r, sdRCyl((l - vec3(0, 0, 0.12)).xzy, 0.05, 0.02, 0.01), M_DEEP);
"""

ICONS["military-law"] = """
  // медаль: звезда на эмалевом круге и лента
  vec3 q = p - vec3(0, -0.25, 0.05);
  r = U(r, sdRCyl(q.xzy, 0.62, 0.09, 0.04), M_GOLD);
  r = U(r, sdRCyl((q - vec3(0, 0, 0.08)).xzy, 0.52, 0.03, 0.02), M_ENAMEL);
  float star = sd2Star5(q.xy, 0.42, 0.45);
  r = U(r, extrude(q - vec3(0, 0, 0.13), star, 0.05, 0.03), M_GOLD);
  vec3 rb = p - vec3(0, 0.58, -0.06);
  float tape = sd2Box(rb.xy, vec2(0.36, 0.4));
  tape = max(tape, -sd2Tri(rb.xy, vec2(-0.37, -0.41), vec2(0.37, -0.41), vec2(0.0, -0.12)));
  r = U(r, extrude(rb, tape, 0.035, 0.02), M_ENAMEL);
  r = U(r, extrude(rb - vec3(0, 0, 0.03), max(abs(rb.x) - 0.07, tape), 0.015, 0.01), M_GOLD);
  r = U(r, sdRBox(rb - vec3(0, 0.42, 0), vec3(0.4, 0.06, 0.06), 0.03), M_GOLD);
"""

# ── Этапы работы ───────────────────────────────────────────────────────────
ICONS["step-1"] = """
  // облачко сообщения со строками
  vec3 q = p - vec3(0, 0.05, 0);
  float b = sd2RBox(q.xy, vec2(0.95, 0.62), 0.3);
  b = smin(b, sd2Tri(q.xy, vec2(-0.55, -0.4), vec2(-0.15, -0.4), vec2(-0.7, -0.95)), 0.05);
  r = U(r, extrude(q, b, 0.2, 0.08), M_ENAMEL);
  for (float i = 0.; i < 3.; i++) {
    float w = i == 2. ? 0.3 : 0.55;
    r = U(r, sdRBox(q - vec3(-0.55 + w, 0.28 - i * 0.26, 0.21), vec3(w, 0.05, 0.03), 0.025), i == 0. ? M_GOLD : M_CREAM);
  }
"""

ICONS["step-2"] = (
    doc(x=-0.15, y=0.0, z=-0.2, w=0.6, h=0.82, n=5)
    + """
  // лупа
  vec3 m = p - vec3(0.3, -0.1, 0.35); m.xy *= rot(0.0);
  vec3 mr = m.xzy;
  r = U(r, sdTorus(mr, vec2(0.38, 0.07)), M_GOLD);
  r = U(r, sdRCyl(mr, 0.33, 0.015, 0.01), M_GLASS);
  r = U(r, sdCapsule(m, vec3(0.3, -0.3, 0), vec3(0.72, -0.78, 0), 0.085), M_DEEP);
"""
)

ICONS["step-3"] = (
    doc(x=-0.2, y=-0.05, z=-0.15, w=0.62, h=0.82, n=3)
    + """
  // ручка подписывает документ
  vec3 pen = p - vec3(0.25, -0.1, 0.3); pen.xy *= rot(-0.75);
  r = U(r, sdRCyl(pen, 0.1, 0.62, 0.05), M_ENAMEL);
  r = U(r, sdRCyl(pen - vec3(0, 0.45, 0), 0.105, 0.05, 0.02), M_GOLD);
  float tip = max(length(pen.xz) - (0.1 * clamp((pen.y + 0.95) / 0.33, 0., 1.)), max(pen.y + 0.62, -pen.y - 0.95));
  r = U(r, tip, M_GOLD);
  r = U(r, sdRBox(pen - vec3(0.09, 0.2, 0), vec3(0.025, 0.28, 0.03), 0.012), M_GOLD);
  // строка подписи
  r = U(r, sdRBox(p - vec3(-0.35, -0.62, -0.08), vec3(0.28, 0.025, 0.02), 0.012), M_GOLD);
"""
)

ICONS["step-4"] = (
    doc(x=0.1, y=0.12, z=-0.35, w=0.58, h=0.78, n=4, ry=0.1)
    + doc(x=-0.12, y=-0.02, z=-0.1, w=0.58, h=0.78, n=4)
    + """
  // золотой знак «готово»
  vec3 c = p - vec3(0.42, -0.5, 0.25);
  r = U(r, sdRCyl(c.xzy, 0.36, 0.09, 0.05), M_GOLD);
  float tick = min(sd2Seg(c.xy, vec2(-0.15, 0.0), vec2(-0.03, -0.13)), sd2Seg(c.xy, vec2(-0.03, -0.13), vec2(0.17, 0.12))) - 0.05;
  r = U(r, extrude(c - vec3(0, 0, 0.1), tick, 0.03, 0.015), M_DEEP);
"""
)

# ── Ценности ───────────────────────────────────────────────────────────────
ICONS["value-analysis"] = (
    doc(x=-0.3, y=0.12, z=-0.4, w=0.5, h=0.68, n=3, ry=0.2)
    + doc(x=-0.05, y=-0.02, z=-0.1, w=0.55, h=0.75, n=4)
    + """
  vec3 m = p - vec3(0.32, -0.05, 0.4);
  r = U(r, sdTorus(m.xzy, vec2(0.36, 0.075)), M_GOLD);
  r = U(r, sdRCyl(m.xzy, 0.31, 0.015, 0.01), M_GLASS);
  r = U(r, sdCapsule(m, vec3(0.28, -0.28, 0), vec3(0.7, -0.75, 0), 0.085), M_ENAMEL);
"""
)

ICONS["value-risk"] = """
  // шкала-индикатор со стрелкой
  vec3 q = p - vec3(0, -0.35, 0);
  float dial = sd2Arc(q.xy, vec2(sin(1.35), cos(1.35)), 0.78, 0.13);
  r = U(r, extrude(q, dial, 0.16, 0.06), M_ENAMEL);
  float seg = sd2Arc(rot(-0.95) * q.xy, vec2(sin(0.4), cos(0.4)), 0.78, 0.135);
  r = U(r, extrude(q - vec3(0, 0, 0.005), seg, 0.17, 0.06), M_GOLD);
  vec3 n = q; n.xy *= rot(-0.55);
  r = U(r, sdCapsule(n, vec3(0, 0, 0.18), vec3(0, 0.62, 0.18), 0.045), M_DEEP);
  r = U(r, sdRCyl((q - vec3(0, 0, 0.18)).xzy, 0.13, 0.07, 0.03), M_GOLD);
  r = U(r, sdRBox(q - vec3(0, -0.62, 0), vec3(0.98, 0.05, 0.36), 0.04), M_CREAM);
"""

ICONS["value-position"] = """
  // шахматная ладья — сильная позиция
  vec3 q = p - vec3(0, -0.05, 0);
  float base = sdRCyl(q - vec3(0, -0.85, 0), 0.62, 0.12, 0.05);
  base = smin(base, sdRCyl(q - vec3(0, -0.68, 0), 0.5, 0.08, 0.04), 0.06);
  float bodyR = 0.34 + 0.08 * smoothstep(0.2, -0.6, q.y);
  float body = max(length(q.xz) - bodyR, abs(q.y + 0.1) - 0.55) ;
  float top = sdRCyl(q - vec3(0, 0.55, 0), 0.48, 0.16, 0.04);
  float a = atan(q.z, q.x);
  top = max(top, -max(sdBox(vec3((mod(a + 0.31, 1.2566) - 0.628) * 0.48, q.y - 0.72, 0.), vec3(0.06, 0.1, 1.)), 0.));
  float rook = smin(smin(base, body - 0.02, 0.12), top, 0.1);
  r = U(r, rook, M_ENAMEL);
  r = U(r, sdTorus(q - vec3(0, 0.37, 0), vec2(0.45, 0.04)), M_GOLD);
  r = U(r, sdTorus(q - vec3(0, -0.56, 0), vec2(0.45, 0.04)), M_GOLD);
"""

ICONS["value-documents"] = (
    doc(x=0.18, y=0.15, z=-0.45, w=0.55, h=0.75, n=4, ry=0.18)
    + doc(x=0.0, y=0.05, z=-0.25, w=0.55, h=0.75, n=4, ry=0.08)
    + """
  // документ с чек-листом
  vec3 q = p - vec3(-0.15, -0.05, -0.02);
  r = U(r, paper(q, vec2(0.6, 0.8), 0.05), M_CREAM);
  for (float i = 0.; i < 3.; i++) {
    vec3 c = q - vec3(-0.35, 0.42 - i * 0.36, 0.06);
    float tick = min(sd2Seg(c.xy, vec2(-0.08, 0.0), vec2(-0.02, -0.07)), sd2Seg(c.xy, vec2(-0.02, -0.07), vec2(0.09, 0.07))) - 0.03;
    r = U(r, extrude(c, tick, 0.02, 0.012), M_GOLD);
    r = U(r, sdRBox(q - vec3(0.12, 0.42 - i * 0.36, 0.06), vec3(0.3, 0.04, 0.02), 0.018), M_INK);
  }
"""
)
