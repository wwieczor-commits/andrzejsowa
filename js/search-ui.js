/* Własny interfejs wyszukiwania: arkusze, kalendarz cen i sortowanie. © Wojciech Wieczorek */
'use strict';
window.SEARCHUI=(()=>{
  const $=s=>document.querySelector(s),L=window.PL,F=window.FL;
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let api,stage='out',calTab='exact',viewMonth=new Date(),calToken=0,calendarPrices={},monthPrices=[],activeSide='from',lastTrigger=null;
  let sort='cheap',dayFilter='',hourFilter='',carrier=true,shown=8;
  function read(){return api.read();}
  function emit(el){el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));}
  function open(id,trigger){document.querySelectorAll('dialog[open]').forEach(d=>d.close());lastTrigger=trigger||document.activeElement;$(id).showModal();document.body.classList.add('sheet-open');}
  function close(d){d.close();}
  function sync(){const f=read(),one=f.tripType==='oneway';
    $('#fromValue').textContent=f.origin?AP.label(f.origin):'Wybierz miasto lub lotnisko';$('#toValue').textContent=f.dest?AP.label(f.dest):'Miasto, kraj lub dowolne miejsce';
    $('#returnOpen').hidden=one;$('#retLabel').hidden=one;
    $('#departValue').textContent=f.dateMode==='month'&&f.month?L.MONTHS[+f.month.slice(5)-1]+' '+f.month.slice(0,4):f.depart?L.dmy(new Date(f.depart+'T00:00:00')):'Wybierz datę';
    $('#returnValue').textContent=f.dateMode==='month'?'Pobyt '+f.nights+' nocy':f.ret?L.dmy(new Date(f.ret+'T00:00:00')):'Wybierz datę';
    const n=(+f.adults||0)+(+f.children||0)+(+f.infants||0);$('#paxValue').textContent=`${n} ${n===1?'osoba':'osób'} · Ekonomiczna`;
    $('#nightsLabel').hidden=f.dateMode!=='month'&&!one;$('#ret').min=f.depart?L.iso(L.addDays(new Date(f.depart+'T00:00:00'),1)):L.iso(new Date());
    $('.ages').hidden=!(+f.children>0);
  }
  function place(side,trigger){activeSide=side;open('#routeSheet',trigger);$('#routeTitle').textContent=side==='from'?'Skąd chcesz lecieć?':'Dokąd chcesz polecieć?';$('#fromRoute').hidden=side!=='from';$('#toRoute').hidden=side!=='to';$('#anywhere').hidden=side!=='to';api.fromPicker.close();api.toPicker.close();}
  function mode(m){const r=$(`[name=dateMode][value=${m}]`);r.checked=true;emit(r);sync();}
  function monthTitle(d){return L.MONTHS[d.getMonth()]+' '+d.getFullYear();}
  function drawDays(){const f=read(),year=viewMonth.getFullYear(),mon=viewMonth.getMonth(),first=(new Date(year,mon,1).getDay()+6)%7,last=new Date(year,mon+1,0).getDate();
    $('#calMonthTitle').textContent=monthTitle(viewMonth);$('#calendarGrid').hidden=false;$('#monthGrid').hidden=true;$('.cal-month-nav').hidden=false;
    const vals=Object.values(calendarPrices).map(r=>r.price),min=vals.length?Math.min(...vals):null;
    let html=['Pn','Wt','Śr','Cz','Pt','So','Nd'].map(d=>`<span class="weekday">${d}</span>`).join('')+'<span class="cal-pad"></span>'.repeat(first);
    for(let day=1;day<=last;day++){const date=L.iso(new Date(year,mon,day)),r=calendarPrices[date],disabled=date<L.iso(new Date())||(stage==='back'&&f.depart&&(date<=f.depart||date>L.iso(L.addDays(new Date(f.depart+'T00:00:00'),30))));
      html+=`<button type="button" class="cal-day${r&&r.price===min?' low':''}${date===f.depart||date===f.ret?' selected':''}" data-day="${date}" ${disabled?'disabled':''} aria-label="${L.dmy(new Date(year,mon,day))}${r?', '+F.zl2(r.price):', brak ceny'}"><b>${day}</b><small>${r?Math.round(r.price)+' zł':'—'}</small></button>`;
    }$('#calendarGrid').innerHTML=html;
    $('#calendarTitle').textContent=stage==='back'?'Wybierz datę powrotu':'Wybierz datę wylotu';
    $('.calendar-legend').innerHTML='<span class="low-dot"></span> Najniższa cena w miesiącu · za 1 os., jeden lot · PLN<br>— = brak ceny w API, nie potwierdzony brak lotu. Ceny mogą się zmienić.';
  }
  async function loadDays(){const token=++calToken;calendarPrices={};drawDays();$('#calStatus').textContent='Sprawdzam ceny dni w Ryanair…';
    try{const r=await F.calendar(read(),L.iso(viewMonth).slice(0,7),stage);if(token!==calToken||!$('#calendarSheet').open)return;calendarPrices=r.prices;$('#calStatus').textContent=r.note;drawDays();}
    catch(_){if(token===calToken)$('#calStatus').textContent='Nie udało się pobrać cen. Nadal możesz wybrać daty i spróbować wyszukać loty.';}
  }
  function drawMonths(){const f=read(),base=new Date();base.setDate(1);$('#calendarGrid').hidden=true;$('#monthGrid').hidden=false;$('.cal-month-nav').hidden=true;$('#calendarTitle').textContent=calTab==='cheapest'?'Znajdź najtańszy miesiąc':'Wybierz cały miesiąc';
    const ps=monthPrices.filter(x=>x.price!==null).map(x=>x.price),min=ps.length?Math.min(...ps):null;
    $('#monthGrid').innerHTML=Array.from({length:12},(_,i)=>{const d=new Date(base.getFullYear(),base.getMonth()+i,1),v=L.iso(d).slice(0,7),r=monthPrices.find(x=>x.value===v);return `<button type="button" data-month="${v}" class="month-tile${f.month===v?' selected':''}${r?.price===min&&min!==null?' low':''}"><b>${L.MONTHS[d.getMonth()]}</b><span>${d.getFullYear()}</span><small>${r?.price!=null?'od '+F.zl2(r.price):calTab==='cheapest'?'brak odczytanej ceny':'Wybierz miesiąc'}</small></button>`;}).join('');
    $('.calendar-legend').innerHTML=calTab==='cheapest'?'<span class="low-dot"></span> Najtańszy z 12 kolejnych miesięcy · za 1 os. '+(f.tripType==='oneway'?'w jedną stronę':'w obie strony, '+f.nights+' nocy')+' · tylko odpowiedzi Ryanair. Brak ceny nie dowodzi braku lotów.':'Wyszukamy najtańsze terminy w wybranym miesiącu z podaną długością pobytu.';
  }
  async function tab(m){calTab=m;calToken++;$$('[data-cal]').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.cal===m)));
    if(m==='exact'){mode('exact');return loadDays();}mode('month');drawMonths();
    if(m==='month'){$('#calStatus').textContent='Wybierz miesiąc i długość pobytu.';return;}
    const token=calToken;$('#calStatus').textContent='Szukam najtańszego miesiąca w 12 kolejnych miesiącach…';monthPrices=[];drawMonths();
    if(!AP.members(read().origin).length||(read().dest!=='ANY'&&!AP.members(read().dest).length)){$('#calStatus').textContent='Wybierz najpierw Skąd i Dokąd.';return;}
    try{const r=await F.cheapestMonths(read(),m=>{if(token===calToken)$('#calStatus').textContent=m;});if(token!==calToken)return;monthPrices=r;drawMonths();$('#calStatus').textContent='Sprawdzono 12 miesięcy · ceny Ryanair za osobę, bez dodatków. Wybierz miesiąc.';}catch(_){if(token===calToken)$('#calStatus').textContent='Błąd odczytu cen miesięcy. Możesz wybrać miesiąc ręcznie.';}
  }
  const $$=s=>[...document.querySelectorAll(s)];
  function calendarOpen(leg,trigger){stage=leg;const f=read(),d=(leg==='back'?f.ret:f.depart)||f.month+'-01';viewMonth=d&&/^\d{4}-\d{2}-\d{2}$/.test(d)?new Date(d+'T00:00:00'):new Date();viewMonth.setDate(1);open('#calendarSheet',trigger);tab(f.dateMode==='month'?'month':'exact');}
  function focusField(el){const id=el.id;if(el.closest('#routeSheet'))place(id.startsWith('from')?'from':'to');else if(el.closest('#calendarSheet'))calendarOpen(id==='ret'?'back':'out');else if(el.closest('#paxSheet'))open('#paxSheet');setTimeout(()=>{el.scrollIntoView({block:'center'});el.focus();},50);}
  function highlight(errors){['fromOpen','toOpen','departOpen','returnOpen','paxOpen'].forEach(id=>{$('#'+id).classList.remove('invalid');$('#'+id).removeAttribute('aria-invalid');});$$('.search-panel>.field-error,.compact-route>.field-error,.compact-dates>.field-error').forEach(e=>e.remove());
    const seen=new Set();errors.forEach(({el,msg})=>{if(!el)return;const id=el.closest('#routeSheet')?(el.id.startsWith('from')?'fromOpen':'toOpen'):el.closest('#calendarSheet')?(el.id==='ret'?'returnOpen':'departOpen'):'paxOpen';const b=$('#'+id);b.classList.add('invalid');b.setAttribute('aria-invalid','true');if(!seen.has(id)){const hint=document.createElement('span');hint.className='field-error';hint.textContent=msg;b.insertAdjacentElement('afterend',hint);seen.add(id);}});}
  function init(a){api=a;$('#fromOpen').onclick=e=>place('from',e.currentTarget);$('#toOpen').onclick=e=>place('to',e.currentTarget);$('#departOpen').onclick=e=>calendarOpen('out',e.currentTarget);$('#returnOpen').onclick=e=>calendarOpen('back',e.currentTarget);$('#paxOpen').onclick=e=>open('#paxSheet',e.currentTarget);
    $$('[data-close]').forEach(b=>b.onclick=()=>close(b.closest('dialog')));$$('dialog').forEach(d=>{d.addEventListener('close',()=>{calToken++;document.body.classList.remove('sheet-open');lastTrigger?.focus({preventScroll:true});});d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientY<r.top||e.clientX<r.left||e.clientX>r.right)d.close();}});});
    $('#anywhere').onclick=()=>api.toPicker.choose('ANY');$('#swap').onclick=()=>{const f=read();if(f.dest==='ANY'){alert('Dowolne miejsce może być tylko celem. Wybierz najpierw konkretne lotnisko.');return;}api.fromPicker.choose(f.dest,false);api.toPicker.choose(f.origin,false);emit($('#origin'));sync();};
    $('#f').addEventListener('change',e=>{sync();if($('#routeSheet').open&&['origin','dest'].includes(e.target.id)&&e.target.value&&((activeSide==='from'&&e.target.id==='origin')||(activeSide==='to'&&e.target.id==='dest')))$('#routeSheet').close();});$('#f').addEventListener('input',e=>{sync();if(['nights','origin','dest','tripType'].includes(e.target.name)){monthPrices=[];if($('#calendarSheet').open&&calTab!=='exact'){drawMonths();$('#calStatus').textContent='Parametry zmienione. Wybierz miesiąc lub kliknij Najtańszy miesiąc, aby ponownie sprawdzić ceny.';calToken++;}}});
    $$('[data-count]').forEach(b=>b.onclick=()=>{const e=$(`[name=${b.dataset.count}]`);e.value=Math.min(+e.max,Math.max(+e.min,(+e.value||0)+ +b.dataset.delta));emit(e);});
    $('#paxDone').onclick=()=>$('#paxSheet').close();$('#calendarDone').onclick=()=>$('#calendarSheet').close();$$('[data-cal]').forEach(b=>b.onclick=()=>tab(b.dataset.cal));
    $('#calPrev').onclick=()=>{viewMonth=new Date(viewMonth.getFullYear(),viewMonth.getMonth()-1,1);loadDays();};$('#calNext').onclick=()=>{viewMonth=new Date(viewMonth.getFullYear(),viewMonth.getMonth()+1,1);loadDays();};
    $('#calendarGrid').onclick=e=>{const b=e.target.closest('[data-day]');if(!b)return;const f=read();if(stage==='back'){$('#ret').value=b.dataset.day;emit($('#ret'));drawDays();}else{$('#depart').value=b.dataset.day;if($('#ret').value<=$('#depart').value)$('#ret').value='';emit($('#depart'));if(f.tripType!=='oneway'){stage='back';loadDays();}else drawDays();}};
    $('#monthGrid').onclick=e=>{const b=e.target.closest('[data-month]');if(!b)return;$('#month').value=b.dataset.month;emit($('#month'));drawMonths();};
    sync();
  }
  function leg(r,back=false){const from=back?r.to:r.from,to=back?r.from:r.to,dep=back?r.inDep:r.outDep,arr=back?r.inArr:r.outArr;return `<div class="ticket-leg"><div class="leg-day">${back?'Powrót':'Wylot'} · ${F.fmtDate(back?r.back:r.out)}</div><div class="leg-times"><div><b>${F.hm(dep)}</b><span>${from}</span></div><div class="leg-line"><small>${F.durationText(back?r.inMinutes:r.outMinutes)}</small><span>━━━━ ✈</span><em>Bezpośredni</em></div><div><b>${F.hm(arr)}</b><span>${to}</span></div></div></div>`;}
  function card(r,i,extra=''){const infant=+read().infants>0;return `<article class="ticket fl-card${r.exact?' exact':''}" data-total="${r.total}"><header><span class="air-mark">✈</span><b>Ryanair</b>${r.exact?'<span class="ticket-tag">Twoje daty</span>':''}${extra}</header><h4>${esc(AP.byCode(r.to)?.city||r.to)} <small>${r.from} → ${r.to}</small></h4>${leg(r)}${r.back?leg(r,true):''}<footer><div><b class="ticket-price">${F.zl2(r.perPerson)}</b><small>/ os. · ${r.back?'w obie strony':'w jedną stronę'}</small><span>Łącznie ${F.zl2(r.total)}${infant?' + dopłata za niemowlę':''}</span></div><a class="fl-book" href="${esc(r.url)}" target="_blank" rel="noopener">Wybierz →</a></footer>${i>=0?`<button type="button" class="plan-this" data-plan="${i}">Zaplanuj tę ofertę · nocleg i raport →</button>`:''}</article>`;}
  function sorted(rows,which){const best=rows.length?Math.min(...rows.map(r=>r.total)):1,ds=rows.map(r=>r.duration).filter(x=>x!=null),fast=ds.length?Math.min(...ds):1;return [...rows].sort((a,b)=>which==='fast'?(a.duration??Infinity)-(b.duration??Infinity)||a.total-b.total:which==='best'?(a.total/best*.65+(a.duration??fast*4)/fast*.35)-(b.total/best*.65+(b.duration??fast*4)/fast*.35):a.total-b.total);}
  function resetResults(){sort='cheap';dayFilter='';hourFilter='';carrier=true;shown=8;}
  function resultHTML(c){const fl=c.fl,r=fl.results||[];
    const filtered=r.filter(x=>(!dayFilter||x.out===dayFilter)&&(!hourFilter||(+F.hm(x.outDep).slice(0,2)>=+hourFilter&&+F.hm(x.outDep).slice(0,2)<+hourFilter+6))&&carrier);
    let h=`<div class="results-title"><div><h2>Twoje loty</h2><small>${r.length} wyników · Ryanair · PLN</small></div><span class="live-dot">Ceny z API</span></div><p class="fl-stamp">Odczyt: ${F.stamp(fl.checkedAt)} (Warszawa) · pamięć cen do 5 min</p>`;
    if(fl.message)h+=`<div class="fl-msg">${esc(fl.message)}</div>`;
    if(fl.subset)h+='<p class="fl-note">Dowolne miejsce: najtańsze kierunki zwrócone przez fare finder Ryanair, nie pełny rozkład wszystkich linii. Wybierz ofertę do planu i raportu.</p>';
    if(r.length){
      h+='<div class="sort-tabs" role="tablist" aria-label="Sortuj loty">'+[['cheap','Najtańsze'],['fast','Najszybsze'],['best','Najlepsze']].map(([key,title])=>{const x=sorted(filtered,key)[0];return `<button type="button" role="tab" data-sort="${key}" aria-selected="${sort===key}"><span>${title}</span><b>${x?F.zl2(x.perPerson):'—'}</b><small>${x?F.durationText(x.duration):'brak wyniku'}</small></button>`;}).join('')+`</div><p class="sort-help">Najlepsze: 65% cena + 35% czas lotów. ${c.f.tripType==='oneway'?'Czas lotu.':'Czas łączny obu lotów, bez pobytu.'}</p>`;
      const dates=c.dt.mode==='exact'?[-3,-2,-1,0,1,2,3].map(k=>L.iso(L.addDays(c.dt.start,k))):[...new Set(r.map(x=>x.out))].sort();
      h+=`<div class="price-strip" aria-label="Ceny w pobliskich dniach"><button type="button" data-strip="" aria-pressed="${!dayFilter}"><small>${c.dt.mode==='exact'?'±3 dni':'Cały miesiąc'}</small><b>Wszystkie</b></button>`+dates.filter(d=>d>=L.iso(new Date())).map(d=>{const prices=r.filter(x=>x.out===d).map(x=>x.perPerson),p=prices.length?Math.min(...prices):null;return `<button type="button" data-strip="${d}" aria-pressed="${dayFilter===d}" ${p===null?'disabled':''}><small>${F.fmtDate(d)}</small><b>${p!==null?Math.round(p)+' zł':'—'}</b></button>`;}).join('')+'</div>';
      h+=`<details class="result-filters"><summary>⚙ Filtry <span>Godziny i przewoźnik</span></summary><div><label>Godzina wylotu (lokalna)<select id="hourFilter"><option value="">Dowolna pora</option value="0">00:00–05:59</option><option value="6">06:00–11:59</option><option value="12">12:00–17:59</option><option value="18">18:00–23:59</option></select></label><label class="direct-check"><input id="carrierFilter" type="checkbox" ${carrier?'checked':''}>Ryanair (${r.length})</label><p class="src">Tylko najtańszy lot danego dnia. Inne godziny mogą być dostępne na stronie linii.</p></div></details><p class="result-count">${filtered.length} ofert${dayFilter?' · '+F.fmtDate(dayFilter):''}</p>`;
      h+=sorted(filtered,sort).slice(0,shown).map(x=>card(x,r.indexOf(x))).join('');
      if(!filtered.length)h+='<div class="fl-msg">Brak ofert po zastosowaniu filtrów. Zmień porę wylotu, dzień lub włącz Ryanair.</div>';
      if(filtered.length>shown)h+=`<button type="button" class="btn ghost fl-more" id="showMore">Pokaż kolejne oferty (${filtered.length-shown})</button>`;
    }
    const alts=fl.alternatives||{};
    if(!r.length&&((alts.otherAirports||[]).length||(alts.nearbyDest||[]).length)){h+='<h3>Spróbuj innych lotnisk</h3>';const a=[...(alts.otherAirports||[]),...(alts.nearbyDest||[])];h+=a.filter((x,i)=>a.findIndex(y=>y.from===x.from&&y.to===x.to)===i).slice(0,4).map(x=>card(x,-1,'<span class="ticket-tag">Inne lotnisko</span>')).join('');}
    h+='<p class="fl-note">Ceny bazowe za dorosłego/dziecko, bez bagażu i dopłaty za niemowlę. Łącznie = taryfa × dorośli i dzieci; dostępność tylu miejsc i cenę grupową potwierdzi Ryanair. Godziny lokalne lotnisk.</p>';
    return h;
  }
  function bindResults(c,redraw,onPlan){$$('[data-sort]').forEach(b=>b.onclick=()=>{sort=b.dataset.sort;shown=8;redraw();});$$('[data-strip]').forEach(b=>b.onclick=()=>{dayFilter=b.dataset.strip;shown=8;const y=scrollY;redraw();window.scrollTo(0,y);});
    if($('#hourFilter')){$('#hourFilter').value=hourFilter;$('#hourFilter').onchange=e=>{hourFilter=e.target.value;const y=scrollY;redraw();window.scrollTo(0,y);};$('#carrierFilter').onchange=e=>{carrier=e.target.checked;redraw();};}
    if($('#showMore'))$('#showMore').onclick=()=>{shown+=12;redraw();};$$('[data-plan]').forEach(b=>b.onclick=()=>onPlan(c.fl.results[+b.dataset.plan]));
  }
  return {init,sync,focusField,highlight,resultHTML,bindResults,resetResults,esc};
})();
