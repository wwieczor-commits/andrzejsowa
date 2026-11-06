/* PDF (jsPDF + AutoTable, font Inter z polskimi znakami). © Wojciech Wieczorek */
'use strict';
window.PDFR = (() => {
  const L = window.PL, { ACC, ATTR, TRANSPORT, DIST, AIRPORTS } = window.PD;
  const NAVY = [14, 26, 43], ACCENT = [224, 69, 43], MUTED = [100, 116, 139], LINE = [216, 222, 232], BG = [244, 246, 249], SEA = [59, 130, 246], SEABG = [238, 246, 255];
  let loading = null;
  const load = src => new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(new Error('Nie można wczytać ' + src)); document.head.appendChild(s); });
  function ensure() {
    if (!loading) loading = (async () => {
      if (!window.jspdf) await load('assets/vendor/jspdf.umd.min.js');
      if (!window.jspdf.jsPDF.API.autoTable) await load('assets/vendor/jspdf.plugin.autotable.min.js');
      if (!window.PDF_FONTS) await load('assets/vendor/pdf-fonts.js');
    })().catch(e => { loading = null; throw e; });
    return loading;
  }
  // wczytaj w tle, żeby kliknięcie „PDF” było szybkie (ważne dla iOS)
  if ('requestIdleCallback' in window) requestIdleCallback(() => ensure().catch(() => { }), { timeout: 4000 }); else setTimeout(() => ensure().catch(() => { }), 2500);

  function build(c) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
    doc.addFileToVFS('Inter-Regular.ttf', window.PDF_FONTS.regular); doc.addFont('Inter-Regular.ttf', 'Inter', 'normal');
    doc.addFileToVFS('Inter-Bold.ttf', window.PDF_FONTS.bold); doc.addFont('Inter-Bold.ttf', 'Inter', 'bold');
    doc.setFont('Inter', 'normal');
    const { f, dest, dt, groups, plan, wx } = c;
    const W = 210, M = 12, CW = W - 2 * M, BOTTOM = 284;
    const G = id => (groups.find(g => g.id === id) || { items: [] });
    const ad = +f.adults || 1, ch = +f.children || 0, persons = ad + ch;
    const osob = persons === 1 ? '1 osoba' : `${persons} ${persons < 5 ? 'osoby' : 'osób'}`;
    const orig = AP.label(f.origin);
    const zl = L.zl, F = window.FL, FLs = c.fl && c.fl.results ? c.fl : null;
    const bestFl = FLs && FLs.results.length ? (FLs.results.find(r => r.exact) || FLs.results[0]) : null;
    const WX = wx && wx.days && wx.days.some(d => d.tmax != null) ? wx : null;
    let y = M;
    const color = (c, fn = 'setTextColor') => doc[fn](c[0], c[1], c[2]);
    const font = (st, sz, col = NAVY) => { doc.setFont('Inter', st); doc.setFontSize(sz); color(col); };
    const need = h => { if (y + h > BOTTOM) { doc.addPage(); y = M; } };
    const text = (t, x, yy, opt = {}) => doc.text(t, x, yy, opt);
    const para = (t, x, w, sz = 8, st = 'normal', col = [51, 65, 85], lh = 1.35) => { font(st, sz, col); const lines = doc.splitTextToSize(t, w); need(lines.length * sz * 0.3528 * lh + 1); text(lines, x, y + sz * 0.3528, { lineHeightFactor: lh }); y += lines.length * sz * 0.3528 * lh + 1; return lines.length; };
    const pill = (label, x, yy, url, colr = ACCENT) => { font('bold', 6.8, [255, 255, 255]); const w = doc.getTextWidth(label) + 4; color(colr, 'setFillColor'); doc.roundedRect(x, yy - 3.1, w, 4.4, 0.8, 0.8, 'F'); text(label, x + 2, yy); if (url) doc.link(x, yy - 3.1, w, 4.4, { url }); return w; };
    const h2 = (t) => { need(10); y += 3; color(ACCENT, 'setFillColor'); doc.rect(M, y - 0.5, 1.1, 5, 'F'); font('bold', 11); text(t, M + 3, y + 3.4); y += 7; };
    const header = (title, sub, b1, b2) => {
      font('bold', 15); const tl = doc.splitTextToSize(title, CW - 50); text(tl, M, y + 5, { lineHeightFactor: 1.2 }); let hy = y + 5 + (tl.length - 1) * 6.3;
      font('normal', 8, MUTED); const sl = doc.splitTextToSize(sub, CW - 50); text(sl, M, hy + 5); hy += 5 + (sl.length - 1) * 3.4;
      color(NAVY, 'setFillColor'); doc.roundedRect(W - M - 46, y, 46, 15, 1.5, 1.5, 'F');
      font('bold', 7.5, [255, 255, 255]); text(b1, W - M - 23, y + 5.2, { align: 'center' }); font('bold', b2.length > 18 ? 9 : 12, ACCENT); text(b2, W - M - 23, y + 11.5, { align: 'center' });
      y = Math.max(hy + 3, y + 18); color(ACCENT, 'setDrawColor'); doc.setLineWidth(1); doc.line(M, y, W - M, y); y += 4;
    };
    const table = (head, body, opts = {}) => {
      need(16);
      doc.autoTable({
        startY: y, head: [head], body, margin: { left: M, right: M, bottom: 14 }, theme: 'plain',
        styles: { font: 'Inter', fontSize: 7.4, cellPadding: { top: 1.6, bottom: 1.6, left: 1.8, right: 1.8 }, textColor: NAVY, lineColor: [226, 232, 240], lineWidth: { bottom: 0.2 }, overflow: 'linebreak', valign: 'top' },
        headStyles: { fillColor: NAVY, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 6.8 },
        alternateRowStyles: { fillColor: [247, 249, 252] },
        ...opts
      });
      y = doc.lastAutoTable.finalY + 2;
    };
    // kolumna z przyciskiem-linkiem: tekst pusty, rysujemy pigułkę
    const linkCol = (idx, urls, label) => ({
      didParseCell: d => { if (d.section === 'body' && d.column.index === idx) d.cell.text = ['']; },
      didDrawCell: d => { if (d.section === 'body' && d.column.index === idx) { const u = urls[d.row.index]; if (u) pill(label(d.row.index), d.cell.x + 1.2, d.cell.y + 4.6, u); } }
    });
    const nameLinks = (idx, urls) => ({
      didDrawCell: d => { if (d.section === 'body' && d.column.index === idx && urls[d.row.index]) doc.link(d.cell.x, d.cell.y, d.cell.width, d.cell.height, { url: urls[d.row.index] }); }
    });
    const merge = (...h) => ({ didParseCell: d => h.forEach(x => x.didParseCell && x.didParseCell(d)), didDrawCell: d => h.forEach(x => x.didDrawCell && x.didDrawCell(d)) });
    const allLinks = []; const reg = (l, u) => { allLinks.push([l, u]); return u; };

    // ===== STRONA 1 =====
    const one=f.tripType==='oneway';
    const when = dt.mode === 'month' ? `${L.MONTHS[dt.m - 1]} ${dt.y} · ${dt.nights} nocy` : one?`${L.dmy(dt.start)} · w jedną stronę · plan pobytu ${dt.nights} nocy`:`${L.dmy(dt.start)} – ${L.dmy(dt.end)}`;
    header(`Wyjazd ${AP.isAll(f.origin) ? orig : AP.byCode(f.origin)?.city || orig} – ${dest.name}\n${when} – propozycja`, `Trasa: ${orig} → ${dest.name} · Dla: Andrzej Sowa · ${osob}${ch ? ` (${ad} dor. + ${ch} dz.)` : ''} · źródła: Google Flights, Ryanair, Wizz Air, Skyscanner, Booking.com · wygenerowano ${L.dmy(new Date())}`, bestFl ? `Najtańszy lot${persons > 1 ? ` (${persons} os.)` : ''}` : 'Loty Ryanair', bestFl ? F.zl2(bestFl.total) : 'brak');
    h2('Podsumowanie');
    const cards = [bestFl ? ['NAJTAŃSZY ZNALEZIONY LOT (PRAWDZIWA CENA)', F.zl2(bestFl.total), `Ryanair ${bestFl.from} ${one?'→':'↔'} ${bestFl.to} · ${F.fmtDate(bestFl.out)} ${F.hm(bestFl.outDep)}${bestFl.back?' – '+F.fmtDate(bestFl.back)+' '+F.hm(bestFl.inDep):' · w jedną stronę'} · ceny z dnia ${F.stamp(FLs.checkedAt)}`, true]
      : ['LOTY', 'Brak lotów', (FLs && FLs.message) || 'Wyszukiwanie nie zwróciło wyników.', true]];
    if (+f.budget > 0) cards.push(['TWÓJ BUDŻET', zl(+f.budget), bestFl ? `Po opłaceniu lotu zostaje ${+f.budget - bestFl.total >= 0 ? F.zl2(+f.budget - bestFl.total) : 'brak (lot droższy niż budżet)'} na nocleg, jedzenie i transport.` : 'Brak lotów do porównania.', false]);
    const cw = (CW - (cards.length - 1) * 3) / cards.length;
    cards.forEach(([l, v, b, best], i) => {
      const x = M + i * (cw + 3);
      if (best) { color(NAVY, 'setFillColor'); doc.roundedRect(x, y, cw, 22, 1.5, 1.5, 'F'); } else { color(BG, 'setFillColor'); color(LINE, 'setDrawColor'); doc.setLineWidth(0.25); doc.roundedRect(x, y, cw, 22, 1.5, 1.5, 'FD'); }
      font('bold', 6.5, best ? [240, 160, 144] : MUTED); text(l, x + 3, y + 4.5);
      font('bold', 13, best ? [255, 255, 255] : NAVY); text(v, x + 3, y + 10.5);
      font('normal', 6.8, best ? [200, 208, 220] : [51, 65, 85]); text(doc.splitTextToSize(b, cw - 6).slice(0, 3), x + 3, y + 14.5);
    });
    y += 24;
    para(`W raporcie są tylko prawdziwe bazowe ceny lotów i Twoje dane. Niemowlęta: ${+f.infants||0}; ich dopłaty nie są wliczone. Ceny noclegów i atrakcji sprawdź w linkach – aplikacja ich nie zgaduje.`, M, CW, 6.8, 'normal', MUTED);

    h2('Harmonogram');
    const cap = s => s.replace(/^./, x => x.toUpperCase());
    const tl = [
      [SEA, `${cap(L.DOW_S[dt.start.getDay()])} ${L.dm(dt.start)}, ok. 2–2,5 h przed wylotem`, `Dojazd na lotnisko ${AP.isAll(f.origin) ? orig : orig}`],
      bestFl ? [ACCENT, `${F.fmtDate(bestFl.out)}, ${F.hm(bestFl.outDep)}`, `Wylot ${bestFl.from} → ${bestFl.to}, Ryanair, przylot ${F.hm(bestFl.outArr)} (najtańsza znaleziona opcja)`] : [ACCENT, `${cap(L.DOW_S[dt.start.getDay()])} ${L.dmy(dt.start)}, godzina wg rezerwacji`, `Wylot ${AP.isAll(f.origin) ? AP.country(AP.countryOf(f.origin))?.name : f.origin} → ${dest.city}${dest.iata ? ' (' + dest.iata + ')' : ''}`],
      [SEA, `${L.dm(dt.start)}, po przylocie`, (dest.xfer || 'Transfer z lotniska – najtaniej komunikacją miejską.').split(';')[0]],
      [NAVY, `${L.dm(dt.start)}–${L.dmy(dt.end)}`, `${dt.nights} nocy · ${ACC[f.accType] || 'dowolny'}${f.breakfast === 'tak' ? ' ze śniadaniem' : ''} · ${DIST[f.distance]}`],
      bestFl ? [ACCENT, `${F.fmtDate(bestFl.back)}, ${F.hm(bestFl.inDep)}`, `Wylot ${bestFl.to} → ${bestFl.from}, Ryanair, przylot ${F.hm(bestFl.inArr)}`] : [ACCENT, `${cap(L.DOW_S[dt.end.getDay()])} ${L.dmy(dt.end)}, godzina wg rezerwacji`, `Wylot ${dest.iata || dest.city} → ${AP.isAll(f.origin) ? AP.country(AP.countryOf(f.origin))?.name : f.origin}, powrót`]
    ];
    if(one)tl.pop();
    const y0 = y; color([208, 215, 226], 'setDrawColor'); doc.setLineWidth(0.6);
    tl.forEach(([col, w, t]) => {
      need(9); color(col, 'setFillColor'); doc.circle(M + 2, y + 1.3, 1.3, 'F');
      font('bold', 7.8); text(w, M + 6, y + 2.2); font('normal', 7.8, [51, 65, 85]); const ls = doc.splitTextToSize(t, CW - 6); text(ls, M + 6, y + 5.6); y += 4 + ls.length * 3.4;
    });
    if (y > y0) { color([208, 215, 226], 'setDrawColor'); doc.line(M + 2, y0 + 2.6, M + 2, y - 4); }

    h2('Dojazd z lotniska – opcje');
    const xi = G('transfery').items;
    table(['Odcinek', 'Środek', 'Info', ''], xi.map(i => [`${dest.iata || 'Lotnisko'} ↔ centrum`, TRANSPORT[i.t] || 'Komunikacja', `${i.label} – ${i.note || ''}`, '']),
      { columnStyles: { 0: { cellWidth: 30 }, 1: { cellWidth: 34 }, 3: { cellWidth: 22 } }, ...linkCol(3, xi.map(i => reg(i.label, i.url)), () => 'Sprawdź →') });
    if (dest.xfer) para(dest.xfer + ' Rozkłady i ceny sprawdź przed wyjazdem.', M, CW, 6.8, 'normal', MUTED);

    h2(`Loty – znalezione (Ryanair${FLs ? ', ceny z dnia ' + F.stamp(FLs.checkedAt) : ''})`);
    if (!FLs) para('Wyszukiwanie lotów nie zakończyło się (brak połączenia) – użyj linków poniżej.', M, CW, 7.5, 'bold', [122, 42, 28]);
    else {
      if (FLs.message) para(FLs.message, M, CW, 7.5, 'bold', [122, 42, 28]);
      const alt = !FLs.exactFound ? [...FLs.alternatives.otherAirports.slice(0, 3), ...FLs.alternatives.nearbyDest.slice(0, 3)] : [];
      const rr = [...FLs.results.slice(0, 6), ...alt];
      if (rr.length) table(['Kierunek', 'Data', 'Godziny', 'Przewoźnik', `Cena${persons > 1 ? ` (${persons} os.)` : ''}`, ''],
        rr.map(r => [`${r.from} ${one?'→':'↔'} ${r.to}${r.exact ? '\nTwoje daty' : ''}${FLs.results.includes(r) ? '' : r.km ? `\nalternatywa: ${r.toName} ${r.km} km` : '\nalternatywa: inne lotnisko'}`, `${F.fmtDate(r.out)}${r.back?'\n'+F.fmtDate(r.back):''}`, `${F.hm(r.outDep)}–${F.hm(r.outArr)}${r.back?'\n'+F.hm(r.inDep)+'–'+F.hm(r.inArr):''}`, 'Ryanair\nbez przesiadek', `${F.zl2(r.total)}${persons > 1 ? `\n${F.zl2(r.perPerson)}/os.` : ''}`, '']),
        { columnStyles: { 0: { cellWidth: 44, textColor: ACCENT, fontStyle: 'bold' }, 4: { fontStyle: 'bold' }, 5: { cellWidth: 22 } }, ...merge(linkCol(5, rr.map(r => reg(`Ryanair ${r.from}→${r.to} ${r.out}/${r.back}`, r.url)), () => 'Rezerwuj →'), nameLinks(0, rr.map(r => r.url))) });
      para(`Prawdziwe ceny z publicznego API Ryanair (najtańszy lot danego dnia), pobrane ${F.stamp(FLs.checkedAt)}. Cena łączna = taryfa bazowa × ${persons} dorosłych/dzieci; niemowlęta: ${+f.infants||0}, ich dopłaty nie są uwzględnione. Cenę grupową potwierdza Ryanair; zwykle bez bagażu rejestrowanego. Wizz Air i inne linie – linki poniżej.`, M, CW, 6.8, 'normal', MUTED);
    }
    const ext=OTHERFLIGHTS.forContext(c);
    if(ext){
      h2('Wizz Air i Skyscanner – ceny na ich stronach');
      para('Nie pobrano cen tych serwisów. Oficjalne API wymagają dostępu partnerskiego (Skyscanner również klucza). Brak lotów Ryanair nie wyklucza innych linii.',M,CW,7,'normal',MUTED);
      para(`${ext.from} → ${ext.to} · ${ext.note}${AP.isAll(f.origin)||AP.isAll(f.dest)?' · linki dotyczą wskazanej pary lotnisk, nie całego kraju.':''}`,M,CW,7,'normal',MUTED);
      need(8);pill('Sprawdź Wizz Air →',M,y+3.5,reg(`Wizz Air ${ext.from}→${ext.to}`,ext.wizz));pill('Sprawdź Skyscanner →',M+42,y+3.5,reg(`Skyscanner ${ext.from}→${ext.to}`,ext.sky));y+=7;
    }
    h2('Inne wyszukiwarki lotów');
    const lim = AP.isAll(f.origin) ? 12 : 8, fl = G('loty').items, flShow = fl.slice(0, lim);
    table(['Trasa / serwis', 'Daty', 'Uwagi', 'Cena', ''], flShow.map(i => [i.label, dt.mode === 'month' ? `${L.MONTHS[dt.m - 1]} ${dt.y}` : `${L.dm(dt.start)} ↔ ${L.dm(dt.end)}`, i.note || '', 'sprawdź w linku', '']),
      { columnStyles: { 0: { cellWidth: 62, textColor: ACCENT, fontStyle: 'bold' }, 1: { cellWidth: 28 }, 3: { cellWidth: 24, textColor: MUTED }, 4: { cellWidth: 22 } }, ...merge(linkCol(4, flShow.map(i => reg(i.label, i.url)), () => 'Rezerwuj →'), nameLinks(0, flShow.map(i => i.url))) });
    fl.slice(lim).forEach(i => reg(i.label, i.url));
    para(`Najtańsze taryfy zwykle bez bagażu rejestrowanego.${fl.length > lim ? ` + ${fl.length - lim} kolejnych linków (każde lotnisko) na liście linków na końcu.` : ''}${dt.sample ? ' Tryb „miesiąc”: linki Google Flights / Wizz / Booking używają dat z połowy miesiąca.' : ''}`, M, CW, 6.8, 'normal', MUTED);

    h2(`Nocleg (${dt.nights} nocy, Booking.com)`);
    const ai = G('nocleg').items;
    table(['Wyszukiwanie', 'Typ', 'Śniadanie', 'Odległość', 'Cena', ''], ai.map(i => [i.label, ACC[f.accType] || 'dowolny', f.breakfast === 'tak' || i.kind === 'bf' ? 'tak' : f.breakfast === 'nie' ? 'nie' : 'obojętne', DIST[f.distance], 'sprawdź', '']),
      { columnStyles: { 0: { cellWidth: 66, textColor: ACCENT, fontStyle: 'bold' }, 4: { textColor: MUTED }, 5: { cellWidth: 20 } }, ...merge(linkCol(5, ai.map(i => reg(i.label, i.url)), () => 'Szukaj →'), nameLinks(0, ai.map(i => i.url))) });
    para(`${osob}, ${L.dmy(dt.start)}–${L.dmy(dt.end)}${dt.sample ? ' (daty przykładowe)' : ''}. Nic nie zostało zarezerwowane ani opłacone – to tylko linki do wyszukiwarek. Opłata turystyczna może dojść na miejscu.`, M, CW, 6.8, 'normal', MUTED);

    // ===== STRONA 2: PLAN =====
    doc.addPage(); y = M;
    header('Plan dnia po dniu', `${dest.name} · ${L.dm(dt.start)}–${L.dmy(dt.end)} · dla Andrzeja Sowy · atrakcje: ${(f.attractions || []).map(a => ATTR[a]).join(', ') || '—'}`, `${plan.length} dni`, 'aktywności');
    para(WX ? `Pogoda: ${WX.kind === 'forecast' ? 'prognoza Open-Meteo (może się zmienić)' : 'TYPOWA POGODA – SZACUNEK: średnie z ostatnich 5 lat dla tych dni (nie prognoza)'}. Źródło: Open-Meteo.com${WX.sea ? '; morze – te same dni rok wcześniej' : ''}.` : 'Dane pogodowe niedostępne – sprawdź prognozę przed wyjazdem.', M, CW, 6.8, 'normal', MUTED);
    if (WX) {
      const n = WX.days.length, bw = Math.min(24, (CW - (n - 1) * 1.5) / n);
      const rows = Math.ceil(n * (bw + 1.5) / CW) || 1, perRow = Math.floor((CW + 1.5) / (bw + 1.5));
      WX.days.forEach((d, i) => {
        const r = Math.floor(i / perRow), x = M + (i % perRow) * (bw + 1.5), yy = y + r * 15;
        color(SEABG, 'setFillColor'); color([197, 218, 245], 'setDrawColor'); doc.setLineWidth(0.25); doc.roundedRect(x, yy, bw, 13, 1, 1, 'FD');
        font('bold', 6.5); text(L.dm(d.date), x + bw / 2, yy + 3.6, { align: 'center' });
        font('bold', 8, ACCENT); text(d.tmax != null ? `${Math.round(d.tmax)}°/${Math.round(d.tmin)}°` : '–', x + bw / 2, yy + 7.6, { align: 'center' });
        font('normal', 5.8, MUTED); text(WX.sea ? `morze ${Math.round(WX.sea)}°` : d.rain != null ? `deszcz ${d.rain}%` : '', x + bw / 2, yy + 11.2, { align: 'center' });
      });
      y += Math.ceil(n / perRow) * 15 + 2;
    }
    plan.forEach((d, i) => {
      const slots = [['RANO', d.am, ACCENT], ['POPOŁUDNIE', d.pm, NAVY], ['WIECZÓR', d.eve, [124, 58, 237]]];
      font('normal', 7.3); const sw = CW - 6;
      const sl = slots.map(s => doc.splitTextToSize(s[1], sw - 22));
      const wd = WX && WX.days[i] && WX.days[i].tmax != null ? WX.days[i] : null;
      const tipL = doc.splitTextToSize('Tip: ' + d.tip, CW - 8);
      const h = 9 + (wd ? 5 : 0) + sl.reduce((a, l) => a + Math.max(1, l.length) * 3.3 + 1.6, 0) + tipL.length * 3.3 + 4;
      need(h + 2);
      color(LINE, 'setDrawColor'); doc.setLineWidth(0.25); doc.roundedRect(M, y, CW, h, 2, 2, 'S');
      color(NAVY, 'setFillColor'); doc.roundedRect(M, y, CW, 9, 2, 2, 'F'); doc.rect(M, y + 5, CW, 4, 'F');
      color(ACCENT, 'setFillColor'); doc.roundedRect(M + 2, y + 1.3, 6.4, 6.4, 1.2, 1.2, 'F'); font('bold', 7.5, [255, 255, 255]); text(String(i + 1), M + 5.2, y + 5.8, { align: 'center' });
      font('bold', 8.8, [255, 255, 255]); text(doc.splitTextToSize(`${d.dow} ${L.dm(d.date)} — ${d.title}`, CW - 14)[0], M + 10.5, y + 4.4);
      font('normal', 6.5, [168, 180, 196]); text(doc.splitTextToSize(d.sub, CW - 14)[0], M + 10.5, y + 7.6);
      let yy = y + 11.5;
      if (wd) { color(SEABG, 'setFillColor'); doc.roundedRect(M + 3, yy - 1.5, CW - 6, 4.4, 0.8, 0.8, 'F'); font('normal', 6.4, [30, 58, 95]); text(`${WX.kind === 'forecast' ? 'PROGNOZA' : 'KLIMAT (szacunek)'}: dzień ~${Math.round(wd.tmax)}°C · noc ~${Math.round(wd.tmin)}°C${WX.sea ? ` · morze ~${Math.round(WX.sea)}°C` : ''}${wd.rain != null ? ` · ${WX.kind === 'forecast' ? 'szansa deszczu' : 'dni z deszczem'} ~${wd.rain}%` : ''}`, M + 5, yy + 1.6); yy += 5; }
      slots.forEach((s, k) => {
        const lh = Math.max(1, sl[k].length) * 3.3 + 0.6;
        color([247, 249, 252], 'setFillColor'); doc.rect(M + 3, yy - 1.2, CW - 6, lh + 0.6, 'F'); color(s[2], 'setFillColor'); doc.rect(M + 3, yy - 1.2, 0.9, lh + 0.6, 'F');
        font('bold', 6.2, MUTED); text(s[0], M + 5.5, yy + 1.6); font('normal', 7.3, [51, 65, 85]); text(sl[k], M + 25, yy + 1.7, { lineHeightFactor: 1.3 });
        yy += lh + 1.6;
      });
      color([255, 245, 243], 'setFillColor'); doc.roundedRect(M + 3, yy - 1.2, CW - 6, tipL.length * 3.3 + 1.4, 0.8, 0.8, 'F'); font('normal', 7, [122, 42, 28]); text(tipL, M + 5, yy + 1.6, { lineHeightFactor: 1.3 });
      y += h + 2.5;
    });

    // ===== STRONA 3: TRANSPORT + PRAKTYCZNE =====
    doc.addPage(); y = M;
    header('Transport na miejscu i praktyczne', `${dest.name} · ${(f.transport || []).map(t => TRANSPORT[t]).join(' · ') || '—'}`, 'Transport', `${(f.transport || []).length} wybr.`);
    const rental = (id, title, foot) => {
      const g = groups.find(x => x.id === id); if (!g) return;
      h2(title); if (g.note) para(g.note, M, CW, 6.8, 'normal', MUTED);
      table(['Wypożyczalnia / wyszukiwanie', 'Co znajdziesz', 'Cena', ''], g.items.map(i => [i.label, i.note || '', i.verified ? 'na stronie firmy' : 'sprawdź w wynikach', '']),
        { columnStyles: { 0: { cellWidth: 62, textColor: ACCENT, fontStyle: 'bold' }, 2: { cellWidth: 30, textColor: MUTED }, 3: { cellWidth: 20 } }, ...merge(linkCol(3, g.items.map(i => reg(i.label, i.url)), r => g.items[r].verified ? 'Strona →' : 'Szukaj →'), nameLinks(0, g.items.map(i => i.url))) });
      if (foot) para(foot, M, CW, 6.6, 'normal', MUTED);
    };
    rental('skutery', `Wypożyczalnie skuterów (${dest.city})`, 'Linki prowadzą do wyszukiwania lokalnych wypożyczalni – porównaj opinie, kaucję i wymagane prawo jazdy.');
    rental('ebike', `Rower elektryczny (e-bike) – ${dest.city}`);
    rental('rower', `Rower (zwykły) – ${dest.city}`);
    if (!groups.some(g => ['skutery', 'ebike', 'rower'].includes(g.id))) para('Nie wybrano skutera ani roweru – zaznacz je w formularzu, aby dostać linki do wypożyczalni.', M, CW, 7.5, 'normal', MUTED);
    G('jedzenie').items.forEach(i => reg(i.label, i.url));

    h2('Praktyczne');
    const T = f.transport || [];
    const prac = [];
    if (WX) { const tx = WX.days.filter(d => d.tmax != null); prac.push(`Pogoda (${WX.kind === 'forecast' ? 'prognoza' : 'typowa – szacunek'}): dzień ok. ${Math.round(Math.min(...tx.map(d => d.tmax)))}–${Math.round(Math.max(...tx.map(d => d.tmax)))}°C, noc ok. ${Math.round(Math.min(...tx.map(d => d.tmin)))}°C${WX.sea ? `, morze ~${Math.round(WX.sea)}°C` : ''}.`); }
    prac.push(`Z lotniska: ${dest.xfer || 'autobus / pociąg – sprawdź w Google Maps.'}`);
    prac.push(`Jedzenie: ${dest.food ? dest.food + '. ' : ''}Taniej poza głównymi placami; menu dnia w porze lunchu.`);
    if (T.includes('scooter') || (f.attractions || []).includes('skutery')) prac.push('Skuter: prawo jazdy, dowód, często karta kredytowa na kaucję. Kask obowiązkowy. Zrób zdjęcia pojazdu przy odbiorze.');
    if (T.includes('ebike')) prac.push('E-bike: zapytaj o zasięg baterii, ładowarkę, kask i zapięcie.');
    if (T.includes('bike')) prac.push('Rower: sprawdź miejski system rowerowy – często najtańszy na krótkie trasy.');
    if (dest.cur) prac.push(`Waluta: ${dest.cur} – płać kartą w walucie lokalnej (bez przewalutowania DCC).`);
    prac.push('Dokumenty: dowód / paszport, EKUZ (UE), ubezpieczenie podróżne.');
    prac.forEach(p => { font('normal', 7.6, [51, 65, 85]); const ls = doc.splitTextToSize(p, CW - 5); need(ls.length * 3.5 + 1); color(ACCENT, 'setFillColor'); doc.circle(M + 1.2, y + 1.6, 0.7, 'F'); text(ls, M + 4, y + 2.6, { lineHeightFactor: 1.3 }); y += ls.length * 3.5 + 1.2; });

    h2('Budżet');
    [+f.budget > 0 ? `Twój budżet: ${zl(+f.budget)}` : 'Nie podano budżetu.',
     bestFl ? `Loty (prawdziwa cena z ${F.stamp(FLs.checkedAt)}): ${F.zl2(bestFl.total)}` : 'Loty: brak lotów Ryanair dla tych danych.',
     ...(+f.budget > 0 && bestFl ? [`Zostaje na resztę: ${F.zl2(+f.budget - bestFl.total)}`] : []),
     'Nocleg: ceny w linkach Booking.com (strona 1).'].forEach(t => para('• ' + t, M, CW, 7.6, 'normal', [51, 65, 85]));

    h2('Linki (pełne URL – klikalne)');
    allLinks.forEach(([l, u]) => {
      font('bold', 6.4, NAVY); const lw = doc.getTextWidth(l + ': ');
      font('normal', 5.8, ACCENT); const ul = doc.splitTextToSize(u, CW - Math.min(lw, 60) - 1);
      need(ul.length * 2.6 + 1.2);
      font('bold', 6.4, NAVY); const ll = doc.splitTextToSize(l + ':', 59); text(ll[0], M, y + 2.2);
      font('normal', 5.8, ACCENT); text(ul, M + 60, y + 2.2, { lineHeightFactor: 1.2 }); doc.link(M + 60, y, CW - 60, ul.length * 2.5 + 0.4, { url: u }); doc.link(M, y, 59, 2.8, { url: u });
      y += Math.max(1, ul.length) * 2.5 + 1.1;
    });
    y += 2; color(LINE, 'setDrawColor'); doc.setLineWidth(0.4); need(14); doc.line(M, y, W - M, y); y += 1;
    para(`Uwagi: Raport wygenerowany ${L.dmy(new Date())} w aplikacji „Andrzej Sowa · Planer tanich wyjazdów”. Nic nie zostało zarezerwowane ani opłacone. Ceny lotów z wyszukiwania Ryanair (stan na ${FLs ? F.stamp(FLs.checkedAt) : '—'}); pozostałe ceny sprawdź w linkach. Pogoda = ${WX ? (WX.kind === 'forecast' ? 'prognoza Open-Meteo' : 'średnie z 5 lat (Open-Meteo), nie prognoza') : 'brak danych'}.`, M, CW, 6.6, 'normal', MUTED);

    const n = doc.getNumberOfPages();
    for (let i = 1; i <= n; i++) { doc.setPage(i); font('normal', 6.5, MUTED); text('© Wojciech Wieczorek · Andrzej Sowa · Planer tanich wyjazdów', M, 291); text(`str. ${i}/${n}`, W - M, 291, { align: 'right' }); }
    doc.setProperties({ title: `${window.REPORT.fileName(c)}`, author: 'Wojciech Wieczorek', subject: 'Planer tanich wyjazdów – Andrzej Sowa', creator: 'Andrzej Sowa · Planer' });
    return doc;
  }

  async function download(c) {
    await ensure();
    const doc = build(c), name = window.REPORT.fileName(c) + '.pdf';
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    if (ios) {
      const blob = doc.output('blob'), file = new File([blob], name, { type: 'application/pdf' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try { await navigator.share({ files: [file], title: name }); return; } catch (e) { if (e && e.name === 'AbortError') return; }
      }
      const url = URL.createObjectURL(blob); const w = window.open(url, '_blank'); if (!w) location.href = url; setTimeout(() => URL.revokeObjectURL(url), 60000); return;
    }
    doc.save(name);
  }
  return { download, build, ensure };
})();
