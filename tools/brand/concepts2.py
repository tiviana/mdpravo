"""Second round of logo concepts: legal, restrained, works with the youthful site.

usage: python3 concepts2.py <out_dir>   → logo-concepts-v2.html (+ shot.py for PNG)
"""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
from fontTools.pens.boundsPen import BoundsPen  # noqa: E402
from textpath import cap_height, glyph_path, glyph_run, load_font, text_path  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
LORA = "/usr/share/fonts/truetype/google-fonts/Lora-Variable.ttf"
ONEST = os.path.join(HERE, "src-fonts/Onest.ttf")
UNB = os.path.join(HERE, "src-fonts/Unbounded.ttf")

NAVY, MILK, GOLD, INK = "#111827", "#F7F5F0", "#B49A68", "#20242C"


def poly(pts):
    return "M" + " L".join(f"{x:g} {y:g}" for x, y in pts) + " Z"


def rect(x0, y0, x1, y1):
    return poly([(x0, y0), (x1, y0), (x1, y1), (x0, y1)])


# ── A. Портик МП ───────────────────────────────────────────────────────────
def portico():
    """Фронтон (золото) + архитрав и две колонны (= П) + тонкие диагонали М + стилобат.

    Контраст толстых колонн и тонких диагоналей — как у антиквы: строго и элегантно.
    """
    return [
        (poly([(5, 14), (24, 5), (43, 14)]), "accent"),          # фронтон
        (rect(6, 16, 42, 20), "base"),                          # архитрав
        (rect(9, 20, 14.5, 39), "base"),                        # левая колонна
        (rect(33.5, 20, 39, 39), "base"),                       # правая колонна
        (poly([(14.5, 20), (17.8, 20), (24, 29), (30.2, 20), (33.5, 20),
               (33.5, 25.2), (24, 33.6), (14.5, 25.2)]), "base"),  # диагонали М
        (rect(5, 41, 43, 43), "base"),                          # стилобат
    ], (5, 5, 43, 43)


# ── B. Параграф ────────────────────────────────────────────────────────────
def _glyph_in_box(ch, font, wght, box):
    f = load_font(font, wght)
    name = f.getBestCmap()[ord(ch)]
    gs = f.getGlyphSet()
    bp = BoundsPen(gs)
    gs[name].draw(bp)
    x0, y0, x1, y1 = bp.bounds
    bx0, by0, bx1, by1 = box
    s = min((bx1 - bx0) / (x1 - x0), (by1 - by0) / (y1 - y0))
    w, h = (x1 - x0) * s, (y1 - y0) * s
    ox = bx0 + ((bx1 - bx0) - w) / 2 - x0 * s
    oy = by0 + ((by1 - by0) - h) / 2 + y1 * s
    return glyph_path(name, font, (s, 0, 0, -s, ox, oy), wght)


def paragraph():
    """§ — главный знак юриста. Антиквенный § из Lora внутри круга-печати."""
    ring = "M24 2 a22 22 0 1 0 0.001 0 Z"
    sect = _glyph_in_box("§", LORA, 700, (14, 9, 34, 39))
    # ring with the § knocked out; in colour the hole is filled with gold,
    # in one-colour versions the hole stays open so the § remains visible
    return [(ring + " " + sect, "base-evenodd"), (sect, "accent-hole")], (2, 2, 46, 46)


