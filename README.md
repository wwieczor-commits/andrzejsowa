# Andrzej Sowa · Planer tanich wyjazdów

Aplikacja webowa (PWA, mobile-first) do samodzielnego planowania tanich wyjazdów.
Formularz → prawdziwe wyniki lotów Ryanair (publiczne API cen, CORS) + gotowe linki (Google Flights w PLN, Ryanair, Wizz Air, Skyscanner, Booking.com, transfery, skutery, e-bike, rowery, tanie jedzenie),
plan dnia po dniu, szacunek budżetu, pogoda (Open-Meteo), raport A4 (druk / PDF) i PDF do pobrania.

**Nic nie jest rezerwowane ani opłacane – aplikacja tylko generuje linki.** Ceny w aplikacji to szacunki.

- Na żywo: https://wwieczor-commits.github.io/andrzejsowa/
- Testy: `python3 -m http.server 8765` i `python3 tests/test_e2e.py`
- Biblioteki: jsPDF + jsPDF-AutoTable (MIT), font Inter (SIL OFL 1.1), dane pogodowe Open-Meteo.com (CC BY 4.0).

© Wojciech Wieczorek
