# CraScaper

Influencer discovery and campaign workspace for agencies. Search a local catalog of **qualified** Instagram creators, select profiles, and run campaigns.

## Demo login

- Email: `agency@fiberai.com`
- Password: `password123`

## Run

```bash
docker compose up --build
```

- App: http://localhost:8081
- Vite: http://localhost:5173
- API: http://localhost:4001/api/health

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
