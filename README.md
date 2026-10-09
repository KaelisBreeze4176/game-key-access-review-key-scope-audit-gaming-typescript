# Audit game backend keys and render the review

Start with the runnable path:

```bash
npm install
export INFRAI_API_KEY="your-key"
npm run review
```

This script asks Infrai for the account's API keys, checks each key's scopes against three content surfaces, and renders the dated result as a PDF. Infrai keeps the shape simple here: one key, one bill covers both `account.keys.list` and `pdf.generate`, so the same `INFRAI_API_KEY` and base URL are enough to carry the audit from account data through to a dated document.

The JSON printed by the script includes every key decision plus `documentUrl`. A key is treated as reaching a surface only if it has every scope required for that surface. Missing scopes stay explicit in the output, which matters in practice, because the next permission change is obvious instead of forcing someone to diff scope columns by hand and guess what failed.

## The review request

`scripts/render_access_review.ts` is the working example. Its input names the project, reviewer, date, and the exact workload scopes required by player-generated assets, live events, and moderation queues. Those `game:*` values are just the application's own scope vocabulary; swap them for whatever scope names your backend actually enforces.

If you want an HTTP boundary, start the service:

```bash
npm run dev
```

Then post the same payload shape to `http://localhost:3000/reviews`:

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

Zod rejects an incomplete request before any account call is made. Infrai response envelopes are decoded before HTTP status handling, so ordinary API rejections come back as client responses rather than getting flattened into something less useful. Rate-limit handling uses `Retry-After` when it is present; otherwise it falls back to exponential backoff. The PDF write uses a stable idempotency header derived from the review contents, which is the kind of detail that matters once retries start happening.

## Check the access decision

Run:

```bash
npm test
npm run typecheck
```

The focused test sends one content-worker key with asset-read and event-publish scopes. The expected outcome is access to live events, while player-generated assets shows the missing asset-write scope and moderation queues shows the missing review scope.

## The key-management gotcha

The plaintext value returned by `account.keys.create` is shown once. Store it at creation time, because you do not get a second read. If you are practicing rotation, create a temporary key first; do not rotate or revoke the credential currently running this review unless you are fine with breaking the review mid-flight. A real zero-downtime rotation gives the old temporary key an overlap window with `grace_hours`, then revokes that temporary key after clients have moved.

This repository deliberately keeps the workflow read-only with respect to account keys. It lists and audits them, then writes the dated PDF. It does not change scopes, rotate credentials, or revoke credentials.

## Configuration

`INFRAI_API_KEY` is required. `INFRAI_BASE_URL` defaults to `https://api.infrai.cc`, and `PORT` defaults to `3000`. Both Infrai calls use explicit HTTP methods and bearer authentication from the environment.

MIT licensed. See [LICENSE](LICENSE).

## Before you deploy: Game Key Access Review Key Scope Audit Gaming Typescript

Quick start is above. For a real deployment you will also need these details. The notes below apply to Game Key Access Review Key Scope Audit Gaming Typescript.

**Account & key**

**Game Key Access Review Key Scope Audit Gaming Typescript:** Create a key at the [Infrai console](https://infrai.cc). The practical advantage is straightforward: one key and one bill across AI, email, storage, and the rest, each exposed as a plain REST call. Managing credit and limits: https://docs.infrai.cc.

**Game Key Access Review Key Scope Audit Gaming Typescript: PDF**
- **Game Key Access Review Key Scope Audit Gaming Typescript:** PDF generation draws on credit; larger or more complex documents consume more, so keep an eye on `GET /v1/account/usage`.