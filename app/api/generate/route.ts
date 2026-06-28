import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import {
  GEN_MODEL,
  GEN_MAX_TOKENS,
  resolveStyle,
  buildSystemPrompt,
  buildInstruction,
  parseVariations,
} from "@/lib/prompt";

export async function POST(req: NextRequest) {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: "No server API key set. Paste your own Anthropic key in the app to generate, or set ANTHROPIC_API_KEY on the host." },
        { status: 503 }
      );
    }
    const client = new Anthropic();

    const formData = await req.formData();
    const description = formData.get("description") as string;
    const styleId = formData.get("styleId") as string;
    const customStyle = (formData.get("customStyle") as string) || "";
    const creativity = ((formData.get("creativity") as string) || "balanced").toLowerCase();
    const imageFile = formData.get("image") as File | null;

    const { useResearch, styleName, styleDirective } = resolveStyle(styleId, customStyle);
    const system = buildSystemPrompt(styleDirective, creativity);

    const userContent: Anthropic.MessageParam["content"] = [];
    if (imageFile) {
      const buffer = await imageFile.arrayBuffer();
      const base64 = Buffer.from(buffer).toString("base64");
      const mediaType = imageFile.type as "image/jpeg" | "image/png" | "image/webp" | "image/gif";
      userContent.push({ type: "image", source: { type: "base64", media_type: mediaType, data: base64 } });
    }
    userContent.push({ type: "text", text: buildInstruction(description, !!imageFile) });

    const baseParams = {
      model: GEN_MODEL,
      max_tokens: GEN_MAX_TOKENS,
      system,
      messages: [{ role: "user" as const, content: userContent }],
    };

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

    const text = message.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n");

    return NextResponse.json({ variations: parseVariations(text), styleName });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Generation failed" }, { status: 500 });
  }
}
