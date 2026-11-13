import { buildPassJson, createApplePass, passFileName, PKPASS_CONTENT_TYPE } from "@/lib/apple-pass";
import { getAppleConfig } from "@/lib/config";
import { jsonResponse, NO_STORE, notConfigured, parsePassRequest } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/passes/apple?card=membership&name=Jordan%20Lee
 * Returns a signed .pkpass file. Add &format=json to see the unsigned pass.json instead.
 */
export async function GET(request: Request): Promise<Response> {
  const parsed = parsePassRequest(request);
  if (!parsed.ok) return parsed.response;
  const { details, preview } = parsed;

  const apple = getAppleConfig();

  if (preview) {
    const ids = apple.ok
      ? apple.config
      : { passTypeIdentifier: "pass.com.example.wallet", teamIdentifier: "TEAMID1234" };
    return jsonResponse({
      signed: false,
      note: "This is the pass.json that goes inside the .pkpass file. The real file also holds images, a manifest, and a signature.",
      passJson: buildPassJson(details, ids),
    });
  }

  if (!apple.ok) return notConfigured("Apple Wallet", apple.missing);

  try {
    const pass = await createApplePass(details, apple.config);
    return new Response(new Uint8Array(pass), {
      headers: {
        "Content-Type": PKPASS_CONTENT_TYPE,
        "Content-Disposition": `attachment; filename="${passFileName(details)}"`,
        ...NO_STORE,
      },
    });
  } catch (error) {
    console.error("Apple Wallet pass could not be created", error);
    return jsonResponse({ error: "The pass could not be signed. Check the Apple certificate settings." }, 500);
  }
}
