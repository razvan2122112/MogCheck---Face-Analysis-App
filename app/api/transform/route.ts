import * as fal from "@fal-ai/serverless-client";
import { NextRequest, NextResponse } from "next/server";

fal.config({ credentials: process.env.FAL_KEY });

const TRANSFORM_PROMPT =
  "same person, handsome, clear skin, sharp jawline, well-groomed beard, confident, photorealistic, professional photo";

export async function POST(req: NextRequest) {
  try {
    const { image } = (await req.json()) as { image: string };
    if (!image) {
      return NextResponse.json({ error: "Missing image" }, { status: 400 });
    }

    // Convert base64 data URL to a Blob and upload to fal.ai storage
    const base64Data = image.replace(/^data:[^;]+;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");
    const blob = new Blob([buffer], { type: "image/jpeg" });
    const imageUrl = await fal.storage.upload(blob as unknown as File);

    // Run the redux (image-to-image) model
    const result = await fal.subscribe("fal-ai/flux-pro/v1/redux", {
      input: {
        image_url: imageUrl,
        prompt: TRANSFORM_PROMPT,
        num_inference_steps: 28,
        guidance_scale: 3.5,
        safety_tolerance: "5",
      },
    }) as { images?: { url: string }[] };

    const outputUrl = result?.images?.[0]?.url;
    if (!outputUrl) {
      return NextResponse.json({ error: "No image returned from model" }, { status: 500 });
    }

    // Fetch the generated image and return as base64 so the client can use it directly
    const imgRes = await fetch(outputUrl);
    if (!imgRes.ok) {
      return NextResponse.json({ error: "Failed to fetch generated image" }, { status: 500 });
    }
    const imgBuffer = Buffer.from(await imgRes.arrayBuffer());
    const outputBase64 = `data:image/jpeg;base64,${imgBuffer.toString("base64")}`;

    return NextResponse.json({ image: outputBase64 });
  } catch (err) {
    console.error("/api/transform error:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
