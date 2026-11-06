/* Wyszukiwanie lotów – prawdziwe ceny z publicznego API Ryanair (CORS: *). Żadnych wymyślonych cen.
   © Wojciech Wieczorek */
'use strict';
window.FL = (() => {
  const L = window.PL, { AIRPORTS } = window.PD;
  const RA = 'https://www.ryanair.com/api/views/locate/searchWidget/routes/pl/airport/';
  const FF = 'https://services-api.ryanair.com/farfnd/v4/oneWayFares/';
  const cache = new Map();
  async function getJSON(url, tries = 2) {
    if (cache.has(url) && Date.now()-cache.get(url).at<300000) return cache.get(url).p;
    const p = (async () => {
      for (let i = 0; i < tries; i++) {
        try {
          const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 15000);
          const r = await fetch(url, { signal: ctl.signal }); clearTimeout(t);
          if (r.status === 404) return null;
          if (r.ok) return await r.json();
        } catch (_) { }
        await new Promise(r => setTimeout(r, 600));
      }
      throw new Error('net');
    })();
    cache.set(url, {p,at:Date.now()}); p.catch(() => cache.delete(url));
    return p;
  }
  // ograniczenie równoległości
  async function pool(tasks, n = 6) { const out = []; let i = 0; await Promise.all(Array.from({ length: n }, async () => { while (i < tasks.length) { const k = i++; try { out[k] = await tasks[k](); } catch (e) { out[k] = { error: e }; } } })); return out; }

  async function routes(code) { const j = await getJSON(RA + code); return (j || []).map(r => ({ code: r.arrivalAirport.code, name: r.arrivalAirport.name, city: r.arrivalAirport.city && r.arrivalAirport.city.name, country: r.arrivalAirport.country && r.arrivalAirport.country.name, lat: r.arrivalAirport.coordinates.latitude, lon: r.arrivalAirport.coordinates.longitude })); }
  const monthKey = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
  // najtańszy lot każdego dnia w miesiącu (cena za 1 osobę, PLN)
  async function perDay(from, to, months) {
    const res = {};
    const js = await Promise.all([...new Set(months)].map(m => getJSON(`${FF}${from}/${to}/cheapestPerDay?outboundMonthOfDate=${m}&currency=PLN`)));
    js.forEach(j => ((j && j.outbound && j.outbound.fares) || []).forEach(f => { if (f.price && f.price.currencyCode==='PLN' && Number.isFinite(f.price.value) && !f.unavailable && !f.soldOut) res[f.day] = { price: f.price.value, dep: f.departureDate, arr: f.arrivalDate }; }));
    return res;
  }
  const dist = (a, b, c, d) => { const R = 6371, r = x => x * Math.PI / 180; const x = Math.sin(r(c - a) / 2) ** 2 + Math.cos(r(a)) * Math.cos(r(c)) * Math.sin(r(d - b) / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(x)); };
  const iso = L.iso, addDays = L.addDays;
  const pax = f => Math.max(1, +f.adults || 1) + Math.max(0, +f.children || 0);
  function bookUrl(f, o, d, out, back) {
    const ages=L.childAges(f),teens=ages.filter(x=>x>=12).length,children=ages.filter(x=>x<12).length;
    const p=new URLSearchParams({adults:Math.max(1,+f.adults||1),teens,children,infants:+f.infants||0,dateOut:out,isConnectedFlight:'false',isReturn:String(f.tripType!=='oneway'),discount:'0',promoCode:'',originIata:o,destinationIata:d});
    if(f.tripType!=='oneway'&&back)p.set('dateIn',back);
    return 'https://www.ryanair.com/pl/pl/trip/flights/select?'+p;
  }
  // kombinacje tam/powrót o zadanej liczbie nocy
  function combos(f, o, d, outMap, inMap, days, nights, exactOut) {
    const r = [];
    days.forEach(day => {
      const a = outMap[day]; if (!a) return;
      const one=f.tripType==='oneway',back=one?null:iso(addDays(new Date(day + 'T00:00:00'), nights)); const b=one?{price:0,dep:null,arr:null}:inMap[back]; if (!b) return;
      const pp = Math.round((a.price + b.price) * 100) / 100;
      r.push({ airline: 'Ryanair', from: o, to: d, out: day, back, outDep: a.dep, outArr: a.arr, inDep: b.dep, inArr: b.arr, priceOut: a.price, priceIn: b.price, perPerson: pp, total: Math.round(pp * pax(f) * 100) / 100, exact: day === exactOut, url: bookUrl(f, o, d, day, back) });
    });
    return r;
  }

  async function search(ctx, onProgress = () => { }) {
    const { f, dest, dt } = ctx;
    const t0 = new Date();
    const out = { checkedAt: t0, source: 'Ryanair (publiczne API cen)', results: [], exactFound: false, message: '', alternatives: { otherAirports: [], nearbyDest: [] }, errors: 0, searched: [] };
    if(dest.anywhere)return explore(ctx,onProgress);
    if (!dest.iata && !dest.all) { out.message = 'Nie znam kodu lotniska celu – wybierz cel z listy podpowiedzi albo wpisz kod IATA (np. CTA).'; return out; }
    const destCodes = dest.all ? dest.airports : [dest.iata, ...(dest.alt || [])];
    const origins = window.AP.members(f.origin).map(a=>a.code);
    if(!origins.length||!destCodes.length) {out.message='Wybierz kraj i lotnisko po obu stronach trasy.';return out;}
    const nights = dt.nights;
    // dni wylotu: dokładne ±3 dni albo cały miesiąc
    let days;
    if (dt.mode === 'month') { days = []; for (let d = new Date(dt.monthStart); d <= dt.monthEnd; d = addDays(d, 1)) days.push(iso(d)); }
    else days = [-3, -2, -1, 0, 1, 2, 3].map(k => iso(addDays(dt.start, k)));
    const today = iso(new Date()); days = days.filter(d => d >= today);
    const exactOut = dt.mode === 'exact' ? iso(dt.start) : null;
    const outMonths = days.map(d => d.slice(0, 7) + '-01');
    const inMonths = days.map(d => monthKey(addDays(new Date(d + 'T00:00:00'), nights)));

    onProgress(`Sprawdzam połączenia z: ${origins.join(', ')}…`);
    const rts = await pool(origins.map(o => () => routes(o)));
    const pairs = [];
    origins.forEach((o, i) => { const r = rts[i]; if (!r || r.error) { if (r && r.error) out.errors++; return; } destCodes.forEach(dc => { if (r.some(x => x.code === dc)) pairs.push([o, dc]); }); });
    out.searched = pairs.map(p => p.join('→'));
    const dayTxt = dt.mode === 'month' ? `${L.MONTHS[dt.m - 1]} ${dt.y}` : `${L.dm(addDays(dt.start, -3))}–${L.dm(addDays(dt.start, 3))}`;
    onProgress(pairs.length ? `Trasy Ryanair: ${out.searched.join(', ')}. Sprawdzam ceny w dniach ${dayTxt}…` : `Ryanair nie lata z ${origins.length > 1 ? AP.label(f.origin) : origins[0]} do ${dest.all ? dest.name : destCodes.join('/')} – szukam alternatyw…`);
    let done = 0;
    const res = await pool(pairs.map(([o, dc]) => async () => {
      const [om, im] = await Promise.all([perDay(o, dc, outMonths), f.tripType==='oneway'?Promise.resolve({}):perDay(dc, o, inMonths)]);
      onProgress(`Sprawdzono ${++done}/${pairs.length}: ${o} ⇄ ${dc} (${dayTxt})`);
      return combos(f, o, dc, om, im, days, nights, exactOut);
    }));
    res.forEach(r => { if (Array.isArray(r)) out.results.push(...r); else out.errors++; });
    out.results.forEach(enrich);out.results.sort((a, b) => a.total - b.total);
    out.exactFound = dt.mode === 'month' ? out.results.length > 0 : out.results.some(r => r.exact);
    const oName = AP.label(f.origin);
    const dName = dest.all ? dest.name : `${dest.city} (${destCodes.join('/')})`;
    const when = dt.mode === 'month' ? `w miesiącu ${L.MONTHS[dt.m - 1]} ${dt.y} (pobyt ${nights} nocy)` : `w wybranych datach (${L.dm(dt.start)}–${L.dmy(dt.end)})`;
    if (!out.exactFound) {
      out.message = out.results.length
        ? `Brak lotów Ryanair z ${oName} do ${dName} dokładnie ${when} — poniżej najbliższe terminy (±3 dni) z tym samym czasem pobytu.`
        : `Brak lotów Ryanair z ${oName} do ${dName} ${when} — spróbuj innego lotniska, dat lub miesiąca.`;
      // alternatywy: inne lotniska w Polsce (tylko gdy szukano jednego)
      let others = [], ors = [];
      if (!AP.isAll(f.origin)) {
        onProgress(`Brak lotów z ${f.origin} – sprawdzam inne lotniska w kraju ${AP.country(AP.countryOf(f.origin))?.name}…`);
        others = AP.members('ALL:'+AP.countryOf(f.origin)).map(a => a.code).filter(c => c !== f.origin);
        ors = await pool(others.map(o => () => routes(o)));
        const op = []; others.forEach((o, i) => { const r = ors[i]; if (Array.isArray(r)) destCodes.forEach(dc => { if (r.some(x => x.code === dc)) op.push([o, dc]); }); });
        const ores = await pool(op.map(([o, dc]) => async () => { const [om, im] = await Promise.all([perDay(o, dc, outMonths), f.tripType==='oneway'?Promise.resolve({}):perDay(dc, o, inMonths)]); return combos(f, o, dc, om, im, days, nights, exactOut); }));
        ores.forEach(r => Array.isArray(r) && out.alternatives.otherAirports.push(...r));
        out.alternatives.otherAirports.sort((a, b) => (b.exact - a.exact) || (a.total - b.total));
      }
      // alternatywy: pobliskie lotniska docelowe (do 250 km) z wybranych lotnisk
      onProgress('Sprawdzam pobliskie lotniska docelowe…');
      const near = new Map();
      [...origins, ...others].forEach((o, i) => { const r = i < origins.length ? rts[i] : ors[i - origins.length]; if (Array.isArray(r) && dest.lat) r.forEach(x => { const km = dist(dest.lat, dest.lon, x.lat, x.lon); if (km <= 250 && !destCodes.includes(x.code)) { if (!near.has(x.code) || near.get(x.code).km > km) near.set(x.code, { ...x, km, from: [] }); near.get(x.code).from.push(o); } }); });
      const nl = [...near.values()].sort((a, b) => a.km - b.km).slice(0, 4);
      nl.forEach(n => { n.from.sort((a, b) => (origins.includes(b) - origins.includes(a))); });
      const nres = await pool(nl.flatMap(n => n.from.slice(0, 3).map(o => async () => { const [om, im] = await Promise.all([perDay(o, n.code, outMonths), f.tripType==='oneway'?Promise.resolve({}):perDay(n.code, o, inMonths)]); return combos(f, o, n.code, om, im, days, nights, exactOut).map(x => ({ ...x, km: Math.round(n.km), toName: n.name })); })));
      nres.forEach(r => Array.isArray(r) && out.alternatives.nearbyDest.push(...r));
      out.alternatives.nearbyDest.sort((a, b) => (b.exact - a.exact) || (a.total - b.total));
    }
    if(out.errors && !out.results.length) {out.failed=true;out.message='Nie udało się sprawdzić wszystkich cen (błąd połączenia z Ryanair) – spróbuj ponownie.';}
    out.alternatives.otherAirports.forEach(enrich);out.alternatives.nearbyDest.forEach(enrich);out.doneAt = new Date();
    return out;
  }
  // Publiczny fare finder: najtańsze kierunki zwrócone przez API, bez wymyślania ofert.
  async function browse(f,from,start,end,nights,to,country) {
    const one=f.tripType==='oneway';
    const p=new URLSearchParams({departureAirportIataCode:from,outboundDepartureDateFrom:start,outboundDepartureDateTo:end,currency:'PLN'});
    if(to)p.set('arrivalAirportIataCode',to);if(country)p.set('arrivalCountryCode',country);
    if(!one){p.set('inboundDepartureDateFrom',iso(addDays(new Date(start+'T00:00:00'),nights)));p.set('inboundDepartureDateTo',iso(addDays(new Date(end+'T00:00:00'),nights)));p.set('tripDurationFrom',nights);p.set('tripDurationTo',nights);}
    const j=await getJSON('https://services-api.ryanair.com/farfnd/v4/'+(one?'oneWayFares':'roundTripFares')+'?'+p);
    return ((j&&j.fares)||[]).flatMap(x=>{
      const a=x.outbound,b=one?null:x.inbound;
      if(!a||a.price?.currencyCode!=='PLN'||(!one&&b?.price?.currencyCode!=='PLN'))return [];
      const o=a.departureAirport?.iataCode,d=a.arrivalAirport?.iataCode,out=a.departureDate?.slice(0,10),back=b?.departureDate?.slice(0,10)||null;
      if(country&&AP.byCode(d)?.country!==country)return [];
      if(!o||!d||!out||out<start||out>end||(!one&&Math.round((new Date(back)-new Date(out))/864e5)!==nights))return [];
      const pp=Math.round((a.price.value+(b?.price.value||0))*100)/100;if(!Number.isFinite(pp))return [];
      return [enrich({airline:'Ryanair',from:o,to:d,out,back,outDep:a.departureDate,outArr:a.arrivalDate,inDep:b?.departureDate||null,inArr:b?.arrivalDate||null,priceOut:a.price.value,priceIn:b?.price.value||0,perPerson:pp,total:Math.round(pp*pax(f)*100)/100,url:bookUrl(f,o,d,out,back)})];
    });
  }
  async function explore(ctx,onProgress=()=>{}) {
    const {f,dt}=ctx,os=AP.members(f.origin),today=iso(new Date());
    const start=dt.mode==='month'?iso(dt.monthStart):iso(addDays(dt.start,-3));
    const end=dt.mode==='month'?iso(dt.monthEnd):iso(addDays(dt.start,3));
    let n=0;
    const batches=await pool(os.map(o=>async()=>{onProgress(`Dowolne miejsce: sprawdzam kierunki z ${o.code} (${++n}/${os.length})…`);return browse(f,o.code,start<today?today:start,end,dt.nights);}),4);
    const results=batches.filter(Array.isArray).flat().map(r=>({...r,exact:dt.mode==='exact'&&r.out===iso(dt.start)})).sort((a,b)=>a.total-b.total);
    const errors=batches.filter(x=>x?.error).length;
    return {checkedAt:new Date(),doneAt:new Date(),source:'Ryanair (publiczny fare finder)',results,errors,failed:!results.length&&errors>0,exactFound:dt.mode==='month'?results.length>0:results.some(x=>x.exact),alternatives:{otherAirports:[],nearbyDest:[]},searched:os.map(x=>x.code+'→Dowolne miejsce'),message:errors?'Nie wszystkie lotniska odpowiedziały – lista może być niepełna.':!results.length?'Brak taryf Ryanair zwróconych dla tych dat. Spróbuj innego lotniska lub miesiąca.':'',subset:true};
  }
  async function calendar(f,month,leg='out') {
    if(f.dest==='ANY')return {prices:{},note:'Ceny dni w kalendarzu wymagają wybranego celu. Opcję Dowolne miejsce sprawdzisz przyciskiem Szukaj.'};
    const os=AP.members(f.origin),ds=AP.members(f.dest);if(!os.length||!ds.length)return {prices:{},note:'Najpierw wybierz lotniska Skąd i Dokąd, aby zobaczyć ceny.'};
    const rts=await pool(os.map(a=>()=>routes(a.code))),pairs=[];
    os.forEach((a,i)=>{if(Array.isArray(rts[i]))ds.forEach(b=>{if(rts[i].some(x=>x.code===b.code))pairs.push(leg==='back'?[b.code,a.code]:[a.code,b.code]);});});
    let errors=rts.filter(x=>x?.error).length;
    const maps=await pool(pairs.map(([a,b])=>()=>perDay(a,b,[month+'-01'])));
    const prices={};maps.forEach(m=>{if(m?.error){errors++;return;}Object.entries(m||{}).forEach(([day,r])=>{if(!prices[day]||r.price<prices[day].price)prices[day]=r;});});
    return {prices,checkedAt:new Date(),errors,note:errors?'Nie wszystkie ceny udało się odczytać.':pairs.length?'Ryanair · najtańszy lot dnia, za 1 os. · odczyt '+stamp(new Date())+' (Warszawa)':'Brak bezpośredniej trasy Ryanair – sprawdź inne lotniska.'};
  }
  async function cheapestMonths(f,progress=()=>{}) {
    const os=AP.members(f.origin),any=f.dest==='ANY',ds=AP.members(f.dest);if(!os.length||(!any&&!ds.length))return [];
    const base=new Date();base.setDate(1);base.setHours(0,0,0,0);
    const months=Array.from({length:12},(_,i)=>{const d=new Date(base.getFullYear(),base.getMonth()+i,1);return {value:iso(d).slice(0,7),start:iso(d)<iso(new Date())?iso(new Date()):iso(d),end:iso(new Date(d.getFullYear(),d.getMonth()+1,0)),price:null};});
    let done=0;
    const targets=any?[{}]:AP.isAll(f.dest)?[{country:AP.countryOf(f.dest)}]:ds;
    const tasks=months.flatMap(m=>os.flatMap(o=>targets.map(d=>async()=>{const r=await browse(f,o.code,m.start,m.end,+f.nights||7,d?.code,d?.country&&!d.code?d.country:null);if(r.length){const p=Math.min(...r.map(x=>x.perPerson));if(m.price===null||p<m.price)m.price=p;}progress(`Sprawdzono ${++done} zapytań · ${m.value}`);} )));
    await pool(tasks,4);return months;
  }
  // Czas podróży z lokalnych godzin API, z uwzględnieniem stref i DST.
  const ZONES={pl:'Europe/Warsaw',it:'Europe/Rome',es:'Europe/Madrid',pt:'Europe/Lisbon',gb:'Europe/London',ie:'Europe/Dublin',fr:'Europe/Paris',de:'Europe/Berlin',be:'Europe/Brussels',nl:'Europe/Amsterdam',at:'Europe/Vienna',ch:'Europe/Zurich',cz:'Europe/Prague',sk:'Europe/Bratislava',hu:'Europe/Budapest',hr:'Europe/Zagreb',si:'Europe/Ljubljana',ba:'Europe/Sarajevo',rs:'Europe/Belgrade',me:'Europe/Podgorica',al:'Europe/Tirane',mt:'Europe/Malta',gr:'Europe/Athens',cy:'Asia/Nicosia',ro:'Europe/Bucharest',bg:'Europe/Sofia',lt:'Europe/Vilnius',lv:'Europe/Riga',ee:'Europe/Tallinn',fi:'Europe/Helsinki',se:'Europe/Stockholm',dk:'Europe/Copenhagen',no:'Europe/Oslo',ma:'Africa/Casablanca',tr:'Europe/Istanbul',jo:'Asia/Amman',il:'Asia/Jerusalem',eg:'Africa/Cairo',lu:'Europe/Luxembourg',is:'Atlantic/Reykjavik'};
  function zone(code){return ['TFS','TFN','LPA','ACE','FUE','SPC'].includes(code)?'Atlantic/Canary':['PDL','TER','HOR'].includes(code)?'Atlantic/Azores':ZONES[AP.byCode(code)?.country];}
  function utc(s,code){if(!s)return null;if(/[Z]|[+-]\d{2}:?\d{2}$/.test(s))return Date.parse(s);const z=zone(code);if(!z)return null;const target=Date.parse(s+'Z');let t=target;const fmt=new Intl.DateTimeFormat('sv-SE',{timeZone:z,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'});for(let i=0;i<3;i++){const parts=Object.fromEntries(fmt.formatToParts(t).filter(p=>p.type!=='literal').map(p=>[p.type,p.value]));const local=Date.UTC(+parts.year,+parts.month-1,+parts.day,+parts.hour,+parts.minute,+parts.second);t+=target-local;}return t;}
  function duration(dep,arr,from,to){const a=utc(dep,from),b=utc(arr,to);return a!==null&&b!==null&&b>a?Math.round((b-a)/60000):null;}
  function enrich(r){r.outMinutes=duration(r.outDep,r.outArr,r.from,r.to);r.inMinutes=r.back?duration(r.inDep,r.inArr,r.to,r.from):0;r.duration=r.outMinutes!==null&&r.inMinutes!==null?r.outMinutes+r.inMinutes:null;return r;}
  function durationText(m){return m==null?'czas niedostępny':`${Math.floor(m/60)} h${m%60?' '+m%60+' min':''}`;}
  const hm = s => s ? s.slice(11, 16) : '';
  const fmtDate = s => { if(!s)return '—'; const d = new Date(s.slice(0, 10) + 'T00:00:00'); return `${L.DOW_S[d.getDay()]} ${L.dm(d)}`; };
  const zl2 = v => `${v.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).replace(/\u00a0|\u202f/g, ' ')} zł`;
  const stamp = d => new Intl.DateTimeFormat('pl-PL',{timeZone:'Europe/Warsaw',day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(d);
  return { search, calendar, cheapestMonths, hm, fmtDate, zl2, stamp, pax, bookUrl, duration, durationText };
})();
