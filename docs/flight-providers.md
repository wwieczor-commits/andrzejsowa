# Dostawcy cen – stan integracji 6.11.2026

## Ryanair
Podłączone publiczne odczyty cen (PLN) i tras; ceny wyświetlane jako wyniki z datą odczytu. Bez zmian w v1.4.

## Skyscanner
Oficjalna dokumentacja: https://developers.skyscanner.net/docs/getting-started/authentication
Wszystkie API (w tym browse/indicative i live) wymagają zatwierdzonej aplikacji partnerskiej i klucza `x-api-key`.
Klucz nie może być w kodzie klienta ani publicznym repozytorium. Bez istniejącego dostępu partnerskiego nie wdrożono źródła cen.
Poprzednia weryfikacja publicznej wyszukiwarki w przeglądarce zakończyła się captcha. Nie podejmowano prób jej obejścia ani odpytania ukrytych endpointów frontendu.

## Wizz Air
Oficjalny portal partnerów: https://developer.intp-uat.wizzair.com/ (opis z publicznego indeksu: utworzenie konta → plan → aplikacja i udostępnienie jej Wizz Air).
Odczyt portalu przez WebFetch/curl zwrócił HTTP 403 – niczego nie obchodzono.
We wcześniejszej próbie 6.11.2026 `www.wizzair.com/buildnumber` zwrócił Human Verification, stary `be.wizzair.com/28.4.0/Api/search/timetable` HTTP 404, a OPTIONS HTTP 401.
Nie powtarzano żądań przez proxy w celu obejścia zabezpieczeń.
Znaleziono nieoficjalny Flywizz (https://pypi.org/project/Flywizz/). README opisuje `timetableV2` jako odczyt cen, ale również sesyjny handshake / obracane tokeny CSRF oraz bot-gated `search/search`.
Nie kopiowano tokenów, nagłówków przeglądarki, nie analizowano wewnętrznego protokołu ani nie instalowano obejścia ochrony. Nie potwierdzono produkcyjnej, wspieranej anonimowej integracji.
Nie twierdzimy, że każdy nowy nieoficjalny endpoint musi być zablokowany – nie wdrażamy go bez potwierdzenia wspieranej metody.

## Proxy
Nie utworzono Supabase Edge Function: proxy nie zapewnia zgody partnerskiej ani klucza Skyscanner i nie jest drogą obchodzenia zabezpieczeń Wizz Air. Nie zmieniono żadnego projektu Supabase ani nie utworzono kont.

## v1.4 – uczciwy fallback
W wynikach, przy komunikacie o braku lotów i przy każdej znalezionej taryfie są linki do Wizz Air i Skyscanner z trasą, datami i osobami. Nie są przedstawiane jako pobrane oferty.
Przy „wszystkie w kraju” panel pozwala jawnie wybrać konkretną parę lotnisk do porównania; linki przy taryfie dotyczą jej rzeczywistych dat, również dla alternatyw ±3 dni.
Skyscanner: PLN, dorośli/dzieci + wiek, daty lub miesiąc. Wizz: konkretne lotniska, daty i liczba dorosłych/dzieci; w trybie miesiąca daty przykładowe są wyraźnie opisane.

### Kontrola linków
Link Wizz KTW→CTA 16–22.11.2026, 2 dorosłych + dziecko: WebFetch 405, zwykły curl HTTP 200, bez przekierowania; tytuł polskiej aplikacji Wizz. To potwierdza osiągalność powłoki strony, nie pobranie cen ani wypełnienie formularza po stronie przewoźnika. Testy Playwright sprawdzają przekazywane parametry, a nie obchodzą ochronę strony docelowej.
