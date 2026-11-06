/* Planer podróży – linki, plan, szacunek budżetu, pogoda. © Wojciech Wieczorek */
'use strict';
window.PL = (() => {
  const { AIRPORTS, ATTR, TRANSPORT, ACC, find } = window.PD;
  const E = encodeURIComponent;
  const pad = n => String(n).padStart(2, '0');
  const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const parse = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const MONTHS = ['styczeń', 'luty', 'marzec', 'kwiecień', 'maj', 'czerwiec', 'lipiec', 'sierpień', 'wrzesień', 'październik', 'listopad', 'grudzień'];
  const MONTHS_GEN = ['stycznia', 'lutego', 'marca', 'kwietnia', 'maja', 'czerwca', 'lipca', 'sierpnia', 'września', 'października', 'listopada', 'grudnia'];
  const DOW = ['Niedziela', 'Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota'];
  const DOW_S = ['niedz.', 'pon.', 'wt.', 'śr.', 'czw.', 'pt.', 'sob.'];
  const dm = d => `${pad(d.getDate())}.${pad(d.getMonth() + 1)}`;
  const dmy = d => `${dm(d)}.${d.getFullYear()}`;
  const zl = n => `${Math.round(n).toLocaleString('pl-PL').replace(/\u00a0|\u202f/g, ' ')} zł`;
  const round10 = n => Math.round(n / 10) * 10;

  function resolveDest(text) {
    const A = window.AP;
    if(text==='ANY')return {anywhere:true,all:true,name:'Dowolne miejsce',city:'wybrany kierunek',q:'',airports:[]};
    if (A && A.isAll(text)) {const cc=A.countryOf(text);const c=A.country(cc);return {name:`${c?.name || cc} · wszystkie lotniska`,city:c?.name||cc,q:c?.en||cc,country:c?.name,countryCode:cc,all:true,airports:A.members(text).map(a=>a.code)};}
    const a = A && A.find(text);
    const d = a ? window.PD.DEST.find(d=>d.iata===a.code) : find(text);
    if (a) return {...(d||{}),known:!!d,name:d?.name||a.city,city:a.city,q:a.enCity||a.city,iata:a.code,alt:[],country:a.countryName,countryCode:a.country,lat:a.lat,lon:a.lon,airportName:a.airportName};
    if (d) return { ...d, known: true };
    const t = (text || '').trim();
    const code = (t.match(/\(([A-Za-z]{3})\)/) || t.match(/^([A-Za-z]{3})$/) || [])[1];
    const name = t.replace(/\(([A-Za-z]{3})\)/, '').trim() || (code ? code.toUpperCase() : 'Cel');
    return { key: null, known: false, name, city: name, q: name, iata: code ? code.toUpperCase() : null, lvl: 2, cur: '', airportName: code ? `${code.toUpperCase()} airport` : `${name} airport` };
  }

  // Daty: tryb dokładny albo miesiąc + długość (wtedy przykładowe daty ok. połowy miesiąca)
  function computeDates(f) {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    if (f.dateMode === 'exact' && f.depart && (f.ret||f.tripType==='oneway')) {
      const a = parse(f.depart), b = f.tripType==='oneway'?addDays(a,+f.nights||7):parse(f.ret);
      const nights = Math.max(1, Math.round((b - a) / 864e5));
      return { mode: 'exact', start: a, end: b, nights, sample: false };
    }
    const [y, m] = (f.month || iso(addDays(today, 30)).slice(0, 7)).split('-').map(Number);
    const nights = Math.max(1, Math.min(30, +f.nights || 7));
    let start = new Date(y, m - 1, 15);
    if (start < today) start = new Date(today);
    if(start.getMonth()!==m-1)start=new Date(y,m-1,1);
    return { mode: 'month', start, end: addDays(start, nights), nights, sample: true, y, m, monthStart: new Date(y, m - 1, 1), monthEnd: new Date(y, m, 0) };
  }

  function origins(f) { return window.AP ? AP.members(f.origin) : f.origin === 'ALL' ? AIRPORTS : AIRPORTS.filter(a => a.code === f.origin); }

  function buildLinks(f, dest, dt) {
    const ad = Math.max(1, +f.adults || 1), ch = Math.max(0, +f.children || 0);
    const ages = childAges(f),teens=ages.filter(a=>a>=12).length,young=ages.filter(a=>a<12).length;
    const out = iso(dt.start), back = iso(dt.end);
    const groups = [];
    const gTo = dest.iata || dest.q;
    const pax = ad + ch;
    const paxTxt = `${ad} adult${ad > 1 ? 's' : ''}${ch ? ` ${ch} child${ch > 1 ? 'ren' : ''}` : ''}${+f.infants?' '+f.infants+' infants':''}`;

    // --- LOTY ---
    const fl = [];
    // Google Flights rozumie tylko jedno lotnisko w q= (sprawdzone) – w trybie „miesiąc” daty przykładowe + kalendarz cen na stronie
    const gfUrl = (from) => `https://www.google.com/travel/flights?q=${E(`Flights to ${gTo} from ${from} on ${out}${f.tripType==='oneway'?' one way':` through ${back}`} ${paxTxt}`)}&curr=PLN&hl=pl&gl=PL`;
    const orig = origins(f);
    orig.forEach(a => fl.push({ label: `Google Flights – z ${a.name} (${a.code})`, url: gfUrl(a.code), note: dt.sample ? 'ceny w PLN · przykładowe daty – otwórz kalendarz cen' : 'ceny w PLN', perAirport: window.AP ? AP.isAll(f.origin) : f.origin === 'ALL' }));

    const sky = (from) => {
      const base = `https://www.skyscanner.pl/transport/loty/${from.toLowerCase()}/${(dest.iata || '').toLowerCase()}/`;
      const p = `adultsv2=${ad}${ch||+f.infants ? `&childrenv2=${[...ages,...Array(+f.infants||0).fill(0)].join('%7C')}` : ''}&cabinclass=economy&currency=PLN&market=PL&locale=pl-PL&rtn=${f.tripType==='oneway'?0:1}`;
      if (dt.mode === 'month') { const ym = `${String(dt.y).slice(2)}${pad(dt.m)}`; return `${base}?${p}&oym=${ym}&iym=${ym}`; }
      const s = d => `${String(d.getFullYear()).slice(2)}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
      return `${base}${s(dt.start)}/${f.tripType==='oneway'?'':s(dt.end)+'/'}?${p}`;
    };
    if (dest.iata) {
      fl.push({ label: AP.isAll(f.origin) ? `Skyscanner – z ${orig[0].code} (jedno lotnisko)` : `Skyscanner – z ${orig[0].code}`, url: sky(orig[0].code), note: dt.mode === 'month' ? 'widok całego miesiąca (PLN)' : 'PLN' });
      const destCodes = [dest.iata, ...(dest.alt || [])];
      orig.forEach(a => destCodes.forEach(dc => {
        const ry = f.tripType==='oneway' ? FL.bookUrl(f,a.code,dc,out,null) : dt.mode === 'month'
          ? `https://www.ryanair.com/pl/pl/fare-finder?originIata=${a.code}&destinationIata=${dc}&isReturn=true&adults=${ad}&teens=${teens}&children=${young}&infants=${+f.infants||0}&dateOut=${iso(dt.monthStart)}&dateIn=${iso(addDays(dt.monthEnd, dt.nights))}&daysTrip=${dt.nights}&isExactDate=false&currency=PLN`
          : FL.bookUrl(f,a.code,dc,out,back);
        fl.push({ label: `Ryanair – ${a.code} → ${dc}`, url: ry, note: dt.mode === 'month' ? 'wyszukiwarka najtańszych dni w miesiącu' : 'wybrane daty', perAirport: window.AP ? AP.isAll(f.origin) : f.origin === 'ALL', airline: 'ryanair' });
        fl.push({ label: `Wizz Air – ${a.code} → ${dc}`, url: `https://wizzair.com/pl-pl/booking/select-flight/${a.code}/${dc}/${out}/${f.tripType==='oneway'?'null':back}/${ad}/${ch}/${+f.infants||0}/null`, note: dt.sample ? 'przykładowe daty – zmień w kalendarzu Wizz' : 'wybrane daty', perAirport: window.AP ? AP.isAll(f.origin) : f.origin === 'ALL', airline: 'wizz' });
      }));
    } else {
      fl.push({label:'Ryanair – wyszukiwarka',url:'https://www.ryanair.com/pl/pl',note:'Kraj jako cel – gotowe linki do rezerwacji są przy znalezionych lotach.'});
      fl.push({ label: 'Skyscanner – wyszukaj cel', url: `https://www.skyscanner.pl/?currency=PLN&market=PL&locale=pl-PL`, note: 'podaj kod IATA w formularzu, aby link był pełny' });
    }
    groups.push({ id: 'loty', title: 'Loty', icon: 'plane', items: fl, note: 'Kursy i ceny pokazują strony przewoźników. Nie każde lotnisko ma połączenie do celu – pusta lista = brak lotów w tych dniach.' });

    // --- NOCLEG (Booking.com) ---
    const ht = { hotel: 204, apartament: 201, hostel: 203 }[f.accType];
    const nflt = [];
    if (ht) nflt.push(`ht_id=${ht}`);
    if (f.breakfast === 'tak') nflt.push('mealplan=1');
    const dmap = { c1: 1000, c3: 3000, c5: 5000 };
    if (dmap[f.distance]) nflt.push(`distance=${dmap[f.distance]}`);
    const ss = f.distance === 'airport' ? `${dest.airportName || dest.q + ' airport'}` : dest.q;
    const bk = (extra = [], order = '') => `https://www.booking.com/searchresults.pl.html?ss=${E(ss)}&checkin=${out}&checkout=${back}&group_adults=${ad}&group_children=${ch+(+f.infants||0)}${[...ages,...Array(+f.infants||0).fill(0)].map(a => `&age=${a}`).join('')}&no_rooms=1&selected_currency=PLN&lang=pl${[...nflt, ...extra].length ? `&nflt=${E([...nflt, ...extra].join(';'))}` : ''}${order ? `&order=${order}` : ''}`;
    const acc = [
      { label: `Booking.com – najtańsze (${ACC[f.accType] || 'dowolny'}${f.breakfast === 'tak' ? ', ze śniadaniem' : ''})`, url: bk([], 'price'), note: `${dt.nights} nocy, ${ad} dor.${ch ? ` + ${ch} dz.` : ''}`, kind: 'cheap' },
      { label: 'Booking.com – najlepiej oceniane w dobrej cenie', url: bk(['review_score=80'], 'review_score_and_price'), note: 'ocena 8+', kind: 'best' },
      { label: 'Booking.com – z darmowym odwołaniem', url: bk(['fc=2'], 'price'), note: 'bezpłatna anulacja', kind: 'free' }
    ];
    if (f.breakfast !== 'tak') acc.push({ label: 'Booking.com – wariant ze śniadaniem', url: bk(['mealplan=1'], 'price'), note: 'dla porównania', kind: 'bf' });
    acc.push({ label: 'Google Hotels – porównanie cen', url: `https://www.google.com/travel/search?q=${E('hotele ' + ss)}&hl=pl&gl=PL&curr=PLN`, note: 'ceny wielu serwisów', kind: 'gh' });
    groups.push({ id: 'nocleg', title: 'Nocleg', icon: 'bed', items: acc, note: `Daty ${dmy(dt.start)}–${dmy(dt.end)}${dt.sample ? ' (przykładowe – zmień w Booking)' : ''}. ${f.distance === 'airport' ? 'Wyszukiwanie wokół lotniska.' : ''}` });

    // --- TRANSFERY ---
    const tr = [];
    const T = f.transport || [];
    const ap = dest.iata ? `${dest.iata} airport ${dest.q}` : `${dest.q} airport`;
    tr.push({ label: 'Google Maps – lotnisko → centrum (komunikacja)', url: `https://www.google.com/maps/dir/?api=1&origin=${E(ap)}&destination=${E(dest.q)}&travelmode=transit`, note: 'rozkład i czas przejazdu', t: 'bus' });
    if (T.includes('taxi')) tr.push({ label: 'Google Maps – lotnisko → centrum (samochód/taxi)', url: `https://www.google.com/maps/dir/?api=1&origin=${E(ap)}&destination=${E(dest.q)}&travelmode=driving`, note: 'dystans i czas; cenę taxi sprawdź na miejscu', t: 'taxi' });
    if (T.includes('taxi')) tr.push({ label: 'Taksówki przy lotnisku (mapa)', url: `https://www.google.com/maps/search/?api=1&query=${E('taxi ' + ap)}`, note: 'postoje i firmy taxi', t: 'taxi' });
    if (T.includes('car')) {
      if (dest.iata) tr.push({ label: `Kayak – wynajem auta ${dest.iata}`, url: `https://www.kayak.pl/cars/${dest.iata}/${out}/${back}`, note: 'porównanie wypożyczalni, PLN', t: 'car' });
      tr.push({ label: 'Google Maps – wypożyczalnie aut', url: `https://www.google.com/maps/search/?api=1&query=${E('car rental ' + dest.q)}`, note: 'mapa lokalnych firm', t: 'car' });
    }
    if (T.includes('bus')) tr.push({ label: 'Rome2Rio – jak dojechać z lotniska', url: `https://www.rome2rio.com/pl/map/${E((dest.airportName || dest.q + ' airport').replace(/\s+/g, '-'))}/${E(dest.q.replace(/\s+/g, '-'))}`, note: 'wszystkie środki transportu', t: 'bus' });
    groups.push({ id: 'transfery', title: 'Transfery z lotniska', icon: 'bus', items: tr, note: dest.xfer || 'Najtańszy zwykle jest autobus lub pociąg z lotniska – sprawdź rozkład w Google Maps.' });

    // --- SKUTERY / ROWERY ---
    const want = (k) => T.includes(k) || (k === 'scooter' && (f.attractions || []).includes('skutery'));
    if (want('scooter')) {
      const it = [{ label: 'Google Maps – wypożyczalnie skuterów', url: `https://www.google.com/maps/search/?api=1&query=${E('scooter rental ' + dest.q)}`, note: 'mapa, opinie, godziny', t: 'scooter' },
        { label: 'Google – wypożyczalnia skuterów (wyszukiwarka)', url: `https://www.google.com/search?hl=pl&q=${E('wypożyczalnia skuterów ' + dest.q + ' cena za dzień')}`, note: 'ceny i warunki', t: 'scooter' }];
      (dest.rentals || []).forEach(r => it.push({ label: r.name, url: r.url, note: r.note, verified: true, t: 'scooter' }));
      groups.push({ id: 'skutery', title: 'Skutery', icon: 'scooter', items: it, note: 'Prawo jazdy: 50 cc zwykle wystarczy kat. B/AM; 125 cc – sprawdź przepisy kraju i warunki firmy. Kask obowiązkowy.' });
    }
    if (want('ebike')) groups.push({ id: 'ebike', title: 'Rower elektryczny (e-bike)', icon: 'ebike', items: [
      { label: 'Google Maps – wypożyczalnie e-bike', url: `https://www.google.com/maps/search/?api=1&query=${E('e-bike rental ' + dest.q)}`, note: 'mapa, opinie, godziny', t: 'ebike' },
      { label: 'Google – rower elektryczny wypożyczenie', url: `https://www.google.com/search?hl=pl&q=${E('wypożyczalnia rowerów elektrycznych ' + dest.q + ' cena')}`, note: 'ceny i warunki', t: 'ebike' }
    ], note: 'E-bike dobry na pagórkowate trasy. Sprawdź zasięg baterii, kaucję i czy w cenie jest kask i zapięcie.' });
    if (want('bike')) groups.push({ id: 'rower', title: 'Rower (zwykły)', icon: 'bike', items: [
      { label: 'Google Maps – wypożyczalnie rowerów', url: `https://www.google.com/maps/search/?api=1&query=${E('bike rental ' + dest.q)}`, note: 'mapa, opinie, godziny', t: 'bike' },
      { label: 'Google – wypożyczenie roweru', url: `https://www.google.com/search?hl=pl&q=${E('wypożyczalnia rowerów ' + dest.q + ' cena za dzień')}`, note: 'ceny i warunki, też rowery miejskie', t: 'bike' }
    ], note: 'Najtaniej często miejski system rowerowy (aplikacja) – sprawdź, czy działa w mieście.' });

    // --- JEDZENIE / ATRAKCJE ---
    const fd = [{ label: 'Google Maps – tanie jedzenie w okolicy', url: `https://www.google.com/maps/search/?api=1&query=${E('cheap food ' + dest.q)}`, note: 'sortuj po opiniach i cenie ($)' },
      { label: 'Google Maps – street food / lokalne bary', url: `https://www.google.com/maps/search/?api=1&query=${E('street food ' + dest.q)}`, note: dest.food || 'lokalne przysmaki' }];
    if ((f.attractions || []).includes('zwiedzanie')) fd.push({ label: 'Google Maps – atrakcje turystyczne', url: `https://www.google.com/maps/search/?api=1&query=${E('tourist attractions ' + dest.q)}`, note: 'zabytki i punkty widokowe' });
    if ((f.attractions || []).includes('plaze')) fd.push({ label: 'Google Maps – plaże', url: `https://www.google.com/maps/search/?api=1&query=${E('beaches near ' + dest.q)}`, note: 'najbliższe plaże' });
    groups.push({ id: 'jedzenie', title: 'Jedzenie i atrakcje', icon: 'food', items: fd });
    return groups;
  }

  function childAges(f) {
    const n = Math.max(0, +f.children || 0);
    const a = String(f.childAges || '').split(/[ ,;]+/).map(Number).filter(x => x >= 0 && x <= 17);
    return Array.from({ length: n }, (_, i) => (a[i] ?? 8));
  }

  // --- PLAN DZIEŃ PO DNIU ---
  function buildPlan(f, dest, dt) {
    const days = dt.nights + 1, A = f.attractions && f.attractions.length ? f.attractions : ['zwiedzanie', 'jedzenie'];
    const T = f.transport || [];
    const city = dest.city || dest.name;
    const sights = dest.sights || [[`Centrum: ${city}`, 'stare miasto · główny plac · punkty widokowe'], ['Muzea i zabytki', 'najważniejsze miejsca wg Google Maps'], ['Wycieczka w okolice', 'najbliższe miasteczko lub park krajobrazowy']];
    const beaches = dest.beaches || [['Najbliższa plaża', 'sprawdź w linku „plaże” w Google Maps'], ['Plaża poza miastem', 'dojazd autobusem lub skuterem']];
    const out = []; let si = 0, bi = 0, k = 0;
    const mid = A.filter(a => a !== 'jedzenie');
    const rot = mid.length ? mid : ['zwiedzanie'];
    for (let i = 0; i < days; i++) {
      const date = addDays(dt.start, i), first = i === 0, last = i === days - 1;
      let d;
      if (first) d = { kind: 'arr', title: `Przylot i pierwsze kroki: ${city}`, sub: `Transfer z lotniska · zameldowanie · spacer`, am: `Dojazd na lotnisko w Polsce (być ok. 2 h przed wylotem). Wylot – godzina wg rezerwacji.`, pm: `Przylot, transfer ${T.includes('taxi') ? 'taksówką' : 'komunikacją (najtaniej)'} do noclegu. ${dest.xfer ? 'Wskazówka: ' + dest.xfer.split(';')[0] + '.' : ''}`, eve: `Krótki spacer po okolicy, ${A.includes('jedzenie') ? 'kolacja w lokalnym barze – ' + (dest.food || 'lokalne specjały') : 'kolacja i odpoczynek'}.`, tip: 'Pierwszy dzień bez pośpiechu – bagaż do noclegu, potem tylko kilka godzin zwiedzania.' };
      else if (last && f.tripType!=='oneway') d = { kind: 'dep', title: 'Wyjazd', sub: 'Wymeldowanie · transfer na lotnisko · powrót', am: 'Śniadanie, pakowanie, wymeldowanie (zwykle do 10–11).', pm: `Transfer na lotnisko (być ok. 2 h przed wylotem). ${T.includes('car') || T.includes('scooter') ? 'Zwrot pojazdu z zapasem czasu.' : ''}`, eve: 'Przylot do Polski i powrót do domu.', tip: 'Sprawdź limit bagażu podręcznego w tanich liniach – za walizkę płaci się osobno.' };
      else {
        const a = rot[k++ % rot.length];
        if (a === 'plaze') { const b = beaches[bi++ % beaches.length]; d = { kind: 'beach', title: `Plaża: ${b[0]}`, sub: b[1], am: `Dojazd na plażę ${b[0]}${T.includes('scooter') ? ' (skuterem)' : T.includes('ebike') ? ' (e-bikiem)' : T.includes('bike') ? ' (rowerem)' : ' komunikacją'}.`, pm: 'Plażowanie, kąpiel, krem z filtrem i woda.', eve: A.includes('jedzenie') ? 'Kolacja w nadmorskiej knajpce – ryby/owoce morza, ceny w karcie sprawdź przed zamówieniem.' : 'Zachód słońca nad morzem.', tip: 'Leżaki i parasole są zwykle płatne – ręcznik plażowy to oszczędność.' }; }
        else if (a === 'skutery') { d = { kind: 'scooter', title: 'Dzień na skuterze', sub: dest.scooter || 'wybrzeże i okoliczne miasteczka', am: 'Odbiór skutera (prawo jazdy, dowód, kaucja – wg firmy). Krótka jazda próbna.', pm: `Trasa: ${dest.scooter || 'wzdłuż wybrzeża do sąsiednich miejscowości'}. Postój na kawę i zdjęcia.`, eve: 'Powrót, tankowanie do pełna (jeśli wymagane) i zwrot skutera.', tip: 'Zrób zdjęcia skutera przy odbiorze (rysy) – unikniesz sporów o kaucję.' }; }
        else { const s = sights[si++ % sights.length]; d = { kind: 'sight', title: `Zwiedzanie: ${s[0]}`, sub: s[1], am: `Start wcześnie rano – ${s[0]} (mniej ludzi, chłodniej).`, pm: `${s[1]}. Bilety najlepiej kupić online z wyprzedzeniem.`, eve: A.includes('jedzenie') ? `Kolacja: ${dest.food || 'lokalna kuchnia w bocznych uliczkach (taniej niż przy głównych placach)'}.` : 'Spacer wieczorny i odpoczynek.', tip: 'Wygodne buty i butelka wody – zwiedzanie to dużo chodzenia.' }; }
        if (!A.includes('plaze') && !A.includes('skutery') && !A.includes('zwiedzanie') && A.includes('jedzenie')) d = { kind: 'food', title: 'Kulinarny dzień', sub: dest.food || 'lokalne targi i bary', am: 'Targ / hala targowa – śniadanie z lokalnymi produktami.', pm: 'Street food i degustacje w kilku miejscach.', eve: 'Kolacja tam, gdzie jedzą miejscowi (menu dnia).', tip: 'Menu dnia w porze lunchu jest zwykle najtańsze.' };
      }
      out.push({ ...d, date, dow: DOW[date.getDay()], dowS: DOW_S[date.getDay()] });
    }
    return out;
  }

  // --- SZACUNEK BUDŻETU (PLN) – orientacyjny, NIE jest ceną ofertową ---
  function estimate(f, dest, dt, plan) {
    const L = Math.min(3, Math.max(1, dest.lvl || 2)) - 1;
    const ad = Math.max(1, +f.adults || 1), ch = Math.max(0, +f.children || 0), p = ad + ch * 0.8;
    const n = dt.nights, mon = dt.start.getMonth() + 1, high = [6, 7, 8].includes(mon) || [12].includes(mon);
    const flight = [[250, 700], [300, 900], [350, 1100]][L].map(v => v * (high ? 1.3 : 1));
    const rooms = Math.ceil((ad + ch) / 3);
    const nightBase = { hostel: [70, 100, 140].map(v => v * (ad + ch)), apartament: [170, 250, 360], hotel: [220, 320, 450], dowolny: [150, 220, 320] }[f.accType || 'dowolny'][L] * (f.accType === 'hostel' ? 1 : rooms);
    const bf = f.breakfast === 'tak' ? 1.15 : 1, centre = f.distance === 'c1' ? 1.2 : 1;
    const night = nightBase * bf * centre * (high ? 1.3 : 1);
    const food = [60, 90, 130][L] * p * (n + 1);
    const T = f.transport || [];
    let local = 0; const items = [];
    const xfer = T.includes('taxi') ? [80, 120, 180][L] * 2 * Math.ceil((ad + ch) / 4) : [15, 25, 40][L] * 2 * (ad + ch);
    local += xfer; items.push(['Transfery lotnisko', xfer]);
    const sc = plan.filter(d => d.kind === 'scooter').length || (T.includes('scooter') ? 1 : 0);
    if (sc) { const v = [110, 150, 190][L] * sc * Math.ceil(ad / 2); local += v; items.push([`Skuter (${sc} dz.)`, v]); }
    if (T.includes('car')) { const v = [110, 150, 200][L] * n; local += v; items.push([`Auto (${n} dni, bez paliwa)`, v]); }
    if (T.includes('ebike')) { const v = [90, 130, 170][L] * (ad + ch); local += v; items.push(['E-bike (1 dzień)', v]); }
    if (T.includes('bike')) { const v = [40, 60, 90][L] * (ad + ch); local += v; items.push(['Rower (1 dzień)', v]); }
    if (T.includes('bus')) { const v = [10, 15, 25][L] * (ad + ch) * Math.max(1, n - 1); local += v; items.push(['Komunikacja na miejscu', v]); }
    const att = (f.attractions || []).includes('zwiedzanie') ? [30, 60, 90][L] * p * plan.filter(d => d.kind === 'sight').length : 0;
    if (att) items.push(['Bilety wstępu', att]);
    const fl = flight.map(v => v * (ad + ch * 0.9));
    const accom = [night * n * 0.85, night * n * 1.25];
    const low = fl[0] + accom[0] + food * 0.8 + local * 0.8 + att * 0.8;
    const highT = fl[1] + accom[1] + food * 1.2 + local * 1.2 + att * 1.2;
    return { flights: fl.map(round10), accom: accom.map(round10), night: round10(night), food: round10(food), local: round10(local), att: round10(att), items: items.map(([a, b]) => [a, round10(b)]), low: round10(low), high: round10(highT), budget: +f.budget || 0 };
  }

  // --- POGODA (Open-Meteo: prognoza ≤14 dni, inaczej średnia z 5 lat z archiwum) ---
  async function geocode(dest) {
    if (dest.lat) return { lat: dest.lat, lon: dest.lon };
    const r = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${E(dest.q)}&count=1&language=pl`);
    const j = await r.json(); const g = j.results && j.results[0];
    return g ? { lat: g.latitude, lon: g.longitude, label: `${g.name}, ${g.country || ''}` } : null;
  }
  async function weather(dest, dt) {
    if(dest.all) return null; // kraju nie traktujemy jak jednego miejsca z jedną prognozą
    const g = await geocode(dest); if (!g) return null;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const days = Array.from({ length: dt.nights + 1 }, (_, i) => addDays(dt.start, i));
    const res = { source: '', days: [], kind: '' };
    const lastDay = days[days.length - 1];
    if ((lastDay - today) / 864e5 <= 15 && dt.start >= today) {
      const j = await (await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${g.lat}&longitude=${g.lon}&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto&start_date=${iso(dt.start)}&end_date=${iso(lastDay)}`)).json();
      res.kind = 'forecast'; res.source = 'Open-Meteo – prognoza';
      res.days = days.map((d, i) => ({ date: d, tmax: j.daily.temperature_2m_max[i], tmin: j.daily.temperature_2m_min[i], rain: j.daily.precipitation_probability_max[i] }));
    } else {
      const y1 = today.getFullYear() - 5, y2 = today.getFullYear() - 1;
      const j = await (await fetch(`https://archive-api.open-meteo.com/v1/archive?latitude=${g.lat}&longitude=${g.lon}&start_date=${y1}-01-01&end_date=${y2}-12-31&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=auto`)).json();
      const by = {};
      j.daily.time.forEach((t, i) => { const k = t.slice(5); (by[k] = by[k] || []).push([j.daily.temperature_2m_max[i], j.daily.temperature_2m_min[i], j.daily.precipitation_sum[i]]); });
      const avg = (a, idx) => a.reduce((s, x) => s + (x[idx] ?? 0), 0) / a.length;
      res.kind = 'climate'; res.source = `Open-Meteo – średnia z lat ${y1}–${y2} dla tych dni (to nie prognoza)`;
      res.days = days.map(d => { const a = by[iso(d).slice(5)] || []; return a.length ? { date: d, tmax: avg(a, 0), tmin: avg(a, 1), rain: Math.round(100 * a.filter(x => (x[2] || 0) >= 1).length / a.length) } : { date: d }; });
    }
    try { // temperatura morza z tych samych dni rok wcześniej (jeśli to wybrzeże)
      const s = addDays(dt.start, -365), e = addDays(lastDay, -365);
      const m = await (await fetch(`https://marine-api.open-meteo.com/v1/marine?latitude=${g.lat}&longitude=${g.lon}&daily=sea_surface_temperature_max&start_date=${iso(s)}&end_date=${iso(e)}&cell_selection=sea`)).json();
      const v = (m.daily && m.daily.sea_surface_temperature_max || []).filter(x => x != null);
      if (v.length) res.sea = v.reduce((a, b) => a + b, 0) / v.length;
    } catch (_) { }
    return res;
  }

  function nearbyNote(f) { return window.AP ? AP.label(f.origin) : f.origin === 'ALL' ? 'wszystkie lotniska w Polsce' : (AIRPORTS.find(a => a.code === f.origin) || {}).name; }

  return { resolveDest, computeDates, buildLinks, buildPlan, estimate, weather, iso, dm, dmy, zl, MONTHS, MONTHS_GEN, DOW_S, nearbyNote, childAges, addDays };
})();
