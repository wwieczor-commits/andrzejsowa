/* Planer podróży v1.5 – najpierw prawdziwe loty, potem reszta wyjazdu. © Wojciech Wieczorek */
'use strict';
(()=>{
  const L=window.PL,F=window.FL,$=s=>document.querySelector(s),esc=SEARCHUI.esc;
  const {ACC,ATTR,TRANSPORT,DIST}=PD;
  const form=$('#f'),KEY='sowa.planer.form.v1';let ctx=null,validationAttempted=false;
  $('#ver').textContent=APP_VERSION;$('#depart').min=L.iso(new Date());$('#month').min=L.iso(new Date()).slice(0,7);
  function read(){const f={};for(const [k,v]of new FormData(form)){if(['attractions','transport'].includes(k))(f[k]??=[]).push(v);else f[k]=v;}f.attractions??=[];f.transport??=[];f.directOnly=form.querySelector('[name=directOnly]').checked?'yes':'';return f;}
  function write(f){for(const e of form.elements){if(!e.name||!(e.name in f))continue;if(e.type==='checkbox')e.checked=Array.isArray(f[e.name])?f[e.name].includes(e.value):f[e.name]===e.value;else if(e.type==='radio')e.checked=f[e.name]===e.value;else e.value=f[e.name];}}
  function save(){try{localStorage.setItem(KEY,JSON.stringify(read()));}catch(_){}}
  try{const f=JSON.parse(localStorage.getItem(KEY)||'null');if(f){if(f.depart&&f.depart<L.iso(new Date())){delete f.depart;delete f.ret;}write(f);}}catch(_){}
  const fromPicker=AP.create('from'),toPicker=AP.create('to');AP.refresh();
  const ICON={plane:'✈️',bed:'🛏️',bus:'🚌',scooter:'🛵',ebike:'⚡',bike:'🚲',food:'🍝'},DICON={arr:'🛬',dep:'🛫',beach:'🏖️',scooter:'🛵',sight:'🏛️',food:'🍝'};
  function syncMode(){const m=read().dateMode;$('.mode-exact').hidden=m!=='exact';$('.mode-month').hidden=m!=='month';$('.ages').hidden=!(+read().children>0);}
  syncMode();
  const flightFields=['origin','dest','originCountry','destCountry','tripType','dateMode','depart','ret','month','nights','adults','children','childAges','infants','directOnly','cabin'];
  function changed(e){syncMode();save();if(ctx&&e.target.name){if(flightFields.includes(e.target.name)){ctx=null;$('#out').hidden=true;setReportEnabled(false,'Zmieniłeś wyszukiwanie – kliknij Szukaj.');busy(false);}else {ctx.f={...ctx.f,...read()};ctx.groups=L.buildLinks(ctx.f,ctx.dest,ctx.dt);ctx.plan=L.buildPlan(ctx.f,ctx.dest,ctx.dt);renderTrip();}}if(validationAttempted)validate(read());}
  form.addEventListener('input',changed);form.addEventListener('change',e=>{syncMode();save();if(validationAttempted)validate(read());});
  $('#reset').onclick=()=>{localStorage.removeItem(KEY);location.reload();};$('#barLinks').onclick=()=>form.requestSubmit();
  function compute(){const f=read(),dest=L.resolveDest(f.dest),dt=L.computeDates(f);return {f,dest,dt,groups:dest.anywhere?[]:L.buildLinks(f,dest,dt),plan:dest.anywhere?[]:L.buildPlan(f,dest,dt),wx:null,fl:null,created:new Date()};}
  function summary(){const {f,dest,dt}=ctx;$('#summary').innerHTML=`<div><h3>${esc(AP.label(f.origin))} ${f.tripType==='oneway'?'→':'↔'} ${esc(dest.name)}</h3><p>${dt.mode==='month'?`${L.MONTHS[dt.m-1]} ${dt.y}${f.tripType==='oneway'?'':' · '+dt.nights+' nocy'}`:L.dmy(dt.start)+(f.tripType==='oneway'?' · w jedną stronę':' – '+L.dmy(dt.end))} · ${+f.adults+ +f.children+ +f.infants} os.</p></div><div class="badge" id="bestBadge">Najtańszy lot<b>szukam…</b>Ryanair</div>`;$('#out').hidden=false;}
  function renderTrip() {
    const { f, dest, dt, groups, plan } = ctx;
    if(dest.anywhere){$('#planTargetNote').textContent='Wybierz „Zaplanuj tę ofertę” przy konkretnym locie, aby stworzyć plan i raport.';['#groups','#weatherCard','#planCard'].forEach(id=>$(id).innerHTML='');return;}
    $('#planTargetNote').textContent=(f.tripType==='oneway'?'Lot w jedną stronę. Plan pobytu '+dt.nights+' nocy jest osobny, bez lotu powrotnego. ':'')+'Plan i linki dotyczą: '+dest.name+'.';
    $('#groups').innerHTML = groups.filter(g=>g.id!=='loty').map(g => {
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


  function busy(on){$('#go').disabled=on;$('#barLinks').disabled=on;$('#go').textContent=on?'Szukam lotów…':'🔎 Szukaj';}
  function setReportEnabled(on,why){['#genReport','#pdf'].forEach(id=>{$(id).disabled=!on;$(id).title=on?'':why||'Najpierw wyszukaj loty';});$('#barHint').textContent=on?'':why||'Raport i PDF po wyszukaniu lotów.';}
  setReportEnabled(false);
  function externalPanel(c){const selected=OTHERFLIGHTS.forContext(c);if(!selected)return '<div class="external-flights"><h3>Sprawdź też inne linie</h3><p>Wybierz konkretny kierunek z wyników, aby dostać linki Wizz Air, Skyscanner i Google Flights.</p></div>';
    const origins=AP.members(c.f.origin),destinations=c.f.dest==='ANY'?[...new Map((c.fl?.results||[]).map(r=>[r.to,AP.byCode(r.to)])).values()].filter(Boolean):AP.members(c.f.dest);
    const opts=(list,code)=>list.map(a=>`<option value="${a.code}"${a.code===code?' selected':''}>${esc(a.city)} · ${a.code}</option>`).join('');
    return `<section class="external-flights"><h3>Sprawdź też</h3><p class="external-note"><b>Linki, nie pobrane oferty.</b> Wizz Air i Skyscanner: ich cen nie pobieramy. Google Flights porówna inne linie.</p>${origins.length>1||destinations.length>1?`<div class="external-pair"><label>Skąd<select id="extOrigin">${opts(origins,selected.from)}</select></label><label>Dokąd<select id="extDest">${opts(destinations,selected.to)}</select></label></div><p class="external-note">Linki dotyczą wskazanej pary lotnisk, nie całego kraju.</p>`:`<p class="external-route">${selected.from} → ${selected.to}</p>`}<p id="extDates" class="external-note">${esc(selected.note)}</p><div class="external-links"><a id="extWizz" class="external-wizz" target="_blank" rel="noopener" href="${esc(selected.wizz)}"><b>Wizz Air ↗</b><small>Sprawdź ceny u przewoźnika</small></a><a id="extSky" class="external-sky" target="_blank" rel="noopener" href="${esc(selected.sky)}"><b>Skyscanner ↗</b><small>Porównaj linie · PLN</small></a><a id="extGoogle" class="external-google" target="_blank" rel="noopener" href="${esc(OTHERFLIGHTS.google(c.f,c.dt,selected.from,selected.to))}"><b>Google Flights ↗</b><small>Inne linie · ceny w PLN</small></a></div><p class="external-note">Brak lotów Ryanair nie oznacza braku lotów innych linii. Serwis może wymagać cookies lub potwierdzenia, że jesteś człowiekiem.</p></section>`;
  }
  function bindExternal(c){const change=()=>{const first=OTHERFLIGHTS.forContext(c),from=$('#extOrigin')?.value||first.from,to=$('#extDest')?.value||first.to,x=OTHERFLIGHTS.links(c.f,c.dt,from,to);$('#extWizz').href=x.wizz;$('#extSky').href=x.sky;$('#extGoogle').href=OTHERFLIGHTS.google(c.f,c.dt,from,to);};$('#extOrigin')?.addEventListener('change',change);$('#extDest')?.addEventListener('change',change);}
  function renderFlights(){const c=ctx,fl=c.fl,el=$('#flightsCard');el.hidden=false;
    if(fl.loading){el.innerHTML=`<div class="card"><h2>Szukam Twojego lotu</h2><div class="fl-load"><span class="spin"></span><span id="flProg" role="status">${esc(fl.progress)}</span></div><p class="src">Prawdziwe dane Ryanair. Duża liczba lotnisk może wymagać więcej czasu.</p></div>`;return;}
    setReportEnabled(!fl.failed&&!c.dest.anywhere,c.dest.anywhere?'Wybierz „Zaplanuj tę ofertę”, aby odblokować raport.':undefined);
    const best=fl.results?.[0];$('#bestBadge').innerHTML=best?`od <b>${F.zl2(best.perPerson)}</b>za osobę${c.f.tripType==='oneway'?' · jeden lot':' · 2 loty'}`:fl.failed?'Błąd odczytu<b>spróbuj ponownie</b>':'Brak taryf<b>sprawdź inne daty</b>';
    el.innerHTML=(fl.failed?'<div class="fl-msg">Nie udało się połączyć z Ryanair. Nie oznacza to braku lotów. Spróbuj ponownie.</div>':SEARCHUI.resultHTML(c))+externalPanel(c);bindExternal(c);if(!fl.failed)SEARCHUI.bindResults(c,renderFlights,selectTrip);
    renderTrip();
    if(+c.f.budget>0&&best){$('#budgetCard').hidden=false;$('#budgetCard').innerHTML=`<h3>Budżet wyjazdu</h3><p>Twój budżet: ${L.zl(c.f.budget)} · loty ${F.zl2(best.total)}${+c.f.infants?' + dopłata za niemowlę':''}. Pozostałe ceny sprawdź w linkach.</p>`;}
  }
  async function selectTrip(r){const old=ctx;fromPicker.choose(r.from,false);toPicker.choose(r.to,false);$('[name=dateMode][value=exact]').checked=true;$('#depart').value=r.out;$('#ret').value=r.back||'';save();syncMode();SEARCHUI.sync();ctx=compute();ctx.fl={...old.fl,results:[{...r,exact:true}],exactFound:true,message:'Wybrana oferta z prawdziwego wyszukiwania.',subset:false,alternatives:{otherAirports:[],nearbyDest:[]}};summary();SEARCHUI.resetResults();renderFlights();loadWeather(ctx);$('#restOptions').open=true;$('#restOptions').scrollIntoView({behavior:'smooth'});}
  function validate(f,focus=false){const errors=[],err=(s,msg)=>errors.push({el:$(s),msg});
    if(!AP.members(f.origin).length)err(AP.country(f.originCountry)?'#fromAirportSearch':'#fromCountrySearch','Wybierz kraj i lotnisko wylotu lub wszystkie lotniska w kraju.');
    if(f.dest!=='ANY'&&!AP.members(f.dest).length)err(AP.country(f.destCountry)?'#toAirportSearch':'#toCountrySearch','Wybierz cel lub Dowolne miejsce.');
    const today=L.iso(new Date());if(f.dateMode==='exact'){
      if(!f.depart)err('#depart','Wybierz datę wylotu albo cały miesiąc.');else if(f.depart<today)err('#depart','Data wylotu nie może być w przeszłości.');
      if(f.tripType!=='oneway'){if(!f.ret)err('#ret','Wybierz datę powrotu.');else if(f.ret<=f.depart)err('#ret','Powrót musi być po wylocie.');else if((Date.parse(f.ret)-Date.parse(f.depart))/864e5>30)err('#ret','Pobyt może trwać do 30 nocy.');}
    }else{if(!f.month)err('#month','Wybierz miesiąc wyjazdu.');else if(f.month<today.slice(0,7))err('#month','Wybierz bieżący lub przyszły miesiąc.');if(f.tripType!=='oneway'&&(!f.nights||+f.nights<1||+f.nights>30||!Number.isInteger(+f.nights)))err('[name=nights]','Wybierz długość pobytu od 1 do 30 nocy.');}
    if(f.tripType==='oneway'&&(!f.nights||!Number.isInteger(+f.nights)||+f.nights<1||+f.nights>30))err('[name=nights]','Długość planu pobytu: od 1 do 30 nocy (to nie data lotu powrotnego).');
    if(!f.adults||!Number.isInteger(+f.adults)||+f.adults<1||+f.adults>9)err('[name=adults]','Podaj 1–9 dorosłych.');if(f.children===''||!Number.isInteger(+f.children)||+f.children<0||+f.children>6)err('[name=children]','Podaj 0–6 dzieci.');
    const ages=String(f.childAges||'').trim().split(/[ ,;]+/).filter(Boolean).map(Number);if(+f.children&&(ages.length!==+f.children||ages.some(x=>!Number.isInteger(x)||x<2||x>15)))err('[name=childAges]','Podaj wiek każdego dziecka (2–15 lat), po przecinku.');
    if(f.infants===''||!Number.isInteger(+f.infants)||+f.infants<0||+f.infants>+f.adults)err('[name=infants]','Niemowlęta: maksymalnie jedno na dorosłego.');
    $$('.invalid').forEach(e=>{e.classList.remove('invalid');e.removeAttribute('aria-invalid');e.removeAttribute('aria-describedby');});$$('.field-error').forEach(e=>e.remove());
    errors.forEach(({el,msg},i)=>{el.classList.add('invalid');el.setAttribute('aria-invalid','true');const s=document.createElement('span');s.className='field-error';s.id='error-'+i;s.textContent=msg;el.setAttribute('aria-describedby',s.id);el.after(s);});SEARCHUI.highlight(errors);
    $('#err').hidden=!errors.length;$('#err').textContent=errors.length?'Uzupełnij dane: '+errors.map(x=>x.msg).join(' '):'';if(focus&&errors.length)SEARCHUI.focusField(errors[0].el);return !errors.length;
  }
  const $$=s=>[...document.querySelectorAll(s)];
  function loadWeather(my){my.wxPromise=my.dest.anywhere?Promise.resolve():L.weather(my.dest,my.dt).then(w=>my.wx=w).catch(()=>my.wx=null).finally(()=>{if(ctx===my)renderWeather();});}
  async function run(){const f=read();validationAttempted=true;if(!validate(f,true))return null;save();ctx=compute();summary();SEARCHUI.resetResults();const my=ctx;my.fl={loading:true,progress:'Sprawdzam trasy i ceny Ryanair…'};busy(true);setReportEnabled(false,'Trwa wyszukiwanie prawdziwych cen…');renderFlights();
    my.flPromise=F.search(my,m=>{if(ctx===my&&my.fl.loading){my.fl.progress=m;if($('#flProg'))$('#flProg').textContent=m;}}).then(r=>my.fl=r).catch(()=>my.fl={failed:true}).finally(()=>{if(ctx===my){busy(false);renderFlights();}});loadWeather(my);return my;
  }
  form.onsubmit=async e=>{e.preventDefault();if(await run())$('#summary').scrollIntoView({behavior:'smooth',block:'start'});};
  async function ready(){if(!ctx||!ctx.fl||ctx.fl.loading||ctx.fl.failed||ctx.dest.anywhere)return null;await Promise.race([Promise.all([ctx.wxPromise,ctx.flPromise]),new Promise(r=>setTimeout(r,30000))]);return ctx;}
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
  window.__planer = { run, ready, fromPicker, toPicker, read, get ctx() { return ctx; } };
  SEARCHUI.init({read,fromPicker,toPicker});
})();
