# Seed profiles

Path: `crawler/app/seeds/instagram_profiles.csv`

Columns:

- `username` — Instagram handle without `@`
- `url` — `https://www.instagram.com/{username}/`
- `niches` — pipe-separated categories (a creator can have several)

These rows enter the **candidate queue**. A candidate is cataloged only if the public profile is usable (accessible, ≥1000 followers, public content). If the catalog still needs more creators, the crawler then adds that account’s **permitted public following/follower** handles (and any `EXTRA_SEED_URLS`) back into the queue. Rejected profiles do not expand discovery. Login-walled lists are skipped.

`ankurwarikoo` and `warikoo` are kept as separate candidates. Multi-niche examples in the file: `kushakapila` (Fashion|Comedy), `mumbikernikhil` (Travel|Automotive|Lifestyle), `taneja.gaurav` (Fitness|Lifestyle).

## Add more usernames

Append a line:

```csv
newhandle,https://www.instagram.com/newhandle/,Fashion|Lifestyle
```

Optional extra URLs at runtime: set `EXTRA_SEED_URLS` (comma-separated URLs or handles) on the crawler.

Restart the API (empty catalog) or enqueue a `discover_seeds` job to pick up new rows.
