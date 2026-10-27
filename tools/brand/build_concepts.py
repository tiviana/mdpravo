"""Render the three logo concepts side by side for comparison (PNG + HTML)."""
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
from lockup import horizontal  # noqa: E402
from marks import CONCEPTS, mark_svg_group  # noqa: E402

NAVY = "#111827"
MILK = "#F7F5F0"
GOLD = "#B49A68"
INK = "#20242C"
WHITE = "#FFFFFF"

BBOX = {"a": (4, 8, 44, 40), "b": (6, 6, 42, 42), "c": (3, 3, 45, 45)}


def mark(parts, base, accent, px):
    return (f'<svg width="{px}" height="{px}" viewBox="0 0 48 48" role="img">'
            f'{mark_svg_group(parts, base, accent)}</svg>')


def lockup_svg(key, base, accent, text, text2, width_px):
    lk = horizontal(CONCEPTS[key][1], BBOX[key])
    w, h = lk["width"], lk["height"]
    pad = 4
    body = mark_svg_group(lk["mark_parts"], base, accent, lk["mark_transform"])
    for d, role in lk["words"]:
        body += f'<path d="{d}" fill="{text if role == "text" else text2}"/>'
    vb = f"{-pad} {-pad - 2} {w + 2 * pad:.2f} {h + 2 * pad + 6:.2f}"
    hpx = width_px * (h + 2 * pad + 6) / (w + 2 * pad)
    return f'<svg width="{width_px}" height="{hpx:.1f}" viewBox="{vb}">{body}</svg>'


def main(out_dir):
    cols = []
    for key, (title, fn) in CONCEPTS.items():
        parts = fn()
        cols.append(f"""
<section>
  <h2>{key.upper()}. {title}</h2>
  <div class="tile light">{mark(parts, NAVY, GOLD, 180)}</div>
  <div class="tile light">{lockup_svg(key, NAVY, GOLD, NAVY, GOLD, 300)}</div>
  <div class="tile dark">{lockup_svg(key, MILK, GOLD, MILK, GOLD, 300)}</div>
  <div class="tile light sizes">
    {mark(parts, NAVY, NAVY, 64)}{mark(parts, NAVY, NAVY, 32)}{mark(parts, NAVY, NAVY, 16)}
    <span class="dk">{mark(parts, WHITE, WHITE, 32)}{mark(parts, WHITE, WHITE, 16)}</span>
  </div>
</section>""")
    html = f"""<!doctype html><meta charset="utf-8"><title>Концепции логотипа</title>
<style>
body{{margin:0;background:#E9E7E1;font:14px Inter,sans-serif;color:{INK}}}
main{{display:grid;grid-template-columns:repeat(3,1fr);gap:24px;padding:32px}}
h2{{font:600 16px Inter;margin:0 0 12px}}
.tile{{border-radius:8px;padding:24px;margin-bottom:12px;display:flex;align-items:center;justify-content:center;min-height:120px}}
.light{{background:{MILK}}} .dark{{background:{NAVY}}}
.sizes{{gap:18px;justify-content:flex-start;min-height:80px}}
.dk{{background:{NAVY};padding:10px;border-radius:6px;display:flex;gap:12px;align-items:center}}
</style><main>{''.join(cols)}</main>"""
    os.makedirs(out_dir, exist_ok=True)
    path = os.path.join(out_dir, "logo-concepts.html")
    with open(path, "w", encoding="utf-8") as f:
        f.write(html)
    return path


if __name__ == "__main__":
    print(main(sys.argv[1] if len(sys.argv) > 1 else "out"))
