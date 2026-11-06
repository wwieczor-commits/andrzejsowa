/* Wyszukiwanie lotów – prawdziwe ceny z publicznego API Ryanair (CORS: *). Żadnych wymyślonych cen.
   © Wojciech Wieczorek */
'use strict';
window.FL = (() => {
  const L = window.PL, { AIRPORTS } = window.PD;
  const RA = 'https://www.ryanair.com/api/views/locate/searchWidget/routes/pl/airport/';
  const FF = 'https://services-api.ryanair.com/farfnd/v4/oneWayFares/';
  const cache = new Map();
  async function getJSON(url, tries = 2) {
    if (cache.has(url)) return cache.get(url);
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
    cache.set(url, p); p.catch(() => cache.delete(url));
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
    js.forEach(j => ((j && j.outbound && j.outbound.fares) || []).forEach(f => { if (f.price && !f.unavailable && !f.soldOut) res[f.day] = { price: f.price.value, dep: f.departureDate, arr: f.arrivalDate }; }));
    return res;
  }
  const dist = (a, b, c, d) => { const R = 6371, r = x => x * Math.PI / 180; const x = Math.sin(r(c - a) / 2) ** 2 + Math.cos(r(a)) * Math.cos(r(c)) * Math.sin(r(d - b) / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(x)); };
  const iso = L.iso, addDays = L.addDays;
  const pax = f => Math.max(1, +f.adults || 1) + Math.max(0, +f.children || 0);
  function bookUrl(f, o, d, out, back) {
    return `https://www.ryanair.com/pl/pl/trip/flights/select?adults=${Math.max(1, +f.adults || 1)}&teens=0&children=${Math.max(0, +f.children || 0)}&infants=0&dateOut=${out}&dateIn=${back}&isConnectedFlight=false&isReturn=true&discount=0&promoCode=&originIata=${o}&destinationIata=${d}`;
  }
  // kombinacje tam/powrót o zadanej liczbie nocy
  function combos(f, o, d, outMap, inMap, days, nights, exactOut) {
    const r = [];
    days.forEach(day => {
      const a = outMap[day]; if (!a) return;
      const back = iso(addDays(new Date(day + 'T00:00:00'), nights)); const b = inMap[back]; if (!b) return;
      const pp = Math.round((a.price + b.price) * 100) / 100;
      r.push({ airline: 'Ryanair', from: o, to: d, out: day, back, outDep: a.dep, outArr: a.arr, inDep: b.dep, inArr: b.arr, priceOut: a.price, priceIn: b.price, perPerson: pp, total: Math.round(pp * pax(f) * 100) / 100, exact: day === exactOut, url: bookUrl(f, o, d, day, back) });
    });
    return r;
  }

  async function search(ctx, onProgress = () => { }) {
    const { f, dest, dt } = ctx;
    const t0 = new Date();
    const out = { checkedAt: t0, source: 'Ryanair (publiczne API cen)', results: [], exactFound: false, message: '', alternatives: { otherAirports: [], nearbyDest: [] }, errors: 0, searched: [] };
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
      const [om, im] = await Promise.all([perDay(o, dc, outMonths), perDay(dc, o, inMonths)]);
      onProgress(`Sprawdzono ${++done}/${pairs.length}: ${o} ⇄ ${dc} (${dayTxt})`);
      return combos(f, o, dc, om, im, days, nights, exactOut);
    }));
    res.forEach(r => { if (Array.isArray(r)) out.results.push(...r); else out.errors++; });
    out.results.sort((a, b) => a.total - b.total);
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
        const ores = await pool(op.map(([o, dc]) => async () => { const [om, im] = await Promise.all([perDay(o, dc, outMonths), perDay(dc, o, inMonths)]); return combos(f, o, dc, om, im, days, nights, exactOut); }));
        ores.forEach(r => Array.isArray(r) && out.alternatives.otherAirports.push(...r));
        out.alternatives.otherAirports.sort((a, b) => (b.exact - a.exact) || (a.total - b.total));
      }
      // alternatywy: pobliskie lotniska docelowe (do 250 km) z wybranych lotnisk
      onProgress('Sprawdzam pobliskie lotniska docelowe…');
      const near = new Map();
      [...origins, ...others].forEach((o, i) => { const r = i < origins.length ? rts[i] : ors[i - origins.length]; if (Array.isArray(r) && dest.lat) r.forEach(x => { const km = dist(dest.lat, dest.lon, x.lat, x.lon); if (km <= 250 && !destCodes.includes(x.code)) { if (!near.has(x.code) || near.get(x.code).km > km) near.set(x.code, { ...x, km, from: [] }); near.get(x.code).from.push(o); } }); });
      const nl = [...near.values()].sort((a, b) => a.km - b.km).slice(0, 4);
      nl.forEach(n => { n.from.sort((a, b) => (origins.includes(b) - origins.includes(a))); });
      const nres = await pool(nl.flatMap(n => n.from.slice(0, 3).map(o => async () => { const [om, im] = await Promise.all([perDay(o, n.code, outMonths), perDay(n.code, o, inMonths)]); return combos(f, o, n.code, om, im, days, nights, exactOut).map(x => ({ ...x, km: Math.round(n.km), toName: n.name })); })));
      nres.forEach(r => Array.isArray(r) && out.alternatives.nearbyDest.push(...r));
      out.alternatives.nearbyDest.sort((a, b) => (b.exact - a.exact) || (a.total - b.total));
    }
    if(out.errors && !out.results.length) {out.failed=true;out.message='Nie udało się sprawdzić wszystkich cen (błąd połączenia z Ryanair) – spróbuj ponownie.';}
    out.doneAt = new Date();
    return out;
  }
  const hm = s => s ? s.slice(11, 16) : '';
  const fmtDate = s => { const d = new Date(s.slice(0, 10) + 'T00:00:00'); return `${L.DOW_S[d.getDay()]} ${L.dm(d)}`; };
  const zl2 = v => `${v.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).replace(/\u00a0|\u202f/g, ' ')} zł`;
  const stamp = d => `${L.dmy(d)}, ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  return { search, hm, fmtDate, zl2, stamp, pax };
})();
