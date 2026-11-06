/* Raport A4 – szablon wg „Wyjazd_Katania_Andrzej_Sowa” (Podroze). © Wojciech Wieczorek */
'use strict';
window.REPORT = (() => {
  const L = window.PL, { ACC, ATTR, TRANSPORT, DIST, AIRPORTS } = window.PD;
  const CSS = "\n  @page { size: A4; margin: 10mm 11mm 11mm 11mm; }\n  * { box-sizing: border-box; margin: 0; padding: 0; }\n  body {\n    font-family: Inter, \"Noto Sans\", \"DejaVu Sans\", sans-serif;\n    color: #0e1a2b; font-size: 8.4pt; line-height: 1.35;\n    -webkit-print-color-adjust: exact; print-color-adjust: exact;\n  }\n  a { color: #e0452b; text-decoration: none; font-weight: 600; }\n  .header {\n    display: flex; justify-content: space-between; align-items: flex-end;\n    border-bottom: 3px solid #e0452b; padding-bottom: 8px; margin-bottom: 10px;\n  }\n  .header h1 { font-size: 13.5pt; font-weight: 700; line-height: 1.2; letter-spacing: -0.02em; }\n  .subtitle { font-size: 8pt; color: #5a6577; margin-top: 2px; }\n  .badge {\n    background: #0e1a2b; color: #fff; font-size: 7.5pt; font-weight: 600;\n    padding: 5px 9px; border-radius: 4px; white-space: nowrap; text-align: center;\n  }\n  .badge span { color: #e0452b; display: block; font-size: 11pt; }\n  h2 {\n    font-size: 10pt; font-weight: 700; color: #0e1a2b; margin: 8px 0 4px 0;\n    padding-left: 7px; border-left: 3px solid #e0452b;\n  }\n  h3 { font-size: 9pt; font-weight: 700; margin: 8px 0 4px; color: #0e1a2b; }\n  .summary { display: flex; gap: 8px; }\n  .summary-card {\n    flex: 1; background: #f4f6f9; border: 1px solid #d8dee8;\n    border-radius: 6px; padding: 8px 10px;\n  }\n  .summary-card.best { background: #0e1a2b; border-color: #0e1a2b; color: #fff; }\n  .summary-card .label {\n    font-size: 7pt; text-transform: uppercase; letter-spacing: 0.05em;\n    opacity: 0.75; font-weight: 600; margin-bottom: 2px;\n  }\n  .summary-card.best .label { color: #f0a090; opacity: 1; }\n  .summary-card .total { font-size: 14pt; font-weight: 700; line-height: 1.1; }\n  .summary-card .breakdown { font-size: 7.3pt; margin-top: 3px; opacity: 0.9; line-height: 1.3; }\n  .summary-card.best .breakdown { color: #c8d0dc; }\n\n  .cols2 { display: flex; gap: 10px; }\n  .cols2 > div { flex: 1; }\n\n  .timeline { position: relative; margin: 2px 0 4px 4px; padding-left: 14px; }\n  .timeline::before {\n    content: \"\"; position: absolute; left: 3px; top: 3px; bottom: 3px;\n    width: 2px; background: #d0d7e2;\n  }\n  .tl-item { position: relative; padding: 0 0 3.5px 0; }\n  .tl-item:last-child { padding-bottom: 0; }\n  .tl-item::before {\n    content: \"\"; position: absolute; left: -14px; top: 3px;\n    width: 8px; height: 8px; border-radius: 50%;\n    background: #e0452b; border: 1.5px solid #fff; box-shadow: 0 0 0 1.2px #e0452b;\n  }\n  .tl-item.stay::before { background: #0e1a2b; box-shadow: 0 0 0 1.2px #0e1a2b; }\n  .tl-item.xfer::before { background: #3b82f6; box-shadow: 0 0 0 1.2px #3b82f6; }\n  .tl-item .when { font-weight: 700; font-size: 7.8pt; }\n  .tl-item .what { font-size: 7.8pt; color: #334155; }\n  .tl-note {\n    background: #fff5f3; border: 1px solid #f5c4ba; border-radius: 4px;\n    padding: 5px 7px; font-size: 7.2pt; color: #7a2a1c; margin-top: 4px;\n  }\n\n  table { width: 100%; border-collapse: collapse; font-size: 7.4pt; margin-top: 2px; }\n  thead th {\n    background: #0e1a2b; color: #fff; font-weight: 600; text-align: left;\n    padding: 4px 5px; font-size: 6.8pt; text-transform: uppercase; letter-spacing: 0.02em;\n  }\n  thead th:first-child { border-radius: 3px 0 0 0; }\n  thead th:last-child { border-radius: 0 3px 0 0; }\n  tbody td { padding: 4px 5px; border-bottom: 1px solid #e2e8f0; vertical-align: top; }\n  tbody tr:nth-child(even) { background: #f7f9fc; }\n  tbody tr.highlight { background: #fff5f3; }\n  .price { font-weight: 700; white-space: nowrap; }\n  .muted { color: #64748b; font-size: 7pt; }\n  .footnote { font-size: 7pt; color: #64748b; margin-top: 3px; line-height: 1.3; }\n  .book-link {\n    display: inline-block; background: #e0452b; color: #fff !important;\n    font-size: 6.5pt; font-weight: 700; padding: 1px 5px; border-radius: 3px;\n    margin-left: 3px; white-space: nowrap;\n  }\n  .tag {\n    display: inline-block; background: #e0452b; color: #fff; font-size: 6.5pt;\n    font-weight: 700; padding: 0 4px; border-radius: 2px; margin-right: 3px;\n  }\n  .links-box {\n    background: #f4f6f9; border: 1px solid #d8dee8; border-radius: 5px;\n    padding: 4px 6px; margin-top: 4px; font-size: 5.8pt; line-height: 1.35;\n    word-break: break-all;\n  }\n  .keep-together { break-inside: avoid; page-break-inside: avoid; }\n\n  .links-box strong { color: #0e1a2b; font-size: 7.5pt; }\n  .footer {\n    margin-top: 8px; padding-top: 5px; border-top: 1.5px solid #d8dee8;\n    font-size: 6.8pt; color: #64748b; line-height: 1.35;\n  }\n  .footer strong { color: #0e1a2b; }\n  .page-break { page-break-before: always; }\n\n  /* Day cards */\n  .day-card {\n    border: 1px solid #d8dee8; border-radius: 8px; margin-bottom: 6px;\n    overflow: hidden; break-inside: avoid;\n  }\n  .day-head {\n    display: flex; align-items: center; gap: 6px;\n    background: #0e1a2b; color: #fff; padding: 4px 7px;\n  }\n  .day-icon {\n    width: 28px; height: 28px; border-radius: 6px; background: #e0452b;\n    display: flex; align-items: center; justify-content: center; flex-shrink: 0;\n  }\n  .day-icon svg { width: 16px; height: 16px; fill: #fff; }\n  .day-head .dtitle { font-size: 9.5pt; font-weight: 700; line-height: 1.15; }\n  .day-head .dsub { font-size: 7pt; color: #a8b4c4; }\n  .day-body { padding: 5px 8px 6px; }\n  .wx {\n    display: flex; flex-wrap: wrap; gap: 4px 10px; align-items: center;\n    background: #eef6ff; border: 1px solid #c5daf5; border-radius: 4px;\n    padding: 4px 7px; margin-bottom: 4px; font-size: 6.5pt; color: #1e3a5f;\n  }\n  .wx .wx-label {\n    background: #3b82f6; color: #fff; font-size: 6pt; font-weight: 700;\n    padding: 1px 4px; border-radius: 2px; text-transform: uppercase;\n  }\n  .slots { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 4px; }\n  .slot {\n    background: #f7f9fc; border-radius: 4px; padding: 5px 6px; border-left: 3px solid #e0452b;\n  }\n  .slot.pm { border-left-color: #0e1a2b; }\n  .slot.eve { border-left-color: #7c3aed; }\n  .slot .slot-h {\n    font-size: 6.5pt; font-weight: 700; text-transform: uppercase;\n    letter-spacing: 0.04em; color: #64748b; margin-bottom: 2px;\n  }\n  .slot .slot-b { font-size: 7.3pt; color: #334155; line-height: 1.3; }\n  .tip {\n    margin-top: 5px; font-size: 7.2pt; color: #7a2a1c;\n    background: #fff5f3; border-radius: 3px; padding: 4px 6px;\n  }\n  .tip strong { color: #0e1a2b; }\n\n  .prac-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 7px; margin-top: 4px; }\n  .prac-box {\n    background: #f4f6f9; border: 1px solid #d8dee8; border-radius: 6px;\n    padding: 7px 9px; font-size: 7.3pt; line-height: 1.35;\n  }\n  .prac-box h3 { margin: 0 0 3px; font-size: 8.5pt; border: none; padding: 0; }\n  .prac-box ul { margin: 0 0 0 12px; }\n  .prac-box li { margin-bottom: 2px; }\n  .budget-row {\n    display: flex; justify-content: space-between; gap: 6px; flex-wrap: wrap;\n    font-size: 7.5pt; margin-top: 3px;\n  }\n  .budget-item {\n    background: #fff; border: 1px solid #d8dee8; border-radius: 4px;\n    padding: 4px 7px; flex: 1; min-width: 110px; text-align: center;\n  }\n  .budget-item .bv { font-weight: 700; color: #e0452b; font-size: 9pt; }\n  .wx-strip {\n    display: flex; gap: 3px; margin: 4px 0 8px; \n  }\n  .wx-day {\n    flex: 1; text-align: center; background: #eef6ff; border-radius: 4px;\n    padding: 4px 2px; border: 1px solid #c5daf5; font-size: 6.5pt;\n  }\n  .wx-day .wd { font-weight: 700; color: #0e1a2b; }\n  .wx-day .wt { color: #e0452b; font-weight: 700; font-size: 8pt; }\n  .wx-day .ws { color: #64748b; }\n  .src { font-size: 6.3pt; color: #94a3b8; margin-top: 2px; }\n";
  const EXTRA = `
  .screen-pad{max-width:190mm;margin:0 auto}
  @media screen{body{padding:14px;background:#fff}.page-break{height:0;border-top:2px dashed #d8dee8;margin:18px 0}}
  .est{display:inline-block;background:#3b82f6;color:#fff;font-size:6pt;font-weight:700;padding:0 4px;border-radius:2px;text-transform:uppercase;margin-left:3px;vertical-align:middle}
  .chk{color:#64748b;font-weight:600;font-style:italic}
  .ver-row td:first-child{border-left:3px solid #3b82f6}
  @media screen and (max-width:600px){body{font-size:10pt}.cols2,.summary{flex-direction:column}.slots,.prac-grid{grid-template-columns:1fr}table{font-size:8pt}.wx-strip{flex-wrap:wrap}.wx-day{flex:1 0 22%}}
  `;
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const A = (u, t, cls = '') => `<a ${cls ? `class="${cls}" ` : ''}href="${esc(u)}" target="_blank" rel="noopener">${t}</a>`;
  const ICON = {
    plane: '<path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>',
    sun: '<path d="M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10zM11 1h2v3h-2zm0 19h2v3h-2zM1 11h3v2H1zm19 0h3v2h-3zM4.2 5.6l1.4-1.4 2.1 2.1-1.4 1.4zm12.1 12.1 1.4-1.4 2.1 2.1-1.4 1.4zM4.2 18.4l2.1-2.1 1.4 1.4-2.1 2.1zM16.3 6.3l2.1-2.1 1.4 1.4-2.1 2.1z"/>',
    scooter: '<path d="M5 14a3 3 0 1 0 0 6 3 3 0 0 0 0-6zm14 0a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM15 4h3v2h-1.4l1.9 7.3A4 4 0 0 0 15 17H9a4 4 0 0 0-1-2.6V12h6l-1-6h2z"/>',
    sight: '<path d="M12 2 2 7v2h20V7zM4 10v8h3v-8zm6.5 0v8h3v-8zM17 10v8h3v-8zM2 20h20v2H2z"/>',
    food: '<path d="M7 2h2v8a3 3 0 0 1-2 2.8V22H5v-9.2A3 3 0 0 1 3 10V2h2v6h1V2h1v6h1zm9 0c2.2 0 4 2.7 4 6 0 2.4-1 4.4-2.5 5.4V22h-2.5V2z"/>'
  };
  const KIND_ICON = { arr: 'plane', dep: 'plane', beach: 'sun', scooter: 'scooter', sight: 'sight', food: 'food' };
  const fileName = c => `Wyjazd_${(c.dest.city || c.dest.name).replace(/[^\p{L}\p{N}]+/gu, '_')}_Andrzej_Sowa_${L.iso(c.dt.start)}`;

  function html(c) {
    const { f, dest, dt, groups, plan, wx } = c;
    const G = id => (groups.find(g => g.id === id) || { items: [] });
    const ad = +f.adults || 1, ch = +f.children || 0, persons = ad + ch;
    const osob = persons === 1 ? '1 osoba' : `${persons} ${persons < 5 ? 'osoby' : 'osób'}`;
    const orig = AP.label(f.origin);
    const origCode = AP.isAll(f.origin) ? AP.country(AP.countryOf(f.origin))?.name : f.origin;
    const destCode = dest.iata || '';
    const range = `${L.dm(dt.start)}–${L.dmy(dt.end)}`;
    const when = dt.mode === 'month' ? `${L.MONTHS[dt.m - 1]} ${dt.y} · ${dt.nights} nocy` : `${L.dmy(dt.start)} – ${L.dmy(dt.end)}`;
    const today = L.dmy(new Date());
    const allLinks = [];
    const reg = (label, url) => { allLinks.push([label, url]); return url; };
    const fmt = n => L.zl(n);

    // --- Harmonogram ---
    const tl = [];
    tl.push(['xfer', `${L.DOW_S[dt.start.getDay()].replace(/^./, x => x.toUpperCase())} ${L.dm(dt.start)}, ok. 2–2,5 h przed wylotem`, `Dojazd na lotnisko ${AP.isAll(f.origin) ? orig : orig} – pociąg/autobus lotniskowy lub auto`]);
    tl.push(['', `${L.DOW_S[dt.start.getDay()].replace(/^./, x => x.toUpperCase())} ${L.dmy(dt.start)}, godzina wg rezerwacji`, `Wylot ${origCode} → ${dest.city}${destCode ? ' (' + destCode + ')' : ''} – przewoźnik i cena: linki w tabeli „Loty”`]);
    tl.push(['xfer', `${L.dm(dt.start)}, po przylocie`, (dest.xfer || 'Transfer z lotniska do noclegu – najtaniej komunikacją miejską (Google Maps).').split(';')[0]]);
    tl.push(['stay', `${L.dm(dt.start)}–${L.dmy(dt.end)}`, `${dt.nights} ${dt.nights === 1 ? 'noc' : dt.nights < 5 ? 'noce' : 'nocy'} · ${ACC[f.accType] || 'dowolny'}${f.breakfast === 'tak' ? ' ze śniadaniem' : ''} · ${DIST[f.distance]}`]);
    tl.push(['stay', `${L.DOW_S[dt.end.getDay()].replace(/^./, x => x.toUpperCase())} ${L.dmy(dt.end)}`, 'Wymeldowanie → transfer na lotnisko (być ok. 2 h przed wylotem)']);
    tl.push(['', `${L.DOW_S[dt.end.getDay()].replace(/^./, x => x.toUpperCase())} ${L.dmy(dt.end)}, godzina wg rezerwacji`, `Wylot ${destCode || dest.city} → ${origCode}, powrót do domu`]);
    let tlHtml = tl.map(([k, w, t]) => `<div class="tl-item ${k}"><div class="when">${esc(w)}</div><div class="what">${esc(t)}</div></div>`).join('');

    // --- Dojazd z lotniska ---
    const xr = G('transfery').items.map(i => `<tr><td>${esc(dest.iata || 'Lotnisko')} ↔ centrum</td><td>${esc(TRANSPORT[i.t] || 'Komunikacja')}</td><td>${esc(i.note || '')}</td><td>${A(reg(i.label, i.url), 'Sprawdź →', 'book-link')}</td></tr>`).join('');

    // --- Loty ---
    const fl = G('loty').items;
    const flRows = fl.slice(0, AP.isAll(f.origin) ? 12 : 8).map((i, n) => {
      const src = i.label.split(' – ')[0];
      return `<tr${n === 0 ? ' class="highlight"' : ''}><td>${A(reg(i.label, i.url), esc(`${(i.label.match(/\b([A-Z]{3})\b/) || [])[1] || origCode} ↔ ${(i.label.match(/→ ([A-Z]{3})/) || [])[1] || destCode || dest.city}`))}</td><td>${dt.mode === 'month' ? `${L.MONTHS[dt.m - 1]} ${dt.y}` : `${L.DOW_S[dt.start.getDay()]} ${L.dm(dt.start)} ↔ ${L.DOW_S[dt.end.getDay()]} ${L.dm(dt.end)}`}</td><td>${esc(src)}</td><td>${esc(i.note || '')}</td><td class="chk">sprawdź w linku</td><td>${A(i.url, 'Rezerwuj →', 'book-link')}</td></tr>`;
    }).join('');
    const flMore = fl.length > (AP.isAll(f.origin) ? 12 : 8) ? `<p class="footnote">+ ${fl.length - (AP.isAll(f.origin) ? 12 : 8)} kolejnych linków (Ryanair / Wizz Air dla każdego lotniska) – w aplikacji i na liście linków na końcu raportu.</p>` : '';
    fl.slice(AP.isAll(f.origin) ? 12 : 8).forEach(i => reg(i.label, i.url));

    // --- Prawdziwe loty ---
    const F = window.FL, FLs = c.fl && c.fl.results ? c.fl : null;
    let realFl = '';
    if (!FLs) realFl = '<p class="tl-note">Wyszukiwanie lotów nie zakończyło się (brak połączenia) – użyj linków poniżej.</p>';
    else {
      const rows = FLs.results.slice(0, 6);
      const alt = (!FLs.exactFound ? [...FLs.alternatives.otherAirports.slice(0, 3), ...FLs.alternatives.nearbyDest.slice(0, 3)] : []);
      const row = (r, n, tag = '') => `<tr${r.exact ? ' class="highlight"' : ''}><td>${A(reg(`Ryanair ${r.from}→${r.to} ${r.out}/${r.back}`, r.url), `${r.from} ⇄ ${r.to}`)}${tag}</td><td>${esc(F.fmtDate(r.out))}<br>${esc(F.fmtDate(r.back))}</td><td>${esc(F.hm(r.outDep))}–${esc(F.hm(r.outArr))}<br>${esc(F.hm(r.inDep))}–${esc(F.hm(r.inArr))}</td><td>Ryanair</td><td>bez przesiadek</td><td class="price">${esc(F.zl2(r.total))}${persons > 1 ? `<br><span class="muted">${esc(F.zl2(r.perPerson))}/os.</span>` : ''}</td><td>${A(r.url, 'Rezerwuj →', 'book-link')}</td></tr>`;
      realFl = (FLs.message ? `<div class="tl-note" style="margin-bottom:4px">${esc(FLs.message)}</div>` : '')
        + (rows.length || alt.length ? `<table><thead><tr><th>Kierunek</th><th>Data</th><th>Godziny</th><th>Przewoźnik</th><th>Przesiadki</th><th>Cena${persons > 1 ? ` (${persons} os.)` : ''}</th><th></th></tr></thead><tbody>${rows.map((r, n) => row(r, n)).join('')}${alt.map(r => row(r, 0, `<br><span class="muted">alternatywa${r.km ? ` · ${esc(r.toName)} ${r.km} km od celu` : ' · inne lotnisko'}</span>`)).join('')}</tbody></table>` : '')
        + `<p class="footnote">Prawdziwe ceny z publicznego API Ryanair (najtańszy lot danego dnia, tam i z powrotem), pobrane ${esc(F.stamp(FLs.checkedAt))}. Cena łączna = taryfa za osobę × ${persons}; zwykle bez bagażu rejestrowanego. Ceny zmieniają się – sprawdź przed rezerwacją. Wizz Air i inne linie: linki poniżej.</p>`;
    }
    const bestFl = FLs && FLs.results.length ? (FLs.results.find(r => r.exact) || FLs.results[0]) : null;
    if (bestFl) {
      tl[1] = ['', `${F.fmtDate(bestFl.out)}, ${F.hm(bestFl.outDep)}`, `Wylot ${bestFl.from} → ${bestFl.to}, Ryanair, przylot ${F.hm(bestFl.outArr)} (najtańsza znaleziona opcja)`];
      tl[3] = ['stay', `${L.dm(new Date(bestFl.out + 'T00:00:00'))}–${L.dmy(new Date(bestFl.back + 'T00:00:00'))}`, tl[3][2]];
      tl[5] = ['', `${F.fmtDate(bestFl.back)}, ${F.hm(bestFl.inDep)}`, `Wylot ${bestFl.to} → ${bestFl.from}, Ryanair, przylot ${F.hm(bestFl.inArr)}`];
      tlHtml = tl.map(([k, w, t]) => `<div class="tl-item ${k}"><div class="when">${esc(w)}</div><div class="what">${esc(t)}</div></div>`).join('');
    }

    // --- Nocleg ---
    const accRows = G('nocleg').items.map((i, n) => `<tr${n === 0 ? ' class="highlight"' : ''}><td>${n === 0 ? '<span class="tag">1</span>' : ''}${A(reg(i.label, i.url), esc(i.label))}</td><td>${esc(ACC[f.accType] || 'dowolny')}</td><td>${f.breakfast === 'tak' || i.kind === 'bf' ? 'tak' : f.breakfast === 'nie' ? 'nie' : 'obojętne'}</td><td>${esc(DIST[f.distance])}</td><td>${dt.nights}</td><td class="chk">sprawdź</td><td>${A(i.url, 'Szukaj →', 'book-link')}</td></tr>`).join('');

    // --- Pogoda ---
    const W = wx && wx.days && wx.days.some(d => d.tmax != null) ? wx : null;
    const wxKind = W ? (W.kind === 'forecast' ? 'prognoza' : 'typowa pogoda – szacunek') : '';
    const wxStrip = W ? `<div class="wx-strip">${W.days.map(d => `<div class="wx-day"><div class="wd">${L.dm(d.date)}</div><div class="wt">${d.tmax != null ? Math.round(d.tmax) + '°/' + Math.round(d.tmin) + '°' : '–'}</div><div class="ws">${W.sea ? 'morze ' + Math.round(W.sea) + '°' : d.rain != null ? 'deszcz ' + d.rain + '%' : ''}</div></div>`).join('')}</div>` : '';
    const wxNote = W ? `Pasek pogodowy = ${W.kind === 'forecast' ? 'prognoza Open-Meteo (może się zmienić)' : 'średnie z ostatnich 5 lat dla tych dni (nie prognoza dnia)'}. Źródło: <a href="https://open-meteo.com/">Open-Meteo.com</a>${W.sea ? ', temperatura morza: te same dni rok wcześniej' : ''}.` : 'Dane pogodowe niedostępne w chwili tworzenia raportu – sprawdź prognozę przed wyjazdem.';
    const dayW = i => { const d = W && W.days[i]; return d && d.tmax != null ? `<div class="wx"><span class="wx-label">${W.kind === 'forecast' ? 'Prognoza' : 'Klimat'}</span> dzień ~${Math.round(d.tmax)}°C · noc ~${Math.round(d.tmin)}°C${W.sea ? ` · morze ~${Math.round(W.sea)}°C` : ''}${d.rain != null ? ` · ${W.kind === 'forecast' ? 'szansa deszczu' : 'dni z deszczem'} ~${d.rain}%` : ''} · <em>${W.kind === 'forecast' ? 'prognoza Open-Meteo' : 'szacunek na podstawie średnich z 5 lat'}</em></div>` : ''; };
    const days = plan.map((d, i) => `<div class="day-card"><div class="day-head"><div class="day-icon"><svg viewBox="0 0 24 24">${ICON[KIND_ICON[d.kind] || 'sight']}</svg></div><div><div class="dtitle">${esc(d.dow)} ${L.dm(d.date)} — ${esc(d.title)}</div><div class="dsub">${esc(d.sub)}</div></div></div>
      <div class="day-body">${dayW(i)}<div class="slots"><div class="slot"><div class="slot-h">Rano</div><div class="slot-b">${esc(d.am)}</div></div><div class="slot pm"><div class="slot-h">Popołudnie</div><div class="slot-b">${esc(d.pm)}</div></div><div class="slot eve"><div class="slot-h">Wieczór</div><div class="slot-b">${esc(d.eve)}</div></div></div>
      <div class="tip"><strong>Tip:</strong> ${esc(d.tip)}</div></div></div>`).join('');

    // --- Wypożyczalnie: skutery / e-bike / rower ---
    const rentalSection = (id, title, foot) => {
      const g = groups.find(x => x.id === id); if (!g) return '';
      const rows = g.items.map(i => `<tr${i.verified ? ' class="ver-row"' : ''}><td>${A(reg(i.label, i.url), esc(i.label))}</td><td>${esc(i.note || '')}</td><td class="chk">${i.verified ? 'na stronie firmy' : 'sprawdź w wynikach'}</td><td>${A(i.url, i.verified ? 'Strona →' : 'Szukaj →', 'book-link')}</td></tr>`).join('');
      return `<div class="keep-together"><h2>${esc(title)}</h2><p class="footnote" style="margin:2px 0 5px;">${esc(g.note || '')}</p><table><thead><tr><th style="width:34%">Wypożyczalnia / wyszukiwanie</th><th style="width:36%">Co znajdziesz</th><th>Cena</th><th></th></tr></thead><tbody>${rows}</tbody></table>${foot ? `<p class="footnote">${foot}</p>` : ''}</div>`;
    };
    const rentals = rentalSection('skutery', `Wypożyczalnie skuterów (${dest.city})`, 'Linki prowadzą do wyszukiwania lokalnych wypożyczalni – porównaj opinie, kaucję i wymagane prawo jazdy.')
      + rentalSection('ebike', `Rower elektryczny (e-bike) – ${dest.city}`, '')
      + rentalSection('rower', `Rower (zwykły) – ${dest.city}`, '');

    const food = G('jedzenie').items; food.forEach(i => reg(i.label, i.url));

    const p1 = `
<div class="header"><div><h1>Wyjazd ${esc(AP.isAll(f.origin) ? orig : AP.byCode(f.origin)?.city || orig)} – ${esc(dest.name)}<br>${esc(when)} – propozycja</h1>
<div class="subtitle">Trasa: ${orig} → ${dest.name} · Dla: Andrzej Sowa · ${osob}${ch ? ` (${ad} dor. + ${ch} dz.)` : ''} · źródła: Google Flights, Ryanair, Wizz Air, Skyscanner, Booking.com · wygenerowano ${today}</div></div>
<div class="badge">${bestFl ? `Najtańszy lot${persons > 1 ? ` (${persons} os.)` : ''}<span>${esc(F.zl2(bestFl.total))}</span>` : FLs ? 'Loty Ryanair<span>brak</span>' : 'Loty<span>—</span>'}</div></div>
<h2>Podsumowanie</h2>
<div class="summary">
 ${bestFl ? `<div class="summary-card best"><div class="label">Najtańszy znaleziony lot (prawdziwa cena)</div><div class="total">${esc(F.zl2(bestFl.total))}</div><div class="breakdown">Ryanair ${bestFl.from} ⇄ ${bestFl.to} · ${esc(F.fmtDate(bestFl.out))} ${esc(F.hm(bestFl.outDep))} – ${esc(F.fmtDate(bestFl.back))} ${esc(F.hm(bestFl.inDep))}<br>${persons > 1 ? `${esc(F.zl2(bestFl.perPerson))}/os. × ${persons} · ` : ''}ceny z dnia ${esc(F.stamp(FLs.checkedAt))}</div></div>`
   : `<div class="summary-card best"><div class="label">Loty</div><div class="total">Brak lotów</div><div class="breakdown">${esc(FLs && FLs.message || 'Wyszukiwanie nie zwróciło wyników.')}</div></div>`}
 ${+f.budget > 0 ? `<div class="summary-card"><div class="label">Twój budżet</div><div class="total">${fmt(+f.budget)}</div><div class="breakdown">${bestFl ? `Po opłaceniu lotu zostaje ${+f.budget - bestFl.total >= 0 ? esc(F.zl2(+f.budget - bestFl.total)) : 'brak (lot droższy niż budżet)'} na nocleg, jedzenie i transport.` : 'Brak lotów do porównania.'}</div></div>` : ''}
</div>
<p class="footnote">W raporcie są tylko prawdziwe ceny lotów z wyszukiwania i Twoje dane z formularza. Ceny noclegów i atrakcji sprawdź w linkach – aplikacja ich nie zgaduje.</p>
<div class="cols2" style="margin-top:6px;">
 <div><h2 style="margin-top:0;">Harmonogram</h2><div class="timeline">${tlHtml}</div>
  <div class="tl-note">Godziny lotów zależą od wybranej oferty – po rezerwacji wpisz je do planu. Na lotnisku bądź ok. 2 h przed wylotem.</div></div>
 <div><h2 style="margin-top:0;">Dojazd z lotniska – opcje</h2>
  <table><thead><tr><th>Odcinek</th><th>Środek</th><th>Info</th><th></th></tr></thead><tbody>${xr}</tbody></table>
  <p class="footnote">${esc(dest.xfer || 'Najtańszy zwykle autobus lub pociąg – sprawdź rozkład w Google Maps.')} Ceny i rozkłady sprawdź przed wyjazdem.</p></div>
</div>
<h2>Loty – znalezione (Ryanair, ceny z dnia ${FLs ? esc(F.stamp(FLs.checkedAt)) : '—'})</h2>
${realFl}
<h3>Inne wyszukiwarki lotów</h3>
<table><thead><tr><th>Trasa</th><th>Daty</th><th>Wyszukiwarka</th><th>Uwagi</th><th>Cena</th><th></th></tr></thead><tbody>${flRows}</tbody></table>
<p class="footnote">${dt.sample ? 'Tryb „miesiąc”: Skyscanner i Ryanair pokazują cały miesiąc; linki Google Flights / Wizz Air / Booking używają dat z połowy miesiąca – zmień je na stronie.' : 'Linki otwierają wyszukiwarki z Twoimi datami.'}</p>
<h2>Nocleg (${dt.nights} nocy, ${f.breakfast === 'tak' ? 'ze śniadaniem' : f.breakfast === 'nie' ? 'bez śniadania' : 'śniadanie obojętne'}, Booking.com)</h2>
<p class="muted">${osob}, ${L.dmy(dt.start)}–${L.dmy(dt.end)}${dt.sample ? ' (daty przykładowe)' : ''} · typ: ${esc(ACC[f.accType] || 'dowolny')} · ${esc(DIST[f.distance])}</p>
<table><thead><tr><th>Wyszukiwanie</th><th>Typ</th><th>Śniadanie</th><th>Odległość</th><th>Noce</th><th>Cena</th><th></th></tr></thead><tbody>${accRows}</tbody></table>
<div class="footer keep-together" style="margin-top:6px;font-size:6.6pt;"><strong>Uwagi:</strong> Nic nie zostało zarezerwowane ani opłacone – raport zawiera tylko linki do wyszukiwarek. Ceny lotów i noclegów sprawdź w linkach – mogą się zmieniać z dnia na dzień. Opłata miejska / turystyczna może dojść na miejscu.</div>`;

    const p2 = `<div class="page-break"></div>
<div class="header"><div><h1>Plan dnia po dniu</h1><div class="subtitle">${esc(dest.name)} · ${range} · dla Andrzeja Sowy · atrakcje: ${esc((f.attractions || []).map(a => ATTR[a]).join(', ') || '—')}</div></div><div class="badge">${plan.length} dni<span>aktywności</span></div></div>
<p class="muted" style="margin-bottom:4px;">${wxNote}${W ? ` <span class="est">${esc(wxKind)}</span>` : ''}</p>
${wxStrip}
${days}`;

    const p3 = `<div class="page-break"></div>
<div class="header"><div><h1>Transport na miejscu i praktyczne</h1><div class="subtitle">${esc(dest.name)} · ${esc((f.transport || []).map(t => TRANSPORT[t]).join(' · ') || '—')}</div></div><div class="badge">Transport<span>${(f.transport || []).length} wybr.</span></div></div>
${rentals || '<p class="muted">Nie wybrano skutera ani roweru – zaznacz je w formularzu, aby dostać linki do wypożyczalni.</p>'}
<div class="prac-grid keep-together">
 <div class="prac-box"><h3>Praktyczne</h3><ul>
  ${W ? `<li><strong>Pogoda (${esc(wxKind)}):</strong> dzień ok. ${Math.round(Math.min(...W.days.filter(d => d.tmax != null).map(d => d.tmax)))}–${Math.round(Math.max(...W.days.filter(d => d.tmax != null).map(d => d.tmax)))}°C, noc ok. ${Math.round(Math.min(...W.days.filter(d => d.tmin != null).map(d => d.tmin)))}°C${W.sea ? `, morze ~${Math.round(W.sea)}°C` : ''}.</li>` : ''}
  <li><strong>Z lotniska:</strong> ${esc(dest.xfer || 'autobus / pociąg – sprawdź w Google Maps.')}</li>
  ${dest.food ? `<li><strong>Jedzenie:</strong> ${esc(dest.food)}. Taniej poza głównymi placami; menu dnia w porze lunchu.</li>` : '<li><strong>Jedzenie:</strong> taniej poza głównymi placami; menu dnia w porze lunchu.</li>'}
  ${(f.transport || []).includes('scooter') || (f.attractions || []).includes('skutery') ? '<li><strong>Skuter:</strong> prawo jazdy, dowód, często karta kredytowa na kaucję. Kask obowiązkowy. Zdjęcia pojazdu przy odbiorze.</li>' : ''}
  ${(f.transport || []).includes('ebike') ? '<li><strong>E-bike:</strong> zapytaj o zasięg baterii, ładowarkę, kask i zapięcie.</li>' : ''}
  ${(f.transport || []).includes('bike') ? '<li><strong>Rower:</strong> sprawdź miejski system rowerowy – często najtańszy na krótkie trasy.</li>' : ''}
  ${dest.cur ? `<li><strong>Waluta:</strong> ${esc(dest.cur)} – płać kartą w walucie lokalnej (bez przewalutowania DCC).</li>` : ''}
  <li><strong>Dokumenty:</strong> dowód / paszport, EKUZ (UE), ubezpieczenie podróżne.</li>
 </ul></div>
 <div class="prac-box"><h3>Budżet</h3>
  <ul>
   ${+f.budget > 0 ? `<li><strong>Twój budżet:</strong> ${fmt(+f.budget)}</li>` : '<li>Nie podano budżetu.</li>'}
   ${bestFl ? `<li><strong>Loty (prawdziwa cena, ${esc(F.stamp(FLs.checkedAt))}):</strong> ${esc(F.zl2(bestFl.total))}</li>` : '<li><strong>Loty:</strong> brak lotów Ryanair dla tych danych.</li>'}
   ${+f.budget > 0 && bestFl ? `<li><strong>Zostaje na resztę:</strong> ${esc(F.zl2(+f.budget - bestFl.total))}</li>` : ''}
   <li>Nocleg: ceny w linkach Booking.com (strona 1).</li>
  </ul></div>
</div>
<div class="links-box keep-together" style="margin-top:6px;font-size:5.6pt;line-height:1.3;"><strong style="font-size:6.5pt;">Linki (pełne URL):</strong><br>
${allLinks.map(([l, u]) => `${esc(l)}: ${A(u, esc(u))}`).join('<br>\n')}</div>
<div class="footer"><strong>Uwagi:</strong> Raport wygenerowany ${today} w aplikacji „Andrzej Sowa · Planer tanich wyjazdów”. Nic nie zostało zarezerwowane ani opłacone. Ceny lotów pochodzą z wyszukiwania Ryanair (stan na ${FLs ? esc(F.stamp(FLs.checkedAt)) : '—'}); pozostałe ceny sprawdź w linkach. Pogoda = ${W ? esc(W.kind === 'forecast' ? 'prognoza Open-Meteo' : 'średnie z 5 lat (Open-Meteo), nie prognoza') : 'brak danych'}. Propozycja dla Andrzeja Sowy · © Wojciech Wieczorek.</div>`;

    const base = location.href.replace(/[#?].*$/, '').replace(/[^/]*$/, '');
    return `<!DOCTYPE html><html lang="pl"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><base href="${esc(base)}" target="_blank"><title>${esc(fileName(c))}</title><link rel="stylesheet" href="${esc(base)}assets/fonts.css"><style>${CSS}${EXTRA}</style></head><body><div class="screen-pad">${p1}${p2}${p3}</div></body></html>`;
  }
  return { html, fileName };
})();
