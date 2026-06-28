import { Variation } from "./dxfGenerator";
import {
  GEN_MODEL,
  GEN_MAX_TOKENS,
  resolveStyle,
  buildSystemPrompt,
  buildInstruction,
  parseVariations,
} from "./prompt";

function fileToBase64(file: File): Promise<{ data: string; mediaType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(",")[1] ?? "";
      resolve({ data: base64, mediaType: file.type });
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

// Calls the Anthropic API directly from the browser using the user's own key.
// This lets the app generate real plans even when hosted as a static site
// (GitHub Pages) with no server. The key never leaves the user's machine
// except to go straight to Anthropic.
export async function generateInBrowser(
  args: GenerateArgs
): Promise<{ variations: Variation[]; styleName: string }> {
  const { apiKey, description, styleId, customStyle, creativity, imageFile } = args;

  const { useResearch, styleName, styleDirective } = resolveStyle(styleId, customStyle);
  const system = buildSystemPrompt(styleDirective, creativity);

  const content: Record<string, unknown>[] = [];
  if (imageFile) {
    const { data, mediaType } = await fileToBase64(imageFile);
    content.push({ type: "image", source: { type: "base64", media_type: mediaType, data } });
  }
  content.push({ type: "text", text: buildInstruction(description, !!imageFile) });

  const body: Record<string, unknown> = {
    model: GEN_MODEL,
    max_tokens: GEN_MAX_TOKENS,
    system,
    messages: [{ role: "user", content }],
  };
  if (useResearch) {
    body.tools = [{ type: "web_search_20250305", name: "web_search", max_uses: 5 }];
  }

  const callApi = async (payload: Record<string, unknown>) =>
    fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify(payload),
    });

  let res = await callApi(body);
  // If web search isn't enabled on the account, retry without tools.
  if (!res.ok && useResearch) {
    const noTools = { ...body };
    delete noTools.tools;
    res = await callApi(noTools);
  }

  if (!res.ok) {
    let detail = "";
    try {
      const err = await res.json();
      detail = err?.error?.message || "";
    } catch {}
    if (res.status === 401) {
      throw new Error("That API key was rejected. Double-check you pasted the full key (starts with sk-ant-).");
    }
    if (res.status === 400 && /credit|billing/i.test(detail)) {
      throw new Error("Your Anthropic account has no credit. Add a few dollars at console.anthropic.com → Billing.");
    }
    throw new Error(detail || `Anthropic API error (${res.status}).`);
  }

  const data = await res.json();
  const text: string = Array.isArray(data.content)
    ? data.content.filter((b: { type: string }) => b.type === "text").map((b: { text: string }) => b.text).join("\n")
    : "";

  return { variations: parseVariations(text), styleName };
}
