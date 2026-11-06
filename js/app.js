/* Planer podróży – interfejs. © Wojciech Wieczorek */
'use strict';
(() => {
  const { AIRPORTS, DEST, ACC, ATTR, TRANSPORT, DIST } = window.PD;
  const L = window.PL;
  const $ = s => document.querySelector(s);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const KEY = 'sowa.planer.form.v1';
  const form = $('#f');
  $('#ver').textContent = window.APP_VERSION || '';

  // --- wypełnienie list ---
  $('#origin').innerHTML = `<option value="ALL">Wszystkie lotniska w Polsce</option>` + AIRPORTS.map(a => `<option value="${a.code}">${esc(a.name)} (${a.code})</option>`).join('');
  $('#origin').value = 'KRK';
  $('#destList').innerHTML = DEST.map(d => `<option value="${esc(d.name)} (${d.iata})">${esc(d.country)}</option>`).join('');
  const POP = ['katania', 'malaga', 'alicante', 'barcelona', 'rzym', 'ateny', 'kreta', 'majorka', 'lizbona', 'porto', 'teneryfa', 'antalya', 'burgas'];
  $('#sugg').innerHTML = POP.map(k => DEST.find(d => d.key === k)).map(d => `<button type="button" data-v="${esc(d.name)} (${d.iata})">${esc(d.city === d.name ? d.name : d.name.split(' (')[0])} · ${d.iata}</button>`).join('');
  $('#sugg').addEventListener('click', e => { const b = e.target.closest('button'); if (b) { $('#dest').value = b.dataset.v; save(); } });

  // domyślne daty: za ok. 3 tygodnie, 7 nocy
  const t0 = L.addDays(new Date(), 21); t0.setHours(0, 0, 0, 0);
  $('#depart').value = L.iso(t0); $('#ret').value = L.iso(L.addDays(t0, 7)); $('#month').value = L.iso(L.addDays(new Date(), 35)).slice(0, 7);
  $('#depart').min = L.iso(new Date());

  // --- zapis / odczyt formularza ---
  function read() {
    const fd = new FormData(form), o = {};
    for (const [k, v] of fd.entries()) { if (k === 'attractions' || k === 'transport') (o[k] = o[k] || []).push(v); else o[k] = v; }
    o.attractions = o.attractions || []; o.transport = o.transport || [];
    return o;
  }
  function write(o) {
    for (const el of form.elements) {
      if (!el.name || !(el.name in o)) continue;
      if (el.type === 'checkbox') el.checked = (o[el.name] || []).includes(el.value);
      else if (el.type === 'radio') el.checked = o[el.name] === el.value;
      else el.value = o[el.name];
    }
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(read())); } catch (_) { } }
  try { const s = JSON.parse(localStorage.getItem(KEY) || 'null'); if (s) { if (s.depart && s.depart < L.iso(new Date())) { delete s.depart; delete s.ret; } write(s); } } catch (_) { }

  function syncMode() {
    const m = form.querySelector('[name=dateMode]:checked').value;
    form.querySelector('.mode-exact').hidden = m !== 'exact'; form.querySelector('.mode-month').hidden = m !== 'month';
    form.querySelector('.ages').hidden = !(+form.children.value > 0);
  }
  form.addEventListener('input', () => { syncMode(); save(); });
  form.addEventListener('change', () => {
    if (+new Date($('#ret').value) <= +new Date($('#depart').value)) $('#ret').value = L.iso(L.addDays(new Date($('#depart').value), 7));
    syncMode(); save();
  });
  syncMode();
  // --- sekcje krok po kroku ---
  const steps = [...form.querySelectorAll('details.fs')];
  form.addEventListener('click', e => {
    const n = e.target.closest('.next'); if (!n) return;
    const cur = n.closest('details'), nx = steps[+n.dataset.next - 1];
    cur.open = false; if (nx) { nx.open = true; setTimeout(() => nx.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60); }
  });
  function sums() {
    const f = read(), S = n => form.querySelector(`[data-sum="${n}"]`);
    S(1).textContent = `${f.origin === 'ALL' ? 'Wszystkie lotniska' : f.origin} → ${f.dest || 'wybierz cel'}`;
    S(2).textContent = f.dateMode === 'exact' ? `${f.depart || '?'} – ${f.ret || '?'}` : `${f.month || '?'}, ${f.nights} nocy`;
    S(3).textContent = `${f.adults} dor.${+f.children ? ` + ${f.children} dz.` : ''}${f.budget ? ` · ${f.budget} zł` : ''}`;
    S(4).textContent = `${ACC[f.accType]} · śniadanie: ${f.breakfast} · ${DIST[f.distance]}`;
    S(5).textContent = [...f.attractions.map(a => ATTR[a]), ...f.transport.map(t => TRANSPORT[t])].join(', ') || 'brak';
  }
  form.addEventListener('input', sums); form.addEventListener('change', sums); sums();
  $('#barLinks').addEventListener('click', () => form.requestSubmit ? form.requestSubmit() : form.dispatchEvent(new Event('submit', { cancelable: true })));
  $('#reset').addEventListener('click', () => { localStorage.removeItem(KEY); location.reload(); });

  // --- obliczenia ---
  let ctx = null;
  function compute() {
    const f = read();
    const dest = L.resolveDest(f.dest), dt = L.computeDates(f);
    const groups = L.buildLinks(f, dest, dt), plan = L.buildPlan(f, dest, dt), est = L.estimate(f, dest, dt, plan);
    return { f, dest, dt, groups, plan, est, wx: null, created: new Date() };
  }
  const ICON = { plane: '✈️', bed: '🛏️', bus: '🚌', scooter: '🛵', ebike: '⚡', bike: '🚲', food: '🍝' };
  const DICON = { arr: '🛬', dep: '🛫', beach: '🏖️', scooter: '🛵', sight: '🏛️', food: '🍝' };

  function render() {
    const { f, dest, dt, groups, plan, est } = ctx;
    const dates = `${L.dmy(dt.start)} – ${L.dmy(dt.end)}`;
    $('#summary').innerHTML = `<div><h3>${esc(L.nearbyNote(f))} → ${esc(dest.name)}${dest.iata ? ` (${dest.iata})` : ''}</h3>
      <p>${dt.mode === 'month' ? `${L.MONTHS[dt.m - 1]} ${dt.y}, ${dt.nights} nocy · przykładowe daty ${dates}` : `${dates} · ${dt.nights} nocy`} · ${f.adults} dor.${+f.children ? ` + ${f.children} dz.` : ''}${f.budget ? ` · budżet ${L.zl(f.budget)}` : ''}</p></div>
      <div class="badge">Szacunek łącznie<b>${L.zl(est.low)} – ${L.zl(est.high)}</b>orientacyjnie</div>`;
    $('#groups').innerHTML = groups.map(g => {
      const main = g.items.filter(i => !i.perAirport), per = g.items.filter(i => i.perAirport);
      const item = i => `<a class="lnk${i.verified ? ' ver' : ''}" href="${esc(i.url)}" target="_blank" rel="noopener" data-group="${g.id}"><span><b>${esc(i.label)}</b><small>${esc(i.note || '')}${i.verified ? ' · sprawdzone 6.11.2026' : ''}</small></span><span class="go">Otwórz →</span></a>`;
      return `<div class="card group" id="g-${g.id}"><h3>${ICON[g.icon] || ''} ${esc(g.title)}</h3>${g.note ? `<p class="gnote">${esc(g.note)}</p>` : ''}
        <div class="links">${main.map(item).join('')}</div>
        ${per.length ? `<details class="more"><summary>Linki dla każdego lotniska (${per.length})</summary><div class="links">${per.map(item).join('')}</div></details>` : ''}</div>`;
    }).join('');
    const over = est.budget && est.low > est.budget, tight = est.budget && !over && est.high > est.budget;
    $('#budgetCard').innerHTML = `<h3>💰 Budżet <span class="tag-est">szacunek</span></h3>
      <p class="gnote">Orientacyjne widełki dla ${f.adults} dor.${+f.children ? ` + ${f.children} dz.` : ''}, ${dt.nights} nocy. To <strong>nie są ceny ofert</strong> – prawdziwe ceny zobaczysz po kliknięciu linków.</p>
      <div class="brow">
        <div class="bi"><b>${L.zl(est.flights[0])}–${L.zl(est.flights[1])}</b>Loty (tanie linie)</div>
        <div class="bi"><b>${L.zl(est.accom[0])}–${L.zl(est.accom[1])}</b>Nocleg (${dt.nights} nocy)</div>
        <div class="bi"><b>~${L.zl(est.food)}</b>Jedzenie (tanio)</div>
        <div class="bi"><b>~${L.zl(est.local)}</b>Transport na miejscu</div>
        ${est.att ? `<div class="bi"><b>~${L.zl(est.att)}</b>Bilety wstępu</div>` : ''}
      </div>
      ${est.budget ? `<div class="bstat ${over ? 'warn' : 'ok'}">${over ? `Budżet ${L.zl(est.budget)} może nie wystarczyć – spróbuj krótszego pobytu, hostelu lub tańszego miesiąca.` : tight ? `Budżet ${L.zl(est.budget)} wystarczy przy tańszych wyborach.` : `Budżet ${L.zl(est.budget)} powinien wystarczyć.`}</div>` : ''}`;
    $('#weatherCard').innerHTML = `<h3>🌤️ Pogoda</h3><p class="gnote">Ładowanie danych pogodowych…</p>`;
    $('#planCard').innerHTML = `<h3>🗺️ Plan dzień po dniu</h3><p class="gnote">Propozycja ogólna – dopasuj do godzin lotów.${dest.known && dest.sights ? '' : ' Dla tego celu brak wbudowanych podpowiedzi – plan jest szablonem.'}</p>` +
      plan.map((d, i) => `<div class="day"><div class="day-head"><span class="ic">${DICON[d.kind] || '📍'}</span><span><b>Dzień ${i + 1} · ${d.dow} ${L.dm(d.date)} — ${esc(d.title)}</b><small>${esc(d.sub)}</small></span></div>
        <div class="slots"><div class="slot"><i>Rano</i>${esc(d.am)}</div><div class="slot pm"><i>Popołudnie</i>${esc(d.pm)}</div><div class="slot eve"><i>Wieczór</i>${esc(d.eve)}</div></div>
        <div class="tip"><strong>Tip:</strong> ${esc(d.tip)}</div></div>`).join('');
    $('#out').hidden = false;
  }
  function renderWeather() {
    const w = ctx.wx;
    if (!w || !w.days || !w.days.some(d => d.tmax != null)) { $('#weatherCard').innerHTML = `<h3>🌤️ Pogoda</h3><p class="gnote">Brak danych pogodowych (brak internetu lub nieznany cel).</p>`; return; }
    $('#weatherCard').innerHTML = `<h3>🌤️ Pogoda ${w.kind === 'forecast' ? '<span class="tag-est">prognoza</span>' : '<span class="tag-est">typowa / szacunek</span>'}</h3>
      <div class="wx-strip">${w.days.map(d => `<div class="wx-day"><div class="wd">${L.dm(d.date)}</div><div class="wt">${d.tmax != null ? Math.round(d.tmax) + '°/' + Math.round(d.tmin) + '°' : '–'}</div><div class="ws">${d.rain != null ? (w.kind === 'forecast' ? 'deszcz ' : 'dni z deszczem ') + d.rain + '%' : ''}</div></div>`).join('')}</div>
      <p class="src">${esc(w.source)}${w.sea ? ` · morze ok. ${Math.round(w.sea)}°C (te same dni rok wcześniej)` : ''}. Dane: Open-Meteo.com (CC BY 4.0).</p>`;
  }

  // --- prawdziwe loty (Ryanair API) ---
  const F = window.FL;
  function legHtml(label, date, dep, arr, from, to) {
    return `<div class="fl-leg"><span class="d">${label} ${esc(F.fmtDate(date))}</span><span class="t">${esc(F.hm(dep))} → ${esc(F.hm(arr))}</span><span class="r">${esc(from)} → ${esc(to)}</span></div>`;
  }
  function flCard(r, extra = '') {
    const n = F.pax(ctx.f);
    return `<div class="fl-card${r.exact ? ' exact' : ''}" data-total="${r.total}">
      <div class="fl-top"><div><span class="fl-air">✈️ ${esc(r.airline)} · bez przesiadek</span>${r.exact ? '<span class="fl-badge">Twoje daty</span>' : ''}${extra}</div>
      <div><div class="fl-price">${F.zl2(r.total)}</div><div class="fl-pp">${n > 1 ? `${F.zl2(r.perPerson)} / os. × ${n}` : 'za osobę, tam i z powrotem'}</div></div></div>
      ${legHtml('Wylot', r.out, r.outDep, r.outArr, r.from, r.to)}
      ${legHtml('Powrót', r.back, r.inDep, r.inArr, r.to, r.from)}
      <a class="fl-book" href="${esc(r.url)}" target="_blank" rel="noopener">Rezerwuj w Ryanair →</a></div>`;
  }
  function renderFlights() {
    const el = $('#flightsCard'), c = ctx; el.hidden = false;
    const fl = c.fl;
    if (!fl || fl.loading) { el.innerHTML = `<div class="fl-head"><h3>✈️ Znalezione loty</h3></div><div class="fl-load"><span class="spin"></span><span id="flProg">${esc((fl && fl.progress) || 'Szukam lotów…')}</span></div>`; return; }
    if (fl.failed) { el.innerHTML = `<h3>✈️ Znalezione loty</h3><div class="fl-msg">Nie udało się połączyć z wyszukiwarką lotów (brak internetu?). Spróbuj ponownie albo użyj linków poniżej.</div><button class="btn ghost fl-more" id="flRetry">Spróbuj ponownie</button>`; $('#flRetry').onclick = () => run(); return; }
    const r = fl.results;
    let h = `<div class="fl-head"><h3>✈️ Znalezione loty</h3></div><p class="fl-stamp">Ceny z dnia ${esc(F.stamp(fl.checkedAt))} · źródło: ${esc(fl.source)} · ${r.length} ${r.length === 1 ? 'wynik' : 'wyników'}, od najtańszego</p>`;
    if (fl.message) h += `<div class="fl-msg">${esc(fl.message)}</div>`;
    if (r.length) {
      h += r.slice(0, 6).map(x => flCard(x)).join('');
      if (r.length > 6) h += `<details class="more"><summary>Pokaż więcej wyników (${r.length - 6})</summary>${r.slice(6, 40).map(x => flCard(x)).join('')}</details>`;
    }
    const A = fl.alternatives || {};
    if (!fl.exactFound && (A.otherAirports.length || A.nearbyDest.length)) {
      h += `<div class="fl-alt">`;
      if (A.otherAirports.length) {
        const best = {}; A.otherAirports.forEach(x => { if (!best[x.from]) best[x.from] = x; });
        h += `<h4>💡 Z innych lotnisk w Polsce</h4>` + Object.values(best).slice(0, 4).map(x => flCard(x, '') + `<button class="btn ghost use" data-origin="${x.from}">Szukaj z ${esc((AIRPORTS.find(a => a.code === x.from) || {}).name || x.from)} (${x.from})</button>`).join('');
      }
      if (A.nearbyDest.length) {
        const best = {}; A.nearbyDest.forEach(x => { const k = x.from + x.to; if (!best[k]) best[k] = x; });
        h += `<h4>💡 Pobliskie lotniska docelowe</h4>` + Object.values(best).slice(0, 4).map(x => flCard(x, `<span class="fl-badge" style="background:#3b82f6">${esc(x.toName)} · ${x.km} km</span>`) + `<button class="btn ghost use" data-dest="${x.to}" data-origin="${x.from}">Szukaj do ${esc(x.toName)} (${x.to})</button>`).join('');
      }
      h += `</div>`;
    } else if (!r.length && !fl.message) h += `<div class="fl-msg">Brak wyników.</div>`;
    h += `<p class="fl-note">Wyszukiwanie obejmuje loty bezpośrednie Ryanair (najtańszy lot danego dnia). Wizz Air i inne linie – sprawdź linkami poniżej. Cena łączna = taryfa za osobę × liczba osób, bez bagażu rejestrowanego; ostateczną cenę pokaże strona przewoźnika.</p>`;
    el.innerHTML = h;
    el.querySelectorAll('.use').forEach(b => b.onclick = () => {
      if (b.dataset.origin) $('#origin').value = b.dataset.origin;
      if (b.dataset.dest) { const d = DEST.find(x => x.iata === b.dataset.dest || (x.alt || []).includes(b.dataset.dest)); $('#dest').value = d ? `${d.name} (${d.iata})` : b.dataset.dest; }
      save(); sums(); run().then(() => $('#flightsCard').scrollIntoView({ behavior: 'smooth', block: 'start' }));
    });
  }

  async function run() {
    const f = read();
    if (!f.dest || !f.dest.trim()) { steps[0].open = true; $('#err').textContent = 'Wpisz cel podróży (np. Katania) albo wybierz z podpowiedzi.'; $('#err').hidden = false; $('#dest').focus(); return null; }
    if (f.dateMode === 'exact' && (!f.depart || !f.ret || f.ret <= f.depart)) { $('#err').textContent = 'Sprawdź daty: powrót musi być po wylocie.'; $('#err').hidden = false; return null; }
    $('#err').hidden = true; save();
    ctx = compute(); render();
    const my = ctx;
    my.fl = { loading: true, progress: 'Szukam lotów…' }; renderFlights();
    my.flPromise = F.search(my, m => { if (ctx === my && my.fl && my.fl.loading) { my.fl.progress = m; const p = document.getElementById('flProg'); if (p) p.textContent = m; } })
      .then(r => { my.fl = r; }).catch(() => { my.fl = { failed: true }; }).finally(() => { if (ctx === my) renderFlights(); });
    my.wxPromise = L.weather(my.dest, my.dt).then(w => { my.wx = w; }).catch(() => { my.wx = null; }).finally(() => { if (ctx === my) renderWeather(); });
    return ctx;
  }
  form.addEventListener('submit', async e => { e.preventDefault(); if (await run()) $('#summary').scrollIntoView({ behavior: 'smooth', block: 'start' }); });

  async function ready() { if (!ctx) await run(); if (!ctx) return null; await Promise.race([Promise.all([ctx.wxPromise, ctx.flPromise]), new Promise(r => setTimeout(r, 30000))]); return ctx; }

  // --- raport HTML (A4) ---
  let lastHtml = '';
  $('#genReport').addEventListener('click', async () => {
    const b = $('#genReport'); b.classList.add('loading'); b.textContent = '⏳ Raport…';
    try { const c = await ready(); if (!c) return; lastHtml = window.REPORT.html(c); const fr = $('#reportFrame'); fr.srcdoc = lastHtml; $('#reportView').hidden = false; document.body.style.overflow = 'hidden'; }
    finally { b.classList.remove('loading'); b.textContent = '📄 Generuj raport'; }
  });
  $('#closeReport').addEventListener('click', () => { $('#reportView').hidden = true; document.body.style.overflow = ''; });
  $('#printReport').addEventListener('click', () => { const w = $('#reportFrame').contentWindow; w.focus(); w.print(); });
  $('#htmlReport').addEventListener('click', () => {
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([lastHtml], { type: 'text/html' })); a.download = window.REPORT.fileName(ctx) + '.html'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  });
  async function doPdf(btn) {
    const old = btn.textContent; btn.textContent = '⏳ PDF…'; btn.classList.add('loading');
    try { const c = await ready(); if (c) await window.PDFR.download(c); }
    catch (e) { console.error(e); alert('Nie udało się utworzyć PDF: ' + e.message); }
    finally { btn.textContent = old; btn.classList.remove('loading'); }
  }
  $('#pdf').addEventListener('click', e => doPdf(e.currentTarget));
  $('#pdf2').addEventListener('click', e => doPdf(e.currentTarget));

  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => { });
  window.__planer = { run, ready, get ctx() { return ctx; } };
})();
