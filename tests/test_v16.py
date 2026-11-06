"""v1.6: real public Trivago fares, own mobile hotel UI, validation, filters, reports and flight regression.
No hotel/flight responses are mocked. Error path deliberately simulates an offline browser.
"""
import os,sys,json,subprocess
from playwright.sync_api import sync_playwright
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)));S=ROOT+'/screenshots'
U=sys.argv[1] if len(sys.argv)>1 else 'http://localhost:8765/'
TAG=sys.argv[2] if len(sys.argv)>2 else 'v16-local'
checks=0;fails=[];evidence=[]
def ok(c,msg):
 global checks
 checks+=1;print(('OK ' if c else 'FAIL ')+msg,flush=True)
 if not c:fails.append(msg)
def snap(p,name,part):p.screenshot(path=f'{S}/{TAG}-{name}-{part}.png')
def airport(p,side,code):
 p.click('#'+('fromOpen' if side=='from' else 'toOpen'));p.fill('#'+side+'AirportSearch',code);p.locator('#'+side+'Airports [data-value='+code+']').click()
def hotel_search(p,button='#hotelGo'):
 p.click(button);p.wait_for_function('()=>HOTELS.state!==null',timeout=60000);return p.evaluate('()=>HOTELS.snapshot()')
with sync_playwright() as w:
 b=w.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox'])
 for name,opt in [('iphone',w.devices['iPhone 13']),('pixel',w.devices['Pixel 7'])]:
  print('==',name,flush=True);c=b.new_context(**opt,locale='pl-PL',timezone_id='Europe/Warsaw',accept_downloads=True);p=c.new_page();errors=[];mcp=[]
  p.on('pageerror',lambda e:errors.append(str(e)))
  def request(r):
   if r.url=='https://mcp.trivago.com/mcp' and r.method=='POST':mcp.append(r.post_data_json)
  p.on('request',request)
  p.goto(U,wait_until='networkidle');ok('v1.8' in p.inner_text('#ver'),'footer v1.8');ok(p.locator('#hotelForm').count()==1 and not p.is_visible('#hotelResults') and p.is_disabled('#genReport'),'hotel search visible, no auto prices or report')
  p.locator('#hotelSection').scroll_into_view_if_needed();snap(p,name,'hotel-search-empty');p.click('#hotelGo');ok(p.locator('#hotelForm .invalid').count()>=5 and not mcp,'all missing hotel fields red, no API request');p.wait_for_function('document.activeElement.id==="hotelDestination"',timeout=2000);ok(True,'focus first missing hotel field')
  p.fill('#hotelDestination','Katania');p.wait_for_selector('#hotelSuggestions [data-place]',timeout=15000);ok('Włochy' in p.inner_text('#hotelSuggestions') and 'Kongo' in p.inner_text('#hotelSuggestions'),'real geocoding suggestions distinguish city and country');snap(p,name,'hotel-typeahead')
  p.locator('#hotelDestination').press('ArrowDown');p.locator('#hotelDestination').press('Enter');ok('Włochy' in p.inner_text('#hotelPoint') and not p.locator('#hotelDestination').evaluate('(e)=>e.classList.contains("invalid")'),'keyboard selection and red clears immediately')
  p.click('#hotelInOpen');p.click('[data-h-day="2026-11-16"]');p.click('[data-h-day="2026-11-22"]');snap(p,name,'hotel-calendar');p.locator('#hotelDatesSheet [data-h-close]').last.click()
  p.click('#hotelGuestsOpen');p.locator('#hotelForm [name=adults]').fill('2');p.locator('#hotelForm [name=children]').fill('1');p.locator('#hotelGuestsSheet [data-h-close]').last.click();p.click('#hotelGo');p.wait_for_timeout(150);ok(p.locator('#hotelGuestsSheet').evaluate('(e)=>e.open') and p.locator('[data-h-age]').evaluate('(e)=>e.classList.contains("invalid")') and not mcp,'missing child age opens guest sheet, no API request');p.select_option('[data-h-age]','7');snap(p,name,'hotel-guests');p.locator('#hotelGuestsSheet [data-h-close]').last.click()
  p.locator('#hotelSection').scroll_into_view_if_needed();snap(p,name,'hotel-search-filled');s=hotel_search(p);ok(not s['failed'] and len(s['items'])>0,'real anonymous Trivago API hotel prices via browser CORS');ok(any(x.get('method')=='tools/call' for x in mcp),'real tools/call request sent, not sample data');args=[x['params']['arguments'] for x in mcp if x.get('method')=='tools/call'][-1];ok(args['arrival']=='2026-11-16' and args['departure']=='2026-11-22' and args['children_ages']=='7' and args['adults']==2 and args['rooms']==1 and args['currency']=='PLN','request includes exact dates, all guests, age, rooms and PLN')
  ok(all(h['deals'][0]['currency']=='PLN' and h['deals'][0]['night']>0 and 'dr-20261116-20261122' in h['deals'][0]['url'] for h in s['items']),'quoted real PLN fares and date-prefilled Trivago booking links');prices=[h['deals'][0]['night'] for h in s['items']];ok(prices==sorted(prices),'hotel cards sorted by actual nightly fare')
  p.locator('#hotelResults').scroll_into_view_if_needed();p.wait_for_function('()=>document.querySelector(".hotel-photo")?.complete',timeout=10000);snap(p,name,'hotel-real-results');ok(p.is_enabled('#genReport') and 'Europe/Warsaw' in p.inner_text('#hotelResults'),'report available after real search, timestamp labelled Europe/Warsaw')
  ok(p.locator('.hotel-providers .lnk').count()==6,'6 honest provider / map cards');urls=p.locator('.hotel-providers .lnk').evaluate_all('(es)=>es.map(e=>e.href)');book=urls[1];ok('checkin=2026-11-16' in book and 'checkout=2026-11-22' in book and 'group_adults=2' in book and 'group_children=1' in book and 'age=7' in book and 'no_rooms=1' in book,'Booking destination, exact dates, all guests/age and rooms');ok('startDate=2026-11-16' in urls[3] and 'rooms=1' in urls[3] and 'checkin=2026-11-16' in urls[4],'Expedia and Airbnb date / guest deep links')
  p.click('#genReport');p.wait_for_selector('#reportView:not([hidden])');fr=p.frame_locator('#reportFrame');text=fr.locator('body').inner_text();ok('Hotele · Katania' in text and s['items'][0]['name'] in text and 'Ryanair' not in text and '7' in text,'hotel-only report: actual hotel data and no invented flight');snap(p,name,'hotel-report')
  with p.expect_download() as dl:p.click('#htmlReport')
  hfile=f'{S}/{TAG}-{name}-hotel-report.html';dl.value.save_as(hfile);ok('Hotele_' in dl.value.suggested_filename and s['items'][0]['name'] in open(hfile).read(),'hotel-only HTML downloads with correct filename')
  if name=='iphone':
   with p.expect_popup(timeout=40000) as pop:p.click('#pdf2')
   ok(pop.value.url.startswith('blob:'),'iPhone PDF opens blob for saving/sharing');pop.value.close()
  else:
   with p.expect_download(timeout=40000) as dl:p.click('#pdf2')
   pdf=f'{S}/{TAG}-{name}-hotel-report.pdf';dl.value.save_as(pdf);txt=subprocess.check_output(['pdftotext',pdf,'-']).decode();ok(open(pdf,'rb').read(4)==b'%PDF' and 'Hotele' in txt and s['items'][0]['name'] in txt and 'zł' in txt,'hotel PDF downloads: real hotel names, Polish glyphs and prices')
  p.click('#closeReport');before=len(mcp);p.select_option('#hotelForm [name=sort]','rating');ss=p.evaluate('()=>HOTELS.snapshot()');ratings=[h['rating'] or -1 for h in ss['items']];ok(ratings==sorted(ratings,reverse=True) and len(mcp)==before,'rating sort uses same real results without new API call');p.select_option('#hotelForm [name=sort]','distance');ss=p.evaluate('()=>HOTELS.snapshot()');ds=[h['distance'] for h in ss['items']];ok(ds==sorted(ds),'distance sort computed from real coordinates')
  # Existing real flight search + hotel snapshot in one report/PDF; hotel state not auto overwritten.
  airport(p,'from','KRK');airport(p,'to','CTA');p.click('#departOpen');p.fill('#depart','2026-11-16');p.fill('#ret','2026-11-22');p.click('#calendarDone');p.click('#go');p.wait_for_function('()=>__planer.ctx?.fl&&!__planer.ctx.fl.loading',timeout=120000);ok(bool(p.evaluate('()=>__planer.ctx.fl.results.length')),'real Ryanair flights still work alongside hotels');ok(p.evaluate('()=>HOTELS.state?.config.ages[0]')==7,'manual hotel guest configuration not overwritten by flight search');p.click('#genReport');p.wait_for_selector('#reportView:not([hidden])');text=p.frame_locator('#reportFrame').locator('body').inner_text();ok('Ryanair' in text and 'Hotele – prawdziwe oferty Trivago' in text and s['items'][0]['name'] in text,'combined flight and hotel report includes both real sources');snap(p,name,'combined-report')
  if name=='pixel':
   with p.expect_download(timeout=40000) as dl:p.click('#pdf2')
   pdf=f'{S}/{TAG}-{name}-combined-report.pdf';dl.value.save_as(pdf);txt=subprocess.check_output(['pdftotext',pdf,'-']).decode();ok('Ryanair' in txt and 'Trivago' in txt and s['items'][0]['name'] in txt,'combined PDF contains real flights and hotels')
  p.click('#closeReport')
  # Force copying actual flight dates, not the month sample template.
  p.click('#hotelUseFlight');p.wait_for_function('()=>HOTELS.read().place!==null',timeout=15000);cc=p.evaluate('()=>HOTELS.read()');rr=p.evaluate('()=>__planer.ctx.fl.results[0]');ok(cc['checkin']==rr['outArr'][:10] and cc['checkout']==rr['back'] and cc['destination']=='Katania','copy actual flight arrival and return into hotel dates')
  p.locator('#hotelFilters summary').click();p.fill('#hotelForm [name=min]','100');p.fill('#hotelForm [name=max]','1800');p.check('#hotelForm [name=breakfast]');p.check('#hotelForm [name=cancel]');p.select_option('#hotelForm [name=rating]','8');p.select_option('#hotelForm [name=type]','hotel');p.select_option('#hotelForm [name=distance]','10');snap(p,name,'hotel-filters');ss=hotel_search(p);filtered_n=len(ss['items']);ok(not ss['failed'] and filtered_n>0,'real filtered hotel request completes with actual matching offers');ok(all(h['deals'][0]['night']>=100 and h['deals'][0]['night']<=1800 and h['rating']>=8 and h['distance']<=10 and h['type']=='hotel' and {'breakfastIncluded','freeCancellation'}<={a['id'] for a in h['deals'][0]['price_attributes']} for h in ss['items']),'price, rating, type, distance, breakfast, cancellation apply to the actual displayed deal');args=[x['params']['arguments'] for x in mcp if x.get('method')=='tools/call'][-1];ok(args['filters']=={'breakfastIncluded':True,'freeCancellation':True} and args['review_rating']=={'rating80':True} and args['price_range']['maxPrice']==1800,'supported filters sent to official public Trivago protocol');p.locator('#hotelResults').scroll_into_view_if_needed();snap(p,name,'hotel-filtered-results')
  p.select_option('#hotelForm [name=near]','airport');p.select_option('#hotelForm [name=distance]','20');ss=hotel_search(p);ok(not ss['failed'] and 'CTA' in ss['referenceName'] and all(h['distance']<=20 for h in ss['items']),'airport distance uses nearest real airport coordinates, not city-as-airport')
  p.fill('#hotelForm [name=min]','0');p.fill('#hotelForm [name=max]','1');ss=hotel_search(p);ok(not ss['failed'] and not ss['items'] and 'Brak ofert Trivago' in p.inner_text('#hotelResults'),'no-matching-fare message: no invented hotel price');snap(p,name,'hotel-no-offers')
  # No mocked fares. Offline failure cannot be mistaken for no availability.
  p.fill('#hotelForm [name=min]','2');p.fill('#hotelForm [name=max]','3');c.set_offline(True);ss=hotel_search(p);c.set_offline(False);ok(ss['failed'] and 'Nie udało się pobrać cen' in p.inner_text('#hotelResults') and p.locator('.hotel-providers .lnk').count()==6,'offline error distinguished from no rooms; fallback provider links remain')
  p.reload(wait_until='networkidle');ok(p.input_value('#hotelDestination')=='Katania' and not p.is_visible('#hotelResults') and not p.is_visible('#out') and p.is_disabled('#genReport'),'returning user: remembered inputs only; no auto results/report');ok(not errors,'no JavaScript errors: '+str(errors));ok(p.evaluate('document.documentElement.scrollWidth<=innerWidth'),'mobile viewport has no horizontal overflow')
  evidence.append({'device':name,'source':'https://mcp.trivago.com/mcp','actual_requests':len(mcp),'first_search_objects':len(s['items']),'first_hotel':s['items'][0]['name'],'first_nightly_quoted':s['items'][0]['deals'][0]['price_per_night'],'checked_at_ms':s['checkedAt'],'filtered_objects':filtered_n,'fares_mocked':False});c.close()
 b.close()
open(f'{S}/{TAG}-evidence.json','w').write(json.dumps({'checks':checks,'fails':fails,'evidence':evidence},ensure_ascii=False,indent=2))
print('CHECKS',checks,'FAIL',len(fails),fails,flush=True);sys.exit(bool(fails))
