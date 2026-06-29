// Generates an image via kie.ai's GPT-4o Image API (task-based: submit, then
// poll for the result). The user's kie.ai key is passed in from a key box and
// never stored in the repo.

const GENERATE_URL = "https://api.kie.ai/api/v1/gpt4o-image/generate";
const RECORD_URL = "https://api.kie.ai/api/v1/gpt4o-image/record-info";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function generateImageWithKie(args: {
  apiKey: string;
  prompt: string;
  size?: string;
  onProgress?: (pct: number) => void;
}): Promise<string> {
  const { apiKey, prompt, size = "3:2", onProgress } = args;

  // 1) Submit the generation task.
  const genRes = await fetch(GENERATE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ prompt, size }),
  });

  if (!genRes.ok) {
    if (genRes.status === 401) throw new Error("kie.ai key was rejected — check it's correct.");
    throw new Error(`kie.ai request failed (${genRes.status}).`);
  }
  const genData = await genRes.json();
  if (genData?.code !== 200 || !genData?.data?.taskId) {
    throw new Error(genData?.msg || "kie.ai did not return a task.");
  }
  const taskId: string = genData.data.taskId;

  // 2) Poll until the image is ready (image gen typically takes ~20-60s).
  for (let i = 0; i < 60; i++) {
    await sleep(3000);
    const recRes = await fetch(`${RECORD_URL}?taskId=${encodeURIComponent(taskId)}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!recRes.ok) continue;
    const recData = await recRes.json();
    const d = recData?.data;
    if (!d) continue;

    if (typeof d.progress === "number" && onProgress) onProgress(Math.round(d.progress * 100));

    // Success
    if (d.successFlag === 1 || d.status === "SUCCESS") {
      const urls: string[] | undefined = d.response?.resultUrls || d.resultUrls;
      if (urls && urls.length) return urls[0];
    }
    // Failure
    if (d.successFlag === 2 || d.successFlag === 3 || d.errorCode) {
      throw new Error(d.errorMessage || "Image generation failed.");
    }
  }
  throw new Error("Timed out waiting for the image — try again.");
}
