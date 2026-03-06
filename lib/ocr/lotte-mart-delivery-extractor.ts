// lib/ocr/lotte-mart-delivery-extractor.ts

import { LotteMartDelivery, emptyLotteMartDelivery } from "@/types/lotte-mart-delivery";

const MODEL = "google/gemini-2.0-flash-001"; // Highly capable OCR model

// ─────────────────────────────────────────────
// Specialized Prompts
// ─────────────────────────────────────────────

export function buildGreenReceiptPrompt(): string {
  return `You are an AI OCR agent. This is a "Green Receipt" from a delivery.
  Extract the following information:
  - Delivery Date
  - Total Amount/Fee (if visible)
  
  Return ONLY JSON:
  {
    "delivery_date": "DD-MMM-YYYY",
    "delivery_fee": 0
  }`;
}

export function buildPinkDanexPrompt(): string {
  return `You are an AI OCR agent specializing in Indonesian logistics. This is a "Pink Danex" document (Page 2).
  
  CRITICAL EXTRACTION RULES:
  1. Mostrans Trip ID: Look for handwritten "trip", "+rip", or an 11-digit number in the top-right. Format: "TRIP-xxxxxxxxxxx".
  2. Mostrans Order ID: Handwritten alphanumeric pattern (e.g., LGL2602070005) in center-right.
  3. Resi Number: Look for AWB or No Resi.
  4. Origin & Destination City: Extract ONLY the Indonesian city names.

  Return ONLY JSON:
  {
    "id_trip_mostrans": "TRIP-xxxxxxxxxxx",
    "id_order": "...",
    "resi_number": "...",
    "origin": "...",
    "destination": "..."
  }`;
}

export function buildLotteSJPrompt(): string {
  return `You are an AI OCR agent specializing in Indonesian retail logistics. 
  This is a LOTTE MART "Surat Jalan" (Delivery Note).
  
  Extract the header info, references (vehicle and driver), the complete table of items, and signatories.
  
  Return ONLY JSON:
  {
    "header": {
      "document_no": "...",
      "date": "...",
      "store": { "name": "...", "code": "...", "address": "...", "city": "..." },
      "sender": { "name": "PT. LOTTE SHOPPING INDONESIA", "address": "...", "city": "..." }
    },
    "references": {
      "vehicle_no": "...",
      "driver_name": "...",
      "po_no": "...",
      "so_no": "..."
    },
    "items": [
      { "item_code": "...", "description": "...", "quantity_ordered": 0, "quantity_delivered": 0, "uom": "...", "remarks": "..." }
    ],
    "totals": { "total_quantity": 0, "total_items": 0 },
    "signatories": {
      "prepared_by": { "nama": "...", "tanggal": "...", "jabatan": "..." },
      "driver": { "nama": "...", "tanggal": "...", "jabatan": "..." },
      "received_by": { "nama": "...", "tanggal": "...", "jabatan": "..." }
    }
  }`;
}

// ─────────────────────────────────────────────
// Helper: Call OpenRouter
// ─────────────────────────────────────────────

async function callOpenRouter(
  images: string[], 
  prompt: string,
  isUrl: boolean = false
): Promise<any> {
  const apiKey = process.env.OPENROUTER_API_KEY!;
  const messageContent: any[] = images.map((img) => ({
    type: "image_url",
    image_url: { url: isUrl ? img : `data:image/png;base64,${img}` },
  }));
  messageContent.push({ type: "text", text: prompt });

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 4000,
      temperature: 0.1,
      messages: [{ role: "user", content: messageContent }],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenRouter error ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  const rawText: string = data.choices[0].message.content;
  try {
    const cleaned = rawText.replace(/```json|```/g, "").trim();
    return JSON.parse(cleaned);
  } catch {
    console.error("JSON parse failed for response:", rawText);
    return null;
  }
}

// ─────────────────────────────────────────────
// Main API Caller
// ─────────────────────────────────────────────

export async function extractLotteMartDelivery(
  imagesBase64: string | string[],
  imageUrls?: string[]
): Promise<LotteMartDelivery> {
  const imageArray = Array.isArray(imagesBase64) ? imagesBase64 : [imagesBase64];
  const urlArray = imageUrls || [];
  const useUrls = urlArray.length > 0;
  const sourceArray = useUrls ? urlArray : imageArray;

  let greenData: any = null;
  let pinkData: any = null;
  let sjData: any = null;

  try {
    if (sourceArray.length >= 3) {
      const [g, p, s] = await Promise.all([
        callOpenRouter([sourceArray[0]], buildGreenReceiptPrompt(), useUrls),
        callOpenRouter([sourceArray[1]], buildPinkDanexPrompt(), useUrls),
        callOpenRouter(sourceArray.slice(2), buildLotteSJPrompt(), useUrls),
      ]);
      greenData = g;
      pinkData = p;
      sjData = s;
    } else if (sourceArray.length === 2) {
      const [p, s] = await Promise.all([
        callOpenRouter([sourceArray[0]], buildPinkDanexPrompt(), useUrls),
        callOpenRouter([sourceArray[1]], buildLotteSJPrompt(), useUrls),
      ]);
      pinkData = p;
      sjData = s;
    } else if (sourceArray.length === 1) {
      sjData = await callOpenRouter([sourceArray[0]], buildLotteSJPrompt(), useUrls);
    }
  } catch (error) {
    console.error("OCR extraction failed:", error);
  }

  const result: LotteMartDelivery = {
    ...emptyLotteMartDelivery,
    header: {
      ...emptyLotteMartDelivery.header,
      ...(sjData?.header || {}),
      date: sjData?.header?.date || greenData?.delivery_date || null,
    },
    references: {
      ...emptyLotteMartDelivery.references,
      ...(sjData?.references || {}),
      ...(pinkData || {}),
    },
    items: sjData?.items || [],
    totals: sjData?.totals || { total_quantity: null, total_items: null },
    signatories: sjData?.signatories || emptyLotteMartDelivery.signatories,
    note: greenData?.delivery_fee ? `Verified Delivery Fee: ${greenData.delivery_fee}` : null,
  };

  return result;
}
