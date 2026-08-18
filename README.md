# CraScaper

Influencer discovery and campaign workspace for agencies. Search a local catalog of **qualified** Instagram creators, select profiles, and run campaigns.

## Demo login

- Email: `agency@fiberai.com`
- Password: `password123`

## Local

```bash
cp .env.example .env
docker compose up --build -d --scale crawler=2
```

- App (same-origin `/api`): http://localhost:8081
- Frontend only: http://localhost:8080
- API: http://localhost:4001/api/health

Keep `VITE_API_BASE_URL` empty locally so the browser calls `/api` on the same origin.

A crawler that hits HTTP 429 **stops the whole fleet** (containers stay up, but they do not fetch). Logs will say `Rate limited`. Resume after a cooldown:

```sql
UPDATE crawler_control SET paused = false, reason = NULL, paused_at = NULL, updated_at = NOW() WHERE id = 1;
```

Crawlers notice within about a minute. 404s and login walls still skip that one profile only.

## Production

Domains:

- Frontend: `https://insta-demo.fybud.com`
- API: `https://api.insta-demo.fybud.com`

Compose publishes apps on loopback so **host nginx** (already installed) is the public entry:

| Host port | Container |
| --- | --- |
| `127.0.0.1:8080` | frontend |
| `127.0.0.1:4001` | backend |

1. Copy `.env.example` to `.env` and set a strong `JWT_SECRET`.
2. Optional: `VITE_API_BASE_URL=https://api.insta-demo.fybud.com` if the SPA should call the API host directly. Leave it empty to use same-origin `/api` on the frontend domain (host nginx proxies that path). Rebuild the frontend after changing this value.
3. Start the stack:

```bash
docker compose up --build -d --scale crawler=2
```

4. Install the host nginx site (Debian/Ubuntu):

```bash
sudo cp infrastructure/nginx/prod.conf /etc/nginx/sites-available/crascraper
sudo ln -sf /etc/nginx/sites-available/crascraper /etc/nginx/sites-enabled/crascraper
sudo nginx -t && sudo systemctl reload nginx
```

On RHEL/CentOS/Amazon Linux, copy to `/etc/nginx/conf.d/crascraper.conf` instead, then `nginx -t` and reload.

5. Point DNS A records for `insta-demo.fybud.com` and `api.insta-demo.fybud.com` at the server.
6. TLS for both hostnames:

```bash
sudo certbot --nginx -d insta-demo.fybud.com -d api.insta-demo.fybud.com
```

Host nginx config lives in `infrastructure/nginx/prod.conf`. The frontend vhost proxies `/` to `:8080` and `/api/` to `:4001`. The API vhost proxies everything to `:4001`.

## Collection pipeline

```
Seed CSV
   ↓
Candidate Queue
   ↓
Fetch permitted profile data
   ↓
Is profile usable?
   ├── No → discard / mark rejected
   └── Yes
        ↓
   Store / update creator
        ↓
   Extract permitted public content
        ↓
   Calculate metrics
        ↓
   Classify niche
        ↓
   Creator Catalog
        ↓
   Need more creators?
        │
        ├── Yes → discover additional candidates
        │          from permitted public following/followers
        │          and supplied URLs
        │
        └── No → Done
```

Usable means: public profile accessible, **≥ 1,000 followers**, public content. Metrics stay NULL when public post numbers are missing. Agency search reads Postgres only.
