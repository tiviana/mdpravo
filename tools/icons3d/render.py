"""Рендер 3D-иконок в PNG (WebGL2 в headless Chromium) и экспорт WebP.

usage: python3 render.py [name ...] [--size 1024] [--out ../../public/img/icons3d]
Без имён рендерит все иконки из icons.py. Картинка рендерится в 2× и уменьшается (сглаживание).
"""
import argparse
import base64
import io
import os
import sys
import time

os.environ.setdefault("PLAYWRIGHT_BROWSERS_PATH", "/opt/pw-browsers")
from PIL import Image  # noqa: E402
from playwright.sync_api import sync_playwright  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from icons import GLYPHS, ICONS  # noqa: E402
from glyphsdf import glyph_sdf_dataurl  # noqa: E402

PAGE = """<!doctype html><html><body style="margin:0;background:transparent">
<canvas id="c" width="%(n)d" height="%(n)d"></canvas>
<script>
window.render = async (src, yaw, pitch, zoom, ground, glyph) => {
  const c = document.getElementById('c');
  const gl = c.getContext('webgl2', {premultipliedAlpha: true, preserveDrawingBuffer: true, antialias: false});
  const vs = `#version 300 es
  in vec2 p; void main(){ gl_Position = vec4(p, 0., 1.); }`;
  function sh(t, s){ const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o);
    if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(o)); return o; }
  const pr = gl.createProgram();
  gl.attachShader(pr, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, src));
  gl.linkProgram(pr); if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(pr));
  gl.useProgram(pr);
  const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 3,-1, -1,3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  gl.uniform2f(gl.getUniformLocation(pr, 'uRes'), c.width, c.height);
  gl.uniform1f(gl.getUniformLocation(pr, 'uYaw'), yaw);
  gl.uniform1f(gl.getUniformLocation(pr, 'uPitch'), pitch);
  gl.uniform1f(gl.getUniformLocation(pr, 'uZoom'), zoom);
  gl.uniform1f(gl.getUniformLocation(pr, 'uGround'), ground);
  const tex = gl.createTexture(); gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  if (glyph) { const bin = Uint8Array.from(atob(glyph), (ch) => ch.charCodeAt(0));
    const arr = new Float32Array(bin.buffer); const n = Math.round(Math.sqrt(arr.length));
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.R16F, n, n, 0, gl.RED, gl.FLOAT, arr); }
  else { gl.texImage2D(gl.TEXTURE_2D, 0, gl.R16F, 1, 1, 0, gl.RED, gl.FLOAT, new Float32Array([1])); }
  gl.uniform1i(gl.getUniformLocation(pr, 'uGlyph'), 0);
  gl.viewport(0, 0, c.width, c.height);
  gl.clearColor(0,0,0,0); gl.clear(gl.COLOR_BUFFER_BIT);
  // рендер полосами, чтобы не упираться в лимиты времени одного вызова
  gl.enable(gl.SCISSOR_TEST);
  const band = 64;
  for (let y = 0; y < c.height; y += band) { gl.scissor(0, y, c.width, band); gl.drawArrays(gl.TRIANGLES, 0, 3); gl.finish(); }
  return c.toDataURL('image/png');
};
</script></body></html>"""

VIEW = {"yaw": 0.62, "pitch": 0.42, "zoom": 3.35, "ground": -1.0}
OVERRIDES = {
    "criminal-law": {"yaw": 0.45},
    "step-1": {"yaw": 0.45},
    "military-law": {"yaw": 0.45},
}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("names", nargs="*")
    ap.add_argument("--size", type=int, default=512)
    ap.add_argument("--out", default=os.path.join(HERE, "../../public/img/icons3d"))
    ap.add_argument("--png", action="store_true", help="дополнительно сохранить PNG (для превью)")
    a = ap.parse_args()
    names = a.names or list(ICONS)
    src_tpl = open(os.path.join(HERE, "shader.glsl"), encoding="utf-8").read()
    os.makedirs(a.out, exist_ok=True)
    n = a.size * 2
    with sync_playwright() as p:
        b = p.chromium.launch(args=["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"])
        pg = b.new_page(viewport={"width": n, "height": n})
        pg.set_default_timeout(600_000)
        pg.set_content(PAGE % {"n": n})
        for name in names:
            v = {**VIEW, **OVERRIDES.get(name, {})}
            src = src_tpl.replace("/*ICON*/", ICONS[name])
            glyph = glyph_sdf_dataurl(*GLYPHS[name]) if name in GLYPHS else None
            t0 = time.time()
            try:
                url = pg.evaluate("([s,y,pi,z,g,gl]) => window.render(s,y,pi,z,g,gl)", [src, v["yaw"], v["pitch"], v["zoom"], v["ground"], glyph])
            except Exception as e:  # noqa: BLE001
                print(f"{name}: ОШИБКА {str(e).splitlines()[0][:300]}", flush=True)
                continue
            im = Image.open(io.BytesIO(base64.b64decode(url.split(",", 1)[1]))).convert("RGBA")
            im = im.resize((a.size, a.size), Image.LANCZOS)
            out = os.path.join(a.out, f"{name}.webp")
            im.save(out, "WEBP", quality=88, method=6)
            if a.png:
                im.save(os.path.join(a.out, f"{name}.png"))
            print(f"{name}: {time.time() - t0:.1f}s → {out} ({os.path.getsize(out)} B)", flush=True)
        b.close()


if __name__ == "__main__":
    main()
