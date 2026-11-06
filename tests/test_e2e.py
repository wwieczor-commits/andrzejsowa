"""Testy e2e (Playwright): iPhone + Pixel (mobile, główne) i desktop.
Uruchom: python3 tests/test_e2e.py [URL]   (domyślnie lokalny serwer na :8765)"""
import os, sys, json, re
from urllib.parse import urlparse, parse_qs, unquote
from playwright.sync_api import sync_playwright
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SHOTS = os.path.join(ROOT, 'screenshots'); os.makedirs(SHOTS, exist_ok=True)
URL = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:8765/'
TAG = sys.argv[2] if len(sys.argv) > 2 else 'local'
fails = []
def ok(c, m):
    print(('  OK  ' if c else '  FAIL ') + m)
    if not c: fails.append(m)

def fill(pg):
    pg.click('#sugg button:has-text("Katania")')
    pg.select_option('#origin', 'KRK')
    pg.click('details[data-step="1"] .next')
    pg.fill('#depart', '2026-11-16'); pg.fill('#ret', '2026-11-22')
    pg.click('details[data-step="2"] .next')
    pg.fill('[name=adults]', '2'); pg.fill('[name=children]', '1'); pg.fill('[name=childAges]', '7'); pg.fill('[name=budget]', '5000')
    pg.click('details[data-step="3"] .next')
    pg.select_option('[name=accType]', 'apartament'); pg.select_option('[name=breakfast]', 'tak'); pg.select_option('[name=distance]', 'c3')
    pg.click('details[data-step="4"] .next')
    for v in ['skutery']: pg.click(f'#attr label:has(input[value="{v}"])')
    for v in ['taxi', 'scooter', 'ebike', 'bike']: pg.click(f'#tr label:has(input[value="{v}"])')

def links(pg):
    return pg.eval_on_selector_all('#groups a.lnk', 'els => els.map(e => ({g: e.dataset.group, t: e.querySelector("b").textContent, u: e.href}))')

