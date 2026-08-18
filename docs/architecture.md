# CraScaper architecture

## Runtime

```
React → Node API → PostgreSQL   (search/campaigns, current rows only)
                 → RabbitMQ → Python crawler → PostgreSQL
```

No Socket.IO. Next search sees newly cataloged creators.

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
        │          from permitted discovery sources
        │          / licensed data / supplied URLs
        │
        └── No → Done
```

### What each step is here

| Step | Implementation |
| --- | --- |
| Seed CSV | `crawler/app/seeds/instagram_profiles.csv` plus optional `EXTRA_SEED_URLS` |
| Candidate queue | PostgreSQL `candidates` |
| Fetch permitted profile data | Playwright public `instagram.com/{username}/` only. No login, CAPTCHA, or stealth |
| Usable? | Accessible, followers ≥ 1000, public content |
| Store / metrics / niche | `process_snapshot` then upsert `influencers` |
| Need more? | `COUNT(influencers) < TARGET_QUALIFIED` (1000) |
| Additional candidates | Public following, then public followers of the cataloged creator. Login-walled lists are skipped |

Rejected and blocked profiles do not expand the queue.

## Search

PostgreSQL `WHERE` all filters AND, `LIMIT` from the agency (max 100), **no ORDER BY**.
