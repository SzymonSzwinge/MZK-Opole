export const APP_INFO = {
    name: "MZK Opole — Mapa na żywo",
    version: "1.0.0",
    author: "Szymon Szwinge",
    repository: "https://github.com/SzymonSzwinge/MZK-Opole",
    dataSource: {
        name: "DIP MZK Opole",
        url: "https://dip.mzkopole.pl",
    },
    disclaimer: "Aplikacja nieoficjalna. Korzysta z publicznych danych udostępnianych przez Miejski Zakład Komunikacyjny w Opolu Sp. z o.o.",
};

export const MZK_CONTACT = {
    name: "MZK Opole Sp. z o.o.",
    address: "ul. Luboszycka 19, 45-215 Opole",
    bok: {
        label: "Centrala / informacja",
        phone: "+48 77 40 23 100",
        email: "bok@mzkopole.pl",
        hours: "pn–pt: 7:00–17:00",
    },
    ticketControl: {
        label: "Kontrola biletowa",
        phone: "+48 77 402 31 63",
    },
    debt: {
        label: "Windykacja",
        phone: "+48 77 402 31 37",
    },
    lostFound: {
        label: "Rzeczy znalezione",
        info: "Zgłoszenia w BOK MZK lub w Centralnym Biurze Rzeczy Znalezionych UM Opola.",
    },
    complaints: {
        label: "Reklamacje i skargi",
        info: "Pisemnie na adres MZK lub mailowo: bok@mzkopole.pl",
    },
    website: "https://mzkopole.pl",
};

export const CITY_CONTACT = {
    name: "Urząd Miasta Opola",
    address: "Rynek-Ratusz, 45-015 Opole",
    phone: "+48 77 451 19 11",
    email: "urzad@um.opole.pl",
    website: "https://www.opole.pl",
    transport: {
        label: "Sprawy transportu publicznego",
        info: "Wnioski o nowe przystanki, zmiany rozkładów, uwagi do organizacji ruchu należy kierować bezpośrednio do MZK Opole lub Urzędu Miasta Opola (telefonicznie lub przez ePUAP).",
    },
};

