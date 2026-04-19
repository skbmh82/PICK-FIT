import Replicate from "replicate";
import type { TryOnProvider, TryOnRequest, TryOnResult } from "./types";

const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export const kolorsProvider: TryOnProvider = {
  async run({ userImageUrl, garmentImageUrl }: TryOnRequest): Promise<TryOnResult> {
    const start = Date.now();
    const maxRetries = 4;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const output = await replicate.run(
          "cuuupid/idm-vton:0513734a452173b8173e907e3a59d19a36266e55b48528559432bd21c7d7e985",
          {
            input: {
              human_img: userImageUrl,
              garm_img: garmentImageUrl,
              garment_des: "clothing item",
              is_checked: true,
              is_checked_crop: false,
              denoise_steps: 30,
              seed: 42,
            },
          }
        );

        const resultUrl = Array.isArray(output) ? String(output[0]) : String(output);
        return { resultUrl, provider: "idm-vton", processingMs: Date.now() - start };

      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        const is429 = msg.includes("429") || msg.includes("Too Many Requests");

        if (is429 && attempt < maxRetries - 1) {
          const wait = (attempt + 1) * 15000; // 15s, 30s, 45s
          console.log(`Rate limited. ${wait / 1000}초 후 재시도 (${attempt + 1}/${maxRetries - 1})`);
          await sleep(wait);
          continue;
        }
        throw e;
      }
    }

    throw new Error("최대 재시도 횟수를 초과했습니다.");
  },
};
