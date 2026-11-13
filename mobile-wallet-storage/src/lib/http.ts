import { buildCardDetails, validateCardRequest, type CardDetails } from "./cards";

export const NO_STORE = { "Cache-Control": "no-store" };

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...NO_STORE },
  });
}

export type ParsedPassRequest =
  | { ok: true; details: CardDetails; preview: boolean }
  | { ok: false; response: Response };

/** Reads ?card=, ?name=, and ?format=json from a pass request. */
export function parsePassRequest(request: Request): ParsedPassRequest {
  const params = new URL(request.url).searchParams;
  const result = validateCardRequest(params.get("card"), params.get("name"));
  if (!result.ok) {
    return { ok: false, response: jsonResponse({ error: result.error }, 400) };
  }
  return {
    ok: true,
    details: buildCardDetails(result.template, result.holderName),
    preview: params.get("format") === "json",
  };
}

/** The response when a platform's credentials aren't set on the server. */
export function notConfigured(platform: string, missing: string[]): Response {
  return jsonResponse(
    {
      error: `${platform} isn't configured on this server, so passes can't be signed yet.`,
      missing,
      help: "Add the missing environment variables (see .env.example), or add ?format=json to view the unsigned pass data.",
    },
    503,
  );
}

/** The site's public address, used for images Google Wallet loads (it needs a public HTTPS URL). */
export function publicSiteUrl(): string | undefined {
  const url = process.env.PUBLIC_SITE_URL?.trim().replace(/\/+$/, "");
  return url?.startsWith("https://") ? url : undefined;
}
