"""Build the final logo kit from the chosen concept «Портик» (concepts2.portico).

usage: python3 build_kit.py <out_dir>
Every text is outlined, so the SVGs don't depend on installed fonts.
Paths carry data-role="base|accent|text" so other tools can recolour them.
"""
import io
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
from concepts2 import portico, wordmark  # noqa: E402

BRAND = "#542531"  # основной бордовый
MILK = "#F8F3EE"  # фон
WHITE = "#FFFFFF"
GOLD = "#C4A477"  # акцент
FULL_NAME = "Мосдевелопмент Право"

VARIANTS = {
    # suffix: (mark base, mark accent, text)
    "": (BRAND, GOLD, BRAND),            # основной — для светлых фонов
    "-inverse": (MILK, GOLD, MILK),    # для тёмных фонов
    "-mono-dark": (BRAND, BRAND, BRAND),  # одноцветный, светлые фоны, печать
    "-mono-light": (WHITE, WHITE, WHITE),  # одноцветный, тёмные фоны
}


def paths(parts, base, accent, transform=""):
    g = [f'<g transform="{transform}">' if transform else "<g>"]
    for d, role in parts:
        fill = accent if role == "accent" else base
        g.append(f'<path data-role="{role}" d="{d}" fill="{fill}"/>')
    g.append("</g>")
    return "".join(g)


def svg_doc(body, vb, w, h, title=FULL_NAME):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb}" width="{w:g}" height="{h:g}" '
            f'role="img" aria-labelledby="t"><title id="t">{title}</title>{body}</svg>\n')


def horizontal(base, accent, text):
    parts, (bx0, by0, bx1, by1) = portico()
    _, _, bh = wordmark(0, 0, True)
    sc = bh * 1.15 / (by1 - by0)          # знак чуть выше текстового блока
    mh = (by1 - by0) * sc
    my = -(mh - bh) / 2
    tf = f"translate({-bx0 * sc:.3f} {my - by0 * sc:.3f}) scale({sc:.4f})"
    tx = (bx1 - bx0) * sc + bh * 0.5
    words, w, _ = wordmark(tx, 0, True)
    body = paths(parts, base, accent, tf)
    body += "".join(f'<path data-role="text" d="{d}" fill="{text}"/>' for d in words)
    m = 2
    W, H = tx + w + 2 * m, mh + 2 * m
    return svg_doc(body, f"{-m} {my - m:.2f} {W:.2f} {H:.2f}", round(W, 2), round(H, 2)), (W, H)


def mark(base, accent):
    parts, _ = portico()
    return svg_doc(paths(parts, base, accent), "0 0 48 48", 48, 48, "Знак «Мосдевелопмент Право»")


def favicon():
    parts, _ = portico()
    body = (f'<rect width="48" height="48" rx="11" fill="{BRAND}"/>'
            + paths(parts, MILK, GOLD, "translate(6.7 6.7) scale(0.72)"))
    return svg_doc(body, "0 0 48 48", 48, 48)


def _poly(pts):
    return "M" + " L".join(f"{x:g} {y:g}" for x, y in pts) + " Z"


def favicon16():
    """Портик, вручную выровненный по пиксельной сетке 16×16."""
    parts = [
        (_poly([(1.5, 5), (8, 1.5), (14.5, 5)]), "accent"),
        (_poly([(2, 6), (14, 6), (14, 8), (2, 8)]), "base"),
        (_poly([(3, 8), (5, 8), (5, 13), (3, 13)]), "base"),
        (_poly([(11, 8), (13, 8), (13, 13), (11, 13)]), "base"),
        (_poly([(5, 8), (6.2, 8), (8, 10.4), (9.8, 8), (11, 8), (11, 9.8), (8, 12.2), (5, 9.8)]), "base"),
        (_poly([(2, 14), (14, 14), (14, 15), (2, 15)]), "base"),
    ]
    body = f'<rect width="16" height="16" rx="3" fill="{BRAND}"/>' + paths(parts, MILK, GOLD)
    return svg_doc(body, "0 0 16 16", 16, 16)


