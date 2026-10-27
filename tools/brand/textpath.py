"""Convert text to SVG path data using a local font (fontTools only).

Supports static and variable fonts (variable fonts are instanced at the
requested axis values), GPOS pair kerning (formats 1 and 2) and tracking.
Used to build logo wordmarks so the SVGs don't depend on installed fonts.
"""
from __future__ import annotations

from functools import lru_cache

from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont


def _ntos(v: float) -> str:
    s = f"{v:.2f}".rstrip("0").rstrip(".")
    return "0" if s in ("-0", "") else s


@lru_cache(maxsize=None)
def load_font(path: str, wght: float | None = None) -> TTFont:
    font = TTFont(path)
    if wght is not None and "fvar" in font:
        from fontTools.varLib.instancer import instantiateVariableFont

        font = instantiateVariableFont(font, {"wght": wght}, inplace=False)
    return font


def _pair_kerning(font: TTFont) -> dict[tuple[str, str], int]:
    kern: dict[tuple[str, str], int] = {}
    if "GPOS" not in font:
        return kern
    gpos = font["GPOS"].table
    if not gpos.LookupList:
        return kern
    for lookup in gpos.LookupList.Lookup:
        subtables = []
        for st in lookup.SubTable:
            if lookup.LookupType == 9:  # extension
                st = st.ExtSubTable
            if getattr(st, "LookupType", lookup.LookupType) == 2:
                subtables.append(st)
        for st in subtables:
            if st.Format == 1:
                for first, pairset in zip(st.Coverage.glyphs, st.PairSet):
                    for rec in pairset.PairValueRecord:
                        v = getattr(rec.Value1, "XAdvance", 0) if rec.Value1 else 0
                        if v and (first, rec.SecondGlyph) not in kern:
                            kern[(first, rec.SecondGlyph)] = v
            elif st.Format == 2:
                cd1 = st.ClassDef1.classDefs if st.ClassDef1 else {}
                cd2 = st.ClassDef2.classDefs if st.ClassDef2 else {}
                firsts = st.Coverage.glyphs
                # glyphs absent from ClassDef2 are class 0
                for g1 in firsts:
                    c1 = cd1.get(g1, 0)
                    row = st.Class1Record[c1].Class2Record
                    for c2, rec in enumerate(row):
                        v = getattr(rec.Value1, "XAdvance", 0) if rec.Value1 else 0
                        if not v:
                            continue
                        for g2, cls in cd2.items():
                            if cls == c2 and (g1, g2) not in kern:
                                kern[(g1, g2)] = v
    return kern


@lru_cache(maxsize=None)
def kerning_for(path: str, wght: float | None) -> dict[tuple[str, str], int]:
    return _pair_kerning(load_font(path, wght))


def text_path(
    text: str,
    font_path: str,
    size: float,
    x: float = 0.0,
    baseline: float = 0.0,
    tracking_em: float = 0.0,
    wght: float | None = None,
) -> tuple[str, float]:
    """Return (svg path data, advance width in px)."""
    font = load_font(font_path, wght)
    upem = font["head"].unitsPerEm
    scale = size / upem
    cmap = font.getBestCmap()
    glyphset = font.getGlyphSet()
    hmtx = font["hmtx"]
    kern = kerning_for(font_path, wght)

    names = []
    for ch in text:
        if ord(ch) not in cmap:
            raise ValueError(f"Glyph for {ch!r} missing in {font_path}")
        names.append(cmap[ord(ch)])

    pen = SVGPathPen(glyphset, ntos=_ntos)
    cursor = 0.0  # in font units
    track = tracking_em * upem
    for i, name in enumerate(names):
        tpen = TransformPen(pen, (scale, 0, 0, -scale, x + cursor * scale, baseline))
        glyphset[name].draw(tpen)
        cursor += hmtx[name][0]
        if i < len(names) - 1:
            cursor += kern.get((name, names[i + 1]), 0) + track
    return pen.getCommands(), cursor * scale


def cap_height(font_path: str, size: float, wght: float | None = None) -> float:
    font = load_font(font_path, wght)
    os2 = font["OS/2"]
    ch = getattr(os2, "sCapHeight", 0) or int(font["head"].unitsPerEm * 0.7)
    return ch * size / font["head"].unitsPerEm


def x_height(font_path: str, size: float, wght: float | None = None) -> float:
    font = load_font(font_path, wght)
    os2 = font["OS/2"]
    xh = getattr(os2, "sxHeight", 0) or int(font["head"].unitsPerEm * 0.5)
    return xh * size / font["head"].unitsPerEm
