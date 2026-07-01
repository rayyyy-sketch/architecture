import {
  resolveStyle,
  buildSystemPrompt,
  buildInstruction,
  parseVariations,
  GenMode,
} from "./prompt";

// Several free models — tried in order so one unavailable model doesn't break
// generation. Vision-capable ones first (for photo input).
const FREE_MODELS = [
  "google/gemini-2.0-flash-exp:free",
  "meta-llama/llama-3.2-11b-vision-instruct:free",
  "meta-llama/llama-3.3-70b-instruct:free",
  "deepseek/deepseek-chat-v3-0324:free",
  "qwen/qwen-2.5-72b-instruct:free",
];

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
  mode?: GenMode;
}

// Calls OpenRouter (OpenAI-compatible) directly from the browser using the
// user's key. OpenRouter supports browser calls and offers free models.
export async function generateWithOpenRouter(
  args: GenerateArgs
): Promise<{ variations: Record<string, unknown>[]; styleName: string }> {
  const { apiKey, description, styleId, customStyle, creativity, imageFile, mode = "plan" } = args;

  const { styleName, styleDirective } = resolveStyle(styleId, customStyle);
  const system = buildSystemPrompt(styleDirective, creativity, mode);
  const instruction = buildInstruction(description, !!imageFile, mode);

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

  let noEndpoints = false;
  let lastDetail = "";

  for (const model of FREE_MODELS) {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "X-Title": "ArchAI",
      },
      body: JSON.stringify({
        model,
        max_tokens: 8000,
        messages: [
          { role: "system", content: system },
          { role: "user", content: userContent },
        ],
      }),
    });

    if (res.ok) {
      const data = await res.json();
      const text: string = data?.choices?.[0]?.message?.content ?? "";
      if (text) return { variations: parseVariations(text), styleName };
      continue; // empty content — try the next model
    }

    if (res.status === 401) throw new Error("OpenRouter key was rejected — check it at openrouter.ai/keys.");
    if (res.status === 429) throw new Error("Free-tier rate limit hit — wait a minute and try again (no charge).");

    let detail = "";
    try {
      const err = await res.json();
      detail = err?.error?.message || "";
    } catch {}
    lastDetail = detail;
    if (/no endpoints/i.test(detail) || res.status === 404) {
      noEndpoints = true;
      continue; // model unavailable / data policy — try the next one
    }
    // Other error — try the next model rather than failing outright
  }

  if (noEndpoints) {
    throw new Error(
      "OpenRouter is blocking free models. Turn ON free-model training at openrouter.ai/settings/privacy, then try again."
    );
  }
  throw new Error(lastDetail || "All free models were unavailable — try Gemini in the dropdown, or add credit on OpenRouter.");
}
