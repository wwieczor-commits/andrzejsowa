"""v1.3: mobile country/airport pickers, validation, real fares, country×country, report/PDF, remembered form and offline airport fallback."""
import os,sys,json
from playwright.sync_api import sync_playwright
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__))); S=ROOT+'/screenshots'
U=sys.argv[1] if len(sys.argv)>1 else 'http://localhost:8765/'
TAG=sys.argv[2] if len(sys.argv)>2 else 'v13-local'
fails=[];checks=0
def ok(c,msg):
 global checks
 checks+=1;print(('OK ' if c else 'FAIL ')+msg,flush=True)
 if not c:fails.append(msg)
def step(p,i):
 p.locator(f'details[data-step="{i}"]').evaluate('(e)=>e.open=true')
def country(p,side,query,code):
 step(p,1);p.locator(f'#{side}CountrySearch').fill(query);p.locator(f'#{side}Countries [data-cc="{code}"]').click()
def airport(p,side,code):
 p.locator(f'#{side}AirportSearch').focus();p.locator(f'#{side}Airports [data-value="{code}"]').click()
def choose(p,side,query,value):
 step(p,1);p.locator(f'#{side}AirportSearch').fill(query);p.locator(f'#{side}Airports [data-value="{value}"]').click()
def dates(p):
 step(p,2);p.locator('#depart').fill('2026-11-16');p.locator('#ret').fill('2026-11-22')
def search(p):
 p.locator('#barLinks').click();p.wait_for_selector('#flightsCard .fl-stamp',timeout=90000)
