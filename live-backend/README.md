# Replay Studio Live — synthetic backend prototype

This isolated Worker generates its own fictional match; it does not accept Roblox telemetry, arbitrary frames, usernames, or other game data. It is not yet deployed or wired into the website. Keep the local replay viewer unchanged until the network integration is tested.

## Protocol

- 60 samples/s, six samples per batch, target 10 batches/s.
- One synthetic demonstration room; up to 100 connected spectators.
- POST /demo/start, /demo/tick, /demo/stop require Authorization: Bearer <LIVE_DEMO_TOKEN> (secret, minimum 32 characters).
- GET /demo/status returns session metadata.
- GET /demo/watch upgrades to a read-only WebSocket. Messages: hello, start, batch, viewers, end. A batch carries session id, zero-based sequence number, and frames with replay-relative timestamps.
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

Generator syntax and batch timestamp continuity were checked. Cloudflare runtime, deployment, cross-device playback, load, and reconnect behavior still need integration testing.
