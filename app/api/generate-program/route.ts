import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getServerClient, getServiceClient } from "@/lib/supabase";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_EN = `You are a looksmaxxing coach. Generate a personalised 7-day daily program based on the detected facial flaws provided.

Respond with ONLY a valid JSON array of exactly 7 objects — no markdown, no explanation, no surrounding object. Start with [ and end with ].

Format:
[
  { "day": 1, "morning": ["action 1", "action 2"], "evening": ["action 1", "action 2"], "exercise": "exercise with duration/reps" },
  ...
  { "day": 7, "morning": ["action 1", "action 2"], "evening": ["action 1", "action 2"], "exercise": "exercise with duration/reps" }
]

Rules:
- Exactly 7 entries (day 1–7), exactly 2 morning actions and 2 evening actions per day, 1 exercise per day
- Every single action must directly address one of the detected flaws — reference the flaw name
- Be specific and actionable (include product names, reps/durations, exact techniques)
- If water retention / puffiness detected: gua sha, lymphatic drainage, low-sodium diet reminders
- If weak jawline detected: mewing hold duration, mastic gum chewing sets, neck bridges
- If acne / poor skin detected: BHA cleanse, tretinoin application nights, SPF reminders
- If dark circles detected: caffeine serum, cold compress, elevated pillow
- If double chin / neck detected: neck curl-ups, neck bridges, chin tucks`;

const SYSTEM_FR = `Tu es un coach looksmaxxing. Génère un programme quotidien personnalisé de 7 jours basé sur les défauts faciaux détectés fournis.

Réponds UNIQUEMENT avec un tableau JSON valide de exactement 7 objets — pas de markdown, pas d'explication, pas d'objet englobant. Commence par [ et termine par ].

Format :
[
  { "day": 1, "morning": ["action 1", "action 2"], "evening": ["action 1", "action 2"], "exercise": "exercice avec durée/répétitions" },
  ...
  { "day": 7, "morning": ["action 1", "action 2"], "evening": ["action 1", "action 2"], "exercise": "exercice avec durée/répétitions" }
]

Règles :
- Exactement 7 entrées (jour 1–7), exactement 2 actions matin et 2 actions soir par jour, 1 exercice par jour
- Chaque action doit directement traiter l'un des défauts détectés — mentionne le nom du défaut
- Sois précis et concret (inclus les noms de produits, répétitions/durées, techniques exactes)
- Si rétention d'eau / visage gonflé : gua sha, drainage lymphatique, rappels régime pauvre en sel
- Si mâchoire faible : durée de mewing, séances de mastic gum, neck bridges
- Si acné / peau : nettoyage BHA, application trétinoïne le soir, rappels SPF
- Si cernes : sérum caféine, compresse froide, oreiller surélevé
- Si double menton / cou : neck curl-ups, neck bridges, chin tucks`;

export async function POST(req: NextRequest) {
  try {
    // ── Auth ────────────────────────────────────────────────────────────────
    let userId: string | null = null;
    try {
      const cookieStore = await cookies();
      const supabase = getServerClient(cookieStore);
      const { data: { session } } = await supabase.auth.getSession();
      userId = session?.user?.id ?? null;
    } catch { /* no auth */ }

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { analysisId, lang } = await req.json() as { analysisId: string; lang?: string };
    if (!analysisId) {
      return NextResponse.json({ error: "Missing analysisId" }, { status: 400 });
    }

    // ── Fetch the analysis row (verify ownership) ────────────────────────────
    const db = getServiceClient();
    const { data: analysis, error: fetchErr } = await db
      .from("analyses")
      .select("id, user_id, results")
      .eq("id", analysisId)
      .eq("user_id", userId)
      .maybeSingle();

    if (fetchErr || !analysis) {
      return NextResponse.json({ error: "Analysis not found" }, { status: 404 });
    }

    const results = analysis.results as Record<string, unknown> | null;
    const detectedFlaws = results?.detected_flaws;
    const improvementPlan = results?.improvement_plan;

    if (!detectedFlaws || !Array.isArray(detectedFlaws) || detectedFlaws.length === 0) {
      return NextResponse.json({ error: "No detected flaws in analysis" }, { status: 422 });
    }

    // ── Build Claude prompt ─────────────────────────────────────────────────
    const flawsSummary = (detectedFlaws as Array<{ flaw: string; severity: string; fix: string }>)
      .map(f => `- ${f.flaw} (${f.severity}): ${f.fix}`)
      .join("\n");

    const planSummary = improvementPlan
      ? JSON.stringify(improvementPlan, null, 2)
      : "No improvement plan available";

    const userMessage = lang === "fr"
      ? `Défauts faciaux détectés :\n${flawsSummary}\n\nPlan d'amélioration :\n${planSummary}\n\nGénère le programme 7 jours.`
      : `Detected facial flaws:\n${flawsSummary}\n\nImprovement plan:\n${planSummary}\n\nGenerate the 7-day program.`;

    const systemPrompt = lang === "fr" ? SYSTEM_FR : SYSTEM_EN;

    // ── Call Claude ──────────────────────────────────────────────────────────
    const response = await client.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 3000,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    });

    const raw = response.content[0].type === "text" ? response.content[0].text : "";
    const firstBracket = raw.indexOf("[");
    const lastBracket = raw.lastIndexOf("]");
    if (firstBracket === -1 || lastBracket === -1 || lastBracket <= firstBracket) {
      console.error("[generate-program] no JSON array found:", raw.slice(0, 300));
      return NextResponse.json({ error: "AI returned malformed response" }, { status: 500 });
    }

    let daily_program: unknown[];
    try {
      daily_program = JSON.parse(raw.slice(firstBracket, lastBracket + 1));
    } catch (e) {
      console.error("[generate-program] JSON.parse failed:", e);
      return NextResponse.json({ error: "AI returned malformed JSON" }, { status: 500 });
    }

    if (!Array.isArray(daily_program) || daily_program.length !== 7) {
      return NextResponse.json({ error: "Expected 7-day program array" }, { status: 500 });
    }

    // ── Persist to DB ────────────────────────────────────────────────────────
    const updatedResults = { ...(results ?? {}), daily_program };
    const { error: updateErr } = await db
      .from("analyses")
      .update({ results: updatedResults })
      .eq("id", analysisId)
      .eq("user_id", userId);

    if (updateErr) {
      console.error("[generate-program] DB update failed:", updateErr);
      // Non-fatal — return result anyway so client can show it
    }

    return NextResponse.json({ daily_program });
  } catch (err) {
    console.error("[generate-program] error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
