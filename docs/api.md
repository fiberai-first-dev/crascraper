# API

All private endpoints require `Authorization: Bearer <jwt>`.

## Auth

- `POST /api/auth/login` `{ email, password }` → `{ token, user }`
- `GET /api/me` → `{ user }`
- `GET /api/health`

## Dashboard

- `GET /api/dashboard`

## Influencers

- `POST /api/influencers/search`
- `GET /api/influencers/:id`
- `GET /api/influencers/:id/metrics`
- `GET /api/influencers/:id/posts`

Search body:

```json
{
  "platform": "instagram",
  "location": "India",
  "niche": "Fashion",
  "minFollowers": 10000,
  "maxFollowers": 20000,
  "minEngagementRate": 3,
  "limit": 100
}
```

Search is `WHERE` every provided filter (AND) plus `LIMIT` (max 100). There is no `ORDER BY`. `niche` matches if any of the creator's niches match.

## Campaigns

- `GET /api/campaigns`
- `POST /api/campaigns` `{ name, description, influencerIds }`
- `GET /api/campaigns/:id`
- `PATCH /api/campaigns/:id`
- `GET /api/campaigns/:id/influencers`
- `GET /api/campaigns/:id/influencers/:influencerId`
- `PATCH /api/campaigns/:id/influencers/:influencerId`
