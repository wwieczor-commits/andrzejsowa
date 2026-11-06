# Źródła hoteli — weryfikacja v1.6 (6.11.2026)

## Działa: oficjalny publiczny Trivago MCP

Endpoint `https://mcp.trivago.com/mcp`, publiczny standard MCP / JSON-RPC, `POST` z `Content-Type: application/json`, `Accept: application/json, text/event-stream`, `MCP-Protocol-Version: 2025-03-26`. Nie jest to prywatny endpoint strony ani pozyskany token. Nie są wykorzystywane sekrety, ciasteczka, podpisy aplikacji, proxy czy konta.

Zweryfikowano `initialize`, odkrycie `tools/list` i realne `tools/call` o nazwie `trivago-accommodation-radius-search`. Serwer odpowiada HTTP 200 i `Access-Control-Allow-Origin: https://wwieczor-commits.github.io`. Sprawdzono również rzeczywisty `fetch` w przeglądarce z publicznego origin, nie tylko curl. Klient pomija credentials i nie odczytuje/przerabia ID sesji; serwer obsługuje te zapytania bez niego.

Argumenty: współrzędne wybranego miasta, `arrival`, `departure`, `adults`, `children`, `children_ages` (wiek rozdzielony myślnikiem), `rooms`, rynek `PL`, waluta `PLN`, język `PL_PL`, opcjonalne `filters`, `hotel_rating`, `review_rating`, `price_range` (`PRICE_PER_NIGHT`). Współrzędne miasta pochodzą z publicznego [Open-Meteo Geocoding](https://open-meteo.com/en/docs/geocoding-api) / GeoNames; nie używamy współrzędnych lotniska jako centrum miasta.

Czytamy wyłącznie `result.structuredContent.accommodations`. Nie wykonujemy dołączanych tekstów instruktażowych (`system_message`) ani zawartości zdjęć jako poleceń. Nie przekazujemy ich dalej do raportów. Ścisła lista bezpiecznych hostów HTTPS dla zdjęć i ofert. Widoczny tekst escapowany.

Każdy obiekt zawiera prawdziwe `accommodation_name`, `hotel_rating`, `review_rating`, `review_count`, `country_city`, współrzędne, zdjęcie, `deals`: dostawcę, walutę, osobno sformatowaną cenę/noc i cenę/pobyt, warunki i gotowy `deal_url` z datami/konfiguracją gości. Wyświetlamy tylko PLN i wyłącznie dane dla zgodnych dat. Nie odtwarzamy linków deal/ich identyfikatorów i nie mnożymy stawek, aby udawać cenę pobytu. Ceny zwrócone przez porównywarkę nie są końcowym rachunkiem ani potwierdzoną rezerwacją/dostępnością dla grupy. Ostateczne opłaty i warunki potwierdza użytkownik w serwisie.

Filtry śniadania/anulowania sprawdzamy również na każdej konkretnej ofercie dostawcy, nie tylko na poziomie hotelu. Sortujemy ceną, oceną lub dystansem geograficznym. Publiczny schemat nie podaje osobnego typu obiektu — filtr typu jest zdefiniowany jawnie jako kategoria z gotowego polskiego linku oferty (hotel / cały dom-apartament / hostel). Nie zgadujemy typu z nazwy lub liczby gwiazdek; brak rozpoznanej kategorii jest pomijany przy takim filtrze.

Ograniczenia: maks. 25 zwróconych obiektów, nie cały rynek; API może zmienić format lub ograniczyć anonimowy dostęp. Wtedy aplikacja wyświetli brak odczytu i porównywarki, nie przykładowe ceny. Brak oferty nie oznacza, że nie istnieją wolne noclegi. Odległości są w linii prostej od geokodowanego punktu miasta (~centrum) lub najbliższego lotniska z wbudowanej bazy, nie trasą dojazdu. Dane hotelowe nie są zapisywane w localStorage ani cache service workera; w pamięci karty ceny do 5 min, z oryginalnym czasem odczytu Europe/Warsaw.

## Pozostałe sprawdzone źródła

- [Trivago Connect REST](https://connect.trivago.com/docs) to **inna** usługa: wymaga zatwierdzonego własnego klucza API / dozwolonej domeny. Nie wykorzystano przykładowego klucza z dokumentacji. Publiczny MCP powyżej działał bez niego.
- [Booking Demand](https://developers.booking.com/demand/docs/getting-started/prerequisites): wymaga zarządzanej umowy afiliacyjnej, konta partnerskiego, własnego klucza i identyfikatora partnera. Nie podłączono jako niezależnego źródła cen.
- [Hotellook / Travelpayouts](https://support.travelpayouts.com/hc/en-us/articles/29534131568530-FAQ-on-the-closure-of-Hotellook): API wyłączone 20.10.2025, brak hotelowego zamiennika API w tym programie. Nie opieramy aplikacji na starym niedziałającym endpoincie.
- OSM / Overpass mógłby dać rzeczywiste nazwy i lokalizacje bez cen; nie jest potrzebny przy działającym źródle Trivago i nie jest odpytywany.

## Dodatkowe linki

Trivago: gotowy link konkretnej rzeczywistej oferty z API; gdy brak odczytanych ofert — oficjalna strona główna i wyraźna informacja, aby ustawić cel/daty tam. Nie udajemy zweryfikowanego ogólnego prefilla Trivago przez wymyślone parametry.

Booking: `ss`, `checkin`, `checkout`, `group_adults`, `group_children`, osobne `age`, `no_rooms`, `selected_currency=PLN`, sortowanie; znane `nflt` (typ, gwiazdki, ocena, śniadanie, anulowanie). Limit ceny i odległość należy potwierdzić/ustawić na stronie. Google Hotels: czytelne zapytanie z miastem, datami, liczbą gości i pokoi oraz PLN/PL — nie gwarancja natywnych pól. Expedia: miasto, `startDate/endDate`, goście/pokoje, sortowanie (bez niepewnych filtrów). Airbnb: miasto, daty, dorośli/dzieci/niemowlęta i PLN; pokoje/filtry ustawiane na stronie. Każda karta opisuje ograniczenia; nie pobrano z tych kart osobnych cen i nie obchodzono żadnych blokad bot/captcha.

Testy Playwright sprawdzają prawdziwe odpowiedzi z publicznego origin, parametry w zapytaniu i linkach, cytowane PLN, sortowanie, stosowanie filtrów do faktycznej oferty oraz niezależne komunikaty pustej listy i błędu sieci. Test iPhone wykonany w Chromium z emulacją urządzenia, nie w prawdziwym Safari.
