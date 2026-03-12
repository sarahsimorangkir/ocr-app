// lib/ocr/enseval-surat-jalan-extractor.ts
// OCR extraction logic for PT. Enseval Putera Megatrading TBK - Surat Jalan

import { EnsevalSuratJalan, emptyEnsevalSuratJalan } from "@/types/enseval-surat-jalan";

const MODEL = "google/gemini-3-flash-preview";

export function buildEnsevalSuratJalanPrompt(): string {
    return `You are an expert OCR system specializing in Indonesian logistics documents.

This image is a "SURAT JALAN" from PT. Enseval Putera Megatrading TBK.
The document contains both printed text and handwritten/stamped signatures. Extract ALL values carefully.

Return ONLY a valid JSON object with this EXACT structure. Do not include markdown, backticks, or explanations.

{
  "pengirim": {
    "nama": "sender company name e.g. PT. ENSEVAL PUTERA MEGATRADING TBK.",
    "cabang": "branch name e.g. RDC JAKARTA",
    "alamat": "street address e.g. Jl. Rawa Gelam IV No. 6",
    "kawasan": "area/kawasan e.g. Kawasan Industri Pulo Gadung",
    "kota": "city and postal code e.g. JAKARTA 13930"
  },
  "penerima": {
    "tanggal": "date top right e.g. 03-Nov-2025",
    "nama": "recipient company name e.g. PT (MGD) DHARMA BANDAR MANDALA",
    "alamat": "recipient address",
    "kota": "recipient city"
  },
  "no_surat_jalan": "document number after 'No :' e.g. 202533588",
  "shiplist": [
    {
      "kemasan": "packaging type e.g. DOOS",
      "jumlah_koli": 1.0,
      "berat_kg": 0.30,
      "volume_m3": 0.01,
      "keterangan": "notes e.g. PHM or null"
    }
  ],
  "total": {
    "jumlah_koli": 1,
    "terbilang_koli": "written total e.g. SATU",
    "berat_kg": 0.30,
    "volume_m3": 0.01
  },
  "pengiriman": {
    "via": "transport mode e.g. Udara",
    "no_kendaraan": "vehicle number or null",
    "no_segel": "seal number or null",
    "no_container": "container number or null",
    "perhitungan": "calculation code e.g. XKGU01-PER KG/UDARA",
    "shiplist_no": "shiplist number e.g. 113274313",
    "keterangan": "notes e.g. MAY 965097"
  },
  "tujuan": {
    "nama": "destination company name e.g. PT. EPM BANDA ACEH",
    "alamat": "destination address",
    "kota": "destination city e.g. ACEH BESAR",
    "negara": "country e.g. INDONESIA"
  },
  "signatories": {
    "penerima_cab": {
      "nama": "printed/written name or null",
      "ttd": true,
      "tanggal": "date if visible or null"
    },
    "manager_ass_mgr": {
      "nama": "printed/written name or null",
      "ttd": true,
      "tanggal": "date if visible or null"
    },
    "expeditur": {
      "nama": "printed/written name or null",
      "ttd": true,
      "tanggal": "date if visible or null"
    },
    "adm_dist_desp_supv": {
      "nama": "printed/written name or null",
      "ttd": true,
      "tanggal": "date if visible or null"
    }
  },
  "claim": "YA or TIDAK or null based on what is marked",
  "cetak": "time after 'Cetak:' e.g. 15:10:51"
}

Important rules:
- jumlah_koli in shiplist and total must be numbers (not strings)
- berat_kg and volume_m3 must be floats
- ttd must be true if there is any signature/stamp present, false if blank
- For empty/blank fields use null
- Extract ALL rows in the shiplist table
- Return ONLY the JSON — no other text`;
}

// ─────────────────────────────────────────────
// API Caller
// ─────────────────────────────────────────────

export async function extractEnsevalSuratJalan(
    imageBase64: string | string[]
): Promise<EnsevalSuratJalan> {
    const apiKey = process.env.OPENROUTER_API_KEY!;

    const images = Array.isArray(imageBase64) ? imageBase64 : [imageBase64];

    const imageContent = images.map((img) => ({
        type: "image_url",
        image_url: { url: `data:image/png;base64,${img}` },
    }));

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer": "http://localhost:3000",
        },
        body: JSON.stringify({
            model: MODEL,
            max_tokens: 4096,
            messages: [
                {
                    role: "user",
                    content: [
                        ...imageContent,
                        {
                            type: "text",
                            text: buildEnsevalSuratJalanPrompt(),
                        },
                    ],
                },
            ],
        }),
    });

    if (!response.ok) {
        throw new Error(`OpenRouter error: ${await response.text()}`);
    }

    const data = await response.json();
    const rawText: string = data.choices[0].message.content;

    try {
        const cleaned = rawText.replace(/```json|```/g, "").trim();
        return JSON.parse(cleaned) as EnsevalSuratJalan;
    } catch {
        console.error("Failed to parse Enseval Surat Jalan JSON:", rawText);
        return {
            ...emptyEnsevalSuratJalan,
            no_surat_jalan: `[OCR parse error] Raw: ${rawText.slice(0, 200)}`,
        };
    }
}