"""Assemble docs/brief/index.html from the template: inline logo SVG + ruler."""
import math
import os
import re

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
SVG = open(os.path.join(ROOT, "public/brand/logo-horizontal-mono-dark.svg"), encoding="utf-8").read()
VB = re.search(r'viewBox="([^"]+)"', SVG).group(1)
PATHS = re.findall(r'<path data-role="(\w+)" d="([^"]+)"', SVG)
G = re.search(r'<g transform="([^"]+)">', SVG).group(1)
assert PATHS and any(r == "text" for r, _ in PATHS), "logo SVG must carry data-role paths"


def logo(prefix, cls_base, cls_acc, cls_text, label):
    cls = {"base": cls_base, "accent": cls_acc}
    mark = "".join(f'<path class="{cls[r]}" d="{d}"/>' for r, d in PATHS if r != "text")
    words = "".join(f'<path class="{cls_text}" d="{d}"/>' for r, d in PATHS if r == "text")
    return (f'<svg viewBox="{VB}" role="img" aria-label="{label}" xmlns="http://www.w3.org/2000/svg">'
            f'<g transform="{G}">{mark}</g>{words}</svg>')


def ruler():
    widths = [320, 360, 390, 430, 768, 1024, 1280, 1440, 1920]
    labels = {320: "телефон", 768: "планшет", 1280: "ноутбук", 1920: "монитор"}
    lo, hi = math.log(320), math.log(1920)
    out = []
    for w in widths:
        pct = 2 + 96 * (math.log(w) - lo) / (hi - lo)
        lab = f"<span>{labels[w]}</span>" if w in labels else ""
        out.append(f'<div class="tick" style="left:{pct:.2f}%">{lab}<i></i><b>{w}</b></div>')
    return "".join(out)


tpl = open(os.path.join(HERE, "brief.template.html"), encoding="utf-8").read()
html = (tpl.replace("{{LOGO_SMALL}}", logo("s", "lg-base", "lg-accent", "lg-text", "Мосдевелопмент Право"))
        .replace("{{LOGO_PLATE}}", logo("p", "p-b", "p-a", "p-t", "Логотип «Мосдевелопмент Право»"))
        .replace("{{RULER}}", ruler()))
assert "{{" not in html
out = os.path.join(HERE, "index.html")
open(out, "w", encoding="utf-8").write(html)
print(out, len(html))
