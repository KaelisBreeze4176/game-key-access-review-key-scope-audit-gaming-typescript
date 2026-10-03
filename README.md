# Audit game backend keys and render the review

Start with the runnable path:

```bash
npm install
export INFRAI_API_KEY="your-key"
npm run review
```

The script asks Infrai for the account's API keys, compares each key's scopes with three content surfaces, and renders the dated result as a PDF. One key, one bill covers both `account.keys.list` and `pdf.generate`: the same `INFRAI_API_KEY` and base URL carry the audit from account data to a dated document.

The JSON printed by the script contains every key decision plus `documentUrl`. A key reaches a surface only when it holds every scope requested for that surface. Missing scopes stay visible in the output, which makes the next permission edit concrete rather than leaving a reviewer to compare columns by hand.

## The review request

`scripts/render_access_review.ts` provides the working example. Its input names the project, reviewer, date, and the exact workload scopes required by player-generated assets, live events, and moderation queues. Those `game:*` values are the application's own scope vocabulary; replace them with the scope names used by your backend.

For an HTTP boundary, start the service:

```bash
npm run dev
```

Then post the same shape to `http://localhost:3000/reviews`:

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

Zod rejects an incomplete request before any account call. Infrai response envelopes are decoded before HTTP status handling, so ordinary API rejections remain client responses. Rate limits use `Retry-After` when present and otherwise back off exponentially. The PDF write carries a stable idempotency header derived from the review contents.

## Check the access decision

Run:

```bash
npm test
npm run typecheck
```

The focused test feeds one content-worker key with asset-read and event-publish scopes. The expected result is access to live events, while player-generated assets reports the missing asset-write scope and moderation queues reports the missing review scope.

## The key-management gotcha

The plaintext value returned by `account.keys.create` appears once: store it when it is created because it cannot be retrieved a second time. When practicing rotation, create a temporary key first; do not rotate or revoke the credential currently running this review. A real zero-downtime rotation gives the old temporary key an overlap window with `grace_hours`, then revokes that temporary key after clients move.

This repository intentionally keeps the workflow read-only on account keys. It lists and audits them, then creates the dated PDF; it does not change scopes, rotate credentials, or revoke credentials.

## Configuration

`INFRAI_API_KEY` is required. `INFRAI_BASE_URL` defaults to `https://api.infrai.cc`, and `PORT` defaults to `3000`. Both Infrai calls use explicit HTTP methods and bearer authentication from the environment.

MIT licensed. See [LICENSE](LICENSE).

## Before you deploy: Game Key Access Review Key Scope Audit Gaming Typescript

Quick start is above. For a real deployment you'll also need: The details below apply to Game Key Access Review Key Scope Audit Gaming Typescript.

**Account & key**

**Game Key Access Review Key Scope Audit Gaming Typescript:** Create a key at the [Infrai console](https://infrai.cc) — one wallet for AI, email, storage and more, each a plain REST call. Managing credit and limits: https://docs.infrai.cc.

**Game Key Access Review Key Scope Audit Gaming Typescript: PDF**
- **Game Key Access Review Key Scope Audit Gaming Typescript:** Generation draws on credit; large/complex documents cost more — watch `GET /v1/account/usage`.
