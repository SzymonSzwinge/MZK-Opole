# MZK-Opolepublic/
├── index.html
├── styles/
└── js/
    ├── app.js
    ├── config.js
    ├── state.js
    ├── utils.js
    ├── map/
    │   ├── mapInit.js
    │   ├── icons.js
    │   └── cluster.js
    ├── api/
    │   └── client.js
    ├── vehicles/
    │   ├── loader.js
    │   ├── popup.js
    │   ├── route.js
    │   └── filters.js
    ├── stops/
    │   ├── loader.js
    │   ├── popup.js
    │   ├── schedule.js
    │   └── highlight.js
    ├── trip/
    │   ├── planner.js
    │   ├── markers.js
    │   ├── picking.js
    │   ├── reachable.js
    │   └── search.js
    └── ui/
        ├── panels.js
        ├── lines.js
        ├── notices.js
        ├── theme.js
        └── geolocation.js

server/
├── api/
│   ├── index.js
│   ├── client.js
│   ├── cache.js
│   ├── lines.js
│   ├── stops.js
│   ├── vehicles.js
│   ├── courses.js
│   ├── departures.js
│   ├── planner.js
│   └── reachability.js
├── routes/
│   ├── index.js
│   ├── vehicles.routes.js
│   ├── stops.routes.js
│   ├── lines.routes.js
│   ├── courses.routes.js
│   └── plan.routes.js
└── middleware/
    └── errorHandler.js

server.js
package.json
package-lock.json
README.md


komunikaty z mzk:

https://dip.mzkopole.pl/getAllMessages.json?preferredLanguage=pl

https://dip.mzkopole.pl/getMessageCategories.json?preferredLanguage=pl

Priorytet	Co zrobić	Wysiłek
🔴 Wysoki	Rate limiting + walidacja inputów	1h
🔴 Wysoki	Usunąć inline onclick (XSS)	3h
🟡 Średni	Responsywność mobilna	4-6h
🟡 Średni	Komunikaty MZK (masz endpointy!)	3h
🟡 Średni	Debouncing inputów	30min
🟢 Niski	PWA + Service Worker	2h
🟢 Niski	Ulubione przystanki	3h
🟢 Niski	Przesiadki w planowaniu	8-12h
🟢 Niski	Podział state.js	2h