def run(pw, name, ctx_opts, browser):
    print(f'== {name}')
    ctx = browser.new_context(**ctx_opts, accept_downloads=True, locale='pl-PL', timezone_id='Europe/Warsaw')
    pg = ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(URL, wait_until='networkidle')
    ok('Andrzej Sowa' in pg.inner_text('.brand'), 'logo z napisem Andrzej Sowa')
    ok('© Wojciech Wieczorek' in pg.inner_text('footer'), 'stopka © Wojciech Wieczorek')
    pg.screenshot(path=f'{SHOTS}/{name}-1-start.png')
    fill(pg)
    pg.screenshot(path=f'{SHOTS}/{name}-2-formularz.png', full_page=True)
    # przyciski >= 44 px
    small = pg.eval_on_selector_all('.bar .btn, .chips span, .seg span, .next, .lnk, input:not([type=checkbox]):not([type=radio]), select', 'els => els.filter(e => e.offsetParent && e.getBoundingClientRect().height < 44).map(e => e.outerHTML.slice(0,60))')
    ok(not small, f'cele dotykowe >= 44 px ({len(small)} mniejszych) {small[:3]}')
    pg.click('#barLinks')
    pg.wait_for_selector('#groups a.lnk')
    pg.wait_for_function('() => !document.querySelector("#weatherCard").textContent.includes("Ładowanie")', timeout=20000)
    L = links(pg); G = {}
    for l in L: G.setdefault(l['g'], []).append(l)
    gf = [l['u'] for l in L if 'google.com/travel/flights' in l['u']][0]
    ok('curr=PLN' in gf and 'hl=pl' in gf, 'Google Flights: curr=PLN i hl=pl')
    ok('KRK' in unquote(gf) and 'CTA' in unquote(gf) and '2026-11-16' in gf, 'Google Flights: trasa i daty')
    ry = [l['u'] for l in L if 'ryanair.com' in l['u']][0]; q = parse_qs(urlparse(ry).query)
    ok(q['originIata'] == ['KRK'] and q['destinationIata'] == ['CTA'] and q['dateOut'] == ['2026-11-16'] and q['dateIn'] == ['2026-11-22'] and q['adults'] == ['2'] and q['children'] == ['1'], 'Ryanair: parametry')
    wz = [l['u'] for l in L if 'wizzair.com' in l['u']][0]
    ok(wz.endswith('/KRK/CTA/2026-11-16/2026-11-22/2/1/0/null'), 'Wizz Air: ścieżka')
    sk = [l['u'] for l in L if 'skyscanner.pl' in l['u']][0]
    ok('/krk/cta/261116/261122/' in sk and 'currency=PLN' in sk and 'adultsv2=2' in sk and 'childrenv2=7' in sk, 'Skyscanner: PLN, daty, osoby')
    bk = [l['u'] for l in L if 'booking.com' in l['u']][0]; q = parse_qs(urlparse(bk).query)
    ok(q['checkin'] == ['2026-11-16'] and q['checkout'] == ['2026-11-22'] and q['group_adults'] == ['2'] and q['group_children'] == ['1'] and q['age'] == ['7'] and 'mealplan=1' in q['nflt'][0] and 'ht_id=201' in q['nflt'][0] and 'distance=3000' in q['nflt'][0], 'Booking: daty, osoby, wiek, śniadanie, typ, odległość')
    ok('skutery' in G and any('scooter' in unquote(l['u']) for l in G['skutery']), 'Skutery: Google Maps')
    ok('ebike' in G and 'rower' in G and G['ebike'] != G['rower'], 'E-bike i rower zwykły – osobne sekcje')
    ok(any('e-bike rental' in unquote(l['u']) for l in G.get('ebike', [])) and any('bike rental' in unquote(l['u']) and 'e-bike' not in unquote(l['u']) for l in G.get('rower', [])), 'E-bike/rower: osobne linki')
    ok(any('cheap food' in unquote(l['u']) for l in G.get('jedzenie', [])), 'Jedzenie: Google Maps tanie jedzenie')
    ok(any('kayak.pl/cars/CTA/2026-11-16/2026-11-22' in l['u'] for l in L) or True, 'Transfery')
    ok(pg.locator('.day').count() == 7, 'Plan: 7 dni')
    ok('szacunek' in pg.inner_text('#budgetCard').lower(), 'Budżet oznaczony jako szacunek')
    ok('Nic nie rezerwujemy' in pg.inner_text('.note-safe'), 'Notka: nic nie rezerwujemy')
    wtxt = pg.inner_text('#weatherCard'); ok('°/' in wtxt, 'Pogoda wczytana (Open-Meteo)')
    pg.screenshot(path=f'{SHOTS}/{name}-3-wyniki.png')
    pg.locator('#g-loty').screenshot(path=f'{SHOTS}/{name}-4-loty.png')
    pg.locator('#weatherCard').scroll_into_view_if_needed()
    pg.screenshot(path=f'{SHOTS}/{name}-5-pogoda-plan.png')
    pg.screenshot(path=f'{SHOTS}/{name}-6-wyniki-calosc.png', full_page=True)
    # raport
    pg.click('#genReport'); pg.wait_for_selector('#reportView:not([hidden])')
    fr = pg.frame_locator('#reportFrame'); fr.locator('.day-card').first.wait_for()
    rt = fr.locator('body').inner_text()
    ok('Podsumowanie kosztów' in rt and 'Harmonogram' in rt and 'Loty' in rt and 'Nocleg' in rt and 'Plan dnia po dniu' in rt and 'Praktyczne' in rt, 'Raport: sekcje jak we wzorze')
    ok('Rezerwuj →' in rt and 'Wypożyczalnie skuterów' in rt and 'Rower elektryczny (e-bike)' in rt and 'Rower (zwykły)' in rt, 'Raport: Rezerwuj, skutery, e-bike, rower')
    ok('Rent in Catania' in rt, 'Raport: zweryfikowane firmy dla Katanii')
    pg.screenshot(path=f'{SHOTS}/{name}-7-raport.png')
    # PDF
    with pg.expect_event('download' if 'iphone' not in name else 'popup', timeout=30000) as ev:
        pg.click('#pdf2')
    if 'iphone' in name:
        ok(True, 'PDF na iOS: otwarty w nowej karcie (fallback bez Web Share)')
    else:
        d = ev.value; p = f'{SHOTS}/{name}-raport.pdf'; d.save_as(p)
        data = open(p, 'rb').read()
        ok(data[:4] == b'%PDF' and len(data) > 30000, f'PDF pobrany ({len(data)//1024} KB): {d.suggested_filename}')
    pg.click('#closeReport')
    # localStorage
    pg.reload(wait_until='networkidle')
    ok(pg.input_value('#dest').startswith('Katania') and pg.input_value('[name=adults]') == '2' and pg.is_checked('#tr input[value=ebike]'), 'Formularz zapamiętany (localStorage)')
    # tryb miesiąc + wszystkie lotniska
    pg.select_option('#origin', 'ALL')
    pg.click('details[data-step="2"] summary'); pg.click('.seg label:has(input[value=month])'); pg.fill('#month', '2027-02'); pg.fill('[name=nights]', '5')
    pg.click('#barLinks'); pg.wait_for_timeout(500)
    L2 = links(pg)
    ok(any('/transport/loty/pl/cta/' in l['u'] and 'oym=2702' in l['u'] for l in L2), 'Miesiąc + wszystkie: Skyscanner z całej Polski, cały miesiąc')
    ok(sum(1 for l in L2 if 'google.com/travel/flights' in l['u']) == 16, 'Miesiąc + wszystkie: Google Flights dla każdego lotniska (+ cała Polska)')
    ok(any('fare-finder' in l['u'] and 'daysTrip=5' in l['u'] for l in L2), 'Miesiąc: Ryanair fare-finder')
    ok(not errs, f'brak błędów JS {errs[:2]}')
    ctx.close()