export const TICKET_PRICES = {
    legalBasis: "Uchwała nr LXIV/1157/22 Rady Miasta Opola z dnia 24.11.2022 r.",
    note: "Ceny w złotych. N — bilet normalny, U — bilet ulgowy.",
    city: {
        title: "Bilety miejskie",
        items: [
            { name: "Jednorazowy jednokrotnego kasowania", desc: "linie dzienne — 45 min od skasowania, dowolna liczba przesiadek", normal: "4,20", ulga: "2,10" },
            { name: "Jednorazowy nocny", desc: "linie nocne — 45 min od skasowania", normal: "5,20", ulga: "2,60" },
            { name: "Dobowy", desc: "wszystkie linie (w tym nocne) — 24 godziny", normal: "13,00", ulga: "6,50" },
            { name: "Grupowy jednorazowy", desc: "do 15 osób, linie dzienne, 45 min", normal: "54,00", ulga: "27,00" },
            { name: "Weekendowy", desc: "od piątku 19:00 do niedzieli 23:00, wszystkie linie", normal: "22,20", ulga: "11,10" },
            { name: "10-dniowy na okaziciela", desc: "wszystkie linie, 10 kolejnych dni", normal: "61,00", ulga: "30,50" },
            { name: "30-dniowy na okaziciela", desc: "wszystkie linie, 30 kolejnych dni", normal: "190,00", ulga: "95,00" },
            { name: "30-dniowy imienny", desc: "wszystkie linie, 30 kolejnych dni", normal: "121,00", ulga: "60,50" },
            { name: "30-dniowy imienny trasowany (1 lub 2 linie)", desc: "wybrane 1 lub 2 linie dzienne, 30 dni", normal: "96,00", ulga: "48,00" },
            { name: "90-dniowy imienny", desc: "wszystkie linie, 90 kolejnych dni", normal: "350,00", ulga: "175,00" },
            { name: "150-dniowy semestralny imienny", desc: "1 lub 2 linie dzienne, 150 dni — uczniowie / studenci / doktoranci", normal: "—", ulga: "224,00" },
            { name: "Wakacyjny szkolny imienny", desc: "wszystkie linie dzienne, 1 lipca — 31 sierpnia", normal: "—", ulga: "82,00" },
        ],
    },
    suburban: {
        title: "Bilety pozamiejskie",
        items: [
            { name: "Jednorazowy jednokrotnego kasowania", desc: "linie dzienne, 60 min od skasowania", normal: "5,40", ulga: "2,70" },
            { name: "Jednorazowy wewnątrzstrefowy", desc: "tylko w granicach strefy pozamiejskiej", normal: "3,20", ulga: "1,60" },
            { name: "Dobowy", desc: "wszystkie linie pozamiejskie + nocne — 24 godziny", normal: "19,00", ulga: "9,50" },
            { name: "30-dniowy imienny trasowany (1 linia)", desc: "1 wybrana linia, 30 kolejnych dni", normal: "143,00", ulga: "71,50" },
            { name: "30-dniowy imienny", desc: "wszystkie linie, 30 kolejnych dni", normal: "160,00", ulga: "80,00" },
            { name: "30-dniowy imienny wewnątrzstrefowy", desc: "tylko strefa pozamiejska, 30 dni", normal: "89,00", ulga: "44,50" },
            { name: "90-dniowy imienny", desc: "wszystkie linie, 90 kolejnych dni", normal: "462,00", ulga: "231,00" },
            { name: "Wakacyjny szkolny imienny", desc: "wszystkie linie dzienne, 1 lipca — 31 sierpnia", normal: "—", ulga: "122,00" },
        ],
    },
    fines: {
        title: "Opłaty dodatkowe (kary)",
        items: [
            { name: "Jazda bez ważnego biletu", price: "210,00 zł" },
            { name: "Brak dokumentu poświadczającego uprawnienie do ulg / bezpłatnych przejazdów", price: "168,00 zł" },
            { name: "Naruszenie przepisów dotyczących przewozu rzeczy lub zwierzęcia", price: "84,00 zł" },
            { name: "Spowodowanie zatrzymania lub zmiany trasy autobusu bez uzasadnionej przyczyny", price: "630,00 zł" },
            { name: "Opłata manipulacyjna (zwrot / umorzenie opłaty dodatkowej)", price: "16,80 zł" },
        ],
        discount: "Zniżka 30% w przypadku uiszczenia należności w ciągu 7 dni kalendarzowych od daty wystawienia wezwania.",
    },
    eligibility: {
        title: "Kto ma prawo do ulgi (oznaczenie U)",
        items: [
            "Dzieci od lat 4 oraz uczniowie szkół podstawowych i ponadpodstawowych — nie dłużej niż do ukończenia 24. r.ż.",
            "Studenci studiów I i II stopnia oraz jednolitych studiów magisterskich",
            "Uczniowie i studenci szkół zagranicznych — nie dłużej niż do ukończenia 26. r.ż.",
            "Uczestnicy studiów doktoranckich — do ukończenia 35. r.ż.",
            "Emeryci, renciści, kombatanci",
        ],
    },
};

export const TICKET_CHANNELS = [
    {
        type: "machine",
        name: "Biletomaty stacjonarne",
        info: "Rozmieszczone na głównych przystankach w mieście (np. Centrum, Plebiscytowa, Dworzec PKP).",
        icon: "🏧",
    },
    {
        type: "vehicle",
        name: "Biletomaty w pojazdach",
        info: "Część pojazdów wyposażona w biletomaty (gotówka i/lub karta). Oznaczenia widoczne w popupie pojazdu na mapie.",
        icon: "🚌",
    },
    {
        type: "kiosk",
        name: "Kioski i punkty sprzedaży",
        info: "Bilety jednorazowe i okresowe dostępne w kioskach Ruch, Kolporter oraz punktach na terenie miasta.",
        icon: "🏪",
    },
    {
        type: "office",
        name: "Biuro Obsługi Klienta MZK",
        info: "Bilety okresowe oraz imienne — ul. Luboszycka 19, Opole. Pn–pt 7:00–17:00.",
        icon: "🏢",
    },
];

