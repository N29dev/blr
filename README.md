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
