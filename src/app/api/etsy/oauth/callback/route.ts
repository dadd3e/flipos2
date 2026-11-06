import { NextRequest, NextResponse } from "next/server";
import { etsyOAuthSessions } from "@/lib/etsyOAuthState";

function formatApiKeyHeader(apiKey: string, sharedSecret?: string): string {
  const k = (apiKey || "").trim();
  const s = (sharedSecret || "").trim();
  if (k.includes(":")) return k;
  if (s) return `${k}:${s}`;
  return k;
}

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const code = searchParams.get("code") || "";
  const state = searchParams.get("state") || "";
  const error = searchParams.get("error") || "";
  const errorDescription = searchParams.get("error_description") || "";

  let session = state ? etsyOAuthSessions.get(state) : null;
  // If state was also encoded as JSON fallback, try decoding
  if (!session && state) {
    try {
      const decoded = Buffer.from(state, "base64url").toString("utf-8");
      const parsed = JSON.parse(decoded);
      if (parsed.apiKey && parsed.codeVerifier) {
        session = {
          codeVerifier: parsed.codeVerifier,
          apiKey: parsed.apiKey,
          sharedSecret: parsed.sharedSecret || "",
          shopName: parsed.shopName || "",
          redirectUri: parsed.redirectUri || req.nextUrl.origin + "/api/etsy/oauth/callback",
          createdAt: parsed.t || Date.now(),
        };
      }
    } catch {}
  }

  let exchangeSuccess = false;
  let shopId = "";
  let shopName = session?.shopName || "";
  let activeListings = 0;
  let accessToken = "";
  let refreshToken = "";
  let userId = "";
  let exchangeError = error ? (errorDescription || error) : "";

  if (!exchangeError && (!code || !session)) {
    exchangeError = "Authentication session expired or invalid state. Please try logging in again.";
  }

  // Perform server-side token exchange with Etsy
  if (code && session && !exchangeError) {
    try {
      const cleanKeystring = session.apiKey.includes(":")
        ? session.apiKey.split(":")[0].trim()
        : session.apiKey.trim();

      const tokenUrl = "https://openapi.etsy.com/v3/public/oauth/token";
      const body = new URLSearchParams({
        grant_type: "authorization_code",
        client_id: cleanKeystring,
        redirect_uri: session.redirectUri.trim(),
        code: code.trim(),
        code_verifier: session.codeVerifier.trim(),
      });

      const tokenRes = await fetch(tokenUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString(),
      });

      const tokenText = await tokenRes.text();
      let tokenData: any = {};
      try {
        tokenData = JSON.parse(tokenText);
      } catch {
        tokenData = { error: tokenText };
      }

      if (!tokenRes.ok || !tokenData.access_token) {
        exchangeError =
          tokenData.error_description ||
          tokenData.error ||
          `Etsy token request failed (Status ${tokenRes.status})`;
      } else {
        accessToken = tokenData.access_token;
        refreshToken = tokenData.refresh_token || "";

        // Extract user_id directly from Etsy v3 access token format: {user_id}.{token}
        if (accessToken.includes(".")) {
          userId = accessToken.split(".")[0];
        }

        const apiKeyHeader = formatApiKeyHeader(session.apiKey, session.sharedSecret);

        // 1. Try to get user's shop using user ID
        if (userId) {
          try {
            const userShopsRes = await fetch(
              `https://openapi.etsy.com/v3/application/users/${userId}/shops`,
              {
                method: "GET",
                headers: {
                  "x-api-key": apiKeyHeader,
                  Authorization: `Bearer ${accessToken}`,
                  "Content-Type": "application/json",
                },
              }
            );

            if (userShopsRes.ok) {
              const shopData = await userShopsRes.json();
              const shopObj = shopData.results?.[0] || shopData.shop || shopData;
              if (shopObj?.shop_id) {
                shopId = String(shopObj.shop_id);
                shopName = shopObj.shop_name || shopName;
                activeListings = shopObj.listing_active_count ?? 0;
              }
            }
          } catch (shopErr) {
            console.warn("Could not query user shops directly:", shopErr);
          }
        }

        // 2. Fallback: Query /users/me
        if (!shopId) {
          try {
            const meRes = await fetch("https://openapi.etsy.com/v3/application/users/me", {
              method: "GET",
              headers: {
                "x-api-key": apiKeyHeader,
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
              },
            });

            if (meRes.ok) {
              const meData = await meRes.json();
              if (meData.shop_id) {
                shopId = String(meData.shop_id);
              }
              if (!userId && meData.user_id) {
                userId = String(meData.user_id);
              }
            }
          } catch (meErr) {
            console.warn("Could not query /users/me:", meErr);
          }
        }

        // 3. Fallback: If shopId found but not shopName, query shop details
        if (shopId && !shopName) {
          try {
            const shopDetailRes = await fetch(
              `https://openapi.etsy.com/v3/application/shops/${shopId}`,
              {
                method: "GET",
                headers: {
                  "x-api-key": apiKeyHeader,
                  "Content-Type": "application/json",
                },
              }
            );
            if (shopDetailRes.ok) {
              const sData = await shopDetailRes.json();
              shopName = sData.shop_name || "";
              activeListings = sData.listing_active_count ?? activeListings;
            }
          } catch {}
        }

        // 4. Fallback: If shopName was entered in session and shopId still empty, search by shopName
        if (!shopId && session.shopName) {
          try {
            const findRes = await fetch(
              `https://openapi.etsy.com/v3/application/shops?shop_name=${encodeURIComponent(session.shopName)}`,
              {
                method: "GET",
                headers: {
                  "x-api-key": apiKeyHeader,
                  "Content-Type": "application/json",
                },
              }
            );
            if (findRes.ok) {
              const findData = await findRes.json();
              const foundShop = findData.results?.[0];
              if (foundShop?.shop_id) {
                shopId = String(foundShop.shop_id);
                shopName = foundShop.shop_name || session.shopName;
                activeListings = foundShop.listing_active_count ?? 0;
              }
            }
          } catch {}
        }

        // Clean up session
        if (state) {
          etsyOAuthSessions.delete(state);
        }

        // Mark exchange success if token was obtained
        exchangeSuccess = true;
      }
    } catch (e: any) {
      exchangeError = e.message || "Failed to exchange token with Etsy.";
    }
  }

  const resultPayload = {
    exchangeSuccess,
    apiKey: session?.apiKey || "",
    sharedSecret: session?.sharedSecret || "",
    accessToken,
    refreshToken,
    userId,
    shopId,
    shopName,
    activeListings,
    error: exchangeError,
  };

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Etsy Connection - FlipOS</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      background: #f8fafc;
      color: #0f172a;
      padding: 20px;
    }
    .card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      padding: 32px 24px;
      max-width: 460px;
      width: 100%;
      text-align: center;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05);
    }
    .icon {
      width: 56px;
      height: 56px;
      border-radius: 50%;
      margin: 0 auto 16px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .icon-success { background: #ecfdf5; color: #059669; }
    .icon-amber { background: #fffbeb; color: #d97706; }
    .icon-error { background: #fef2f2; color: #dc2626; }
    h1 { font-size: 1.25rem; font-weight: 700; margin-bottom: 8px; color: #0f172a; }
    p { font-size: 0.875rem; color: #64748b; line-height: 1.5; margin-bottom: 18px; }
    .shop-pill {
      display: inline-block;
      background: #fff7ed;
      border: 1px solid #fdba74;
      color: #9a3412;
      padding: 6px 14px;
      border-radius: 9999px;
      font-size: 0.85rem;
      font-weight: 600;
      margin-bottom: 18px;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 10px 18px;
      border-radius: 8px;
      font-size: 0.875rem;
      font-weight: 600;
      text-decoration: none;
      cursor: pointer;
      border: none;
      width: 100%;
      margin-top: 8px;
    }
    .btn-primary { background: #ea580c; color: #ffffff; }
    .btn-primary:hover { background: #c2410c; }
    .btn-secondary { background: #f1f5f9; color: #334155; }
    .btn-secondary:hover { background: #e2e8f0; }
    .form-group { text-align: left; margin-bottom: 14px; }
    label { display: block; font-size: 0.75rem; font-weight: 600; margin-bottom: 4px; color: #334155; }
    input {
      width: 100%;
      padding: 8px 12px;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      font-size: 0.875rem;
      outline: none;
    }
    input:focus { border-color: #ea580c; box-shadow: 0 0 0 2px rgba(234, 88, 12, 0.15); }
    .helper-text { font-size: 0.7rem; color: #64748b; margin-top: 3px; }
  </style>
</head>
<body>
  <div class="card" id="cardContainer">
    ${
      exchangeSuccess && shopId
        ? `<div class="icon icon-success">
             <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
           </div>
           <h1>Etsy Shop Connected!</h1>
           <div class="shop-pill">Shop: ${shopName || "Verified"} (ID: ${shopId})</div>
           <p>Your Etsy account is linked to FlipOS. You can now sync active listings and import sales with exact fees.</p>
           <button class="btn btn-primary" onclick="closePopup()">Close & Return to FlipOS</button>`
        : exchangeSuccess && !shopId
        ? `<div class="icon icon-amber">
             <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
           </div>
           <h1>Almost Connected!</h1>
           <p>Your Etsy account is authenticated (User ID: <strong>${userId || "Active"}</strong>), but we need your Shop Name to complete the link.</p>
           <div class="form-group">
             <label for="inputShopName">Etsy Shop Name</label>
             <input type="text" id="inputShopName" placeholder="e.g. VintageHaven" value="${shopName}" />
             <div class="helper-text">Enter the public name of your Etsy shop.</div>
           </div>
           <div class="form-group" id="secretGroup" style="${session?.sharedSecret ? 'display:none;' : ''}">
             <label for="inputSecret">Etsy Shared Secret (from Developer Portal)</label>
             <input type="text" id="inputSecret" placeholder="Paste your Etsy Shared Secret" value="${session?.sharedSecret || ''}" />
             <div class="helper-text">Found under "Your Apps" right next to Keystring.</div>
           </div>
           <button class="btn btn-primary" id="btnConfirmShop" onclick="confirmShop()">Confirm Shop & Complete Link</button>
           <button class="btn btn-secondary" onclick="closePopup()">Cancel</button>`
        : `<div class="icon icon-error">
             <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
           </div>
           <h1>Connection Failed</h1>
           <p>${exchangeError || "Could not complete Etsy authorization."}</p>
           <button class="btn btn-secondary" onclick="closePopup()">Close Window</button>`
    }
  </div>

  <script>
    var payload = ${JSON.stringify(resultPayload)};

    function notifySuccess(data) {
      try {
        var config = {
          keystring: data.apiKey,
          apiKey: data.apiKey,
          sharedSecret: data.sharedSecret || "",
          shopId: String(data.shopId),
          shopName: data.shopName || "",
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
          isConnected: true
        };
        localStorage.setItem('resellerEtsyConfig', JSON.stringify(config));
        window.dispatchEvent(new StorageEvent('storage', {
          key: 'resellerEtsyConfig',
          newValue: JSON.stringify(config),
          storageArea: localStorage
        }));
      } catch (e) {}

      try {
        var bc = new BroadcastChannel('etsy_oauth_channel');
        bc.postMessage({ type: 'ETSY_AUTH_SUCCESS', data: data });
      } catch (e) {}

      if (window.opener) {
        try {
          window.opener.postMessage({ type: 'ETSY_AUTH_SUCCESS', data: data }, '*');
        } catch (e) {}
      }
    }

    function closePopup() {
      window.close();
    }

    // If fully connected with shopId, broadcast immediately so FlipOS updates in the background
    if (payload.exchangeSuccess && payload.shopId) {
      notifySuccess(payload);
    } else if (payload.error && !payload.exchangeSuccess) {
      if (window.opener) {
        try {
          window.opener.postMessage({ type: 'ETSY_AUTH_ERROR', error: payload.error }, '*');
        } catch (e) {}
      }
    }

    async function confirmShop() {
      var sName = document.getElementById('inputShopName').value.trim();
      var sSecret = document.getElementById('inputSecret') ? document.getElementById('inputSecret').value.trim() : '';
      var btn = document.getElementById('btnConfirmShop');

      if (!sName) {
        alert('Please enter your Etsy Shop Name.');
        return;
      }

      btn.disabled = true;
      btn.innerText = 'Locating shop...';

      try {
        var effectiveSecret = sSecret || payload.sharedSecret || '';
        var res = await fetch('/api/etsy/find-shop', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            apiKey: payload.apiKey,
            sharedSecret: effectiveSecret,
            shopName: sName
          })
        });

        var data = await res.json();
        if (!res.ok || !data.success || !data.shop) {
          throw new Error(data.error || 'Shop could not be found with this name.');
        }

        payload.shopId = String(data.shop.shopId);
        payload.shopName = data.shop.shopName;
        payload.sharedSecret = effectiveSecret;
        payload.activeListings = data.shop.listingActiveCount || 0;

        notifySuccess(payload);

        document.getElementById('cardContainer').innerHTML = 
          '<div class="icon icon-success">' +
          '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>' +
          '</div>' +
          '<h1>Etsy Shop Connected!</h1>' +
          '<div class="shop-pill">Shop: ' + payload.shopName + ' (ID: ' + payload.shopId + ')</div>' +
          '<p>Your Etsy shop is successfully linked to FlipOS. You can now close this window.</p>' +
          '<button class="btn btn-primary" onclick="closePopup()">Close & Return to FlipOS</button>';
      } catch (err) {
        alert(err.message);
        btn.disabled = false;
        btn.innerText = 'Confirm Shop & Complete Link';
      }
    }
  </script>
</body>
</html>`;

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
    },
  });
}
