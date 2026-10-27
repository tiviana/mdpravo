"""Screenshot a local HTML file with the preinstalled Playwright Chromium.

usage: python3 shot.py <html> <png> [width] [full_page:0|1] [scale]
"""
import os
import sys

os.environ.setdefault("PLAYWRIGHT_BROWSERS_PATH", "/opt/pw-browsers")
from playwright.sync_api import sync_playwright  # noqa: E402


def shot(html, png, width=1400, full=True, scale=1):
    with sync_playwright() as p:
        b = p.chromium.launch()
        pg = b.new_page(viewport={"width": width, "height": 900}, device_scale_factor=scale)
        pg.goto("file://" + os.path.abspath(html))
        pg.wait_for_timeout(300)
        pg.screenshot(path=png, full_page=full)
        b.close()


if __name__ == "__main__":
    a = sys.argv
    shot(a[1], a[2], int(a[3]) if len(a) > 3 else 1400,
         (a[4] != "0") if len(a) > 4 else True, float(a[5]) if len(a) > 5 else 1)
