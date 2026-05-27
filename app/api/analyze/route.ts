import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT_BASE = `You are a brutally honest looksmaxxing expert and aesthetic analyst. Analyze facial photographs using established aesthetic principles (golden ratio, facial thirds, symmetry) combined with modern looksmaxxing community standards and biometric assessment.

You MUST respond with ONLY a valid JSON object — no markdown, no explanation, no extra text.

JSON schema:
{
  "symmetry_score": <number 0-10>,
  "jawline_score": <number 0-10>,
  "canthal_tilt": <number 0-10>,
  "midface_ratio": <number 0-10>,
  "facial_thirds": <number 0-10>,
  "skin_quality": <number 0-10>,
  "overall_score": <number 0-10>,
  "looksmax_rating": <string>,
  "detected_flaws": [
    { "flaw": <string>, "severity": <"mild"|"moderate"|"severe">, "fix": <string> }
  ],
  "improvements": [<string>, ...],
  "improvement_plan": {
    "skincare": [<string>, ...],
    "exercises": [<string>, ...],
    "lifestyle": [<string>, ...],
    "grooming": [<string>, ...]
  },
  "perfect_version": <string: 2-3 sentences describing SPECIFICALLY what this person could look like at their absolute maximum potential after 60-90 days of dedicated looksmaxxing — name the key features that will improve most, give rough improvement estimates, project a final score range. Be motivational, specific, and grounded.>,
  "potential_score": <number 0-10: their realistic achievable score after 60-90 days with the right program. Must be overall_score + 0.5 minimum, + 2.0 maximum. High-scoring faces gain less (0.5-0.8 pts), lower-scoring faces with fixable flaws gain more (1.2-2.0 pts).>,
  "summary": <string, 2-3 sentences>,
  "daily_program": {
    "week1": [
      { "day": 1, "morning": ["action matin 1", "action matin 2"], "evening": ["action soir 1", "action soir 2"], "exercise": "exercice spécifique avec durée/répétitions" },
      { "day": 2, "morning": ["action matin 1", "action matin 2"], "evening": ["action soir 1", "action soir 2"], "exercise": "exercice spécifique avec durée/répétitions" },
      { "day": 3, "morning": ["action matin 1", "action matin 2"], "evening": ["action soir 1", "action soir 2"], "exercise": "exercice spécifique avec durée/répétitions" },
      { "day": 4, "morning": ["action matin 1", "action matin 2"], "evening": ["action soir 1", "action soir 2"], "exercise": "exercice spécifique avec durée/répétitions" },
      { "day": 5, "morning": ["action matin 1", "action matin 2"], "evening": ["action soir 1", "action soir 2"], "exercise": "exercice spécifique avec durée/répétitions" },
      { "day": 6, "morning": ["action matin 1", "action matin 2"], "evening": ["action soir 1", "action soir 2"], "exercise": "exercice spécifique avec durée/répétitions" },
      { "day": 7, "morning": ["action matin 1", "action matin 2"], "evening": ["action soir 1", "action soir 2"], "exercise": "exercice spécifique avec durée/répétitions" }
    ],
    "week2": [
      { "day": 1, "morning": ["action matin 1", "action matin 2"], "evening": ["action soir 1", "action soir 2"], "exercise": "exercice spécifique avec durée/répétitions" },
      { "day": 2, "morning": ["action matin 1", "action matin 2"], "evening": ["action soir 1", "action soir 2"], "exercise": "exercice spécifique avec durée/répétitions" },
      { "day": 3, "morning": ["action matin 1", "action matin 2"], "evening": ["action soir 1", "action soir 2"], "exercise": "exercice spécifique avec durée/répétitions" },
      { "day": 4, "morning": ["action matin 1", "action matin 2"], "evening": ["action soir 1", "action soir 2"], "exercise": "exercice spécifique avec durée/répétitions" },
      { "day": 5, "morning": ["action matin 1", "action matin 2"], "evening": ["action soir 1", "action soir 2"], "exercise": "exercice spécifique avec durée/répétitions" },
      { "day": 6, "morning": ["action matin 1", "action matin 2"], "evening": ["action soir 1", "action soir 2"], "exercise": "exercice spécifique avec durée/répétitions" },
      { "day": 7, "morning": ["action matin 1", "action matin 2"], "evening": ["action soir 1", "action soir 2"], "exercise": "exercice spécifique avec durée/répétitions" }
    ],
    "week3": [
      { "day": 1, "morning": ["action matin 1", "action matin 2"], "evening": ["action soir 1", "action soir 2"], "exercise": "exercice spécifique avec durée/répétitions" },
      { "day": 2, "morning": ["action matin 1", "action matin 2"], "evening": ["action soir 1", "action soir 2"], "exercise": "exercice spécifique avec durée/répétitions" },
      { "day": 3, "morning": ["action matin 1", "action matin 2"], "evening": ["action soir 1", "action soir 2"], "exercise": "exercice spécifique avec durée/répétitions" },
      { "day": 4, "morning": ["action matin 1", "action matin 2"], "evening": ["action soir 1", "action soir 2"], "exercise": "exercice spécifique avec durée/répétitions" },
      { "day": 5, "morning": ["action matin 1", "action matin 2"], "evening": ["action soir 1", "action soir 2"], "exercise": "exercice spécifique avec durée/répétitions" },
      { "day": 6, "morning": ["action matin 1", "action matin 2"], "evening": ["action soir 1", "action soir 2"], "exercise": "exercice spécifique avec durée/répétitions" },
      { "day": 7, "morning": ["action matin 1", "action matin 2"], "evening": ["action soir 1", "action soir 2"], "exercise": "exercice spécifique avec durée/répétitions" }
    ],
    "week4": [
      { "day": 1, "morning": ["action matin 1", "action matin 2"], "evening": ["action soir 1", "action soir 2"], "exercise": "exercice spécifique avec durée/répétitions" },
      { "day": 2, "morning": ["action matin 1", "action matin 2"], "evening": ["action soir 1", "action soir 2"], "exercise": "exercice spécifique avec durée/répétitions" },
      { "day": 3, "morning": ["action matin 1", "action matin 2"], "evening": ["action soir 1", "action soir 2"], "exercise": "exercice spécifique avec durée/répétitions" },
      { "day": 4, "morning": ["action matin 1", "action matin 2"], "evening": ["action soir 1", "action soir 2"], "exercise": "exercice spécifique avec durée/répétitions" },
      { "day": 5, "morning": ["action matin 1", "action matin 2"], "evening": ["action soir 1", "action soir 2"], "exercise": "exercice spécifique avec durée/répétitions" },
      { "day": 6, "morning": ["action matin 1", "action matin 2"], "evening": ["action soir 1", "action soir 2"], "exercise": "exercice spécifique avec durée/répétitions" },
      { "day": 7, "morning": ["action matin 1", "action matin 2"], "evening": ["action soir 1", "action soir 2"], "exercise": "exercice spécifique avec durée/répétitions" }
    ]
  },
  "recommended_products": [
    {
      "product": "exact product name",
      "brand": "brand name",
      "reason": "why this product for this specific face and detected flaws",
      "usage": "how and when to use it",
      "amazon_search": "exact amazon search term"
    }
  ]
}

Scoring guidelines:
- symmetry_score: Left-right facial symmetry (10 = perfect mirror image)
- jawline_score: Jaw definition, gonial angle, and chin projection (10 = extremely well-defined; 3-4 = weak recessed jaw)
- canthal_tilt: Outer eye corner vs inner corner angle (10 = strong positive hunter-eye tilt; below 5 = negative tilt)
- midface_ratio: Philtrum length vs total face height aligned with golden ratio (10 = ideal 1:1:0.8 thirds)
- facial_thirds: Upper/middle/lower facial thirds balance (10 = perfect equal thirds)
- skin_quality: Texture, clarity, acne/scarring, oiliness, evenness (10 = flawless)
- overall_score: Holistic looksmax rating weighted across all metrics. Be calibrated — a truly average face is 5.0.

looksmax_rating (choose most accurate): "Subhuman", "Incel Tier", "Below Average", "Average", "Above Average", "High Tier", "Very High Tier", "Chad", "GigaChad"

Flaw detection — identify any present and add others observed:
- Bloated/puffy face (water retention, high body fat)
- Weak/recessed chin or underdeveloped jaw
- Hooded or droopy eyelids
- Negative canthal tilt (submissive eye shape)
- Dark under-eye circles or deep tear troughs
- Recessed maxilla (flat midface, midface hypoplasia)
- Long midface / high philtrum
- Acne, acne scarring, or poor skin texture
- Large or bulbous nose tip
- Narrow or wide face (suboptimal facial width-to-height ratio)
- Facial asymmetry (eyes, nose, lips, jaw unevenness)
- Sparse or ungroomed eyebrows
- Double chin or poor neck-jaw definition
- Poor posture affecting jaw appearance
- Premature aging (fine lines, skin laxity)

improvement_plan — be highly specific:
- skincare: Name exact products with key ingredients tailored to their detected skin issues (e.g., "Tretinoin 0.025% cream — accelerates cell turnover, reduces acne marks and early aging", "Paula's Choice 2% BHA — unclogs pores and smooths texture", "Cerave Moisturizing Cream — restores barrier for dry/irritated skin"). Give 4-6 recommendations.
- exercises: Mewing technique (tongue posture against palate), mastic gum or falim gum chewing for jaw hypertrophy, neck curl-ups and neck bridges for neck thickness, face yoga for muscle tone, posture exercises (chin tucks, shoulder retraction). Be specific with sets/reps where possible. Give 4-5 exercises.
- lifestyle: Sleep hygiene (7-9 hrs, elevated pillow, no face-down sleeping for symmetry), low-sodium diet to reduce facial puffiness, 3L+ water daily, zinc and vitamin C for skin, body fat reduction if applicable, no alcohol (causes puffiness), stop smoking (accelerates aging). Give 4-5 specific changes.
- grooming: Specific haircut styles for their face shape (e.g., "textured crop suits your round face — adds vertical length"), beard or stubble advice based on jaw structure, eyebrow shaping (threading or waxing), skincare routine order (cleanser → toner → serum → moisturizer → SPF), under-eye concealer or patches if needed. Give 4-5 tips.

Be precise and honest. Use decimal values (e.g., 7.3, 8.1). A weak jaw is 3-4, not 6. Use looksmaxxing terminology throughout.

For perfect_version: make it compelling and specific. Reference the actual face features you see. Example format: "With consistent mewing and a targeted jawline program, your jaw definition could improve by 25–30%, your skin texture reach 8.5/10 with the right retinoid routine, and your canthal tilt lift by 1–2°, pushing your overall score from [current] to [potential] within 90 days."

For the improvement_plan, be VERY specific:
- skincare: recommend exact products and routines based on detected skin issues (acne, oiliness, dryness)
- exercises: recommend specific exercises based on detected weak areas (jaw exercises if weak jawline, neck exercises if poor posture detected)
- grooming: recommend specific haircut styles that complement the detected face shape
- lifestyle: recommend specific changes based on detected issues (sleep position for jaw asymmetry, diet for skin quality)

Never give generic advice. Every recommendation must directly address a specific detected flaw.

daily_program — build a 4-week day-by-day program strictly based on detected flaws:
- Each day must have 2-3 morning actions, 2-3 evening actions, and 1 specific exercise with duration/reps.
- If water retention / bloated face detected: include gua sha massage, lymphatic drainage techniques, avoid-salt reminders.
- If acne detected: include BHA cleanse schedule, tretinoin application nights (start week 2), SPF reminders.
- If weak jawline detected: include mewing hold duration, mastic gum chewing sets, neck bridges.
- If dark circles detected: include caffeine serum application, cold compress routine, sleep elevation.
- Progressively increase intensity week over week (week 1 = foundation, week 4 = advanced).
- Every single action must reference a detected flaw by name.

recommended_products — list 5-8 products that directly address the detected flaws:
- Each product must have an exact name, brand, specific reason tied to a detected flaw, usage instructions, and an Amazon search term that will find it.
- Do not recommend any product that does not address at least one detected flaw.
- Prioritize products by impact — most critical flaw first.

CRITICAL: You MUST respond with ONLY a valid JSON object. No markdown, no \`\`\`json, no explanation before or after. Start with { and end with }. Any text outside the JSON object will break the parser.`;

