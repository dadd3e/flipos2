import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const keystring = body.keystring || body.apiKey;
    const { shopId, accessToken } = body;

    if (!keystring?.trim() || !shopId?.trim()) {
      return NextResponse.json(
        { success: false, error: "Etsy Keystring (Client ID) and Shop ID are required." },
        { status: 400 }
      );
    }

    const cleanShopId = String(shopId).trim();
    const cleanKeystring = String(keystring).trim();

    const headers: Record<string, string> = {
      "x-api-key": cleanKeystring,
      "Content-Type": "application/json",
    };

    if (accessToken?.trim()) {
      headers["Authorization"] = `Bearer ${accessToken.trim()}`;
    }

    const etsyUrl = `https://openapi.etsy.com/v3/application/shops/${cleanShopId}`;
    const response = await fetch(etsyUrl, {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      const errorText = await response.text();
      let parsedError: any;
      try {
        parsedError = JSON.parse(errorText);
      } catch {
        parsedError = { error: errorText };
      }
      return NextResponse.json(
        {
          success: false,
          error: parsedError.error || parsedError.message || `Etsy API error (Status ${response.status})`,
          status: response.status,
        },
        { status: 400 }
      );
    }

    const shopData = await response.json();
    return NextResponse.json({
      success: true,
      shop: {
        shopId: shopData.shop_id,
        shopName: shopData.shop_name,
        title: shopData.title,
        listingActiveCount: shopData.listing_active_count,
        currencyCode: shopData.currency_code,
        url: shopData.url,
        iconUrl: shopData.icon_url_fullxfull,
      },
    });
  } catch (error: any) {
    console.error("Error verifying Etsy connection:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to verify Etsy connection." },
      { status: 500 }
    );
  }
}