# ── C. Печать ──────────────────────────────────────────────────────────────
def seal():
    """Круглая печать: название по кругу, в центре портик МП в миниатюре."""
    parts = []
    parts.append(("M24 1 a23 23 0 1 0 0.001 0 Z M24 2.6 a21.4 21.4 0 1 1 -0.001 0 Z", "base-evenodd"))
    parts.append(("M24 14.2 a9.8 9.8 0 1 0 0.001 0 Z", "accent-ring"))
    text = "МОСДЕВЕЛОПМЕНТ • ПРАВО • "
    size = 4.4
    f = load_font(ONEST, 600)
    upem = f["head"].unitsPerEm
    run = glyph_run(text, ONEST, 600, tracking_em=0.18)
    total = sum(a for _, a in run) * size / upem
    r = 16.3
    circ = 2 * math.pi * r
    scale_fit = circ / total  # stretch tracking evenly around the circle
    s = size / upem
    acc = 0.0
    d = []
    for name, adv in run:
        w = adv * s * scale_fit
        glyph_w = f["hmtx"][name][0] * s
        theta = (acc + w / 2) / r - math.pi / 2  # start at top
        acc += w
        cx, cy = 24 + r * math.cos(theta), 24 + r * math.sin(theta)
        rot = theta + math.pi / 2
        cs, sn = math.cos(rot), math.sin(rot)
        # glyph origin at (-glyph_w/2, +capH/2) in local coords, y flipped
        lx, ly = -glyph_w / 2, cap_height(ONEST, size, 600) / 2
        e = cx + cs * lx - sn * ly
        fy = cy + sn * lx + cs * ly
        d.append(glyph_path(name, ONEST, (s * cs, s * sn, s * sn, -s * cs, e, fy), 600))
    parts.append((" ".join(d), "base"))
    mini, _ = portico()
    for pd, role in mini:
        parts.append((pd, role, "translate(15.6 15.6) scale(0.35)"))
    return parts, (1, 1, 47, 47)


def group(parts, base, accent, transform=""):
    out = [f'<g transform="{transform}">' if transform else "<g>"]
    for p in parts:
        d, role = p[0], p[1]
        tf = f' transform="{p[2]}"' if len(p) > 2 else ""
        if role == "accent-ring":
            out.append(f'<path d="{d}" fill="none" stroke="{accent}" stroke-width="0.8"{tf}/>')
            continue
        if role == "accent-hole" and accent == base:
            continue
        fill = accent if role.startswith("accent") else base
        rule = ' fill-rule="evenodd"' if role.endswith("evenodd") else ""
        out.append(f'<path d="{d}" fill="{fill}"{rule}{tf}/>')
    out.append("</g>")
    return "".join(out)


def wordmark(x, top, serif=True):
    if serif:
        c1, c2 = cap_height(LORA, 30, 560), cap_height(ONEST, 12.5, 600)
        b1 = top + c1
        b2 = b1 + 8 + c2
        d1, w1 = text_path("Мосдевелопмент", LORA, 30, x, b1, 0.005, 560)
        d2, w2 = text_path("ПРАВО", ONEST, 12.5, x + 0.6, b2, 0.42, 600)
    else:
        c1, c2 = cap_height(UNB, 19, 600), cap_height(ONEST, 12.5, 600)
        b1 = top + c1
        b2 = b1 + 9 + c2
        d1, w1 = text_path("МОСДЕВЕЛОПМЕНТ", UNB, 19, x, b1, 0.02, 600)
        d2, w2 = text_path("ПРАВО", ONEST, 12.5, x + 0.6, b2, 0.42, 600)
    return [d1, d2], max(w1, w2), b2 - top


def lockup(parts_fn, base, accent, text, serif=True, px=320):
    parts, (bx0, by0, bx1, by1) = parts_fn()
    _, _, bh = wordmark(0, 0, serif)
    sc = bh * 1.15 / (by1 - by0)  # mark slightly taller than the text block
    mh = (by1 - by0) * sc
    my = -(mh - bh) / 2
    tf = f"translate({-bx0 * sc:.3f} {my - by0 * sc:.3f}) scale({sc:.4f})"
    tx = (bx1 - bx0) * sc + bh * 0.5
    words, w, _ = wordmark(tx, 0, serif)
    body = group(parts, base, accent, tf) + "".join(f'<path d="{d}" fill="{text}"/>' for d in words)
    W, H = tx + w, mh
    vb = f"-3 {my - 3:.2f} {W + 6:.2f} {H + 6:.2f}"
    return f'<svg viewBox="{vb}" width="{px}" style="height:auto">{body}</svg>'


