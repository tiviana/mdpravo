"""Logo lockups built from a mark + outlined wordmark (no live text)."""
from __future__ import annotations

from textpath import cap_height, text_path

LORA = "/usr/share/fonts/truetype/google-fonts/Lora-Variable.ttf"
INTER_MEDIUM = "/usr/share/fonts/opentype/inter/Inter-Medium.otf"
INTER_SEMIBOLD = "/usr/share/fonts/opentype/inter/Inter-SemiBold.otf"

NAME_1 = "Мосдевелопмент"
NAME_2 = "ПРАВО"
FULL_NAME = "Мосдевелопмент Право"

# Wordmark metrics (px at 1×)
L1_SIZE = 30.0
L1_WGHT = 560
L2_SIZE = 12.5
L2_TRACK = 0.42
LINE_GAP = 8.0  # baseline of line 1 → cap top of line 2


def wordmark(x: float, top: float):
    """Return (paths[(d, role)], width, height) of the two-line wordmark."""
    cap1 = cap_height(LORA, L1_SIZE, L1_WGHT)
    cap2 = cap_height(INTER_SEMIBOLD, L2_SIZE)
    base1 = top + cap1
    base2 = base1 + LINE_GAP + cap2
    d1, w1 = text_path(NAME_1, LORA, L1_SIZE, x, base1, tracking_em=0.005, wght=L1_WGHT)
    d2, w2 = text_path(NAME_2, INTER_SEMIBOLD, L2_SIZE, x + 0.8, base2, tracking_em=L2_TRACK)
    # trailing tracking after the last letter is not part of the visual width
    return [(d1, "text"), (d2, "text2")], max(w1, w2), base2 - top


def horizontal(parts_fn, bbox=(5, 8, 43, 40)):
    """Horizontal lockup: mark on the left, wordmark on the right.

    bbox: (x0, y0, x1, y1) of the visible mark on its 48-unit grid, used to
    align the mark's height to the wordmark block (cap top → last baseline).
    """
    pad = 0.0
    _, _, block_h = wordmark(0, 0)
    bx0, by0, bx1, by1 = bbox
    scale = block_h / (by1 - by0)
    mark_x = pad - bx0 * scale
    mark_y = pad - by0 * scale
    mark_right = mark_x + bx1 * scale
    gap = block_h * 0.48
    text_x = mark_right + gap
    words, w, _ = wordmark(text_x, pad)
    width = text_x + w + pad
    height = block_h + 2 * pad
    mark_tf = f"translate({mark_x:.3f} {mark_y:.3f}) scale({scale:.5f})"
    # descenders of Cyrillic «д» in Lora go below line 1 but stay inside the block
    return {
        "mark_parts": parts_fn(),
        "mark_transform": mark_tf,
        "words": words,
        "width": width,
        "height": height,
    }
