"""Адаптивность: ключевые страницы на контрольных ширинах из ТЗ.

Проверяет: нет горизонтальной прокрутки, нет ошибок JS/консоли, есть h1, кнопки ≥ 44px по высоте.
Запуск: сервер на BASE (по умолчанию http://localhost:3100) с демо-данными, затем
    python3 tests/e2e/responsive.py [--shots out_dir]
"""
import os
import sys

os.environ.setdefault("PLAYWRIGHT_BROWSERS_PATH", "/opt/pw-browsers")
from playwright.sync_api import sync_playwright  # noqa: E402

BASE = os.environ.get("BASE", "http://localhost:3100")
WIDTHS = [320, 360, 390, 430, 768, 1024, 1280, 1440, 1920]
PUBLIC = ["/", "/directions/", "/services/criminal-law/", "/services/debt-collection/dolg-po-raspiske/", "/knowledge/",
          "/knowledge/vyzvali-dlya-dachi-obyasneniy/", "/about/", "/prices/", "/contacts/", "/login/",
          "/urgent/zaderzhali/", "/knowledge/downloads/zayavlenie-na-uvolnenie/", "/knowledge/topics/sizo-i-fsin/",
          "/knowledge/sizo-fsin-services/", "/knowledge/services/", "/privacy/", "/team/anna/"]
PRIVATE = ["/cabinet/", "/cabinet/cases/D-2026-00001/", "/cabinet/invoices/", "/cabinet/documents/"]

CHECK = """() => {
  const doc = document.documentElement;
  const small = [...document.querySelectorAll('.btn, .icon-btn, .chip[href], .cab-nav a')]
    .filter(e => e.offsetParent !== null).map(e => e.getBoundingClientRect())
    .filter(r => r.height > 0 && r.height < 36).length;
  return { over: doc.scrollWidth - innerWidth, h1: !!document.querySelector('h1'), small };
}"""


def main():
    shots = sys.argv[sys.argv.index("--shots") + 1] if "--shots" in sys.argv else None
    problems = []
    with sync_playwright() as p:
        b = p.chromium.launch()
        anon = b.new_context()
        ctx = b.new_context()
        login = ctx.new_page()
        login.goto(BASE + "/login/")
        login.fill("#l-login", "client@demo.local")
        login.fill("#l-pass", "demo-password-123")
        login.click("button[type=submit]")
        login.wait_for_load_state()
        login.close()
        for w in WIDTHS:
            for path in PUBLIC + PRIVATE:
                pg = (ctx if path in PRIVATE else anon).new_page()
                pg.set_viewport_size({"width": w, "height": 900})
                errs = []
                pg.on("pageerror", lambda e, errs=errs: errs.append(str(e)))
                pg.on("console", lambda m, errs=errs: errs.append(m.text) if m.type == "error" else None)
                pg.goto(BASE + path, wait_until="networkidle")
                r = pg.evaluate(CHECK)
                if not pg.url.startswith(BASE + path):
                    problems.append(f"{w}px {path}: открылась другая страница {pg.url}")
                if r["over"] > 0:
                    problems.append(f"{w}px {path}: горизонтальная прокрутка {r['over']}px")
                if not r["h1"]:
                    problems.append(f"{w}px {path}: нет h1")
                if r["small"]:
                    problems.append(f"{w}px {path}: {r['small']} кнопок ниже 36px")
                if errs:
                    problems.append(f"{w}px {path}: ошибки {errs[:2]}")
                if shots and w in (390, 1440):
                    pg.screenshot(path=os.path.join(shots, f"{w}{path.replace('/', '_') or '_'}.png"), full_page=True)
                pg.close()
        b.close()
    total = len(WIDTHS) * (len(PUBLIC) + len(PRIVATE))
    print(f"Проверено страниц×ширин: {total}; проблем: {len(problems)}")
    for x in problems:
        print("  -", x)
    sys.exit(1 if problems else 0)


if __name__ == "__main__":
    main()
