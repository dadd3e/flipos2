/**
 * Utility helper functions for interacting with Etsy Open API v3
 */

export interface ResolvedEtsyShop {
  success: boolean;
  shopId: string;
  shopName: string;
  activeListings?: number;
  userId?: string;
  error?: string;
}

/**
 * In Etsy OAuth 2.0, the access token is structured as `<user_id>.<random_string>`
 * (e.g. "12345678.9abcdef..."). We can extract the numeric Etsy user ID directly.
 */
export function extractUserIdFromToken(accessToken?: string): string | null {
  if (!accessToken || typeof accessToken !== "string") return null;
  const parts = accessToken.trim().split(".");
  if (parts.length > 0 && /^\d+$/.test(parts[0])) {
    return parts[0];
  }
  return null;
}

/**
 * Resolves an Etsy shop by trying:
 * 1. User's authorized shops via token (`/v3/application/users/{user_id}/shops`)
 * 2. User's me endpoint (`/v3/application/users/me`)
 * 3. Specific shop ID if numeric (`/v3/application/shops/{shop_id}`)
 * 4. Shop name search (`/v3/application/shops?shop_name={name}`)
 */
export async function resolveEtsyShop(
  apiKey: string,
  accessToken?: string,
  shopIdOrName?: string,
  sharedSecret?: string
): Promise<ResolvedEtsyShop> {
  const cleanKey = apiKey?.trim();
  if (!cleanKey) {
    return { success: false, shopId: "", shopName: "", error: "Missing Etsy API Key (keystring)." };
  }

  const cleanSecret = sharedSecret?.trim();
  const effectiveKey = cleanKey.includes(":")
    ? cleanKey
    : (cleanSecret ? `${cleanKey}:${cleanSecret}` : cleanKey);

  const cleanToken = accessToken?.trim();
  const cleanShopIdentifier = shopIdOrName?.trim();

  const authHeaders: Record<string, string> = {
    "x-api-key": effectiveKey,
    "Content-Type": "application/json",
  };
  if (cleanToken) {
    authHeaders["Authorization"] = `Bearer ${cleanToken}`;
  }

  // 1. Try resolving via user ID extracted from accessToken
  const userId = extractUserIdFromToken(cleanToken);
  if (userId && cleanToken) {
    try {
      const userShopsUrl = `https://openapi.etsy.com/v3/application/users/${userId}/shops`;
      const res = await fetch(userShopsUrl, {
        method: "GET",
        headers: authHeaders,
      });

      if (res.ok) {
        const data = await res.json();
        const shop = data.results?.[0] || data.shop || data;
        if (shop?.shop_id) {
          return {
            success: true,
            shopId: String(shop.shop_id),
            shopName: shop.shop_name || "",
            activeListings: shop.listing_active_count ?? 0,
            userId,
          };
        }
      }
    } catch (e) {
      console.warn("Could not resolve shop via /users/{id}/shops:", e);
    }
  }

  // 2. Try /users/me if token is provided
  if (cleanToken) {
    try {
      const meUrl = "https://openapi.etsy.com/v3/application/users/me";
      const res = await fetch(meUrl, {
        method: "GET",
        headers: authHeaders,
      });

      if (res.ok) {
        const meData = await meResToJson(res);
        if (meData?.shop_id) {
          return {
            success: true,
            shopId: String(meData.shop_id),
            shopName: meData.shop_name || "",
            userId: meData.user_id ? String(meData.user_id) : userId || undefined,
          };
        }
        if (meData?.user_id) {
          const resShops = await fetch(
            `https://openapi.etsy.com/v3/application/users/${meData.user_id}/shops`,
            { method: "GET", headers: authHeaders }
          );
          if (resShops.ok) {
            const shopsData = await resShops.json();
            const shop = shopsData.results?.[0] || shopsData.shop || shopsData;
            if (shop?.shop_id) {
              return {
                success: true,
                shopId: String(shop.shop_id),
                shopName: shop.shop_name || "",
                activeListings: shop.listing_active_count ?? 0,
                userId: String(meData.user_id),
              };
            }
          }
        }
      }
    } catch (e) {
      console.warn("Could not resolve shop via /users/me:", e);
    }
  }

  // 3. If a shop ID or shop name is provided:
  if (cleanShopIdentifier) {
    // If it's purely digits, it's a numeric shop ID
    if (/^\d+$/.test(cleanShopIdentifier)) {
      try {
        const shopUrl = `https://openapi.etsy.com/v3/application/shops/${cleanShopIdentifier}`;
        const res = await fetch(shopUrl, {
          method: "GET",
          headers: authHeaders,
        });

        if (res.ok) {
          const shop = await res.json();
          if (shop?.shop_id) {
            return {
              success: true,
              shopId: String(shop.shop_id),
              shopName: shop.shop_name || "",
              activeListings: shop.listing_active_count ?? 0,
            };
          }
        }
      } catch (e) {
        console.warn(`Could not resolve shop ID ${cleanShopIdentifier}:`, e);
      }
    }

    // Otherwise try looking up by shop name
    try {
      const searchUrl = `https://openapi.etsy.com/v3/application/shops?shop_name=${encodeURIComponent(cleanShopIdentifier)}`;
      const res = await fetch(searchUrl, {
        method: "GET",
        headers: {
          "x-api-key": effectiveKey,
          "Content-Type": "application/json",
        },
      });

      if (res.ok) {
        const data = await res.json();
        const shop = data.results?.[0] || data.shop || data;
        if (shop?.shop_id) {
          return {
            success: true,
            shopId: String(shop.shop_id),
            shopName: shop.shop_name || cleanShopIdentifier,
            activeListings: shop.listing_active_count ?? 0,
          };
        }
      }
    } catch (e) {
      console.warn(`Could not resolve shop by name ${cleanShopIdentifier}:`, e);
    }
  }

  return {
    success: false,
    shopId: cleanShopIdentifier && /^\d+$/.test(cleanShopIdentifier) ? cleanShopIdentifier : "",
    shopName: cleanShopIdentifier || "",
    error: "Could not automatically resolve your Etsy shop. Please enter your Shop Name or log in with Etsy.",
  };
}