def ctx(p):return p.evaluate('() => ({f:__planer.ctx.f,fl:__planer.ctx.fl,dest:__planer.ctx.dest})')
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox'])
 for name,opts in [('iphone',pw.devices['iPhone 13']),('pixel',pw.devices['Pixel 7']),('desktop',{'viewport':{'width':1280,'height':900}})]:
  print('==',name,flush=True)
  c=b.new_context(**opts,accept_downloads=True,locale='pl-PL',timezone_id='Europe/Warsaw');p=c.new_page();errs=[];req=[]
  p.on('pageerror',lambda e:errs.append(str(e)));p.on('request',lambda r:req.append(r.url))
  p.goto(U,wait_until='networkidle')
  ok('v1.4' in p.inner_text('#ver'),'version v1.4')
  ok(p.is_disabled('#genReport') and not p.is_visible('#out'),'no auto-results/report')
  ok('Polska' in p.input_value('#fromCountrySearch') and p.input_value('#origin')=='','origin country Poland, no airport chosen')
  # Missing data validation: cannot send flight requests
  p.click('#barLinks');p.wait_for_timeout(200)
  ok(p.locator('.invalid').count()>=4 and p.locator('.field-error').count()>=4,'all missing fields red with hints')
  ok(p.evaluate('document.activeElement.id')=='fromAirportSearch','focus first missing field (airport)')
  ok(not any('farfnd' in x for x in req),'validation stops flight search')
  p.screenshot(path=f'{S}/{TAG}-{name}-validation.png')
  # country picker Polish/English search and flags
  country(p,'from','Poland','pl')
  p.locator('#toCountrySearch').fill('wlo');p.wait_for_timeout(200)
  ok(p.locator('#toCountries [data-cc=it]').count()==1,'country diacritics-insensitive: wlo → Włochy')
  p.locator('#toCountries').scroll_into_view_if_needed();p.screenshot(path=f'{S}/{TAG}-{name}-country.png')
  p.locator('#toCountries [data-cc=it]').click()
  ok(p.locator('#toAirports [data-value=CTA]').count()==1 and p.locator('#toAirports [data-value="ALL:it"]').count()==1,'Italy airport suggestions plus all-country')
  p.locator('#toAirportSearch').scroll_into_view_if_needed();p.screenshot(path=f'{S}/{TAG}-{name}-airports.png')
  airport(p,'to','CTA');airport(p,'from','ALL:pl')
  ok(not p.locator('#fromAirportSearch').evaluate('(e)=>e.classList.contains("invalid")') and not p.locator('#toCountrySearch').evaluate('(e)=>e.classList.contains("invalid")'),'errors clear on filling')
  # Typeahead global "kat": both KTW and CTA
  p.locator('#fromAirportSearch').fill('kat')
  ok(p.locator('#fromAirports [data-value=KTW]').count()==1 and p.locator('#fromAirports [data-value=CTA]').count()==1,'kat → Katowice KTW & Katania CTA, both countries')
  p.screenshot(path=f'{S}/{TAG}-{name}-typeahead.png')
  p.locator('#fromAirportSearch').press('ArrowDown');p.locator('#fromAirportSearch').press('Enter')
  ok(p.input_value('#origin') in ['CTA','KTW'],'keyboard ArrowDown/Enter selects suggestion')
  # all Polish airports to Catania (selected Italy country)
  country(p,'from','Pol','pl');airport(p,'from','ALL:pl');dates(p)
  # missing adult counts/nights highlight
  step(p,3);p.locator('[name=adults]').fill('');p.click('#barLinks')
  ok(p.locator('[name=adults]').get_attribute('aria-invalid')=='true' and p.evaluate('document.activeElement.name')=='adults','missing adults highlighted and focused')
  p.locator('[name=adults]').fill('2');p.locator('[name=children]').fill('1')
  ok(p.locator('[name=adults]').get_attribute('aria-invalid') is None,'adult error clears immediately')
  p.locator('[name=childAges]').fill('7');p.locator('[name=budget]').fill('5000')
  search(p);r=ctx(p)
  ok(r['f']['origin']=='ALL:pl' and r['f']['dest']=='CTA' and len(r['fl']['results'])>0,'real search Polska/all → Włochy/CTA')
  ok(len({x['from'] for x in r['fl']['results']})>1 and all(x['to']=='CTA' for x in r['fl']['results']),'fares from multiple Polish airports, CTA only')
  ok([x['total'] for x in r['fl']['results']]==sorted(x['total'] for x in r['fl']['results']),'fares sorted ascending')
  ok(all(abs(x['total']-x['perPerson']*3)<0.01 for x in r['fl']['results']),'passenger total correct')
  p.locator('#flightsCard').scroll_into_view_if_needed();p.screenshot(path=f'{S}/{TAG}-{name}-polska-cta.png')
  ok(p.is_enabled('#genReport'),'report enabled only after real search')
  # v1.4: honest external-provider panel (not fabricated fares)
  ok('To linki, nie wyniki z ceną.' in p.inner_text('.external-flights'),'Wizz/Sky explicitly links, not prices')
  ex=p.locator('#extWizz').get_attribute('href');sk=p.locator('#extSky').get_attribute('href')
  ok('/2026-11-16/2026-11-22/2/1/0/null' in ex and 'adultsv2=2' in sk and 'childrenv2=7' in sk and 'currency=PLN' in sk,'external links prefilled dates/passengers/PLN')
  p.locator('#extOrigin').select_option('KRK')
  ok('/KRK/CTA/' in p.locator('#extWizz').get_attribute('href') and '/krk/cta/' in p.locator('#extSky').get_attribute('href'),'country-all panel changes exact route in both links')
  fare=p.evaluate('()=>__planer.ctx.fl.results[0]');fareLink=p.locator('#flightsCard > .fl-card').first.locator('.compare a').first.get_attribute('href')
  ok('/'+fare['from']+'/'+fare['to']+'/'+fare['out']+'/'+fare['back']+'/' in fareLink,'comparison at fare uses actual alternative dates, not requested dates')
  p.locator('.external-flights').scroll_into_view_if_needed();p.screenshot(path=f'{S}/{TAG}-{name}-external-providers.png')
  # any foreign origin specific
  choose(p,'from','CTA','CTA');choose(p,'to','KRK','KRK');search(p);r=ctx(p)
  ok(len(r['fl']['results'])>0 and all(x['from']=='CTA' for x in r['fl']['results']),'foreign origin Italy/CTA → Poland/KRK')
  # Krakow to all Spain
  choose(p,'from','balice','KRK');country(p,'to','Spain','es');airport(p,'to','ALL:es');search(p);r=ctx(p)
  ok(r['f']['dest']=='ALL:es' and len(r['fl']['results'])>0,'real search Kraków → Hiszpania/all')
  tos={x['to'] for x in r['fl']['results']};ok(len(tos)>1,'Spain results have multiple destination airports: '+str(tos))
  p.locator('#flightsCard').scroll_into_view_if_needed();p.screenshot(path=f'{S}/{TAG}-{name}-krakow-hiszpania.png')
  # report labels / PDF
  p.click('#genReport');p.wait_for_selector('#reportView:not([hidden])');fr=p.frame_locator('#reportFrame');fr.locator('h1').first.wait_for()
  txt=fr.locator('body').inner_text();ok('Hiszpania · wszystkie lotniska' in txt and 'Kraków (KRK)' in txt and 'ceny z dnia' in txt,'report correct country/airport labels & real fares')
  ok('undefined' not in txt and 'Wariant oszczędny' not in txt,'report has no undefined or invented costs')
  ok('Wizz Air i Skyscanner – ceny na ich stronach' in txt and 'Nie pobrano cen tych serwisów.' in txt,'report describes external links without inventing prices')
  p.screenshot(path=f'{S}/{TAG}-{name}-report.png')
  if name!='iphone':
   with p.expect_download(timeout=30000) as d:p.click('#pdf2')
   fn=f'{S}/{TAG}-{name}-report.pdf';d.value.save_as(fn);ok(open(fn,'rb').read(4)==b'%PDF','PDF generated')
  else:
   with p.expect_popup(timeout=30000) as pop:p.click('#pdf2')
   ok(True,'iPhone PDF opens/shares')
   pop.value.close()
  p.click('#closeReport');p.reload(wait_until='networkidle')
  ok(p.input_value('#origin')=='KRK' and p.input_value('#dest')=='ALL:es' and not p.is_visible('#out') and p.is_disabled('#genReport'),'remembered inputs only, no auto-report after reload')
  # both all-country mode; month, nights validation
  country(p,'from','Polska','pl');airport(p,'from','ALL:pl');step(p,2);p.locator('.seg label:has([value=month])').click();p.locator('#month').fill('2027-02');p.locator('[name=nights]').fill('');p.click('#barLinks')
  ok(p.locator('[name=nights]').get_attribute('aria-invalid')=='true','month mode missing nights highlighted')
  p.locator('[name=nights]').fill('5');search(p);r=ctx(p)
  ok(len(r['fl']['results'])>0 and r['dest']['all'],'month Polska/all → Spain/all real results')
  ok(len({x['from'] for x in r['fl']['results']})>1 and len({x['to'] for x in r['fl']['results']})>1,'both all-country queries multiple origins and destinations')
  # no routes from IEG to Catania
  choose(p,'from','IEG','IEG');choose(p,'to','CTA','CTA');step(p,2);p.locator('.seg label:has([value=exact])').click();search(p)
  ok('Brak lotów Ryanair' in p.inner_text('#flightsCard'),'no-route message IEG → CTA')
  ok(p.locator('#extWizz').is_visible() and p.locator('#extSky').is_visible() and 'Brak lotów Ryanair nie oznacza braku lotów innych linii' in p.inner_text('.external-flights'),'no flights includes Wizz/Sky links and warning about coverage')
  p.locator('.external-flights').scroll_into_view_if_needed();p.screenshot(path=f'{S}/{TAG}-{name}-no-flights-external.png')
  p.click('#genReport');p.wait_for_selector('#reportView:not([hidden])');txt=p.frame_locator('#reportFrame').locator('body').inner_text()
  ok('Brak lotów' in txt,'no-flight report uses no-flight message')
  p.click('#closeReport')
  # offline snapshot (block API, reload)
  c.set_offline(True);p.reload(wait_until='domcontentloaded',timeout=20000) if U.startswith('https') else None
  if U.startswith('https'):
   p.wait_for_selector('#fromCountrySearch');p.locator('#fromAirportSearch').fill('kat');ok(p.locator('#fromAirports [data-value=KTW]').count()==1,'airport typeahead works offline from bundled snapshot')
  c.set_offline(False)
  ok(not errs,'no JS errors '+str(errs))
  ok(p.evaluate('document.documentElement.scrollWidth<=innerWidth'),'no horizontal overflow')
  c.close()
 b.close()
print('CHECKS',checks,'FAIL',len(fails),fails,flush=True);sys.exit(bool(fails))
