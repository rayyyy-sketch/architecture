import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { ARCHITECT_STYLES } from "@/lib/architectStyles";

const CREATIVITY_DIRECTIVE: Record<string, string> = {
  subtle:
    "CREATIVITY: SUBTLE. Keep footprints mostly orthogonal and rational. Clean rectangles, efficient circulation. At most one gently angled accent.",
  balanced:
    "CREATIVITY: BALANCED. Mix rectangular rooms with a few L-shaped, angled or splayed footprints. Introduce one spatial 'move' (a diagonal axis, a courtyard, a double-height void).",
  bold:
    "CREATIVITY: BOLD. Reject the boring box. Embrace non-orthogonal geometry: angled walls, splayed and faceted rooms, sweeping curved footprints (approximate curves with many polygon points), courtyards, diagonal circulation spines. Be daring and sculptural while keeping the plan livable and buildable.",
};

export async function POST(req: NextRequest) {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: "AI generation isn't enabled yet. Add an ANTHROPIC_API_KEY to turn it on — meanwhile, 'Try a sample plan' works without it." },
        { status: 503 }
      );
    }
    const client = new Anthropic();

    const formData = await req.formData();
    const description = formData.get("description") as string;
    const styleId = formData.get("styleId") as string;
    const creativity = ((formData.get("creativity") as string) || "balanced").toLowerCase();
    const imageFile = formData.get("image") as File | null;

    const style = ARCHITECT_STYLES.find((s) => s.id === styleId) ?? ARCHITECT_STYLES[ARCHITECT_STYLES.length - 1];
    const creativityDirective = CREATIVITY_DIRECTIVE[creativity] ?? CREATIVITY_DIRECTIVE.balanced;

    const schema = `Return ONLY valid JSON (no markdown fences, no prose) in EXACTLY this shape:
{
  "variations": [
    {
      "conceptName": "Short evocative name for this concept",
      "conceptDescription": "1-2 sentences on the spatial idea / parti behind it",
      "scale": 1000,
      "totalWidth": 16,
      "totalHeight": 12,
      "rooms": [
        {
          "name": "Living Room",
          "x": 0, "y": 0, "width": 6, "height": 5,
          "polygon": [{"x":0,"y":0},{"x":6,"y":0},{"x":6,"y":3},{"x":4,"y":5},{"x":0,"y":5}]
        }
      ]
    }
  ]
}

RULES:
- Produce EXACTLY 3 variations, each a genuinely different spatial concept (not minor tweaks).
- Units are meters. The origin (0,0) is bottom-left; y increases upward.
- ALWAYS include x, y, width, height as the room's axis-aligned bounding box.
- "polygon" is OPTIONAL: an ordered list of 3+ {x,y} vertices for the room's true footprint
  (use it for angled / L-shaped / faceted / curved rooms — approximate curves with many points).
  Omit "polygon" for plain rectangular rooms.
- Rooms within a variation must tile together without overlapping; shared walls should align.
- Keep every room a sensible, usable size.`;

    const systemPrompt = `You are a visionary architect generating buildable floor plans.

Work like a real designer: FIRST think about the parti — zoning, circulation, light, and the
defining spatial idea — THEN translate it into geometry. Do not default to a boring grid of boxes.

${style.systemPrompt}

${creativityDirective}

${schema}`;

    const userContent: Anthropic.MessageParam["content"] = [];

    if (imageFile) {
      const buffer = await imageFile.arrayBuffer();
      const base64 = Buffer.from(buffer).toString("base64");
      const mediaType = imageFile.type as "image/jpeg" | "image/png" | "image/webp" | "image/gif";
      userContent.push({
        type: "image",
        source: { type: "base64", media_type: mediaType, data: base64 },
      });
    }

    userContent.push({
      type: "text",
      text: description
        ? `Design 3 distinct floor plan concepts for: ${description}`
        : "Design 3 distinct floor plan concepts based on the uploaded image/sketch.",
    });

    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 8000,
      system: systemPrompt,
      messages: [{ role: "user", content: userContent }],
    });

    const text = message.content[0].type === "text" ? message.content[0].text : "";

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: "Failed to parse floor plan data" }, { status: 500 });
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const variations = Array.isArray(parsed.variations) ? parsed.variations : [parsed];

    return NextResponse.json({ variations, styleName: style.name });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Generation failed" }, { status: 500 });
  }
}
