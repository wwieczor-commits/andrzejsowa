from playwright.sync_api import sync_playwright
import pathlib
svg = pathlib.Path(__file__).resolve().parent.parent / 'assets' / 'logo.svg'
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    for s in (180, 192, 512):
        pg = b.new_page(viewport={'width': s, 'height': s})
        data = svg.read_text().replace('<svg ', f'<svg width="{s}" height="{s}" ', 1)
        pg.set_content(f'<html><body style="margin:0;background:#0e1a2b">{data}</body></html>')
        pg.wait_for_timeout(200)
        pg.screenshot(path=str(svg.parent / 'icons' / f'icon-{s}.png'))
    b.close()
