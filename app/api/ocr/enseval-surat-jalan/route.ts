import { NextRequest, NextResponse } from "next/server";
import { extractEnsevalSuratJalan } from "@/lib/ocr/enseval-surat-jalan-extractor";
import { storeDocument } from "@/lib/store-document";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
    try {
        const body = await request.text();
        const { imageBase64, store } = JSON.parse(body);

        if (!imageBase64) {
            return NextResponse.json({ error: "No image provided" }, { status: 400 });
        }

        const result = await extractEnsevalSuratJalan(imageBase64);

        let pineconeId: string | null = null;
        if (store) {
            pineconeId = await storeDocument("enseval-surat-jalan", result);
        }

        return NextResponse.json({ success: true, data: result, pineconeId });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}