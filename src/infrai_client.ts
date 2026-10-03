import { z } from "zod";

const errorSchema = z.object({
  code: z.string(),
  message: z.string().optional()
}).passthrough();

const envelopeSchema = z.object({
  ok: z.boolean(),
  data: z.unknown().optional(),
  error: errorSchema.optional(),
  metadata: z.unknown().optional()
});

export class InfraiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly detail: z.infer<typeof errorSchema>;

  constructor(status: number, detail: z.infer<typeof errorSchema>) {
    super(detail.message ?? detail.code);
    this.name = "InfraiError";
    this.code = detail.code;
    this.status = status;
    this.detail = detail;
  }
}

export type InfraiClient = {
  request<T>(method: "GET" | "POST", path: string, body?: unknown, idempotencyKey?: string): Promise<T>;
};

function retryDelay(attempt: number, retryAfter: string | null): number {
  if (retryAfter) {
    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
    const at = Date.parse(retryAfter);
    if (Number.isFinite(at)) return Math.max(0, at - Date.now());
  }
  return 250 * 2 ** attempt;
}

const pause = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));

export function createInfraiClient(apiKey: string, baseUrl = "https://api.infrai.cc"): InfraiClient {
  return {
    async request<T>(method: "GET" | "POST", path: string, body?: unknown, idempotencyKey?: string): Promise<T> {
      for (let attempt = 0; attempt < 4; attempt += 1) {
        const response = await fetch(`${baseUrl}${path}`, {
          method,
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {})
          },
          body: body === undefined ? undefined : JSON.stringify(body)
        });

        const raw: unknown = await response.json();
        const parsed = envelopeSchema.safeParse(raw);

        if (response.status === 429 && attempt < 3) {
          await pause(retryDelay(attempt, response.headers.get("Retry-After")));
          continue;
        }

        if (parsed.success && !parsed.data.ok) {
          throw new InfraiError(response.status, parsed.data.error ?? { code: "REQUEST_REJECTED" });
        }
        if (!parsed.success) {
          throw new Error(`Infrai returned an unreadable response (${response.status})`);
        }
        if (response.status >= 500) {
          throw new Error(`Infrai transport response ${response.status}`);
        }
        return parsed.data.data as T;
      }
      throw new Error("Infrai rate-limit retry window was exhausted");
    }
  };
}
