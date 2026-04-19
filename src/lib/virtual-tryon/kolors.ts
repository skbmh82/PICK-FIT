import Replicate from "replicate";
import type { TryOnProvider, TryOnRequest, TryOnResult } from "./types";

const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });

export const kolorsProvider: TryOnProvider = {
  async run({ userImageUrl, garmentImageUrl }: TryOnRequest): Promise<TryOnResult> {
    const start = Date.now();

    // IDM-VTON: Replicate에서 검증된 최고 품질 가상 피팅 모델 (KAIST)
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

    return {
      resultUrl,
      provider: "idm-vton",
      processingMs: Date.now() - start,
    };
  },
};
