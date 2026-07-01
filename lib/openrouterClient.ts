import {
  resolveStyle,
  buildSystemPrompt,
  buildInstruction,
  parseVariations,
  GenMode,
} from "./prompt";

// Tried in order: free models first, then a cheap reliable PAID model so that
// once the user adds a few dollars of credit it "just works" (vision-capable).
const FREE_MODELS = [
  "google/gemini-2.0-flash-exp:free",
  "meta-llama/llama-3.2-11b-vision-instruct:free",
  "deepseek/deepseek-chat-v3-0324:free",
  "google/gemini-2.0-flash-001", // paid: ~$0.10 / 1M tokens, very reliable
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
  let needCredit = false;
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

    let detail = "";
    try {
      const err = await res.json();
      detail = err?.error?.message || "";
    } catch {}
    lastDetail = detail;
    if (res.status === 402 || /credit|insufficient|payment/i.test(detail)) {
      needCredit = true;
      continue; // out of credit for the paid model — try any remaining free ones
    }
    if (res.status === 429) {
      continue; // rate limited on this model — try the next
    }
    if (/no endpoints/i.test(detail) || res.status === 404) {
      noEndpoints = true;
      continue; // model unavailable / data policy — try the next one
    }
    // Other error — try the next model rather than failing outright
  }

  if (needCredit) {
    throw new Error(
      "Add a few dollars of credit at openrouter.ai/credits and it works instantly (no toggles). Then try again."
    );
  }
  if (noEndpoints) {
    throw new Error(
      "Free models are blocked. Either add $5 credit at openrouter.ai/credits (recommended), or turn ON free-model training at openrouter.ai/settings/privacy."
    );
  }
  throw new Error(lastDetail || "All models were unavailable — add credit at openrouter.ai/credits or switch to Gemini.");
}
