# R6 Avatar Lab (experimental)

Separate GPL-3.0-only application using [RoAvatar-Renderer v1.10.4](https://github.com/steinann/RoAvatar-Renderer/tree/v1.10.4), source available at that tag. The full license is included here. The decoder is Google Draco 1.5.7; the renderer's other dependencies are listed in its package manifest. No RoAvatar branding is used. This directory does not purport to change the license of unrelated site files.

The lab requests public outfit metadata by Roblox UserId, selects R6, and attempts to render a neutral static rig. It captures 40 transparent views (eight azimuths at each of 0°, 30°, 45°, 60° and 90° elevation) with a shared WebGL renderer. The replay selects the nearest view, including overhead sprites in the top-down camera when R6 outfit mode is selected. The independent Replay Studio can request views using same-origin postMessage; no replay frames are sent to this application. Public asset requests use Glutony's bounded asset transport and server-side authorization of public outfit items and verified visual dependencies. Restricted or unavailable items are not bypassed.

Base rig and compositing files are loaded from the upstream RoAvatar project's public bundled assets, pinned to revision `5a055d2eef69c8fa232498729ff107372a4a4984`. This does not change access to individual Roblox outfit assets; 401/403 responses remain errors. The diagnostics panel displays the failing requests.

Browser and upstream access are experimental: the package must be available at the pinned CDN URL, Roblox must allow public access to the required assets, and WebGL2 must be available. This is a sprite experiment, not a full 3D scene integration. No animation tracks are started. Layered clothing is intentionally disabled for R6. Existing marker and body-color modes remain independent fallbacks.

To check the experiment, open /replays/avatar-lab/, enter a public Roblox UserId and select Load R6, or use `?userId=123` for automatic startup. If no render is produced, the status reports the failing stage. The same experiment can be selected in Replay Studio once the asset transport is deployed.

To reproduce the dependency setup: install roavatar-renderer@1.10.4 and three@0.185.1 from npm, and serve the application with a supported ES module bundler. The public API adapter is in lab.mjs. Exact upstream renderer source is linked above; its own source and license apply.
