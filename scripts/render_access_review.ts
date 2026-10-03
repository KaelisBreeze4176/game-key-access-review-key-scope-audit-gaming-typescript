import { createAccessReview } from "../src/access_review_service.js";
import { reviewRequestSchema } from "../src/game_access_policy.js";
import { createInfraiClient } from "../src/infrai_client.js";

const apiKey = process.env.INFRAI_API_KEY;
if (!apiKey) throw new Error("INFRAI_API_KEY is required");

const input = reviewRequestSchema.parse({
  projectName: "Creator Realm",
  requestedBy: "content-operations",
  reviewDate: new Date().toISOString().slice(0, 10),
  surfaces: [
    { name: "player-generated assets", requiredScopes: ["game:assets:read", "game:assets:write"] },
    { name: "live events", requiredScopes: ["game:events:publish"] },
    { name: "moderation queues", requiredScopes: ["game:moderation:review"] }
  ]
});

const review = await createAccessReview(createInfraiClient(apiKey, process.env.INFRAI_BASE_URL), input);
console.log(JSON.stringify(review, null, 2));
