import { NextRequest, NextResponse } from "next/server";
import { extractLotteMartDelivery } from "@/lib/ocr/lotte-mart-delivery-extractor";
import { storeDocument } from "@/lib/store-document";
import { storage } from "@/lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { v4 as uuidv4 } from "uuid";

export const dynamic = "force-dynamic";

async function uploadToFirebaseServer(base64: string, filename: string): Promise<string> {
  try {
    // 1. Convert base64 to Uint8Array (compatible with client SDK on server)
    const buffer = Buffer.from(base64, "base64");
    const uint8Array = new Uint8Array(buffer);
    
    // 2. Reference the storage path
    const storageRef = ref(storage, `ocr-images/${uuidv4()}-${filename}`);
    
    console.log(`[Firebase Upload] Starting: ${filename} to bucket ${storageRef.bucket}`);
    
    // 3. Upload with explicit content type
    const uploadResult = await uploadBytes(storageRef, uint8Array, { 
      contentType: "image/png" 
    });
    
    console.log(`[Firebase Upload] Success: ${uploadResult.metadata.fullPath}`);
    
    // 4. Get the public download URL
    return await getDownloadURL(storageRef);
  } catch (error: any) {
    console.error(`[Firebase Upload Error] For ${filename}:`, error);
    
    // Provide more specific error info if it's available
    if (error.code === 'storage/unauthorized') {
      throw new Error("Firebase Storage Permission Denied. Check your security rules.");
    }
    
    throw new Error(`Firebase Storage Error: ${error.message || error.code || "Unknown Error"}`);
  }
}

export async function POST(request: NextRequest) {
  try {
    // 1. Read the JSON body
    const body = await request.json();
    const { imageBase64, store } = body;

    if (!imageBase64) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 });
    }

    const imageArray = Array.isArray(imageBase64) ? imageBase64 : [imageBase64];
    
    // 2. Upload images to Firebase from the server to bypass client CORS
    console.log(`[OCR Route] Processing ${imageArray.length} pages...`);
    
    const imageUrls = await Promise.all(
      imageArray.map((b64, idx) => uploadToFirebaseServer(b64, `page-${idx+1}.png`))
    );
    
    console.log("[OCR Route] All images uploaded to Firebase.");

    // 3. Perform the actual extraction using the Firebase URLs
    const result = await extractLotteMartDelivery(imageArray, imageUrls);

    // 4. Optionally store in Pinecone
    let pineconeId: string | null = null;
    if (store) {
      pineconeId = await storeDocument("lotte-mart-delivery", result);
    }

    return NextResponse.json({ success: true, data: result, pineconeId });

  } catch (error: any) {
    console.error("[OCR Route Error]:", error);
    const message = error.message || "Unknown error occurred";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
