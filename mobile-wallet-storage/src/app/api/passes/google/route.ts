import { getGoogleConfig } from "@/lib/config";
import { buildSaveClaims, createGoogleSaveUrl } from "@/lib/google-pass";
import { jsonResponse, NO_STORE, notConfigured, parsePassRequest, publicSiteUrl } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/passes/google?card=membership&name=Jordan%20Lee
 * Redirects to the signed "Save to Google Wallet" link. Add &format=json to see the
 * unsigned token contents instead.
 */
export async function GET(request: Request): Promise<Response> {
  const parsed = parsePassRequest(request);
  if (!parsed.ok) return parsed.response;
  const { details, preview } = parsed;

  const google = getGoogleConfig();
  const site = publicSiteUrl();
  const logoUrl = site ? `${site}/pass-logo.png` : undefined;

  if (preview) {
    const ids = google.ok
      ? google.config
      : { issuerId: "3388000000000000000", serviceAccountEmail: "wallet@your-project.iam.gserviceaccount.com" };
    return jsonResponse({
      signed: false,
      note: "These are the claims of the Save to Google Wallet token. The real link signs them with the service account key.",
      claims: buildSaveClaims(details, ids, { logoUrl }),
    });
  }

  if (!google.ok) return notConfigured("Google Wallet", google.missing);

  try {
    const saveUrl = createGoogleSaveUrl(details, google.config, { logoUrl });
    return new Response(null, { status: 302, headers: { Location: saveUrl, ...NO_STORE } });
  } catch (error) {
    console.error("Google Wallet link could not be created", error);
    return jsonResponse({ error: "The pass could not be signed. Check the Google service account key." }, 500);
  }
}
