"""Symulacja powracającego użytkownika: najpierw stara wersja v1.0 (Service Worker + localStorage) podana pod adresem produkcyjnym,
potem prawdziwy serwer. Sprawdza, że po wejściu ładuje się nowa wersja i nic nie pokazuje się automatycznie."""
import os, sys, mimetypes, time
from playwright.sync_api import sync_playwright
OLD = sys.argv[1] if len(sys.argv) > 1 else '/tmp/v10'
U = 'https://wwieczor-commits.github.io/andrzejsowa/'
SH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'screenshots')
def serve_old(route):
    path = route.request.url.split('/andrzejsowa/', 1)[1].split('?')[0] or 'index.html'
    fp = os.path.join(OLD, path)
    if not os.path.isfile(fp): return route.fulfill(status=404, body='nf')
    route.fulfill(status=200, body=open(fp, 'rb').read(), headers={'content-type': mimetypes.guess_type(fp)[0] or 'application/octet-stream', 'cache-control': 'max-age=600'})
with sync_playwright() as pw:
    b = pw.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    ud = '/tmp/upgrade-profile'; os.system(f'rm -rf {ud}')
    ctx = pw.chromium.launch_persistent_context(ud, executable_path='/usr/bin/google-chrome', args=['--no-sandbox'], **{k: v for k, v in pw.devices['iPhone 13'].items() if k != 'default_browser_type'}, locale='pl-PL', service_workers='allow')
    ctx.route('**/andrzejsowa/**', serve_old)
    p = ctx.pages[0] if ctx.pages else ctx.new_page()
    p.goto(U, wait_until='networkidle'); p.wait_for_timeout(1500)
    print('1) stara wersja:', p.inner_text('#ver'), '| SW:', p.evaluate('navigator.serviceWorker.controller ? "tak" : "nie"'))
    p.reload(wait_until='networkidle'); p.wait_for_timeout(800)
    print('   po odświeżeniu SW kontroluje:', p.evaluate('navigator.serviceWorker.controller ? "tak" : "nie"'))
    # stary localStorage z danymi Katanii
    p.click('#sugg button:has-text("Katania")'); p.click('#barLinks'); p.wait_for_timeout(500)
    print('   localStorage v1:', (p.evaluate('localStorage.getItem("sowa.planer.form.v1")') or '')[:80])
    ctx.unroute('**/andrzejsowa/**')
    # 2) wejście z prawdziwym serwerem
    t = time.time(); p.goto(U, wait_until='networkidle'); p.wait_for_timeout(2500)
    v = p.inner_text('#ver'); print('2) po aktualizacji:', v, f'({time.time()-t:.1f}s)', '| baner „Nowa wersja” widoczny:', p.is_visible('#updBar'))
    if 'v1.3' not in v:
        p.reload(wait_until='networkidle'); v = p.inner_text('#ver'); print('   po 2. odświeżeniu:', v)
    print('   wyniki/raport pokazane automatycznie?', p.is_visible('#out'), p.is_visible('#reportView'), '| Raport wyłączony:', p.is_disabled('#genReport'))
    print('   zapamiętany cel:', p.input_value('#dest'))
    caches = p.evaluate('caches.keys()'); print('   cache:', caches)
    p.screenshot(path=f'{SH}/upgrade-po-aktualizacji.png')
    ok = 'v1.3' in v and not p.is_visible('#out') and p.is_disabled('#genReport') and all('v4' in c for c in caches)
    print('WYNIK:', 'OK' if ok else 'BŁĄD'); ctx.close(); b.close(); sys.exit(0 if ok else 1)
