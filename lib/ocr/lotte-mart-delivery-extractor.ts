// lib/ocr/lotte-mart-delivery-extractor.ts
// OCR extraction logic for Lotte Mart - Delivery Note / Surat Jalan

import { LotteMartDelivery, emptyLotteMartDelivery } from "@/types/lotte-mart-delivery";

const MODEL = "google/gemini-3-flash-preview"; 

// ─────────────────────────────────────────────
// The Prompt
// ─────────────────────────────────────────────

export function buildLotteMartDeliveryPrompt(): string {
  return `You are an expert OCR system specializing in Indonesian retail logistics documents.

This image is a "Delivery Note" or "Surat Jalan" from LOTTE MART / LOTTE SHOPPING INDONESIA.
It typically contains store branch info, reference numbers (PO/SO), and a detailed table of items with PLU/SKU codes.
Extract ALL fields carefully, especially all rows in the items table.

Return ONLY a valid JSON object with this EXACT structure. Do not include markdown, backticks, or explanations.

{
  "header": {
    "document_no": "No. Surat Jalan or similar e.g. SJ-001",
    "date": "Document date e.g. 25-Oct-2023",
    "store": {
      "name": "Store/Branch name e.g. LOTTE GROSIR PASAR REBO",
      "code": "Store code if any e.g. 001",
      "address": "Store address if listed"
    },
    "sender": {
      "name": "PT. LOTTE SHOPPING INDONESIA or similar",
      "address": "Sender address if listed"
    }
  },
  "references": {
    "po_no": "Purchase Order Number e.g. PO-882711",
    "so_no": "Sales Order Number e.g. SO-112233",
    "vehicle_no": "License plate number e.g. B 1234 ABC",
    "driver_name": "Name of the driver"
  },
  "items": [
    {
      "item_code": "PLU, SKU, or Barcode e.g. 880101",
      "description": "Full product name e.g. Indomie Goreng Spesial 85g",
      "quantity_ordered": 40,
      "quantity_delivered": 40,
      "uom": "Unit e.g. PCS, CTN, BOX",
      "remarks": "Any notes for this item"
    }
  ],
  "totals": {
    "total_quantity": 40,
    "total_items": 1
  },
  "signatories": {
    "prepared_by": { "nama": "Admin name", "tanggal": "date", "jabatan": "e.g. Admin" },
    "driver": { "nama": "Driver name", "tanggal": "date", "jabatan": "e.g. Driver" },
    "received_by": { "nama": "Receiver name", "tanggal": "date", "jabatan": "e.g. Receiver/Store Stamp" }
  },
  "note": "Any additional notes listed on the document"
}

Important rules:
- items must be an array — extract EVERY row in the table
- quantity_ordered, quantity_delivered, total_quantity, total_items must be integers
- For empty/blank fields use null
- Return ONLY the JSON — no other text`;
}

// ─────────────────────────────────────────────
// API Caller
// ─────────────────────────────────────────────

export async function extractLotteMartDelivery(
  imageBase64: string
): Promise<LotteMartDelivery> {
  const apiKey = process.env.OPENROUTER_API_KEY!;

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "http://localhost:3000",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 2048,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: { url: `data:image/png;base64,${imageBase64}` },
            },
            { type: "text", text: buildLotteMartDeliveryPrompt() },
          ],
        },
      ],
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
    return JSON.parse(cleaned) as LotteMartDelivery;
  } catch {
    console.error("JSON parse failed, raw text:", rawText);
    return {
      ...emptyLotteMartDelivery,
      note: `[OCR parse error] Raw: ${rawText.slice(0, 200)}`,
    };
  }
}
