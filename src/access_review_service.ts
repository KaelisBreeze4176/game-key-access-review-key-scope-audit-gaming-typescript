import { createHash } from "node:crypto";
import { z } from "zod";
import type { InfraiClient } from "./infrai_client.js";
import { auditKeyAccess, type AccountKey, type ReviewRequest } from "./game_access_policy.js";

const accountKeySchema = z.object({ id: z.string(), name: z.string(), scopes: z.array(z.string()) });
const listedAccountKeySchema = z.object({
  key_id: z.string(),
  name: z.string(),
  scopes: z.array(z.string()).optional()
}).transform(({ key_id, name, scopes }) => ({ id: key_id, name, scopes: scopes ?? [] }));

const keyListSchema = z.union([
  z.array(accountKeySchema),
  z.object({ keys: z.array(accountKeySchema) }).transform((value) => value.keys),
  z.object({ items: z.array(listedAccountKeySchema) }).transform((value) => value.items)
]);

const pdfResultSchema = z.object({ url: z.string().url() }).passthrough();

export type AccessReview = {
  projectName: string;
  reviewDate: string;
  requestedBy: string;
  keys: ReturnType<typeof auditKeyAccess>;
  documentUrl: string;
};

function reviewMarkdown(input: ReviewRequest, keys: ReturnType<typeof auditKeyAccess>): string {
  const rows = keys.flatMap((key) => key.surfaces.map((surface) =>
    `| ${key.name} | ${surface.name} | ${surface.reachable ? "yes" : "no"} | ${surface.missingScopes.join(", ") || "none"} |`
  ));
  return [
    `# ${input.projectName} access review`,
    "",
    `Review date: ${input.reviewDate}`,
    `Requested by: ${input.requestedBy}`,
    "",
    "| Backend key | Content surface | Reachable | Missing scopes |",
    "| --- | --- | --- | --- |",
    ...rows
  ].join("\n");
}

export async function createAccessReview(infrai: InfraiClient, input: ReviewRequest): Promise<AccessReview> {
  const listed = await infrai.request<unknown>("GET", "/v1/account/keys/list");
  const accountKeys: AccountKey[] = keyListSchema.parse(listed);
  const keys = auditKeyAccess(accountKeys, input);
  const markdown = reviewMarkdown(input, keys);
  const fingerprint = createHash("sha256").update(`${input.projectName}:${input.reviewDate}:${markdown}`).digest("hex");
  const rendered = await infrai.request<unknown>(
    "POST",
    "/v1/pdf/generate",
    { markdown, page_size: "A4", orientation: "portrait", store: true },
    fingerprint
  );
  const document = pdfResultSchema.parse(rendered);
  return { projectName: input.projectName, reviewDate: input.reviewDate, requestedBy: input.requestedBy, keys, documentUrl: document.url };
}
