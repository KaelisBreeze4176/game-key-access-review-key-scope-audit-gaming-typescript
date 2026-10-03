import { z } from "zod";

export const reviewRequestSchema = z.object({
  projectName: z.string().min(1),
  requestedBy: z.string().min(1),
  reviewDate: z.iso.date(),
  surfaces: z.array(z.object({
    name: z.enum(["player-generated assets", "live events", "moderation queues"]),
    requiredScopes: z.array(z.string().min(1)).min(1)
  })).length(3)
});

export type ReviewRequest = z.infer<typeof reviewRequestSchema>;

export type AccountKey = {
  id: string;
  name: string;
  scopes: string[];
};

export type SurfaceDecision = {
  name: ReviewRequest["surfaces"][number]["name"];
  reachable: boolean;
  missingScopes: string[];
};

export type KeyDecision = AccountKey & {
  surfaces: SurfaceDecision[];
};

export function auditKeyAccess(keys: AccountKey[], input: ReviewRequest): KeyDecision[] {
  return keys.map((key) => ({
    ...key,
    surfaces: input.surfaces.map((surface) => {
      const missingScopes = surface.requiredScopes.filter((scope) => !key.scopes.includes(scope));
      return { name: surface.name, reachable: missingScopes.length === 0, missingScopes };
    })
  }));
}
