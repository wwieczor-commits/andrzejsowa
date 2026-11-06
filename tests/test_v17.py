"""v1.7: hotel destination/dates/passengers automatically follow real flights; manual opt-out persists.
Actual fares are never mocked. Pure date-helper edge cases contain no fares and never enter UI results.
"""
import os,sys,json
from playwright.sync_api import sync_playwright
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)));S=ROOT+'/screenshots'
U=sys.argv[1] if len(sys.argv)>1 else 'http://localhost:8765/'
TAG=sys.argv[2] if len(sys.argv)>2 else 'v17-local'
checks=0;fails=[]
def ok(c,msg):
 global checks
 checks+=1;print(('OK ' if c else 'FAIL ')+msg,flush=True)
 if not c:fails.append(msg)
def snap(p,name,part):p.screenshot(path=f'{S}/{TAG}-{name}-{part}.png')
def airport(p,side,code):
 p.click('#'+('fromOpen' if side=='from' else 'toOpen'));p.fill('#'+side+'AirportSearch',code);p.locator('#'+side+'Airports [data-value="'+code+'"]').click()
def flight_dates(p,start,end=None):
 p.click('#departOpen');p.click('[data-cal=exact]');p.fill('#depart',start)
 if end:p.fill('#ret',end)
 p.click('#calendarDone')
def run(p):
 p.click('#go');p.wait_for_function('()=>__planer.ctx?.fl&&!__planer.ctx.fl.loading',timeout=120000);p.wait_for_function('()=>HOTELS.read().place!==null',timeout=20000);return p.evaluate('()=>__planer.ctx.fl')
def matches(p,r):
 h=p.evaluate('()=>HOTELS.read()');city=p.evaluate('(code)=>AP.byCode(code).city',r['to']);return h['destination']==city and h['checkin']==r['outArr'][:10] and h['checkout']==(r['back'] if r['back'] else p.evaluate('(start)=>PL.iso(PL.addDays(new Date(start+"T00:00:00"),+__planer.read().nights||3))',r['outArr'][:10]))
