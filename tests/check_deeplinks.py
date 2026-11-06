"""Sprawdza, czy głębokie linki otwierają się z wypełnionymi parametrami (zrzuty do screenshots/deeplink-*.png)."""
import os, sys
from playwright.sync_api import sync_playwright
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); S = os.path.join(ROOT, 'screenshots')
URLS = {
 'google-flights': 'https://www.google.com/travel/flights?q=Flights%20to%20CTA%20from%20KRK%20on%202026-11-16%20through%202026-11-22%202%20adults%201%20child&curr=PLN&hl=pl&gl=PL',
 'google-flights-miesiac': 'https://www.google.com/travel/flights?q=Flights%20to%20CTA%20from%20Poland%20in%20February%202027%20for%205%20days%201%20adult&curr=PLN&hl=pl&gl=PL',
 'ryanair': 'https://www.ryanair.com/pl/pl/trip/flights/select?adults=2&teens=0&children=1&infants=0&dateOut=2026-11-16&dateIn=2026-11-22&isConnectedFlight=false&isReturn=true&discount=0&promoCode=&originIata=KRK&destinationIata=CTA',
 'ryanair-miesiac': 'https://www.ryanair.com/pl/pl/fare-finder?originIata=KRK&destinationIata=CTA&isReturn=true&adults=1&teens=0&children=0&infants=0&dateOut=2027-02-01&dateIn=2027-03-05&daysTrip=5&isExactDate=false&currency=PLN',
 'wizz': 'https://wizzair.com/pl-pl/booking/select-flight/KRK/CTA/2026-11-16/2026-11-22/2/1/0/null',
 'skyscanner': 'https://www.skyscanner.pl/transport/loty/krk/cta/261116/261122/?adultsv2=2&childrenv2=7&cabinclass=economy&currency=PLN&market=PL&locale=pl-PL&rtn=1',
 'booking': 'https://www.booking.com/searchresults.pl.html?ss=Catania&checkin=2026-11-16&checkout=2026-11-22&group_adults=2&group_children=1&age=7&no_rooms=1&selected_currency=PLN&lang=pl&nflt=ht_id%3D201%3Bmealplan%3D1%3Bdistance%3D3000&order=price',
 'kayak-auto': 'https://www.kayak.pl/cars/CTA/2026-11-16/2026-11-22',
 'maps-skutery': 'https://www.google.com/maps/search/?api=1&query=scooter%20rental%20Catania',
}
with sync_playwright() as pw:
    b = pw.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox', '--disable-blink-features=AutomationControlled'])
    ctx = b.new_context(**pw.devices['Pixel 7'], locale='pl-PL', timezone_id='Europe/Warsaw')
    for k, u in URLS.items():
        pg = ctx.new_page()
        try:
            pg.goto(u, wait_until='domcontentloaded', timeout=45000); pg.wait_for_timeout(7000)
            for t in ['Zaakceptuj wszystko', 'Akceptuj wszystko', 'Accept all', 'Zgadzam się', 'Akceptuję', 'Zaakceptuj']:
                try:
                    pg.get_by_role('button', name=t).first.click(timeout=1500); pg.wait_for_timeout(3000); break
                except Exception: pass
            txt = pg.inner_text('body')[:3000].replace('\n', ' ')
            pg.screenshot(path=f'{S}/deeplink-{k}.png')
            print(f'## {k}: {pg.url[:110]}\n   {txt[:400]}')
        except Exception as e:
            print(f'## {k}: BŁĄD {str(e)[:150]}')
        pg.close()
    b.close()