export const VALIDATION_INFO = {
    title: "Jak skasować bilet papierowy",
    steps: [
        "Wsiądź do pojazdu pierwszymi drzwiami (lub dowolnymi, jeśli nie ma takiego oznaczenia).",
        "Niezwłocznie po wejściu skasuj bilet w kasowniku znajdującym się w pojeździe.",
        "Kasowniki znajdują się przy każdych drzwiach.",
        "Bilet bez skasowania traktowany jest jak brak biletu — grozi opłatą dodatkową 210 zł.",
    ],
};

export const FAQ = [
    {
        category: "Mapa i pojazdy",
        items: [
            {
                q: "Co oznaczają kolory pojazdów na mapie?",
                a: `
                    <ul>
                        <li><b style="color:#1976d2">🔵 Niebieski</b> — autobusy linii dziennych</li>
                        <li><b style="color:#6a1b9a">🟣 Fioletowy</b> — autobusy linii nocnych (oznaczenie N)</li>
                        <li><b style="color:#388e3c">🟢 Zielony</b> — trolejbusy</li>
                        <li><b style="color:#d32f2f">🔴 Czerwona etykieta z linią</b> — pojazd opóźniony powyżej 3 min</li>
                    </ul>
                `,
            },
            {
                q: "Co oznacza zielona kropka (●) przy odjeździe?",
                a: "Oznacza, że pojazd aktualnie stoi na danym przystanku. Symbol pojawia się tylko dla odjazdów obsługiwanych przez śledzony w czasie rzeczywistym pojazd.",
            },
            {
                q: "Dlaczego niektóre pojazdy nie pokazują się na mapie?",
                a: "Pojazd pojawia się na mapie tylko gdy ma aktywny system GPS i raportuje swoją pozycję do systemu MZK. Awarie GPS, brak sieci komórkowej lub kursy techniczne (np. zjazd do zajezdni) powodują czasowy brak pojazdu na mapie.",
            },
            {
                q: "Co oznacza szara przerywana linia na mapie po wybraniu trasy?",
                a: "Szara przerywana linia to fragment trasy, który pojazd już przejechał. Pomarańczowa ciągła linia to fragment, który dopiero ma do przejechania. Dla kursów które jeszcze nie wystartowały — cała trasa rysowana jest pomarańczową przerywaną linią.",
            },
        ],
    },
    {
        category: "Przystanki",
        items: [
            {
                q: "Co znaczy 'symbol' lub 'słupek' przystanku?",
                a: "Każdy przystanek w MZK ma unikalny identyfikator — tzw. symbol słupka. Słupek to konkretne miejsce zatrzymania pojazdu (jeden przystanek może mieć kilka słupków po różnych stronach drogi lub dla różnych kierunków).",
            },
            {
                q: "Skąd się biorą czasy odjazdów?",
                a: "Wyświetlane są dwa rodzaje czasów:<br><b>📅 z rozkładu</b> — planowy czas odjazdu z rozkładu jazdy.<br><b>realtime</b> — rzeczywista predykcja oparta na pozycji GPS pojazdu i przewidywanym czasie dojazdu (z uwzględnieniem opóźnienia).",
            },
            {
                q: "Czy mogę zobaczyć rozkład jazdy z innego dnia?",
                a: 'Tak. Po otwarciu przystanku kliknij „📅 Pełny rozkład jazdy", a następnie używaj strzałek ‹ ›, aby zmienić datę. Przycisk „↺ Powrót" przywraca dzisiejszą datę.',
            },
        ],
    },
    {
        category: "Planowanie podróży",
        items: [
            {
                q: "Jak działa planowanie podróży?",
                a: "Wybierz przystanek startowy (skąd) i końcowy (dokąd). Aplikacja przeszuka aktualne odjazdy oraz rozkład jazdy i pokaże 5 najbliższych <b>bezpośrednich</b> połączeń. Aplikacja obecnie nie wyznacza tras z przesiadkami.",
            },
            {
                q: "Co oznaczają statusy w wynikach wyszukiwania?",
                a: `
                    <ul>
                        <li><b>🚌 W drodze • X przystanków przed Tobą</b> — pojazd jedzie i zbliża się do Twojego przystanku</li>
                        <li><b>⏳ Pojazd jeszcze nie wyruszył</b> — kurs zaplanowany, ale autobus jeszcze nie zaczął trasy</li>
                        <li><b>📅 Z rozkładu jazdy</b> — informacja oparta wyłącznie na rozkładzie (brak danych GPS)</li>
                        <li><b>⚠️ Pojazd minął już Twój przystanek</b> — uwaga, to połączenie nie jest już dostępne</li>
                    </ul>
                `,
            },
            {
                q: "Jak wybrać przystanek z mapy?",
                a: "W panelu planowania kliknij ikonę 🎯 obok pola 'Z:' lub 'Do:'. Następnie kliknij dowolny przystanek na mapie. Mapa pokaże tylko te przystanki, do których możesz dojechać bezpośrednio z punktu startowego (lub z których dojedziesz do celu).",
            },
            {
                q: "Czy mogę wyszukać podróż z mojej obecnej lokalizacji?",
                a: 'Tak. W panelu planowania kliknij „📍 Z mojej lokalizacji". Aplikacja pobierze Twoje współrzędne (po Twojej zgodzie w przeglądarce) i automatycznie ustawi najbliższy przystanek jako punkt startowy.',
            },
        ],
    },
    {
        category: "Statystyki",
        items: [
            {
                q: "Jak liczona jest punktualność pojazdów?",
                a: 'Pojazd uznawany jest za <b>punktualny</b> jeśli odchylenie od rozkładu wynosi maksymalnie ±60 sekund. Powyżej +60 sekund — <b>opóźniony</b>. Poniżej -60 sekund (czyli przed czasem) — <b>przed czasem</b>.',
            },
            {
                q: "Skąd się bierze 'Najbardziej opóźniona linia'?",
                a: "Pokazujemy linię, która ma najwyższe średnie opóźnienie wśród swoich aktywnych pojazdów. Aby uniknąć efektu pojedynczego losowego opóźnienia, liczymy tylko linie z minimum 2 aktywnymi pojazdami.",
            },
            {
                q: "Dlaczego średnie opóźnienie czasem jest ujemne?",
                a: "Jeśli średnio pojazdy wyprzedzają rozkład, średnia może być ujemna — choć w praktyce zdarza się to rzadko i zwykle dotyczy sytuacji nocnych lub kursów weekendowych z niskim ruchem.",
            },
        ],
    },
    {
        category: "Dane i prywatność",
        items: [
            {
                q: "Skąd pochodzą dane?",
                a: 'Wszystkie dane pochodzą z oficjalnego systemu DIP (Dynamiczna Informacja Pasażerska) Miejskiego Zakładu Komunikacyjnego w Opolu Sp. z o.o. (<a href="https://dip.mzkopole.pl" target="_blank" rel="noopener">dip.mzkopole.pl</a>). Aplikacja działa jako nakładka na publiczne API.',
            },
            {
                q: "Czy aplikacja zbiera moje dane?",
                a: "Nie. Aplikacja nie zbiera, nie zapisuje ani nie przesyła żadnych danych osobowych. Geolokalizacja używana jest wyłącznie lokalnie (w przeglądarce) do znajdowania najbliższego przystanku — nie jest wysyłana na żaden serwer.",
            },
            {
                q: "Czy aplikacja jest oficjalna?",
                a: "Nie. To projekt nieoficjalny, korzystający z publicznie udostępnianych danych MZK Opole. Wszelkie pytania dotyczące samej komunikacji miejskiej należy kierować bezpośrednio do MZK Opole.",
            },
            {
                q: "Czy aplikacja jest open source?",
                a: 'Tak. Kod źródłowy dostępny jest na <a href="https://github.com/SzymonSzwinge/MZK-Opole" target="_blank" rel="noopener">GitHub</a>.',
            },
        ],
    },
];

export const ICONS_LEGEND = [
    { icon: "❄️", label: "Klimatyzacja w pojeździe" },
    { icon: "♿", label: "Niska podłoga (dostęp dla osób z niepełnosprawnościami)" },
    { icon: "⚡", label: "Pojazd elektryczny" },
    { icon: "🔋", label: "Pojazd hybrydowy" },
    { icon: "🌿", label: "Pojazd ekologiczny" },
    { icon: "🎫", label: "Biletomat w pojeździe (gotówka / karta)" },
    { icon: "🟢", label: "Marker A — start podróży" },
    { icon: "🔴", label: "Marker B — cel podróży" },
];