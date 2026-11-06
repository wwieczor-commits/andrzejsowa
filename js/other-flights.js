/* Wizz Air i Skyscanner: jawne odnośniki, bez udawania pobrania cen. © Wojciech Wieczorek */
'use strict';
window.OTHERFLIGHTS = (() => {
  const L=window.PL;
  function links(f,dt,from,to) {
    if(!/^[A-Z]{3}$/.test(from||'')||!/^[A-Z]{3}$/.test(to||''))return null;
    const adults=+f.adults||1,children=+f.children||0,ages=L.childAges(f);
    const out=L.iso(dt.start),back=L.iso(dt.end);
    const date=d=>L.iso(d).replaceAll('-','').slice(2);
    const params=new URLSearchParams({adultsv2:adults,cabinclass:'economy',currency:'PLN',market:'PL',locale:'pl-PL',rtn:f.tripType==='oneway'?'0':'1'});
    if(children||+f.infants)params.set('childrenv2',[...ages,...Array(+f.infants||0).fill(0)].join('|'));
    let path=`https://www.skyscanner.pl/transport/loty/${from.toLowerCase()}/${to.toLowerCase()}/`;
    if(dt.mode==='month') {
      params.set('oym',String(dt.y).slice(2)+String(dt.m).padStart(2,'0'));
      if(f.tripType!=='oneway')params.set('iym',String(dt.end.getFullYear()).slice(2)+String(dt.end.getMonth()+1).padStart(2,'0'));
    }else path+=`${date(dt.start)}/${f.tripType==='oneway'?'':date(dt.end)+'/'}`;
    return {
      wizz:`https://www.wizzair.com/pl-pl/booking/select-flight/${from}/${to}/${out}/${f.tripType==='oneway'?'null':back}/${adults}/${children}/${+f.infants||0}/null`,
      sky:path+'?'+params.toString(),
      from,to,out,back,
      note:dt.mode==='month'?'Skyscanner: widok miesiąca (długość pobytu ustaw w serwisie). Wizz Air: daty z połowy miesiąca – zmień je w kalendarzu.':`${L.dmy(dt.start)}${f.tripType==='oneway'?' · w jedną stronę':'–'+L.dmy(dt.end)} · ${adults} dor.${children?` + ${children} dz.`:''}`
    };
  }
  function forFare(f,r){return links(f,{mode:'exact',start:new Date(r.out+'T00:00:00'),end:new Date((r.back||r.out)+'T00:00:00')},r.from,r.to);}
  function forContext(c){const f=c.f,r=c.fl?.results?.find(r=>r.exact)||c.fl?.results?.[0];return links(f,c.dt,r?.from||AP.members(f.origin)[0]?.code,r?.to||AP.members(f.dest)[0]?.code);}
  function google(f,dt,from,to){const out=L.iso(dt.start),back=L.iso(dt.end);const p=new URLSearchParams({q:`Flights from ${from} to ${to} on ${out}${f.tripType==='oneway'?' one way':' returning '+back} ${+f.adults||1} adults ${+f.children||0} children ${+f.infants||0} infants`,curr:'PLN',hl:'pl',gl:'PL'});return 'https://www.google.com/travel/flights?'+p;}
  return {links,forFare,forContext,google};
})();
