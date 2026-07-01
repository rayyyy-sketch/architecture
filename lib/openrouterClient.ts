import { Variation } from "./dxfGenerator";
import {
  resolveStyle,
  buildSystemPrompt,
  buildInstruction,
  parseVariations,
} from "./prompt";

// A free vision-capable model on OpenRouter (handles photos too).
const OPENROUTER_MODEL = "google/gemini-2.0-flash-exp:free";

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export interface GenerateArgs {
  apiKey: string;
  description: string;
  styleId: string;
  customStyle: string;
  creativity: string;
  imageFile: File | null;
}

// Calls OpenRouter (OpenAI-compatible) directly from the browser using the
// user's key. OpenRouter supports browser calls and offers free models.
export async function generateWithOpenRouter(
  args: GenerateArgs
): Promise<{ variations: Variation[]; styleName: string }> {
  const { apiKey, description, styleId, customStyle, creativity, imageFile } = args;

  const { styleName, styleDirective } = resolveStyle(styleId, customStyle);
  const system = buildSystemPrompt(styleDirective, creativity);
  const instruction = buildInstruction(description, !!imageFile);

  let userContent: unknown;
  if (imageFile) {
    const dataUrl = await fileToDataUrl(imageFile);
    userContent = [
      { type: "text", text: instruction },
      { type: "image_url", image_url: { url: dataUrl } },
    ];
  } else {
    userContent = instruction;
  }

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "X-Title": "ArchAI",
    },
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      max_tokens: 8000,
      messages: [
        { role: "system", content: system },
        { role: "user", content: userContent },
      ],
    }),
  });

  if (!res.ok) {
    let detail = "";
    try {
      const err = await res.json();
      detail = err?.error?.message || "";
    } catch {}
    if (res.status === 401) throw new Error("OpenRouter key was rejected — check it at openrouter.ai/keys.");
    if (res.status === 429) throw new Error("Free-tier rate limit hit — wait a minute and try again (no charge).");
    throw new Error(detail || `OpenRouter API error (${res.status}).`);
  }

  const data = await res.json();
  const text: string = data?.choices?.[0]?.message?.content ?? "";
  if (!text) throw new Error("OpenRouter returned no usable content. Try again or pick another model.");

  return { variations: parseVariations(text), styleName };
}
