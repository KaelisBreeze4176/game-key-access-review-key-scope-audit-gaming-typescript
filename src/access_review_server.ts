import { createServer } from "node:http";
import { z } from "zod";
import { createAccessReview } from "./access_review_service.js";
import { reviewRequestSchema } from "./game_access_policy.js";
import { createInfraiClient, InfraiError } from "./infrai_client.js";

const apiKey = process.env.INFRAI_API_KEY;
if (!apiKey) throw new Error("INFRAI_API_KEY is required");
const infrai = createInfraiClient(apiKey, process.env.INFRAI_BASE_URL);

async function readJson(request: import("node:http").IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(Buffer.from(chunk));
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

const server = createServer(async (request, response) => {
  response.setHeader("Content-Type", "application/json");
  if (request.method !== "POST" || request.url !== "/reviews") {
    response.writeHead(404).end(JSON.stringify({ error: "route not found" }));
    return;
  }

  try {
    const input = reviewRequestSchema.parse(await readJson(request));
    const review = await createAccessReview(infrai, input);
    response.writeHead(201).end(JSON.stringify(review));
  } catch (error) {
    if (error instanceof z.ZodError) {
      response.writeHead(400).end(JSON.stringify({ error: "invalid review request", issues: error.issues }));
      return;
    }
    if (error instanceof InfraiError) {
      const status = error.status >= 400 && error.status < 500 ? error.status : 502;
      response.writeHead(status).end(JSON.stringify({ error: error.code, detail: error.detail }));
      return;
    }
    response.writeHead(502).end(JSON.stringify({ error: "review could not be created" }));
  }
});

const port = Number(process.env.PORT ?? 3000);
server.listen(port, () => console.log(`Access review service listening on http://localhost:${port}`));
