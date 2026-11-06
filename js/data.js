/* Planer podróży – dane wbudowane. © Wojciech Wieczorek */
'use strict';
window.PD = (() => {
  const AIRPORTS = [
    ['WAW', 'Warszawa Chopin', 'Warsaw'], ['WMI', 'Warszawa Modlin', 'Modlin'], ['KRK', 'Kraków Balice', 'Krakow'],
    ['KTW', 'Katowice Pyrzowice', 'Katowice'], ['GDN', 'Gdańsk', 'Gdansk'], ['WRO', 'Wrocław', 'Wroclaw'],
    ['POZ', 'Poznań', 'Poznan'], ['RZE', 'Rzeszów-Jasionka', 'Rzeszow'], ['LUZ', 'Lublin', 'Lublin'],
    ['SZZ', 'Szczecin-Goleniów', 'Szczecin'], ['BZG', 'Bydgoszcz', 'Bydgoszcz'], ['LCJ', 'Łódź', 'Lodz'],
    ['SZY', 'Olsztyn-Mazury', 'Szymany'], ['RDO', 'Radom', 'Radom'], ['IEG', 'Zielona Góra', 'Zielona Gora']
  ].map(([code, name, en]) => ({ code, name, en }));

  // lvl: poziom cen na miejscu 1 = tanio, 2 = średnio, 3 = drożej (do szacunku budżetu)
  // Wskazówki = ogólna wiedza przewodnikowa, nie oferta handlowa. Rozkłady i ceny zawsze sprawdzić.
  const D = [];
  const add = (o) => D.push(o);
  add({ key: 'katania', name: 'Katania (Sycylia)', city: 'Katania', q: 'Catania', iata: 'CTA', country: 'Włochy', lat: 37.5079, lon: 15.0830, lvl: 2, cur: '€',
    airportName: 'Catania Fontanarossa', xfer: 'Alibus (AMTS) lotnisko ↔ centrum, ok. 15–25 min; taksówki przy terminalu; lotnisko jest blisko miasta.',
    sights: [['Centrum Katanii', 'Piazza del Duomo · Fontana dell’Elefante · Via Etnea · targ La Pescheria'], ['Etna', 'Rifugio Sapienza · kolejka Funivia dell’Etna · kratery (cieplej się ubrać!)'], ['Taormina', 'Teatr Grecki · Corso Umberto · Isola Bella (autobus z Katanii)'], ['Syrakuzy i Ortigia', 'Ortigia · Park Archeologiczny Neapolis (pociąg/autobus)']],
    beaches: [['Riviera dei Ciclopi', 'Aci Castello · Aci Trezza (Faraglioni)'], ['La Playa di Catania', 'długa piaszczysta plaża na południe od centrum']],
    scooter: 'Riviera dei Ciclopi: Katania → Aci Castello → Aci Trezza → Acireale (wybrzeżem na północ)',
    food: 'arancini, cannoli, granita z brioszką, street food przy La Pescheria',
    rentals: [ // zweryfikowane 6.11.2026 w raporcie Wyjazd_Katania (strony firm)
      { name: 'Rent in Catania', url: 'https://www.rentincatania.it/product-category/scooter/', note: 'Piazza dei Martiri 2 · centrum; strona: bez karty / bez kaucji' },
      { name: 'Manganaro Rent', url: 'https://www.manganarorent.it/noleggio-scooter-a-catania/', note: 'lotnisko Fontanarossa; wymagana karta kredytowa Visa/MC + kaucja' },
      { name: 'CM Motor', url: 'https://www.autonoleggiocmcarmotor.com/contatti', note: 'Via Acquicella 31; odbiór na lotnisku wg FAQ' },
      { name: 'BikesBooking (agregator)', url: 'https://bikesbooking.com/it/scooter-and-motorcycle-rental-in-catania/', note: 'porównanie lokalnych firm' },
      { name: 'Riderly (agregator)', url: 'https://riderly.com/rental-locations/italy/catania/', note: 'porównanie ofert, dowóz zależny od oferty' }
    ] });
  add({ key: 'palermo', name: 'Palermo (Sycylia)', city: 'Palermo', q: 'Palermo', iata: 'PMO', country: 'Włochy', lat: 38.1157, lon: 13.3615, lvl: 2, cur: '€', airportName: 'Palermo Falcone-Borsellino' });
  add({ key: 'malaga', name: 'Malaga (Costa del Sol)', city: 'Malaga', q: 'Malaga', iata: 'AGP', country: 'Hiszpania', lat: 36.7213, lon: -4.4214, lvl: 2, cur: '€',
    airportName: 'Málaga-Costa del Sol', xfer: 'Pociąg podmiejski Cercanías C1 lotnisko → centrum (María Zambrano / Centro-Alameda) oraz autobus Línea A Express.',
    sights: [['Stare miasto Malagi', 'Alcazaba · Gibralfaro · katedra · Muzeum Picassa'], ['Ronda', 'Puente Nuevo i wąwóz (autobus/pociąg, wycieczka całodniowa)'], ['Granada', 'Alhambra – bilety z wyprzedzeniem'], ['Nerja', 'Balcón de Europa · jaskinie Nerja']],
    beaches: [['Playa de la Malagueta', 'miejska plaża przy centrum'], ['Torremolinos / Benalmádena', 'plaże dostępne pociągiem C1']],
    scooter: 'wybrzeżem na wschód: Pedregalejo → El Palo → Rincón de la Victoria', food: 'espeto de sardinas, tapas, churros z czekoladą, mercado de Atarazanas' });
  add({ key: 'alicante', name: 'Alicante (Costa Blanca)', city: 'Alicante', q: 'Alicante', iata: 'ALC', country: 'Hiszpania', lat: 38.3452, lon: -0.4810, lvl: 2, cur: '€',
    airportName: 'Alicante-Elche', xfer: 'Autobus C-6 lotnisko ↔ centrum Alicante; taksówki przy terminalu.',
    sights: [['Centrum Alicante', 'Castillo de Santa Bárbara · Explanada de España · Barrio Santa Cruz'], ['Elche', 'Palmeral (UNESCO) · Huerto del Cura'], ['Guadalest i Altea', 'górska wioska i białe miasteczko (wycieczka)'], ['Tabarca', 'rejs na wysepkę Tabarca']],
    beaches: [['Playa del Postiguet', 'plaża w centrum'], ['Playa de San Juan', 'długa plaża – tramwaj']],
    scooter: 'Alicante → Cabo de la Huerta → Playa de San Juan → El Campello', food: 'paella / arroz a banda, turrón, tapas na Calle Castaños' });
  add({ key: 'barcelona', name: 'Barcelona', city: 'Barcelona', q: 'Barcelona', iata: 'BCN', country: 'Hiszpania', lat: 41.3874, lon: 2.1686, lvl: 3, cur: '€',
    airportName: 'Barcelona El Prat', xfer: 'Aerobús do Pl. Catalunya, pociąg R2 Nord lub metro L9 Sud. Uwaga: część tanich linii lata na Gironę (GRO) lub Reus (REU).',
    sights: [['Gaudí', 'Sagrada Família · Park Güell (bilety online wcześniej)'], ['Stare miasto', 'Barri Gòtic · La Rambla · La Boqueria · El Born'], ['Montjuïc', 'zamek · Magiczna Fontanna · widoki'], ['Montserrat', 'klasztor w górach (pociąg + kolejka)']],
    beaches: [['Barceloneta', 'miejska plaża'], ['Bogatell / Mar Bella', 'spokojniejsze plaże']],
    scooter: 'nadmorska trasa Barceloneta → Port Olímpic → Badalona', food: 'tapas, pa amb tomàquet, menu del día w porze lunchu (najtaniej)' });
  add({ key: 'rzym', name: 'Rzym', city: 'Rzym', q: 'Rome', iata: 'FCO', alt: ['CIA'], country: 'Włochy', lat: 41.9028, lon: 12.4964, lvl: 3, cur: '€',
    airportName: 'Roma Fiumicino', xfer: 'FCO: pociąg Leonardo Express lub regionalny FL1; CIA (Ciampino): autobusy do Termini. Sprawdź, na które lotnisko leci tania linia.',
    sights: [['Starożytny Rzym', 'Koloseum · Forum Romanum · Palatyn (bilety online)'], ['Watykan', 'Bazylika św. Piotra · Muzea Watykańskie'], ['Centro storico', 'Fontanna di Trevi · Panteon · Piazza Navona · Hiszpańskie Schody'], ['Zatybrze', 'Trastevere · Gianicolo']],
    beaches: [['Ostia', 'plaża dostępna pociągiem Roma-Lido'], ['Santa Marinella', 'plaża na północ (pociąg)']],
    scooter: 'Via Appia Antica (w niedziele częściowo bez aut) lub Gianicolo → Trastevere', food: 'pizza al taglio, supplì, carbonara i cacio e pepe w trattoriach Testaccio' });
  add({ key: 'ateny', name: 'Ateny', city: 'Ateny', q: 'Athens', iata: 'ATH', country: 'Grecja', lat: 37.9838, lon: 23.7275, lvl: 2, cur: '€',
    airportName: 'Athens International', xfer: 'Metro linii 3 (niebieska) lotnisko ↔ Syntagma; autobus X95; podmiejska kolej Proastiakos.',
    sights: [['Akropol', 'Partenon · Muzeum Akropolu (rano, przed upałem)'], ['Plaka i Monastiraki', 'stare uliczki · pchli targ · Agora'], ['Przylądek Sunion', 'świątynia Posejdona – zachód słońca'], ['Pireus i rejs', 'jednodniowy rejs na Eginę/Hydrę']],
    beaches: [['Riwiera Ateńska', 'Glyfada · Vouliagmeni (tramwaj/autobus)'], ['Jezioro Vouliagmeni', 'kąpielisko mineralne (płatne)']],
    scooter: 'Riwiera Ateńska: Glyfada → Vouliagmeni → Sunion', food: 'souvlaki, gyros, koulouri, tawerny w Psiri' });
  add({ key: 'kreta', name: 'Kreta (Heraklion)', city: 'Heraklion', q: 'Heraklion', iata: 'HER', alt: ['CHQ'], country: 'Grecja', lat: 35.3387, lon: 25.1442, lvl: 2, cur: '€',
    airportName: 'Heraklion Nikos Kazantzakis', xfer: 'Autobusy miejskie i KTEL z lotniska do centrum Heraklionu i miejscowości; zachód wyspy – lotnisko Chania (CHQ).',
    sights: [['Knossos', 'pałac minojski + Muzeum Archeologiczne w Heraklionie'], ['Rethymno', 'stare miasto weneckie · Fortezza'], ['Spinalonga', 'wyspa-twierdza (łódź z Plaki/Elundy)'], ['Wąwóz Samaria', 'całodniowy trekking (sezon maj–paźdz.)']],
    beaches: [['Balos / Elafonisi', 'najsłynniejsze laguny (zachód, daleko)'], ['Matala / Malia', 'plaże na południu/wschodzie']],
    scooter: 'wybrzeże na wschód od Heraklionu: Amoudara → Hersonissos → Malia', food: 'dakos, gyros, raki, tawerny rodzinne w górskich wioskach' });
  add({ key: 'majorka', name: 'Majorka (Palma)', city: 'Palma', q: 'Palma de Mallorca', iata: 'PMI', country: 'Hiszpania', lat: 39.5696, lon: 2.6502, lvl: 3, cur: '€',
    airportName: 'Palma de Mallorca', xfer: 'Autobus A1 (EMT) lotnisko ↔ centrum Palmy; autobusy TIB do kurortów.',
    sights: [['Palma', 'katedra La Seu · Castell de Bellver · stare miasto'], ['Sóller', 'zabytkowy pociąg z Palmy + tramwaj do portu'], ['Valldemossa i Deià', 'górskie miasteczka Serra de Tramuntana'], ['Cuevas del Drach', 'jaskinie w Porto Cristo']],
    beaches: [['Es Trenc', 'dzika piaszczysta plaża'], ['Cala Mondragó / Caló des Moro', 'zatoczki na wschodzie']],
    scooter: 'Palma → Port d’Andratx lub serpentyny Tramuntany (doświadczeni)', food: 'ensaïmada, pa amb oli, tapas w Santa Catalina' });
  add({ key: 'lizbona', name: 'Lizbona', city: 'Lizbona', q: 'Lisbon', iata: 'LIS', country: 'Portugalia', lat: 38.7223, lon: -9.1393, lvl: 3, cur: '€',
    airportName: 'Lisboa Humberto Delgado', xfer: 'Metro linii czerwonej z lotniska do centrum; Aerobus; lotnisko jest blisko miasta.',
    sights: [['Alfama i Baixa', 'tramwaj 28 · zamek São Jorge · Praça do Comércio'], ['Belém', 'Klasztor Hieronimitów · Torre de Belém · pastéis de Belém'], ['Sintra', 'Pena · Quinta da Regaleira (pociąg z Rossio)'], ['Cascais', 'nadmorskie miasteczko (pociąg z Cais do Sodré)']],
    beaches: [['Cascais / Estoril', 'plaże przy linii kolejowej'], ['Costa da Caparica', 'długie plaże za mostem']],
    scooter: 'nabrzeże Tagu: Cais do Sodré → Belém (uwaga na bruk i strome uliczki)', food: 'pastéis de nata, bifana, sardynki, Time Out Market' });
  add({ key: 'porto', name: 'Porto', city: 'Porto', q: 'Porto', iata: 'OPO', country: 'Portugalia', lat: 41.1579, lon: -8.6291, lvl: 2, cur: '€',
    airportName: 'Porto Francisco Sá Carneiro', xfer: 'Metro linii E (fioletowa) lotnisko ↔ centrum (Trindade).',
    sights: [['Ribeira', 'nabrzeże Douro · most Ludwika I · Livraria Lello'], ['Vila Nova de Gaia', 'piwnice wina porto (degustacje)'], ['Dolina Douro', 'wycieczka pociągiem do Pinhão'], ['Guimarães / Braga', 'jednodniowa wycieczka pociągiem']],
    beaches: [['Matosinhos', 'plaża miejska (metro)'], ['Foz do Douro', 'promenada nad oceanem']],
    scooter: 'Ribeira → Foz do Douro → Matosinhos wzdłuż oceanu', food: 'francesinha, bifana, ryby w Matosinhos' });
  add({ key: 'teneryfa', name: 'Teneryfa (południe)', city: 'Costa Adeje', q: 'Costa Adeje, Tenerife', iata: 'TFS', alt: ['TFN'], country: 'Hiszpania (Wyspy Kanaryjskie)', lat: 28.0916, lon: -16.7360, lvl: 2, cur: '€',
    airportName: 'Tenerife Sur', xfer: 'Autobusy TITSA z TFS do Los Cristianos / Costa Adeje / Santa Cruz; północ wyspy – lotnisko TFN.',
    sights: [['Teide', 'kolejka na wulkan (rezerwacja online) · park narodowy'], ['Masca', 'górska wioska i serpentyny'], ['La Laguna i Santa Cruz', 'stare miasto UNESCO'], ['Los Gigantes', 'klify + rejs z delfinami']],
    beaches: [['Playa de las Américas / Los Cristianos', 'plaże kurortów'], ['El Médano', 'wiatr – kitesurfing']],
    scooter: 'Costa Adeje → Los Gigantes wzdłuż wybrzeża', food: 'papas arrugadas z mojo, ryby, guachinche (lokalne knajpki)' });
  add({ key: 'antalya', name: 'Antalya (Turcja)', city: 'Antalya', q: 'Antalya', iata: 'AYT', country: 'Turcja', lat: 36.8969, lon: 30.7133, lvl: 1, cur: 'TRY',
    airportName: 'Antalya Airport', xfer: 'Autobusy miejskie i Havaş do centrum; tramwaj AntRay; transfery hotelowe.',
    sights: [['Kaleiçi', 'stare miasto · Brama Hadriana · port'], ['Wodospady Düden', 'Dolny i Górny Düden'], ['Perge i Aspendos', 'antyczne ruiny i teatr'], ['Side', 'świątynia Apollina (wycieczka)']],
    beaches: [['Konyaaltı', 'długa plaża żwirowa'], ['Lara', 'piaszczysta plaża na wschodzie']],
    scooter: 'promenada Konyaaltı → Kaleiçi', food: 'kebab, pide, simit, piyaz (sałatka antalyjska)' });
  add({ key: 'burgas', name: 'Burgas (Bułgaria)', city: 'Burgas', q: 'Burgas', iata: 'BOJ', country: 'Bułgaria', lat: 42.5048, lon: 27.4626, lvl: 1, cur: 'BGN/€',
    airportName: 'Burgas Airport', xfer: 'Autobus miejski nr 15 lotnisko ↔ centrum; busy do Słonecznego Brzegu; taksówki (ustal cenę/licznik).',
    sights: [['Nesebyr', 'stare miasto UNESCO (bus)'], ['Sozopol', 'stare miasto na półwyspie'], ['Burgas', 'Ogród Nadmorski · wyspa św. Anastazji (rejs)'], ['Jeziora solne', 'Pomorie · błota lecznicze']],
    beaches: [['Słoneczny Brzeg', 'duży kurort'], ['Plaża w Burgas / Sozopol', 'spokojniej']],
    scooter: 'Burgas → Sozopol wybrzeżem (ostrożnie na drodze krajowej)', food: 'szopska sałatka, kebapcze, ryby, banica' });
  add({ key: 'neapol', name: 'Neapol', city: 'Neapol', q: 'Naples', iata: 'NAP', country: 'Włochy', lat: 40.8518, lon: 14.2681, lvl: 2, cur: '€', airportName: 'Napoli Capodichino' });
  add({ key: 'bari', name: 'Bari (Apulia)', city: 'Bari', q: 'Bari', iata: 'BRI', country: 'Włochy', lat: 41.1171, lon: 16.8719, lvl: 2, cur: '€', airportName: 'Bari Karol Wojtyła' });
  add({ key: 'walencja', name: 'Walencja', city: 'Walencja', q: 'Valencia', iata: 'VLC', country: 'Hiszpania', lat: 39.4699, lon: -0.3763, lvl: 2, cur: '€', airportName: 'Valencia Airport' });
  add({ key: 'malta', name: 'Malta', city: 'Valletta', q: 'Valletta', iata: 'MLA', country: 'Malta', lat: 35.8989, lon: 14.5146, lvl: 2, cur: '€', airportName: 'Malta International' });
  add({ key: 'larnaka', name: 'Larnaka (Cypr)', city: 'Larnaka', q: 'Larnaca', iata: 'LCA', country: 'Cypr', lat: 34.9003, lon: 33.6232, lvl: 2, cur: '€', airportName: 'Larnaca International' });
  add({ key: 'pafos', name: 'Pafos (Cypr)', city: 'Pafos', q: 'Paphos', iata: 'PFO', country: 'Cypr', lat: 34.7720, lon: 32.4297, lvl: 2, cur: '€', airportName: 'Paphos International' });
  add({ key: 'rodos', name: 'Rodos', city: 'Rodos', q: 'Rhodes', iata: 'RHO', country: 'Grecja', lat: 36.4341, lon: 28.2176, lvl: 2, cur: '€', airportName: 'Rhodes Diagoras' });
  add({ key: 'korfu', name: 'Korfu', city: 'Korfu', q: 'Corfu', iata: 'CFU', country: 'Grecja', lat: 39.6243, lon: 19.9217, lvl: 2, cur: '€', airportName: 'Corfu Ioannis Kapodistrias' });
  add({ key: 'tirana', name: 'Tirana (Albania)', city: 'Tirana', q: 'Tirana', iata: 'TIA', country: 'Albania', lat: 41.3275, lon: 19.8187, lvl: 1, cur: 'ALL', airportName: 'Tirana Matka Teresa' });
  add({ key: 'split', name: 'Split (Chorwacja)', city: 'Split', q: 'Split', iata: 'SPU', country: 'Chorwacja', lat: 43.5081, lon: 16.4402, lvl: 2, cur: '€', airportName: 'Split Airport' });
  add({ key: 'hurghada', name: 'Hurghada (Egipt)', city: 'Hurghada', q: 'Hurghada', iata: 'HRG', country: 'Egipt', lat: 27.2579, lon: 33.8116, lvl: 1, cur: 'EGP', airportName: 'Hurghada International' });
  add({ key: 'lanzarote', name: 'Lanzarote', city: 'Arrecife', q: 'Lanzarote', iata: 'ACE', country: 'Hiszpania (Wyspy Kanaryjskie)', lat: 28.9630, lon: -13.5477, lvl: 2, cur: '€', airportName: 'Lanzarote Airport' });
  add({ key: 'grancanaria', name: 'Gran Canaria', city: 'Las Palmas', q: 'Las Palmas de Gran Canaria', iata: 'LPA', country: 'Hiszpania (Wyspy Kanaryjskie)', lat: 28.1235, lon: -15.4363, lvl: 2, cur: '€', airportName: 'Gran Canaria Airport' });
  add({ key: 'fuerteventura', name: 'Fuerteventura', city: 'Corralejo', q: 'Fuerteventura', iata: 'FUE', country: 'Hiszpania (Wyspy Kanaryjskie)', lat: 28.5004, lon: -13.8627, lvl: 2, cur: '€', airportName: 'Fuerteventura Airport' });
  add({ key: 'mediolan', name: 'Mediolan (Bergamo)', city: 'Mediolan', q: 'Milan', iata: 'BGY', alt: ['MXP'], country: 'Włochy', lat: 45.4642, lon: 9.19, lvl: 3, cur: '€', airportName: 'Milano Bergamo' });
  add({ key: 'budapeszt', name: 'Budapeszt', city: 'Budapeszt', q: 'Budapest', iata: 'BUD', country: 'Węgry', lat: 47.4979, lon: 19.0402, lvl: 1, cur: 'HUF', airportName: 'Budapest Ferenc Liszt' });
  add({ key: 'londyn', name: 'Londyn (Stansted)', city: 'Londyn', q: 'London', iata: 'STN', alt: ['LTN'], country: 'Wielka Brytania', lat: 51.5072, lon: -0.1276, lvl: 3, cur: 'GBP', airportName: 'London Stansted' });

  const ATTR = { plaze: 'Plaże', skutery: 'Skutery', zwiedzanie: 'Zwiedzanie', jedzenie: 'Jedzenie' };
  const TRANSPORT = { bus: 'Autobus / komunikacja', taxi: 'Taksówka', car: 'Wynajem auta', scooter: 'Skuter', ebike: 'Rower elektryczny (e-bike)', bike: 'Rower (zwykły)' };
  const ACC = { dowolny: 'Dowolny', hotel: 'Hotel', apartament: 'Apartament', hostel: 'Hostel' };
  const DIST = { any: 'Bez znaczenia', c1: 'Do 1 km od centrum', c3: 'Do 3 km od centrum', c5: 'Do 5 km od centrum', airport: 'Blisko lotniska' };

  function find(text) {
    if (!text) return null;
    const t = text.trim().toLowerCase();
    const code = (text.match(/\b([A-Z]{3})\b/) || [])[1] || (/^[a-z]{3}$/i.test(text.trim()) ? text.trim().toUpperCase() : null);
    return D.find(d => d.name.toLowerCase() === t || d.key === t || d.city.toLowerCase() === t || d.q.toLowerCase() === t || `${d.name} (${d.iata})`.toLowerCase() === t)
      || (code && D.find(d => d.iata === code || (d.alt || []).includes(code)))
      || D.find(d => d.name.toLowerCase().startsWith(t) || d.city.toLowerCase().startsWith(t)) || null;
  }
  return { AIRPORTS, DEST: D, ATTR, TRANSPORT, ACC, DIST, find };
})();
