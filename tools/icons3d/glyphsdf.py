"""Поле расстояний (SDF) глифа шрифта → float32-массив (base64) для текстуры шейдера.

Глиф вписывается в квадрат [-0.5, 0.5]; в текстуре хранится расстояние в этих единицах:
В текстуре R16F хранится расстояние d (в единицах квадрата), ограниченное ±RANGE.
"""
import base64
import io

import numpy as np
from PIL import Image, ImageDraw, ImageFont
from scipy import ndimage

RANGE = 0.125
N = 512
SS = 4  # растеризуем в 4× для гладкого контура


def glyph_sdf_dataurl(ch, font_path, wght=None, fill=0.78):
    M = N * SS
    font = ImageFont.truetype(font_path, size=int(M * 0.9))
    if wght is not None:
        try:
            font.set_variation_by_axes([wght])
        except Exception:  # noqa: BLE001
            pass
    l, t, r, b = font.getbbox(ch)
    w, h = r - l, b - t
    scale = fill * M / max(w, h)
    font = ImageFont.truetype(font_path, size=int(M * 0.9 * scale))
    if wght is not None:
        try:
            font.set_variation_by_axes([wght])
        except Exception:  # noqa: BLE001
            pass
    l, t, r, b = font.getbbox(ch)
    img = Image.new("L", (M, M), 0)
    ImageDraw.Draw(img).text(((M - (r - l)) / 2 - l, (M - (b - t)) / 2 - t), ch, font=font, fill=255)
    inside = np.array(img) > 127
    d_out = ndimage.distance_transform_edt(~inside)
    d_in = ndimage.distance_transform_edt(inside)
    d = (d_out - d_in) / M  # в единицах квадрата
    d = ndimage.gaussian_filter(d, 2.5)  # убираем ступеньки растеризации
    d = d.reshape(N, SS, N, SS).mean(axis=(1, 3))
    v = np.flipud(np.clip(d, -RANGE, RANGE)).astype(np.float32)  # ось Y текстуры WebGL — вверх
    return base64.b64encode(v.tobytes()).decode()
