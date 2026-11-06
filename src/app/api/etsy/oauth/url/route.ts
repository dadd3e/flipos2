import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { etsyOAuthSessions, cleanOldSessions } from "@/lib/etsyOAuthState";

function base64url(buffer: Buffer): string {
  return buffer
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export async function POST(req: NextRequest) {
  try {
    cleanOldSessions();

    const body = await req.json();
    const rawKey = String(body.apiKey || body.keystring || "").trim();
    let rawSecret = String(body.sharedSecret || "").trim();
    const shopName = String(body.shopName || "").trim();

    if (!rawKey) {
      return NextResponse.json(
        { success: false, error: "Please provide your Etsy API Key (Keystring)." },
        { status: 400 }
      );
    }

    // If key contains ':', split into keystring and secret
    let keystring = rawKey;
    if (rawKey.includes(":")) {
      const parts = rawKey.split(":");
      keystring = parts[0].trim();
      if (!rawSecret && parts[1]) {
        rawSecret = parts[1].trim();
      }
    }

    // Determine redirect URI
    let redirectUri = String(body.redirectUri || "").trim();
    if (!redirectUri) {
      const origin = req.nextUrl.origin;
      redirectUri = `${origin}/api/etsy/oauth/callback`;
    }

    // Generate PKCE code verifier (43-128 characters)
    const randomBytes = crypto.randomBytes(32);
    const codeVerifier = base64url(randomBytes);
    const hash = crypto.createHash("sha256").update(codeVerifier).digest();
    const codeChallenge = base64url(hash);

    // Generate self-contained state payload that survives server restarts or multi-worker routing
    const statePayload = JSON.stringify({
      apiKey: keystring,
      sharedSecret: rawSecret,
      shopName,
      codeVerifier,
      redirectUri,
      t: Date.now(),
      nonce: crypto.randomBytes(6).toString("hex"),
    });
    const state = base64url(Buffer.from(statePayload));

    // Store in session map
    etsyOAuthSessions.set(state, {
      codeVerifier,
      apiKey: keystring,
      sharedSecret: rawSecret,
      shopName,
      redirectUri,
      createdAt: Date.now(),
    });

    // Etsy v3 standard OAuth parameters (client_id MUST be the pure keystring)
    const params = new URLSearchParams({
      response_type: "code",
      client_id: keystring,
      redirect_uri: redirectUri,
      scope: "listings_r transactions_r shops_r profile_r",
      state,
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
    });

    const authUrl = `https://www.etsy.com/oauth/connect?${params.toString()}`;

    return NextResponse.json({
      success: true,
      authUrl,
      state,
      redirectUri,
    });
  } catch (error: any) {
    console.error("Error generating Etsy OAuth URL:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to generate login link." },
      { status: 500 }
    );
  }
}
