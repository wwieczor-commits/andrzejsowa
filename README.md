# Andrzej Sowa · Planer tanich wyjazdów

Aplikacja webowa (PWA, mobile-first) do samodzielnego planowania tanich wyjazdów.
Formularz → prawdziwe wyniki lotów Ryanair (publiczne API cen, CORS) + gotowe linki (Google Flights w PLN, Ryanair, Wizz Air, Skyscanner, Booking.com, transfery, skutery, e-bike, rowery, tanie jedzenie),
plan dnia po dniu, szacunek budżetu, pogoda (Open-Meteo), raport A4 (druk / PDF) i PDF do pobrania.

**Nic nie jest rezerwowane ani opłacane.** Ceny lotów Ryanair pochodzą z API i mają datę odczytu; pozostałe koszty podróży nie są ofertami sprzedaży.

- Na żywo: https://wwieczor-commits.github.io/andrzejsowa/
- Testy: `python3 -m http.server 8765` i `python3 tests/test_e2e.py`
- Biblioteki: jsPDF + jsPDF-AutoTable (MIT), font Inter (SIL OFL 1.1), dane pogodowe Open-Meteo.com (CC BY 4.0).

© Wojciech Wieczorek

## v1.3 – kraje i lotniska
Obie strony trasy: wyszukiwany kraj (PL/EN, flagi) → lotnisko lub wszystkie lotniska w kraju.
Podpowiedzi globalne: miasto, lotnisko, IATA, kraj, bez polskich znaków; strzałki/Enter/Escape lub dotknięcie.
Dane: publiczne lotniska Ryanair (224 porty / 34 kraje w migawce 6.11.2026, w tym uzupełnione polskie porty).
`assets/data/airports.json` to migawka źródła; `airports-fallback.js` zapewnia te same dane od razu i offline, aktualizowane w tle z publicznego API.
„Wszystkie” znaczy porty z tej listy – nie każdy port na świecie. Wyniki wyszukiwania nadal obejmują wyłącznie bezpośrednie połączenia Ryanair.
Walidacja: wszystkie braki zaznaczone na czerwono; brak zapytania o loty do czasu wybrania trasy, dat/miesiąca i liczby osób.
Testy aktualne: `python3 tests/test_e2e.py [URL] [tag]`; migracja v1.0: `python3 tests/test_upgrade.py /tmp/v10`.

## v1.4 – Wizz Air i Skyscanner bez udawanych cen
- Wyraźny panel obu serwisów w wynikach i komunikacie o braku lotów Ryanair; porównanie przy każdej taryfie używa jej rzeczywistych dat.
- Linki przekazują lotniska, daty i pasażerów (Skyscanner: PLN i wiek dzieci). Przy całych krajach można wybrać parę lotnisk dla linków; tryb miesiąca jest jawnie opisany.
- Raport A4/PDF również zawiera te linki i informację, że ich cen nie pobrano.
- **Źródłem rzeczywistych cen w aplikacji nadal jest wyłącznie Ryanair.** Wizz Air i Skyscanner nie zostały podłączone jako anonimowe źródła taryf: [wyniki weryfikacji i ograniczenia](docs/flight-providers.md).
- Weryfikujemy strukturę parametrów linków. Wizz zwrócił HTTP 200 (powłoka aplikacji); nie potwierdza to załadowania taryf. Nie obchodzimy captchy ani nie gwarantujemy, że docelowy serwis zachowa każdy parametr.

## v1.5 – najpierw wyszukiwarka lotów
Własny projekt inspirowany typowym układem metawyszukiwarki, bez znaków graficznych lub kopiowania identyfikacji Skyscanner.

- Kompaktowy panel: trasa + zamiana, w obie strony / w jedną stronę, arkusze lotnisk/dat/pasażerów, czytelna walidacja. Kraje i autouzupełnianie nadal po obu stronach.
- Kalendarz cen: realne `cheapestPerDay` Ryanair w PLN, osobno dla wylotu i powrotu. Brak odczytanej ceny nie jest deklaracją braku lotu.
- Cały miesiąc oraz wybór najtańszego z **12 kolejnych miesięcy** (realne wyniki fare finder, zadana długość pobytu). Zmiana długości pobytu unieważnia poprzednie ceny miesięcy.
- Dowolne miejsce: `oneWayFares` / `roundTripFares`, najtańsze kierunki zwrócone przez API. To wybór taryf, nie kompletny rozkład wszystkich lotów. Obsługuje także wszystkie lotniska kraju jako początek.
- Wyniki: sortowanie cena / czas / własny ranking (65% cena, 35% czas), pasek cen ±3 dni, godziny i przewoźnik, karty z lokalnymi godzinami i czasem obliczonym z uwzględnieniem stref lotnisk.
- Niemowlęta przekazywane do rezerwacji. API nie podaje ich dopłat: **nie są wliczone w wyświetlaną sumę**. Suma dla dorosłych/dzieci to taryfa bazowa × liczba osób, nie potwierdzenie dostępności grupowej. Przed płatnością potwierdza ją przewoźnik.
- Reszta podróży w sekcji po wynikach. Dla „Dowolne miejsce” najpierw wybierz „Zaplanuj tę ofertę”, dopiero wtedy raport/PDF dotyczą rzeczywistej trasy i są odblokowane.
- Wyszukiwanie Ryanair pozostaje bezpośrednie także po odznaczeniu „Tylko loty bezpośrednie” – komunikat w formularzu wyjaśnia ograniczenie. Nie dodajemy fikcyjnych przesiadek ani ofert innych linii.
- Dane cen w pamięci do 5 min; daty odczytu w Europe/Warsaw. Nic nie jest automatycznie rezerwowane ani opłacane, nie ma automatycznego raportu ani zapisanych wyników.

### Testy v1.5
`python3 tests/test_e2e.py URL tag` (iPhone 13 / Pixel 7 / desktop, Chromium). Realne zapytania, kalendarz w obu kierunkach, 12 miesięcy, całe kraje, Dowolne miejsce, jeden kierunek, walidacja, filtry, raport i PDF. Testy nie są testami prawdziwego Safari/WebKit ani gwarancją dostępności u przewoźnika.
Kalendarz dni wymaga celu (lotnisko lub kraj); dla Dowolne miejsce wybierz datę bez podglądu ceny dnia i kliknij Szukaj. Bardzo szerokie zakresy lotnisk wymagają większej liczby zapytań i mogą być wolniejsze.
