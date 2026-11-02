# BL:R by N29

Source for [blr.n29.kz](https://blr.n29.kz/) (static GitHub Pages website).

## Site experience

The homepage and supporting pages share a responsive visual system in `site-theme.css`.
`site-experience.js` adds optional, dependency-free navigation enhancements.

- A homepage launchpad links directly to Main, 8v8, Pro and community custom matches.
- Creator studio filters show all tools, video editing tools, or TikTok utilities without altering any processing logic.
- Press **⌘K** on macOS or **Ctrl+K** elsewhere (or use the navigation launcher) to search pages and tools.
- The standalone video tools have visible links back to the homepage and server browser.
- The homepage highlights N29's Hunger portrait in a creator identity card and links to [n29.kz](https://n29.kz/). The artwork is served as a high-quality AVIF with WebP fallback from the separate `N29dev/portfolio` repository. Deploy the portfolio PR before this site PR so the image URLs resolve.
- This refresh **does not modify the leaderboard**, Glutony Worker, or server API contracts. Existing pages remain usable if JavaScript enhancements fail.

## Glutony server browser

Visit [blr.n29.kz/servers/](https://blr.n29.kz/servers/) for the public 8v8 and Pro server browser. You can also open [Pro directly](https://blr.n29.kz/servers/?mode=pro).

- `servers/index.html` — responsive website UI with modes, location flags, region search, sorting, current population, capacity, place version, estimated uptime, optional avatar thumbnails, PC/mobile Join links, and shareable server links
- `index.html` — homepage with a new link to the server browser
- Live data is served by [Glutony](https://github.com/N29dev/Glutony), on Cloudflare Workers: `https://glutony.scp343hey.workers.dev/api/servers?mode=8v8` or `mode=pro`.
- Its public JSON endpoint returns only non-sensitive Roblox server information, enriched by optional RoValra location/version data. The Worker allows cross-origin requests from `https://blr.n29.kz`.
- `GET /api/servers/avatars?mode=pro&id=<server UUID>` returns optional Roblox player preview URLs.
- Website Join buttons open Glutony's `/join` landing page. Roblox can ignore requested instance IDs and join a different server.
- Glutony is an unofficial BL:R tool; server counts are a sample from scanned Roblox API pages, not a guarantee of every server.

### Public server browsing

Browse actual sampled public lobbies directly using region and country filters, player counts, free slots, reported server ping, version, sorting, pinned servers, and the world globe. There are no speculative match recommendations.

- Server ping is reported by the service, not the visitor's measured latency.
- The server directory displays **resolved / sampled** region coverage and provides a manual retry for RoValra's still-unknown locations. RoValra may not know the datacenter of every new instance, so an unknown region is never guessed from ping.

- Unknown-region server cards and their details dialog now display a specific explanation from Glutony's `regionDiagnostic` code. The coverage strip summarizes unresolved reasons across the current sample. If an older Worker has not yet deployed, the page falls back to a generic explanation.- Glutony optionally uses an exact datacenter-ID-to-region mapping from RoValra's public datacenter list when server details contain a datacenter ID without a readable location. This is best effort; it is not a new guaranteed geolocation service.
- Join links use the existing Glutony join flow; Roblox can redirect to a different server.
- Pinned servers remain saved for the current browser session.
- The Hunger portrait on the homepage is credited to **Omnixeno**.
- No Cloudflare Worker, API contract, customs, or leaderboard changes.

### Troubleshooting

- If `/servers/` shows 404, check GitHub Pages deployment from `main` with `servers/index.html` in its published root.
- If the page loads but server data fails, verify that the newest **Glutony** Worker deployment succeeded and that `/api/servers?mode=8v8` returns JSON. A missing endpoint indicates an older Worker deployment.
- If data fails only in the browser, inspect the Network tab for an Origin/CORS error.
- Do not add Discord bot tokens or Roblox cookies to the static website or GitHub repository.

Source folders: `leaderboard/`, `servers/`; other tools are standalone HTML in the repository root.

Site files: `404.html` (not-found page), `robots.txt` and `sitemap.xml` (search), `manifest.webmanifest` (installable web app), `og-image.png` (1200×630 social preview shown when links are shared).

## Community Customs

Custom match board: [blr.n29.kz/servers/customs/](https://blr.n29.kz/servers/customs/).

- Anyone can browse community-submitted Roblox private-server invitation links
- Hosting a match requires Discord OAuth sign-in and a Cloudflare Turnstile anti-spam check
- The Glutony Cloudflare Worker and D1 database share listings with Discord `/blr mode:customs`
- Hosts can remove their own matches; signed-in users can report suspicious listings
- Invites automatically stop appearing after 4 hours; invites are *community-submitted and unverified*

**Required one-time backend configuration:** [Glutony Customs setup guide](https://github.com/N29dev/Glutony/blob/main/CUSTOMS_SETUP.md). Until D1, OAuth and Turnstile are configured, public submissions remain disabled.


## Public servers: Main + interactive globe

- [Public server browser](https://blr.n29.kz/servers/) now includes **Main**, **8v8**, and **Pro** tabs.
- The **Main** place uses BL:R root Place ID `18668065416`. To protect Roblox and RoValra APIs, the Worker returns at most **24 sampled joinable servers** from one Roblox server-list page. It is **not** all live root servers.
- **🌐 Region globe** groups distinct sampled city/regions under **NA, SA, Brazil, Europe, Asia**, plus Oceania and Africa/Middle East. The sidebar has compact collapsible groups and independent scrolling. Hover a pin for server occupancy and ping; click it to inspect each matching server, then use **View server** for the full server dialog or **Filter** to narrow results. Continent filters remain available. Drag/swipe to rotate, wheel to zoom. The list works even if globe assets fail to load.
- Marker positions use **approximate city centers** where the RoValra city is recognized, otherwise an approximate country center. These are **not verified datacenter coordinates**. Unknown regions are never assigned fake pins. A 36-location smoke test covers separate markers and grouping, but the live list cannot guarantee all possible datacenters because it only displays servers found in the bounded Roblox API scan.
- Country polygons are bundled in `servers/world.geojson`, with attribution in `servers/world-data-license.txt`. The lightweight D3 map engine is loaded only when opening the globe.
- To see **Main** in Discord slash command choices, the Glutony owner must **re-register `/blr`** after the Worker deploy: changing code does not automatically change a registered Discord command.

