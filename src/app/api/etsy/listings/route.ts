import { NextRequest, NextResponse } from "next/server";
import type { InventoryItem } from "@/lib/types";
import { refreshEtsyToken } from "@/lib/etsyHelper";
import { cleanQuotes } from "@/lib/utils";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const keystring = body.keystring || body.apiKey;
    const sharedSecret = body.sharedSecret;
    const { shopId } = body;
    let accessToken = body.accessToken;
    const refreshToken = body.refreshToken;
    let newAccessToken: string | undefined;
    let newRefreshToken: string | undefined;

    if (!keystring?.trim() || !shopId?.trim()) {
      return NextResponse.json(
        { success: false, error: "Etsy Keystring and Shop ID are required." },
        { status: 400 }
      );
    }

    const cleanShopId = String(shopId).trim();
    const rawKeystring = String(keystring).trim();
    const rawSecret = String(sharedSecret || "").trim();
    const effectiveKey = rawKeystring.includes(":")
      ? rawKeystring
      : (rawSecret ? `${rawKeystring}:${rawSecret}` : rawKeystring);

    const headers: Record<string, string> = {
      "x-api-key": effectiveKey,
      "Content-Type": "application/json",
    };

    if (accessToken?.trim()) {
      headers["Authorization"] = `Bearer ${accessToken.trim()}`;
    }

    // Fetch active listings with includes
    const listingsUrl = `https://openapi.etsy.com/v3/application/shops/${cleanShopId}/listings/active?limit=100&includes=images,Images`;
    let response = await fetch(listingsUrl, {
      method: "GET",
      headers,
    });

    // If unauthorized or token invalid, attempt automatic token refresh
    if (!response.ok && (response.status === 401 || response.status === 403)) {
      if (refreshToken?.trim()) {
        const refreshResult = await refreshEtsyToken(rawKeystring, refreshToken, rawSecret);
        if (refreshResult.success && refreshResult.accessToken) {
          accessToken = refreshResult.accessToken;
          newAccessToken = refreshResult.accessToken;
          newRefreshToken = refreshResult.refreshToken;
          headers["Authorization"] = `Bearer ${accessToken}`;

          // Retry request with fresh access token
          response = await fetch(listingsUrl, {
            method: "GET",
            headers,
          });
        }
      }
    }

    if (!response.ok) {
      const errorText = await response.text();
      let errorMsg = `Etsy API error (Status ${response.status})`;
      try {
        const parsed = JSON.parse(errorText);
        errorMsg = parsed.error || parsed.message || errorMsg;
      } catch {
        errorMsg = errorText || errorMsg;
      }

      if (response.status === 401 || errorMsg.toLowerCase().includes("token")) {
        return NextResponse.json(
          {
            success: false,
            error: "Your Etsy login session has expired. Please click 'Log In with Etsy' under the Connect tab to reconnect.",
            needsReauth: true,
          },
          { status: 401 }
        );
      }

      return NextResponse.json({ success: false, error: errorMsg }, { status: response.status });
    }

    const data = await response.json();
    const results = data.results || [];

    // Helper to extract image URL from listing object
    const getImageUrlFromListing = (listing: any): string | undefined => {
      const imgs = listing.images || listing.Images;
      if (Array.isArray(imgs) && imgs.length > 0) {
        return imgs[0].url_570xN || imgs[0].url_fullxfull || imgs[0].url_170x135 || imgs[0].url_75x75;
      }
      return undefined;
    };

    // For listings where images are not embedded, fetch their primary image concurrently (batches of 5)
    const listingImageMap = new Map<number, string>();
    const missingImageListingIds: number[] = [];

    for (const listing of results) {
      const imgUrl = getImageUrlFromListing(listing);
      if (imgUrl) {
        listingImageMap.set(listing.listing_id, imgUrl);
      } else if (listing.listing_id) {
        missingImageListingIds.push(listing.listing_id);
      }
    }

    if (missingImageListingIds.length > 0) {
      // Fetch up to 40 listings' images concurrently in batches of 6
      const batchSize = 6;
      for (let i = 0; i < missingImageListingIds.length; i += batchSize) {
        const batch = missingImageListingIds.slice(i, i + batchSize);
        await Promise.allSettled(
          batch.map(async (lid) => {
            try {
              const imgRes = await fetch(
                `https://openapi.etsy.com/v3/application/listings/${lid}/images`,
                { method: "GET", headers }
              );
              if (imgRes.ok) {
                const imgData = await imgRes.json();
                const firstImg = imgData?.results?.[0];
                if (firstImg) {
                  const url = firstImg.url_570xN || firstImg.url_fullxfull || firstImg.url_170x135;
                  if (url) listingImageMap.set(lid, url);
                }
              }
            } catch {
              // Ignore individual image fetch failure
            }
          })
        );
      }
    }

    const items: Partial<InventoryItem>[] = results.map((listing: any) => {
      const priceAmount = listing.price?.amount ?? 0;
      const divisor = listing.price?.divisor ?? 100;
      const targetPrice = priceAmount > 0 ? parseFloat((priceAmount / divisor).toFixed(2)) : 0;
      
      // Calculate estimated profit: (Target Price * 0.85) - COGS (COGS defaults to 0 until set)
      const potentialProfit = parseFloat((targetPrice * 0.85).toFixed(2));

      // Resolve main photo
      const itemImageUrl = listingImageMap.get(listing.listing_id) || getImageUrlFromListing(listing);

      // Pick category from tags if available
      let category = "Collectibles";
      if (listing.tags && Array.isArray(listing.tags) && listing.tags.length > 0) {
        const candidate = listing.tags[0];
        category = candidate.charAt(0).toUpperCase() + candidate.slice(1);
      }

      return {
        id: crypto.randomUUID(),
        name: cleanQuotes(listing.title) || "Etsy Item",
        category,
        status: "Active" as const,
        quantity: typeof listing.quantity === "number" ? listing.quantity : 1,
        price: 0,
        totalPurchaseCost: 0,
        source: "Etsy",
        targetPrice,
        potentialProfit,
        itemImageUrl,
        listedOn: ["Etsy"],
        dateAdded: new Date().toISOString(),
        purchaseDate: new Date().toISOString().split("T")[0],
        etsyListingId: listing.listing_id,
        etsyUrl: listing.url || `https://www.etsy.com/listing/${listing.listing_id}`,
        additionalNotes: `Imported from Etsy (Listing #${listing.listing_id}).\n\n${cleanQuotes(listing.description || "").slice(0, 500)}`.trim(),
      };
    });

    return NextResponse.json({
      success: true,
      count: items.length,
      items,
      newAccessToken,
      newRefreshToken,
    });
  } catch (error: any) {
    console.error("Error fetching Etsy listings:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch Etsy listings." },
      { status: 500 }
    );
  }
}
