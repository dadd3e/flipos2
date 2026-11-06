import { NextRequest, NextResponse } from "next/server";
import { resolveEtsyShop, refreshEtsyToken } from "@/lib/etsyHelper";

export async function POST(req: NextRequest) {
  try {
    const { keystring, apiKey, sharedSecret, code, codeVerifier, redirectUri, refreshToken: inputRefreshToken, grant_type } = await req.json();
    const effectiveKey = String(keystring || apiKey || "").trim();
    const cleanKeystring = effectiveKey.includes(":") ? effectiveKey.split(":")[0].trim() : effectiveKey;
    const cleanSecret = String(sharedSecret || (effectiveKey.includes(":") ? effectiveKey.split(":")[1] : "")).trim();

    if (grant_type === "refresh_token" || (inputRefreshToken && !code)) {
      if (!cleanKeystring || !inputRefreshToken) {
        return NextResponse.json({ success: false, error: "Missing keystring or refreshToken" }, { status: 400 });
      }
      const refreshResult = await refreshEtsyToken(cleanKeystring, inputRefreshToken, cleanSecret);
      if (!refreshResult.success) {
        return NextResponse.json({ success: false, error: refreshResult.error }, { status: 401 });
      }
      return NextResponse.json({
        success: true,
        accessToken: refreshResult.accessToken,
        refreshToken: refreshResult.refreshToken,
        expiresIn: refreshResult.expiresIn,
      });
    }

    if (!cleanKeystring || !code || !codeVerifier || !redirectUri) {
      return NextResponse.json(
        { success: false, error: "Missing required parameters: apiKey/keystring, code, codeVerifier, redirectUri" },
        { status: 400 }
      );
    }

    const tokenUrl = "https://openapi.etsy.com/v3/public/oauth/token";
    const body = new URLSearchParams({
      grant_type: "authorization_code",
      client_id: cleanKeystring,
      redirect_uri: redirectUri.trim(),
      code: code.trim(),
      code_verifier: codeVerifier.trim(),
    });

    const response = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let parsed: any;
      try {
        parsed = JSON.parse(errorText);
      } catch {
        parsed = { error: errorText };
      }
      return NextResponse.json(
        {
          success: false,
          error: parsed.error_description || parsed.error || `Etsy token exchange failed (Status ${response.status})`,
        },
        { status: response.status }
      );
    }

    const tokenData = await response.json();
    const accessToken = tokenData.access_token;
    const refreshToken = tokenData.refresh_token;
    const expiresIn = tokenData.expires_in;

    // Automatically resolve shop details using resolveEtsyShop helper
    const shopResult = await resolveEtsyShop(cleanKeystring, accessToken, undefined, cleanSecret);

    return NextResponse.json({
      success: true,
      accessToken,
      refreshToken,
      expiresIn,
      shopId: shopResult.shopId || "",
      shopName: shopResult.shopName || "",
      activeListings: shopResult.activeListings ?? 0,
    });
  } catch (error: any) {
    console.error("Error exchanging Etsy OAuth token:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
