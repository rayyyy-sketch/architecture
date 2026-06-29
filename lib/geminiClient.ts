import { Variation } from "./dxfGenerator";
import {
  resolveStyle,
  buildSystemPrompt,
  buildInstruction,
  parseVariations,
} from "./prompt";

// Free-tier Gemini model that supports vision + JSON output.
const GEMINI_MODEL = "gemini-2.0-flash";

function fileToBase64(file: File): Promise<{ data: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve({ data: result.split(",")[1] ?? "", mimeType: file.type });
    };
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

// Calls Google's Gemini API directly from the browser using the user's own
// free key. Works on the static (GitHub Pages) site with no server, at $0.
export async function generateWithGemini(
  args: GenerateArgs
): Promise<{ variations: Variation[]; styleName: string }> {
  const { apiKey, description, styleId, customStyle, creativity, imageFile } = args;

  const { styleName, styleDirective } = resolveStyle(styleId, customStyle);
  const system = buildSystemPrompt(styleDirective, creativity);

  const parts: Record<string, unknown>[] = [];
  if (imageFile) {
    const { data, mimeType } = await fileToBase64(imageFile);
    parts.push({ inlineData: { mimeType, data } });
  }
  parts.push({ text: buildInstruction(description, !!imageFile) });

  const body = {
    systemInstruction: { parts: [{ text: system }] },
    contents: [{ role: "user", parts }],
    generationConfig: { responseMimeType: "application/json", maxOutputTokens: 8192 },
  };

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(
    apiKey
  )}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    let detail = "";
    try {
      const err = await res.json();
      detail = err?.error?.message || "";
    } catch {}
    if (res.status === 400 && /api key/i.test(detail)) {
      throw new Error("That Gemini key was rejected. Get a free one at aistudio.google.com → Get API key.");
    }
    if (res.status === 429) {
      throw new Error("Free-tier rate limit hit — wait a minute and try again (no charge).");
    }
    throw new Error(detail || `Gemini API error (${res.status}).`);
  }

  const data = await res.json();
  const text: string =
    data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text || "").join("\n") ?? "";

  if (!text) throw new Error("Gemini returned no usable content. Try again or rephrase.");

  return { variations: parseVariations(text), styleName };
}
