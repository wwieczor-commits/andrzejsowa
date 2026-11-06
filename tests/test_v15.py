"""v1.5 mobile-first: real calendar/search/anywhere, sheets, sorting/filtering, one-way, report/PDF, upgrade-safe inputs."""
import os,sys,json
from playwright.sync_api import sync_playwright
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)));S=ROOT+'/screenshots'
U=sys.argv[1] if len(sys.argv)>1 else 'http://localhost:8765/'
TAG=sys.argv[2] if len(sys.argv)>2 else 'v15-local'
checks=0;fails=[]
def ok(c,msg):
 global checks
 checks+=1;print(('OK ' if c else 'FAIL ')+msg,flush=True)
 if not c:fails.append(msg)
def airport(p,side,code):
 p.click('#'+('fromOpen' if side=='from' else 'toOpen'))
 p.locator('#'+side+'AirportSearch').fill(code)
 p.locator('#'+side+'Airports [data-value="'+code+'"]').click()
 p.wait_for_selector('#routeSheet:not([open])',state='attached')
def country_all(p,side,q,cc):
 p.click('#'+('fromOpen' if side=='from' else 'toOpen'));p.locator('#'+side+'CountrySearch').fill(q);p.locator('#'+side+'Countries [data-cc='+cc+']').click();p.locator('#'+side+'Airports [data-value="ALL:'+cc+'"]').click()
def search(p):
 p.click('#barLinks');p.wait_for_function('()=>__planer.ctx && __planer.ctx.fl && !__planer.ctx.fl.loading',timeout=120000);return p.evaluate('()=>__planer.ctx.fl')
