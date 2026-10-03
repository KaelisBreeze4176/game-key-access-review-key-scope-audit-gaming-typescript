import assert from "node:assert/strict";
import test from "node:test";
import { auditKeyAccess, reviewRequestSchema } from "../src/game_access_policy.js";

test("marks each content surface reachable only when every required scope is present", () => {
  const input = reviewRequestSchema.parse({
    projectName: "Creator Realm",
    requestedBy: "content-operations",
    reviewDate: "2026-10-01",
    surfaces: [
      { name: "player-generated assets", requiredScopes: ["game:assets:read", "game:assets:write"] },
      { name: "live events", requiredScopes: ["game:events:publish"] },
      { name: "moderation queues", requiredScopes: ["game:moderation:review"] }
    ]
  });

  const [decision] = auditKeyAccess([
    { id: "key_content_worker", name: "content-worker", scopes: ["game:assets:read", "game:events:publish"] }
  ], input);

  assert.deepEqual(decision.surfaces, [
    { name: "player-generated assets", reachable: false, missingScopes: ["game:assets:write"] },
    { name: "live events", reachable: true, missingScopes: [] },
    { name: "moderation queues", reachable: false, missingScopes: ["game:moderation:review"] }
  ]);
});