with sync_playwright() as w:
 b=w.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox'])
 for name,opt in [('iphone',w.devices['iPhone 13']),('pixel',w.devices['Pixel 7'])]:
  print('==',name,flush=True);c=b.new_context(**opt,locale='pl-PL',timezone_id='Europe/Warsaw');p=c.new_page();errors=[];requests=[];p.on('pageerror',lambda e:errors.append(str(e)));p.on('request',lambda r:requests.append(r.url));p.goto(U,wait_until='networkidle');ok('v1.7' in p.inner_text('#ver'),'footer v1.7');ok(p.input_value('#f [name=nights]')=='3','fresh one-way stay defaults to three nights')
  # Simulate an existing v1.6 user's last hotel form. Missing sync marker must migrate to auto, not permanent manual.
  p.evaluate('''()=>{localStorage.setItem('sowa.planer.form.v1',JSON.stringify({origin:'KRK',dest:'CTA',originCountry:'pl',destCountry:'it',tripType:'return',dateMode:'exact',depart:'2026-11-16',ret:'2026-11-22',adults:'2',children:'1',childAges:'7',infants:'1',nights:'3'}));localStorage.setItem('sowa.hotels.inputs.v1',JSON.stringify({destination:'Porto',checkin:'2026-12-01',checkout:'2026-12-07',adults:1,children:0,rooms:1,type:'any',near:'center',distance:0,sort:'price'}));}''');p.reload(wait_until='networkidle');p.wait_for_function('()=>HOTELS.read().place?._airport==="CTA"');h=p.evaluate('()=>HOTELS.read()');ok(h['destination']=='Katania' and h['checkin']=='2026-11-16' and h['checkout']=='2026-11-22','v1.6 returning user: auto hotel city/dates override stale unrelated hotel inputs');ok(h['adults']==2 and h['children']==2 and h['ages']==[7,0],'flight adults, child age and infant copy without retyping');ok(p.evaluate('JSON.parse(localStorage.getItem("sowa.hotels.inputs.v1")).syncWithFlight') and not any('farfnd' in x or 'mcp.trivago' in x for x in requests),'auto mode saved, no automatic fare lookup or report');ok(p.is_hidden('#hotelUseFlight') and 'KRK→CTA' in p.inner_text('#hotelPrefill'),'automatic note shown without requiring a copy button')
  fl=run(p);rr=fl['results'];ok(len(rr)>1 and not fl.get('failed'),'real KRK→CTA flights loaded');best=min(rr,key=lambda r:r['total']);ok(matches(p,best),'hotel dates follow cheapest actual flight arrival and return, not a month template');ok('wg formularza' not in p.inner_text('#hotelPrefill'),'note now identifies real flight data');p.locator('#hotelSection').scroll_into_view_if_needed();snap(p,name,'automatic-from-flight')
  # Search hotels without entering a single hotel field; all dates and ages came from flights.
  p.click('#hotelGo');p.wait_for_function('()=>HOTELS.state!==null',timeout=60000);ok(p.evaluate('()=>!HOTELS.state.failed&&HOTELS.state.items.length>0'),'real Trivago hotel search works directly from synchronized flight fields');p.locator('#hotelResults').scroll_into_view_if_needed();snap(p,name,'real-hotels-no-retyping')
  # Clicking another flight card updates the hotel without opening an external website.
  r=rr[1];p.locator('.fl-card').nth(1).locator('h4').click();p.wait_for_function('(code)=>HOTELS.read().place?._airport===code',arg=r['to']);ok(matches(p,r) and p.is_hidden('#hotelResults'),'clicking another flight card updates fields and clears old hotel quotes')
  p.locator('[data-plan="2"]').click();selected=p.evaluate('()=>__planer.ctx.fl.results[0]');p.wait_for_function('()=>HOTELS.read().place!==null');ok(matches(p,selected),'Zaplanuj tę ofertę also updates hotel fields from the selected real fare')
  # User changes just one hotel date: all auto-overwriting stops until explicit restore.
  p.click('#hotelInOpen');p.fill('#hCheckin','2026-11-18');p.locator('#hotelDatesSheet [data-h-close]').last.click();before=p.evaluate('()=>HOTELS.read()');ok(p.is_visible('#hotelUseFlight') and not p.evaluate('JSON.parse(localStorage.getItem("sowa.hotels.inputs.v1")).syncWithFlight'),'manual hotel edit pauses synchronization and exposes restore link');airport(p,'to','AGP');flight_dates(p,'2026-11-19','2026-11-25');h=p.evaluate('()=>HOTELS.read()');ok(h['destination']==before['destination'] and h['checkin']==before['checkin'],'new flight city/dates do not overwrite manually edited hotels');p.locator('#hotelSection').scroll_into_view_if_needed();snap(p,name,'manual-override')
  p.click('#hotelUseFlight');p.wait_for_function('()=>HOTELS.read().place?._airport==="AGP"');h=p.evaluate('()=>HOTELS.read()');ok(h['checkin']=='2026-11-19' and h['checkout']=='2026-11-25' and p.is_hidden('#hotelUseFlight'),'Synchronizuj z lotem restores continuing automatic mode');p.locator('#hotelFilters summary').click();p.check('#hotelForm [name=breakfast]');flight_dates(p,'2026-11-20','2026-11-26');h=p.evaluate('()=>HOTELS.read()');ok(h['checkin']=='2026-11-20' and h['checkout']=='2026-11-26' and h['breakfast'],'hotel filters do not accidentally disable flight synchronization')
  p.click('#hotelChangeFlight');p.reload(wait_until='networkidle');ok(not p.evaluate('JSON.parse(localStorage.getItem("sowa.hotels.inputs.v1")).syncWithFlight') and p.is_visible('#hotelUseFlight'),'manual opt-out persists after reload');p.click('#hotelUseFlight');p.wait_for_function('()=>HOTELS.read().place?._airport==="AGP"');p.reload(wait_until='networkidle');p.wait_for_function('()=>HOTELS.read().place?._airport==="AGP"');ok(p.is_hidden('#hotelUseFlight') and not p.is_visible('#out') and not p.is_visible('#hotelResults'),'restored auto mode persists without resurrecting results or reports')
  # Whole destination country: automatically use the cheapest actual destination returned.
  p.click('#toOpen');p.fill('#toCountrySearch','Hiszpania');p.locator('#toCountries [data-cc=es]').click();p.locator('#toAirports [data-value="ALL:es"]').click();flight_dates(p,'2026-11-16','2026-11-22');fl=run(p);best=min(fl['results'],key=lambda r:r['total']);ok(len({r['to'] for r in fl['results']})>1 and matches(p,best),'all airports in Spain -> cheapest real destination automatically fills hotel');p.locator('#hotelSection').scroll_into_view_if_needed();snap(p,name,'whole-country-cheapest')
  # Anywhere and one-way: actual arrival date + nights, no fictional return flight.
  p.locator('.trip-toggle label:has([value=oneway])').click();p.click('#toOpen');p.click('#anywhere');flight_dates(p,'2026-11-16');fl=run(p);best=min(fl['results'],key=lambda r:r['total']);ok(len({r['to'] for r in fl['results']})>1 and matches(p,best),'anywhere one-way -> cheapest city; hotel departure = actual arrival + 3 nights');p.locator('#hotelSection').scroll_into_view_if_needed();snap(p,name,'anywhere-oneway')
  p.click('#departOpen');p.locator('#f [name=nights]').fill('5');p.click('#calendarDone');ok(p.evaluate('()=>{const h=HOTELS.read();return !!h.place&&h.checkout===PL.iso(PL.addDays(new Date(h.checkin+"T00:00:00"),5));}'),'one-way nights changes preserve real destination and update hotel departure automatically')
  # Pure date-only regression fixtures: never presented as flight offers or injected into UI.
  edge=p.evaluate('''()=>{const f={origin:'KRK',dest:'CTA',tripType:'return',dateMode:'exact',depart:'2026-11-16',ret:'2026-11-22',adults:'1',children:'0',infants:'0'},r={from:'KRK',to:'CTA',out:'2026-11-16',outArr:'2026-11-17T00:20:00',back:'2026-11-22'};const a=HOTELS.flightFields(f,r);const b=HOTELS.flightFields({...f,tripType:'oneway'}, {...r,back:null});return {a:[a.start,a.end],b:[b.start,b.end]};}''');ok(edge['a']==['2026-11-17','2026-11-22'],'date helper respects arrival after midnight');ok(edge['b']==['2026-11-17','2026-11-20'],'one-way date helper defaults to 3 nights after actual arrival')
  ok(not errors,'no JavaScript errors: '+str(errors));ok(p.evaluate('document.documentElement.scrollWidth<=innerWidth'),'no mobile horizontal overflow');c.close()
 b.close()
open(f'{S}/{TAG}-checks.json','w').write(json.dumps({'checks':checks,'fails':fails,'actual_fares_mocked':False},ensure_ascii=False,indent=2));print('CHECKS',checks,'FAIL',len(fails),fails,flush=True);sys.exit(bool(fails))
