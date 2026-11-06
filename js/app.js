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

  // domyślne daty: za ok. 3 tygodnie, 7 nocy
  // brak przykładowych dat – użytkownik wybiera sam
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

  const fromPicker=AP.create('from'), toPicker=AP.create('to');
  AP.refresh();
  function syncMode() {
    const m = form.querySelector('[name=dateMode]:checked').value;
    form.querySelector('.mode-exact').hidden = m !== 'exact'; form.querySelector('.mode-month').hidden = m !== 'month';
    form.querySelector('.ages').hidden = !(+form.children.value > 0);
  }
  form.addEventListener('input', () => { syncMode(); save(); if (ctx && ctx.fl) { ctx = null; setReportEnabled(false, 'Zmieniłeś dane – kliknij „Szukaj lotów” ponownie.'); } });
  form.addEventListener('change', () => {
    if ($('#depart').value && (!$('#ret').value || +new Date($('#ret').value) <= +new Date($('#depart').value))) $('#ret').value = L.iso(L.addDays(new Date($('#depart').value), 7));
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
    S(1).textContent = `${AP.label(f.origin)} → ${f.dest ? AP.label(f.dest) : 'wybierz cel'}`;
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
    const groups = L.buildLinks(f, dest, dt), plan = L.buildPlan(f, dest, dt);
    return { f, dest, dt, groups, plan, wx: null, fl: null, created: new Date() };
  }
  const ICON = { plane: '✈️', bed: '🛏️', bus: '🚌', scooter: '🛵', ebike: '⚡', bike: '🚲', food: '🍝' };
  const DICON = { arr: '🛬', dep: '🛫', beach: '🏖️', scooter: '🛵', sight: '🏛️', food: '🍝' };

  function render() {
    const { f, dest, dt, groups, plan } = ctx;
    const dates = `${L.dmy(dt.start)} – ${L.dmy(dt.end)}`;
    $('#summary').innerHTML = `<div><h3>${esc(L.nearbyNote(f))} → ${esc(dest.name)}${dest.iata ? ` (${dest.iata})` : ''}</h3>
      <p>${dt.mode === 'month' ? `${L.MONTHS[dt.m - 1]} ${dt.y}, ${dt.nights} nocy · przykładowe daty ${dates}` : `${dates} · ${dt.nights} nocy`} · ${f.adults} dor.${+f.children ? ` + ${f.children} dz.` : ''}${f.budget ? ` · budżet ${L.zl(f.budget)}` : ''}</p></div>
      <div class="badge" id="bestBadge">Najtańszy lot<b>szukam…</b>Ryanair</div>`;
    $('#groups').innerHTML = groups.map(g => {
      const main = g.items.filter(i => !i.perAirport), per = g.items.filter(i => i.perAirport);
      const item = i => `<a class="lnk${i.verified ? ' ver' : ''}" href="${esc(i.url)}" target="_blank" rel="noopener" data-group="${g.id}"><span><b>${esc(i.label)}</b><small>${esc(i.note || '')}${i.verified ? ' · sprawdzone 6.11.2026' : ''}</small></span><span class="go">Otwórz →</span></a>`;
      return `<div class="card group" id="g-${g.id}"><h3>${ICON[g.icon] || ''} ${esc(g.title)}</h3>${g.note ? `<p class="gnote">${esc(g.note)}</p>` : ''}
        <div class="links">${main.map(item).join('')}</div>
        ${per.length ? `<details class="more"><summary>Linki dla każdego lotniska (${per.length})</summary><div class="links">${per.map(item).join('')}</div></details>` : ''}</div>`;
    }).join('');
    $('#budgetCard').hidden = true; $('#budgetCard').innerHTML = '';
    $('#weatherCard').innerHTML = `<h3>🌤️ Pogoda</h3><p class="gnote">Ładowanie danych pogodowych…</p>`;
    $('#planCard').innerHTML = `<h3>🗺️ Plan dzień po dniu</h3><p class="gnote">Propozycja ogólna – dopasuj do godzin lotów.${dest.known && dest.sights ? '' : ' Dla tego celu brak wbudowanych podpowiedzi – plan jest szablonem.'}</p>` +
      plan.map((d, i) => `<div class="day"><div class="day-head"><span class="ic">${DICON[d.kind] || '📍'}</span><span><b>Dzień ${i + 1} · ${d.dow} ${L.dm(d.date)} — ${esc(d.title)}</b><small>${esc(d.sub)}</small></span></div>
        <div class="slots"><div class="slot"><i>Rano</i>${esc(d.am)}</div><div class="slot pm"><i>Popołudnie</i>${esc(d.pm)}</div><div class="slot eve"><i>Wieczór</i>${esc(d.eve)}</div></div>
        <div class="tip"><strong>Tip:</strong> ${esc(d.tip)}</div></div>`).join('');
    $('#out').hidden = false;
  }
  function renderWeather() {
    const w = ctx.wx;
    if (!w || !w.days || !w.days.some(d => d.tmax != null)) { $('#weatherCard').innerHTML = `<h3>🌤️ Pogoda</h3><p class="gnote">${ctx.dest.all ? 'Wybrano cały kraj – prognozę sprawdź po wyborze konkretnego miasta.' : 'Brak danych pogodowych (brak internetu lub nieznany cel).'}</p>`; return; }
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
    const n = F.pax(ctx.f), compare=OTHERFLIGHTS.forFare(ctx.f,r);
    return `<div class="fl-card${r.exact ? ' exact' : ''}" data-total="${r.total}">
      <div class="fl-top"><div><span class="fl-air">✈️ ${esc(r.airline)} · bez przesiadek</span><small class="fl-route">${esc(AP.byCode(r.from)?.city || r.from)} ↔ ${esc(AP.byCode(r.to)?.city || r.to)}</small>${r.exact ? '<span class="fl-badge">Twoje daty</span>' : ''}${extra}</div>
      <div><div class="fl-price">${F.zl2(r.total)}</div><div class="fl-pp">${n > 1 ? `${F.zl2(r.perPerson)} / os. × ${n}` : 'za osobę, tam i z powrotem'}</div></div></div>
      ${legHtml('Wylot', r.out, r.outDep, r.outArr, r.from, r.to)}
      ${legHtml('Powrót', r.back, r.inDep, r.inArr, r.to, r.from)}
      <a class="fl-book" href="${esc(r.url)}" target="_blank" rel="noopener">Rezerwuj w Ryanair →</a>
      <div class="compare"><span>Inne linie w tych samych dniach (ceny na stronie):</span><a href="${esc(compare.wizz)}" target="_blank" rel="noopener">Wizz Air ↗</a><a href="${esc(compare.sky)}" target="_blank" rel="noopener">Skyscanner ↗</a></div></div>`;
  }
  function renderAfterFlights() {
    const fl = ctx.fl, f = ctx.f, n = F.pax(f), bb = $('#bestBadge');
    const ok = fl && !fl.loading && !fl.failed;
    setReportEnabled(ok);
    if (!bb) return;
    if (!fl || fl.loading) { bb.innerHTML = 'Najtańszy lot<b>szukam…</b>Ryanair'; return; }
    if (fl.failed) { bb.innerHTML = 'Najtańszy lot<b>błąd</b>spróbuj ponownie'; return; }
    const best = fl.results.find(r => r.exact) || fl.results[0];
    bb.innerHTML = best ? `Najtańszy lot<b>${F.zl2(best.total)}</b>${n > 1 ? n + ' os., ' : ''}tam i z powrotem` : 'Najtańszy lot<b>brak lotów</b>Ryanair';
    const bc = $('#budgetCard');
    if (+f.budget > 0 && best) {
      const left = +f.budget - best.total;
      bc.hidden = false;
      bc.innerHTML = `<h3>💰 Budżet</h3><div class="brow"><div class="bi"><b>${L.zl(+f.budget)}</b>Twój budżet</div><div class="bi"><b>${F.zl2(best.total)}</b>Loty (prawdziwa cena)</div><div class="bi"><b>${left >= 0 ? L.zl(left) : '−' + L.zl(-left)}</b>Zostaje na nocleg, jedzenie i resztę</div></div>
        <p class="gnote" style="margin-top:8px">Ceny noclegów sprawdź w linkach Booking.com poniżej – aplikacja nie zgaduje ich cen.</p>`;
    } else { bc.hidden = true; bc.innerHTML = ''; }
  }
  function setReportEnabled(on, why) {
    ['#genReport', '#pdf'].forEach(id => { const b = $(id); b.disabled = !on; b.title = on ? '' : (why || 'Najpierw wyszukaj loty'); });
    const h = $('#barHint'); if (h) h.textContent = on ? '' : (why || 'Raport i PDF będą dostępne po wyszukaniu lotów.');
  }
  setReportEnabled(false);
  function externalPanel(c) {
    const selected=OTHERFLIGHTS.forContext(c); if(!selected)return '';
    const origins=AP.members(c.f.origin),destinations=AP.members(c.f.dest);
    const opts=(list,chosen)=>list.map(a=>`<option value="${a.code}"${a.code===chosen?' selected':''}>${esc(a.city)} · ${a.code}</option>`).join('');
    return `<section class="external-flights" aria-label="Wizz Air i Skyscanner">
      <h4>Sprawdź też Wizz Air i Skyscanner</h4>
      <p class="external-note"><strong>To linki, nie wyniki z ceną.</strong> Wizz Air: oficjalne API wymaga dostępu partnerskiego. Skyscanner: API wymaga zgody partnerskiej i klucza. Ceny tych serwisów zobaczysz po otwarciu ich strony.</p>
      ${(origins.length>1||destinations.length>1)?`<div class="external-pair"><label>Skąd<select id="extOrigin">${opts(origins,selected.from)}</select></label><label>Dokąd<select id="extDest">${opts(destinations,selected.to)}</select></label></div><p class="external-note">Wybrałeś cały kraj – linki poniżej dotyczą tylko tej pary lotnisk. Możesz ją zmienić.</p>`:`<p class="external-route">${esc(AP.byCode(selected.from)?.city || selected.from)} (${selected.from}) → ${esc(AP.byCode(selected.to)?.city || selected.to)} (${selected.to})</p>`}
      <p class="external-note" id="extDates">${esc(selected.note)}</p>
      <div class="external-links"><a class="external-wizz" id="extWizz" href="${esc(selected.wizz)}" target="_blank" rel="noopener"><b>Wizz Air ↗</b><small>Trasa, daty i osoby wypełnione</small></a><a class="external-sky" id="extSky" href="${esc(selected.sky)}" target="_blank" rel="noopener"><b>Skyscanner ↗</b><small>Porównaj wiele linii · PLN</small></a></div>
      <p class="external-note">Brak lotów Ryanair nie oznacza braku lotów innych linii. Serwis może poprosić o zgodę na cookies lub potwierdzenie, że jesteś człowiekiem.</p>
    </section>`;
  }
  function bindExternal(c) {
    const change=()=>{const first=OTHERFLIGHTS.forContext(c);const links=OTHERFLIGHTS.links(c.f,c.dt,$('#extOrigin')?.value||first.from,$('#extDest')?.value||first.to);if(!links)return;$('#extWizz').href=links.wizz;$('#extSky').href=links.sky;};
    $('#extOrigin')?.addEventListener('change',change);$('#extDest')?.addEventListener('change',change);
  }
  function renderFlights() {
    const el = $('#flightsCard'), c = ctx; el.hidden = false;
    const fl = c.fl;
    renderAfterFlights();
    if (!fl || fl.loading) { el.innerHTML = `<div class="fl-head"><h3>✈️ Znalezione loty</h3></div><div class="fl-load"><span class="spin"></span><span id="flProg">${esc((fl && fl.progress) || 'Szukam lotów…')}</span></div>`; return; }
    if (fl.failed) { el.innerHTML = `<h3>✈️ Znalezione loty</h3><div class="fl-msg">Nie udało się połączyć z wyszukiwarką lotów (brak internetu?). Spróbuj ponownie albo użyj linków poniżej.</div><button class="btn ghost fl-more" id="flRetry">Spróbuj ponownie</button>${externalPanel(c)}`; bindExternal(c); $('#flRetry').onclick = () => run(); return; }
    const r = fl.results;
    let h = `<div class="fl-head"><h3>✈️ Znalezione loty</h3></div><p class="fl-stamp">Ceny z dnia ${esc(F.stamp(fl.checkedAt))} · źródło: ${esc(fl.source)} · ${r.length} ${r.length === 1 ? 'wynik' : 'wyników'}, od najtańszego</p>`;
    if (fl.message) h += `<div class="fl-msg">${esc(fl.message)}</div>`;
    h += externalPanel(c);
    if (r.length) {
      h += r.slice(0, 6).map(x => flCard(x)).join('');
      if (r.length > 6) h += `<details class="more"><summary>Pokaż więcej wyników (${r.length - 6})</summary>${r.slice(6, 40).map(x => flCard(x)).join('')}</details>`;
    }
    const A = fl.alternatives || {};
    if (!fl.exactFound && (A.otherAirports.length || A.nearbyDest.length)) {
      h += `<div class="fl-alt">`;
      if (A.otherAirports.length) {
        const best = {}; A.otherAirports.forEach(x => { if (!best[x.from]) best[x.from] = x; });
        h += `<h4>💡 Z innych lotnisk w kraju</h4>` + Object.values(best).slice(0, 4).map(x => flCard(x, '') + `<button class="btn ghost use" data-origin="${x.from}">Szukaj z ${esc(AP.byCode(x.from)?.city || x.from)} (${x.from})</button>`).join('');
      }
      if (A.nearbyDest.length) {
        const best = {}; A.nearbyDest.forEach(x => { const k = x.from + x.to; if (!best[k]) best[k] = x; });
        h += `<h4>💡 Pobliskie lotniska docelowe</h4>` + Object.values(best).slice(0, 4).map(x => flCard(x, `<span class="fl-badge" style="background:#3b82f6">${esc(x.toName)} · ${x.km} km</span>`) + `<button class="btn ghost use" data-dest="${x.to}" data-origin="${x.from}">Szukaj do ${esc(x.toName)} (${x.to})</button>`).join('');
      }
      h += `</div>`;
    } else if (!r.length && !fl.message) h += `<div class="fl-msg">Brak wyników.</div>`;
    h += `<p class="fl-note">Wyszukiwanie obejmuje loty bezpośrednie Ryanair (najtańszy lot danego dnia). Wizz Air i Skyscanner – osobne linki powyżej (ich cen nie pobieramy). Cena łączna = taryfa za osobę × liczba osób, bez bagażu rejestrowanego; ostateczną cenę pokaże strona przewoźnika.</p>`;
    el.innerHTML = h;bindExternal(c);
    el.querySelectorAll('.use').forEach(b => b.onclick = () => {
      if (b.dataset.origin) fromPicker.choose(b.dataset.origin);
      if (b.dataset.dest) toPicker.choose(b.dataset.dest);
      save(); sums(); run().then(() => $('#flightsCard').scrollIntoView({ behavior: 'smooth', block: 'start' }));
    });
  }

  let validationAttempted=false;
  function validate(f, focus=false) {
    const errors=[];
    const err=(selector,msg)=>errors.push({el:form.querySelector(selector),msg});
    if(!AP.members(f.origin).length) err(AP.country(f.originCountry)?'#fromAirportSearch':'#fromCountrySearch','Wybierz kraj i lotnisko wylotu (albo wszystkie lotniska w kraju).');
    if(!AP.members(f.dest).length) err(AP.country(f.destCountry)?'#toAirportSearch':'#toCountrySearch','Wybierz kraj i lotnisko docelowe (albo wszystkie lotniska w kraju).');
    const today=L.iso(new Date());
    if(f.dateMode==='exact') {
      if(!f.depart)err('#depart','Wybierz datę wylotu albo tryb „Miesiąc + długość”.');
      else if(f.depart<today)err('#depart','Data wylotu nie może być w przeszłości.');
      if(!f.ret)err('#ret','Wybierz datę powrotu.');
      else if(f.depart&&f.ret<=f.depart)err('#ret','Powrót musi być po dacie wylotu.');
      else if(f.depart&&(+new Date(f.ret)-+new Date(f.depart))/864e5>30)err('#ret','Wybierz pobyt do 30 nocy.');
    }else {
      if(!f.month)err('#month','Wybierz miesiąc wyjazdu.');
      else if(f.month<today.slice(0,7))err('#month','Wybierz bieżący lub przyszły miesiąc.');
      if(!Number.isInteger(+f.nights)||+f.nights<1||+f.nights>30)err('[name=nights]','Podaj długość pobytu: 1–30 nocy.');
    }
    if(!f.adults||!Number.isInteger(+f.adults)||+f.adults<1||+f.adults>9)err('[name=adults]','Podaj liczbę dorosłych: 1–9.');
    if(f.children===''||!Number.isInteger(+f.children)||+f.children<0||+f.children>6)err('[name=children]','Podaj liczbę dzieci: 0–6.');
    form.querySelectorAll('.invalid').forEach(el=>{el.classList.remove('invalid');el.removeAttribute('aria-invalid');el.removeAttribute('aria-describedby');});
    form.querySelectorAll('.field-error').forEach(el=>el.remove());
    errors.forEach(({el,msg},i)=>{if(!el)return;el.classList.add('invalid');el.setAttribute('aria-invalid','true');const hint=document.createElement('span');hint.className='field-error';hint.id='validation-'+i;hint.textContent=msg;el.setAttribute('aria-describedby',hint.id);el.insertAdjacentElement('afterend',hint);});
    if(errors.length){$('#err').textContent='Uzupełnij dane: '+errors.map(e=>e.msg).join(' ');$('#err').hidden=false;
      if(focus){const el=errors[0].el;const step=el.closest('details');if(step)step.open=true;el.scrollIntoView({behavior:'auto',block:'center'});el.focus({preventScroll:true});}
    }else $('#err').hidden=true;
    return !errors.length;
  }
  form.addEventListener('input',()=>{if(validationAttempted)validate(read());});
  form.addEventListener('change',()=>{if(validationAttempted)validate(read());});
  async function run() {
    const f = read();validationAttempted=true;
    if(!validate(f,true))return null;
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

  async function ready() { if (!ctx || !ctx.fl || ctx.fl.loading || ctx.fl.failed) return null; await Promise.race([Promise.all([ctx.wxPromise, ctx.flPromise]), new Promise(r => setTimeout(r, 30000))]); return ctx; }

  // --- raport HTML (A4) ---
  let lastHtml = '';
  $('#genReport').addEventListener('click', async () => {
    const b = $('#genReport'); b.classList.add('loading'); b.textContent = '⏳ Raport…';
    try { const c = await ready(); if (!c) { alert('Najpierw wyszukaj loty (przycisk „Szukaj lotów”).'); return; } lastHtml = window.REPORT.html(c); const fr = $('#reportFrame'); fr.srcdoc = lastHtml; $('#reportView').hidden = false; document.body.style.overflow = 'hidden'; }
    finally { b.classList.remove('loading'); b.textContent = '📄 Raport'; }
  });
  $('#closeReport').addEventListener('click', () => { $('#reportView').hidden = true; document.body.style.overflow = ''; });
  $('#printReport').addEventListener('click', () => { const w = $('#reportFrame').contentWindow; w.focus(); w.print(); });
  $('#htmlReport').addEventListener('click', () => {
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([lastHtml], { type: 'text/html' })); a.download = window.REPORT.fileName(ctx) + '.html'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  });
  async function doPdf(btn) {
    const old = btn.textContent; btn.textContent = '⏳ PDF…'; btn.classList.add('loading');
    try { const c = await ready(); if (!c) { alert('Najpierw wyszukaj loty (przycisk „Szukaj lotów”).'); return; } await window.PDFR.download(c); }
    catch (e) { console.error(e); alert('Nie udało się utworzyć PDF: ' + e.message); }
    finally { btn.textContent = old; btn.classList.remove('loading'); }
  }
  $('#pdf').addEventListener('click', e => doPdf(e.currentTarget));
  $('#pdf2').addEventListener('click', e => doPdf(e.currentTarget));

  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    const hadController = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.register('sw.js?v=' + encodeURIComponent(window.APP_BUILD || '1'), { updateViaCache: 'none' }).then(r => r.update()).catch(() => { });
    navigator.serviceWorker.addEventListener('controllerchange', () => { if (hadController) { const n = $('#updBar'); if (n) n.hidden = false; } });
  }
  $('#updBtn') && $('#updBtn').addEventListener('click', () => location.reload());
  window.__planer = { run, ready, fromPicker, toPicker, get ctx() { return ctx; } };
})();
