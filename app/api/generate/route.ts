import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { ARCHITECT_STYLES } from "@/lib/architectStyles";

const client = new Anthropic();

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const description = formData.get("description") as string;
    const styleId = formData.get("styleId") as string;
    const imageFile = formData.get("image") as File | null;

    const style = ARCHITECT_STYLES.find((s) => s.id === styleId) ?? ARCHITECT_STYLES[ARCHITECT_STYLES.length - 1];

    const jsonSchema = `Return ONLY valid JSON (no markdown, no explanation) in this exact structure:
{
  "rooms": [
    {
      "name": "Living Room",
      "x": 0,
      "y": 0,
      "width": 6,
      "height": 5,
      "doors": [{ "wall": "right", "position": 1.5 }],
      "windows": [{ "wall": "bottom", "position": 1 }]
    }
  ],
  "totalWidth": 12,
  "totalHeight": 10,
  "scale": 1000,
  "styleNotes": "Brief note on how the style was applied"
}
Units are meters. x/y are bottom-left corner of each room. Rooms must not overlap.
door/window position is distance from left/bottom corner of that wall in meters.`;

    const systemPrompt = `You are an expert architectural floor plan generator.
${style.systemPrompt}

${jsonSchema}`;

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
        ? `Generate a floor plan for: ${description}`
        : "Generate a floor plan based on the uploaded image/sketch.",
    });

    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: "user", content: userContent }],
    });

    const text = message.content[0].type === "text" ? message.content[0].text : "";

    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: "Failed to parse floor plan data" }, { status: 500 });
    }

    const floorPlan = JSON.parse(jsonMatch[0]);
    return NextResponse.json({ floorPlan, styleName: style.name });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Generation failed" }, { status: 500 });
  }
}
