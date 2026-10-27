"""Geometry of the logo mark concepts on a 48×48 grid.

Each concept returns a list of (path_d, role) where role is "base" or
"accent". In single-colour versions every role takes the same colour.
"""


def _poly(points):
    return "M" + " L".join(f"{x:g} {y:g}" for x, y in points) + " Z"


def _rect(x0, y0, x1, y1):
    return _poly([(x0, y0), (x1, y0), (x1, y1), (x0, y1)])


def concept_a_ligature():
    """«Лигатура МП»: правая мачта М одновременно левая мачта П.

    Сетка 48, штрих 6 ед.; диагонали М оптически компенсированы (5.4 ед.
    по нормали). Золотом выделена только перемычка П — «кровля», которая
    соединяет две опоры; обе мачты остаются полной высоты.
    """
    dx = -2  # centre the 40-unit-wide figure in the 48 box (x 4..44)
    m = [(6, 40), (6, 8), (12, 8), (19, 22), (26, 8), (32, 8), (32, 40),
         (26, 40), (26, 20), (20.5, 31), (17.5, 31), (12, 20), (12, 40)]
    m = [(x + dx, y) for x, y in m]
    bridge = _rect(32 + dx, 8, 40 + dx, 14)
    stem = _rect(40 + dx, 8, 46 + dx, 40)
    return [(_poly(m), "base"), (stem, "base"), (bridge, "accent")]


def concept_a_pixel16():
    """Тот же знак, вручную выровненный по пиксельной сетке 16×16 (favicon)."""
    m = [(2, 12), (2, 4), (4, 4), (6, 8), (8, 4), (10, 4), (10, 12), (8, 12),
         (8, 7.5), (6.6, 10.5), (5.4, 10.5), (4, 7.5), (4, 12)]
    return [(_poly(m), "base"), (_rect(12, 4, 14, 12), "base"), (_rect(10, 4, 12, 6), "accent")]


def concept_b_portal():
    """«Портал»: П как проём/защита и вертикальная ось правовой позиции."""
    outer = _rect(6, 6, 42, 42)
    inner = _rect(12, 12, 36, 42)
    # even-odd: outer minus inner gives a П frame
    frame = outer + " " + inner
    axis = _rect(21, 18, 27, 42)
    return [(frame, "base-evenodd"), (axis, "accent")]


def concept_c_seal():
    """«Печать»: кольцо официального документа и П внутри."""
    r_out, r_in = 21, 17.5
    ring = (
        f"M{24 - r_out} 24 a{r_out} {r_out} 0 1 0 {2 * r_out} 0 a{r_out} {r_out} 0 1 0 {-2 * r_out} 0 Z "
        f"M{24 - r_in} 24 a{r_in} {r_in} 0 1 1 {2 * r_in} 0 a{r_in} {r_in} 0 1 1 {-2 * r_in} 0 Z"
    )
    p = _poly([(15, 33), (15, 14), (33, 14), (33, 33), (28.5, 33), (28.5, 18.5),
               (19.5, 18.5), (19.5, 33)])
    dot = "M24 30.5 a2.5 2.5 0 1 0 0.001 0 Z"
    return [(ring, "base-evenodd"), (p, "base"), (dot, "accent")]


CONCEPTS = {
    "a": ("Лигатура МП", concept_a_ligature),
    "b": ("Портал", concept_b_portal),
    "c": ("Печать", concept_c_seal),
}


def mark_svg_group(parts, base, accent, transform=""):
    out = [f'<g transform="{transform}">' if transform else "<g>"]
    for d, role in parts:
        fill = accent if role == "accent" else base
        rule = ' fill-rule="evenodd"' if role.endswith("evenodd") else ""
        out.append(f'<path d="{d}" fill="{fill}"{rule}/>')
    out.append("</g>")
    return "".join(out)
