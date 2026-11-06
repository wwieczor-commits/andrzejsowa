/* Kraje i lotniska: wspólny, dostępny picker dla Skąd i Dokąd. © Wojciech Wieczorek */
'use strict';
window.AP = (() => {
  const norm = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ł/g,'l').replace(/Ł/g,'L').toLowerCase().trim();
  const esc = s => String(s ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const flag = cc => /^[a-z]{2}$/i.test(cc) ? String.fromCodePoint(...cc.toUpperCase().split('').map(x=>127397+x.charCodeAt(0))) : '🌍';
  const PORT = {KRK:'Balice · im. Jana Pawła II',KTW:'Pyrzowice',WAW:'im. Fryderyka Chopina',WMI:'Modlin',LUZ:'Świdnik',WRO:'im. Mikołaja Kopernika',GDN:'im. Lecha Wałęsy',POZ:'Ławica',RZE:'Jasionka',SZZ:'Goleniów',LCJ:'im. Władysława Reymonta',BZG:'im. Ignacego Jana Paderewskiego',CTA:'Fontanarossa',FCO:'Fiumicino',CIA:'Ciampino',AGP:'Costa del Sol',BCN:'El Prat',PMI:'Palma de Mallorca',HER:'Nikos Kazantzakis',CHQ:'Chania',STN:'Stansted',LTN:'Luton',BGY:'Bergamo · Orio al Serio',MXP:'Malpensa',NAP:'Capodichino',TFS:'Tenerife Sur',TFN:'Tenerife Norte'};
  let airports = [], countries = [];
  const pickers = [];
  function setData(data) {
    airports = data.airports.map(a=>({...a,airportName:PORT[a.code]||a.name,en:a.enName||a.enCity||a.city})).sort((a,b)=>a.city.localeCompare(b.city,'pl'));
    const cs=new Map(); airports.forEach(a=>cs.set(a.country,{code:a.country,name:a.countryName,en:a.enCountry})); countries=[...cs.values()].sort((a,b)=>a.name.localeCompare(b.name,'pl'));
  }
  setData(window.AIRPORTS_FALLBACK);
  const byCode = code => airports.find(a=>a.code===code);
  const country = cc => countries.find(c=>c.code===cc);
  const isAll = value => value==='ALL'||String(value).startsWith('ALL:');
  const countryOf = (value,def='pl') => isAll(value) ? (value.split(':')[1]||def) : byCode(value)?.country || def;
  const members = value => isAll(value) ? airports.filter(a=>a.country===countryOf(value)) : [byCode(value)].filter(Boolean);
  const label = value => value==='ANY' ? 'Dowolne miejsce' : isAll(value) ? `${country(countryOf(value))?.name || countryOf(value)} · wszystkie lotniska` : byCode(value) ? `${byCode(value).city} (${value})` : (value||'wybierz lotnisko');
  const title = a => `${a.city} · ${a.airportName} (${a.code})`;
  function find(text) {
    const code=(String(text).match(/\b([A-Z]{3})\b/)||[])[1]||String(text).toUpperCase();
    return byCode(code) || airports.find(a=>norm(a.city)===norm(text)||norm(a.name)===norm(text)||norm(a.enCity)===norm(text));
  }
  function airportMatches(q) {
    q=norm(q);return airports.filter(a=>norm([a.code,a.city,a.name,a.airportName,a.enName,a.enCity,a.countryName,a.enCountry,...(a.aliases||[]).map(x=>typeof x==='string'?x:JSON.stringify(x))].join(' ')).includes(q));
  }
  function countryMatches(q) {q=norm(q);return countries.filter(c=>norm(c.name+' '+c.en+' '+c.code).includes(q));}
  function create(side,onChange) {
    const root=document.getElementById(`${side}Picker`), hidden=document.getElementById(side==='from'?'origin':'dest');
    const ccHidden=document.getElementById(side==='from'?'originCountry':'destCountry');
    root.innerHTML=`<div class="picker-country"><label for="${side}CountrySearch">1. Kraj</label><input id="${side}CountrySearch" type="search" autocomplete="off" placeholder="Wyszukaj kraj…" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="${side}Countries"><div class="pick-menu" id="${side}Countries" role="listbox" hidden></div></div>
      <div class="picker-airport"><label for="${side}AirportSearch">2. Miasto lub lotnisko</label><input id="${side}AirportSearch" type="search" autocomplete="off" placeholder="Miasto, lotnisko, IATA lub kraj…" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="${side}Airports"><div class="pick-menu airport-menu" id="${side}Airports" role="listbox" hidden></div></div>
      <div class="picked" id="${side}Picked" aria-live="polite"></div>`;
    const ci=root.querySelector(`#${side}CountrySearch`), ai=root.querySelector(`#${side}AirportSearch`), cm=root.querySelector(`#${side}Countries`), am=root.querySelector(`#${side}Airports`), picked=root.querySelector('.picked');
    let controller;
    let cc=ccHidden.value|| (side==='from'?'pl':''), selected='', active=-1;
    function close(menu,input){menu.hidden=true;input.setAttribute('aria-expanded','false');input.removeAttribute('aria-activedescendant');active=-1;}
    function rows(menu,input,html){menu.innerHTML=html||'<div class="pick-empty">Brak podpowiedzi. Spróbuj miasta albo kodu IATA.</div>';menu.hidden=false;input.setAttribute('aria-expanded','true');active=-1;}
    function changed(){hidden.dispatchEvent(new Event('input',{bubbles:true}));hidden.dispatchEvent(new Event('change',{bubbles:true}));if(onChange)onChange();}
    function chooseCountry(code,notify=true){cc=code;ccHidden.value=cc;ci.value=country(cc)?`${flag(cc)} ${country(cc).name}`:'';selected='';hidden.value='';ai.value='';picked.textContent='';close(cm,ci);showAirports();if(notify)changed();}
    function choose(value,notify=true){
      if(side==='to'&&value==='ANY'){selected=value;hidden.value=value;cc='';ccHidden.value='';ci.value='';ai.value='Dowolne miejsce';picked.textContent='🌍 Dowolne miejsce';close(cm,ci);close(am,ai);if(notify)changed();return;}
      if(value==='ALL')value='ALL:pl';
      if(!isAll(value)&&!byCode(value)) {const a=find(value);value=a?.code||'';}
      selected=value;hidden.value=value;cc=countryOf(value,cc||'pl');ccHidden.value=cc;
      ci.value=country(cc)?`${flag(cc)} ${country(cc).name}`:'';
      ai.value=isAll(value)?'Wszystkie lotniska w kraju':byCode(value)?title(byCode(value)):'';
      picked.textContent=value?`✓ ${flag(cc)} ${label(value)}`:'';
      close(cm,ci);close(am,ai);if(notify)changed();
    }
    function showCountries(query=''){pickers.forEach(p=>{if(p!==controller)p.close();});close(am,ai);rows(cm,ci,countryMatches(query).map(c=>`<button type="button" role="option" aria-selected="${c.code===cc}" id="${side}-c-${c.code}" data-cc="${c.code}"><span class="pick-flag">${flag(c.code)}</span><span><b>${esc(c.name)}</b><small>${esc(c.en)} · ${airports.filter(a=>a.country===c.code).length} lotnisk</small></span></button>`).join(''));}
    function showAirports(query=''){
      pickers.forEach(p=>{if(p!==controller)p.close();});close(cm,ci);const q=norm(query);let list=q?airportMatches(q):airports.filter(a=>a.country===cc);
      // globalne podpowiedzi także poza wybranym krajem; kraj jest widoczny w każdym wierszu
      list.sort((a,b)=>(b.code.toLowerCase()===q)-(a.code.toLowerCase()===q)||a.city.localeCompare(b.city,'pl'));
      const cs=q?countryMatches(q):country(cc)?[country(cc)]:[];
      const html=cs.map(c=>`<button type="button" role="option" aria-selected="${hidden.value==='ALL:'+c.code}" id="${side}-all-${c.code}" data-value="ALL:${c.code}"><span class="pick-flag">${flag(c.code)}</span><span><b>Wszystkie lotniska w kraju</b><small>${esc(c.name)} · ${airports.filter(a=>a.country===c.code).length} lotnisk</small></span></button>`).join('')+
        list.slice(0,80).map(a=>`<button type="button" role="option" aria-selected="${a.code===hidden.value}" id="${side}-a-${a.code}" data-value="${a.code}"><span class="pick-flag">${flag(a.country)}</span><span><b>${esc(a.city)} <em>${a.code}</em></b><small>${esc(a.airportName)} · ${esc(a.countryName)}${a.nonRyanair?' · brak Ryanair':''}</small></span></button>`).join('');
      rows(am,ai,html);if(!q&&!cc)am.innerHTML='<div class="pick-empty">Najpierw wybierz kraj albo wpisz miasto / IATA.</div>';
    }
    ci.addEventListener('focus',()=>showCountries());ci.addEventListener('input',()=>{selected='';hidden.value='';ccHidden.value='';picked.textContent='';showCountries(ci.value);changed();});
    ai.addEventListener('focus',()=>showAirports());ai.addEventListener('input',()=>{selected='';hidden.value='';picked.textContent='';showAirports(ai.value);changed();});
    // Zachowaj fokus podczas tapnięcia: walidacja onblur nie może przesunąć wiersza przed click.
    [cm,am].forEach(m=>m.addEventListener('pointerdown',e=>{if(e.target.closest('button'))e.preventDefault();}));
    cm.onclick=e=>{const b=e.target.closest('[data-cc]');if(b)chooseCountry(b.dataset.cc);};
    am.onclick=e=>{const b=e.target.closest('[data-value]');if(b)choose(b.dataset.value);};
    function keys(e,menu,input){
      if(e.key==='Escape'){close(menu,input);return;}
      if(e.key==='Tab'){close(menu,input);return;}
      if(!['ArrowDown','ArrowUp','Enter'].includes(e.key))return;
      if(menu.hidden){if(e.key==='Enter')return;input===ci?showCountries():showAirports();}
      const items=[...menu.querySelectorAll('button')];if(!items.length)return;
      e.preventDefault();if(e.key==='Enter'){items[Math.max(0,active)]?.click();return;}
      active=(active+(e.key==='ArrowDown'?1:-1)+items.length)%items.length;
      items.forEach((b,i)=>b.classList.toggle('active',i===active));input.setAttribute('aria-activedescendant',items[active].id);items[active].scrollIntoView({block:'nearest'});
    }
    ci.addEventListener('keydown',e=>keys(e,cm,ci));ai.addEventListener('keydown',e=>keys(e,am,ai));
    document.addEventListener('pointerdown',e=>{if(!root.contains(e.target)){close(cm,ci);close(am,ai);}});
    function sync(){const val=hidden.value;if(val)choose(val,false);else {ci.value=country(cc)?`${flag(cc)} ${country(cc).name}`:'';ai.value='';picked.textContent='';ccHidden.value=cc;}}
    sync();const obj={choose,chooseCountry,sync,close:()=>{close(cm,ci);close(am,ai);}};controller=obj;pickers.push(obj);return obj;
  }
  // Aktualizacja w tle; migawka zawsze jest dostępna bez internetu. Nie zmieniamy wyboru użytkownika.
  async function refresh(){try{
    const ctl=new AbortController(),t=setTimeout(()=>ctl.abort(),6000);
    const j=await(await fetch('https://www.ryanair.com/api/views/locate/5/airports/pl/active',{signal:ctl.signal})).json();clearTimeout(t);
    if(!Array.isArray(j)||j.length<50)return;
    const dn=new Intl.DisplayNames(['en'],{type:'region'});
    const a=j.map(x=>{const old=byCode(x.code);return {...old,code:x.code,name:x.name,city:x.city.name,country:x.country.code,countryName:x.country.name,enCountry:old?.enCountry||dn.of(x.country.code.toUpperCase()),lat:x.coordinates.latitude,lon:x.coordinates.longitude};});
    airports.filter(x=>!a.some(y=>y.code===x.code)).forEach(x=>a.push(x));setData({airports:a});
  }catch(_){} }
  return {norm,flag,byCode,country,countryOf,isAll,members,label,title,find,create,refresh,get airports(){return airports;},get countries(){return countries;}};
})();
