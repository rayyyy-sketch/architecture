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
    const customStyle = ((formData.get("customStyle") as string) || "").trim();
    const creativity = ((formData.get("creativity") as string) || "balanced").toLowerCase();
    const imageFile = formData.get("image") as File | null;

    const presetStyle = ARCHITECT_STYLES.find((s) => s.id === styleId) ?? ARCHITECT_STYLES[ARCHITECT_STYLES.length - 1];
    const creativityDirective = CREATIVITY_DIRECTIVE[creativity] ?? CREATIVITY_DIRECTIVE.balanced;

    // When the user names a specific style/architect, research it instead of
    // using a preset. Web search (when available) lets Claude pull real,
    // up-to-date principles for less common names.
    const useResearch = customStyle.length > 0;
    const styleDirective = useResearch
      ? `RESEARCH-DRIVEN STYLE. The user wants the design in the style of: "${customStyle}".
First research this architect / movement / style — its spatial principles, proportions, signature
geometric moves, circulation and use of light — then apply those principles faithfully to the plans.
If you used web search, ground the design in what you found.`
      : presetStyle.systemPrompt;

    const styleName = useResearch ? customStyle : presetStyle.name;

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
- Keep every room a sensible, usable size.
- Your FINAL message must be ONLY the JSON object — nothing else.`;

    const systemPrompt = `You are a visionary architect generating buildable floor plans.

Work like a real designer: FIRST think about the parti — zoning, circulation, light, and the
defining spatial idea — THEN translate it into geometry. Do not default to a boring grid of boxes.

${styleDirective}

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

    // Build the instruction. A photo means "redraw & edit it into editable plans".
    let instruction: string;
    if (imageFile) {
      instruction =
        "The user uploaded a photo/sketch of a floor plan or space. Read it carefully and REDRAW it into 3 editable floor-plan concepts — faithfully reproducing its layout and proportions where sensible, while refining and improving it.";
      if (description) instruction += `\nApply these edits / notes from the user: ${description}`;
    } else {
      instruction = `Design 3 distinct floor plan concepts for: ${description}`;
    }
    userContent.push({ type: "text", text: instruction });

    const baseParams = {
      model: "claude-sonnet-4-6" as const,
      max_tokens: 8000,
      system: systemPrompt,
      messages: [{ role: "user" as const, content: userContent }],
    };

    // Try with web search when researching a named style; fall back gracefully
    // if the tool isn't available on the account.
    let message: Anthropic.Message;
    try {
      message = await client.messages.create(
        useResearch
          ? { ...baseParams, tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 5 }] }
          : baseParams
      );
    } catch {
      message = await client.messages.create(baseParams);
    }

    // Concatenate every text block (web-search responses contain several blocks).
    const text = message.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n");

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: "Failed to parse floor plan data" }, { status: 500 });
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const variations = Array.isArray(parsed.variations) ? parsed.variations : [parsed];

    return NextResponse.json({ variations, styleName });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Generation failed" }, { status: 500 });
  }
}
