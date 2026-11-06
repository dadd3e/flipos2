import { NextRequest, NextResponse } from "next/server";
import { resolveEtsyShop } from "@/lib/etsyHelper";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const apiKey = String(body.apiKey || body.keystring || "").trim();
    const accessToken = String(body.accessToken || "").trim();
    const shopId = String(body.shopId || "").trim();
    const shopName = String(body.shopName || "").trim();

    if (!apiKey) {
      return NextResponse.json({
        success: false,
        connected: false,
        error: "Etsy Keystring / API Key is missing.",
      });
    }

    // Try resolving shop
    const shopResolution = await resolveEtsyShop(apiKey, accessToken, shopId || shopName);

    if (shopResolution.success && shopResolution.shopId) {
      return NextResponse.json({
        success: true,
        connected: true,
        shopId: shopResolution.shopId,
        shopName: shopResolution.shopName || shopName || `Shop #${shopResolution.shopId}`,
        activeListings: shopResolution.activeListings ?? 0,
        hasAccessToken: Boolean(accessToken),
      });
    }

    // If shop couldn't be resolved automatically
    return NextResponse.json({
      success: false,
      connected: false,
      error: shopResolution.error || "Could not find your Etsy shop. Please enter your shop name or log in with Etsy.",
      shopId: shopId || "",
      shopName: shopName || "",
      hasAccessToken: Boolean(accessToken),
    });
  } catch (error: any) {
    console.error("Error checking Etsy connection status:", error);
    return NextResponse.json(
      { success: false, connected: false, error: error.message || "Failed to verify connection." },
      { status: 500 }
    );
  }
}
