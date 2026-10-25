# BL:R by N29

Source for [blr.n29.kz](https://blr.n29.kz/) (static GitHub Pages website).

## Glutony server browser

Visit [blr.n29.kz/servers/](https://blr.n29.kz/servers/) for the public 8v8 and Pro server browser. You can also open [Pro directly](https://blr.n29.kz/servers/?mode=pro).

- `servers/index.html` — responsive website UI with modes, location flags, region search, sorting, current population, capacity, place version, estimated uptime, optional avatar thumbnails, PC/mobile Join links, and shareable server links
- `index.html` — homepage with a new link to the server browser
- Live data is served by [Glutony](https://github.com/N29dev/Glutony), on Cloudflare Workers: `https://glutony.scp343hey.workers.dev/api/servers?mode=8v8` or `mode=pro`.
- Its public JSON endpoint returns only non-sensitive Roblox server information, enriched by optional RoValra location/version data. The Worker allows cross-origin requests from `https://blr.n29.kz`.
- `GET /api/servers/avatars?mode=pro&id=<server UUID>` returns optional Roblox player preview URLs.
- Website Join buttons open Glutony's `/join` landing page. Roblox can ignore requested instance IDs and join a different server.
- Glutony is an unofficial BL:R tool; server counts are a sample from scanned Roblox API pages, not a guarantee of every server.

### Troubleshooting

- If `/servers/` shows 404, check GitHub Pages deployment from `main` with `servers/index.html` in its published root.
- If the page loads but server data fails, verify that the newest **Glutony** Worker deployment succeeded and that `/api/servers?mode=8v8` returns JSON. A missing endpoint indicates an older Worker deployment.
- If data fails only in the browser, inspect the Network tab for an Origin/CORS error.
- Do not add Discord bot tokens or Roblox cookies to the static website or GitHub repository.

Source folders: `leaderboard/`, `servers/`; other tools are standalone HTML in the repository root.

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
- **🌐 Region globe** launches an interactive 3D globe with drag/swipe rotation, wheel zoom, and clickable country markers. Selecting a country filters the active mode's server cards. The server list remains available if the globe assets fail to load.
- The globe places markers at approximate **country centers** from RoValra region data, **not verified exact datacenter coordinates**. Unknown regions are never assigned fake pins.
- Country polygons are bundled in `servers/world.geojson`, with attribution in `servers/world-data-license.txt`. The lightweight D3 map engine is loaded only when opening the globe.
- To see **Main** in Discord slash command choices, the Glutony owner must **re-register `/blr`** after the Worker deploy: changing code does not automatically change a registered Discord command.

