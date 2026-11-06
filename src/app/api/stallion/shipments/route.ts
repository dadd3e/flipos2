import { NextRequest, NextResponse } from "next/server";

const STALLION_BASE_URL = "https://ship.stallion.ca/api/v5";

async function fetchStallion(url: string, token: string, retry = true): Promise<any> {
  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${token.trim()}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    let errCode = "";
    let errMessage = `Stallion API request failed with status ${response.status}`;
    try {
      const errData = await response.json();
      if (errData?.error) {
        errCode = errData.error.code || "";
        errMessage = errData.error.message || errMessage;
      }
    } catch {
      // ignore
    }

    if (errCode === "too_many_requests" && retry) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      return fetchStallion(url, token, false);
    }

    if (errCode === "unauthenticated" || response.status === 401) {
      const err: any = new Error("Stallion authentication failed. Please verify your API token.");
      err.status = 401;
      throw err;
    }
    if (errCode === "scope_missing" || response.status === 403) {
      const err: any = new Error("Stallion API token is missing the required 'shipments:read' scope.");
      err.status = 403;
      throw err;
    }

    const err: any = new Error(errMessage || `Stallion API error (${response.status})`);
    err.status = response.status;
    throw err;
  }

  return await response.json();
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { token, testOnly, createdAfter, etsyReceiptIds } = body;

    if (!token || typeof token !== "string" || !token.trim()) {
      return NextResponse.json(
        { success: false, error: "Stallion Express API Token is required." },
        { status: 400 }
      );
    }

    const cleanToken = token.trim();

    // 1. Test Connection mode
    if (testOnly) {
      const testData = await fetchStallion(`${STALLION_BASE_URL}/shipments?per_page=1`, cleanToken);
      return NextResponse.json({
        success: true,
        message: "Successfully connected to Stallion Express API.",
        count: Array.isArray(testData?.data) ? testData.data.length : 0,
      });
    }

    const toStallionDate = (d: Date) => d.toISOString().replace(/\.\d{3}Z$/, "+00:00");

    // 2. Fetch Shipments mode
    const parsedDate = createdAfter ? new Date(createdAfter) : null;
    const effectiveCreatedAfter = parsedDate && !isNaN(parsedDate.getTime())
      ? toStallionDate(parsedDate)
      : toStallionDate(new Date(Date.now() - 90 * 24 * 60 * 60 * 1000));

    let allShipments: any[] = [];
    let page = 1;
    const maxPages = 10;
    let totalShipmentsFetched = 0;

    while (page <= maxPages) {
      const params = new URLSearchParams({
        page: String(page),
        per_page: "100",
        created_after: effectiveCreatedAfter,
      });
      const url = `${STALLION_BASE_URL}/shipments?${params.toString()}`;
      const data = await fetchStallion(url, cleanToken);
      const items = Array.isArray(data?.data) ? data.data : [];
      totalShipmentsFetched += items.length;
      allShipments.push(...items);

      const lastPage = data?.meta?.last_page || 1;
      if (page >= lastPage || items.length === 0) {
        break;
      }
      page++;
    }

    // Extract up to 3 sample order_ids
    const sampleShipmentOrderIds: string[] = [];
    for (const ship of allShipments) {
      if (ship.order_id !== null && ship.order_id !== undefined) {
        const strId = String(ship.order_id).trim();
        if (strId && !sampleShipmentOrderIds.includes(strId)) {
          sampleShipmentOrderIds.push(strId);
          if (sampleShipmentOrderIds.length >= 3) break;
        }
      }
    }

    // Normalize helper
    const normalizeId = (val: any) => String(val || "").trim().replace(/^#/, "");

    // Filter out voided or unpaid shipments
    const validShipments = allShipments.filter((s) => {
      if (s.status === "voided") return false;
      if (s.total_paid === null || s.total_paid === undefined) return false;
      return true;
    });

    const targetReceiptMap = new Map<string, string | number>();
    if (Array.isArray(etsyReceiptIds)) {
      for (const id of etsyReceiptIds) {
        if (id !== null && id !== undefined) {
          targetReceiptMap.set(normalizeId(id), id);
        }
      }
    }

    const matchesMap = new Map<
      string,
      {
        receiptId: string | number;
        shipmentIds: string[];
        shipCodes: string[];
        orderIds: string[];
        trackingNumbers: string[];
        services: string[];
        totalPaid: number;
      }
    >();

    for (const shipment of validShipments) {
      if (shipment.order_id === null || shipment.order_id === undefined) continue;
      const normOrder = normalizeId(shipment.order_id);
      if (targetReceiptMap.has(normOrder)) {
        const origReceiptId = targetReceiptMap.get(normOrder)!;
        const paidVal = typeof shipment.total_paid === "number"
          ? shipment.total_paid
          : (parseFloat(shipment.total_paid) || 0);

        if (!matchesMap.has(normOrder)) {
          matchesMap.set(normOrder, {
            receiptId: origReceiptId,
            shipmentIds: [String(shipment.id)],
            shipCodes: shipment.ship_code ? [String(shipment.ship_code)] : [],
            orderIds: shipment.order_id ? [String(shipment.order_id)] : [],
            trackingNumbers: shipment.tracking_number ? [String(shipment.tracking_number)] : [],
            services: shipment.service ? [String(shipment.service)] : [],
            totalPaid: paidVal,
          });
        } else {
          const existing = matchesMap.get(normOrder)!;
          existing.shipmentIds.push(String(shipment.id));
          if (shipment.ship_code) existing.shipCodes.push(String(shipment.ship_code));
          if (shipment.order_id) existing.orderIds.push(String(shipment.order_id));
          if (shipment.tracking_number) existing.trackingNumbers.push(String(shipment.tracking_number));
          if (shipment.service) existing.services.push(String(shipment.service));
          existing.totalPaid = parseFloat((existing.totalPaid + paidVal).toFixed(2));
        }
      }
    }

    const matches = Array.from(matchesMap.values()).map((m) => ({
      receiptId: m.receiptId,
      shipmentId: m.shipmentIds.join(", "),
      shipCode: m.shipCodes.join(", "),
      orderId: m.orderIds.join(", "),
      trackingNumber: m.trackingNumbers.join(", "),
      service: m.services.join(", "),
      totalPaid: parseFloat(m.totalPaid.toFixed(2)),
    }));

    const matchedSales = matches.length;
    const unmatchedSales = Math.max(0, targetReceiptMap.size - matchedSales);

    return NextResponse.json({
      success: true,
      matches,
      stats: {
        shipmentsFetched: totalShipmentsFetched,
        matchedSales,
        unmatchedSales,
        sampleShipmentOrderIds,
      },
    });
  } catch (error: any) {
    const status = error.status || 500;
    return NextResponse.json(
      { success: false, error: error.message || "Failed to process Stallion API request." },
      { status }
    );
  }
}
