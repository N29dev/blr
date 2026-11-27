# Replay Studio Live — synthetic backend prototype

This isolated Worker generates its own fictional match; it does not accept Roblox telemetry, arbitrary frames, usernames, or other game data. The original JSON prototype has been deployed and successfully watched by the owner. The binary upgrade is committed but still needs redeployment and network validation. The local replay viewer is unchanged.

## Protocol

- 60 samples/s, six samples per batch, target 10 batches/s.
- One synthetic demonstration room; up to 100 connected spectators.
- POST /demo/start, /demo/tick, /demo/stop require Authorization: Bearer <LIVE_DEMO_TOKEN> (secret, minimum 32 characters).
- GET /demo/status returns session metadata.
- GET /demo/watch upgrades to a read-only WebSocket. Messages: hello, start, batch, viewers, end. A JSON batch carries session id, zero-based sequence number, and frames with replay-relative timestamps.
- GET /demo/watch?format=binary-v1 negotiates binary batches with JSON control messages. Each independent batch is 365 bytes: eight-byte header, absolute int16 coordinates for the first sample and int8 deltas for the following five. Coordinates are quantized to 1/64 stud. The codec assumes the fixed synthetic 16-player roster; it must not be used for real match data without a separately reviewed protocol.
- At 10 batches/s the binary payload is 3,650 bytes/s, excluding network overhead. The original JSON averages approximately 11,953 bytes per batch over the first 100 batches. Old clients still receive JSON; new clients also accept JSON fallback.
- Reconnecting spectators receive up to the last five seconds of synthetic history. Longer rewind is retained by the client once it is connected; persistent full-match history is not implemented.
- Each demo is limited to ten minutes. No video upload or replay storage.
- The test publisher sends only authenticated control commands; the server creates all frame contents. Sequential HTTP pacing can run slower than 10 batches/s under network latency; native frame timestamps stay at 60 Hz.

## Deployment prerequisites

Create a separate Cloudflare Worker project for worker.mjs using the Cloudflare CLI. Export the LiveDemoRoom class with a SQLite-backed Durable Object binding named LIVE_DEMO and a first migration for LiveDemoRoom. Configure LIVE_DEMO_TOKEN as a Worker secret (never put the token in browser code or Git). Keep the endpoint separate from the main site until the Worker and WebSocket tests pass.

See https://developers.cloudflare.com/durable-objects/best-practices/websockets/ and https://developers.cloudflare.com/cf/projects/cloudflare-config/ for current deployment configuration.

With the Worker running and the same secret in your local environment:

```sh
export LIVE_DEMO_URL=https://YOUR-WORKER.workers.dev
# Set LIVE_DEMO_TOKEN securely in the local environment.
node live-backend/demo-publisher.mjs 20
```

Open a WebSocket client at wss://YOUR-WORKER.workers.dev/demo/watch to inspect the synthetic batches. Do not publish a real stream until consent, authorized data access, spectator delay, authentication, rate limits, and browser integration have been reviewed.

## Current validation

Generator syntax and batch timestamp continuity were checked. All 6,000 synthetic batches were encoded and decoded, with maximum absolute coordinate error below 0.008 stud. Malformed packet length was rejected. Binary Cloudflare deployment, cross-device bandwidth, runtime load, and reconnect behavior still need integration testing.

## Unlisted authorized personal streams (new prototype)

The separate /stream/<32-hex-room>/ endpoints accept authenticated, anonymous match samples from a developer-authorized source. The room link is a bearer-style viewing capability: anyone with it can watch, so share it only with intended consenting spectators. No player account IDs, names, chat, camera or private ability cooldowns are accepted. The ten-minute limit and 15-second inactivity timeout apply; the backend deletes its short reconnect history at stop. Viewers retain already received frames locally. Personal streams currently use validated JSON, not the fixed-roster synthetic binary codec.

After deploying the updated Worker with the existing secret, run from live-backend:

```sh
node personal-demo.mjs 120
```

This prints an unlisted viewing link and sends fictional telemetry through the actual personal-stream route. Open the link yourself or on another device.

For a developer-owned/authorized Roblox experience, install LivePublisher.lua as a server-only ModuleScript and configure BLR_LIVE_TOKEN as a server secret in the experience. Call Live.Start(sample, consentCheck) with the developer's approved public telemetry adapter and participant consent check; this returns the unlisted viewer link. Call Live.Stop() to end. The module targets actual Heartbeat samples at up to 60 Hz and batches HTTP requests at 5/s. It is not an executor script and cannot be used as a drop-in integration for a third-party experience without authorization and an adapter. The streamer may open their own viewer link just like any other spectator.

Personal-stream frame validation and website JavaScript syntax were checked. Cloudflare runtime, real experience integration, Lua execution and bandwidth have not yet been verified.
