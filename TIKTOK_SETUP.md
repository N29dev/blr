# TikTok Direct Post setup

The site stays on GitHub Pages. A Cloudflare Worker handles TikTok OAuth, refresh tokens and Content Posting API calls under:

`https://blr.n29.kz/api/tiktok/*`

## 1. Create the TikTok developer app

1. Open TikTok for Developers and create/select an app.
2. Add **Login Kit** for Web.
3. Add **Content Posting API** and enable **Direct Post**.
4. Request/enable the `video.publish` scope.
5. Register this exact redirect URI:
   `https://blr.n29.kz/api/tiktok/oauth/callback`
6. Copy the app's **Client key** and **Client secret**.

For an unaudited Direct Post client, TikTok currently restricts API-created posts to `SELF_ONLY`, and the posting account must be private at the time of the API post. You can later make the account public and change the video's privacy manually.

## 2. Put blr.n29.kz behind Cloudflare

The repository keeps its existing `CNAME` and GitHub Pages origin. The DNS record for `blr.n29.kz` needs to be proxied through Cloudflare so the Worker route can intercept only `/api/tiktok/*`.

## 3. Deploy the Worker

Install Wrangler and authenticate:

```bash
npm install -g wrangler
wrangler login
```

Copy the example config:

```bash
cp wrangler.toml.example wrangler.toml
```

Set secrets:

```bash
wrangler secret put TIKTOK_CLIENT_KEY
wrangler secret put TIKTOK_CLIENT_SECRET
wrangler secret put SESSION_SECRET
```

For `SESSION_SECRET`, use a long random value, for example:

```bash
openssl rand -hex 32
```

Deploy:

```bash
wrangler deploy
```

## 4. Test

1. Open `https://blr.n29.kz/#tiktok-publisher`.
2. Click **Connect TikTok**.
3. Authorize the requested scopes.
4. Choose an MP4, enter a caption and load creator settings.
5. For an unaudited app, choose `Only me` / `SELF_ONLY`.
6. Click **Post to TikTok**.

The browser uploads video chunks to the same-origin Worker, and the Worker streams them to TikTok's temporary upload URL. Client secrets and refresh tokens are never committed to GitHub or exposed to normal page JavaScript.
