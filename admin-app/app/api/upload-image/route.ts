import { NextResponse, type NextRequest } from "next/server";
import { pinata } from "@/utils/config";
import { randomUUID } from "crypto";

export async function POST(request: NextRequest) {
  try {
    const { imageUrl } = await request.json();
    
    if (!imageUrl || typeof imageUrl !== "string") {
      return NextResponse.json(
        { error: "Invalid imageUrl parameter" },
        { status: 400 }
      );
    }

    console.log("[UPLOAD] Downloading image from:", imageUrl);
    
    // Download the image server-side (no CORS issues)
    const imageResponse = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ImageUploader/1.0)'
      }
    });

    if (!imageResponse.ok) {
      console.error("[UPLOAD] Failed to download image:", imageResponse.status, imageResponse.statusText);
      return NextResponse.json(
        { error: `Failed to download image: ${imageResponse.status} ${imageResponse.statusText}` },
        { status: imageResponse.status }
      );
    }

    const blob = await imageResponse.blob();
    const arrayBuffer = await blob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    console.log("[UPLOAD] Uploading to Pinata...");
    
    // Generate UUID for filename
    const imageUuid = randomUUID();
    const filename = `${imageUuid}.png`;
    
    // Upload to Pinata
    const file = new File([buffer], filename, { type: blob.type || "image/png" });
    const { cid } = await pinata.upload.public.file(file);
    const pinataUrl = await pinata.gateways.public.convert(cid);
    
    console.log("[UPLOAD] ✓ Successfully uploaded to Pinata:", pinataUrl);
    
    return NextResponse.json({ url: pinataUrl }, { status: 200 });
  } catch (e) {
    console.error("[UPLOAD] Error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}