def snap(p,name,part):p.screenshot(path=f'{S}/{TAG}-{name}-{part}.png')
with sync_playwright() as w:
 b=w.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox'])
 for name,opt in [('iphone',w.devices['iPhone 13']),('pixel',w.devices['Pixel 7']),('desktop',{'viewport':{'width':1280,'height':900}})]:
  print('==',name,flush=True);c=b.new_context(**opt,locale='pl-PL',timezone_id='Europe/Warsaw',accept_downloads=True);p=c.new_page();errs=[];requests=[]
  p.on('pageerror',lambda e:errs.append(str(e)));p.on('request',lambda r:requests.append(r.url))
  p.goto(U,wait_until='networkidle');ok('v1.5' in p.inner_text('#ver'),'footer v1.5')
  ok(not p.is_visible('#out') and p.is_disabled('#genReport'),'no auto report or results')
  ok(p.locator('.search-panel .search-field').count()==5,'compact origin/destination/date/pax buttons')
  snap(p,name,'search-panel');p.click('#go');p.wait_for_timeout(100)
  ok(p.locator('.search-panel .invalid').count()>=4 and not any('farfnd' in x for x in requests),'validation: missing fields red and no API search')
  ok(p.locator('#routeSheet').evaluate('(e)=>e.open') and p.evaluate('document.activeElement.id')=='fromAirportSearch','validation opens right sheet and focuses missing input')
  p.locator('#fromAirportSearch').fill('kat');ok(p.locator('#fromAirports [data-value=KTW]').count()==1 and p.locator('#fromAirports [data-value=CTA]').count()==1,'typeahead kat -> Katowice and Katania')
  p.locator('#routeSheet [data-close]').click();airport(p,'from','KRK');airport(p,'to','CTA')
  p.click('#swap');ok(p.input_value('#origin')=='CTA' and p.input_value('#dest')=='KRK','swap airports');p.click('#swap')
  p.click('#departOpen');p.wait_for_function("()=>document.querySelector('#calStatus').textContent.includes('odczyt')",timeout=30000)
  ok(p.locator('.cal-day small').evaluate_all('(es)=>es.some(e=>e.textContent.includes("zł"))'),'calendar contains real cheapestPerDay PLN prices')
  ok(any('cheapestPerDay' in x and 'currency=PLN' in x for x in requests),'calendar genuinely calls Ryanair public price API')
  # Data selected by tapping the actual calendar, no mocked prices
  p.locator('[data-day="2026-11-16"]').click();p.wait_for_function("()=>document.querySelector('#calStatus').textContent.includes('odczyt')",timeout=30000)
  ok('powrotu' in p.inner_text('#calendarTitle'),'calendar switches to return direction')
  p.locator('[data-day="2026-11-22"]').click();p.locator('#calendarSheet').evaluate('(e)=>e.scrollTop=0');snap(p,name,'calendar-prices')
  p.click('#calendarDone');ok(p.input_value('#depart')=='2026-11-16' and p.input_value('#ret')=='2026-11-22','taps prefill dates')
  p.click('#paxOpen');p.locator('[name=adults]').fill('2');p.locator('[name=children]').fill('1');p.locator('[name=childAges]').fill('7');p.locator('[name=infants]').fill('1');snap(p,name,'passengers');p.click('#paxDone')
  ok('4 osób' in p.inner_text('#paxValue'),'passenger sheet: adults children infants')
  p.evaluate('window.scrollTo(0,0)');snap(p,name,'search-filled')
  fl=search(p);rr=fl['results'];ok(len(rr)>0 and not fl.get('failed'),'real KRK to CTA round-trip results')
  ok(all(x['back'] and x['duration']==300 for x in rr),'round trip duration calculated with airport time zones')
  ok(all(abs(x['total']-x['perPerson']*3)<.01 for x in rr),'total includes adults/children, not invented infant fare')
  ok(p.is_enabled('#genReport') and p.locator('.sort-tabs [role=tab]').count()==3,'report available and 3 price+duration sort tabs')
  p.locator('.sort-tabs').scroll_into_view_if_needed();snap(p,name,'results-tabs');p.locator('.ticket').first.scroll_into_view_if_needed();snap(p,name,'flight-card')
  for key in ['fast','best','cheap']:
   p.click('[data-sort='+key+']');ok(p.locator('[data-sort='+key+']').get_attribute('aria-selected')=='true','sort '+key+' works')
  p.click('[data-strip="2026-11-16"]');ok(p.locator('.ticket').count()>0 and p.locator('.ticket').count()==p.locator('.ticket .ticket-tag:text-is("Twoje daty")').count(),'horizontal date strip filters actual dates')
  p.locator('.result-filters summary').click();p.select_option('#hourFilter','18');ok('Brak ofert po zastosowaniu filtrów' in p.inner_text('#flightsCard'),'departure time filter works honestly');p.locator('.result-filters summary').click();p.select_option('#hourFilter','')
  p.locator('.result-filters summary').click();p.uncheck('#carrierFilter');ok(p.locator('.ticket').count()==0,'carrier filter works');p.locator('.result-filters summary').click();p.check('#carrierFilter')
  ok(p.locator('#extGoogle').count()==1 and 'curr=PLN' in p.locator('#extGoogle').get_attribute('href'),'Google Flights shown below results with PLN')
  ok('/2/1/1/null' in p.locator('#extWizz').get_attribute('href') and 'childrenv2=7%7C0' in p.locator('#extSky').get_attribute('href'),'comparison links include infants and child ages')
  ok('Dopłat' not in p.inner_text('#extSky') and 'dopłata za niemowlę' in p.inner_text('.ticket').lower(),'infant charge explicitly excluded, not fabricated')
  p.click('#genReport');p.wait_for_selector('#reportView:not([hidden])');fr=p.frame_locator('#reportFrame');text=fr.locator('body').inner_text();ok('Niemowlęta: 1' in text and 'ich dopłaty nie są' in text,'report discloses excluded infant costs');snap(p,name,'report')
  if name=='iphone':
   with p.expect_popup(timeout=40000) as pop:p.click('#pdf2')
   ok(True,'iPhone PDF opens for sharing');pop.value.close()
  else:
   with p.expect_download(timeout=40000) as dl:p.click('#pdf2')
   fn=f'{S}/{TAG}-{name}-report.pdf';dl.value.save_as(fn);ok(open(fn,'rb').read(4)==b'%PDF','PDF downloads')
  p.click('#closeReport')
  # Scan twelve months from real public fare finder, choose a month (not a made-up "cheapest" value)
  p.click('#departOpen');p.click('[data-cal=cheapest]');p.wait_for_function("()=>document.querySelector('#calStatus').textContent.includes('Sprawdzono 12 miesięcy')",timeout=120000)
  ok(p.locator('.month-tile').count()==12 and p.locator('.month-tile.low').count()>=1,'cheapest month scans 12 months and marks actual cheapest returned fare')
  p.locator('#calendarSheet').evaluate('(e)=>e.scrollTop=0');snap(p,name,'cheapest-month');p.locator('[data-month="2027-02"]').click();p.locator('[name=nights]').fill('5');p.click('#calendarDone')
  fl=search(p);ok(len(fl['results'])>0 and all(x['out'].startswith('2027-02') for x in fl['results']),'whole month real search')
  # Existing country-wide behavior still supported
  country_all(p,'from','Poland','pl');airport(p,'to','CTA');fl=search(p);ok(len({x['from'] for x in fl['results']})>1,'all Polish airports -> Catania supported')
  airport(p,'from','KRK');country_all(p,'to','Spain','es');fl=search(p);ok(len({x['to'] for x in fl['results']})>1,'Krakow -> all Spain supported')
  # Anywhere + one-way: actual fares, multiple destinations, no invented return
  p.locator('.trip-toggle label:has([value=oneway])').click();p.click('#toOpen');p.click('#anywhere');p.click('#departOpen');p.click('[data-cal=exact]');p.locator('#depart').fill('2026-11-16');p.click('#calendarDone')
  ok(p.is_hidden('#returnOpen') and p.input_value('#dest')=='ANY','one-way hides return; anywhere destination selectable')
  fl=search(p);ok(len({x['to'] for x in fl['results']})>2 and all(x['back'] is None for x in fl['results']),'anywhere has real fares to several destinations and no return')
  ok(all('isReturn=false' in x['url'] and 'dateIn=' not in x['url'] and 'infants=1' in x['url'] for x in fl['results']),'one-way booking link has no return and correct infants')
  ok(p.is_disabled('#genReport'),'anywhere report disabled until a real destination is chosen')
  p.locator('.sort-tabs').scroll_into_view_if_needed();snap(p,name,'anywhere-results')
  ok(p.evaluate("()=>FL.duration('2026-11-16T06:00:00','2026-11-16T07:30:00','KRK','STN')") ==150,'duration accounts for UK/Poland time zone difference')
  p.locator('[data-plan]').first.click();ok(p.input_value('#dest')!='ANY' and p.is_enabled('#genReport') and p.locator('#restOptions').evaluate('(e)=>e.open'),'select real anywhere fare unlocks concrete trip report')
  p.click('#genReport');p.wait_for_selector('#reportView:not([hidden])');text=p.frame_locator('#reportFrame').locator('body').inner_text();ok('w jedną stronę' in text and 'powrót do domu' not in text and 'NaN' not in text,'one-way report has no fictional return flight');snap(p,name,'oneway-report')
  if name=='pixel':
   with p.expect_download(timeout=40000) as dl:p.click('#pdf2')
   fn=f'{S}/{TAG}-{name}-oneway.pdf';dl.value.save_as(fn);ok(open(fn,'rb').read(4)==b'%PDF','one-way PDF downloads')
  p.click('#closeReport')
  airport(p,'from','IEG');airport(p,'to','CTA');fl=search(p);ok('Brak lotów Ryanair' in p.inner_text('#flightsCard') and p.locator('#extWizz').count()==1,'no-flight message still shows external comparison')
  p.reload(wait_until='networkidle');ok(not p.is_visible('#out') and p.is_disabled('#genReport') and p.input_value('#origin')=='IEG','returning user remembers only inputs, no auto-report')
  if U.startswith('https'):
   c.set_offline(True);p.reload(wait_until='domcontentloaded');p.click('#fromOpen');p.locator('#fromAirportSearch').fill('kat');ok(p.locator('#fromAirports [data-value=KTW]').count()==1,'offline airport fallback still works');c.set_offline(False)
  ok(not errs,'no JS errors: '+str(errs));ok(p.evaluate('document.documentElement.scrollWidth<=innerWidth'),'no page horizontal overflow')
  c.close()
 b.close()
print('CHECKS',checks,'FAIL',len(fails),fails,flush=True);sys.exit(bool(fails))