async function meResToJson(res: Response): Promise<any> {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

export interface RefreshTokenResult {
  success: boolean;
  accessToken?: string;
  refreshToken?: string;
  expiresIn?: number;
  error?: string;
}

export async function refreshEtsyToken(
  apiKey: string,
  refreshToken: string,
  sharedSecret?: string
): Promise<RefreshTokenResult> {
  const cleanKey = apiKey.includes(":") ? apiKey.split(":")[0].trim() : apiKey.trim();
  const cleanRefresh = refreshToken?.trim();
  if (!cleanKey || !cleanRefresh) {
    return { success: false, error: "Missing API key or refresh token." };
  }

  try {
    const tokenUrl = "https://openapi.etsy.com/v3/public/oauth/token";
    const body = new URLSearchParams({
      grant_type: "refresh_token",
      client_id: cleanKey,
      refresh_token: cleanRefresh,
    });

    const res = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    });

    if (!res.ok) {
      const errText = await res.text();
      let errorMsg = `Token refresh failed (status ${res.status})`;
      try {
        const parsed = JSON.parse(errText);
        errorMsg = parsed.error_description || parsed.error || errorMsg;
      } catch {
        errorMsg = errText || errorMsg;
      }
      return { success: false, error: errorMsg };
    }

    const data = await res.json();
    return {
      success: true,
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
    };
  } catch (e: any) {
    return { success: false, error: e.message || "Network error while refreshing token" };
  }
}

/**
 * Decodes HTML entities (e.g., &quot; -> ", &#39; -> ', &amp; -> &, etc.)
 * commonly returned in Etsy Open API v3 strings (listing titles, descriptions, transaction titles).
 */
export function decodeHtmlEntities(str?: string | null): string {
  if (!str) return "";
  let decoded = String(str);
  // Handle double encoded or single encoded entities (e.g. &amp;quot; or &quot;)
  for (let i = 0; i < 2; i++) {
    const prev = decoded;
    decoded = decoded
      .replace(/&quot;/gi, '"')
      .replace(/&#0*34;/g, '"')
      .replace(/&apos;/gi, "'")
      .replace(/&#0*39;/g, "'")
      .replace(/&lt;/gi, "<")
      .replace(/&#0*60;/g, "<")
      .replace(/&gt;/gi, ">")
      .replace(/&#0*62;/g, ">")
      .replace(/&nbsp;/gi, " ")
      .replace(/&#0*160;/g, " ")
      .replace(/&ndash;/gi, "–")
      .replace(/&mdash;/gi, "—")
      .replace(/&#(\d+);/g, (_, dec) => {
        try {
          return String.fromCodePoint(parseInt(dec, 10));
        } catch {
          return _;
        }
      })
      .replace(/&#x([0-9a-f]+);/gi, (_, hex) => {
        try {
          return String.fromCodePoint(parseInt(hex, 16));
        } catch {
          return _;
        }
      })
      .replace(/&amp;/gi, "&")
      .replace(/&#0*38;/g, "&");
    if (decoded === prev) break;
  }
  return decoded;
}