def maskable():
    parts, _ = portico()
    body = (f'<rect width="48" height="48" fill="{BRAND}"/>'
            + paths(parts, MILK, GOLD, "translate(10.1 10.1) scale(0.58)"))
    return svg_doc(body, "0 0 48 48", 48, 48)


def social_preview():
    """OG-картинка 1200×630: логотип на бордовом."""
    svg, (w, h) = horizontal(MILK, GOLD, MILK)
    inner = svg.split(">", 1)[1].rsplit("</svg>", 1)[0]
    vb = svg.split('viewBox="')[1].split('"')[0]
    sc = 760 / w
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630">'
            f'<rect width="1200" height="630" fill="{BRAND}"/>'
            f'<svg x="{(1200 - 760) / 2:.1f}" y="{(630 - h * sc) / 2:.1f}" width="760" height="{h * sc:.1f}" viewBox="{vb}">{inner}</svg>'
            f'</svg>')


def render_pngs(jobs):
    os.environ.setdefault("PLAYWRIGHT_BROWSERS_PATH", "/opt/pw-browsers")
    from playwright.sync_api import sync_playwright

    with sync_playwright() as p:
        b = p.chromium.launch()
        pg = b.new_page()
        for svg, path, w, h in jobs:
            pg.set_viewport_size({"width": int(w), "height": int(h)})
            inner = svg.replace("<svg ", f'<svg style="display:block;width:{w}px;height:{h}px" ', 1)
            pg.set_content(f"<html><body style='margin:0;background:transparent'>{inner}</body></html>")
            kw = {"type": "jpeg", "quality": 88} if path.endswith(".jpg") else {"omit_background": True}
            pg.screenshot(path=path, clip={"x": 0, "y": 0, "width": int(w), "height": int(h)}, **kw)
        b.close()


def write(path, text):
    with open(path, "w", encoding="utf-8") as f:
        f.write(text)


def main(out):
    os.makedirs(out, exist_ok=True)
    for f in os.listdir(out):  # drop the previous concept's files
        if f.endswith((".svg", ".png", ".ico", ".jpg")):
            os.remove(os.path.join(out, f))
    jobs = []
    for suffix, colors in VARIANTS.items():
        svg, (w, h) = horizontal(*colors)
        write(os.path.join(out, f"logo-horizontal{suffix}.svg"), svg)
        jobs.append((svg, os.path.join(out, f"logo-horizontal{suffix}.png"), 1200, round(h * 1200 / w)))
        m = mark(colors[0], colors[1])
        write(os.path.join(out, f"mark{suffix}.svg"), m)
        jobs.append((m, os.path.join(out, f"mark{suffix}.png"), 512, 512))
    fav, fav16, mask = favicon(), favicon16(), maskable()
    write(os.path.join(out, "favicon.svg"), fav)
    write(os.path.join(out, "favicon-16.svg"), fav16)
    write(os.path.join(out, "icon-maskable.svg"), mask)
    for size in (16, 32, 48, 180, 192, 512):
        name = "apple-touch-icon.png" if size == 180 else f"icon-{size}.png"
        jobs.append((fav16 if size in (16, 32) else fav, os.path.join(out, name), size, size))
    jobs.append((mask, os.path.join(out, "icon-maskable-512.png"), 512, 512))
    og = social_preview()
    write(os.path.join(out, "social-preview.svg"), og)
    jobs.append((og, os.path.join(out, "social-preview.jpg"), 1200, 630))
    render_pngs(jobs)

    from PIL import Image

    imgs = [Image.open(os.path.join(out, f"icon-{s}.png")).convert("RGBA") for s in (16, 32, 48)]
    buf = io.BytesIO()
    imgs[-1].save(buf, format="ICO", sizes=[(16, 16), (32, 32), (48, 48)], append_images=imgs[:-1])
    open(os.path.join(out, "favicon.ico"), "wb").write(buf.getvalue())
    print("kit written to", out)


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "out")
