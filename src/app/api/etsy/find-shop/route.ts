import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { apiKey, keystring, sharedSecret, shopName } = await req.json();
    const rawKey = String(apiKey || keystring || "").trim();
    const rawSecret = String(sharedSecret || "").trim();

    if (!rawKey) {
      return NextResponse.json(
        { success: false, error: "Etsy API Key (Keystring) is required." },
        { status: 400 }
      );
    }

    const effectiveKey = rawKey.includes(":") ? rawKey : (rawSecret ? `${rawKey}:${rawSecret}` : rawKey);

    if (!shopName?.trim()) {
      return NextResponse.json(
        { success: false, error: "Please enter your Etsy Shop Name." },
        { status: 400 }
      );
    }

    const cleanShopName = shopName.trim();
    const etsyUrl = `https://openapi.etsy.com/v3/application/shops?shop_name=${encodeURIComponent(cleanShopName)}`;

    const res = await fetch(etsyUrl, {
      method: "GET",
      headers: {
        "x-api-key": effectiveKey,
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      const errText = await res.text();
      let parsed: any;
      try {
        parsed = JSON.parse(errText);
      } catch {
        parsed = { error: errText };
      }
      return NextResponse.json(
        {
          success: false,
          error: parsed.error || parsed.message || `Shop not found or invalid API Key (Status ${res.status})`,
        },
        { status: 400 }
      );
    }

    const data = await res.json();
    const shop = data.results?.[0] || data.shop || data;

    if (!shop || !shop.shop_id) {
      return NextResponse.json(
        { success: false, error: `Could not find an Etsy shop named "${cleanShopName}". Please check the spelling.` },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      shop: {
        shopId: String(shop.shop_id),
        shopName: shop.shop_name,
        title: shop.title,
        listingActiveCount: shop.listing_active_count ?? 0,
        currencyCode: shop.currency_code,
        url: shop.url,
      },
    });
  } catch (error: any) {
    console.error("Error looking up Etsy shop by name:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to search for Etsy shop." },
      { status: 500 }
    );
  }
}
