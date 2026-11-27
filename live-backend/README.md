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

## Standalone local-file publisher (no Roblox server API required)

Requires Node 22+, an already deployed personal-stream backend, and the existing LIVE_DEMO_TOKEN in the local shell. The publisher never modifies the selected source file, reads game memory, injects scripts, or discovers recorder files automatically. The token stays in the local process and is not included in watch links. The shared administrator token is intended for the site owner only; do not distribute it.

Offline parser/validation test:
```sh
node local-publisher.mjs --self-test
```

Independent fictional match test (choose a new filename):
```sh
node local-demo-source.mjs /tmp/blr-demo.ndjson 60
node local-publisher.mjs /tmp/blr-demo.ndjson --consent --once
```

Open the printed link. Ctrl+C stops the publisher. For a continuously appended file from a developer-approved, opt-in telemetry source, omit --once. Start with a fresh file for each session; the publisher reads from the beginning. The format is one JSON frame per line, with strictly increasing seconds in t, anonymous integer participant IDs, teams and coordinate triples, and optional allowed ball, scoreboard, style and awakening fields (see cleanFrame in authorized-stream.mjs). No existing BLR recorder adapter is included. The --consent flag is an attestation, not an automated verification of permission.

Source delay defaults to three seconds, configurable from one to ten with --delay=N. Actual sample rate is determined by the source; no missing frames are fabricated. Network requests are paced approximately five per second, with at most 24 samples per catch-up batch. The publisher stops on inactivity or excessive backlog. A delay configured in this local client is not a server-enforced security control. Personal streams remain JSON-based.

Pure parser and validation logic was checked; live file following and remote networking require a Node/runtime test.

## Automatic folder watcher

Run in a dedicated private folder:

```sh
mkdir -p ~/BLR-Live
chmod 700 ~/BLR-Live
node watch-live.mjs ~/BLR-Live --consent
```

Only explicitly opted-in sessions are picked up. An approved source/operator creates a fresh session's `<session>.ndjson` and then a new empty `<session>.start` marker after the watcher starts. The marker is renamed to `.claimed` so completed sessions cannot accidentally restart. The watcher does not scan Roblox installations or existing replay folders. Use a unique session name each time. Creating `<session>.stop` stops the current publisher immediately (unsent delayed samples may be discarded). Existing local files remain unchanged. The watcher accepts one active session at a time, ignores start markers older than 30 seconds, and needs the existing administrator token in its environment.

Test using only fictional data, in a second terminal:

```sh
NAME="demo-$(date +%s)"
node local-demo-source.mjs "$HOME/BLR-Live/$NAME.ndjson" 60 --live &
SOURCE_PID=$!
while [ ! -f "$HOME/BLR-Live/$NAME.ndjson" ]; do sleep 0.1; done
touch "$HOME/BLR-Live/$NAME.start"
wait "$SOURCE_PID"
sleep 5
touch "$HOME/BLR-Live/$NAME.stop"
```

The first terminal prints the unique website watch link. The standalone publisher automatically stops on inactivity if a stop marker is omitted. The watcher does not capture matches; a separate authorized, opt-in source must continuously write the agreed anonymous NDJSON schema. Marker filename validation was checked; real process spawning, live file following and remote network behavior are not yet integration-tested.

## Existing v0.15 Lite recording folders

For a developer-authorized, opt-in live session, the chunk bridge can read the existing v0.15 Lite output without changing its Lua script:

```sh
node chunk-publisher.mjs --self-test
node chunk-publisher.mjs "/absolute/path/to/ReplayRecordings" --consent
```

Start the bridge before the approved recorder starts a new session. The bridge ignores existing sessions, waits for one new v0.15 Lite directory and reads only committed chunk files (as indicated by metadata.json). Once samples arrive, it starts the existing local publisher and prints its unlisted viewer link. When metadata.complete becomes true, the publisher drains the buffered samples and ends the stream. Ctrl+C stops it early. To explicitly select an already-running authorized session directory, add --session to the command and pass that directory instead of the parent; this reads from the beginning, so avoid joining a long-running recording if near-live timing matters.

The existing recorder is documented as post-match-only; permission for live sharing must be obtained separately. The bridge has no game APIs, and does not edit or overwrite any recording. It converts only the personal-stream schema supported by the Worker; usernames are optional and off by default; private ability slots, raw events and camera are not transmitted. It preserves actual timestamps (the original recorder uses 30 Hz and flushes about every 5 seconds), converts score text to numbers, and carries sparse style/awakening state forward. Expect at least approximately 8 seconds of source/publisher delay plus network/render buffering under normal conditions. The standalone personal-stream backend must already be deployed. No new Worker configuration is needed.

Schema conversion self-test passed; real file-following, child-process and end-to-end testing remain to be verified. The --consent flag is an explicit attestation and not permission verification.

## Optional usernames

For an authorized live session in which participants have agreed to username sharing:

```sh
node chunk-publisher.mjs "/absolute/path/to/ReplayRecordings" --consent --usernames
```

Alternatively, use `--labels=/path/to/approved-labels.json` for a JSON object mapping specific consenting usernames to their chosen display labels. Without either option the stream uses anonymous IDs. These options are mutually exclusive. The publisher reads the existing roster file and validates names; it does not alter the Lua recorder. Replay Studio's personal stream view has a separate Show usernames checkbox, which switches rendered labels and relevant controls to anonymous player IDs. This is a presentation preference, not an access-control or anonymization mechanism: if usernames are published, spectators receive them in stream data even when the checkbox is disabled. Existing replay imports are unchanged.

Deploy the current Worker before testing if the running version predates optional label support. The chunk conversion self-test covers label preservation and anonymous defaults; browser and deployed end-to-end tests are still required.
