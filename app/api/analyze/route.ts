import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are an expert aesthetic analyst. When given a facial photograph, you analyze it objectively using established aesthetic principles (golden ratio, facial thirds, symmetry analysis, etc.).

You MUST respond with ONLY a valid JSON object — no markdown, no explanation, no extra text.

JSON schema:
{
  "symmetry_score": <number 0-10>,
  "jawline_score": <number 0-10>,
  "canthal_tilt": <number 0-10>,
  "midface_ratio": <number 0-10>,
  "overall_score": <number 0-10>,
  "improvements": [<string>, ...],
  "summary": <string, 1-2 sentences>
}

Scoring guidelines:
- symmetry_score: Left-right facial symmetry (10 = perfect mirror image)
- jawline_score: Jaw definition, angularity, and structure (10 = extremely well-defined)
- canthal_tilt: Outer eye corner relative to inner (10 = strong positive tilt, hunter eyes)
- midface_ratio: Philtrum length relative to total face height aligned with golden ratio (10 = ideal)
- overall_score: Holistic aesthetic rating weighted across all metrics
- improvements: 3-5 actionable, honest suggestions (grooming, posture, lifestyle, etc.)
- summary: Brief honest assessment

Be precise and objective. Use decimal values for nuance (e.g., 7.3, 8.1).`;

export async function POST(req: NextRequest) {
  try {
    const { image, mimeType } = await req.json();

    if (!image || !mimeType) {
      return NextResponse.json({ error: "Missing image or mimeType" }, { status: 400 });
    }

    // Strip the data URL prefix to get raw base64
    const base64Data = image.replace(/^data:[^;]+;base64,/, "");

    const validMimeTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!validMimeTypes.includes(mimeType)) {
      return NextResponse.json({ error: "Unsupported image type. Use JPG, PNG, or WEBP." }, { status: 400 });
    }

    const response = await client.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mimeType as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
                data: base64Data,
              },
            },
            {
              type: "text",
              text: "Analyze this face and return the JSON assessment.",
            },
          ],
        },
      ],
    });

    const raw = response.content[0].type === "text" ? response.content[0].text : "";

    // Extract JSON from the response (handles any accidental markdown wrapping)
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: "Failed to parse AI response." }, { status: 500 });
    }

    const result = JSON.parse(jsonMatch[0]);

    // Validate required fields are present and numeric
    const required = ["symmetry_score", "jawline_score", "canthal_tilt", "midface_ratio", "overall_score"];
    for (const field of required) {
      if (typeof result[field] !== "number") {
        return NextResponse.json({ error: `Invalid response: missing ${field}` }, { status: 500 });
      }
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error("/api/analyze error:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
