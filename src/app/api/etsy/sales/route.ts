import { NextRequest, NextResponse } from "next/server";
import type { Sale } from "@/lib/types";
import { refreshEtsyToken } from "@/lib/etsyHelper";
import { cleanQuotes } from "@/lib/utils";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const keystring = body.keystring || body.apiKey;
    const sharedSecret = body.sharedSecret;
    const { shopId, minCreatedTimestamp } = body;
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

    if (!accessToken?.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: "An Etsy OAuth Access Token with 'transactions_r' scope is required to fetch sales and receipt data from Etsy. Please log in with Etsy under the Connect tab.",
          needsAuthToken: true,
        },
        { status: 401 }
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
      "Authorization": `Bearer ${accessToken.trim()}`,
      "Content-Type": "application/json",
    };

    let receiptsUrl = `https://openapi.etsy.com/v3/application/shops/${cleanShopId}/receipts?was_paid=true&limit=100&includes=Transactions,Payments`;
    if (minCreatedTimestamp) {
      receiptsUrl += `&min_created=${Math.floor(Number(minCreatedTimestamp))}`;
    }

    let response = await fetch(receiptsUrl, {
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
          response = await fetch(receiptsUrl, {
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
    const receipts = data.results || [];

    const sales: Partial<Sale>[] = [];

    // Collect all transactions to fetch photos
    const allTransactions: any[] = [];
    for (const receipt of receipts) {
      if (receipt.transactions && Array.isArray(receipt.transactions)) {
        allTransactions.push(...receipt.transactions);
      }
    }

    // Map to cache image URLs: key can be `${listing_id}_${image_id}` or `${listing_id}`
    const imageCache = new Map<string, string>();
    const pendingImageLookups: { listingId: number; imageId?: number }[] = [];

    for (const tx of allTransactions) {
      if (tx.listing_id) {
        const cacheKey = `${tx.listing_id}_${tx.listing_image_id || 0}`;
        if (!imageCache.has(cacheKey) && !pendingImageLookups.some(p => p.listingId === tx.listing_id && p.imageId === tx.listing_image_id)) {
          pendingImageLookups.push({ listingId: tx.listing_id, imageId: tx.listing_image_id });
        }
      }
    }

    // Fetch primary images in batches of 6
    const batchSize = 6;
    for (let i = 0; i < pendingImageLookups.length; i += batchSize) {
      const batch = pendingImageLookups.slice(i, i + batchSize);
      await Promise.allSettled(
        batch.map(async ({ listingId, imageId }) => {
          const cacheKey = `${listingId}_${imageId || 0}`;
          try {
            // First try with imageId if available
            let imgUrl: string | undefined = undefined;
            if (imageId) {
              const res = await fetch(
                `https://openapi.etsy.com/v3/application/listings/${listingId}/images/${imageId}`,
                { method: "GET", headers }
              );
              if (res.ok) {
                const imgData = await res.json();
                imgUrl = imgData.url_570xN || imgData.url_fullxfull || imgData.url_170x135;
              }
            }

            // Fallback: query listing images list
            if (!imgUrl) {
              const res = await fetch(
                `https://openapi.etsy.com/v3/application/listings/${listingId}/images`,
                { method: "GET", headers }
              );
              if (res.ok) {
                const imgData = await res.json();
                const firstImg = imgData?.results?.[0];
                if (firstImg) {
                  imgUrl = firstImg.url_570xN || firstImg.url_fullxfull || firstImg.url_170x135;
                }
              }
            }

            if (imgUrl) {
              imageCache.set(cacheKey, imgUrl);
              imageCache.set(`${listingId}`, imgUrl);
            }
          } catch {
            // Non-blocking error for individual images
          }
        })
      );
    }

    for (const receipt of receipts) {
      // Calculate receipt-level buyer shipping and taxes
      const receiptShippingCharged = receipt.total_shipping_cost?.amount
        ? receipt.total_shipping_cost.amount / (receipt.total_shipping_cost.divisor || 100)
        : 0;

      const receiptTaxes = receipt.total_tax_cost?.amount
        ? receipt.total_tax_cost.amount / (receipt.total_tax_cost.divisor || 100)
        : 0;

      // Extract fees provided by Etsy API (via payments ledger)
      let receiptTotalFees = 0;
      if (receipt.payments && Array.isArray(receipt.payments) && receipt.payments.length > 0) {
        const payment = receipt.payments[0];
        const feeAmount = payment.amount_fees || payment.posted_fees;
        if (feeAmount?.amount) {
          receiptTotalFees = Math.abs(feeAmount.amount / (feeAmount.divisor || 100));
        }
      }

      const transactions = receipt.transactions || [];
      const numTransactions = transactions.length || 1;

      // Sale date from creation_timestamp
      const saleDate = receipt.created_timestamp
        ? new Date(receipt.created_timestamp * 1000).toISOString()
        : new Date().toISOString();

      if (transactions.length === 0) {
        // Fallback for receipt with no line items expanded
        const subtotal = receipt.subtotal?.amount
          ? receipt.subtotal.amount / (receipt.subtotal.divisor || 100)
          : receipt.grandtotal?.amount
          ? receipt.grandtotal.amount / (receipt.grandtotal.divisor || 100)
          : 0;

        // If fees were not directly provided, use standard Etsy fee formula:
        const fees = receiptTotalFees > 0
          ? receiptTotalFees
          : parseFloat(((subtotal + receiptShippingCharged) * 0.065 + ((subtotal + receiptShippingCharged + receiptTaxes) * 0.03 + 0.25)).toFixed(2));

        const grossSaleAmount = parseFloat((subtotal + receiptShippingCharged).toFixed(2));
        const netRevenuePreCOGS = parseFloat((grossSaleAmount - fees).toFixed(2));

        sales.push({
          id: `etsy-rec-${receipt.receipt_id}`,
          itemId: `etsy-order-${receipt.receipt_id}`,
          itemName: `Etsy Order #${receipt.receipt_id} - ${cleanQuotes(receipt.name) || 'Customer'}`,
          quantitySold: 1,
          saleDate,
          soldVia: "Etsy",
          grossSaleAmount,
          totalPlatformFeesAndDiscounts: fees,
          actualShippingCostBySeller: 0, // Manual entry needed
          needsShippingCostEntry: true,
          netRevenuePreCOGS,
          profit: netRevenuePreCOGS, // Adjusted when COGS is associated
          totalPurchaseCostOfItemSold: 0,
          etsySalePrice: subtotal,
          etsyShippingCharged: receiptShippingCharged,
          etsyTaxes: receiptTaxes,
          etsyOrderTotal: grossSaleAmount + receiptTaxes,
          etsyReceiptId: receipt.receipt_id,
          isEtsyImport: true,
        });
      } else {
        // Handle each transaction line item
        for (const tx of transactions) {
          const itemPrice = tx.price?.amount
            ? tx.price.amount / (tx.price.divisor || 100)
            : 0;
          const qty = tx.quantity || 1;
          const lineItemTotal = itemPrice * qty;

          // Split shipping charged and fees proportionally across items in receipt
          const proportionalShipping = parseFloat((receiptShippingCharged / numTransactions).toFixed(2));
          
          let lineItemFees: number;
          if (receiptTotalFees > 0) {
            lineItemFees = parseFloat((receiptTotalFees / numTransactions).toFixed(2));
          } else {
            // Standard Etsy fees: 6.5% transaction + 3% + $0.25 processing
            lineItemFees = parseFloat((
              (lineItemTotal + proportionalShipping) * 0.065 +
              ((lineItemTotal + proportionalShipping) * 0.03 + (0.25 / numTransactions))
            ).toFixed(2));
          }

          const grossSaleAmount = parseFloat((lineItemTotal + proportionalShipping).toFixed(2));
          const netRevenuePreCOGS = parseFloat((grossSaleAmount - lineItemFees).toFixed(2));

          const itemImageUrl = tx.listing_id
            ? imageCache.get(`${tx.listing_id}_${tx.listing_image_id || 0}`) || imageCache.get(`${tx.listing_id}`)
            : undefined;

          sales.push({
            id: `etsy-tx-${tx.transaction_id}`,
            itemId: tx.listing_id ? `etsy-listing-${tx.listing_id}` : `etsy-tx-${tx.transaction_id}`,
            itemName: cleanQuotes(tx.title) || `Etsy Item #${tx.listing_id || tx.transaction_id}`,
            quantitySold: qty,
            saleDate,
            soldVia: "Etsy",
            grossSaleAmount,
            totalPlatformFeesAndDiscounts: lineItemFees,
            actualShippingCostBySeller: 0, // Manual entry needed
            needsShippingCostEntry: true,
            netRevenuePreCOGS,
            profit: netRevenuePreCOGS, // Adjusted when COGS is associated
            totalPurchaseCostOfItemSold: 0,
            etsySalePrice: lineItemTotal,
            etsyShippingCharged: proportionalShipping,
            etsyTaxes: parseFloat((receiptTaxes / numTransactions).toFixed(2)),
            etsyOrderTotal: grossSaleAmount + (receiptTaxes / numTransactions),
            etsyReceiptId: receipt.receipt_id,
            etsyTransactionId: tx.transaction_id,
            etsyListingId: tx.listing_id || undefined,
            etsyUrl: tx.listing_id ? `https://www.etsy.com/listing/${tx.listing_id}` : undefined,
            itemImageUrl,
            isEtsyImport: true,
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      count: sales.length,
      sales,
      newAccessToken,
      newRefreshToken,
    });
  } catch (error: any) {
    console.error("Error fetching Etsy sales receipts:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch Etsy sales receipts." },
      { status: 500 }
    );
  }
}
