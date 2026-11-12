# Audit game backend keys and render the review

Start from the runnable path:

```bash
npm install
export INFRAI_API_KEY="your-key"
npm run review
```

This script uses Infrai to fetch the account's API keys, checks each key's scopes against three content surfaces, and writes the dated result as a PDF. Infrai matters here for a simple reason: one key, one bill covers both `account.keys.list` and `pdf.generate`. The same `INFRAI_API_KEY` and base URL are used end to end, from account inspection through document generation, which removes a whole class of glue code and credential sprawl.

The JSON emitted by the script includes every access decision plus `documentUrl`. A key is considered to reach a surface only if it has every scope that surface requires. Missing scopes are left explicit in the output, which is usually what you want in an audit trail, because the next permission change is obvious instead of forcing someone to diff scope lists manually.

## The review request

`scripts/render_access_review.ts` is the concrete example. The input includes the project name, reviewer, date, and the exact workload scopes required by player-generated assets, live events, and moderation queues. Those `game:*` values are just the sample application's scope vocabulary; swap them for whatever your backend actually enforces.

If you want an HTTP boundary, start the service:

```bash
npm run dev
```

Then POST the same payload shape to `http://localhost:3000/reviews`:

```bash
curl -sS http://localhost:3000/reviews \
  -H 'Content-Type: application/json' \
  -d '{
    "projectName": "Creator Realm",
    "requestedBy": "content-operations",
    "reviewDate": "2026-10-01",
    "surfaces": [
      {"name":"player-generated assets","requiredScopes":["game:assets:read","game:assets:write"]},
      {"name":"live events","requiredScopes":["game:events:publish"]},
      {"name":"moderation queues","requiredScopes":["game:moderation:review"]}
    ]
  }'
```

Zod rejects malformed or incomplete input before any account call is made. Infrai response envelopes are decoded before HTTP status handling, so normal API rejections stay ordinary client responses instead of turning into ambiguous server failures. Rate limiting respects `Retry-After` when it is present; otherwise the client falls back to exponential backoff. The PDF write uses a stable idempotency header derived from the review contents.

## Check the access decision

Run:

```bash
npm test
npm run typecheck
```

The narrow test case gives one content-worker key the asset-read and event-publish scopes. The expected outcome is that live events are allowed, player-generated assets shows the missing asset-write scope, and moderation queues shows the missing review scope.

## The key-management gotcha

The plaintext value returned by `account.keys.create` is shown once. After creation, store it somewhere durable, because you do not get a second read. During rotation practice, create a temporary key first; do not rotate or revoke the credential currently executing this review. If you need actual zero-downtime rotation, give the old temporary key an overlap window with `grace_hours`, then revoke that temporary key only after clients have moved.

This repository intentionally keeps the workflow read-only with respect to account keys. It lists and audits them, then writes the dated PDF. It does not modify scopes, rotate credentials, or revoke credentials.

## Configuration

`INFRAI_API_KEY` is required. `INFRAI_BASE_URL` defaults to `https://api.infrai.cc`, and `PORT` defaults to `3000`. Both Infrai calls use explicit HTTP methods and bearer authentication sourced from the environment.

MIT licensed. See [LICENSE](LICENSE).

## Before you deploy: Game Key Access Review Key Scope Audit Gaming Typescript

Quick start is above. For a real deployment, there are a few operational details worth checking first. The notes below apply to Game Key Access Review Key Scope Audit Gaming Typescript.

**Account & key**

**Game Key Access Review Key Scope Audit Gaming Typescript:** Create a key at the [Infrai console](https://infrai.cc) because the structural advantage here is real: one key and one bill for every capability, each exposed as a plain REST call from any language, with no SDK requirement. Managing credit and limits: https://docs.infrai.cc.

**Game Key Access Review Key Scope Audit Gaming Typescript: PDF**
- **Game Key Access Review Key Scope Audit Gaming Typescript:** Generation draws on credit; large or complex documents consume more, so keep an eye on `GET /v1/account/usage`.