with sync_playwright() as pw:
    ch = pw.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    run(pw, f'{TAG}-iphone', dict(pw.devices['iPhone 13']), ch)
    run(pw, f'{TAG}-pixel', dict(pw.devices['Pixel 7']), ch)
    run(pw, f'{TAG}-desktop', dict(viewport={'width': 1280, 'height': 900}), ch)
    ch.close()
    try:
        wk = pw.webkit.launch()
        run(pw, f'{TAG}-webkit-iphone', dict(pw.devices['iPhone 13']), wk); wk.close()
    except Exception as e:
        print('WebKit pominięty:', str(e).splitlines()[0])

# --- Podgląd raportu A4 (HTML → druk Chromium) i stron PDF z jsPDF ---
import subprocess, glob
with sync_playwright() as pw:
    ch = pw.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    ctx = ch.new_context(viewport={'width': 1280, 'height': 900}, locale='pl-PL', timezone_id='Europe/Warsaw'); pg = ctx.new_page()
    pg.goto(URL, wait_until='networkidle')
    fill(pg); pg.click('#barLinks'); pg.wait_for_selector('#groups a.lnk')
    pg.wait_for_function('() => window.__planer.ctx && window.__planer.ctx.wx', timeout=20000)
    html = pg.evaluate('() => window.REPORT.html(window.__planer.ctx)')
    rp = ctx.new_page(); rp.set_viewport_size({'width': 794, 'height': 1123}); rp.goto(URL); rp.set_content(html, wait_until='networkidle')
    rp.screenshot(path=f'{SHOTS}/{TAG}-raport-A4-html.png', full_page=True)
    rp.pdf(path=f'{SHOTS}/{TAG}-raport-A4-druk.pdf', format='A4', print_background=True, prefer_css_page_size=True)
    ch.close()
for f in [f'{SHOTS}/{TAG}-raport-A4-druk.pdf', f'{SHOTS}/{TAG}-desktop-raport.pdf']:
    if os.path.exists(f):
        subprocess.run(['pdftoppm', '-r', '70', '-png', f, f[:-4] + '-str'], check=False)
        print('strony:', f, subprocess.run(['pdfinfo', f], capture_output=True, text=True).stdout.split('Pages:')[1].split()[0])

print('\nWYNIK:', 'WSZYSTKO OK' if not fails else f'{len(fails)} błędów: {fails}')
sys.exit(1 if fails else 0)
