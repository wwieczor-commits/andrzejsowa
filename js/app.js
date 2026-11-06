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

  async function run() {
    const f = read();
    if (!f.dest || !f.dest.trim()) { steps[0].open = true; $('#err').textContent = 'Wpisz cel podróży (np. Katania) albo wybierz z podpowiedzi.'; $('#err').hidden = false; $('#dest').focus(); return null; }
    if (f.dateMode === 'exact' && (!f.depart || !f.ret || f.ret <= f.depart)) { $('#err').textContent = 'Sprawdź daty: powrót musi być po wylocie.'; $('#err').hidden = false; return null; }
    $('#err').hidden = true; save();
    ctx = compute(); render();
    const my = ctx;
    my.wxPromise = L.weather(my.dest, my.dt).then(w => { my.wx = w; }).catch(() => { my.wx = null; }).finally(() => { if (ctx === my) renderWeather(); });
    return ctx;
  }
  form.addEventListener('submit', async e => { e.preventDefault(); if (await run()) $('#summary').scrollIntoView({ behavior: 'smooth', block: 'start' }); });

  async function ready() { if (!ctx) await run(); if (!ctx) return null; await Promise.race([ctx.wxPromise, new Promise(r => setTimeout(r, 8000))]); return ctx; }

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
  window.__planer = { run, get ctx() { return ctx; } };
})();