const FRENCH_SUFFIX = `

LANGUAGE REQUIREMENT: All string values in the JSON response MUST be written in French. This includes: every "flaw" name, every "fix" description, every string in "improvements", every string in "improvement_plan" (skincare, exercises, lifestyle, grooming), the "summary", the "perfect_version", all strings in "daily_program" (morning actions, evening actions, exercise descriptions), and all strings in "recommended_products" (reason, usage). Keep the "severity" field values as-is ("mild", "moderate", "severe"), the "looksmax_rating" value in English, and the "product", "brand", and "amazon_search" fields in their original language (product names and search terms must remain in English for Amazon). Every other human-readable text must be in French.`;

interface LandmarkMetrics {
  symmetry: number;
  canthal: number;
  jawGrade: string;
}

export async function POST(req: NextRequest) {
  try {
    const { image, images, mimeType, landmarkMetrics, lang } = await req.json() as {
      image?: string;
      images?: string[];
      mimeType: string;
      landmarkMetrics?: LandmarkMetrics;
      lang?: string;
    };

    const systemPrompt = SYSTEM_PROMPT_BASE + (lang === "fr" ? FRENCH_SUFFIX : "");

    const validMimeTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!validMimeTypes.includes(mimeType)) {
      return NextResponse.json({ error: "Unsupported image type. Use JPG, PNG, or WEBP." }, { status: 400 });
    }

    const mediaType = mimeType as "image/jpeg" | "image/png" | "image/gif" | "image/webp";

    // Build the content array — multi-angle (3 images) or single image
    type ContentBlock =
      | { type: "image"; source: { type: "base64"; media_type: typeof mediaType; data: string } }
      | { type: "text"; text: string };

    let content: ContentBlock[];

    if (images && images.length > 0) {
      if (images.length !== 3) {
        return NextResponse.json({ error: "Expected exactly 3 images for multi-angle analysis." }, { status: 400 });
      }
      const [front, left, right] = images.map((img) => img.replace(/^data:[^;]+;base64,/, ""));
      content = [
        {
          type: "image",
          source: { type: "base64", media_type: mediaType, data: front },
        },
        {
          type: "image",
          source: { type: "base64", media_type: mediaType, data: left },
        },
        {
          type: "image",
          source: { type: "base64", media_type: mediaType, data: right },
        },
        {
          type: "text",
          text:
            "These are 3 angles of the same person: image 1 is front-facing, image 2 is left 45° profile, image 3 is right 45° profile.\n" +
            "Use all 3 angles to give the most accurate multi-angle assessment — measure symmetry from the front view, jawline angle from the profiles, and canthal tilt from the front. " +
            "Return the full looksmaxxing JSON analysis.",
        },
      ];
    } else if (image) {
      const base64Data = image.replace(/^data:[^;]+;base64,/, "");
      let userText = "Analyze this face with full looksmaxxing assessment and return the JSON.";
      if (landmarkMetrics) {
        userText =
          `Analyze this face with full looksmaxxing assessment.\n` +
          `Computer vision pre-analysis (MediaPipe 468-point FaceMesh) measured:\n` +
          `- Facial symmetry: ${landmarkMetrics.symmetry}%\n` +
          `- Average canthal tilt: ${landmarkMetrics.canthal > 0 ? "+" : ""}${landmarkMetrics.canthal}°\n` +
          `- Jaw/face width ratio grade: ${landmarkMetrics.jawGrade}\n` +
          `Use these precise landmark measurements to calibrate your symmetry_score and canthal_tilt scores. Return the JSON.`;
      }
      content = [
        { type: "image", source: { type: "base64", media_type: mediaType, data: base64Data } },
        { type: "text", text: userText },
      ];
    } else {
      return NextResponse.json({ error: "Missing image or images" }, { status: 400 });
    }

    const response = await client.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 8000,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content,
        },
      ],
    });

    const raw = response.content[0].type === "text" ? response.content[0].text : "";
    console.log("/api/analyze: raw response length:", raw.length, "| first 200 chars:", raw.slice(0, 200));

    // Extract the outermost { } block (handles markdown wrapping or leading/trailing text)
    const firstBrace = raw.indexOf("{");
    const lastBrace  = raw.lastIndexOf("}");
    if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
      console.error("/api/analyze: no JSON object found in response | full raw:", raw.slice(0, 500));
      return NextResponse.json({ error: "Failed to parse AI response." }, { status: 500 });
    }
    const jsonStr = raw.slice(firstBrace, lastBrace + 1);

    let result: Record<string, unknown>;
    try {
      result = JSON.parse(jsonStr);
      console.log("Claude response keys:", Object.keys(result));
      console.log("HAS DAILY:", !!result.daily_program);
      console.log("HAS PRODUCTS:", !!result.recommended_products);
    } catch (parseErr) {
      console.error("/api/analyze: JSON.parse failed:", parseErr, "| raw slice (0-500):", jsonStr.slice(0, 500));
      // Fallback: try to return a partial result without the large new fields
      try {
        const fallbackMatch = jsonStr.match(/^\{[\s\S]*?"summary"\s*:\s*"[^"]*"/);
        if (fallbackMatch) {
          const partial = JSON.parse(fallbackMatch[0] + ',"daily_program":null,"recommended_products":null}');
          console.warn("/api/analyze: returning partial fallback result");
          return NextResponse.json(partial);
        }
      } catch {
        // fallback also failed — fall through to error
      }
      return NextResponse.json({ error: "AI returned malformed JSON. Please try again." }, { status: 500 });
    }

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
