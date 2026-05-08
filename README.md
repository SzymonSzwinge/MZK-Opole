# MZK-Opolepublic/
├── index.html
├── app.js                          ← STARY (do usunięcia po migracji)
├── styles/
└── js/
    ├── app.js                      ← entry point
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
├── api.js                          ← STARY (do usunięcia po migracji)
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