def mark(parts_fn, base, accent, px):
    parts, _ = parts_fn()
    return f'<svg viewBox="0 0 48 48" width="{px}" height="{px}">{group(parts, base, accent)}</svg>'


def app_icon(parts_fn, px):
    parts, _ = parts_fn()
    return (f'<svg viewBox="0 0 48 48" width="{px}" height="{px}"><rect width="48" height="48" rx="11" fill="{NAVY}"/>'
            f'{group(parts, MILK, GOLD, "translate(7.2 7.2) scale(0.7)")}</svg>')


CONCEPTS = [
    ("A", "Портик", portico, True,
     "Фронтон, архитрав и колонны складываются в «МП»: две колонны с архитравом — «П», тонкие диагонали между ними — «М». Образ здания суда без клише, контраст толстых и тонких штрихов как у классической антиквы."),
    ("B", "Параграф", paragraph, True,
     "§ — универсальный символ права, знакомый каждому. Антиквенный параграф золотом в тёмном круге: самый узнаваемый и самый «юридический» вариант, но менее уникальный."),
    ("C", "Печать", seal, False,
     "Круглая печать с названием по окружности и портиком в центре. Звучит официально и одновременно как стикер — хорошо для соцсетей и мерча; как основной логотип мелковат."),
]


def main(out):
    cols = []
    for key, title, fn, serif, note in CONCEPTS:
        header = (f'<div class="hdr"><span class="lg">{lockup(fn, MILK, GOLD, MILK, serif, 190)}</span>'
                  '<span class="nav">Услуги · База знаний · Цены</span><span class="cta">Консультация</span></div>')
        cols.append(f"""
<section>
  <h2>{key}. {title}</h2>
  <p class="note">{note}</p>
  <div class="tile light big">{mark(fn, NAVY, GOLD, 170)}</div>
  <div class="tile light">{lockup(fn, NAVY, GOLD, NAVY, serif, 330)}</div>
  <div class="tile dark">{lockup(fn, MILK, GOLD, MILK, serif, 330)}</div>
  <div class="tile dark slim">{header}</div>
  <div class="tile light sizes">{app_icon(fn, 64)}{mark(fn, NAVY, NAVY, 40)}{mark(fn, NAVY, NAVY, 24)}{mark(fn, NAVY, NAVY, 16)}
    <span class="dk">{mark(fn, MILK, GOLD, 32)}{mark(fn, MILK, MILK, 16)}</span></div>
</section>""")
    css = f"""
body{{margin:0;background:#E9E7E1;font:14px/1.5 Onest,system-ui,sans-serif;color:{INK}}}
main{{display:grid;grid-template-columns:repeat(3,1fr);gap:22px;padding:28px}}
h2{{font:700 18px Unbounded,system-ui;margin:0 0 6px}} .note{{margin:0 0 12px;color:#4b5261;min-height:84px}}
.tile{{border-radius:12px;padding:22px;margin-bottom:10px;display:flex;align-items:center;justify-content:center;min-height:110px}}
.big{{min-height:200px}} .light{{background:{MILK}}} .dark{{background:{NAVY}}} .slim{{min-height:0;padding:12px 16px}}
.sizes{{gap:16px;justify-content:flex-start;min-height:70px}}
.dk{{background:{NAVY};padding:8px 10px;border-radius:8px;display:flex;gap:10px;align-items:center}}
.hdr{{display:flex;align-items:center;gap:12px;width:100%}} .hdr .lg{{flex:none}}
.nav{{color:#B7BDC8;font-size:11px;flex:1;white-space:nowrap;overflow:hidden}} .cta{{background:{GOLD};color:{NAVY};border-radius:99px;padding:6px 10px;font-weight:600;font-size:11px}}
"""
    html = f'<!doctype html><meta charset="utf-8"><title>Логотип v2</title><style>{css}</style><main>{"".join(cols)}</main>'
    os.makedirs(out, exist_ok=True)
    p = os.path.join(out, "logo-concepts-v2.html")
    open(p, "w", encoding="utf-8").write(html)
    print(p)


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "out")
