# Andrzej Sowa · Planer tanich wyjazdów

Aplikacja webowa (PWA, mobile-first) do samodzielnego planowania tanich wyjazdów.
Formularz → prawdziwe wyniki lotów Ryanair (publiczne API cen, CORS) + gotowe linki (Google Flights w PLN, Ryanair, Wizz Air, Skyscanner, Booking.com, transfery, skutery, e-bike, rowery, tanie jedzenie),
plan dnia po dniu, szacunek budżetu, pogoda (Open-Meteo), raport A4 (druk / PDF) i PDF do pobrania.

**Nic nie jest rezerwowane ani opłacane – aplikacja tylko generuje linki.** Ceny w aplikacji to szacunki.

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
