"""Build the final logo kit (SVG + PNG + favicon set) from concept A.

usage: python3 build_kit.py <out_dir>
All text is converted to outlines, so the SVGs render identically without
the fonts installed. The company name is spelled from lockup.NAME_1/NAME_2.
"""
import io
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
from lockup import FULL_NAME, horizontal  # noqa: E402
from marks import concept_a_ligature, concept_a_pixel16, mark_svg_group  # noqa: E402

NAVY = "#111827"
MILK = "#F7F5F0"
WHITE = "#FFFFFF"
GOLD = "#B49A68"
BBOX = (4, 8, 44, 40)

VARIANTS = {
    # name: (mark base, mark accent, text, text line 2)
    "": (NAVY, GOLD, NAVY, NAVY),  # primary, for light backgrounds
    "-inverse": (MILK, GOLD, MILK, MILK),  # for dark backgrounds
    "-mono-dark": (NAVY, NAVY, NAVY, NAVY),  # one colour, light backgrounds
    "-mono-light": (WHITE, WHITE, WHITE, WHITE),  # one colour, dark backgrounds
}


def svg_doc(body, vb, w=None, h=None, title=FULL_NAME):
    size = f' width="{w:g}" height="{h:g}"' if w else ""
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb}"{size} '
            f'role="img" aria-labelledby="t"><title id="t">{title}</title>{body}</svg>\n')


def horizontal_svg(base, accent, text, text2):
    lk = horizontal(concept_a_ligature, BBOX)
    w, h = lk["width"], lk["height"]
    body = mark_svg_group(lk["mark_parts"], base, accent, lk["mark_transform"])
    for d, role in lk["words"]:
        body += f'<path d="{d}" fill="{text if role == "text" else text2}"/>'
    # clear space: descender of «д» (~0.22 em of line 1) below line 1 is inside the block;
    # add a small safe margin so nothing touches the viewBox edge
    m = 2
    vb = f"{-m} {-m} {w + 2 * m:.2f} {h + 2 * m:.2f}"
    return svg_doc(body, vb, round(w + 2 * m, 2), round(h + 2 * m, 2)), (w + 2 * m, h + 2 * m)


def mark_svg(base, accent, title="Знак «Мосдевелопмент Право»"):
    return svg_doc(mark_svg_group(concept_a_ligature(), base, accent), "0 0 48 48", 48, 48, title)


def favicon_svg():
    # navy tile, mark at 80% centred; also adapts nothing to OS theme on purpose:
    # a dark tile reads on both light and dark browser chrome.
    tf = "translate(4.8 4.8) scale(0.8)"
    body = (f'<rect width="48" height="48" rx="10" fill="{NAVY}"/>'
            + mark_svg_group(concept_a_ligature(), MILK, GOLD, tf))
    return svg_doc(body, "0 0 48 48", 48, 48, "Мосдевелопмент Право")


def favicon16_svg():
    """Pixel-aligned favicon for 16/32 px (the 48-grid mark blurs there)."""
    body = (f'<rect width="16" height="16" rx="3" fill="{NAVY}"/>'
            + mark_svg_group(concept_a_pixel16(), MILK, GOLD))
    return svg_doc(body, "0 0 16 16", 16, 16, "Мосдевелопмент Право")


def maskable_svg():
    # maskable icons need the motif inside the central 80% safe zone
    tf = "translate(9.6 9.6) scale(0.6)"
    body = (f'<rect width="48" height="48" fill="{NAVY}"/>'
            + mark_svg_group(concept_a_ligature(), MILK, GOLD, tf))
    return svg_doc(body, "0 0 48 48", 48, 48, "Мосдевелопмент Право")


def render_pngs(jobs):
    """jobs: list of (svg_text, png_path, width_px, height_px)."""
    os.environ.setdefault("PLAYWRIGHT_BROWSERS_PATH", "/opt/pw-browsers")
    from playwright.sync_api import sync_playwright

    with sync_playwright() as p:
        b = p.chromium.launch()
        pg = b.new_page()
        for svg, path, w, h in jobs:
            pg.set_viewport_size({"width": int(w), "height": int(h)})
            inner = svg.replace("<svg ", f'<svg style="display:block;width:{w}px;height:{h}px" ', 1)
            pg.set_content(f"<html><body style='margin:0;background:transparent'>{inner}</body></html>")
            pg.screenshot(path=path, omit_background=True,
                          clip={"x": 0, "y": 0, "width": int(w), "height": int(h)})
        b.close()


def write(path, text):
    with open(path, "w", encoding="utf-8") as f:
        f.write(text)


def main(out):
    os.makedirs(out, exist_ok=True)
    png_jobs = []
    for suffix, colors in VARIANTS.items():
        svg, (w, h) = horizontal_svg(*colors)
        write(os.path.join(out, f"logo-horizontal{suffix}.svg"), svg)
        scale = 1200 / w  # 1200 px wide preview
        png_jobs.append((svg, os.path.join(out, f"logo-horizontal{suffix}.png"),
                         round(w * scale), round(h * scale)))
        msvg = mark_svg(colors[0], colors[1])
        write(os.path.join(out, f"mark{suffix}.svg"), msvg)
        png_jobs.append((msvg, os.path.join(out, f"mark{suffix}.png"), 512, 512))

    fav = favicon_svg()
    write(os.path.join(out, "favicon.svg"), fav)
    mask = maskable_svg()
    write(os.path.join(out, "icon-maskable.svg"), mask)
    fav16 = favicon16_svg()
    write(os.path.join(out, "favicon-16.svg"), fav16)
    for size in (16, 32, 48, 180, 192, 512):
        name = "apple-touch-icon.png" if size == 180 else f"icon-{size}.png"
        src = fav16 if size in (16, 32) else fav
        png_jobs.append((src, os.path.join(out, name), size, size))
    png_jobs.append((mask, os.path.join(out, "icon-maskable-512.png"), 512, 512))
    render_pngs(png_jobs)

    # favicon.ico from the rendered 16/32/48 PNGs
    from PIL import Image

    imgs = [Image.open(os.path.join(out, f"icon-{s}.png")).convert("RGBA") for s in (16, 32, 48)]
    buf = io.BytesIO()
    imgs[-1].save(buf, format="ICO", sizes=[(16, 16), (32, 32), (48, 48)], append_images=imgs[:-1])
    with open(os.path.join(out, "favicon.ico"), "wb") as f:
        f.write(buf.getvalue())
    print("kit written to", out)


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "out")
